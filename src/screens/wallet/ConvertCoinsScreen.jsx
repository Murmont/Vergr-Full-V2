// Convert Coins → Gems screen.
// Coins are the in-app currency; Gems are the withdrawable currency. Conversion
// is one-way (coins → gems) and applies the user's VP-tier commission. The
// recipient must hold ≥ 1000 gems before they can request a payout (the
// payout flow enforces this; this screen just helps users get there).

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import { useUI } from '../../context/UIContext';
import { convertCoinsToGems } from '../../firebase/firestore';
import { getGemRate, getVPLevel } from '../../utils/vpSystem';
import TopBar from '../../components/TopBar';
import Icon from '../../components/Icon';
import { CoinIcon, GemIcon } from '../../components/CoinIcon';
import useResponsive from '../../hooks/useResponsive';

const QUICK_PCTS = [0.25, 0.5, 0.75, 1];
const PAYOUT_MIN_GEMS = 1000;

export default function ConvertCoinsScreen() {
  const { currentUser } = useAuth();
  const { wallet, refreshWallet } = useUser();
  const { showToast } = useUI();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();

  const coins = wallet?.balance || 0;
  const gems  = wallet?.gems || 0;
  const vp    = wallet?.vp || 0;
  const tier  = getVPLevel?.(vp);
  const rate  = getGemRate?.(vp) ?? 1;
  const keepPct = Math.round(rate * 100);
  const commissionPct = 100 - keepPct;

  const [amount, setAmount]   = useState('');
  const [working, setWorking] = useState(false);

  const numAmount = Number.parseInt(amount, 10);
  const valid = Number.isFinite(numAmount) && numAmount > 0 && numAmount <= coins;
  const gemsOut = useMemo(() => valid ? Math.floor(numAmount * rate) : 0, [valid, numAmount, rate]);
  const cut     = valid ? numAmount - gemsOut : 0;

  const totalGemsAfter   = gems + gemsOut;
  const reachesPayoutMin = totalGemsAfter >= PAYOUT_MIN_GEMS;
  const gemsToReachMin   = Math.max(0, PAYOUT_MIN_GEMS - gems);

  const setQuick = (pct) => setAmount(String(Math.floor(coins * pct)));

  const handleConvert = async () => {
    if (!valid || working) return;
    setWorking(true);
    try {
      const res = await convertCoinsToGems(currentUser.uid, numAmount);
      showToast(`Converted ${numAmount} coins → ${res.gemsCredited} gems`, 'coins');
      await refreshWallet?.();
      setAmount('');
    } catch (err) {
      showToast(err.message || 'Conversion failed', 'error');
    }
    setWorking(false);
  };

  return (
    <div className="pb-10">
      {isMobile && <TopBar title="Convert Coins" showBack />}

      <div className="px-4 md:px-6 py-4 md:py-6 max-w-[720px] mx-auto">
        {!isMobile && (
          <div className="mb-5">
            <h1 className="font-syne text-3xl font-black text-text-primary">Convert Coins → Gems</h1>
            <p className="text-text-muted text-sm mt-1">Gems are the withdrawable currency. Convert your in-app coins at your VP-tier rate.</p>
          </div>
        )}

        {/* Balances */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-2xl p-4 flex items-center gap-3"
               style={{ background: '#14141F', border: '1px solid rgba(240,165,0,0.30)', boxShadow: '0 0 24px rgba(240,165,0,0.08)' }}>
            <CoinIcon size={44} className="drop-shadow-[0_0_14px_rgba(240,165,0,0.55)]" />
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: '#F5C842' }}>Your Coins</p>
              <p className="text-2xl font-black font-dmmono tabular-nums text-text-primary leading-none mt-1">{coins.toLocaleString()}</p>
            </div>
          </div>
          <div className="rounded-2xl p-4 flex items-center gap-3"
               style={{ background: '#14141F', border: '1px solid rgba(61,127,255,0.30)', boxShadow: '0 0 24px rgba(61,127,255,0.08)' }}>
            <GemIcon size={44} className="drop-shadow-[0_0_14px_rgba(61,127,255,0.55)]" />
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: '#3D7FFF' }}>Your Gems</p>
              <p className="text-2xl font-black font-dmmono tabular-nums text-text-primary leading-none mt-1">{gems.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Tier rate banner */}
        <div className="rounded-2xl p-4 mb-4"
             style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.10), rgba(15,17,24,1) 60%)', border: '1px solid rgba(124,58,237,0.30)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: '#B44FFF' }}>Your Conversion Rate</p>
              <p className="text-text-primary font-bold mt-1">
                <span className="font-dmmono tabular-nums" style={{ color: '#3D7FFF' }}>{keepPct}%</span>
                <span className="text-text-muted font-normal text-xs ml-1.5">· {commissionPct}% platform commission</span>
              </p>
            </div>
            <div className="text-right">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase" style={{ background: 'rgba(180,79,255,0.12)', color: '#B44FFF' }}>
                {tier?.name || 'ROOKIE'}
              </span>
            </div>
          </div>
          <button
            onClick={() => navigate('/earn')}
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold hover:underline"
            style={{ color: '#B44FFF' }}
          >
            Earn VP to improve your rate <Icon name="arrow_forward" size={11} />
          </button>
        </div>

        {/* Amount input */}
        <div className="rounded-2xl p-5"
             style={{ background: '#14141F', border: '1px solid #1E1E2E' }}>
          <p className="text-text-secondary text-[11px] font-dmmono uppercase tracking-wider font-bold mb-2">Coins to convert</p>
          <div className="relative mb-3">
            <div className="absolute left-3 top-1/2 -translate-y-1/2"><CoinIcon size={20} /></div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="0"
              className="w-full bg-surface-2 border border-white/[0.06] rounded-xl py-3.5 pl-12 pr-4 text-2xl font-dmmono tabular-nums text-text-primary placeholder:text-text-muted focus:border-brand-violet focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-4 gap-2 mb-4">
            {QUICK_PCTS.map(pct => (
              <button key={pct}
                onClick={() => setQuick(pct)}
                className="py-2 rounded-lg text-[12px] font-bold border transition-colors"
                style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', color: '#9CA3AF' }}
              >
                {pct === 1 ? 'MAX' : `${pct * 100}%`}
              </button>
            ))}
          </div>

          {/* Preview */}
          <div className="rounded-xl p-4 space-y-2 text-sm"
               style={{ background: 'rgba(61,127,255,0.06)', border: '1px solid rgba(61,127,255,0.20)' }}>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">You'll receive</span>
              <span className="inline-flex items-center gap-1.5 font-dmmono font-bold tabular-nums text-base" style={{ color: '#3D7FFF' }}>
                <GemIcon size={16} /> {gemsOut.toLocaleString()} gems
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Worth</span>
              <span className="font-dmmono tabular-nums text-text-primary">€{(gemsOut * 0.01).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Platform commission</span>
              <span className="font-dmmono tabular-nums text-text-secondary">{cut.toLocaleString()} coins ({commissionPct}%)</span>
            </div>
          </div>

          {/* Payout-min hint */}
          {valid && (
            <p className="text-[11px] mt-3" style={{ color: reachesPayoutMin ? '#22D17E' : '#9CA3AF' }}>
              {reachesPayoutMin
                ? `✓ After conversion you'll reach the ${PAYOUT_MIN_GEMS.toLocaleString()}-gem withdrawal minimum.`
                : `${gemsToReachMin.toLocaleString()} more gems needed to hit the ${PAYOUT_MIN_GEMS.toLocaleString()}-gem withdrawal minimum.`}
            </p>
          )}

          <button
            onClick={handleConvert}
            disabled={!valid || working}
            className="mt-4 w-full py-3.5 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all"
            style={(valid && !working)
              ? { background: 'rgba(61,127,255,0.15)', color: '#3D7FFF', border: '1px solid rgba(61,127,255,0.50)' }
              : { background: 'rgba(255,255,255,0.04)', color: '#6B7280', border: '1px solid rgba(255,255,255,0.06)', cursor: 'not-allowed' }}
          >
            {working ? 'Converting…' : (
              <>
                <Icon name="sync_alt" size={16} /> Convert {numAmount > 0 ? numAmount.toLocaleString() : ''} coins
              </>
            )}
          </button>
        </div>

        {/* How it works */}
        <div className="mt-5 rounded-2xl p-4 text-[12px] text-text-muted leading-relaxed"
             style={{ background: '#14141F', border: '1px solid #1E1E2E' }}>
          <p className="text-text-primary font-bold text-[13px] mb-2 flex items-center gap-1.5">
            <Icon name="info" size={14} /> How conversion works
          </p>
          <ul className="space-y-1.5 list-disc pl-4">
            <li><strong className="text-text-secondary">Coins</strong> are your in-app currency — bought, earned, or received as tips.</li>
            <li><strong className="text-text-secondary">Gems</strong> are the withdrawable currency. You can cash gems out once you reach <span className="font-dmmono tabular-nums">{PAYOUT_MIN_GEMS.toLocaleString()}</span> gems.</li>
            <li>Conversion takes a platform commission set by your <strong className="text-text-secondary">VP tier</strong>. Higher tier → smaller cut.</li>
            <li>Conversion is one-way — gems can't go back to coins.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
