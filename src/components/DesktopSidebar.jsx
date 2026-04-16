import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUser } from '../context/UserContext';
import { useNotifications } from '../context/NotificationContext';
import Icon from './Icon';
import UserAvatar from './UserAvatar';
import CreatePostModal from './CreatePostModal';

const NAV_ITEMS = [
  { path: '/', icon: 'home', label: 'Home' },
  { path: '/explore', icon: 'explore', label: 'Explore' },
  { path: '/shorts', icon: 'slow_motion_video', label: 'Shorts' },
  { path: '/messages', icon: 'chat_bubble', label: 'Messages' },
  { path: '/calls', icon: 'call', label: 'Calls' },
  { path: '/status', icon: 'amp_stories', label: 'Status' },
  { path: '/squads', icon: 'groups', label: 'Squads' },
  { path: '/tournaments', icon: 'emoji_events', label: 'Tournaments' },
  { path: '/wallet', icon: 'account_balance_wallet', label: 'Wallet' },
  { path: '/leaderboard', icon: 'leaderboard', label: 'Leaderboard' },
  { path: '/ad-center', icon: 'campaign', label: 'Ad Center' },
  { path: '/settings', icon: 'settings', label: 'Settings' },
];

export default function DesktopSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useUser();
  const { unreadChatCount } = useNotifications();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('vergr_sidebar_collapsed') === '1'; } catch { return false; }
  });

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem('vergr_sidebar_collapsed', next ? '1' : '0'); } catch {}
    window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: { collapsed: next } }));
  };

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: { collapsed } }));
  }, [collapsed]);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const getBadge = (item) => {
    if (item.icon === 'chat_bubble' && unreadChatCount > 0) return unreadChatCount;
    return 0;
  };

  const W = collapsed ? 'w-[72px]' : 'w-[260px]';

  return (
    <aside className={`fixed left-0 top-0 bottom-0 ${W} bg-surface-1 border-r border-white/[0.06] flex flex-col z-50 transition-all duration-200`}>
      {/* Header */}
      <div className={`px-3 py-4 flex items-center border-b border-white/[0.03] ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <h1 className="font-syne text-xl font-bold tracking-tight text-text-primary cursor-pointer pl-2" onClick={() => navigate('/')}>VERGR</h1>
        )}
        <button onClick={toggleCollapsed} className="p-1.5 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors" title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <Icon name={collapsed ? 'menu' : 'menu_open'} size={20} />
        </button>
      </div>

      {/* Profile */}
      <button onClick={() => navigate('/profile')} className={`mx-2 mt-3 rounded-2xl hover:bg-surface-2/50 transition-all group text-left ${collapsed ? 'p-2 flex justify-center' : 'p-2.5 flex items-center gap-3'}`}
        title={collapsed ? (profile?.displayName || 'Profile') : undefined}>
        <UserAvatar src={profile?.avatar || profile?.photoURL} size={collapsed ? 34 : 38} isVerified={profile?.isVerified} />
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-text-primary truncate">{profile?.displayName || 'Gamer'}</p>
            <p className="text-[10px] text-brand-cyan font-dmmono truncate">@{profile?.username || 'username'}</p>
          </div>
        )}
      </button>

      {/* Navigation */}
      <nav className="flex-1 px-2 mt-3 space-y-0.5">
        {NAV_ITEMS.map(item => {
          const active = isActive(item.path);
          const badge = getBadge(item);
          return (
            <button key={item.path} onClick={() => navigate(item.path)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center rounded-xl transition-all duration-200 group relative ${collapsed ? 'justify-center py-2.5 px-0' : 'gap-3.5 px-3.5 py-2.5'} ${active ? 'bg-brand-cyan/10 text-brand-cyan' : 'text-text-secondary hover:bg-surface-2/60 hover:text-text-primary'}`}>
              {active && (
                <motion.div
                  layoutId="sidebarActiveIndicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-brand-cyan rounded-r-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <div className="relative">
                <Icon name={item.icon} filled={active} size={22} />
                {badge > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-brand-ember rounded-full flex items-center justify-center text-[9px] font-black text-white px-1" >{badge > 99 ? '99+' : badge}</span>}
              </div>
              {!collapsed && <span className={`text-sm font-semibold tracking-tight ${active ? 'font-bold' : ''}`}>{item.label}</span>}
              {collapsed && <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-surface-1 border border-white/[0.06] rounded-lg shadow-xl text-xs font-semibold text-text-primary whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[60]">{item.label}{badge > 0 && <span className="ml-1.5 text-brand-ember">({badge})</span>}</div>}
            </button>
          );
        })}
      </nav>

      {/* Create post CTA */}
      <div className="px-2 mb-3 mt-2">
        <button onClick={() => setShowCreateModal(true)} title={collapsed ? 'Create Post' : undefined}
          className={`w-full rounded-xl bg-brand-cyan text-bg-dark font-bold text-sm hover:brightness-110 active:scale-[0.97] transition-all flex items-center justify-center gap-2 ${collapsed ? 'py-2.5' : 'py-2.5'}`}>
          <Icon name="add" size={20} />
          {!collapsed && 'Create Post'}
        </button>
      </div>

      {!collapsed && <div className="px-4 py-2.5 border-t border-white/[0.04]"><p className="text-[8px] text-text-muted font-dmmono uppercase tracking-[0.15em]">Where Gamers Converge</p></div>}

      {showCreateModal && <CreatePostModal onClose={() => setShowCreateModal(false)} />}
    </aside>
  );
}