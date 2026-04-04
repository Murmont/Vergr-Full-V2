import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import { useUI } from '../../context/UIContext';
import { updateUserSettings, getBlockedUsers } from '../../firebase/firestore';
import TopBar from '../../components/TopBar';
import Icon from '../../components/Icon';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';

const DEFAULT_PRIVACY = {
  privateProfile: false, showOnlineStatus: true, allowDMs: true,
  showActivity: true, showLinkedAccounts: true, allowTagging: true,
  bookmarkVisibility: 'private', // private | followers | everyone
};

export default function PrivacySettingsScreen() {
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  useEffect(() => {
    setRightPanel(null);
    if (isDesktop) setContentAlign('left');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign, isDesktop]);
  const { currentUser } = useAuth();
  const { profile } = useUser();
  const { showToast } = useUI();
  const navigate = useNavigate();
  const [settings, setSettings] = useState(DEFAULT_PRIVACY);
  const [blockedCount, setBlockedCount] = useState(0);
  const saveTimer = useRef(null);

  useEffect(() => {
    if (profile?.settings) {
      setSettings(prev => ({ ...prev, ...profile.settings }));
    }
  }, [profile]);

  useEffect(() => {
    if (!currentUser) return;
    getBlockedUsers(currentUser.uid).then(users => setBlockedCount(users.length)).catch(() => {});
  }, [currentUser]);

  const toggle = (key) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        try {
          await updateUserSettings(currentUser.uid, { ...profile?.settings, ...updated });
        } catch (err) {
          console.error('Failed to save:', err);
          showToast('Failed to save', 'error');
        }
      }, 800);
      return updated;
    });
  };

  const items = [
    { key: 'privateProfile', label: 'Private Profile', desc: 'Only approved followers can see your posts', icon: 'lock' },
    { key: 'showOnlineStatus', label: 'Show Online Status', desc: "Let others see when you're online", icon: 'circle' },
    { key: 'allowDMs', label: 'Allow Direct Messages', desc: 'Receive messages from anyone', icon: 'chat' },
    { key: 'showActivity', label: 'Show Activity Status', desc: "Show what you're playing or streaming", icon: 'sports_esports' },
    { key: 'showLinkedAccounts', label: 'Show Linked Accounts', desc: 'Display Twitch, Discord, etc on profile', icon: 'link' },
    { key: 'allowTagging', label: 'Allow Tagging', desc: 'Let others tag you in posts', icon: 'sell' },
  ];

  return (
    <div className={isDesktop ? "min-h-screen pb-8" : "screen-container min-h-screen pb-8"}>
      <TopBar title="Privacy & Security" showBack />
      <div className="px-4 py-4 space-y-3">
        {items.map(item => (
          <div key={item.key} className="flex items-center justify-between p-4 rounded-2xl bg-surface-1 border border-white/[0.06]">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Icon name={item.icon} size={22} className="text-text-secondary shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="text-xs text-text-muted truncate">{item.desc}</p>
              </div>
            </div>
            <button onClick={() => toggle(item.key)}
              className={`w-12 h-7 rounded-full transition-colors shrink-0 ml-3 ${settings[item.key] ? 'bg-brand-cyan' : 'bg-surface-3'}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${settings[item.key] ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        ))}

        {/* Bookmark visibility */}
        <div className="p-4 rounded-2xl bg-surface-1 border border-white/[0.06]">
          <div className="flex items-center gap-3 mb-3">
            <Icon name="bookmark" size={22} className="text-text-secondary" />
            <div>
              <p className="text-sm font-semibold">Bookmark Visibility</p>
              <p className="text-xs text-text-muted">Who can see your bookmarked posts</p>
            </div>
          </div>
          <div className="flex gap-2">
            {[
              { value: 'private', label: 'Only me', icon: 'lock' },
              { value: 'followers', label: 'Followers', icon: 'group' },
              { value: 'everyone', label: 'Everyone', icon: 'public' },
            ].map(opt => (
              <button key={opt.value} onClick={() => {
                setSettings(prev => {
                  const updated = { ...prev, bookmarkVisibility: opt.value };
                  clearTimeout(saveTimer.current);
                  saveTimer.current = setTimeout(async () => {
                    try { await updateUserSettings(currentUser.uid, { ...profile?.settings, ...updated }); }
                    catch (err) { showToast('Failed to save', 'error'); }
                  }, 800);
                  return updated;
                });
              }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  settings.bookmarkVisibility === opt.value ? 'bg-brand-cyan/15 border border-brand-cyan/40 text-brand-cyan' : 'bg-surface-2 border border-white/[0.06] text-text-muted'
                }`}>
                <Icon name={opt.icon} size={14} /> {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => navigate('/settings/blocked-users')}
          className="w-full flex items-center justify-between p-4 rounded-2xl bg-surface-1 border border-white/[0.06] mt-4">
          <div className="flex items-center gap-3">
            <Icon name="block" size={22} className="text-brand-ember" />
            <span className="text-sm font-semibold">Blocked Users</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-text-muted text-sm">{blockedCount}</span>
            <Icon name="chevron_right" size={18} className="text-text-muted" />
          </div>
        </button>

        <button onClick={() => navigate('/settings/export-data')}
          className="w-full flex items-center justify-between p-4 rounded-2xl bg-surface-1 border border-white/[0.06]">
          <div className="flex items-center gap-3">
            <Icon name="download" size={22} className="text-brand-violet" />
            <span className="text-sm font-semibold">Download My Data</span>
          </div>
          <Icon name="chevron_right" size={18} className="text-text-muted" />
        </button>

        <button onClick={() => navigate('/settings/delete-account')}
          className="w-full flex items-center justify-between p-4 rounded-2xl border border-brand-ember/30 bg-brand-ember/5">
          <div className="flex items-center gap-3">
            <Icon name="delete_forever" size={22} className="text-brand-ember" />
            <span className="text-sm font-semibold text-brand-ember">Delete Account</span>
          </div>
          <Icon name="chevron_right" size={18} className="text-brand-ember" />
        </button>
      </div>
    </div>
  );
}
