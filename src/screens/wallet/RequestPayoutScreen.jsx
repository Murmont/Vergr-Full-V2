import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import { useUI } from '../../context/UIContext';
import { requestPayout } from '../../firebase/firestore';
import TopBar from '../../components/TopBar';
import Icon from '../../components/Icon';
import RightSidebarPanel from '../../components/RightSidebarPanel';
import useResponsive from '../../hooks/useResponsive';
import { useLayout } from '../../context/LayoutContext';

const PAYOUT_METHODS = [
  { id: 'wise', name: 'Wise', icon: 'currency_exchange', placeholder: 'Your email linked to Wise', desc: 'Fast international transfers, low fees' },
  { id: 'paypal', name: 'PayPal', icon: 'account_balance_wallet', placeholder: 'Your PayPal email address', desc: 'Widely accepted, instant' },
  { id: 'bank_transfer', name: 'Bank Transfer', icon: 'account_balance', placeholder: 'Your IBAN', desc: '3-5 business days' },
];

const COIN_TO_EUR = 0.01; // 1 coin = €0.01
const PLATFORM_FEE_PCT = 0; // 0% — platform already took cut when coins converted to gems
const PROCESSOR_FEE_PCT = 0.03; // ~3% processor fee (passed to user)
const MIN_PAYOUT = 1000; // Minimum 1000 coins = €10

export default function RequestPayoutScreen() {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('wise');
  const [details, setDetails] = useState('');
  const [processing, setProcessing] = useState(false);

  const { currentUser } = useAuth();
  const { wallet } = useUser();
  const { showToast } = useUI();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  useEffect(() => {
    setRightPanel(<RightSidebarPanel />);
    setContentAlign('left');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign]);

  const gemBalance = wallet?.gems || 0;
  const numAmount = parseInt(amount) || 0;
  const eurTotal = numAmount * COIN_TO_EUR;
  const platformFee = eurTotal * PLATFORM_FEE_PCT;
  const processorFee = eurTotal * PROCESSOR_FEE_PCT;
  const userReceives = eurTotal - platformFee - processorFee;
  const isValid = numAmount >= MIN_PAYOUT && numAmount <= gemBalance && details.trim().length > 0;
  const selectedMethod = PAYOUT_METHODS.find(m => m.id === method);

  const handlePayout = async () => {
    if (!isValid || processing) return;
    setProcessing(true);
    try {
      await requestPayout(currentUser.uid, numAmount, method, details.trim());
      navigate('/payout-success', { state: { amount: numAmount, eur: userReceives.toFixed(2), method: selectedMethod.name } });
    } catch (err) {
      console.error('Payout failed:', err);
      showToast(err.message?.includes('Insufficient') ? 'Insufficient gems' : 'Payout request failed', 'error');
    }
    setProcessing(false);
  };

  return (
    <div className="pb-8">
      {isMobile && <TopBar title="Cash Out" showBack />}
      {!isMobile && (
        <div className="flex justify-start px-4 pt-4">
          <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white transition-colors"><Icon name="arrow_back" size={24} /></button>
        </div>
      )}

      <div className="px-4 py-4">
        {/* Balance card */}
        <div className="bg-surface-1 rounded-2xl p-5 border border-white/[0.06] text-center mb-6">
          <p className="text-text-secondary text-xs mb-1">Cashable Gems</p>
          <p className="text-brand-gold text-3xl font-bold font-dmmono">{balance.toLocaleString()} <span className="text-lg">coins</span></p>
          <p className="text-text-muted text-xs mt-1">≈ €{(gemBalance * 0.01).toFixed(2)}</p>
        </div>

        {/* Amount input */}
        <label className="block mb-1">
          <span className="text-text-secondary text-xs font-bold uppercase mb-2 block">Payout Amount (coins)</span>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder={`Minimum ${MIN_PAYOUT.toLocaleString()} coins`}
            className="w-full bg-surface-2 border border-white/[0.06] rounded-xl px-4 py-4 text-text-primary text-xl font-bold font-dmmono focus:border-brand-cyan focus:outline-none" />
        </label>

        {/* Quick amounts */}
        <div className="flex gap-2 mt-2 mb-4">
          {[1000, 2500, 5000, gemBalance].map((val, i) => (
            <button key={val} onClick={() => setAmount(String(Math.min(val, gemBalance)))}
              className="flex-1 py-2 rounded-xl bg-surface-2 border border-white/[0.06] text-xs font-semibold text-text-secondary hover:border-white/[0.12] transition-colors">
              {i === 3 ? 'All' : val.toLocaleString()}
            </button>
          ))}
        </div>

        {/* Fee breakdown — only show when amount entered */}
        {numAmount >= MIN_PAYOUT && (
          <div className="rounded-2xl border border-white/[0.06] bg-surface-1 p-4 mb-6">
            <p className="text-text-secondary text-[10px] font-bold uppercase tracking-widest mb-3">Fee Breakdown</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Withdrawal amount</span>
                <span className="text-text-primary font-dmmono">€{eurTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Platform fee</span>
                <span className="text-brand-cyan font-dmmono text-xs">€0 (taken at gem conversion)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Processing fee (~3%)</span>
                <span className="text-brand-ember font-dmmono">-€{processorFee.toFixed(2)}</span>
              </div>
              <div className="border-t border-white/[0.04] my-2" />
              <div className="flex justify-between text-sm font-bold">
                <span className="text-text-primary">You receive</span>
                <span className="text-brand-cyan font-dmmono text-lg">€{userReceives.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Payout method */}
        <span className="text-text-secondary text-xs font-bold uppercase mb-2 block">Payout Method</span>
        <div className="space-y-2 mb-4">
          {PAYOUT_METHODS.map(m => (
            <button key={m.id} onClick={() => setMethod(m.id)}
              className={`flex items-center gap-3 w-full p-4 rounded-xl border transition-all text-left ${
                method === m.id ? 'border-brand-cyan bg-brand-cyan/5' : 'border-white/[0.06] bg-surface-1'
              }`}>
              <Icon name={m.icon} size={22} className={method === m.id ? 'text-brand-cyan' : 'text-text-muted'} />
              <div className="flex-1">
                <span className="text-sm font-semibold text-text-primary">{m.name}</span>
                <p className="text-text-muted text-[10px]">{m.desc}</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                method === m.id ? 'border-brand-cyan bg-brand-cyan' : 'border-white/[0.06]'
              }`}>
                {method === m.id && <Icon name="check" size={12} className="text-bg-dark" />}
              </div>
            </button>
          ))}
        </div>

        {/* Payment details */}
        <label className="block mb-6">
          <span className="text-text-secondary text-xs font-bold uppercase mb-2 block">{selectedMethod?.name} Details</span>
          <input type="text" value={details} onChange={(e) => setDetails(e.target.value)}
            placeholder={selectedMethod?.placeholder}
            className="w-full bg-surface-2 border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-cyan focus:outline-none" />
        </label>

        <button onClick={handlePayout} disabled={!isValid || processing}
          className={`w-full py-4 rounded-2xl text-lg font-bold transition-all ${
            isValid && !processing ? 'bg-brand-cyan text-bg-dark' : 'bg-surface-3 text-text-muted'
          }`}>
          {processing ? 'Processing...' : numAmount >= MIN_PAYOUT ? `Cash Out — receive €${userReceives.toFixed(2)}` : 'Enter amount'}
        </button>
      </div>
    </div>
  );
}
