import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getSquadLeaderboard, getSquadWallet, getSquadTransactions } from '../../firebase/firestore';
import TopBar from '../../components/TopBar';
import UserAvatar from '../../components/UserAvatar';
import Icon from '../../components/Icon';
import useResponsive from '../../hooks/useResponsive';

export default function SquadLeaderboardScreen() {
  const { squadId } = useParams();
  const { currentUser } = useAuth();
  const { isMobile } = useResponsive();
  const navigate = useNavigate();

  const [members, setMembers] = useState([]);
  const [wallet, setWallet] = useState({ balance: 0 });
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!squadId) return;
    const load = async () => {
      setLoading(true);
      try {
        const [lb, w, txs] = await Promise.all([
          getSquadLeaderboard(squadId),
          getSquadWallet(squadId),
          getSquadTransactions(squadId, 30),
        ]);
        setMembers(lb);
        setWallet(w);
        setTransactions(txs);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    load();
  }, [squadId]);

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const goToChat = () => navigate(`/squads/${squadId}/chat`);

  return (
    <div className="pb-8">
      {/* Back button header */}
      {isMobile ? (
        <div className="sticky top-0 z-40 glass-header flex items-center gap-3 px-4 py-3 border-b border-white/[0.04]">
          <button onClick={goToChat} className="text-white/80 hover:text-white transition-colors">
            <Icon name="arrow_back" size={24} />
          </button>
          <h1 className="text-white font-syne font-bold text-lg">Squad Economy</h1>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 lg:px-6 pt-4 pr-12 lg:pr-16">
          <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white transition-colors">
            <Icon name="arrow_back" size={24} />
          </button>
          <h1 className="text-white font-syne font-bold text-lg">Squad Economy</h1>
          <div className="w-6" />
        </div>
      )}

      {/* Wallet card */}
      <div className="mx-4 mt-2 p-5 rounded-2xl bg-surface-1 border border-white/[0.06] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Squad Wallet</p>
          <p className="font-dmmono text-2xl font-bold text-brand-gold">{(wallet.balance || 0).toLocaleString()}</p>
          <div className="flex gap-4 mt-3">
            <div>
              <p className="text-[10px] text-text-muted uppercase">Total Raised</p>
              <p className="text-xs font-dmmono text-brand-cyan">{(wallet.totalContributed || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted uppercase">Tournament Wins</p>
              <p className="text-xs font-dmmono text-green-500">{(wallet.totalWon || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 mt-4">
        <button onClick={() => setActiveTab('leaderboard')}
          className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all ${activeTab === 'leaderboard' ? 'bg-brand-cyan text-bg-dark' : 'bg-surface-2 text-text-secondary'}`}>
          Contributors
        </button>
        <button onClick={() => setActiveTab('history')}
          className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all ${activeTab === 'history' ? 'bg-brand-cyan text-bg-dark' : 'bg-surface-2 text-text-secondary'}`}>
          History
        </button>
      </div>

      {/* Content */}
      <div className="mt-4 px-4 overflow-y-auto max-h-[calc(100vh-300px)]">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-surface-3 border-t-brand-cyan rounded-full animate-spin" />
          </div>
        ) : activeTab === 'leaderboard' ? (
          <div className="space-y-2">
            {members.filter(m => (m.totalContributed || 0) > 0).map((member, i) => {
              const isMe = member.id === currentUser?.uid;
              const medals = ['🥇', '🥈', '🥉'];
              return (
                <div key={member.id} className={`flex items-center gap-3 p-3 rounded-2xl border ${isMe ? 'border-brand-cyan bg-brand-cyan/5' : 'border-white/[0.06] bg-surface-1'}`}>
                  <span className="w-8 text-center font-dmmono text-sm">
                    {i < 3 ? medals[i] : `#${i + 1}`}
                  </span>
                  <div className="shrink-0">
                    <UserAvatar src={member.user?.avatar} size={32} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-semibold truncate">{member.user?.displayName || member.user?.username}</p>
                      {isMe && <span className="text-[9px] text-brand-cyan font-bold">(You)</span>}
                    </div>
                    <p className="text-[10px] text-text-muted">@{member.user?.username}</p>
                  </div>
                  <span className="font-dmmono font-bold text-sm text-brand-gold shrink-0">{(member.totalContributed || 0).toLocaleString()}</span>
                </div>
              );
            })}
            {members.filter(m => (m.totalContributed || 0) > 0).length === 0 && (
              <div className="text-center py-12">
                <Icon name="leaderboard" size={48} className="text-text-muted/30 mx-auto mb-3" />
                <p className="text-text-muted text-sm">No contributions yet</p>
                <p className="text-text-muted/60 text-xs mt-1">Be the first to contribute to the squad wallet</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 p-3 rounded-2xl bg-surface-1 border border-white/[0.06]">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tx.type === 'contribution' ? 'bg-green-500/10' : 'bg-brand-ember/10'}`}>
                  <Icon name={tx.type === 'contribution' ? 'arrow_downward' : 'arrow_upward'} size={16}
                    className={tx.type === 'contribution' ? 'text-green-500' : 'text-brand-ember'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{tx.type === 'contribution' ? 'Member contribution' : tx.type}</p>
                  <p className="text-[10px] text-text-muted font-dmmono">{formatDate(tx.createdAt)}</p>
                </div>
                <span className={`font-dmmono font-bold text-sm shrink-0 ${tx.amount > 0 ? 'text-green-500' : 'text-brand-ember'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount} ●
                </span>
              </div>
            ))}
            {transactions.length === 0 && (
              <div className="text-center py-12">
                <Icon name="receipt_long" size={48} className="text-text-muted/30 mx-auto mb-3" />
                <p className="text-text-muted text-sm">No transactions yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}