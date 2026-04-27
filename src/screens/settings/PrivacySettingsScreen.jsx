import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import { useUI } from '../../context/UIContext';
import { updateUserSettings, updateUser, getBlockedUsers } from '../../firebase/firestore';
import TopBar from '../../components/TopBar';
import Icon from '../../components/Icon';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';
import { CONSENT_VERSION } from '../../components/ConsentSheet';

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
  const [phoneVisibility, setPhoneVisibility] = useState('public');
  const [hasPhone, setHasPhone] = useState(false);
  const [allowListCount, setAllowListCount] = useState(0);
  const saveTimer = useRef(null);
  const phoneSaveTimer = useRef(null);
  const [consents, setConsents] = useState({ audienceAnalytics: false, personalizedAds: false });

  // Load consent state
  useEffect(() => {
    if (!currentUser?.uid) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', currentUser.uid, 'meta', 'consents'));
        if (snap.exists()) {
          const d = snap.data();
          setConsents({
            audienceAnalytics: d?.audienceAnalytics?.granted === true,
            personalizedAds:   d?.personalizedAds?.granted   === true,
          });
        }
      } catch {}
    })();
  }, [currentUser?.uid]);

  const setConsent = async (key, value) => {
    setConsents(prev => ({ ...prev, [key]: value }));
    try {
      await setDoc(doc(db, 'users', currentUser.uid, 'meta', 'consents'), {
        _version: CONSENT_VERSION,
        [key]: { granted: value, at: serverTimestamp(), version: CONSENT_VERSION },
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      showToast('Could not save', 'error');
    }
  };

  useEffect(() => {
    if (profile?.settings) {
      setSettings(prev => ({ ...prev, ...profile.settings }));
    }
    if (profile) {
      setPhoneVisibility(profile.phoneVisibility || 'public');
      setHasPhone(Boolean(profile.phone || profile.phoneHash));
      setAllowListCount(Array.isArray(profile.phoneVisibilityAllowList) ? profile.phoneVisibilityAllowList.length : 0);
    }
  }, [profile]);

  const savePhoneVisibility = (value) => {
    setPhoneVisibility(value);
    clearTimeout(phoneSaveTimer.current);
    phoneSaveTimer.current = setTimeout(async () => {
      try { await updateUser(currentUser.uid, { phoneVisibility: value }); }
      catch (err) { console.error(err); showToast('Failed to save', 'error'); }
    }, 600);
  };

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

        {/* Data & consent ─────────────────────────── */}
        <div className="pt-1 pb-2">
          <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold">Data & consent</p>
          <p className="text-[11px] text-text-muted mt-1">Change your mind any time. Takes effect instantly.</p>
        </div>

        {[
          { key: 'audienceAnalytics', label: 'Share aggregate demographics',
            desc: 'Creators you follow see anonymized stats (age bucket, country). Never your name or exact location.', icon: 'insights' },
          { key: 'personalizedAds',   label: 'Personalized promotions',
            desc: 'Tailor in-app promos to your interests. No third-party ad networks — VERGR only.', icon: 'campaign' },
        ].map(item => (
          <div key={item.key} className="flex items-center justify-between p-4 rounded-2xl bg-surface-1 border border-white/[0.06]">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Icon name={item.icon} size={22} className="text-brand-cyan shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="text-xs text-text-muted">{item.desc}</p>
              </div>
            </div>
            <button onClick={() => setConsent(item.key, !consents[item.key])}
              className={`w-12 h-7 rounded-full transition-colors shrink-0 ml-3 ${consents[item.key] ? 'bg-brand-cyan' : 'bg-surface-3'}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${consents[item.key] ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        ))}

        <div className="pt-3 pb-1">
          <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold">Profile privacy</p>
        </div>

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

        {/* Phone number visibility */}
        <div className="p-4 rounded-2xl bg-surface-1 border border-white/[0.06]">
          <div className="flex items-center gap-3 mb-3">
            <Icon name="phone" size={22} className="text-text-secondary" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Phone Number Visibility</p>
              <p className="text-xs text-text-muted">Who can find you by phone number</p>
            </div>
          </div>
          {!hasPhone && (
            <div className="mb-3 p-2.5 rounded-lg bg-surface-2 text-xs text-text-muted">
              You haven't added a phone number yet. <button onClick={() => navigate('/messages/new')} className="text-brand-cyan font-bold">Add one</button> to earn 1000 VP.
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'public',   label: 'Everyone',    icon: 'public' },
              { value: 'contacts', label: 'Mutuals',     icon: 'group' },
              { value: 'selected', label: 'Selected',    icon: 'person_check' },
              { value: 'hidden',   label: 'Nobody',      icon: 'lock' },
            ].map(opt => (
              <button key={opt.value} onClick={() => savePhoneVisibility(opt.value)}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  phoneVisibility === opt.value ? 'bg-brand-cyan/15 border border-brand-cyan/40 text-brand-cyan' : 'bg-surface-2 border border-white/[0.06] text-text-muted'
                }`}>
                <Icon name={opt.icon} size={14} /> {opt.label}
              </button>
            ))}
          </div>
          {phoneVisibility === 'selected' && (
            <button onClick={() => navigate('/settings/phone-allowlist')}
              className="mt-3 w-full flex items-center justify-between p-3 rounded-xl bg-surface-2 border border-white/[0.06]">
              <span className="text-xs font-bold text-text-secondary">Manage allowed users</span>
              <span className="flex items-center gap-1 text-xs text-text-muted">
                {allowListCount} {allowListCount === 1 ? 'user' : 'users'}
                <Icon name="chevron_right" size={16} />
              </span>
            </button>
          )}
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
