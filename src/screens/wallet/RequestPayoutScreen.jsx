// Request Payout — gem → crypto withdrawal screen.
//
// Flow:
//   1. User picks crypto + amount (gems).
//   2. Client calls `getPayoutQuote` callable → server fetches a fixed-rate
//      estimate from NOWPayments, applies the 2% platform spread, persists
//      a `payout_quote` doc with a 60-second TTL.
//   3. User pastes their wallet address and confirms within the TTL.
//   4. Client calls `confirmPayout` → server debits gems atomically and
//      either creates a NOWPayments mass-payout (small) or marks the doc
//      `awaiting_approval` (> €500). IPN webhook drives status updates.
//
// Server enforces the rules; this screen is purely UI.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { useUI } from '../../context/UIContext';
import { useLayout } from '../../context/LayoutContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase/config';
import { PAYOUT_CURRENCIES, PAYOUT_SPREAD_PCT } from '../../utils/vpSystem';
import TopBar from '../../components/TopBar';
import Icon from '../../components/Icon';
import { GemIcon } from '../../components/CoinIcon';
import useResponsive from '../../hooks/useResponsive';

const MIN_PAYOUT_GEMS = 1000;

export default function RequestPayoutScreen() {
  const { wallet, refreshWallet } = useUser();
  const { showToast } = useUI();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const { setContentAlign } = useLayout();

  useEffect(() => {
    setContentAlign('left');
    return () => setContentAlign('center');
  }, [setContentAlign]);

  const gemBalance = wallet?.gems || 0;

  const [currency, setCurrency] = useState(PAYOUT_CURRENCIES[0].code);
  const [amount, setAmount]     = useState('');
  const [address, setAddress]   = useState('');
  const [quote, setQuote]       = useState(null);
  const [quoting, setQuoting]   = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [tick, setTick] = useState(0); // forces re-render for countdown

  const numAmount = Number.parseInt(amount, 10) || 0;
  const validAmount = numAmount >= MIN_PAYOUT_GEMS && numAmount <= gemBalance;

  // Countdown ticker — updates the displayed "expires in" every second.
  useEffect(() => {
    if (!quote) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [quote]);

  const secondsLeft = useMemo(() => {
    if (!quote) return 0;
    return Math.max(0, Math.floor((quote.lockedUntil - Date.now()) / 1000));
  }, [quote, tick]);
  const quoteExpired = quote && secondsLeft === 0;

  // Reset the quote whenever currency or amount changes
  useEffect(() => { setQuote(null); }, [currency, amount]);

  const fetchQuote = async () => {
    if (!validAmount || quoting) return;
    setQuoting(true);
    try {
      const fn = httpsCallable(functions, 'getPayoutQuote');
      const res = await fn({ gems: numAmount, currency });
      setQuote(res.data);
    } catch (err) {
      showToast(err?.message || 'Could not fetch live rate', 'error');
    } finally {
      setQuoting(false);
    }
  };

  const confirm = async () => {
    if (!quote || quoteExpired || !address.trim() || confirming) return;
    setConfirming(true);
    try {
      const fn = httpsCallable(functions, 'confirmPayout');
      const res = await fn({ quoteId: quote.quoteId, walletAddress: address.trim() });
      const status = res.data?.status;
      if (status === 'awaiting_approval') {
        showToast('Withdrawal queued for review (>€500). You\'ll be notified within 24h.', 'info');
      } else {
        showToast('Withdrawal sent!', 'success');
      }
      await refreshWallet?.();
      navigate('/wallet');
    } catch (err) {
      showToast(err?.message || 'Withdrawal failed', 'error');
    } finally {
      setConfirming(false);
    }
  };

  const setQuick = (pct) => setAmount(String(Math.floor(gemBalance * pct)));

  const selectedCurrency = PAYOUT_CURRENCIES.find(c => c.code === currency);
  const networkFeeInGems = quote?.cryptoAmount && quote.networkFee
    ? Math.round((quote.networkFee / quote.cryptoAmount) * numAmount)
    : 0;
  const eurAfterFees = quote
    ? Math.max(0, quote.eurAfterSpread - (quote.cryptoAmount && quote.networkFee
        ? (quote.networkFee / quote.cryptoAmount) * quote.eurAfterSpread
        : 0))
    : 0;

  return (
    <div className="pb-10" style={{ background: '#0B0B14' }}>
      {isMobile && <TopBar title="Cash Out" showBack />}

      <div className="px-4 md:px-7 py-5 md:py-7 max-w-[760px] mx-auto">
        {!isMobile && (
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="font-syne text-3xl font-black text-text-primary">Cash Out Gems</h1>
              <p className="text-text-muted text-sm mt-1">Withdraw your gems as crypto — sent directly to your wallet.</p>
            </div>
            <button onClick={() => navigate('/wallet')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold transition-colors"
              style={{ background: '#14141F', border: '1px solid #1E1E2E', color: '#9CA3AF' }}>
              <Icon name="arrow_back" size={14} /> Back to Wallet
            </button>
          </div>
        )}

        {/* Cashable hero */}
        <div className="rounded-2xl p-5 mb-5 flex items-center gap-4"
             style={{ background: '#14141F', border: '1px solid rgba(61,127,255,0.30)', boxShadow: '0 0 32px rgba(61,127,255,0.08)' }}>
          <GemIcon size={56} className="drop-shadow-[0_0_18px_rgba(61,127,255,0.55)]" />
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: '#3D7FFF' }}>Cashable Gems</p>
            <p className="text-3xl font-black font-dmmono tabular-nums text-text-primary leading-none mt-1">{gemBalance.toLocaleString()}</p>
            <p className="text-text-muted text-[12px] mt-1">≈ €{(gemBalance * 0.01).toFixed(2)} · 1 gem = €0.01</p>
          </div>
        </div>

        {/* Below-min CTA */}
        {gemBalance < MIN_PAYOUT_GEMS && (
          <button
            onClick={() => navigate('/wallet/convert')}
            className="w-full mb-5 rounded-2xl p-4 flex items-center gap-3 text-left transition-colors hover:brightness-110"
            style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.40)' }}>
            <Icon name="info" size={20} style={{ color: '#F59E0B' }} />
            <div className="flex-1 text-[13px] text-text-primary">
              Need <span className="font-bold" style={{ color: '#F59E0B' }}>{(MIN_PAYOUT_GEMS - gemBalance).toLocaleString()} more gems</span> to withdraw — convert your coins now.
            </div>
            <Icon name="arrow_forward" size={16} className="text-text-muted" />
          </button>
        )}

        {/* Currency picker */}
        <p className="text-text-secondary text-[11px] font-dmmono uppercase tracking-wider font-bold mb-2">Choose currency</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {PAYOUT_CURRENCIES.map(c => {
            const active = currency === c.code;
            return (
              <button
                key={c.code}
                onClick={() => setCurrency(c.code)}
                className="px-3.5 py-2 rounded-full text-[12px] font-bold transition-all"
                style={active
                  ? { background: 'linear-gradient(135deg, rgba(123,31,255,0.20), rgba(61,127,255,0.10))', border: '1px solid rgba(180,79,255,0.50)', color: '#fff' }
                  : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#9CA3AF' }}
              >
                {c.name} <span className="text-[10px] font-medium opacity-70 ml-1">{c.network}</span>
                {c.recommended && <span className="ml-1.5 text-[9px] font-extrabold" style={{ color: '#22D17E' }}>· LOW FEES</span>}
              </button>
            );
          })}
        </div>

        {/* Amount */}
        <p className="text-text-secondary text-[11px] font-dmmono uppercase tracking-wider font-bold mb-2">Amount in gems</p>
        <div className="rounded-2xl p-4 mb-3" style={{ background: '#14141F', border: '1px solid #1E1E2E' }}>
          <div className="relative mb-3">
            <GemIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder={`Min ${MIN_PAYOUT_GEMS.toLocaleString()} gems`}
              className="w-full bg-surface-2 border border-white/[0.06] rounded-xl py-3.5 pl-12 pr-4 text-2xl font-dmmono tabular-nums text-text-primary placeholder:text-text-muted focus:outline-none"
              style={{ borderColor: validAmount || numAmount === 0 ? 'rgba(255,255,255,0.10)' : 'rgba(240,60,96,0.50)' }}
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[0.25, 0.5, 0.75, 1].map(pct => (
              <button key={pct} onClick={() => setQuick(pct)}
                className="py-2 rounded-lg text-[12px] font-bold border transition-colors"
                style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', color: '#9CA3AF' }}>
                {pct === 1 ? 'MAX' : `${pct * 100}%`}
              </button>
            ))}
          </div>
          {!validAmount && numAmount > 0 && (
            <p className="text-[11px] mt-2" style={{ color: '#F04060' }}>
              {numAmount < MIN_PAYOUT_GEMS ? `Min ${MIN_PAYOUT_GEMS.toLocaleString()} gems` : 'Insufficient gems'}
            </p>
          )}
        </div>

        {/* Quote button / preview */}
        {!quote && (
          <button
            onClick={fetchQuote}
            disabled={!validAmount || quoting}
            className="w-full py-3.5 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all"
            style={(validAmount && !quoting)
              ? { background: 'rgba(61,127,255,0.15)', color: '#3D7FFF', border: '1px solid rgba(61,127,255,0.50)' }
              : { background: 'rgba(255,255,255,0.04)', color: '#6B7280', border: '1px solid rgba(255,255,255,0.06)', cursor: 'not-allowed' }}
          >
            {quoting ? 'Fetching live rate…' : <>Get live rate <Icon name="bolt" size={14} /></>}
          </button>
        )}

        {/* Quote breakdown */}
        {quote && (
          <div className="rounded-2xl p-5 mb-3"
               style={{ background: 'rgba(61,127,255,0.06)', border: '1px solid rgba(61,127,255,0.30)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-dmmono uppercase tracking-wider font-bold" style={{ color: '#3D7FFF' }}>You'll receive</p>
              <span className="text-[10px] font-bold tabular-nums" style={{ color: quoteExpired ? '#F04060' : '#22D17E' }}>
                {quoteExpired ? 'Expired' : `Expires in ${secondsLeft}s`}
              </span>
            </div>
            <p className="text-3xl font-black font-dmmono tabular-nums text-text-primary leading-none">
              {quote.cryptoAmount.toFixed(8)} <span className="text-base">{selectedCurrency.name}</span>
            </p>
            <p className="text-text-muted text-[11px] mt-1">≈ €{eurAfterFees.toFixed(2)} after fees</p>

            <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1.5 text-[12px]">
              <Row label="Gems converted" value={`${numAmount.toLocaleString()} (€${quote.eurValue.toFixed(2)})`} />
              <Row label={`Platform spread (${Math.round(PAYOUT_SPREAD_PCT * 100)}%)`} value={`−€${quote.spreadEUR.toFixed(2)}`} />
              <Row label="Network fee est." value={`~${quote.networkFee.toFixed(8)} ${selectedCurrency.name}`} />
            </div>

            {/* Quote-expired refresh */}
            {quoteExpired && (
              <button
                onClick={fetchQuote}
                disabled={quoting}
                className="mt-3 w-full py-2.5 rounded-lg text-[12px] font-bold transition-colors"
                style={{ background: 'rgba(240,165,0,0.10)', border: '1px solid rgba(240,165,0,0.40)', color: '#F0A500' }}
              >
                {quoting ? 'Refreshing…' : 'Refresh quote'}
              </button>
            )}
          </div>
        )}

        {/* Wallet address */}
        {quote && !quoteExpired && (
          <>
            <p className="text-text-secondary text-[11px] font-dmmono uppercase tracking-wider font-bold mb-2 mt-5">Your {selectedCurrency.name} ({selectedCurrency.network}) wallet address</p>
            <div className="rounded-2xl p-4 mb-3" style={{ background: '#14141F', border: '1px solid #1E1E2E' }}>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value.trim())}
                placeholder={`Paste your ${selectedCurrency.name} address`}
                className="w-full bg-surface-2 border border-white/[0.06] rounded-xl py-3 px-4 text-[13px] font-dmmono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-cyan"
              />
              <p className="text-[10.5px] text-text-muted mt-2 leading-relaxed">
                ⚠ Withdrawals are non-reversible. Double-check the address — funds sent to the wrong address cannot be recovered.
              </p>
            </div>

            <button
              onClick={confirm}
              disabled={!address.trim() || confirming}
              className="w-full py-3.5 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all"
              style={(address.trim() && !confirming)
                ? { background: 'linear-gradient(135deg, rgba(34,209,126,0.20), rgba(61,127,255,0.10))', border: '1px solid rgba(34,209,126,0.50)', color: '#22D17E' }
                : { background: 'rgba(255,255,255,0.04)', color: '#6B7280', border: '1px solid rgba(255,255,255,0.06)', cursor: 'not-allowed' }}
            >
              {confirming ? 'Sending…' : <>Withdraw {quote.cryptoAmount.toFixed(8)} {selectedCurrency.name} <Icon name="arrow_forward" size={14} /></>}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-muted">{label}</span>
      <span className="font-dmmono tabular-nums text-text-secondary">{value}</span>
    </div>
  );
}
