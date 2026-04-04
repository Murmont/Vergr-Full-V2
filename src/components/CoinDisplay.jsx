import { useNavigate } from 'react-router-dom';
import { formatCoins } from '../utils/helpers';
import Icon from './Icon';

export default function CoinDisplay({ amount = 0, size = 'md', className = '', clickable = true }) {
  const navigate = useNavigate();

  const sizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  const content = (
    <span className={`inline-flex items-center gap-1 font-dmmono font-semibold ${sizes[size]} text-text-primary ${className}`}>
      <Icon name="paid" size={size === 'sm' ? 13 : size === 'lg' ? 18 : 15} className="text-brand-gold" />
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