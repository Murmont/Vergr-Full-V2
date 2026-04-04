// src/screens/settings/SettingsScreen.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import TopBar from '../../components/TopBar';
import UserAvatar from '../../components/UserAvatar';
import Icon from '../../components/Icon';
import useResponsive from '../../hooks/useResponsive';
import { useLayout } from '../../context/LayoutContext';

const SETTINGS_SECTIONS = [
  {
    title: 'Account',
    items: [
      { icon: 'person', label: 'Edit Profile', route: '/edit-profile' },
      { icon: 'lock', label: 'Privacy & Security', route: '/settings/privacy' },
      { icon: 'notifications', label: 'Notifications', route: '/settings/notifications' },
      { icon: 'link', label: 'Linked Accounts', route: '/settings/linked-accounts' },
    ],
  },
  {
    title: 'Earnings & Payments',
    items: [
      { icon: 'workspace_premium', label: 'Subscription', route: '/settings/subscription' },
      { icon: 'account_balance_wallet', label: 'Wallet', route: '/wallet' },
      { icon: 'paid', label: 'Earn Coins', route: '/earn' },
      { icon: 'savings', label: 'Cash Out', route: '/request-payout' },
    ],
  },
  {
    title: 'Creator Tools',
    items: [
      { icon: 'analytics', label: 'Creator Dashboard', route: '/creator/dashboard' },
      { icon: 'live_tv', label: 'Stream Settings', route: '/go-live' },
      { icon: 'card_membership', label: 'Membership Tiers', route: '/creator/membership' },
    ],
  },
  {
    title: 'Data & Storage',
    items: [
      { icon: 'cloud_sync', label: 'Backup & Storage', route: '/settings/backup' },
      { icon: 'storage', label: 'Manage Local Data', route: '/settings/backup' },
    ],
  },
  {
    title: 'App',
    items: [
      { icon: 'language', label: 'Language', route: '/settings/language' },
      { icon: 'palette', label: 'Display', route: '/settings/display' },
      { icon: 'school', label: 'How VERGR Works', route: '/settings/how-it-works' },
      { icon: 'help', label: 'Help & Support', route: '/settings/help' },
      { icon: 'info', label: 'About VERGR', route: '/settings/about' },
    ],
  },
];

export default function SettingsScreen() {
  const { logout } = useAuth();
  const { profile, wallet } = useUser();
  const navigate = useNavigate();
  const { isMobile, isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  useEffect(() => {
    setRightPanel(null);
    setContentAlign('left');
    return () => {
      setRightPanel(null);
      setContentAlign('center');
    };
  }, [setRightPanel, setContentAlign]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const leftColumnSections = SETTINGS_SECTIONS.slice(0, 3);
  const rightColumnSections = SETTINGS_SECTIONS.slice(3, 5);

  return (
    <div className="pb-8">
      {isMobile && <TopBar title="Settings" showBack />}
      {!isMobile && (
        <div className="flex justify-start px-4 pt-4">
          <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white transition-colors" aria-label="Go back">
            <Icon name="arrow_back" size={24} />
          </button>
        </div>
      )}

      <button onClick={() => navigate('/profile')} className="mx-4 mt-2 flex items-center gap-3 p-4 rounded-2xl border border-white/[0.06] bg-surface-1 hover:bg-surface-2/50 transition-colors">
        <UserAvatar src={profile?.avatar} size={52} tier={wallet?.totalSpent || 0} isVerified={profile?.isVerified} />
        <div className="flex-1 min-w-0 text-left">
          <p className="font-semibold text-text-primary truncate">{profile?.displayName}</p>
          <p className="text-text-muted text-sm">@{profile?.username}</p>
        </div>
        <Icon name="chevron_right" size={20} className="text-text-muted" />
      </button>

      {isDesktop ? (
        <div className="grid grid-cols-2 gap-6 px-4 mt-6">
          <div className="space-y-6">
            {leftColumnSections.map(section => (
              <div key={section.title}>
                <h3 className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2 px-1">{section.title}</h3>
                <div className="rounded-2xl border border-white/[0.06] bg-surface-1 overflow-hidden">
                  {section.items.map((item, i) => (
                    <button key={item.label} onClick={() => navigate(item.route)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-surface-2 transition-colors text-left ${
                        i > 0 ? 'border-t border-white/[0.04]' : ''
                      }`}>
                      <Icon name={item.icon} size={22} className="text-text-secondary" />
                      <span className="flex-1 text-sm text-text-primary">{item.label}</span>
                      <Icon name="chevron_right" size={18} className="text-text-muted" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-6">
            {rightColumnSections.map(section => (
              <div key={section.title}>
                <h3 className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2 px-1">{section.title}</h3>
                <div className="rounded-2xl border border-white/[0.06] bg-surface-1 overflow-hidden">
                  {section.items.map((item, i) => (
                    <button key={item.label} onClick={() => navigate(item.route)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-surface-2 transition-colors text-left ${
                        i > 0 ? 'border-t border-white/[0.04]' : ''
                      }`}>
                      <Icon name={item.icon} size={22} className="text-text-secondary" />
                      <span className="flex-1 text-sm text-text-primary">{item.label}</span>
                      <Icon name="chevron_right" size={18} className="text-text-muted" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-4 mt-6 space-y-6">
          {SETTINGS_SECTIONS.map(section => (
            <div key={section.title}>
              <h3 className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2 px-1">{section.title}</h3>
              <div className="rounded-2xl border border-white/[0.06] bg-surface-1 overflow-hidden">
                {section.items.map((item, i) => (
                  <button key={item.label} onClick={() => navigate(item.route)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-surface-2 transition-colors text-left ${
                      i > 0 ? 'border-t border-white/[0.04]' : ''
                    }`}>
                    <Icon name={item.icon} size={22} className="text-text-secondary" />
                    <span className="flex-1 text-sm text-text-primary">{item.label}</span>
                    <Icon name="chevron_right" size={18} className="text-text-muted" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="px-4 mt-8 mb-6">
        <button onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-brand-ember/30 text-brand-ember hover:bg-brand-ember/5 transition-colors">
          <Icon name="logout" size={20} />
          <span className="font-semibold text-sm">Log Out</span>
        </button>
        <p className="text-text-muted text-xs text-center mt-4">VERGR v1.0.0</p>
      </div>
    </div>
  );
}