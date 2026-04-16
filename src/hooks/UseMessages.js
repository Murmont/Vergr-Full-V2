import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection, query, orderBy, limit, onSnapshot,
  where, Timestamp, deleteDoc, doc,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, auth, functions } from '../firebase/config';
import {
  getCachedMessages, getLatestCachedTimestamp, upsertMessages, removeCachedMessage,
} from '../utils/messageCache';
import { enqueueMessage, isOfflineError, processQueue } from '../utils/offlineQueue';

/**
 * Subscribes to messages for a chat with a Dexie-backed local cache.
 *
 * Send path: relayMessage callable → server writes + pushes. On offline
 * failure we enqueue the payload in Dexie's outbox and retry on reconnect.
 *
 * Read path: hydrate from cache instantly, then onSnapshot only for
 * messages newer than the latest cached timestamp. ~100x read reduction
 * on repeat visits.
 */
export default function useMessages(chatId, messageLimit = 80) {
  const [rawMessages, setRawMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const messageMap = useRef(new Map()); // id -> message (single source of truth)

  useEffect(() => {
    if (!chatId) { setLoading(false); return; }
    let cancelled = false;
    let unsub = () => {};
    messageMap.current = new Map();
    setLoading(true);

    (async () => {
      // ── Step 1: hydrate from cache ──
      const cached = await getCachedMessages(chatId, messageLimit);
      if (cancelled) return;
      for (const m of cached) messageMap.current.set(m.id, m);
      if (cached.length > 0) {
        setRawMessages(Array.from(messageMap.current.values()).sort(sortByCreated));
        setLoading(false);
      }

      // ── Step 2: subscribe to NEW messages only ──
      const lastSyncMs = await getLatestCachedTimestamp(chatId);
      const colRef = collection(db, 'conversations', chatId, 'messages');

      let q;
      if (lastSyncMs > 0) {
        const cutoff = Timestamp.fromMillis(lastSyncMs);
        q = query(colRef, where('createdAt', '>', cutoff), orderBy('createdAt', 'asc'));
      } else {
        q = query(colRef, orderBy('createdAt', 'desc'), limit(messageLimit));
      }

      unsub = onSnapshot(
        q,
        (snap) => {
          if (cancelled) return;
          const newMsgs = [];
          snap.docChanges().forEach((change) => {
            const m = { id: change.doc.id, ...change.doc.data() };
            if (change.type === 'removed') {
              messageMap.current.delete(change.doc.id);
              removeCachedMessage(chatId, change.doc.id);
            } else {
              // Purge legacy soft-deleted tombstones authored by the current user.
              if (m.deleted && m.senderId === auth.currentUser?.uid) {
                deleteDoc(doc(db, 'conversations', chatId, 'messages', change.doc.id)).catch(() => {});
                messageMap.current.delete(change.doc.id);
                removeCachedMessage(chatId, change.doc.id);
                return;
              }
              // Dedup by clientId if a queued optimistic message is arriving
              if (m.clientId) {
                for (const [existingId, existing] of messageMap.current) {
                  if (existing._clientId === m.clientId && existingId !== m.id) {
                    messageMap.current.delete(existingId);
                  }
                }
              }
              messageMap.current.set(change.doc.id, m);
              newMsgs.push(m);
            }
          });
          if (newMsgs.length) upsertMessages(chatId, newMsgs);
          setRawMessages(Array.from(messageMap.current.values()).sort(sortByCreated));
          setLoading(false);
        },
        () => setLoading(false)
      );
    })();

    return () => { cancelled = true; unsub(); };
  }, [chatId, messageLimit]);

  // Filter out soft-deleted tombstones from any previous version — deletes
  // are now hard-deletes, so anything with deleted:true is legacy junk.
  const visible = rawMessages.filter(m => !m.deleted);
  const messages = [];
  let lastDate = null;
  for (const msg of visible) {
    const ts = msg.createdAt?.toDate ? msg.createdAt.toDate() : (msg.createdAt ? new Date(msg.createdAt) : new Date());
    const dateStr = ts.toDateString();
    if (dateStr !== lastDate) {
      messages.push({ _type: 'separator', date: dateStr, id: 'sep_' + dateStr });
      lastDate = dateStr;
    }
    messages.push(msg);
  }

  // Immediately drop a message from local state + cache without waiting for
  // Firestore's onSnapshot 'removed' event. Needed because the snapshot query
  // is scoped to `createdAt > lastSync`, so deletes of older (cached-only)
  // messages never fire the remote listener. Also handy for FCM-driven
  // cross-device deletes.
  const removeLocalMessage = useCallback((messageId) => {
    if (!chatId || !messageId) return;
    messageMap.current.delete(messageId);
    setRawMessages(Array.from(messageMap.current.values()).sort(sortByCreated));
    removeCachedMessage(chatId, messageId).catch(() => {});
  }, [chatId]);

  // Listen for cross-device delete events pushed via FCM (foreground + SW).
  useEffect(() => {
    if (!chatId) return;
    const handler = (e) => {
      const { chatId: evChatId, messageId } = e.detail || {};
      if (evChatId !== chatId || !messageId) return;
      messageMap.current.delete(messageId);
      setRawMessages(Array.from(messageMap.current.values()).sort(sortByCreated));
      removeCachedMessage(chatId, messageId).catch(() => {});
    };
    window.addEventListener('vergr:message-deleted', handler);
    return () => window.removeEventListener('vergr:message-deleted', handler);
  }, [chatId]);

  const sendMessage = useCallback(async (text, type = 'text', extra = {}) => {
    if (!chatId || !auth.currentUser) return;
    const clientId = `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const payload = { text: text || '', type, clientId, ...extra };
    try {
      const relay = httpsCallable(functions, 'relayMessage');
      await relay({ chatId, ...payload });
    } catch (err) {
      if (isOfflineError(err)) {
        await enqueueMessage(chatId, payload);
        // Fire-and-forget retry — processQueue will pick this up on reconnect too
        processQueue().catch(() => {});
      } else {
        throw err;
      }
    }
  }, [chatId]);

  return { messages, rawMessages, loading, sendMessage, removeLocalMessage };
}

function sortByCreated(a, b) {
  const aMs = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
  const bMs = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
  return aMs - bMs;
}
