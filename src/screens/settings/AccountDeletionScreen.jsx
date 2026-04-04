import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { deleteUser } from 'firebase/auth';
import { auth } from '../../firebase/config';
import TopBar from '../../components/TopBar';
import Icon from '../../components/Icon';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';

export default function AccountDeletionScreen() {
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  useEffect(() => {
    setRightPanel(null);
    if (isDesktop) setContentAlign('left');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign, isDesktop]);
  const [confirm, setConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const { showToast } = useUI();
  const navigate = useNavigate();

  const handleDelete = async () => {
    if (confirm !== 'DELETE' || deleting) return;
    setDeleting(true);
    try {
      // Delete the Firebase Auth user — the onUserDeleted Cloud Function handles Firestore cleanup
      await deleteUser(auth.currentUser);
      // Auth state change will redirect to login
    } catch (err) {
      console.error('Delete failed:', err);
      if (err.code === 'auth/requires-recent-login') {
        showToast('Please log out and log back in, then try again', 'error');
      } else {
        showToast('Failed to delete account. Please try again.', 'error');
      }
      setDeleting(false);
    }
  };

  const loseItems = [
    'Profile and all content',
    'Coin balance and transaction history',
    'Squad memberships and roles',
    'Messages and connections',
    'Creator earnings and analytics',
    'Tournament history and achievements',
  ];

  return (
    <div className={isDesktop ? "min-h-screen pb-8" : "screen-container min-h-screen pb-8"}>
      <TopBar title="Delete Account" showBack />

      <div className="px-4 py-4">
        <div className="bg-brand-ember/10 border border-brand-ember/20 rounded-2xl p-4 mb-6 flex gap-3">
          <Icon name="warning" size={20} className="text-brand-ember shrink-0 mt-0.5" />
          <p className="text-brand-ember/80 text-sm leading-relaxed">
            This action is permanent and cannot be undone. All your data, coins, and history will be permanently deleted.
          </p>
        </div>

        <p className="text-text-muted text-xs font-bold uppercase tracking-wider mb-3">What you'll lose</p>
        <div className="space-y-2 mb-6">
          {loseItems.map(item => (
            <div key={item} className="flex items-center gap-3 p-3 rounded-xl bg-surface-1 border border-white/[0.06]">
              <Icon name="cancel" size={16} className="text-brand-ember shrink-0" />
              <span className="text-sm">{item}</span>
            </div>
          ))}
        </div>

        <label className="block mb-6">
          <span className="text-text-secondary text-sm mb-2 block">
            Type <span className="text-brand-ember font-bold font-dmmono">DELETE</span> to confirm
          </span>
          <input
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="w-full bg-surface-2 border border-brand-ember/30 rounded-xl px-4 py-3 text-text-primary font-dmmono focus:border-brand-ember focus:outline-none"
            placeholder="DELETE"
          />
        </label>

        <button
          onClick={handleDelete}
          disabled={confirm !== 'DELETE' || deleting}
          className={`w-full py-4 rounded-2xl text-lg font-bold transition-all ${
            confirm === 'DELETE' && !deleting ? 'bg-brand-ember text-white' : 'bg-surface-3 text-text-muted'
          }`}
        >
          {deleting ? 'Deleting...' : 'Permanently Delete Account'}
        </button>

        <button onClick={() => navigate(-1)} className="w-full py-3 text-text-secondary font-semibold text-sm mt-2">
          Cancel — Keep My Account
        </button>
      </div>
    </div>
  );
}
