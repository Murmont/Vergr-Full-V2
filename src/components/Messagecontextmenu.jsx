import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import Icon from './Icon';

// Quick reaction bar inside context menu
function QuickReactions({ chatId, messageId, onClose }) {
  const emojis = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
  
  const handleReact = async (emoji) => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid || !chatId || !messageId) return;
      const msgRef = doc(db, 'conversations', chatId, 'messages', messageId);
      await updateDoc(msgRef, {
        [`reactions.${emoji}`]: arrayUnion(uid),
      });
    } catch (err) {
      console.error('Failed to add reaction:', err);
    }
    onClose?.();
  };

  return (
    <div className="flex gap-1.5 p-2 border-b border-white/[0.04]">
      {emojis.map(e => (
        <button key={e} onClick={() => handleReact(e)}
          className="w-8 h-8 rounded-full bg-surface-2 hover:bg-surface-3 flex items-center justify-center text-sm hover:scale-105 transition-transform">
          <span style={{ color: 'initial' }}>{e}</span>
        </button>
      ))}
    </div>
  );
}

// Display existing reactions below a message
export function ReactionBubbles({ reactions, chatId, messageId, isMe }) {
  if (!reactions || typeof reactions !== 'object' || Object.keys(reactions).length === 0) return null;

  // Normalize reaction values — could be array, object, or number from Firestore
  const normalizeUsers = (val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'number') return new Array(val).fill('unknown');
    if (typeof val === 'object' && val !== null) return Object.keys(val);
    return [];
  };

  const handleToggle = async (emoji) => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid || !chatId || !messageId) return;
      const msgRef = doc(db, 'conversations', chatId, 'messages', messageId);
      const users = normalizeUsers(reactions[emoji]);
      if (users.includes(uid)) {
        await updateDoc(msgRef, { [`reactions.${emoji}`]: arrayRemove(uid) });
      } else {
        await updateDoc(msgRef, { [`reactions.${emoji}`]: arrayUnion(uid) });
      }
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
    }
  };

  return (
    <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
      {Object.entries(reactions).map(([emoji, rawUsers]) => {
        const users = normalizeUsers(rawUsers);
        if (users.length === 0) return null;
        const isMine = users.includes(auth.currentUser?.uid);
        return (
          <button key={emoji} onClick={() => handleToggle(emoji)}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition-colors ${
              isMine ? 'bg-brand-cyan/15 border border-brand-cyan/30' : 'bg-surface-2/80 border border-white/[0.06]'
            }`}>
            <span style={{ color: 'initial', fontSize: '13px' }}>{emoji}</span>
            <span className="text-[10px] font-dmmono text-text-muted">{users.length}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Renders as a fixed-position portal at (anchorX, anchorY), flipping toward
 * the opposite edge if it would overflow the viewport. A transparent
 * backdrop catches any click outside the menu and closes it.
 */
export function MessageContextMenu({ chatId, messageId, message, isMe, anchorX, anchorY, onClose, onReply, onEdit, onPin, onForward, onDelete }) {
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ left: anchorX ?? 0, top: anchorY ?? 0, visible: false });
  // When the menu opens from a long-press, the user's finger is still down.
  // The release of that finger fires a cascade on the backdrop: pointerup,
  // then synthesised mousedown/mouseup/click at the release point — which
  // would close the menu instantly. We swallow all events for a grace
  // window, and until we've observed a fresh pointerdown on the backdrop.
  const mountedAt = useRef(Date.now());
  const sawFreshDown = useRef(false);

  const items = [
    onReply && { icon: 'reply', label: 'Reply', action: () => { onReply?.(message); onClose?.(); } },
    isMe && onEdit && { icon: 'edit', label: 'Edit', action: () => { onEdit?.(message); onClose?.(); } },
    onForward && { icon: 'forward', label: 'Forward', action: () => { onForward?.(message); onClose?.(); } },
    { icon: 'content_copy', label: 'Copy', action: () => { navigator.clipboard?.writeText(message?.text || ''); onClose?.(); } },
    onPin && { icon: 'push_pin', label: message?.pinned ? 'Unpin' : 'Pin', action: () => { onPin?.(message); onClose?.(); } },
    isMe && { icon: 'delete', label: 'Delete', danger: true, action: () => { onDelete?.(message); onClose?.(); } },
  ].filter(Boolean);

  // Measure once mounted, then flip/clamp so the menu stays on screen
  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 8;
    let left = anchorX ?? 0;
    let top = anchorY ?? 0;
    if (left + rect.width + pad > vw) left = vw - rect.width - pad;
    if (left < pad) left = pad;
    if (top + rect.height + pad > vh) top = Math.max(pad, (anchorY ?? 0) - rect.height);
    if (top < pad) top = pad;
    setPos({ left, top, visible: true });
  }, [anchorX, anchorY]);

  // Close on ESC for keyboard users
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const GRACE_MS = 350;

  // pointerdown / touchstart = the user actually initiated a new tap. This
  // is the *only* signal we trust as a close intent.
  const onDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (Date.now() - mountedAt.current < GRACE_MS) return; // leftover from long-press
    sawFreshDown.current = true;
    onClose?.();
  };
  // Everything else (pointerup, mouseup, click, touchend) is only a close
  // if a matching down was seen first. Otherwise it's a stale release from
  // the long-press that opened us — swallow it.
  const onUp = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!sawFreshDown.current) return;
    onClose?.();
  };

  return createPortal(
    <>
      {/* Transparent backdrop. Close only on a FRESH press, and only after
          the grace window — otherwise the release of the long-press that
          opened us closes it again immediately. */}
      <div
        className="fixed inset-0 z-[9998]"
        onPointerDown={onDown}
        onTouchStart={onDown}
        onMouseDown={onDown}
        onPointerUp={onUp}
        onTouchEnd={onUp}
        onMouseUp={onUp}
        onClick={onUp}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); if (Date.now() - mountedAt.current >= GRACE_MS) onClose?.(); }}
      />
      <div
        ref={menuRef}
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="fixed z-[9999] w-48 bg-surface-1 border border-white/[0.06] rounded-xl shadow-xl overflow-hidden"
        style={{ left: pos.left, top: pos.top, opacity: pos.visible ? 1 : 0 }}
      >
        <QuickReactions chatId={chatId} messageId={messageId} onClose={onClose} />
        {items.map((item, i) => (
          <button key={i} onClick={item.action}
            className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2.5 ${
              item.danger ? 'text-brand-ember hover:bg-brand-ember/10' : 'text-text-primary hover:bg-surface-2'
            }`}>
            <Icon name={item.icon} size={16} className={item.danger ? '' : 'text-text-muted'} />
            {item.label}
          </button>
        ))}
      </div>
    </>,
    document.body
  );
}
