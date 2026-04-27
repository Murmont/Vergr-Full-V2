// Find Your Squad — redesigned per the provided mock.
// Keeps all existing wiring (live Firestore subscription + routes) but
// swaps presentation to match the new 3-column design.
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import Icon from '../../components/Icon';
import { CoinIcon } from '../../components/CoinIcon';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';
import AppHeader from '../../components/brand/AppHeader';
import AppRightRail from '../../components/brand/AppRightRail';
import { SectionCard } from '../../components/brand/SectionCard';

const GAME_CHIPS = ['All Games', 'Valorant', 'Apex Legends', 'Call of Duty', 'Fortnite', 'Rocket League'];

// Dummy fallback list — shown when the user has no real squad matches yet
// so the design isn't empty. Real results replace these once they load.
const PLACEHOLDER_SQUADS = [
  { id: 'p1', name: 'Night Raiders',   game: 'Valorant',      tier: 'Competitive', members: 4, capacity: 5, lookingFor: 1, status: 'open',  avatarSeed: 'night' },
  { id: 'p2', name: 'Apex Predators',  game: 'Apex Legends',  tier: 'Casual',       members: 3, capacity: 3, lookingFor: 0, status: 'request', avatarSeed: 'apex' },
  { id: 'p3', name: 'Onyx Battalion',  game: 'Call of Duty',  tier: 'Competitive', members: 5, capacity: 6, lookingFor: 1, status: 'open',  avatarSeed: 'onyx' },
];

const PLACEHOLDER_MEMBERS = [
  { id: 'm1', name: 'Luna_Tc',   role: 'Owner',  online: true },
  { id: 'm2', name: 'Thunder',   role: 'Admin',  online: true },
  { id: 'm3', name: 'GhostRider', role: 'Mod',   online: false },
  { id: 'm4', name: 'Raze',      role: 'Member', online: true },
  { id: 'm5', name: 'Vixen',     role: 'Member', online: false },
];

const GAMES_DROPDOWNS = [
  { label: 'Any Rank',      options: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Immortal'] },
  { label: 'Any Region',    options: ['NA', 'EU', 'APAC', 'SA', 'MENA'] },
  { label: 'Any Age',       options: ['18+', '21+', 'No preference'] },
  { label: 'Any Playstyle', options: ['Casual', 'Competitive', 'Hybrid'] },
];

function SquadRow({ squad, onClick, selected }) {
  const colorFor = (seed) => {
    const palette = [
      'from-brand-violet/40 to-brand-pink/20',
      'from-brand-cyan/40 to-brand-violet/20',
      'from-brand-ember/40 to-brand-gold/20',
    ];
    let h = 0;
    for (const c of seed || '') h = (h * 31 + c.charCodeAt(0)) % palette.length;
    return palette[h];
  };
  const isFull = squad.status === 'request';
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all ${
        selected
          ? 'bg-gradient-to-r from-brand-violet/15 to-transparent border border-brand-violet/40'
          : 'bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.12]'
      }`}
    >
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorFor(squad.avatarSeed || squad.id)} flex items-center justify-center shrink-0`}>
        <span className="font-syne font-extrabold text-lg text-white/90">{squad.name[0]}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-text-primary text-sm truncate">{squad.name}</h4>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-dmmono uppercase tracking-[0.1em] ${
            squad.tier === 'Competitive' ? 'bg-brand-ember/20 text-brand-ember' : 'bg-brand-cyan/20 text-brand-cyan'
          }`}>{squad.tier}</span>
        </div>
        <div className="text-[11px] text-text-muted mt-0.5 truncate">{squad.game}</div>
      </div>
      <div className="hidden md:block text-right shrink-0">
        <div className="text-[10px] font-dmmono uppercase tracking-[0.12em] text-text-muted">Members</div>
        <div className="font-dmmono text-sm font-bold tabular-nums text-text-primary">
          {squad.members}/{squad.capacity}
        </div>
        {squad.lookingFor > 0 && (
          <div className="text-[10px] text-brand-cyan mt-0.5">Looking for {squad.lookingFor}</div>
        )}
      </div>
      <div className={`px-4 py-2 rounded-lg text-xs font-bold shrink-0 ${
        isFull
          ? 'bg-white/[0.04] text-text-muted border border-white/[0.06]'
          : 'bg-gradient-to-r from-brand-violet to-brand-pink text-white shadow-lg shadow-brand-violet/30'
      }`}>
        {isFull ? 'Request Invite' : 'Join Squad'}
      </div>
    </button>
  );
}

export default function SquadsScreen() {
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();
  const navigate = useNavigate();

  const [activeGame, setActiveGame] = useState('All Games');
  const [squads, setSquads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    setRightPanel(null);
    if (isDesktop) setContentAlign('left');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign, isDesktop]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'squads'), where('isPublic', '==', true));
    const unsub = onSnapshot(q, snap => {
      setSquads(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  // Merge Firestore squads with placeholder rows so the screen always has content
  const displaySquads = useMemo(() => {
    const real = squads.map(s => ({
      id: s.id,
      name: s.name || 'Unnamed Squad',
      game: s.game || 'Multi-game',
      tier: s.competitive ? 'Competitive' : 'Casual',
      members: s.memberIds?.length || 0,
      capacity: s.maxMembers || 5,
      lookingFor: Math.max(0, (s.maxMembers || 5) - (s.memberIds?.length || 0)),
      status: (s.memberIds?.length || 0) >= (s.maxMembers || 5) ? 'request' : 'open',
      avatarSeed: s.id,
    }));
    const filtered = activeGame === 'All Games' ? real : real.filter(s => (s.game || '').toLowerCase().includes(activeGame.toLowerCase()));
    return filtered.length > 0 ? filtered : PLACEHOLDER_SQUADS;
  }, [squads, activeGame]);

  const selected = displaySquads.find(s => s.id === selectedId) || displaySquads[0];

  if (!isDesktop) {
    // Mobile: keep simple stacked layout with the hero
    return (
      <div className="min-h-screen pb-20 bg-bg-dark">
        <header className="sticky top-0 z-40 glass-header px-4 py-3 flex items-center justify-between">
          <h1 className="font-syne text-lg font-bold text-text-primary">Find Squad</h1>
          <button onClick={() => navigate('/squads/create')} className="w-9 h-9 rounded-full bg-brand-violet text-white flex items-center justify-center">
            <Icon name="add" size={22} />
          </button>
        </header>
        <div className="p-4 space-y-4">
          <FindSquadHero onCreate={() => navigate('/squads/create')} compact />
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {GAME_CHIPS.map(g => (
              <button key={g} onClick={() => setActiveGame(g)} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                activeGame === g ? 'bg-brand-violet text-white' : 'bg-white/[0.04] text-text-muted'
              }`}>{g}</button>
            ))}
          </div>
          <div className="space-y-2">
            {displaySquads.map(s => <SquadRow key={s.id} squad={s} onClick={() => navigate(`/squads/${s.id}`)} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <div className="flex-1 min-w-0 flex flex-col">
        <AppHeader
          title="Find Your Squad"
          subtitle="Team up. Compete. Win together."
          actions={
            <button
              onClick={() => navigate('/squads/create')}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-brand-violet to-brand-pink text-white text-xs font-semibold hover:brightness-110 shadow-lg shadow-brand-violet/30"
            >
              <Icon name="add" size={16} />
              Create Squad
            </button>
          }
        />

        <div className="flex-1 px-6 py-5 space-y-5">
          {/* Hero banner with the 'find your squad' graphic */}
          <FindSquadHero onCreate={() => navigate('/squads/create')} />

          {/* Game chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {GAME_CHIPS.map(g => (
              <button
                key={g}
                onClick={() => setActiveGame(g)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
                  activeGame === g
                    ? 'bg-gradient-to-r from-brand-violet to-brand-pink text-white shadow-lg shadow-brand-violet/30'
                    : 'bg-white/[0.04] text-text-muted hover:text-text-primary border border-white/[0.06]'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Dropdown filter row */}
          <div className="flex items-center gap-2 flex-wrap">
            {GAMES_DROPDOWNS.map(d => (
              <div key={d.label} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs font-medium text-text-muted hover:bg-white/[0.06] cursor-pointer">
                {d.label}
                <Icon name="expand_more" size={14} />
              </div>
            ))}
            <button className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs font-medium text-text-primary hover:bg-white/[0.06]">
              <Icon name="tune" size={14} /> Filters
            </button>
          </div>

          {/* Recommended squads */}
          <SectionCard title="Recommended Squads" action="See All" onAction={() => navigate('/squads/all')}>
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-5 h-5 border-2 border-surface-3 border-t-brand-cyan rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {displaySquads.slice(0, 6).map(s => (
                  <SquadRow key={s.id} squad={s} selected={selected?.id === s.id} onClick={() => setSelectedId(s.id)} />
                ))}
              </div>
            )}
          </SectionCard>

          {/* Active squads stat strip */}
          <div className="rounded-2xl bg-gradient-to-r from-brand-violet/15 via-brand-pink/10 to-transparent border border-brand-violet/20 p-5">
            <div className="flex items-center gap-6 flex-wrap">
              <div>
                <div className="font-dmmono text-3xl font-extrabold text-text-primary tabular-nums">243</div>
                <div className="text-[11px] font-dmmono uppercase tracking-[0.12em] text-text-muted mt-0.5">Active Squads</div>
              </div>
              <div>
                <div className="font-dmmono text-3xl font-extrabold text-brand-cyan tabular-nums">1,842</div>
                <div className="text-[11px] font-dmmono uppercase tracking-[0.12em] text-text-muted mt-0.5">Players Looking</div>
              </div>
              <div>
                <div className="font-dmmono text-3xl font-extrabold text-brand-gold tabular-nums">32</div>
                <div className="text-[11px] font-dmmono uppercase tracking-[0.12em] text-text-muted mt-0.5">Matches Today</div>
              </div>
              <button
                onClick={() => navigate('/squads/create')}
                className="ml-auto flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-violet to-brand-pink text-white text-sm font-bold hover:brightness-110 shadow-lg shadow-brand-violet/30"
              >
                <Icon name="add" size={16} /> Create Squad
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right rail: squad preview + earnings */}
      <AppRightRail width={320}>
        {selected && <SquadPreviewCard squad={selected} onOpen={() => navigate(`/squads/${selected.id}`)} />}
        <SquadEarningsCard />
      </AppRightRail>
    </div>
  );
}

function FindSquadHero({ onCreate, compact }) {
  const h = compact ? 'h-32' : 'h-52';
  return (
    <div className={`relative w-full ${h} rounded-2xl overflow-hidden border border-white/[0.06] shadow-xl shadow-black/40`}>
      <img src="/brand/graphic-find-squad.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#07080D]/85 via-[#07080D]/40 to-[#07080D]/60" />
      <div className="relative h-full flex items-center justify-between px-6">
        <div>
          <div className="text-[10px] font-dmmono uppercase tracking-[0.22em] text-brand-cyan mb-1.5">Vergr Squads</div>
          <h2 className="font-syne text-2xl md:text-3xl font-extrabold text-text-primary leading-tight">Find Your Squad</h2>
          <p className="text-sm text-text-secondary mt-1">Team up. Compete. <span className="text-brand-cyan">Win together.</span></p>
        </div>
      </div>
    </div>
  );
}

function SquadPreviewCard({ squad, onOpen }) {
  const [tab, setTab] = useState('Overview');
  return (
    <div className="rounded-2xl bg-[#12132099] border border-white/[0.06] overflow-hidden">
      <div className="p-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-violet/40 to-brand-pink/20 flex items-center justify-center">
            <span className="font-syne font-extrabold text-lg text-white/90">{squad.name[0]}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-text-primary truncate">{squad.name}</div>
            <div className="text-[11px] text-text-muted truncate">{squad.game} · {squad.tier}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-4 p-1 rounded-lg bg-white/[0.03] border border-white/[0.05]">
          {['Overview', 'Members', 'Rewards', 'Rules'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
                tab === t ? 'bg-brand-violet/30 text-white' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'Overview' && (
          <div className="mt-4 space-y-3">
            <div className="text-[11px] text-text-secondary leading-relaxed">
              Night Raiders is a Valorant competitive squad targeting Radiant rank this split. Active daily 7pm GMT.
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-2">
                <div className="text-[9px] font-dmmono uppercase text-text-muted">Wins</div>
                <div className="font-dmmono font-bold text-text-primary tabular-nums text-sm">42</div>
              </div>
              <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-2">
                <div className="text-[9px] font-dmmono uppercase text-text-muted">Rank</div>
                <div className="font-dmmono font-bold text-brand-cyan tabular-nums text-sm">#18</div>
              </div>
              <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-2">
                <div className="text-[9px] font-dmmono uppercase text-text-muted">Level</div>
                <div className="font-dmmono font-bold text-brand-violet tabular-nums text-sm">24</div>
              </div>
            </div>
          </div>
        )}

        {tab === 'Members' && (
          <div className="mt-4 space-y-1.5">
            {PLACEHOLDER_MEMBERS.map(m => (
              <div key={m.id} className="flex items-center gap-2.5 p-1.5">
                <div className="relative">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-violet/40 to-brand-pink/20 flex items-center justify-center">
                    <span className="text-[11px] font-dmmono font-bold text-white/90">{m.name[0]}</span>
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-[#121320] ${m.online ? 'bg-green-500' : 'bg-gray-500'}`} />
                </div>
                <span className="flex-1 text-[12px] text-text-primary truncate">{m.name}</span>
                <span className="text-[9px] font-dmmono uppercase tracking-[0.1em] text-text-muted">{m.role}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'Rewards' && (
          <div className="mt-4 space-y-2 text-[12px] text-text-secondary">
            <div className="flex items-center gap-2"><CoinIcon size={14} /> 5% of all tournament winnings</div>
            <div className="flex items-center gap-2"><Icon name="workspace_premium" size={14} className="text-brand-violet" /> VP boost on squad wins</div>
            <div className="flex items-center gap-2"><Icon name="emoji_events" size={14} className="text-brand-cyan" /> Access to squad-only tournaments</div>
          </div>
        )}

        {tab === 'Rules' && (
          <div className="mt-4 space-y-2 text-[12px] text-text-secondary">
            <div className="flex items-start gap-2"><Icon name="check" size={14} className="text-brand-cyan mt-0.5" /> Active at least 3 nights a week</div>
            <div className="flex items-start gap-2"><Icon name="check" size={14} className="text-brand-cyan mt-0.5" /> Voice chat mandatory in matches</div>
            <div className="flex items-start gap-2"><Icon name="check" size={14} className="text-brand-cyan mt-0.5" /> Respectful communication — zero tolerance</div>
          </div>
        )}

        <button
          onClick={onOpen}
          className="mt-4 w-full py-2.5 rounded-lg bg-gradient-to-r from-brand-violet to-brand-pink text-white font-bold text-xs hover:brightness-110 shadow-lg shadow-brand-violet/30"
        >
          Open Squad
        </button>
      </div>
    </div>
  );
}

function SquadEarningsCard() {
  return (
    <div className="rounded-2xl bg-[#12132099] border border-white/[0.06] p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-syne text-sm font-bold uppercase tracking-[0.12em] text-text-primary">Squad Earnings</h3>
        <button className="text-[10px] font-dmmono uppercase tracking-[0.1em] text-brand-cyan hover:text-brand-cyan/80">History</button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3 flex items-center gap-2">
          <img src="/brand/vc-coin.png" alt="VC" className="w-7 h-7" />
          <div>
            <div className="font-dmmono text-base font-bold text-brand-gold tabular-nums">2,450</div>
            <div className="text-[9px] font-dmmono uppercase tracking-[0.12em] text-text-muted">VC Earned</div>
          </div>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3 flex items-center gap-2">
          <img src="/brand/vp-gem.png" alt="VP" className="w-7 h-7" />
          <div>
            <div className="font-dmmono text-base font-bold text-brand-violet tabular-nums">980</div>
            <div className="text-[9px] font-dmmono uppercase tracking-[0.12em] text-text-muted">VP Earned</div>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-dmmono uppercase tracking-[0.12em] text-text-muted">Next Payout</span>
          <span className="font-dmmono text-xs font-bold text-brand-gold">$1.50</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
          <div className="h-full w-3/4 bg-gradient-to-r from-brand-gold to-brand-ember" />
        </div>
      </div>
    </div>
  );
}
