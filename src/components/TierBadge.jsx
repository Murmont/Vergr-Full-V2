import Icon from './Icon';

const TIER_CONFIG = {
  lite: { label: 'Lite', color: '#7B6FFF', bg: 'bg-brand-violet/15', border: 'border-brand-violet/30', icon: 'bolt' },
  pro: { label: 'Pro', color: '#F5C542', bg: 'bg-brand-gold/15', border: 'border-brand-gold/30', icon: 'workspace_premium' },
};

export default function TierBadge({ tier, size = 'sm' }) {
  if (!tier || tier === 'free') return null;
  const config = TIER_CONFIG[tier];
  if (!config) return null;

  if (size === 'xs') {
    return (
      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full ${config.bg} ${config.border} border`}>
        <Icon name={config.icon} size={10} style={{ color: config.color }} />
        <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: config.color }}>{config.label}</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${config.bg} ${config.border} border`}>
      <Icon name={config.icon} size={12} style={{ color: config.color }} />
      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: config.color }}>{config.label}</span>
    </span>
  );
}
