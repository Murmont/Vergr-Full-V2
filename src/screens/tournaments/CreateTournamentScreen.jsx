import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import { useUI } from '../../context/UIContext';
import { createTournament, getUserSquads } from '../../firebase/firestore';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';
import TopBar from '../../components/TopBar';
import Icon from '../../components/Icon';

const GAMES = ['Valorant', 'Fortnite', 'Apex Legends', 'League of Legends', 'CS2', 'Overwatch 2', 'Rocket League', 'Call of Duty', 'FIFA', 'Other'];
const TYPES = [
  { id: 'single_elim', label: 'Single Elimination', desc: 'Lose once, you\'re out', icon: 'bolt' },
  { id: 'double_elim', label: 'Double Elimination', desc: 'Two losses to be eliminated', icon: 'replay' },
  { id: 'round_robin', label: 'Round Robin', desc: 'Everyone plays everyone', icon: 'autorenew' },
];
const PLAYER_COUNTS = [4, 8, 16, 32, 64];

export default function CreateTournamentScreen() {
  const [name, setName] = useState('');
  const [game, setGame] = useState('');
  const [customGame, setCustomGame] = useState('');
  const [type, setType] = useState('single_elim');
  const [maxParticipants, setMaxParticipants] = useState(8);
  const [entryFee, setEntryFee] = useState('');
  const [squadId, setSquadId] = useState('');
  const [squads, setSquads] = useState([]);
  const [loading, setLoading] = useState(false);

  const { currentUser } = useAuth();
  const { wallet } = useUser();
  const { showToast } = useUI();
  const navigate = useNavigate();
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  useEffect(() => {
    setRightPanel(null);
    setContentAlign(isDesktop ? 'left' : 'center');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign, isDesktop]);

  // Load user's squads
  useEffect(() => {
    if (!currentUser) return;
    getUserSquads(currentUser.uid).then(setSquads).catch(() => {});
  }, [currentUser]);

  const finalGame = game === 'Other' ? customGame.trim() : game;
  const fee = parseInt(entryFee) || 0;
  const estimatedPrize = fee * maxParticipants;
  const canSubmit = name.trim().length >= 3 && finalGame && squadId;

  const handleCreate = async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    try {
      const tournamentId = await createTournament(currentUser.uid, squadId, {
        name: name.trim(),
        game: finalGame,
        entryFee: fee,
        maxParticipants,
        type,
      });
      showToast('Tournament created!', 'success');
      navigate(`/match/${tournamentId}`);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to create tournament', 'error');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen pb-24 lg:pb-8">
      <TopBar showBack title="Create Tournament" />

      <div className={`px-4 py-5 ${isDesktop ? 'max-w-2xl' : ''}`}>
        <div className="space-y-6">
          {/* Name */}
          <div>
            <label className="text-text-secondary text-[10px] uppercase tracking-widest font-bold mb-2.5 block">Tournament Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Friday Night Valorant Cup"
              className="w-full bg-surface-2 border border-white/[0.06] rounded-xl p-3.5 text-text-primary text-sm placeholder:text-text-muted focus:border-brand-cyan focus:outline-none" maxLength={60} />
          </div>

          {/* Squad */}
          <div>
            <label className="text-text-secondary text-[10px] uppercase tracking-widest font-bold mb-2.5 block">Host Squad *</label>
            {squads.length === 0 ? (
              <div className="p-4 rounded-xl bg-surface-1 border border-white/[0.06] text-center">
                <p className="text-text-muted text-sm mb-2">You need to be in a squad to host a tournament</p>
                <button onClick={() => navigate('/squads')} className="text-brand-cyan text-sm font-bold">Browse Squads</button>
              </div>
            ) : (
              <div className="space-y-2">
                {squads.map(s => (
                  <button key={s.id} onClick={() => setSquadId(s.id)}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 ${
                      squadId === s.id ? 'border-brand-cyan bg-brand-cyan/5' : 'border-white/[0.06] bg-surface-1 hover:border-white/10'
                    }`}>
                    <div className="w-10 h-10 rounded-xl bg-surface-2 border border-white/[0.06] flex items-center justify-center text-text-muted">
                      <Icon name="shield" size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-text-primary text-sm font-bold">{s.name}</p>
                      <p className="text-text-muted text-[10px]">{s.memberCount || 0} members</p>
                    </div>
                    {squadId === s.id && <Icon name="check_circle" size={20} className="text-brand-cyan" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Game */}
          <div>
            <label className="text-text-secondary text-[10px] uppercase tracking-widest font-bold mb-2.5 block">Game *</label>
            <div className="flex flex-wrap gap-2">
              {GAMES.map(g => (
                <button key={g} onClick={() => setGame(g)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    game === g ? 'bg-brand-cyan/15 border border-brand-cyan/40 text-brand-cyan' : 'bg-surface-2 border border-white/[0.06] text-text-muted hover:text-text-secondary'
                  }`}>{g}</button>
              ))}
            </div>
            {game === 'Other' && (
              <input type="text" value={customGame} onChange={e => setCustomGame(e.target.value)}
                placeholder="Enter game name..." className="mt-3 w-full bg-surface-2 border border-white/[0.06] rounded-xl p-3.5 text-text-primary text-sm placeholder:text-text-muted focus:border-brand-cyan focus:outline-none" />
            )}
          </div>

          {/* Tournament type */}
          <div>
            <label className="text-text-secondary text-[10px] uppercase tracking-widest font-bold mb-2.5 block">Format</label>
            <div className="space-y-2">
              {TYPES.map(t => (
                <button key={t.id} onClick={() => setType(t.id)}
                  className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 ${
                    type === t.id ? 'border-brand-violet bg-brand-violet/5' : 'border-white/[0.06] bg-surface-1 hover:border-white/10'
                  }`}>
                  <Icon name={t.icon} size={20} className={type === t.id ? 'text-brand-violet' : 'text-text-muted'} />
                  <div className="flex-1">
                    <p className="text-text-primary text-sm font-bold">{t.label}</p>
                    <p className="text-text-muted text-[10px]">{t.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Max players */}
          <div>
            <label className="text-text-secondary text-[10px] uppercase tracking-widest font-bold mb-2.5 block">Max Players</label>
            <div className="flex gap-2">
              {PLAYER_COUNTS.map(n => (
                <button key={n} onClick={() => setMaxParticipants(n)}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                    maxParticipants === n ? 'bg-brand-gold/15 border border-brand-gold/40 text-brand-gold' : 'bg-surface-2 border border-white/[0.06] text-text-muted'
                  }`}>{n}</button>
              ))}
            </div>
          </div>

          {/* Entry fee */}
          <div>
            <label className="text-text-secondary text-[10px] uppercase tracking-widest font-bold mb-2.5 block">Entry Fee (coins) — 0 for free</label>
            <input type="number" min="0" value={entryFee} onChange={e => setEntryFee(e.target.value)}
              placeholder="0"
              className="w-full bg-surface-2 border border-white/[0.06] rounded-xl p-3.5 text-text-primary text-sm placeholder:text-text-muted focus:border-brand-cyan focus:outline-none font-dmmono" />
            {fee > 0 && (
              <div className="mt-3 p-3 rounded-xl bg-brand-gold/5 border border-brand-gold/20">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Estimated prize pool</span>
                  <span className="text-brand-gold font-dmmono font-bold">{estimatedPrize.toLocaleString()} coins</span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-text-muted">({fee} × {maxParticipants} players)</span>
                  <span className="text-text-muted">≈ €{(estimatedPrize * 0.01).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <button onClick={handleCreate} disabled={!canSubmit || loading}
            className="w-full py-4 rounded-2xl bg-brand-cyan text-bg-dark font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all  disabled:opacity-30">
            {loading ? 'Creating...' : 'Create Tournament'}
          </button>
        </div>
      </div>
    </div>
  );
}
