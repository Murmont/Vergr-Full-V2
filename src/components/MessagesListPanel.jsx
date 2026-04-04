import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import UserAvatar from './UserAvatar';
import Icon from './Icon';
import { timeAgo, getTier } from '../utils/helpers';

export default function MessagesListPanel({ hideSearch = false }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', auth.currentUser.uid),
      where('status', '==', 'active'),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setConversations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Inbox listener error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filtered = search
    ? conversations.filter(c => {
        const otherId = c.participants.find(id => id !== auth.currentUser.uid);
        const name = c.isGroup ? c.groupName : c.metadata?.[otherId]?.name;
        return name?.toLowerCase().includes(search.toLowerCase());
      })
    : conversations;

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-text-muted text-[10px] font-bold uppercase tracking-[0.2em]">Syncing...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {!hideSearch && (
        <div className="p-3 border-b border-white/[0.04]">
          <label className="block relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
              <Icon name="search" size={18} />
            </div>
            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-2 border border-white/[0.06] rounded-xl py-2 pl-9 pr-4 text-text-primary text-sm focus:border-brand-cyan transition-colors outline-none"
            />
          </label>
        </div>
      )}

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {filtered.length === 0 ? (
          <div className="py-16 text-center px-6">
            <Icon name="chat_bubble_outline" size={40} className="text-text-muted opacity-20 mx-auto mb-3" />
            <p className="text-text-muted text-sm">{search ? 'No matches' : 'No conversations yet'}</p>
          </div>
        ) : (
          filtered.map(conv => {
            const otherId = conv.participants.find(id => id !== auth.currentUser.uid);
            const displayData = conv.isGroup
                ? { name: conv.groupName, avatar: conv.groupIcon }
                : conv.metadata?.[otherId] || { name: 'Unknown User', avatar: null, coinsSpent: 0 };
            const tier = !conv.isGroup ? getTier(displayData.coinsSpent || 0) : null;
            const unread = conv.unreadCount?.[auth.currentUser.uid] || 0;
            const isOnline = !conv.isGroup && conv.metadata?.[otherId]?.status === 'online';

            return (
              <button
                key={conv.id}
                onClick={() => navigate(`/messages/${conv.id}`)}
                className={`w-full flex items-center gap-3.5 px-4 py-3.5 transition-all text-left hover:bg-surface-1/40 border-b border-white/[0.04] ${
                  unread > 0 ? 'bg-brand-cyan/[0.02]' : ''
                }`}
              >
                <div 
                  className="relative shrink-0 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!conv.isGroup && otherId) navigate(`/user/${otherId}`);
                  }}
                >
                  <UserAvatar src={displayData.avatar} size={48} tier={tier} isGroup={conv.isGroup} />
                  {isOnline && (
                    <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 border-2 border-bg-dark rounded-full"  />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className={`font-bold text-sm truncate ${unread > 0 ? 'text-white' : 'text-text-primary'}`}>
                      {displayData.name}
                    </h3>
                    <span className={`text-[10px] ml-2 shrink-0 ${unread > 0 ? 'text-brand-cyan font-bold' : 'text-text-muted'}`}>
                      {conv.lastMessageAt ? timeAgo(conv.lastMessageAt.toDate()) : ''}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {conv.lastMessageSenderId === auth.currentUser.uid && (
                        <Icon name="done_all" size={12} className="text-brand-cyan/50 shrink-0" />
                      )}
                      <p className={`text-xs truncate leading-none ${unread > 0 ? 'text-text-secondary font-medium' : 'text-text-muted'}`}>
                        {conv.lastMessageText || 'Tap to chat'}
                      </p>
                    </div>
                    {unread > 0 && (
                      <span className="min-w-[20px] h-[20px] bg-brand-cyan rounded-full flex items-center justify-center text-[10px] text-bg-dark font-black px-1.5 shrink-0 ">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}