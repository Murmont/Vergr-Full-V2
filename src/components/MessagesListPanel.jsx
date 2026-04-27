// Messaging left panel — restyled per the design mock.
// Splits conversations into DIRECT MESSAGES and GROUPS with Discord-style
// section headers. Compact 280px width to match the new 3-col layout.
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase/config';
import { useNotifications } from '../context/NotificationContext';
import UserAvatar from './UserAvatar';
import Icon from './Icon';
import { timeAgo, getTier } from '../utils/helpers';

// Placeholder voice channels — wired when we add voice chat
const PLACEHOLDER_VOICE = [
  { id: 'v1', name: 'Lobby',  users: 3 },
  { id: 'v2', name: 'Raids',  users: 0 },
  { id: 'v3', name: 'Lounge', users: 1 },
];

export default function MessagesListPanel({ hideSearch = false }) {
  const { conversations } = useNotifications();
  const loading = !conversations;
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const filtered = search
    ? (conversations || []).filter(c => {
        const otherId = c.participants?.find(id => id !== auth.currentUser?.uid);
        const name = c.isGroup ? c.groupName : c.metadata?.[otherId]?.name;
        return name?.toLowerCase().includes(search.toLowerCase());
      })
    : (conversations || []);

  const groups = filtered.filter(c => c.isGroup);
  const dms    = filtered.filter(c => !c.isGroup);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-6 h-6 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-text-muted text-[9px] font-bold uppercase tracking-[0.2em]">Syncing</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header: title + quick actions */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-syne text-lg font-extrabold tracking-tight text-text-primary">Messages</h2>
            <p className="text-[10px] font-dmmono uppercase tracking-[0.14em] text-text-muted mt-0.5">
              Talk · Team Up · Belong
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate('/messages/new')}
              className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-text-primary flex items-center justify-center"
              title="New message"
            >
              <Icon name="edit_square" size={16} />
            </button>
            <button
              onClick={() => navigate('/messages/create-group')}
              className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-text-primary flex items-center justify-center"
              title="New group"
            >
              <Icon name="group_add" size={16} />
            </button>
          </div>
        </div>

        {!hideSearch && (
          <label className="relative block">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-text-muted">
              <Icon name="search" size={15} />
            </div>
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg py-1.5 pl-8 pr-3 text-text-primary text-xs focus:border-brand-cyan/40 outline-none"
            />
          </label>
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-2 pb-4">
        {/* Quick links */}
        <button
          onClick={() => navigate('/messages/browse')}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-text-muted hover:bg-white/[0.04] hover:text-text-primary text-[13px] font-medium"
        >
          <Icon name="group_add" size={16} /> Browse Groups
        </button>
        <button
          onClick={() => navigate('/messages/friends')}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-text-muted hover:bg-white/[0.04] hover:text-text-primary text-[13px] font-medium"
        >
          <Icon name="person" size={16} /> Friends
        </button>
        <button
          onClick={() => navigate('/messages/requests')}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-text-muted hover:bg-white/[0.04] hover:text-text-primary text-[13px] font-medium"
        >
          <Icon name="outbox" size={16} /> Requests
        </button>

        {/* DMs */}
        {dms.length > 0 && (
          <div className="mt-4">
            <div className="px-3 pb-1 flex items-center justify-between">
              <span className="text-[9px] font-dmmono uppercase tracking-[0.18em] text-text-muted">Direct Messages</span>
              <Icon name="expand_more" size={14} className="text-text-muted" />
            </div>
            <div className="space-y-0.5">
              {dms.map(conv => <DmRow key={conv.id} conv={conv} active={location.pathname === `/messages/${conv.id}`} onClick={() => navigate(`/messages/${conv.id}`)} />)}
            </div>
          </div>
        )}

        {/* Groups */}
        {groups.length > 0 && (
          <div className="mt-4">
            <div className="px-3 pb-1 flex items-center justify-between">
              <span className="text-[9px] font-dmmono uppercase tracking-[0.18em] text-text-muted">Groups</span>
              <Icon name="add" size={14} className="text-text-muted cursor-pointer hover:text-text-primary" onClick={() => navigate('/messages/create-group')} />
            </div>
            <div className="space-y-0.5">
              {groups.map(conv => <GroupRow key={conv.id} conv={conv} active={location.pathname === `/messages/${conv.id}`} onClick={() => navigate(`/messages/${conv.id}`)} />)}
            </div>
          </div>
        )}

        {dms.length === 0 && groups.length === 0 && (
          <div className="py-12 text-center px-4">
            <Icon name="chat_bubble_outline" size={36} className="text-text-muted/30 mx-auto mb-2" />
            <p className="text-text-muted text-xs">{search ? 'No matches' : 'No conversations yet'}</p>
          </div>
        )}

        {/* Voice channels placeholder */}
        <div className="mt-5">
          <div className="px-3 pb-1 flex items-center justify-between">
            <span className="text-[9px] font-dmmono uppercase tracking-[0.18em] text-text-muted">Voice Channels</span>
          </div>
          <div className="space-y-0.5">
            {PLACEHOLDER_VOICE.map(v => (
              <div key={v.id} className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-text-muted hover:bg-white/[0.04] cursor-pointer text-[13px]">
                <Icon name="volume_up" size={15} />
                <span className="flex-1 truncate">{v.name}</span>
                {v.users > 0 && (
                  <span className="font-dmmono text-[10px] text-brand-cyan">{v.users}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DmRow({ conv, active, onClick }) {
  const otherId = conv.participants?.find(id => id !== auth.currentUser?.uid);
  const data = conv.metadata?.[otherId] || { name: 'Unknown', avatar: null, coinsSpent: 0 };
  const tier = getTier(data.coinsSpent || 0);
  const unread = conv.unreadCount?.[auth.currentUser?.uid] || 0;
  const online = conv.metadata?.[otherId]?.status === 'online';
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-left transition-colors ${
        active ? 'bg-brand-violet/20 text-white' : 'text-text-secondary hover:bg-white/[0.04] hover:text-text-primary'
      }`}
    >
      <div className="relative shrink-0">
        <UserAvatar src={data.avatar} size={28} tier={tier} showTierRing={false} />
        {online && <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-green-500 border border-[#0B0E1A]" />}
      </div>
      <span className="flex-1 text-[13px] truncate">{data.name}</span>
      {unread > 0 && (
        <span className="min-w-[16px] h-4 bg-brand-ember rounded-full text-[9px] font-bold text-white flex items-center justify-center px-1">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
}

function GroupRow({ conv, active, onClick }) {
  const unread = conv.unreadCount?.[auth.currentUser?.uid] || 0;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-left transition-colors ${
        active ? 'bg-brand-violet/20 text-white' : 'text-text-secondary hover:bg-white/[0.04] hover:text-text-primary'
      }`}
    >
      <Icon name="tag" size={15} className="text-text-muted shrink-0" />
      <span className="flex-1 text-[13px] truncate">{conv.groupName || 'Group'}</span>
      {unread > 0 && (
        <span className="min-w-[16px] h-4 bg-brand-ember rounded-full text-[9px] font-bold text-white flex items-center justify-center px-1">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
}
