// src/screens/settings/SubscriptionScreen.jsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import Icon from '../../components/Icon';
import TopBar from '../../components/TopBar';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';
import useTier from '../../hooks/useTier';
import { TIERS, TIER_COMPARISON } from '../../utils/tierSystem';

const TIER_ORDER = ['free', 'lite', 'pro'];

export default function SubscriptionScreen() {
  const navigate = useNavigate();
  const { isMobile, isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();
  const { tier: currentTier } = useTier();
  const [selected, setSelected] = useState(currentTier === 'free' ? 'pro' : currentTier);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setRightPanel(null);
    setContentAlign('left');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign]);

  useEffect(() => { setSelected(currentTier === 'free' ? 'pro' : currentTier); }, [currentTier]);

  const sections = useMemo(() => {
    const grouped = {};
    for (const row of TIER_COMPARISON) (grouped[row.section] ||= []).push(row);
    return Object.entries(grouped);
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const handleSubscribe = async (tierId) => {
    if (tierId === currentTier || processing) return;
    setProcessing(true);
    try {
      // NOTE: Production must route through Stripe / Play / App Store billing.
      // Dev flow writes tier directly so the rest of the app can be exercised.
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { tier: tierId });
      showToast(
        tierId === 'free'
          ? 'Downgraded to Free'
          : `Upgraded to VERGR ${TIERS[tierId].name}!`
      );
    } catch (err) {
      console.error(err);
      showToast('Failed to update plan');
    }
    setProcessing(false);
  };

  const tierMeta = TIERS[currentTier] || TIERS.free;

  return (
    <div className="min-h-full flex flex-col pb-10">
      {isMobile && <TopBar title="Subscription" showBack />}
      {!isMobile && (
        <header className="flex items-center gap-3 px-5 pt-6 pb-4">
          <button onClick={() => navigate(-1)} className="text-white/80" aria-label="Back">
            <Icon name="arrow_back" size={24} />
          </button>
          <h1 className="text-white font-syne font-bold text-xl">Subscription</h1>
        </header>
      )}

      <main className={`flex-1 px-4 lg:px-6 ${isDesktop ? 'max-w-4xl' : ''}`}>
        <p className="text-text-secondary text-xs uppercase tracking-wider font-bold mb-2">Your plan</p>
        <div className="mb-6 p-4 rounded-2xl border border-white/[0.06] bg-surface-1 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${tierMeta.color}20` }}>
            <Icon name={tierMeta.icon} size={22} style={{ color: tierMeta.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm">{tierMeta.name}</p>
            <p className="text-text-secondary text-xs">{tierMeta.priceLabel} · {tierMeta.tagline}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {TIER_ORDER.map((id) => {
            const t = TIERS[id];
            const isCurrent = id === currentTier;
            const isSelected = id === selected;
            return (
              <button
                key={id}
                onClick={() => setSelected(id)}
                className={`text-left p-4 rounded-2xl border transition-all bg-surface-1 ${
                  isSelected ? 'border-white/30' : 'border-white/[0.06] hover:border-white/[0.15]'
                }`}
                style={isSelected ? { boxShadow: `0 0 0 2px ${t.color}55 inset` } : undefined}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon name={t.icon} size={20} style={{ color: t.color }} />
                  <span className="text-white font-bold">{t.name}</span>
                  {isCurrent && (
                    <span className="ml-auto text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white/80">Current</span>
                  )}
                </div>
                <p className="text-2xl font-black text-white font-dmmono">{t.priceLabel}</p>
                <p className="text-text-secondary text-xs mb-3">{t.tagline}</p>
                <ul className="space-y-1.5">
                  {t.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-text-primary">
                      <Icon name="check" size={14} className="text-brand-cyan mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        <button
          disabled={selected === currentTier || processing}
          onClick={() => handleSubscribe(selected)}
          className="w-full py-3.5 rounded-xl font-bold text-sm mb-8 transition-colors disabled:opacity-40"
          style={{ background: TIERS[selected].color, color: '#0B0B14' }}
        >
          {processing
            ? 'Updating…'
            : selected === currentTier
              ? 'This is your current plan'
              : selected === 'free'
                ? 'Downgrade to Free'
                : `Subscribe to ${TIERS[selected].name} — ${TIERS[selected].priceLabel}`}
        </button>

        <p className="text-text-secondary text-xs uppercase tracking-wider font-bold mb-3">Full comparison</p>
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
          {sections.map(([section, rows], si) => (
            <div key={section} className={si > 0 ? 'border-t border-white/[0.06]' : ''}>
              <div className="px-4 py-2 bg-surface-2/40 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                {section}
              </div>
              <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] items-center px-4 py-2 text-[11px] text-text-muted border-b border-white/[0.04]">
                <span>Feature</span>
                <span className="text-center">Free</span>
                <span className="text-center" style={{ color: TIERS.lite.color }}>Lite</span>
                <span className="text-center" style={{ color: TIERS.pro.color }}>Pro</span>
              </div>
              {rows.map((row, i) => (
                <div key={i} className="grid grid-cols-[1.4fr_1fr_1fr_1fr] items-center px-4 py-2.5 text-xs border-b border-white/[0.04] last:border-b-0">
                  <span className="text-text-primary">{row.feature}</span>
                  <span className="text-center text-text-secondary">{row.free}</span>
                  <span className="text-center text-text-primary">{row.lite}</span>
                  <span className="text-center text-text-primary font-semibold">{row.pro}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <p className="text-text-muted text-[11px] mt-4 leading-relaxed">
          Commission on cash-outs is determined only by your VP level (30% at L1 → 10% at L100). No plan changes this — plans just help you climb faster.
        </p>

        <button
          onClick={() => navigate('/settings/ranks')}
          className="mt-4 w-full flex items-center gap-3 p-4 rounded-2xl bg-brand-violet/[0.08] border border-brand-violet/20 hover:border-white/[0.12] transition-all"
        >
          <Icon name="star" size={20} className="text-brand-violet" />
          <span className="flex-1 text-left text-white font-semibold text-sm">View VP levels & ranks</span>
          <Icon name="arrow_forward" size={18} className="text-brand-violet" />
        </button>

        <p className="text-text-muted text-[10px] text-center mt-6 leading-relaxed">
          Prices in USD. Charged monthly. Cancel anytime. Payment via Stripe (mobile uses Google Play / App Store billing).
        </p>
      </main>

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-surface-2 text-white text-sm font-medium px-5 py-2.5 rounded-full border border-white/[0.06] shadow-xl z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
