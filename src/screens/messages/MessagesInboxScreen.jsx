import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase/config';
import { useNotifications } from '../../context/NotificationContext';
import UserAvatar from '../../components/UserAvatar';
import Icon from '../../components/Icon';
import { timeAgo, getTier } from '../../utils/helpers';
import useResponsive from '../../hooks/useResponsive';

export default function MessagesInboxScreen() {
  const { isDesktop } = useResponsive();
  const navigate = useNavigate();
  // Conversations come from the single shared NotificationContext listener.
  // The screen used to mount its own onSnapshot, doubling Firestore reads.
  const { conversations } = useNotifications();
  const loading = !conversations;
  const [search, setSearch] = useState('');
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const filtered = search
    ? conversations.filter(c => {
        const otherId = c.participants.find(id => id !== auth.currentUser.uid);
        const name = c.isGroup ? c.groupName : c.metadata?.[otherId]?.name;
        return name?.toLowerCase().includes(search.toLowerCase());
      })
    : conversations;

  if (isDesktop) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-surface-2 flex items-center justify-center">
            <span className="text-4xl">💬</span>
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-2">Select a chat</h3>
          <p className="text-sm">Choose a conversation from the left panel</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 lg:pb-0 bg-bg-dark">
      {/* Sticky header with search (mobile only) */}
      <header className="sticky top-0 z-40 glass-header">
        <div className="flex items-center justify-between px-4 h-[52px]">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors lg:hidden">
              <Icon name="arrow_back" size={20} />
            </button>
            <h1 className="font-syne text-[17px] font-bold text-text-primary">Messages</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate('/messages/requests')}
              className="w-9 h-9 rounded-full flex items-center justify-center text-text-muted hover:text-text-secondary transition-colors relative"
              title="Message Requests"
            >
              <Icon name="mail" size={20} />
            </button>
            <button
              onClick={() => navigate('/messages/create-group')}
              className="w-9 h-9 rounded-full flex items-center justify-center text-text-muted hover:text-text-secondary transition-colors"
              title="New Group Chat"
            >
              <Icon name="group_add" size={20} />
            </button>
            <button
              onClick={() => navigate('/messages/new')}
              className="w-9 h-9 rounded-full flex items-center justify-center text-text-muted hover:text-text-secondary transition-colors"
              title="New Message"
            >
              <Icon name="edit_square" size={20} />
            </button>
          </div>
        </div>

        {/* Search bar inside sticky header */}
        <div className="px-4 pb-3">
          <label className="block relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
              <Icon name="search" size={18} />
            </div>
            <input
              type="text" placeholder="Search conversations..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-surface-2 border border-white/[0.06] rounded-xl py-2.5 pl-9 pr-4 text-text-primary text-sm focus:border-brand-cyan transition-colors outline-none"
            />
          </label>
        </div>
      </header>
      
      {/* Conversation list */}
      <div className="mt-1">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-muted text-[10px] font-bold uppercase tracking-[0.2em]">Syncing Encrypted Comms...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-32 text-center px-10">
            <div className="w-20 h-20 bg-surface-1 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/[0.04]">
              <Icon name="chat_bubble_outline" size={32} className="text-text-muted opacity-20" />
            </div>
            <h3 className="text-white font-bold mb-2">{search ? 'No matches' : 'No Transmissions'}</h3>
            <p className="text-text-muted text-xs leading-relaxed">
              {search ? 'Try a different search term.' : 'Your inbox is clear. Start a new conversation or check your message requests.'}
            </p>
            {!search && (
              <div className="flex flex-col gap-3 mt-8 max-w-xs mx-auto">
                <button 
                  onClick={() => navigate('/messages/new')}
                  className="px-6 py-3 bg-brand-cyan text-bg-dark font-black text-[10px] uppercase tracking-widest rounded-full"
                >
                  New Message
                </button>
                <button 
                  onClick={() => navigate('/messages/requests')}
                  className="px-6 py-3 bg-surface-2 text-white font-black text-[10px] uppercase tracking-widest rounded-full border border-white/[0.06]"
                >
                  View Requests
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            {filtered.map(conv => {
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
                  className={`w-full flex items-center gap-3.5 px-4 py-3.5 transition-all text-left group border-b border-white/[0.04] ${
                    unread > 0 ? 'bg-brand-cyan/[0.02]' : 'hover:bg-surface-1/40'
                  }`}
                >
                  <div 
                    className="relative cursor-pointer shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!conv.isGroup && otherId) navigate(`/user/${otherId}`);
                    }}
                  >
                    <UserAvatar 
                      src={displayData.avatar} 
                      size={52} 
                      tier={tier} 
                      isGroup={conv.isGroup} 
                    />
                    {isOnline && (
                      <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 border-[2.5px] border-bg-dark rounded-full"  />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h3 className={`font-bold text-[15px] truncate tracking-tight ${
                        unread > 0 ? 'text-white' : 'text-text-primary group-hover:text-white'
                      }`}>
                        {displayData.name}
                      </h3>
                      <span className={`text-[11px] ml-2 shrink-0 ${
                        unread > 0 ? 'text-brand-cyan font-bold' : 'text-text-muted'
                      }`}>
                        {conv.lastMessageAt ? timeAgo(conv.lastMessageAt.toDate()) : ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {conv.lastMessageSenderId === auth.currentUser.uid && (
                          <Icon name="done_all" size={14} className="text-brand-cyan/50 shrink-0" />
                        )}
                        <p className={`text-sm truncate leading-none ${
                          unread > 0 ? 'text-text-secondary font-medium' : 'text-text-muted'
                        }`}>
                          {conv.lastMessageText || 'Tap to chat'}
                        </p>
                      </div>
                      {unread > 0 && (
                        <span className="min-w-[22px] h-[22px] bg-brand-cyan rounded-full flex items-center justify-center text-[11px] text-bg-dark font-black px-1.5 shrink-0 ">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB for new message (mobile only) */}
      <button 
        onClick={() => navigate('/messages/new')}
        className="fixed bottom-24 right-5 lg:bottom-6 lg:right-6 w-14 h-14 rounded-full bg-brand-cyan text-bg-dark flex items-center justify-center z-30 shadow-lg shadow-brand-cyan/30 hover:brightness-110 active:scale-95 transition-all"
        aria-label="Start new chat"
      >
        <Icon name="edit" size={22} />
      </button>
    </div>
  );
}