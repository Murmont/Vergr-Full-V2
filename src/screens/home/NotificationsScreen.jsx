import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useNotifications } from '../../context/NotificationContext';
import TopBar from '../../components/TopBar';
import UserAvatar from '../../components/UserAvatar';
import Icon from '../../components/Icon';
import { timeAgo } from '../../utils/helpers';
import { useLayout } from '../../context/LayoutContext';

const NOTIF_ICONS = {
  like: { icon: 'favorite', color: 'text-brand-ember', bg: 'bg-brand-ember/10' },
  follow: { icon: 'person_add', color: 'text-brand-cyan', bg: 'bg-brand-cyan/10' },
  coins: { icon: 'paid', color: 'text-brand-gold', bg: 'bg-brand-gold/10' },
  squad: { icon: 'groups', color: 'text-brand-violet', bg: 'bg-brand-violet/10' },
  comment: { icon: 'chat_bubble', color: 'text-brand-cyan', bg: 'bg-brand-cyan/10' },
  stream: { icon: 'live_tv', color: 'text-brand-ember', bg: 'bg-brand-ember/10' },
  system: { icon: 'info', color: 'text-brand-violet', bg: 'bg-brand-violet/10' },
};

export default function NotificationsScreen() {
  const { notifications: ctxNotifications, markAllRead, markRead } = useNotifications();
  const navigate = useNavigate();
  const { setRightPanel } = useLayout();
  const loading = ctxNotifications == null;

  // Reuse the shared notifications subscription instead of opening a second
  // listener (saves another full read of the notifications collection per
  // visit).
  const notifications = useMemo(() => {
    const list = (ctxNotifications || []).map(n => ({
      ...n,
      createdAt: n.createdAt?.toDate ? n.createdAt.toDate() : (n.createdAt || new Date()),
    }));
    if (list.length === 0) {
      return [{
        id: 'welcome-system',
        type: 'system',
        content: 'Welcome to Vergr! Start by following creators or posting your first clip.',
        read: false,
        createdAt: new Date(),
      }];
    }
    return list;
  }, [ctxNotifications]);

  useEffect(() => {
    setRightPanel(null);
    return () => setRightPanel(null);
  }, [setRightPanel]);

  const handleNotifClick = async (notif) => {
    if (!notif.read && notif.id !== 'welcome-system') {
      markRead(notif.id);
    }

    if (notif.type === 'follow' && notif.senderId) {
      navigate(`/user/${notif.senderId}`);
    } else if ((notif.type === 'like' || notif.type === 'comment') && notif.postId) {
      navigate(`/post/${notif.postId}`);
    } else if (notif.type === 'squad' && notif.squadId) {
      navigate(`/squads/${notif.squadId}`);
    } else if (notif.type === 'stream' && notif.streamId) {
      navigate(`/stream/${notif.streamId}`);
    }
  };

  return (
    <div className="min-h-screen pb-8">
      <TopBar 
        title="Notifications" 
        showBack 
        actions={
          <button onClick={markAllRead} className="text-text-secondary text-xs font-medium hover:text-text-primary transition-colors">
            Mark all read
          </button>
        } 
      />

      <div className="divide-y divide-white/[0.04]">
        {loading ? (
          <div className="p-8 text-center text-text-muted">
            <div className="w-6 h-6 border-2 border-surface-3 border-t-brand-cyan rounded-full animate-spin mx-auto mb-3" />
            <span className="text-xs font-dmmono">Loading</span>
          </div>
        ) : (
          notifications.map((notif, idx) => {
            const style = NOTIF_ICONS[notif.type] || NOTIF_ICONS.system;
            return (
              <motion.button
                key={notif.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(idx * 0.04, 0.4), duration: 0.2 }}
                onClick={() => handleNotifClick(notif)}
                className={`w-full flex items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-surface-1/30 ${!notif.read ? 'bg-brand-cyan/[0.02]' : ''}`}
              >
                {notif.senderAvatar ? (
                  <UserAvatar src={notif.senderAvatar} size={40} />
                ) : (
                  <div className={`w-10 h-10 rounded-xl ${style.bg} flex items-center justify-center shrink-0`}>
                    <Icon name={style.icon} filled size={20} className={style.color} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-relaxed ${!notif.read ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                    {notif.senderName && <span className="font-bold text-white">{notif.senderName} </span>}
                    {notif.content}
                  </p>
                  <p className="text-text-muted text-xs mt-1 font-dmmono">{timeAgo(notif.createdAt)}</p>
                </div>
                {!notif.read && (
                  <div className="w-2 h-2 bg-brand-cyan rounded-full mt-2 shrink-0" />
                )}
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
}