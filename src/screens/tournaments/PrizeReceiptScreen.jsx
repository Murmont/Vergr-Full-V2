import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Icon from '../../components/Icon';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';

export default function PrizeReceiptScreen() {
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  useEffect(() => {
    setRightPanel(null);
    if (isDesktop) setContentAlign('left');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign, isDesktop]);
  const navigate = useNavigate();
  const location = useLocation();
  const { amount, tournament } = location.state || {};
  return (
    <div className={isDesktop ? "min-h-screen flex flex-col items-center justify-center px-6" : "screen-container min-h-screen flex flex-col items-center justify-center px-6"}>
      <div className="w-20 h-20 rounded-full bg-brand-gold/10 flex items-center justify-center mb-6 ">
        <Icon name="emoji_events" size={44} className="text-brand-gold" />
      </div>
      <h1 className="font-syne text-2xl font-bold mb-2">Prize Won!</h1>
      {amount && <p className="font-dmmono text-brand-gold text-xl font-bold mb-2">{amount.toLocaleString()} coins</p>}
      {tournament && <p className="text-text-muted text-sm mb-6">{tournament}</p>}
      <p className="text-text-muted text-xs text-center mb-8">Prize coins have been added to your wallet. A 24-hour hold applies before you can cash out tournament winnings.</p>
      <button onClick={() => navigate('/wallet')} className="w-full py-4 rounded-2xl bg-brand-cyan text-bg-dark font-bold mb-3">View Wallet</button>
      <button onClick={() => navigate('/')} className="text-text-secondary text-sm font-semibold">Home</button>
    </div>
  );
}
