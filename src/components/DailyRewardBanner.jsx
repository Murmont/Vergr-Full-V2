// Floating daily check-in popup. Renders as a fixed card in the bottom-right
// corner so it doesn't take up feed real estate. Dismissable via the × button;
// dismissal persists for the rest of the day.
import { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import Icon from './Icon';
import { CoinIcon, VPIcon } from './CoinIcon';

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
    const claimKey = `vergr_daily_${currentUser.uid}`;
    const dismissKey = `vergr_daily_dismissed_${currentUser.uid}`;
    const lastClaim = localStorage.getItem(claimKey);
    const lastDismiss = localStorage.getItem(dismissKey);
    // Only show if: not claimed today AND not dismissed today
    if (lastClaim !== today && lastDismiss !== today) setShow(true);
  }, [currentUser]);

  const dismiss = () => {
    if (currentUser) {
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem(`vergr_daily_dismissed_${currentUser.uid}`, today);
    }
    setDismissed(true);
  };

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
      // Auto-dismiss after showing result
      setTimeout(() => setDismissed(true), res.data.paid ? 5000 : 4000);
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

  // ─── Result state ─────────────────────────────────────────────
  if (result) {
    const { paid, reward, vpReward, dayOfStreak, message } = result;
    return (
      <FloatingWrap>
        <div className={`relative rounded-2xl p-4 pr-9 ${paid ? 'bg-gradient-to-br from-brand-gold/20 to-brand-ember/10 border border-brand-gold/30' : 'bg-gradient-to-br from-brand-cyan/15 to-brand-violet/10 border border-brand-cyan/25'} shadow-2xl shadow-black/50 backdrop-blur-md`}>
          <button onClick={dismiss} className="absolute top-2 right-2 w-6 h-6 rounded-md hover:bg-white/[0.08] flex items-center justify-center text-text-muted">
            <Icon name="close" size={14} />
          </button>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl ${paid ? 'bg-brand-gold/25' : 'bg-brand-cyan/20'} flex items-center justify-center shrink-0`}>
              <Icon name={paid ? 'local_fire_department' : 'check_circle'} size={22} className={paid ? 'text-brand-gold' : 'text-brand-cyan'} />
            </div>
            <div className="flex-1 min-w-0">
              {paid ? (
                <>
                  <p className="text-brand-gold font-extrabold text-[13px] flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1"><CoinIcon size={13} />+{reward}</span>
                    <span className="text-text-muted">·</span>
                    <span className="inline-flex items-center gap-1"><VPIcon size={13} />+{vpReward}</span>
                  </p>
                  <p className="text-text-secondary text-[10px] font-dmmono mt-0.5">Streak complete — start again tomorrow!</p>
                </>
              ) : (
                <>
                  <p className="text-brand-cyan font-extrabold text-[13px]">Day {dayOfStreak}/5 checked in</p>
                  <p className="text-text-secondary text-[10px] mt-0.5 flex items-center gap-1">
                    <VPIcon size={11} />+{vpReward} VP · {message}
                  </p>
                </>
              )}
              <div className="flex gap-1 mt-2.5">
                {[1,2,3,4,5].map(day => (
                  <div key={day} className={`flex-1 h-1.5 rounded-full ${day <= dayOfStreak ? (paid ? 'bg-brand-gold' : 'bg-brand-cyan') : 'bg-white/[0.08]'}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </FloatingWrap>
    );
  }

  // ─── Claim state ──────────────────────────────────────────────
  return (
    <FloatingWrap>
      <div className="relative rounded-2xl bg-gradient-to-br from-surface-1 to-surface-2 border border-white/[0.08] p-4 pr-9 shadow-2xl shadow-black/50 backdrop-blur-md">
        <button onClick={dismiss} className="absolute top-2 right-2 w-6 h-6 rounded-md hover:bg-white/[0.08] flex items-center justify-center text-text-muted hover:text-text-primary">
          <Icon name="close" size={14} />
        </button>
        <button onClick={claim} disabled={claiming} className="flex items-start gap-3 w-full text-left">
          <div className="w-10 h-10 rounded-xl bg-brand-cyan/15 flex items-center justify-center shrink-0">
            <Icon name="redeem" size={22} className="text-brand-cyan" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-text-primary font-extrabold text-[13px]">
              {claiming ? 'Checking in…' : 'Daily Check-in'}
            </p>
            <p className="text-text-muted text-[10.5px] mt-0.5 flex items-center gap-1.5 flex-wrap">
              Log in 5 days straight for
              <span className="inline-flex items-center gap-0.5 text-brand-gold font-bold"><CoinIcon size={11} />5</span>
              +
              <span className="inline-flex items-center gap-0.5 text-brand-violet font-bold"><VPIcon size={11} />50</span>
            </p>
            <div className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-dmmono font-bold text-brand-cyan">
              Check in now <Icon name="arrow_forward" size={12} />
            </div>
          </div>
        </button>
        {error && <p className="text-brand-ember text-[10px] mt-2">{error}</p>}
      </div>
    </FloatingWrap>
  );
}

// Fixed positioning wrapper — bottom-right on desktop, bottom-center on mobile.
function FloatingWrap({ children }) {
  return (
    <div className="fixed z-[80] bottom-5 right-5 w-[320px] max-w-[calc(100vw-2rem)] lg:w-[340px] animate-in fade-in slide-in-from-bottom-4 duration-300">
      {children}
    </div>
  );
}
