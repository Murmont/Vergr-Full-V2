import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { getTournaments } from '../../firebase/firestore';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';
import Icon from '../../components/Icon';
import AppHeader from '../../components/brand/AppHeader';
import AppRightRail from '../../components/brand/AppRightRail';
import HeroBanner from '../../components/brand/HeroBanner';
import { SectionCard, StatTile } from '../../components/brand/SectionCard';
import TopBar from '../../components/TopBar';
import CoinDisplay from '../../components/CoinDisplay';

// Dummy placeholders for things that aren't wired up yet (live streams,
// user avatars next to tournaments). These help the screen look alive
// before the data hooks land.
const PLACEHOLDER_LIVE = [
  { id: 'l1', name: 'VERGR Invitational', game: 'Valorant', viewers: '2.4k' },
  { id: 'l2', name: 'Warzone Legends', game: 'Warzone', viewers: '1.1k' },
  { id: 'l3', name: 'Apex Masters', game: 'Apex Legends', viewers: '864' },
];
const PLACEHOLDER_UPCOMING = [
  { id: 'u1', name: 'VERGR Valorant Cup', game: 'Valorant', days: 2 },
  { id: 'u2', name: 'Apex Legends Arena', game: 'Apex Legends', days: 5 },
  { id: 'u3', name: 'Fortnite Frenzy', game: 'Fortnite', days: 9 },
];

const HOW_IT_WORKS = [
  { icon: 'search', title: 'Find',    body: 'Browse tournaments by game, format or prize.' },
  { icon: 'groups', title: 'Compete', body: 'Join solo or with your squad. Submit results.' },
  { icon: 'emoji_events', title: 'Win', body: 'Climb the bracket and take home the pot.' },
  { icon: 'paid',   title: 'Earn',    body: 'Prize money splits automatically to your wallet.' },
];

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
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Mobile: keep the simple stacked layout
  if (!isDesktop) {
    return (
      <div className="screen-container min-h-screen pb-8">
        <TopBar title="Tournaments" showBack actions={<CoinDisplay amount={wallet?.balance || 0} size="sm" />} />
        <div className="px-4 pt-3">
          <HeroBanner
            variant="trophy"
            eyebrow="VERGR Championship"
            title="$25,000 Prize Pool"
            cta={{ label: 'View Details', onClick: () => navigate('/tournaments/championship') }}
            height="sm"
          />
        </div>
        <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
          {[{ key: 'all', label: 'All' }, { key: 'open', label: 'Open' }, { key: 'active', label: 'Live' }, { key: 'completed', label: 'Past' }].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap ${filter === f.key ? 'bg-brand-violet text-white' : 'bg-surface-2 text-text-muted'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="px-4 space-y-3">
          {tournaments.map(t => <TournamentRow key={t.id} t={t} onClick={() => navigate(`/match/${t.id}`)} formatDate={formatDate} />)}
          {!loading && tournaments.length === 0 && (
            <div className="text-center py-16">
              <Icon name="emoji_events" size={48} className="text-text-muted/30 mx-auto mb-3" />
              <p className="text-text-muted text-sm">No tournaments yet</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop: 3-column with contextual right rail
  return (
    <div className="flex min-h-screen">
      <div className="flex-1 min-w-0 flex flex-col">
        <AppHeader
          title="Tournaments"
          subtitle="Compete. Win. Earn."
          actions={
            <button
              onClick={() => navigate('/create-tournament')}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan text-xs font-semibold hover:bg-brand-cyan/15"
            >
              <Icon name="add" size={16} />
              Create Tournament
            </button>
          }
        />

        <div className="flex-1 px-6 py-5 space-y-5">
          {/* Hero */}
          <HeroBanner
            variant="trophy"
            eyebrow="VERGR Championship"
            title="$25,000 Prize Pool"
            subtitle="The biggest community tournament of the season. 64 squads, single elimination, winner-takes-most."
            cta={{ label: 'View Details', onClick: () => navigate('/tournaments/championship') }}
            height="md"
          />

          {/* Filter tabs */}
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'All Tournaments' },
              { key: 'open', label: 'Open' },
              { key: 'active', label: 'Live' },
              { key: 'completed', label: 'Past Tournaments' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
                  filter === f.key
                    ? 'bg-gradient-to-r from-brand-violet to-brand-pink text-white shadow-lg shadow-brand-violet/30'
                    : 'bg-white/[0.04] text-text-muted hover:text-text-primary border border-white/[0.06]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Upcoming tournaments list */}
          <SectionCard title="Upcoming Tournaments" action="View All" onAction={() => navigate('/tournaments/all')}>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-surface-3 border-t-brand-cyan rounded-full animate-spin" />
              </div>
            ) : tournaments.length === 0 ? (
              <div className="text-center py-8">
                <Icon name="emoji_events" size={40} className="text-text-muted/30 mx-auto mb-2" />
                <p className="text-text-muted text-sm">No tournaments match this filter</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tournaments.map(t => (
                  <TournamentRow key={t.id} t={t} onClick={() => navigate(`/match/${t.id}`)} formatDate={formatDate} />
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      {/* Right rail */}
      <AppRightRail width={320}>
        <SectionCard title="My Stats" padding="p-4">
          <div className="grid grid-cols-3 gap-2">
            <StatTile icon="emoji_events" iconColor="text-brand-cyan" label="Active" value="12" />
            <StatTile icon="military_tech" iconColor="text-brand-gold" label="Won" value="5" />
            <StatTile icon="paid" iconColor="text-brand-violet" label="Earned" value="$4,250" />
          </div>
        </SectionCard>

        <SectionCard title="Live Tournaments" action="All" onAction={() => navigate('/tournaments/all')} padding="p-3">
          <div className="space-y-2">
            {PLACEHOLDER_LIVE.map(l => (
              <div key={l.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.03] transition-colors cursor-pointer">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-ember/30 to-brand-ember/10 flex items-center justify-center">
                  <span className="text-[9px] font-dmmono font-bold text-brand-ember">LIVE</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-text-primary truncate">{l.name}</div>
                  <div className="text-[11px] text-text-muted">{l.game} · {l.viewers} watching</div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Upcoming" padding="p-3">
          <div className="space-y-2">
            {PLACEHOLDER_UPCOMING.map(u => (
              <div key={u.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.03] transition-colors cursor-pointer">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-violet/30 to-brand-violet/10 flex items-center justify-center">
                  <Icon name="schedule" size={16} className="text-brand-violet" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-text-primary truncate">{u.name}</div>
                  <div className="text-[11px] text-text-muted">{u.game} · in {u.days} days</div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* How It Works with the supplied graphic */}
        <SectionCard title="How It Works" padding="p-4">
          <div className="rounded-xl overflow-hidden bg-black/30 mb-3">
            <img src="/brand/graphic-how-it-works.png" alt="" className="w-full h-24 object-cover opacity-80" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {HOW_IT_WORKS.map((s, i) => (
              <div key={i} className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-2.5">
                <Icon name={s.icon} size={16} className="text-brand-cyan mb-1" />
                <div className="text-[11px] font-bold text-text-primary">{s.title}</div>
                <div className="text-[10px] text-text-muted leading-snug mt-0.5">{s.body}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      </AppRightRail>
    </div>
  );
}

function TournamentRow({ t, onClick, formatDate }) {
  const prize = (t.prizePool || 0).toLocaleString();
  const entry = t.entryFee ? `${t.entryFee}` : 'Free';
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all text-left"
    >
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-violet/30 to-brand-pink/20 flex items-center justify-center shrink-0">
        <Icon name="emoji_events" size={22} className="text-brand-cyan" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-sm text-text-primary truncate">{t.name}</div>
          {(t.status === 'live' || t.status === 'active') && (
            <span className="px-1.5 py-0.5 rounded-full bg-brand-ember text-white text-[9px] font-bold">LIVE</span>
          )}
        </div>
        <div className="text-[11px] text-text-muted">{t.game}{t.startDate && ` · ${formatDate(t.startDate)}`}</div>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <div className="text-right">
          <div className="text-[9px] font-dmmono uppercase tracking-[0.12em] text-text-muted">Prize</div>
          <div className="flex items-center gap-1 justify-end">
            <img src="/brand/vc-coin.png" alt="VC" className="w-4 h-4 object-contain" />
            <span className="font-dmmono text-sm font-bold text-brand-gold tabular-nums">{prize}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] font-dmmono uppercase tracking-[0.12em] text-text-muted">Entry</div>
          <div className="font-dmmono text-sm font-bold text-brand-cyan tabular-nums">{entry}</div>
        </div>
        {t.status === 'open' && (
          <div className="px-4 py-2 rounded-lg bg-gradient-to-r from-brand-violet to-brand-pink text-white text-xs font-bold">
            Register
          </div>
        )}
      </div>
    </button>
  );
}
