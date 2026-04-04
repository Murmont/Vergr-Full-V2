import { useNavigate } from 'react-router-dom';
import Icon from './Icon';

export default function TopBar({ 
  title, 
  showBack = false, 
  actions, 
  transparent = false, 
  showWallet = false, 
  balance = 0 
}) {
  const navigate = useNavigate();

  return (
    <header className={`sticky top-0 z-40 flex items-center justify-between px-4 h-[52px] ${
      transparent ? 'bg-transparent' : 'glass-header'
    }`}>
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors active:scale-95"
          >
            <Icon name="arrow_back" size={20} />
          </button>
        )}
        {title && (
          <h1 className="font-syne text-[17px] font-bold text-text-primary">{title}</h1>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {showWallet && (
          <button 
            onClick={() => navigate('/wallet')} 
            className="flex items-center gap-1.5 bg-surface-2/60 px-3 py-1.5 rounded-full border border-white/[0.06] hover:border-white/[0.12] transition-colors"
          >
            <Icon name="paid" size={14} className="text-brand-gold" />
            <span className="text-xs font-bold text-text-primary font-dmmono">{balance.toLocaleString()}</span>
          </button>
        )}
        {actions && <div className="flex items-center gap-1.5">{actions}</div>}
      </div>
    </header>
  );
}
