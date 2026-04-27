// src/components/tournaments/BracketVisualization.jsx
// Visualizes single-elim + double-elim brackets, and round-robin schedules.
import Icon from '../Icon';

function MatchCard({ match, compact = false }) {
  const home = match.home;
  const away = match.away;
  const winner = match.winner;
  const placeholder = compact ? '—' : 'TBD';
  const render = side => {
    const p = side === 'home' ? home : away;
    const isWinner = p && winner && (p.playerId === winner || p.id === winner);
    const isLoser = p && winner && !isWinner;
    const label = p?.name || p?.displayName || placeholder;
    return (
      <div className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-md ${
        isWinner ? 'bg-brand-cyan/15 text-brand-cyan' :
        isLoser ? 'text-text-muted line-through opacity-60' :
        p ? 'text-text-primary' : 'text-text-muted italic'
      }`}>
        <span className="text-[11px] font-bold truncate">{label}</span>
        {isWinner && <Icon name="check" size={12} />}
      </div>
    );
  };
  return (
    <div className="bg-surface-1 border border-white/[0.06] rounded-lg p-1 min-w-[140px]">
      {render('home')}
      <div className="h-px bg-white/[0.04] my-0.5" />
      {render('away')}
    </div>
  );
}

export function SingleElimBracket({ rounds = [] }) {
  if (!rounds.length) {
    return <EmptyState label="Bracket will be generated when the tournament starts" />;
  }
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-6 min-w-max py-2">
        {rounds.map((round, rIdx) => (
          <div key={rIdx} className="flex flex-col justify-around gap-3">
            <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold text-center">
              {rIdx === rounds.length - 1 ? 'Final' : rIdx === rounds.length - 2 ? 'Semifinal' : `Round ${rIdx + 1}`}
            </p>
            {round.map(match => (
              <MatchCard key={match.matchId} match={match} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DoubleElimBracket({ winners = [], losers = [], grandFinal = [] }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-text-secondary text-xs font-bold uppercase tracking-wider mb-2">Winners Bracket</p>
        <SingleElimBracket rounds={winners} />
      </div>
      <div>
        <p className="text-text-secondary text-xs font-bold uppercase tracking-wider mb-2">Losers Bracket</p>
        <SingleElimBracket rounds={losers} />
      </div>
      <div>
        <p className="text-text-secondary text-xs font-bold uppercase tracking-wider mb-2">Grand Final</p>
        <div className="flex">
          {grandFinal.map(m => <MatchCard key={m.matchId} match={m} />)}
        </div>
      </div>
    </div>
  );
}

export function RoundRobinSchedule({ rounds = [] }) {
  if (!rounds.length) return <EmptyState label="Schedule will appear once the league begins" />;
  return (
    <div className="space-y-4">
      {rounds.map((round, rIdx) => (
        <div key={rIdx}>
          <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold mb-2">Week {rIdx + 1}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {round.map(m => (
              <div key={m.matchId} className="bg-surface-1 border border-white/[0.06] rounded-lg p-2.5 flex items-center justify-between gap-2">
                <span className="text-text-primary text-xs font-bold truncate">{m.home?.name || 'TBD'}</span>
                <span className="text-text-muted text-[10px]">
                  {m.played ? `${m.homeScore}–${m.awayScore}` : 'vs'}
                </span>
                <span className="text-text-primary text-xs font-bold truncate text-right">{m.away?.name || 'TBD'}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SwissRoundsList({ rounds = [] }) {
  if (!rounds.length) return <EmptyState label="Pairings will appear round by round" />;
  return (
    <div className="space-y-4">
      {rounds.map((round, rIdx) => (
        <div key={rIdx}>
          <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold mb-2">Round {rIdx + 1}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {round.map(m => (
              <div key={m.matchId} className="bg-surface-1 border border-white/[0.06] rounded-lg p-2.5 flex items-center justify-between gap-2">
                <span className="text-text-primary text-xs font-bold truncate">
                  {m.home?.name || m.home?.displayName || 'TBD'}
                </span>
                <span className="text-text-muted text-[10px]">{m.bye ? 'BYE' : m.played ? 'DONE' : 'vs'}</span>
                <span className="text-text-primary text-xs font-bold truncate text-right">
                  {m.away?.name || m.away?.displayName || (m.bye ? '—' : 'TBD')}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="p-8 rounded-xl bg-surface-1 border border-dashed border-white/[0.06] text-center">
      <Icon name="account_tree" size={32} className="text-text-muted mx-auto mb-2" />
      <p className="text-text-muted text-sm">{label}</p>
    </div>
  );
}
