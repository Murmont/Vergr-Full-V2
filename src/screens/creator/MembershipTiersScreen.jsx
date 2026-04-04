import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import TopBar from '../../components/TopBar';
import Icon from '../../components/Icon';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';

const DEFAULT_TIERS = [
  { name: 'Supporter', price: 100, perks: ['Badge on profile', 'Exclusive posts', 'Priority chat'] },
  { name: 'VIP', price: 500, perks: ['All Supporter perks', 'Direct messages', 'Monthly giveaway entry', 'Custom emotes'] },
  { name: 'Legend', price: 1000, perks: ['All VIP perks', 'Co-stream invites', 'Private Discord channel', 'Merch discounts'] },
];

export default function MembershipTiersScreen() {
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  useEffect(() => {
    setRightPanel(null);
    if (isDesktop) setContentAlign('left');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign, isDesktop]);
  const { currentUser } = useAuth();
  const { showToast } = useUI();
  const [tiers, setTiers] = useState(DEFAULT_TIERS);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'creators', currentUser.uid), {
        membershipTiers: tiers,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      showToast('Tiers saved!', 'success');
    } catch (err) { showToast('Failed to save', 'error'); }
    setSaving(false);
  };

  return (
    <div className={isDesktop ? "min-h-screen pb-8" : "screen-container min-h-screen pb-8"}>
      <TopBar title="Membership Tiers" showBack actions={
        <button onClick={handleSave} disabled={saving} className="text-brand-cyan font-semibold text-sm">{saving ? '...' : 'Save'}</button>
      } />
      <div className="px-4 py-4">
        <p className="text-text-muted text-sm mb-6">Set up membership tiers for your fans. They pay with coins monthly to access exclusive perks.</p>
        <div className="space-y-4">
          {tiers.map((tier, i) => (
            <div key={i} className="p-4 rounded-2xl bg-surface-1 border border-white/[0.06]">
              <div className="flex items-center justify-between mb-3">
                <input value={tier.name} onChange={e => { const t = [...tiers]; t[i].name = e.target.value; setTiers(t); }}
                  className="font-bold text-lg bg-transparent focus:outline-none border-b border-transparent focus:border-brand-cyan" />
                <div className="flex items-center gap-1">
                  <span className="text-brand-gold text-xs">●</span>
                  <input type="number" value={tier.price} onChange={e => { const t = [...tiers]; t[i].price = parseInt(e.target.value)||0; setTiers(t); }}
                    className="w-16 text-right font-dmmono font-bold text-brand-gold bg-transparent focus:outline-none" />
                  <span className="text-text-muted text-xs">/mo</span>
                </div>
              </div>
              <div className="space-y-1.5">
                {tier.perks.map((perk, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <Icon name="check" size={14} className="text-brand-cyan shrink-0" />
                    <input value={perk} onChange={e => { const t = [...tiers]; t[i].perks[j] = e.target.value; setTiers(t); }}
                      className="flex-1 text-sm text-text-secondary bg-transparent focus:outline-none focus:text-text-primary" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
