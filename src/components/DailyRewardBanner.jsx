import { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import Icon from './Icon';

export default function DailyRewardBanner() {
  const { currentUser } = useAuth();
  const [show, setShow] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [result, setResult] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    const today = new Date().toISOString().slice(0, 10);
    const lastClaim = localStorage.getItem(`vergr_daily_${currentUser.uid}`);
    if (lastClaim !== today) setShow(true);
  }, [currentUser]);

  const claim = async () => {
    if (claiming || !functions) return;
    setClaiming(true);
    setError(null);
    try {
      const claimFn = httpsCallable(functions, 'claimDailyReward');
      const res = await claimFn();
      setResult(res.data);
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem(`vergr_daily_${currentUser.uid}`, today);
      if (!res.data.paid) {
        // Not day 5 yet — auto dismiss after 4 seconds
        setTimeout(() => setDismissed(true), 4000);
      } else {
        setTimeout(() => setDismissed(true), 5000);
      }
    } catch (err) {
      console.error('Daily check-in error:', err);
      if (err.code === 'functions/already-exists') {
        const today = new Date().toISOString().slice(0, 10);
        localStorage.setItem(`vergr_daily_${currentUser.uid}`, today);
        setDismissed(true);
      } else {
        setError('Could not check in — try again later');
        setTimeout(() => setError(null), 3000);
      }
    }
    setClaiming(false);
  };

  if (!show || dismissed) return null;

  // Show result
  if (result) {
    const { paid, reward, vpReward, dayOfStreak, message } = result;
    return (
      <div className="mx-4 mt-3 mb-1">
        <div className={`flex items-center gap-3 p-3.5 rounded-2xl ${paid ? 'bg-brand-gold/10 border border-brand-gold/25' : 'bg-brand-cyan/5 border border-brand-cyan/20'}`}>
          <div className={`w-10 h-10 rounded-xl ${paid ? 'bg-brand-gold/20' : 'bg-brand-cyan/15'} flex items-center justify-center shrink-0`}>
            <Icon name={paid ? 'local_fire_department' : 'check_circle'} size={22} className={paid ? 'text-brand-gold' : 'text-brand-cyan'} />
          </div>
          <div className="flex-1">
            {paid ? (
              <>
                <p className="text-brand-gold font-bold text-sm">+{reward} coins + {vpReward} VP!</p>
                <p className="text-text-secondary text-[10px] font-dmmono">Streak complete — start again tomorrow!</p>
              </>
            ) : (
              <>
                <p className="text-brand-cyan font-bold text-sm">Day {dayOfStreak}/5 checked in</p>
                <p className="text-text-secondary text-[10px]">+{vpReward} VP · {message}</p>
              </>
            )}
            {/* Streak dots */}
            <div className="flex gap-1.5 mt-2">
              {[1,2,3,4,5].map(day => (
                <div key={day} className={`w-6 h-1.5 rounded-full ${day <= dayOfStreak ? (paid ? 'bg-brand-gold' : 'bg-brand-cyan') : 'bg-surface-3'}`} />
              ))}
            </div>
          </div>
          <button onClick={() => setDismissed(true)} className="text-text-muted p-1"><Icon name="close" size={16} /></button>
        </div>
      </div>
    );
  }

  // Show claim button
  return (
    <div className="mx-4 mt-3 mb-1">
      <div>
        <button onClick={claim} disabled={claiming}
          className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-surface-1 border border-white/[0.06] hover:bg-surface-2/50 transition-colors group">
          <div className="w-9 h-9 rounded-lg bg-brand-cyan/10 flex items-center justify-center shrink-0">
            <Icon name="redeem" size={20} className="text-brand-cyan" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-text-primary font-semibold text-sm">{claiming ? 'Checking in...' : 'Daily Check-in'}</p>
            <p className="text-text-muted text-[10px]">Log in 5 days straight for 5 coins + 50 VP</p>
          </div>
          <Icon name="arrow_forward" size={16} className="text-text-muted group-hover:text-text-secondary transition-colors" />
        </button>
        {error && <p className="text-brand-ember text-xs mt-1.5 px-2">{error}</p>}
      </div>
    </div>
  );
}
