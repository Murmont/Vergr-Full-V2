import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
export default function useMessages(chatId, messageLimit = 100) {
  const [rawMessages, setRawMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!chatId) { setLoading(false); return; }
    setLoading(true);
    const q = query(collection(db, 'conversations', chatId, 'messages'), orderBy('createdAt', 'asc'), limit(messageLimit));
    const unsub = onSnapshot(q, (snap) => { setRawMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }, () => setLoading(false));
    return () => unsub();
  }, [chatId, messageLimit]);
  const messages = [];
  let lastDate = null;
  for (const msg of rawMessages) {
    const ts = msg.createdAt?.toDate ? msg.createdAt.toDate() : (msg.createdAt ? new Date(msg.createdAt) : new Date());
    const dateStr = ts.toDateString();
    if (dateStr !== lastDate) { messages.push({ _type: 'separator', date: dateStr, id: 'sep_' + dateStr }); lastDate = dateStr; }
    messages.push(msg);
  }
  const sendMessage = useCallback(async (text, type = 'text', extra = {}) => {
    if (!chatId || !auth.currentUser) return;
    await addDoc(collection(db, 'conversations', chatId, 'messages'), { senderId: auth.currentUser.uid, text: text || '', type, ...extra, createdAt: serverTimestamp() });
    await updateDoc(doc(db, 'conversations', chatId), { lastMessage: text || '[' + type + ']', lastMessageAt: serverTimestamp(), updatedAt: serverTimestamp() }).catch(() => {});
  }, [chatId]);
  return { messages, rawMessages, loading, sendMessage };
}
