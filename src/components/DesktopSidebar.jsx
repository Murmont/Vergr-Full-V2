import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUser } from '../context/UserContext';
import { useNotifications } from '../context/NotificationContext';
import Icon from './Icon';
import UserAvatar from './UserAvatar';
import CreatePostModal from './CreatePostModal';
import { CoinIcon, VPIcon } from './CoinIcon';
import { resolveNavForPath, findActiveItem, MAIN_NAV } from '../config/navConfig';

// Placeholder squads — wire to real data later
const PLACEHOLDER_SQUADS = [
  { id: 's1', name: 'Night Raiders',    online: 3, color: 'from-brand-ember to-red-900' },
  { id: 's2', name: 'Apex Predators',   online: 2, color: 'from-orange-500 to-orange-900' },
  { id: 's3', name: 'Onyx Battalion',   online: 2, color: 'from-slate-400 to-slate-800' },
  { id: 's4', name: 'Warzone Warriors', online: 4, color: 'from-emerald-500 to-emerald-900' },
];

// Contextual left-rail. Main nav uses standalone items + flyout categories;
// sub-rails (Tournaments/Squads/etc) fall back to flat rendering.
export default function DesktopSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, wallet } = useUser();
  const { unreadChatCount } = useNotifications();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [flyout, setFlyout] = useState(null); // { group, top, left }
  const closeTimer = useRef(null);

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

  const nav = useMemo(() => resolveNavForPath(location.pathname), [location.pathname]);
  const activeItem = useMemo(() => findActiveItem(nav, location.pathname), [nav, location.pathname]);
  const isMain = nav.id === MAIN_NAV.id;

  const openFlyout = (group, e) => {
    if (collapsed) return;
    clearTimeout(closeTimer.current);
    const rect = e.currentTarget.getBoundingClientRect();
    setFlyout({ group, top: rect.top, left: rect.right + 6 });
  };
  const closeFlyout = () => {
    closeTimer.current = setTimeout(() => setFlyout(null), 120);
  };
  const keepFlyout = () => clearTimeout(closeTimer.current);

  const W = collapsed ? 'w-[72px]' : 'w-[240px]';

  // ─── Standalone nav button (first group, no header) ─────────────
  const NavBtn = ({ item }) => {
    const active = activeItem?.path === item.path;
    const badge = item.path === '/messages' ? unreadChatCount : 0;
    return (
      <button
        onClick={() => navigate(item.path)}
        title={collapsed ? item.label : undefined}
        className={`w-full flex items-center rounded-lg transition-all duration-150 group relative ${
          collapsed ? 'justify-center py-2.5 px-0' : 'gap-3 px-3 py-2'
        } ${
          active
            ? 'bg-[#1E1035] text-white'
            : 'text-text-secondary hover:bg-[#1A1A2A] hover:text-text-primary'
        }`}
        style={active ? { borderRight: '2px solid #B44FFF' } : undefined}
      >
        {/* keep layoutId for shared spring transition between active items */}
        {active && !collapsed && (
          <motion.div
            layoutId="sidebarActivePill"
            className="absolute right-0 top-0 bottom-0 w-[2px] bg-[#B44FFF]"
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
        <div className="relative">
          <Icon name={item.icon} filled={active} size={20} />
          {badge > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-brand-ember rounded-full flex items-center justify-center text-[9px] font-black text-white px-1">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </div>
        {!collapsed && (
          <span className={`text-[13px] tracking-tight ${active ? 'font-bold' : 'font-medium'}`}>
            {item.label}
          </span>
        )}
      </button>
    );
  };

  // ─── Category button (flyout parent) ────────────────────────────
  const CatBtn = ({ group }) => {
    const catActive = group.items.some(i => i.path === activeItem?.path);
    // Pick an icon per category header
    const catIcons = { Community: 'groups', Compete: 'emoji_events', You: 'person' };
    const catIcon = catIcons[group.header] || 'more_horiz';
    return (
      <button
        onMouseEnter={(e) => openFlyout(group, e)}
        onMouseLeave={closeFlyout}
        onClick={() => navigate(group.items[0].path)}
        title={collapsed ? group.header : undefined}
        className={`w-full flex items-center rounded-lg transition-all duration-150 relative ${
          collapsed ? 'justify-center py-2.5 px-0' : 'gap-3 px-3 py-2'
        } ${
          catActive
            ? 'bg-[#1E1035] text-white'
            : 'text-text-secondary hover:bg-[#1A1A2A] hover:text-text-primary'
        }`}
        style={catActive ? { borderRight: '2px solid #B44FFF' } : undefined}
      >
        {catActive && !collapsed && (
          <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-[#B44FFF]" />
        )}
        <Icon name={catIcon} size={20} />
        {!collapsed && (
          <>
            <span className={`text-[13px] tracking-tight flex-1 text-left ${catActive ? 'font-bold' : 'font-medium'}`}>
              {group.header}
            </span>
            <Icon name="chevron_right" size={14} className="text-text-muted/60" />
          </>
        )}
      </button>
    );
  };

  return (
    <>
      <aside className={`fixed left-0 top-0 bottom-0 ${W} bg-[#0F0F1A] border-r border-[#1E1E2E] flex flex-col z-50 transition-all duration-200`}>
        {/* Brand header */}
        <button
          onClick={() => navigate('/')}
          className={`flex items-center gap-2.5 px-4 py-4 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${collapsed ? 'justify-center px-0' : ''}`}
        >
          <img src="/brand/logo.png" alt="VERGR" className="w-8 h-8 rounded-lg shrink-0" />
          {!collapsed && (
            <span className="font-syne text-lg font-extrabold tracking-wide text-text-primary">VERGR</span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); toggleCollapsed(); }}
            className={`ml-auto p-1 rounded-md hover:bg-white/[0.06] text-text-muted hover:text-text-primary ${collapsed ? 'hidden' : ''}`}
            title="Collapse"
          >
            <Icon name="menu_open" size={18} />
          </button>
        </button>

        {/* Back to Main for contextual rails */}
        {!isMain && !collapsed && (
          <button
            onClick={() => navigate(nav.back?.path || '/')}
            className="flex items-center gap-2 px-4 py-2.5 text-text-muted hover:text-brand-cyan border-b border-white/[0.03] transition-colors"
          >
            <Icon name="arrow_back" size={16} />
            <span className="text-[11px] font-dmmono uppercase tracking-[0.12em]">{nav.back?.label || 'Back'}</span>
          </button>
        )}
        {!isMain && collapsed && (
          <button
            onClick={() => navigate(nav.back?.path || '/')}
            className="flex items-center justify-center py-2.5 text-text-muted hover:text-brand-cyan border-b border-white/[0.03]"
            title={nav.back?.label || 'Back'}
          >
            <Icon name="arrow_back" size={18} />
          </button>
        )}

        {/* Nav body */}
        <nav className="flex-1 overflow-y-auto no-scrollbar px-2 py-3">
          {isMain ? (
            <>
              {/* First group (no header) = standalone items */}
              {!collapsed && (
                <div className="px-3 pb-1.5 text-[9.5px] font-dmmono uppercase tracking-[0.18em] text-text-muted/70">Nav</div>
              )}
              <div className="space-y-0.5">
                {nav.groups[0].items.map(item => <NavBtn key={item.path} item={item} />)}
              </div>

              {/* Divider */}
              <div className="mx-2 my-3 h-px bg-white/[0.05]" />

              {/* Category buttons (Community, Compete, You) */}
              {!collapsed && (
                <div className="px-3 pb-1.5 text-[9.5px] font-dmmono uppercase tracking-[0.18em] text-text-muted/70">Navigation</div>
              )}
              <div className="space-y-0.5">
                {nav.groups.slice(1).map(g => <CatBtn key={g.header} group={g} />)}
              </div>

              {/* Divider */}
              <div className="mx-2 my-3 h-px bg-white/[0.05]" />

              {/* Squads */}
              {!collapsed ? (
                <>
                  <div className="flex items-center justify-between px-3 pb-1.5">
                    <span className="text-[9.5px] font-dmmono uppercase tracking-[0.18em] text-text-muted/70">Your Squads</span>
                    <button
                      onClick={() => navigate('/squads')}
                      className="w-4 h-4 rounded bg-brand-violet text-white text-[11px] font-black flex items-center justify-center hover:brightness-110"
                    >+</button>
                  </div>
                  <div className="space-y-0.5">
                    {PLACEHOLDER_SQUADS.map(s => (
                      <button
                        key={s.id}
                        onClick={() => navigate(`/squads/${s.id}`)}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-white/[0.03] text-left"
                      >
                        <div className="relative shrink-0">
                          <div className={`w-[26px] h-[26px] rounded-full bg-gradient-to-br ${s.color} flex items-center justify-center text-[11px] font-syne font-extrabold text-white`}>
                            {s.name[0]}
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 border border-[#0B0E1A]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-semibold text-text-secondary truncate leading-tight">{s.name}</div>
                          <div className="text-[9.5px] font-dmmono text-green-500 font-bold">{s.online} Online</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 pt-1">
                  {PLACEHOLDER_SQUADS.map(s => (
                    <button
                      key={s.id}
                      onClick={() => navigate(`/squads/${s.id}`)}
                      className="relative"
                      title={s.name}
                    >
                      <div className={`w-[26px] h-[26px] rounded-full bg-gradient-to-br ${s.color} flex items-center justify-center text-[11px] font-syne font-extrabold text-white`}>
                        {s.name[0]}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 border border-[#0B0E1A]" />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            // Contextual rails: flat rendering
            nav.groups.map((group, gi) => (
              <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
                {group.header && !collapsed && (
                  <div className="px-3 pb-1.5 text-[9.5px] font-dmmono uppercase tracking-[0.18em] text-text-muted/70">
                    {group.header}
                  </div>
                )}
                <div className="space-y-0.5">
                  {group.items.map(item => <NavBtn key={item.path} item={item} />)}
                </div>
              </div>
            ))
          )}
        </nav>

        {/* Rich user card */}
        <div
          className={`border-t border-white/[0.06] ${collapsed ? 'p-2' : 'p-3'}`}
          style={{ background: 'linear-gradient(180deg, transparent, rgba(123,111,255,0.08))' }}
        >
          {!collapsed ? (
            <>
              <button onClick={() => navigate('/profile')} className="w-full flex items-center gap-2.5 mb-2 text-left">
                <UserAvatar src={profile?.avatar || profile?.photoURL} size={30} isVerified={profile?.isVerified} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-extrabold text-text-primary truncate leading-tight">
                    {profile?.displayName || profile?.username || 'Gamer'}
                  </p>
                  <p className="text-[9.5px] text-brand-violet font-dmmono font-bold">VERGR Creator</p>
                </div>
              </button>
              {/* Level + XP bar */}
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[9px] font-dmmono font-bold text-text-muted">LVL</span>
                <span className="text-[11px] font-dmmono font-black text-brand-violet tabular-nums">{profile?.level || 1}</span>
                <div className="flex-1 h-[3px] bg-white/[0.08] rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-violet to-brand-pink rounded-sm"
                    style={{ width: `${Math.min(100, ((profile?.xp || 0) / (profile?.xpNext || 15000)) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="text-[8.5px] font-dmmono text-text-muted mb-2 tabular-nums">
                {compact(profile?.xp || 0)} / {compact(profile?.xpNext || 15000)} XP
              </div>
              {/* Coins + VP inline */}
              <div className="flex items-center gap-3 mb-2.5">
                <button onClick={() => navigate('/wallet')} className="flex items-center gap-1 hover:brightness-110">
                  <CoinIcon size={14} />
                  <span className="text-[10px] font-dmmono font-bold text-text-secondary tabular-nums">{compact(wallet?.balance || 0)}</span>
                </button>
                <button onClick={() => navigate('/wallet')} className="flex items-center gap-1 hover:brightness-110">
                  <VPIcon size={14} />
                  <span className="text-[10px] font-dmmono font-bold text-text-secondary tabular-nums">{compact(wallet?.vp || 0)}</span>
                </button>
              </div>
              {/* Go Live CTA */}
              <button
                onClick={() => navigate('/go-live')}
                className="w-full py-2 rounded-lg bg-gradient-to-r from-brand-violet to-brand-pink text-white text-[11px] font-extrabold flex items-center justify-center gap-1.5 hover:brightness-110 shadow-lg shadow-brand-violet/30"
              >
                <Icon name="podcasts" size={13} /> Go Live
              </button>
            </>
          ) : (
            <button onClick={() => navigate('/profile')} className="w-full flex justify-center">
              <UserAvatar src={profile?.avatar || profile?.photoURL} size={30} isVerified={profile?.isVerified} />
            </button>
          )}
        </div>

        {/* Expand toggle when collapsed */}
        {collapsed && (
          <button
            onClick={toggleCollapsed}
            className="flex items-center justify-center py-2 border-t border-white/[0.04] text-text-muted hover:text-text-primary"
            title="Expand"
          >
            <Icon name="menu" size={18} />
          </button>
        )}

        {showCreateModal && <CreatePostModal onClose={() => setShowCreateModal(false)} />}
      </aside>

      {/* Flyout portal */}
      {flyout && createPortal(
        <div
          onMouseEnter={keepFlyout}
          onMouseLeave={closeFlyout}
          style={{ position: 'fixed', top: flyout.top, left: flyout.left, zIndex: 9999 }}
          className="bg-[#13131f] border border-white/[0.08] rounded-xl p-1.5 min-w-[190px] shadow-2xl shadow-black/60"
        >
          <div className="px-2.5 pt-1.5 pb-2 text-[9.5px] font-dmmono font-bold text-text-muted/70 uppercase tracking-[0.1em] border-b border-white/[0.04] mb-1">
            {flyout.group.header}
          </div>
          {flyout.group.items.map(item => (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); setFlyout(null); }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-text-secondary hover:bg-brand-violet/12 hover:text-text-primary text-[12.5px] font-medium text-left transition-colors"
            >
              <Icon name={item.icon} size={14} className="text-text-muted" />
              {item.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

function compact(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

