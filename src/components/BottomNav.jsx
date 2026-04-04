import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from './Icon';
import { useNotifications } from '../context/NotificationContext';

const tabs = [
  { path: '/', icon: 'home', label: 'Home' },
  { path: '/explore', icon: 'explore', label: 'Explore' },
  { path: '/messages', icon: 'chat_bubble', label: 'Chat' },
  { path: '/squads', icon: 'groups', label: 'Squads' },
  { path: '/profile', icon: 'person', label: 'Profile' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadChatCount = 0 } = useNotifications();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50 glass-header safe-bottom lg:hidden" style={{ borderBottom: 'none', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
      <div className="flex items-center justify-around h-14 px-2">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          const badge = tab.icon === 'chat_bubble' ? unreadChatCount : 0;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center w-16 h-full gap-0.5 transition-colors duration-200 relative ${
                active ? 'text-brand-cyan' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {active && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute -top-[1px] w-8 h-[2px] bg-brand-cyan rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <div className="relative flex items-center justify-center">
                <Icon name={tab.icon} filled={active} size={22} />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 bg-brand-ember rounded-full flex items-center justify-center text-[9px] font-black text-white px-1">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </div>
              <span className={`text-[9px] font-semibold uppercase tracking-tight transition-opacity ${active ? 'opacity-100' : 'opacity-50'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
