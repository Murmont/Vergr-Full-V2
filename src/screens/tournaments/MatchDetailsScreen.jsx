import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import { useUI } from '../../context/UIContext';
import { getTournament, joinTournament, leaveTournament, getTournamentMatches, getUser } from '../../firebase/firestore';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';
import TopBar from '../../components/TopBar';
import UserAvatar from '../../components/UserAvatar';
import Icon from '../../components/Icon';
import { SingleElimBracket, DoubleElimBracket, RoundRobinSchedule, SwissRoundsList } from '../../components/tournaments/BracketVisualization';
import { RoundRobinStandings, SwissStandings } from '../../components/tournaments/StandingsTable';
import BRScoreboard from '../../components/tournaments/BRScoreboard';
import {
  getBracketType,
  computePrizeBreakdown,
  computeBRStandings,
  computeRoundRobinStandings,
  computeSwissStandings,
} from '../../utils/tournamentTypes';

export default function MatchDetailsScreen() {
  const { matchId } = useParams();
  const { currentUser } = useAuth();
  const { wallet } = useUser();
  const { showToast } = useUI();
  const navigate = useNavigate();
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    setRightPanel(null);
    setContentAlign(isDesktop ? 'left' : 'center');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign, isDesktop]);

  useEffect(() => {
    if (!matchId) return;
    const load = async () => {
      setLoading(true);
      try {
        const t = await getTournament(matchId);
        setTournament(t);
        if (t?.status === 'active' || t?.status === 'completed') {
          const m = await getTournamentMatches(matchId);
          setMatches(m);
        }
        if (t?.participants?.length > 0) {
          const users = await Promise.all(t.participants.map(uid => getUser(uid)));
          setParticipants(users.filter(Boolean));
        }
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    load();
  }, [matchId]);

  const isRegistered = tournament?.participants?.includes(currentUser?.uid);
  const isFull = (tournament?.participants?.length || 0) >= (tournament?.maxParticipants || Infinity);
  const isAdmin = tournament?.adminId === currentUser?.uid;

  const handleJoin = async () => {
    if (joining) return;
    setJoining(true);
    try {
      await joinTournament(matchId, currentUser.uid);
      showToast('Registered!', 'success');
      // Refresh
      const t = await getTournament(matchId);
      setTournament(t);
      const users = await Promise.all((t?.participants || []).map(uid => getUser(uid)));
      setParticipants(users.filter(Boolean));
    } catch (err) {
      showToast(err.message || 'Failed to join', 'error');
    }
    setJoining(false);
  };

  const handleLeave = async () => {
    try {
      await leaveTournament(matchId, currentUser.uid);
      showToast('Left tournament', 'info');
      const t = await getTournament(matchId);
      setTournament(t);
      const users = await Promise.all((t?.participants || []).map(uid => getUser(uid)));
      setParticipants(users.filter(Boolean));
    } catch (err) {
      showToast(err.message || 'Failed to leave', 'error');
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'open': return { bg: 'bg-green-500/15', text: 'text-green-400', label: 'Open' };
      case 'active': return { bg: 'bg-brand-ember/15', text: 'text-brand-ember', label: 'LIVE' };
      case 'completed': return { bg: 'bg-surface-3', text: 'text-text-muted', label: 'Completed' };
      default: return { bg: 'bg-surface-3', text: 'text-text-muted', label: status };
    }
  };

  if (loading) return <div className="min-h-screen"><TopBar showBack title="Tournament" /><div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-brand-cyan border-t-transparent rounded-full animate-spin" /></div></div>;
  if (!tournament) return <div className="min-h-screen"><TopBar showBack title="Tournament" /><div className="text-center py-20"><p className="text-text-muted">Tournament not found</p></div></div>;

  const status = getStatusStyle(tournament.status);

  return (
    <div className="min-h-screen pb-24 lg:pb-8">
      <TopBar showBack title={tournament.name} />

      <div className="px-4 py-4">
        {/* Hero card */}
        <div className="relative p-5 rounded-2xl bg-gradient-to-br from-surface-1 to-surface-2 border border-white/[0.06] overflow-hidden mb-4">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/5 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${status.bg} ${status.text}`}>{status.label}</span>
              <span className="text-text-muted text-xs">{tournament.game}</span>
            </div>
            <h1 className="font-syne text-2xl font-extrabold text-white mb-1">{tournament.name}</h1>
            <p className="text-text-muted text-sm">{tournament.type || 'Single Elimination'} · {tournament.maxParticipants} players max</p>

            <div className="grid grid-cols-3 gap-3 mt-5">
              <div className="p-3 rounded-xl bg-bg-dark/50 border border-white/[0.06] text-center">
                <Icon name="emoji_events" size={20} className="text-brand-gold mx-auto mb-1" />
                <p className="text-brand-gold font-dmmono font-bold text-lg">{(tournament.prizePool || 0).toLocaleString()}</p>
                <p className="text-text-muted text-[9px] uppercase">Prize Pool</p>
              </div>
              <div className="p-3 rounded-xl bg-bg-dark/50 border border-white/[0.06] text-center">
                <Icon name="confirmation_number" size={20} className="text-brand-cyan mx-auto mb-1" />
                <p className="text-brand-cyan font-dmmono font-bold text-lg">{tournament.entryFee || 'Free'}</p>
                <p className="text-text-muted text-[9px] uppercase">Entry Fee</p>
              </div>
              <div className="p-3 rounded-xl bg-bg-dark/50 border border-white/[0.06] text-center">
                <Icon name="group" size={20} className="text-brand-violet mx-auto mb-1" />
                <p className="text-brand-violet font-dmmono font-bold text-lg">{tournament.participants?.length || 0}/{tournament.maxParticipants}</p>
                <p className="text-text-muted text-[9px] uppercase">Players</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action button */}
        {isAdmin && tournament.status !== 'completed' && (
          <button onClick={() => navigate(`/match/${matchId}/control`)}
            className="w-full mb-3 py-3 rounded-xl bg-brand-gold/10 border border-brand-gold/25 text-brand-gold font-bold text-sm flex items-center justify-center gap-2 hover:bg-brand-gold/20 transition-colors">
            <Icon name="admin_panel_settings" size={18} />
            Admin Control Panel
          </button>
        )}
        {tournament.status === 'open' && (
          <div className="mb-4">
            {isRegistered ? (
              <div className="flex gap-2">
                <div className="flex-1 py-3 rounded-xl bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan text-center text-sm font-bold flex items-center justify-center gap-2">
                  <Icon name="check_circle" size={18} /> Registered
                </div>
                <button onClick={handleLeave} className="px-4 py-3 rounded-xl bg-surface-2 border border-white/[0.06] text-text-muted text-sm font-bold hover:text-brand-ember hover:border-brand-ember/30 transition-colors">
                  Leave
                </button>
              </div>
            ) : isFull ? (
              <div className="py-3 rounded-xl bg-surface-2 border border-white/[0.06] text-text-muted text-center text-sm font-bold">Tournament Full</div>
            ) : (
              <button onClick={handleJoin} disabled={joining}
                className="w-full py-3.5 rounded-xl bg-brand-cyan text-bg-dark font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all  disabled:opacity-50">
                {joining ? 'Joining...' : tournament.entryFee > 0 ? `Join — ${tournament.entryFee} coins` : 'Join Tournament'}
              </button>
            )}
            {tournament.entryFee > 0 && !isRegistered && (
              <p className="text-text-muted text-[10px] text-center mt-2">
                Your balance: <span className="text-brand-gold font-dmmono">{wallet?.balance || 0} coins</span>
                {(wallet?.balance || 0) < tournament.entryFee && <span className="text-brand-ember ml-1">— insufficient</span>}
              </p>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-surface-1 rounded-xl p-1 border border-white/[0.06]">
          {['overview', 'participants', ...(matches.length > 0 ? ['bracket'] : [])].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                activeTab === tab ? 'bg-surface-3 text-white' : 'text-text-muted hover:text-text-secondary'
              }`}>{tab}</button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && (
          <div className="space-y-3">
            <button onClick={() => navigate('/tournaments/standings', { state: { tournamentId: matchId } })}
              className="w-full p-4 rounded-2xl bg-surface-1 border border-white/[0.06] flex items-center gap-3 hover:border-white/[0.12] transition-colors">
              <Icon name="leaderboard" size={20} className="text-brand-gold" />
              <span className="flex-1 text-sm font-semibold text-left">Standings</span>
              <Icon name="chevron_right" size={18} className="text-text-muted" />
            </button>
            <button onClick={() => navigate('/tournaments/prizes', { state: { prizePool: tournament.prizePool } })}
              className="w-full p-4 rounded-2xl bg-surface-1 border border-white/[0.06] flex items-center gap-3 hover:border-white/[0.12] transition-colors">
              <Icon name="emoji_events" size={20} className="text-brand-gold" />
              <span className="flex-1 text-sm font-semibold text-left">Prize Distribution</span>
              <Icon name="chevron_right" size={18} className="text-text-muted" />
            </button>
            <div className="p-4 rounded-2xl bg-surface-1 border border-white/[0.06]">
              <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold mb-2">Prize Split</p>
              <div className="space-y-1.5 text-sm">
                {(() => {
                  const cfg = getBracketType(tournament.type) || getBracketType('single_elim');
                  const pb = computePrizeBreakdown(tournament.prizePool || 0, cfg.id, { squadTreasury: cfg.mode === 'squad' });
                  if (!pb.payouts.length) {
                    return <p className="text-text-muted text-xs">Custom prize split set by creator</p>;
                  }
                  return pb.payouts.map(p => (
                    <div key={p.place} className="flex justify-between">
                      <span className="text-text-secondary">{p.label} ({p.pct}%)</span>
                      <span className="text-text-primary font-dmmono">{p.player.toLocaleString()}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'participants' && (
          <div className="space-y-2">
            {participants.length === 0 ? (
              <p className="text-text-muted text-sm text-center py-8">No participants yet</p>
            ) : (
              participants.map((user, i) => (
                <button key={user.id} onClick={() => navigate(`/user/${user.id}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface-1 border border-white/[0.06] hover:border-white/[0.12] transition-colors">
                  <span className="text-text-muted text-xs font-dmmono w-6 text-center">{i + 1}</span>
                  <UserAvatar src={user.avatar} size={36} />
                  <div className="flex-1 text-left">
                    <p className="text-text-primary text-sm font-semibold">{user.displayName}</p>
                    <p className="text-text-muted text-xs font-dmmono">@{user.username}</p>
                  </div>
                  {user.id === tournament.adminId && (
                    <span className="px-2 py-0.5 rounded-full bg-brand-gold/15 text-brand-gold text-[9px] font-bold uppercase">Admin</span>
                  )}
                </button>
              ))
            )}
          </div>
        )}

        {activeTab === 'bracket' && (
          <div className="space-y-4">
            {/* Type-aware bracket visualization if rounds data exists */}
            {tournament.bracketData?.rounds && tournament.type === 'single_elim' && (
              <SingleElimBracket rounds={tournament.bracketData.rounds} />
            )}
            {tournament.bracketData?.winners && tournament.type === 'double_elim' && (
              <DoubleElimBracket
                winners={tournament.bracketData.winners}
                losers={tournament.bracketData.losers}
                grandFinal={tournament.bracketData.grandFinal}
              />
            )}
            {tournament.bracketData?.rounds && tournament.type === 'squad_round_robin' && (
              <>
                <RoundRobinStandings
                  standings={computeRoundRobinStandings(tournament.bracketData.rounds.flat())}
                  teamLookup={tournament.bracketData.teamLookup || {}}
                />
                <RoundRobinSchedule rounds={tournament.bracketData.rounds} />
              </>
            )}
            {tournament.bracketData?.rounds && tournament.type === 'swiss' && (
              <>
                <SwissStandings
                  standings={computeSwissStandings(
                    tournament.participants?.map(uid => ({ playerId: uid, name: participants.find(p => p.id === uid)?.displayName || uid })) || [],
                    tournament.bracketData.rounds.flat()
                  )}
                />
                <SwissRoundsList rounds={tournament.bracketData.rounds} />
              </>
            )}
            {tournament.type === 'battle_royale' && (
              <BRScoreboard
                standings={computeBRStandings(tournament.brResults || [])}
                gameCount={tournament.brGameCount || 3}
                playerLookup={Object.fromEntries(participants.map(p => [p.id, p]))}
              />
            )}

            {/* Fallback: legacy per-match list */}
            {!tournament.bracketData && matches.length === 0 && (
              <p className="text-text-muted text-sm text-center py-8">Bracket not generated yet</p>
            )}
            {!tournament.bracketData && matches.length > 0 && matches.map(match => (
                <div key={match.id} className="p-4 rounded-2xl bg-surface-1 border border-white/[0.06]">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-text-muted text-[10px] uppercase font-bold tracking-widest">Round {match.round} · Match {match.matchNumber}</span>
                    <span className={`ml-auto px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                      match.status === 'completed' ? 'bg-brand-cyan/15 text-brand-cyan' : 'bg-brand-gold/15 text-brand-gold'
                    }`}>{match.status}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`flex-1 flex items-center gap-2 p-2 rounded-xl ${match.winner === match.player1 ? 'bg-brand-cyan/10 border border-brand-cyan/30' : 'bg-surface-2'}`}>
                      <UserAvatar src={match.player1Data?.avatar} size={28} />
                      <span className="text-sm font-semibold truncate">{match.player1Data?.displayName || 'TBD'}</span>
                      {match.winner === match.player1 && <Icon name="check_circle" size={16} className="text-brand-cyan ml-auto shrink-0" />}
                    </div>
                    <span className="text-text-muted text-xs font-bold">VS</span>
                    <div className={`flex-1 flex items-center gap-2 p-2 rounded-xl ${match.winner === match.player2 ? 'bg-brand-cyan/10 border border-brand-cyan/30' : 'bg-surface-2'}`}>
                      <UserAvatar src={match.player2Data?.avatar} size={28} />
                      <span className="text-sm font-semibold truncate">{match.player2Data?.displayName || 'BYE'}</span>
                      {match.winner === match.player2 && <Icon name="check_circle" size={16} className="text-brand-cyan ml-auto shrink-0" />}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
