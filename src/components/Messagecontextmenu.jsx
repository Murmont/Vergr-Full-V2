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

export function MessageContextMenu({ chatId, messageId, message, isMe, onClose, onReply, onEdit, onPin, onForward, onDelete }) {
  const items = [
    onReply && { icon: 'reply', label: 'Reply', action: () => { onReply?.(message); onClose?.(); } },
    isMe && onEdit && { icon: 'edit', label: 'Edit', action: () => { onEdit?.(message); onClose?.(); } },
    onForward && { icon: 'forward', label: 'Forward', action: () => { onForward?.(message); onClose?.(); } },
    { icon: 'content_copy', label: 'Copy', action: () => { navigator.clipboard?.writeText(message?.text || ''); onClose?.(); } },
    onPin && { icon: 'push_pin', label: message?.pinned ? 'Unpin' : 'Pin', action: () => { onPin?.(message); onClose?.(); } },
    isMe && { icon: 'delete', label: 'Delete', danger: true, action: () => { onDelete?.(message); onClose?.(); } },
  ].filter(Boolean);

  return (
    <div className="absolute z-50 w-48 bg-surface-1 border border-white/[0.06] rounded-xl shadow-xl overflow-hidden"
      style={{ bottom: '100%', right: isMe ? 0 : 'auto', left: isMe ? 'auto' : 0, marginBottom: 4 }}>
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
  );
}
