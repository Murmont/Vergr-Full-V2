import { useEffect } from 'react';
import { useUser } from '../../context/UserContext';
import TopBar from '../../components/TopBar';
import Icon from '../../components/Icon';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';

const PRESTIGE_TIERS = [
  { level: 1, name: 'Rookie', xp: 0, icon: '🌱', color: '#6B7280' },
  { level: 5, name: 'Bronze', xp: 4000, icon: '🥉', color: '#CD7F32' },
  { level: 10, name: 'Silver', xp: 9000, icon: '🥈', color: '#C0C0C0' },
  { level: 20, name: 'Gold', xp: 19000, icon: '🥇', color: '#FFD700' },
  { level: 35, name: 'Platinum', xp: 34000, icon: '💎', color: '#7B6FFF' },
  { level: 50, name: 'Diamond', xp: 49000, icon: '💠', color: '#4DFFD4' },
  { level: 75, name: 'Master', xp: 74000, icon: '👑', color: '#C87FFF' },
  { level: 100, name: 'Legend', xp: 99000, icon: '🔥', color: '#FF4D6A' },
];

export default function PrestigeLevelsScreen() {
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  useEffect(() => {
    setRightPanel(null);
    if (isDesktop) setContentAlign('left');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign, isDesktop]);
  const { profile } = useUser();
  const currentXP = profile?.totalXP || 0;
  const currentLevel = profile?.level || 1;

  return (
    <div className={isDesktop ? "min-h-screen pb-8" : "screen-container min-h-screen pb-8"}>
      <TopBar title="Prestige Levels" showBack />
      <div className="px-4 py-4">
        <div className="p-5 rounded-2xl bg-surface-1 border border-white/[0.06] mb-6 text-center">
          <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Your Level</p>
          <p className="text-3xl font-bold font-dmmono text-brand-cyan">{currentLevel}</p>
          <p className="text-text-muted text-xs mt-1">{currentXP.toLocaleString()} Total XP</p>
        </div>

        <h3 className="font-syne font-bold text-base mb-3">Prestige Tiers</h3>
        <p className="text-text-muted text-xs mb-4">Earn XP through posts, tournaments, quests, and squad contributions. Each level unlocks new features and cosmetics.</p>

        <div className="space-y-3">
          {PRESTIGE_TIERS.map((tier, i) => {
            const reached = currentLevel >= tier.level;
            const next = i < PRESTIGE_TIERS.length - 1 ? PRESTIGE_TIERS[i + 1] : null;
            const isCurrent = reached && (!next || currentLevel < next.level);

            return (
              <div key={tier.name} className={`p-4 rounded-2xl border transition-all ${isCurrent ? 'border-brand-cyan bg-brand-cyan/5' : reached ? 'border-white/[0.06] bg-surface-1' : 'border-white/[0.06] bg-surface-1/50 opacity-60'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{tier.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm" style={{ color: reached ? tier.color : undefined }}>{tier.name}</h4>
                      {isCurrent && <span className="text-[9px] bg-brand-cyan/20 text-brand-cyan px-2 py-0.5 rounded-full font-bold">CURRENT</span>}
                    </div>
                    <p className="text-xs text-text-muted">Level {tier.level} · {tier.xp.toLocaleString()} XP</p>
                  </div>
                  {reached && <Icon name="check_circle" filled size={20} style={{ color: tier.color }} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
