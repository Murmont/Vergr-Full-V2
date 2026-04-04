import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUser } from '../../context/UserContext';
import { getTournaments } from '../../firebase/firestore';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';
import TopBar from '../../components/TopBar';
import CoinDisplay from '../../components/CoinDisplay';
import Icon from '../../components/Icon';

export default function TournamentScreen() {
  const [filter, setFilter] = useState('all');
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { wallet } = useUser();
  const navigate = useNavigate();
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  useEffect(() => {
    setRightPanel(null);
    setContentAlign('left');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const status = filter === 'all' ? null : filter;
        const data = await getTournaments(status, 20);
        setTournaments(data);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    load();
  }, [filter]);

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open': return { label: 'Open', color: 'bg-green-500' };
      case 'live': case 'active': return { label: 'LIVE', color: 'bg-brand-ember' };
      case 'completed': return { label: 'Completed', color: 'bg-text-muted' };
      default: return { label: status, color: 'bg-surface-3' };
    }
  };

  const TournamentCard = ({ tournament }) => {
    const badge = getStatusBadge(tournament.status);
    return (
      <button onClick={() => navigate(`/match/${tournament.id}`)}
        className="w-full rounded-2xl border border-white/[0.06] bg-surface-1 overflow-hidden text-left hover:border-white/[0.12] transition-all">
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base truncate">{tournament.name}</h3>
              <p className="text-text-muted text-xs mt-0.5">{tournament.game}</p>
            </div>
            <span className={`${badge.color} px-2.5 py-1 rounded-full text-[10px] font-bold text-white uppercase shrink-0 ml-2`}>{badge.label}</span>
          </div>
          <div className="flex items-center gap-4 mt-3">
            <div><p className="text-[10px] text-text-muted uppercase">Prize Pool</p><p className="font-dmmono text-brand-gold font-bold text-sm">{(tournament.prizePool || 0).toLocaleString()}</p></div>
            <div><p className="text-[10px] text-text-muted uppercase">Entry Fee</p><p className="font-dmmono text-brand-cyan font-bold text-sm">{tournament.entryFee || 'Free'}</p></div>
            <div><p className="text-[10px] text-text-muted uppercase">Teams</p><p className="text-sm font-bold">{tournament.participants?.length || 0}/{tournament.maxParticipants || '∞'}</p></div>
          </div>
          {tournament.startDate && <p className="text-text-muted text-xs mt-2 font-dmmono">{formatDate(tournament.startDate)}</p>}
          {tournament.status === 'open' && <div className="mt-3 w-full py-2.5 rounded-xl bg-brand-cyan text-bg-dark font-bold text-sm text-center">Enter Tournament</div>}
          {tournament.status === 'completed' && tournament.winnerId && <p className="text-text-muted text-xs mt-2">Winner: <span className="text-brand-gold font-semibold">{tournament.winnerId}</span></p>}
        </div>
      </button>
    );
  };

  return (
    <div className={isDesktop ? 'pb-8' : 'screen-container min-h-screen pb-8'}>
      <TopBar title="Tournaments" showBack actions={<CoinDisplay amount={wallet?.balance || 0} size="sm" />} />

      {/* Create tournament button */}
      <div className="px-4 pt-3">
        <button onClick={() => navigate('/create-tournament')}
          className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-surface-1 border border-white/[0.06] hover:bg-surface-2/50 transition-colors group">
          <div className="w-9 h-9 rounded-lg bg-brand-cyan/10 flex items-center justify-center shrink-0">
            <Icon name="add" size={20} className="text-brand-cyan" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-text-primary font-semibold text-sm">Create Tournament</p>
            <p className="text-text-muted text-[10px]">Host a competition for your squad</p>
          </div>
          <Icon name="arrow_forward" size={16} className="text-text-muted group-hover:text-text-secondary transition-colors" />
        </button>
      </div>

      <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
        {[
          { key: 'all', label: 'All' },
          { key: 'open', label: 'Open' },
          { key: 'active', label: '🔴 Live' },
          { key: 'completed', label: 'Completed' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`relative px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              filter === f.key ? 'text-bg-dark' : 'text-text-muted'
            }`}>
            {filter === f.key && (
              <motion.div
                layoutId="tournamentFilterPill"
                className="absolute inset-0 bg-brand-cyan rounded-full"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            {filter !== f.key && <div className="absolute inset-0 bg-surface-2 rounded-full" />}
            <span className="relative z-10">{f.label}</span>
          </button>
        ))}
      </div>
      <div className="px-4">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-surface-3 border-t-brand-cyan rounded-full animate-spin" /></div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-16">
            <Icon name="emoji_events" size={48} className="text-text-muted/30 mx-auto mb-3" />
            <p className="text-text-muted text-sm font-medium">No tournaments {filter !== 'all' ? `with status "${filter}"` : 'yet'}</p>
            <p className="text-text-muted/60 text-xs mt-1">Tournaments are created by squad presidents for squad vs squad competition</p>
          </div>
        ) : (
          <div className={isDesktop ? 'grid grid-cols-2 gap-4' : 'space-y-3'}>
            {tournaments.map(t => <TournamentCard key={t.id} tournament={t} />)}
          </div>
        )}
      </div>
    </div>
  );
}
