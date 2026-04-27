import { useNavigate } from 'react-router-dom';
import { formatCoins } from '../utils/helpers';
import { CoinIcon } from './CoinIcon';

export default function CoinDisplay({ amount = 0, size = 'md', className = '', clickable = true }) {
  const navigate = useNavigate();

  const sizes = {
    sm: { text: 'text-xs',  icon: 13 },
    md: { text: 'text-sm',  icon: 15 },
    lg: { text: 'text-lg',  icon: 18 },
    xl: { text: 'text-xl',  icon: 22 },
  };
  const s = sizes[size] || sizes.md;

  const content = (
    <span className={`inline-flex items-center gap-1 font-dmmono font-semibold tabular-nums ${s.text} text-text-primary ${className}`}>
      <CoinIcon size={s.icon} />
      {formatCoins(amount)}
    </span>
  );

  if (!clickable) return content;

  return (
    <button
      onClick={() => navigate('/wallet')}
      className="inline-flex items-center gap-1.5 bg-surface-2/60 px-2.5 py-1.5 rounded-full border border-white/[0.06] hover:bg-surface-2 transition-colors active:scale-95"
    >
      {content}
    </button>
  );
}
