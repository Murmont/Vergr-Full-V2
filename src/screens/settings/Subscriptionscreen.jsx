// src/screens/settings/SubscriptionScreen.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import Icon from '../../components/Icon';
import TopBar from '../../components/TopBar';
import useResponsive from '../../hooks/useResponsive';
import useTier from '../../hooks/useTier';
import { TIERS, TIER_COMPARISON } from '../../utils/tierSystem';

export default function SubscriptionScreen() {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const { tier: currentTier } = useTier();
  const [selectedTier, setSelectedTier] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState(null);

  const tiers = [TIERS.free, TIERS.lite, TIERS.pro];

  const handleSelectTier = async (tierId) => {
    if (tierId === currentTier) return;
    if (tierId === 'free') {
      // Downgrade — just set it
      setProcessing(true);
      try {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), { tier: 'free' });
        showToast('Downgraded to Free');
      } catch (err) { showToast('Failed to update'); }
      setProcessing(false);
      return;
    }

    // For paid tiers — in production this goes to Stripe/Play Store.
    // For now, set the tier directly for testing.
    setProcessing(true);
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { tier: tierId });
      showToast(`Upgraded to VERGR ${tierId === 'lite' ? 'Lite' : 'Pro'}!`);
    } catch (err) { showToast('Failed to update'); }
    setProcessing(false);
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  return (
    <div className="pb-8">
      {isMobile ? <TopBar title="Subscription" showBack /> : (
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white"><Icon name="arrow_back" size={24} /></button>
          <h1 className="text-lg font-bold text-white">Subscription</h1>
        </div>
      )}

      <div className="px-4 mt-4">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-black text-white">Choose Your Plan</h2>
          <p className="text-text-muted text-sm mt-1">Your chats live on your device, not our servers. Upgrade for better quality, longer retention, and zero ads.</p>
        </div>

        {/* Tier Cards */}
        <div className="space-y-3 mb-8">
          {tiers.map(t => {
            const isCurrent = t.id === currentTier;
            const borderColor = t.id === 'pro' ? 'border-yellow-500/40' : t.id === 'lite' ? 'border-brand-cyan/40' : 'border-white/[0.06]';
            const bgGlow = t.id === 'pro' ? 'bg-yellow-500/5' : t.id === 'lite' ? 'bg-brand-cyan/5' : 'bg-surface-1';
            return (
              <button key={t.id} onClick={() => !processing && handleSelectTier(t.id)} disabled={processing}
                className={`w-full p-4 rounded-2xl border text-left transition-all ${borderColor} ${bgGlow} ${isCurrent ? 'ring-2 ring-brand-cyan' : 'hover:border-white/20'} disabled:opacity-50`}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${t.color}20` }}>
                    <Icon name={t.icon} size={26} style={{ color: t.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-bold">VERGR {t.name}</p>
                      {isCurrent && <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-cyan/20 text-brand-cyan">Current</span>}
                    </div>
                    <p className="text-text-muted text-xs mt-0.5">
                      {t.id === 'free' && 'Local storage · Compressed media · 7-day retention'}
                      {t.id === 'lite' && 'HD media · 30-day retention · Auto backup · No ads'}
                      {t.id === 'pro' && 'Original 4K · 90-day retention · Cloud vault · No ads'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-lg" style={{ color: t.color }}>{t.price === 0 ? 'Free' : `€${t.price.toFixed(2)}`}</p>
                    {t.price > 0 && <p className="text-text-muted text-[9px]">/month</p>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Comparison Table */}
        <div>
          <h3 className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-3 px-1">Compare Plans</h3>
          <div className="rounded-2xl border border-white/[0.06] bg-surface-1 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-4 gap-0 px-3 py-2.5 bg-surface-2/50 border-b border-white/[0.04]">
              <div className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Feature</div>
              <div className="text-[9px] font-bold text-text-muted uppercase tracking-wider text-center">Free</div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-center text-brand-cyan">Lite</div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-center text-yellow-400">Pro</div>
            </div>
            {/* Rows */}
            {TIER_COMPARISON.map((row, i) => (
              <div key={row.label} className={`grid grid-cols-4 gap-0 px-3 py-2.5 ${i > 0 ? 'border-t border-white/[0.03]' : ''}`}>
                <div className="text-xs text-text-secondary font-medium pr-2">{row.label}</div>
                <div className="text-[10px] text-text-muted text-center">{row.free}</div>
                <div className="text-[10px] text-brand-cyan/80 text-center font-medium">{row.lite}</div>
                <div className="text-[10px] text-yellow-400/80 text-center font-medium">{row.pro}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy pitch */}
        <div className="mt-6 p-4 rounded-2xl border border-white/[0.06] bg-surface-1">
          <div className="flex items-start gap-3">
            <Icon name="shield" size={24} className="text-brand-cyan shrink-0 mt-0.5" />
            <div>
              <p className="text-white text-sm font-bold">Your privacy, always.</p>
              <p className="text-text-muted text-xs mt-1 leading-relaxed">We don't keep your chats on our servers. Messages live on your device. Media transits through our servers and auto-deletes. We can't read your conversations because we don't store them.</p>
            </div>
          </div>
        </div>

        {/* Fine print */}
        <p className="text-text-muted text-[10px] text-center mt-4 px-4 leading-relaxed">
          Prices in EUR. Charged monthly. Cancel anytime. Payment processing via Stripe. Google Play / App Store billing available on mobile apps.
        </p>
      </div>

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-surface-2 text-white text-sm font-medium px-5 py-2.5 rounded-full border border-white/[0.06] shadow-xl z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}