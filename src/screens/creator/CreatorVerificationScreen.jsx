import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import { useUI } from '../../context/UIContext';
import { doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import TopBar from '../../components/TopBar';
import Icon from '../../components/Icon';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';

export default function CreatorVerificationScreen() {
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
  const [submitting, setSubmitting] = useState(false);

  const reqs = [
    { label: 'Active account for 7+ days', met: true },
    { label: 'At least 1 post created', met: (profile?.postCount || 0) >= 1 },
    { label: 'Profile setup complete', met: !!profile?.username && !!profile?.displayName },
    { label: 'No community violations', met: true },
  ];

  const allMet = reqs.every(r => r.met);

  const handleApply = async () => {
    if (!allMet || submitting) return;
    setSubmitting(true);
    try {
      await setDoc(doc(db, 'creator_applications', currentUser.uid), {
        userId: currentUser.uid, username: profile?.username, displayName: profile?.displayName,
        status: 'pending', appliedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'users', currentUser.uid), { role: 'creator' });
      showToast('Creator status activated!', 'success');
      navigate('/verification-pending');
    } catch (err) { showToast('Application failed', 'error'); }
    setSubmitting(false);
  };

  return (
    <div className={isDesktop ? "min-h-screen pb-8" : "screen-container min-h-screen pb-8"}>
      <TopBar title="Creator Verification" showBack />
      <div className="px-4 py-4">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-brand-violet/10 flex items-center justify-center mx-auto mb-3">
            <Icon name="verified" filled size={32} className="text-brand-violet" />
          </div>
          <h2 className="font-syne text-xl font-bold mb-1">Become a Creator</h2>
          <p className="text-text-muted text-sm">Unlock streaming, analytics, membership tiers, and more</p>
        </div>

        <h3 className="text-text-muted text-xs font-bold uppercase tracking-wider mb-3">Requirements</h3>
        <div className="space-y-2 mb-6">
          {reqs.map(r => (
            <div key={r.label} className="flex items-center gap-3 p-3 rounded-xl bg-surface-1 border border-white/[0.06]">
              <Icon name={r.met ? 'check_circle' : 'cancel'} filled size={20} className={r.met ? 'text-green-500' : 'text-brand-ember'} />
              <span className="text-sm">{r.label}</span>
            </div>
          ))}
        </div>

        <button onClick={handleApply} disabled={!allMet || submitting}
          className={`w-full py-4 rounded-2xl text-lg font-bold transition-all ${allMet && !submitting ? 'bg-brand-cyan text-bg-dark' : 'bg-surface-3 text-text-muted'}`}>
          {submitting ? 'Applying...' : allMet ? 'Apply for Creator' : 'Requirements not met'}
        </button>
      </div>
    </div>
  );
}
