import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import { useUI } from '../../context/UIContext';
import { updateUserSettings } from '../../firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase/config';
import TopBar from '../../components/TopBar';
import Icon from '../../components/Icon';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';

export default function SecuritySettingsScreen() {
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  useEffect(() => {
    setRightPanel(null);
    if (isDesktop) setContentAlign('left');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign, isDesktop]);
  const { currentUser, logout } = useAuth();
  const { profile } = useUser();
  const { showToast } = useUI();
  const navigate = useNavigate();
  const [twoFA, setTwoFA] = useState(false);

  useEffect(() => {
    if (profile?.settings?.twoFactorEnabled) setTwoFA(true);
  }, [profile]);

  const handleChangePassword = async () => {
    try {
      await sendPasswordResetEmail(auth, currentUser.email);
      showToast('Password reset email sent!', 'success');
    } catch (err) {
      showToast('Failed to send reset email', 'error');
    }
  };

  const handleToggle2FA = async () => {
    const newVal = !twoFA;
    setTwoFA(newVal);
    try {
      await updateUserSettings(currentUser.uid, { ...profile?.settings, twoFactorEnabled: newVal });
      showToast(newVal ? '2FA enabled' : '2FA disabled', 'success');
    } catch (err) {
      setTwoFA(!newVal);
      showToast('Failed to update', 'error');
    }
  };

  const handleSignOutAll = async () => {
    if (!confirm('Sign out from all devices? You will need to log in again.')) return;
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      showToast('Failed to sign out', 'error');
    }
  };

  const items = [
    { icon: 'key', label: 'Change Password', desc: 'Send a password reset email', action: handleChangePassword },
    { icon: 'shield', label: 'Two-Factor Authentication', desc: twoFA ? 'Enabled' : 'Disabled', toggle: true },
    { icon: 'lock', label: 'Wallet Security', desc: 'PIN and biometric settings', action: () => navigate('/wallet/security') },
    { icon: 'logout', label: 'Sign Out All Devices', desc: 'Log out everywhere', danger: true, action: handleSignOutAll },
  ];

  return (
    <div className={isDesktop ? "min-h-screen pb-8" : "screen-container min-h-screen pb-8"}>
      <TopBar title="Security" showBack />
      <div className="px-4 py-4 space-y-2">
        {items.map(item => (
          <button key={item.label} onClick={item.toggle ? undefined : item.action}
            className="flex items-center gap-3 w-full p-4 rounded-2xl bg-surface-1 border border-white/[0.06] text-left">
            <Icon name={item.icon} size={20} className={item.danger ? 'text-brand-ember' : 'text-text-secondary'} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${item.danger ? 'text-brand-ember' : ''}`}>{item.label}</p>
              {item.desc && <p className="text-xs text-text-muted">{item.desc}</p>}
            </div>
            {item.toggle ? (
              <button onClick={(e) => { e.stopPropagation(); handleToggle2FA(); }}
                className={`w-12 h-7 rounded-full transition-colors shrink-0 ${twoFA ? 'bg-brand-cyan' : 'bg-surface-3'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${twoFA ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            ) : (
              <Icon name="chevron_right" size={18} className="text-text-muted" />
            )}
          </button>
        ))}

        <div className="mt-4 p-4 rounded-2xl bg-surface-1 border border-white/[0.06]">
          <p className="text-text-muted text-xs mb-1">Signed in as</p>
          <p className="text-sm font-dmmono text-brand-cyan">{currentUser?.email}</p>
        </div>
      </div>
    </div>
  );
}
