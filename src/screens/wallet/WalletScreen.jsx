import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import { useUI } from '../../context/UIContext';
import { getTransactions, getCoinPackages, sendCoins, searchUsers } from '../../firebase/firestore';
import { getTier, getTierProgress, getNextTier } from '../../utils/helpers';
import TopBar from '../../components/TopBar';
import CoinDisplay from '../../components/CoinDisplay';
import VPLevelBadge from '../../components/VPLevelBadge';
import InfoTooltip from '../../components/InfoTooltip';
import Icon from '../../components/Icon';
import Modal from '../../components/Modal';
import RightSidebarPanel from '../../components/RightSidebarPanel';
import useResponsive from '../../hooks/useResponsive';
import { useLayout } from '../../context/LayoutContext';

export default function WalletScreen() {
  const [activeTab, setActiveTab] = useState('transactions');
  const [transactions, setTransactions] = useState([]);
  const [coinPacks, setCoinPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendSearch, setSendSearch] = useState('');
  const [sendResults, setSendResults] = useState([]);
  const [sendTarget, setSendTarget] = useState(null);
  const [sendAmount, setSendAmount] = useState('');
  const [sending, setSending] = useState(false);

  const { currentUser } = useAuth();
  const { wallet } = useUser();
  const { showToast } = useUI();
  const navigate = useNavigate();
  const { isMobile, isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  useEffect(() => {
    setRightPanel(<RightSidebarPanel />);
    setContentAlign('left');
    return () => {
      setRightPanel(null);
      setContentAlign('center');
    };
  }, [setRightPanel, setContentAlign]);

  useEffect(() => {
    if (!currentUser) return;
    const load = async () => {
      setLoading(true);
      try {
        const [txs, packs] = await Promise.all([
          getTransactions(currentUser.uid),
          getCoinPackages(),
        ]);
        setTransactions(txs);
        setCoinPacks(packs);
      } catch (err) {
        console.error('Failed to load wallet data:', err);
      }
      setLoading(false);
    };
    load();
  }, [currentUser]);

  const handleSendSearch = async (term) => {
    setSendSearch(term);
    if (term.length < 2) { setSendResults([]); return; }
    try {
      const results = await searchUsers(term, 5);
      setSendResults(results.filter(u => u.id !== currentUser.uid));
    } catch (err) { console.error(err); }
  };

  const handleSend = async () => {
    if (!sendTarget || !sendAmount || sending) return;
    const amount = parseInt(sendAmount);
    if (isNaN(amount) || amount <= 0) return;
    if (amount > (wallet?.balance || 0)) return;

    setSending(true);
    try {
      await sendCoins(currentUser.uid, sendTarget.id, amount, `Sent to @${sendTarget.username}`);
      showToast(`Sent ${amount} coins to @${sendTarget.username}`, 'coins');
      setShowSendModal(false);
      setSendTarget(null);
      setSendAmount('');
      setSendSearch('');
      const txs = await getTransactions(currentUser.uid);
      setTransactions(txs);
    } catch (err) {
      console.error('Send failed:', err);
      showToast(err.message || 'Failed to send coins', 'error');
    }
    setSending(false);
  };

  const closeSendModal = () => {
    setShowSendModal(false);
    setSendTarget(null);
    setSendAmount('');
    setSendSearch('');
    setSendResults([]);
  };

  const tier = getTier(wallet?.totalEarned || 0);
  const tierProgress = getTierProgress(wallet?.totalEarned || 0);
  const nextTier = getNextTier(wallet?.totalEarned || 0);

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 172800000) return 'Yesterday';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const getTxIcon = (type) => {
    switch (type) {
      case 'daily_reward': return { icon: 'local_fire_department', color: 'text-brand-gold', bg: 'bg-brand-gold/10' };
      case 'quest_reward': return { icon: 'emoji_events', color: 'text-brand-gold', bg: 'bg-brand-gold/10' };
      case 'tier_reward': return { icon: 'workspace_premium', color: 'text-brand-violet', bg: 'bg-brand-violet/10' };
      case 'admin_reward': return { icon: 'campaign', color: 'text-brand-cyan', bg: 'bg-brand-cyan/10' };
      case 'received': case 'tip_received': return { icon: 'diamond', color: 'text-brand-cyan', bg: 'bg-brand-cyan/10' };
      case 'sent': case 'tip_sent': return { icon: 'arrow_upward', color: 'text-brand-ember', bg: 'bg-brand-ember/10' };
      case 'purchase': return { icon: 'add_circle', color: 'text-brand-gold', bg: 'bg-brand-gold/10' };
      case 'payout': case 'gem_cashout': return { icon: 'account_balance', color: 'text-brand-violet', bg: 'bg-brand-violet/10' };
      case 'tournament_entry': return { icon: 'confirmation_number', color: 'text-brand-pink', bg: 'bg-brand-pink/10' };
      case 'tournament_prize': case 'tournament_win': return { icon: 'emoji_events', color: 'text-brand-gold', bg: 'bg-brand-gold/10' };
      case 'tournament_refund': return { icon: 'replay', color: 'text-brand-cyan', bg: 'bg-brand-cyan/10' };
      case 'mod_payout': return { icon: 'shield', color: 'text-brand-cyan', bg: 'bg-brand-cyan/10' };
      case 'service_payment': return { icon: 'work', color: 'text-brand-violet', bg: 'bg-brand-violet/10' };
      case 'service_earned': return { icon: 'diamond', color: 'text-brand-cyan', bg: 'bg-brand-cyan/10' };
      case 'squad_contribution': return { icon: 'groups', color: 'text-brand-violet', bg: 'bg-brand-violet/10' };
      case 'boost': return { icon: 'trending_up', color: 'text-brand-pink', bg: 'bg-brand-pink/10' };
      case 'membership': return { icon: 'card_membership', color: 'text-brand-pink', bg: 'bg-brand-pink/10' };
      case 'referral': return { icon: 'person_add', color: 'text-brand-cyan', bg: 'bg-brand-cyan/10' };
      default: return { icon: 'swap_vert', color: 'text-text-muted', bg: 'bg-surface-3' };
    }
  };

  const renderBalanceCard = () => (
    <div className="space-y-3">
      {/* Coins — purchased, spendable */}
      <div className="p-5 rounded-2xl bg-surface-1 border border-white/[0.06]">
        <div className="flex items-center justify-between mb-1">
          <p className="text-text-muted text-[11px] uppercase tracking-wider font-semibold">Coins</p>
          <button onClick={() => navigate('/settings/how-it-works')} className="text-text-muted hover:text-text-secondary transition-colors">
            <Icon name="help_outline" size={14} />
          </button>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black font-dmmono text-text-primary">{(wallet?.balance || 0).toLocaleString()}</span>
          <span className="text-text-muted text-xs font-dmmono">≈ €{((wallet?.balance || 0) * 0.01).toFixed(2)}</span>
        </div>
        <p className="text-text-muted text-[10px] mt-1">Buy coins to spend on tips, tournaments, services & boosts</p>
      </div>

      {/* Gems + VP row */}
      <div className="flex gap-3">
        {/* Gems — earned, cashable */}
        <div className="flex-1 p-4 rounded-2xl bg-surface-1 border border-white/[0.06]">
          <div className="flex items-center gap-1.5 mb-1">
            <Icon name="diamond" size={14} className="text-brand-cyan" />
            <p className="text-text-muted text-[10px] uppercase tracking-wider font-semibold">Gems</p>
          </div>
          <p className="text-xl font-black font-dmmono text-text-primary">{(wallet?.gems || 0).toLocaleString()}</p>
          <p className="text-text-muted text-[9px] mt-0.5">Cashable · €{((wallet?.gems || 0) * 0.01).toFixed(2)}</p>
        </div>

        {/* VP */}
        <div className="flex-1 p-4 rounded-2xl bg-surface-1 border border-white/[0.06]">
          <div className="flex items-center gap-1.5 mb-1">
            <Icon name="star" size={14} className="text-brand-violet" />
            <p className="text-text-muted text-[10px] uppercase tracking-wider font-semibold">VP</p>
          </div>
          <p className="text-xl font-black font-dmmono text-text-primary">{(wallet?.vp || 0).toLocaleString()}</p>
          <VPLevelBadge vp={wallet?.vp || 0} size="xs" />
        </div>
      </div>
    </div>
  );

  const renderActionButtons = () => (
    <div className="grid grid-cols-4 gap-2">
      {[
        { route: '/buy-coins', icon: 'add_circle', color: 'text-brand-gold', label: 'Buy Coins' },
        { route: '/earn', icon: 'emoji_events', color: 'text-brand-cyan', label: 'Earn' },
        { route: '/services', icon: 'work', color: 'text-brand-violet', label: 'Services' },
        { route: '/request-payout', icon: 'savings', color: 'text-brand-pink', label: 'Cash Out' },
      ].map(item => (
        <motion.button
          key={item.route}
          onClick={() => navigate(item.route)}
          whileTap={{ scale: 0.93 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-surface-1 border border-white/[0.06] hover:bg-surface-2/50 transition-colors"
        >
          <Icon name={item.icon} size={20} className={item.color} />
          <span className="text-[10px] font-semibold text-text-secondary">{item.label}</span>
        </motion.button>
      ))}
    </div>
  );

  const renderTransactions = () => (
    <div className="space-y-1">
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-surface-3 border-t-brand-cyan rounded-full animate-spin" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12">
          <Icon name="receipt_long" size={40} className="text-text-muted/20 mx-auto mb-3" />
          <p className="text-text-muted text-sm">No transactions yet</p>
          <p className="text-text-muted/60 text-xs mt-1">Earn coins, send tips, or buy coins to get started</p>
        </div>
      ) : (
        transactions.map(tx => {
          const style = getTxIcon(tx.type);
          return (
            <button key={tx.id} onClick={() => navigate(`/transaction/${tx.id}`)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl w-full text-left hover:bg-surface-2/40 transition-colors">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${style.bg}`}>
                <Icon name={style.icon} size={18} className={style.color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary truncate">{tx.description || tx.desc}</p>
                <p className="text-[11px] text-text-muted font-dmmono">{formatDate(tx.createdAt)}</p>
              </div>
              <span className={`font-dmmono font-bold text-sm ${tx.amount > 0 ? 'text-green-500' : 'text-text-secondary'}`}>
                {tx.amount > 0 ? '+' : ''}{tx.amount}
              </span>
            </button>
          );
        })
      )}
    </div>
  );

  const renderCoinPacks = () => (
    <div className="space-y-3">
      {coinPacks.length === 0 && !loading ? (
        <div className="text-center py-12">
          <Icon name="monetization_on" size={48} className="text-text-muted mx-auto mb-3" />
          <p className="text-text-muted text-sm">Coin packs coming soon</p>
        </div>
      ) : (
        coinPacks.map((pack, i) => (
          <div key={pack.id}
            className={`p-5 rounded-2xl border relative ${
              i === 1 ? 'border-brand-cyan/20 bg-brand-cyan/[0.03]' : 'border-white/[0.06] bg-surface-1'
            }`}>
            {i === 1 && (
              <span className="absolute -top-3 left-6 bg-brand-cyan text-bg-dark text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Most Popular
              </span>
            )}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-text-primary">{pack.name}</h3>
                <p className="font-dmmono text-text-secondary text-sm">{pack.coins?.toLocaleString()} Coins</p>
                {pack.bonus > 0 && <p className="text-green-500 text-xs mt-0.5">+{pack.bonus} bonus coins</p>}
              </div>
              <button onClick={() => navigate('/buy-coins')} className="px-5 py-2 rounded-full bg-brand-cyan text-bg-dark font-bold text-sm hover:brightness-110 active:scale-95 transition-all">
                €{pack.priceEUR}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="pb-8">
      {/* Mobile TopBar */}
      {isMobile && (
        <TopBar title="Wallet" showBack actions={
          <button onClick={() => navigate('/wallet/security')} className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center">
            <Icon name="shield" size={18} />
          </button>
        } />
      )}

      {/* Desktop header with security icon */}
      {!isMobile && (
        <div className="flex justify-end px-4 pt-4">
          <button
            onClick={() => navigate('/wallet/security')}
            className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center hover:bg-surface-3 transition-colors"
            title="Wallet Security"
          >
            <Icon name="shield" size={20} />
          </button>
        </div>
      )}

      <div className="px-4 py-4 space-y-4">
        {renderBalanceCard()}

        <InfoTooltip id="wallet_intro" icon="school" color="#4DFFD4" title="How the VERGR economy works">
          <strong>Coins</strong> are bought with real money — spend on tips, services, tournaments, and boosts.{' '}
          <strong>Gems</strong> are earned when people spend coins on you — cash these out.{' '}
          <strong>VP</strong> levels up your profile, lowers your commission, and unlocks perks.
        </InfoTooltip>

        {renderActionButtons()}

        {isDesktop ? (
          // Desktop: two columns
          <div className="grid grid-cols-2 gap-6 mt-4">
            <div>
              <h2 className="font-syne font-bold text-lg mb-3">Recent Transactions</h2>
              {renderTransactions()}
            </div>
            <div>
              <h2 className="font-syne font-bold text-lg mb-3">Coin Packs</h2>
              {renderCoinPacks()}
            </div>
          </div>
        ) : (
          // Mobile: tabs
          <>
            <div className="flex gap-2 mt-2 bg-surface-2/40 rounded-full p-1">
              {['transactions', 'buy'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`relative flex-1 py-2 rounded-full text-sm font-semibold transition-colors ${activeTab === tab ? 'text-bg-dark' : 'text-text-muted'}`}>
                  {activeTab === tab && (
                    <motion.div
                      layoutId="walletTabPill"
                      className="absolute inset-0 bg-brand-cyan rounded-full"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">{tab === 'transactions' ? 'Transactions' : 'Buy Coins'}</span>
                </button>
              ))}
            </div>
            {activeTab === 'transactions' ? renderTransactions() : renderCoinPacks()}
          </>
        )}
      </div>

      {/* Send Modal (unchanged) */}
      <Modal isOpen={showSendModal} onClose={closeSendModal} title="Send Coins">
        {!sendTarget ? (
          <>
            <p className="text-text-secondary text-sm mb-3">Search for a user to send coins to</p>
            <input
              type="text"
              value={sendSearch}
              onChange={(e) => handleSendSearch(e.target.value)}
              placeholder="Search by username..."
              className="w-full bg-surface-2 border border-white/[0.06] rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-cyan focus:outline-none"
              autoFocus
            />
            <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
              {sendResults.map(user => (
                <button key={user.id} onClick={() => setSendTarget(user)}
                  className="flex items-center gap-3 w-full p-3 rounded-xl bg-surface-2 border border-white/[0.06] hover:border-white/[0.12] transition-colors text-left">
                  <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt="" className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <p className="text-sm font-semibold">{user.displayName || user.username}</p>
                    <p className="text-xs text-text-muted">@{user.username}</p>
                  </div>
                </button>
              ))}
              {sendSearch.length >= 2 && sendResults.length === 0 && (
                <p className="text-text-muted text-sm text-center py-4">No users found</p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-2 border border-white/[0.06] mb-4">
              <img src={sendTarget.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sendTarget.username}`} alt="" className="w-10 h-10 rounded-full object-cover" />
              <div className="flex-1">
                <p className="text-sm font-semibold">{sendTarget.displayName || sendTarget.username}</p>
                <p className="text-xs text-text-muted">@{sendTarget.username}</p>
              </div>
              <button onClick={() => setSendTarget(null)} className="text-text-muted">
                <Icon name="close" size={18} />
              </button>
            </div>

            <label className="text-text-secondary text-xs font-bold uppercase mb-2 block">Amount</label>
            <input
              type="number"
              value={sendAmount}
              onChange={(e) => setSendAmount(e.target.value)}
              placeholder="0"
              className="w-full bg-surface-2 border border-white/[0.06] rounded-xl py-3 px-4 text-2xl font-dmmono text-text-primary placeholder:text-text-muted focus:border-brand-cyan focus:outline-none text-center mb-2"
              autoFocus
            />
            <p className="text-text-muted text-xs text-center mb-4">
              Balance: <span className="text-brand-gold font-dmmono">{wallet?.balance || 0}</span> coins
            </p>

            <button
              onClick={handleSend}
              disabled={!sendAmount || parseInt(sendAmount) <= 0 || parseInt(sendAmount) > (wallet?.balance || 0) || sending}
              className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${
                sendAmount && parseInt(sendAmount) > 0 && parseInt(sendAmount) <= (wallet?.balance || 0) && !sending
                  ? 'bg-brand-cyan text-bg-dark'
                  : 'bg-surface-3 text-text-muted'
              }`}>
              {sending ? 'Sending...' : `Send ${sendAmount || 0} Coins`}
            </button>
          </>
        )}
      </Modal>
    </div>
  );
}