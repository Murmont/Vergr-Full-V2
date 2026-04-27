// Right rail for Home / Feed.
// Five cards: Live Now · Trending · Who To Follow · Upcoming Cups · Active Squads
// Uses real Firestore data where cheap; falls back to placeholders so the
// rail always looks populated.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import Icon from '../Icon';
import UserAvatar from '../UserAvatar';

// ── Placeholders (always render so the rail looks alive) ───────────────
const PLACEHOLDER_LIVE = [
  { id: 'l1', name: 'NovaStrike', game: 'Valorant',  viewers: 2134, thumb: 'from-brand-violet/50 to-brand-pink/30' },
  { id: 'l2', name: 'Zephyr_GG',  game: 'Apex',      viewers: 842,  thumb: 'from-brand-cyan/50 to-brand-violet/30' },
  { id: 'l3', name: 'LumaPlays',  game: 'Fortnite',  viewers: 612,  thumb: 'from-brand-ember/50 to-brand-gold/30' },
];

const PLACEHOLDER_HASHTAGS = [
  { tag: 'ValorantEsports',  posts: 12400 },
  { tag: 'CS2Update',        posts: 8600 },
  { tag: 'ApexRanked',       posts: 7100 },
  { tag: 'FortniteChapter5', posts: 5800 },
  { tag: 'LeagueOfLegends',  posts: 4300 },
  { tag: 'RocketLeague',     posts: 3100 },
];

const PLACEHOLDER_CREATORS = [
  { id: 'c1', name: 'NovaStrike',  handle: '@novastrike',  followers: 32100, verified: true  },
  { id: 'c2', name: 'Zephyr_GG',   handle: '@zephyr',      followers: 18900, verified: true  },
  { id: 'c3', name: 'LumaPlays',   handle: '@luma',        followers: 11200, verified: false },
  { id: 'c4', name: 'Thunder42',   handle: '@thunder',     followers:  9400, verified: false },
];

const PLACEHOLDER_TOURNAMENTS = [
  { id: 't1', name: 'Night Raiders Cup', game: 'Valorant',  pool: 25000, when: 'Tonight 8pm' },
  { id: 't2', name: 'Frag Masters',      game: 'CS2',       pool: 10000, when: 'Sat 9pm' },
  { id: 't3', name: 'Ranked Royale',     game: 'Apex',      pool:  5000, when: 'Sun 6pm' },
];

const PLACEHOLDER_SQUADS = [
  { id: 's1', name: 'Night Raiders', members: 48, tier: 'Competitive' },
  { id: 's2', name: 'Shadow Legion', members: 32, tier: 'Casual' },
  { id: 's3', name: 'Apex Wolves',   members: 24, tier: 'Pro' },
];

function compact(n) {
  if (n >= 1e6) return (n/1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return (n/1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

export default function HomeFeedRail() {
  const navigate = useNavigate();
  const [hashtags, setHashtags] = useState(PLACEHOLDER_HASHTAGS);
  const [creators, setCreators] = useState(PLACEHOLDER_CREATORS);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const q = query(collection(db, 'hashtags'), orderBy('postCount', 'desc'), limit(6));
        const snap = await getDocs(q);
        const rows = snap.docs.map(d => ({ tag: d.id, posts: d.data().postCount || 0 }));
        if (alive && rows.length) setHashtags(rows);
      } catch {}
      try {
        const q = query(collection(db, 'users'), where('isVerified', '==', true), orderBy('followerCount', 'desc'), limit(4));
        const snap = await getDocs(q);
        const rows = snap.docs.map(d => ({
          id: d.id,
          name: d.data().displayName || d.data().username,
          handle: '@' + (d.data().username || ''),
          followers: d.data().followerCount || 0,
          avatar: d.data().avatar,
          verified: d.data().isVerified,
        }));
        if (alive && rows.length) setCreators(rows);
      } catch {}
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="space-y-3 px-3">
      {/* Live Now */}
      <Card>
        <Header
          icon="podcasts" color="text-brand-ember" label="Live Now"
          action={{ label: 'More', onClick: () => navigate('/explore?live=1') }}
        />
        <div className="space-y-2">
          {PLACEHOLDER_LIVE.map(l => (
            <button key={l.id} onClick={() => navigate('/go-live')}
              className="w-full flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-white/[0.04] text-left">
              <div className={`relative w-14 h-10 rounded-md bg-gradient-to-br ${l.thumb} shrink-0 overflow-hidden flex items-center justify-center`}>
                <Icon name="play_arrow" size={16} className="text-white/90" />
                <span className="absolute top-0.5 left-0.5 px-1 py-[1px] rounded-sm bg-brand-ember text-[8px] font-dmmono font-bold text-white uppercase tracking-wider">Live</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-text-primary truncate">{l.name}</div>
                <div className="text-[10px] text-text-muted font-dmmono truncate">{l.game}</div>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-dmmono text-brand-ember shrink-0">
                <Icon name="visibility" size={11} />
                <span className="tabular-nums">{compact(l.viewers)}</span>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Trending hashtags */}
      <Card>
        <Header
          icon="trending_up" color="text-brand-cyan" label="Trending"
          action={{ label: 'See all', onClick: () => navigate('/trending-hashtags') }}
        />
        <div className="space-y-1">
          {hashtags.map((h, i) => (
            <button key={h.tag}
              onClick={() => navigate(`/hashtag/${encodeURIComponent(h.tag)}`)}
              className="w-full flex items-center gap-3 px-1.5 py-1.5 rounded-lg hover:bg-white/[0.04] text-left">
              <span className="text-[10px] font-dmmono text-text-muted w-4 tabular-nums">{i+1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-text-primary font-semibold truncate">#{h.tag}</div>
                <div className="text-[10px] text-text-muted font-dmmono">{compact(h.posts)} posts</div>
              </div>
              <Icon name="arrow_forward_ios" size={10} className="text-text-muted/50" />
            </button>
          ))}
        </div>
      </Card>

      {/* Who to follow */}
      <Card>
        <Header
          icon="group_add" color="text-brand-violet" label="Who To Follow"
          action={{ label: 'Browse', onClick: () => navigate('/browse-creators') }}
        />
        <div className="space-y-2">
          {creators.map(c => (
            <div key={c.id} className="flex items-center gap-2.5">
              <button onClick={() => navigate(`/user/${c.id}`)} className="shrink-0">
                {c.avatar
                  ? <UserAvatar src={c.avatar} size={36} showTierRing={false} isVerified={c.verified} />
                  : <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-violet/40 to-brand-pink/20 flex items-center justify-center">
                      <span className="text-[12px] font-dmmono font-bold text-white/90">{c.name?.[0] || '?'}</span>
                    </div>}
              </button>
              <button onClick={() => navigate(`/user/${c.id}`)}
                className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-1">
                  <span className="text-[12px] font-semibold text-text-primary truncate">{c.name}</span>
                  {c.verified && <Icon name="verified" size={11} className="text-brand-cyan shrink-0" />}
                </div>
                <div className="text-[10px] text-text-muted font-dmmono truncate">
                  {c.handle} · {compact(c.followers)}
                </div>
              </button>
              <button
                onClick={() => navigate(`/user/${c.id}`)}
                className="text-[11px] font-bold px-3 py-1 rounded-full bg-gradient-to-r from-brand-violet to-brand-pink text-white hover:brightness-110 shrink-0">
                Follow
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Upcoming tournaments */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-gold/10 via-transparent to-transparent border border-brand-gold/20 p-3.5">
        <Header
          icon="emoji_events" color="text-brand-gold" label="Upcoming Cups"
          action={{ label: 'All', onClick: () => navigate('/tournaments') }}
        />
        <div className="space-y-2">
          {PLACEHOLDER_TOURNAMENTS.map(t => (
            <button key={t.id} onClick={() => navigate('/tournaments')}
              className="w-full flex items-center gap-2.5 p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] text-left">
              <div className="w-8 h-8 rounded-lg bg-brand-gold/20 flex items-center justify-center shrink-0">
                <Icon name="sports_esports" size={14} className="text-brand-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-text-primary truncate">{t.name}</div>
                <div className="text-[10px] text-text-muted font-dmmono truncate">{t.game} · {t.when}</div>
              </div>
              <span className="text-[10px] font-dmmono font-bold text-brand-gold tabular-nums shrink-0">{compact(t.pool)}c</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => navigate('/create-tournament')}
          className="w-full mt-3 py-1.5 rounded-lg bg-gradient-to-r from-brand-gold/30 to-brand-ember/20 hover:brightness-110 text-brand-gold text-[11px] font-bold">
          Host a cup
        </button>
      </div>

      {/* Active Squads */}
      <Card>
        <Header
          icon="shield" color="text-brand-cyan" label="Active Squads"
          action={{ label: 'Find', onClick: () => navigate('/squads') }}
        />
        <div className="space-y-2">
          {PLACEHOLDER_SQUADS.map(s => (
            <button key={s.id} onClick={() => navigate('/squads')}
              className="w-full flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-white/[0.04] text-left">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-violet/40 to-brand-pink/20 flex items-center justify-center shrink-0">
                <span className="text-[12px] font-syne font-extrabold text-white/90">{s.name[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-text-primary truncate">{s.name}</div>
                <div className="text-[10px] text-text-muted font-dmmono truncate">{s.members} members · {s.tier}</div>
              </div>
              <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
            </button>
          ))}
        </div>
      </Card>

      {/* Brand footer */}
      <div className="text-center pt-1 pb-3">
        <p className="text-[10px] text-text-muted font-dmmono leading-relaxed">
          Talk · Team Up · Belong<br/>
          <span className="text-text-muted/70">VERGR © 2026</span>
        </p>
      </div>
    </div>
  );
}

// ── Shared mini-components ─────────────────────────────────────────────
function Card({ children }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3.5">
      {children}
    </div>
  );
}

function Header({ icon, color, label, action }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon name={icon} size={15} className={color} />
        <div className="text-[10px] font-dmmono uppercase tracking-[0.14em] text-text-muted">{label}</div>
      </div>
      {action && (
        <button onClick={action.onClick}
          className="text-[10px] font-dmmono text-brand-cyan hover:underline">
          {action.label}
        </button>
      )}
    </div>
  );
}
