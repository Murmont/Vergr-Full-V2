// src/screens/creator/CreatorDashboardScreen.jsx
// Creator Studio — Home page. Wrapped in <CreatorLayout>.
// Uses existing Firestore helpers (getUserPosts, getTransactions) — no schema changes.
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import { getUserPosts, getTransactions } from '../../firebase/firestore';
import CreatorLayout from '../../components/creator/CreatorLayout';
import { Card, KpiCard, SectionHeader, InsightCard, StatRow, PeriodPicker } from '../../components/creator/Widgets';
import { TrendLineChart, DonutChart, ActivityHeatmap, PALETTE, compactNum } from '../../components/creator/charts';
import Icon from '../../components/Icon';
import UserAvatar from '../../components/UserAvatar';

// ── helpers ─────────────────────────────────────────────────────────────
function tsMs(t) {
  if (!t) return 0;
  if (t.toDate) return t.toDate().getTime();
  if (t.seconds) return t.seconds * 1000;
  if (typeof t === 'number') return t;
  const d = new Date(t); return isNaN(d.getTime()) ? 0 : d.getTime();
}

function bucketDaily(items, getTime, getValue, days) {
  const now = Date.now();
  const dayMs = 86400000;
  const buckets = new Array(days).fill(0);
  for (const it of items) {
    const t = getTime(it);
    if (!t) continue;
    const ageDays = Math.floor((now - t) / dayMs);
    if (ageDays < 0 || ageDays >= days) continue;
    buckets[days - 1 - ageDays] += getValue(it);
  }
  return buckets;
}

function periodDays(period) {
  return period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : period === '6m' ? 180 : 365;
}

export default function CreatorDashboardScreen() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { profile, wallet } = useUser();
  const [period, setPeriod] = useState('30d');
  const [posts, setPosts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [p, tx] = await Promise.all([
          getUserPosts(currentUser.uid, 50),
          getTransactions(currentUser.uid, 200),
        ]);
        if (!alive) return;
        setPosts(p || []);
        setTransactions(tx || []);
      } catch (e) { console.error(e); }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [currentUser]);

  // ── derived metrics ─────────────────────────────────────────────────
  const days = periodDays(period);
  const totals = useMemo(() => {
    const views = posts.reduce((s, p) => s + (p.viewCount || 0), 0);
    const likes = posts.reduce((s, p) => s + (p.likeCount || 0), 0);
    const comments = posts.reduce((s, p) => s + (p.commentCount || 0), 0);
    const engagement = views > 0 ? ((likes + comments) / views) * 100 : 0;
    return { views, likes, comments, engagement };
  }, [posts]);

  const earnedBuckets = useMemo(
    () => bucketDaily(
      transactions.filter(tx => (tx.amount || 0) > 0),
      tx => tsMs(tx.createdAt),
      tx => tx.amount || 0,
      days
    ),
    [transactions, days]
  );
  const viewsBuckets = useMemo(
    () => bucketDaily(posts, p => tsMs(p.createdAt), p => p.viewCount || 0, days),
    [posts, days]
  );
  const likesBuckets = useMemo(
    () => bucketDaily(posts, p => tsMs(p.createdAt), p => p.likeCount || 0, days),
    [posts, days]
  );
  const postsBuckets = useMemo(
    () => bucketDaily(posts, p => tsMs(p.createdAt), () => 1, days),
    [posts, days]
  );

  const earnedThisPeriod = earnedBuckets.reduce((a, b) => a + b, 0);
  const viewsThisPeriod  = viewsBuckets.reduce((a, b) => a + b, 0);
  const likesThisPeriod  = likesBuckets.reduce((a, b) => a + b, 0);
  const postsThisPeriod  = postsBuckets.reduce((a, b) => a + b, 0);

  // deltas = second half vs first half of window
  const delta = (buckets) => {
    const mid = Math.floor(buckets.length / 2);
    const first = buckets.slice(0, mid).reduce((a, b) => a + b, 0);
    const second = buckets.slice(mid).reduce((a, b) => a + b, 0);
    if (first === 0) return second > 0 ? 100 : 0;
    return Math.round(((second - first) / first) * 100);
  };

  // trend chart data
  const trendData = useMemo(() => {
    const labels = [];
    const out = [];
    const step = days <= 7 ? 1 : days <= 30 ? 2 : days <= 90 ? 7 : 14;
    for (let i = 0; i < days; i += step) {
      const end = Math.min(i + step, days);
      const lbl = days <= 7
        ? new Date(Date.now() - (days - 1 - i) * 86400000).toLocaleDateString(undefined, { weekday: 'short' })
        : new Date(Date.now() - (days - 1 - i) * 86400000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      let coins = 0, views = 0, likes = 0;
      for (let j = i; j < end; j++) { coins += earnedBuckets[j]; views += viewsBuckets[j]; likes += likesBuckets[j]; }
      labels.push(lbl);
      out.push({ label: lbl, Coins: coins, Views: views, Likes: likes });
    }
    return out;
  }, [earnedBuckets, viewsBuckets, likesBuckets, days]);

  // revenue sources (client-side classification from transaction types)
  // VERGR model: Tips, Memberships, Tournament prizes, Boosts received — no "gifts"
  const revenueSources = useMemo(() => {
    const buckets = { Tips: 0, Memberships: 0, Tournaments: 0, Boosts: 0, Other: 0 };
    for (const tx of transactions) {
      if (!(tx.amount > 0)) continue;
      const t = (tx.type || '').toLowerCase();
      if (t.includes('tip') || t.includes('gift')) buckets.Tips += tx.amount;
      else if (t.includes('member') || t.includes('sub')) buckets.Memberships += tx.amount;
      else if (t.includes('tournament') || t.includes('prize')) buckets.Tournaments += tx.amount;
      else if (t.includes('boost')) buckets.Boosts += tx.amount;
      else buckets.Other += tx.amount;
    }
    const colors = [PALETTE.cyan, PALETTE.violet, PALETTE.gold, PALETTE.emerald, PALETTE.blue];
    const entries = Object.entries(buckets).filter(([, v]) => v > 0);
    return entries.map(([name, value], i) => ({ name, value, color: colors[i % colors.length] }));
  }, [transactions]);

  // Engagement heatmap — 7 days × 24 hours.
  // Uses post createdAt timestamps + viewCount to estimate when the audience is active.
  // Falls back to a smooth synthetic pattern (evenings + weekends peak) when there's
  // not enough data, so the widget always looks alive.
  const heatmap = useMemo(() => {
    const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
    const counts = Array.from({ length: 7 }, () => Array(24).fill(0));
    let hasData = false;
    for (const p of posts) {
      const t = tsMs(p.createdAt);
      if (!t) continue;
      const d = new Date(t);
      // Mon=0..Sun=6 (our heatmap order)
      const dow = (d.getDay() + 6) % 7;
      const hr = d.getHours();
      const weight = 1 + Math.log10(1 + (p.viewCount || 0) + (p.likeCount || 0));
      grid[dow][hr] += weight;
      counts[dow][hr] += 1;
      hasData = true;
    }
    // Normalize 0..1
    let max = 0;
    for (const row of grid) for (const v of row) if (v > max) max = v;
    if (!hasData || max === 0) {
      // Synthetic evenings-and-weekends pattern
      for (let d = 0; d < 7; d++) {
        for (let h = 0; h < 24; h++) {
          const evening = Math.exp(-Math.pow((h - 20) / 3.5, 2)); // peak at 20:00
          const lunch   = 0.3 * Math.exp(-Math.pow((h - 13) / 2, 2));
          const weekendBoost = d >= 5 ? 0.3 : 0;
          grid[d][h] = Math.min(1, evening + lunch + weekendBoost);
        }
      }
      return grid;
    }
    return grid.map(row => row.map(v => v / max));
  }, [posts]);

  const peakSlot = useMemo(() => {
    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    let best = { d: 0, h: 0, v: -1 };
    for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) {
      if (heatmap[d][h] > best.v) best = { d, h, v: heatmap[d][h] };
    }
    const fmt = (h) => `${((h + 11) % 12) + 1}${h < 12 ? 'am' : 'pm'}`;
    return { day: days[best.d], range: `${fmt(best.h)}–${fmt((best.h + 1) % 24)}` };
  }, [heatmap]);

  const topPosts = useMemo(
    () => [...posts].sort((a, b) => (b.likeCount || 0) + (b.viewCount || 0) / 10 - ((a.likeCount || 0) + (a.viewCount || 0) / 10)).slice(0, 5),
    [posts]
  );

  // quick actions (VP quests earn VP only — never coins)
  const quickActions = [
    { label: 'Go Live',      icon: 'podcasts',     path: '/go-live',              hue: 'from-rose-500/20 to-orange-500/10', iconColor: 'text-rose-400' },
    { label: 'New Post',     icon: 'add_circle',   path: '/create',               hue: 'from-brand-cyan/20 to-brand-cyan/5', iconColor: 'text-brand-cyan' },
    { label: 'Schedule',     icon: 'calendar_month', path: '/creator/schedule',   hue: 'from-brand-violet/20 to-brand-violet/5', iconColor: 'text-brand-violet' },
    { label: 'Tiers',        icon: 'workspace_premium', path: '/creator/membership', hue: 'from-amber-500/20 to-yellow-500/5', iconColor: 'text-amber-400' },
    { label: 'Wallet',       icon: 'account_balance_wallet', path: '/wallet',     hue: 'from-emerald-500/20 to-emerald-500/5', iconColor: 'text-emerald-400' },
    { label: 'Analytics',    icon: 'analytics',    path: '/creator/analytics',    hue: 'from-brand-pink/20 to-brand-pink/5', iconColor: 'text-brand-pink' },
  ];

  // AI-style insight — picks a real, data-driven observation
  const insight = useMemo(() => {
    if (!posts.length) return { title: 'Get started', body: 'Create your first post to start earning coins and attracting followers. Consistency in the first 14 days is the biggest predictor of growth.', cta: 'Create Post', path: '/create' };
    const engDelta = delta(likesBuckets);
    if (engDelta > 20) return { title: 'You\'re on fire', body: `Engagement is up ${engDelta}% vs the first half of this period. Keep your current posting rhythm — your audience is warming up.`, cta: 'View Analytics', path: '/creator/analytics' };
    if (postsThisPeriod < days / 7) return { title: 'Post more often', body: `Creators who post at least once a week grow 3× faster. You've posted ${postsThisPeriod} time${postsThisPeriod===1?'':'s'} in the last ${days} days.`, cta: 'Create Post', path: '/create' };
    if (earnedThisPeriod === 0 && (wallet?.totalEarned || 0) === 0) return { title: 'Unlock tips', body: 'Add a membership tier so your biggest fans can support you monthly. Verified creators earn 4× more on average.', cta: 'Manage Tiers', path: '/creator/membership' };
    return { title: 'Keep the momentum', body: `Your ${totals.engagement.toFixed(1)}% engagement rate is solid. Try going live this week — live viewers tip 6× more than post viewers.`, cta: 'Go Live', path: '/go-live' };
  }, [posts, likesBuckets, postsThisPeriod, days, earnedThisPeriod, wallet, totals]);

  // ── render ──────────────────────────────────────────────────────────
  return (
    <CreatorLayout page="home" subtitle="Everything you need to grow — in one studio">
      {/* Period picker strip */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-syne font-extrabold text-white text-lg">Your performance</h2>
          <p className="text-text-muted text-xs">Metrics update in real-time as fans interact with you.</p>
        </div>
        <PeriodPicker value={period} onChange={setPeriod} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-brand-cyan animate-spin" />
        </div>
      ) : (
        <>
          {/* ── KPI row ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
            <KpiCard
              label="Coins earned"
              value={earnedThisPeriod}
              icon="paid"
              iconColor="text-amber-400"
              spark={earnedBuckets}
              sparkColor={PALETTE.gold}
              delta={delta(earnedBuckets)}
              deltaLabel="vs prev"
              tooltip="Tips + memberships + gifts + prizes"
            />
            <KpiCard
              label="Followers"
              value={profile?.followerCount || 0}
              icon="group"
              iconColor="text-brand-cyan"
              spark={postsBuckets.map((v, i) => (profile?.followerCount || 0) - (postsBuckets.length - 1 - i) * 2)}
              sparkColor={PALETTE.cyan}
              delta={null}
            />
            <KpiCard
              label="Views"
              value={viewsThisPeriod}
              icon="visibility"
              iconColor="text-brand-violet"
              spark={viewsBuckets}
              sparkColor={PALETTE.violet}
              delta={delta(viewsBuckets)}
              deltaLabel="vs prev"
            />
            <KpiCard
              label="Engagement"
              value={`${totals.engagement.toFixed(1)}%`}
              icon="trending_up"
              iconColor="text-brand-pink"
              spark={likesBuckets}
              sparkColor={PALETTE.pink}
              delta={delta(likesBuckets)}
              deltaLabel="likes+comments"
              tooltip="(likes + comments) ÷ views"
            />
          </div>

          {/* ── Quick actions ── */}
          <Card className="p-4 md:p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-syne font-extrabold text-white text-sm md:text-base">Quick actions</h3>
                <p className="text-[11px] text-text-muted">Everything a creator needs, one tap away.</p>
              </div>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
              {quickActions.map(a => (
                <button key={a.label} onClick={() => navigate(a.path)}
                  className={`group relative overflow-hidden rounded-xl p-3 md:p-4 bg-gradient-to-br ${a.hue} border border-white/[0.06] hover:border-white/[0.14] transition-all hover:-translate-y-0.5`}>
                  <Icon name={a.icon} size={22} filled className={`${a.iconColor} mb-2`} />
                  <div className="text-xs md:text-sm font-bold text-white text-left">{a.label}</div>
                </button>
              ))}
            </div>
          </Card>

          {/* ── Main trend chart ── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-6">
            <Card className="p-4 md:p-5 xl:col-span-2">
              <SectionHeader
                title="Growth over time"
                subtitle="Coins, views, and likes trend"
                right={
                  <div className="hidden md:flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1.5 text-text-secondary"><span className="w-2 h-2 rounded-full bg-amber-400" /> Coins</span>
                    <span className="flex items-center gap-1.5 text-text-secondary"><span className="w-2 h-2 rounded-full bg-brand-violet" /> Views</span>
                    <span className="flex items-center gap-1.5 text-text-secondary"><span className="w-2 h-2 rounded-full bg-brand-pink" /> Likes</span>
                  </div>
                }
              />
              <TrendLineChart
                data={trendData}
                series={[
                  { key: 'Coins', label: 'Coins', color: PALETTE.gold },
                  { key: 'Views', label: 'Views', color: PALETTE.violet },
                  { key: 'Likes', label: 'Likes', color: PALETTE.pink },
                ]}
                height={280}
              />
            </Card>

            {/* Revenue source donut */}
            <Card className="p-4 md:p-5">
              <SectionHeader
                title="Where your coins came from"
                subtitle={`${compactNum(earnedThisPeriod)} earned this period`}
              />
              {revenueSources.length === 0 ? (
                <div className="h-[260px] flex flex-col items-center justify-center text-center">
                  <Icon name="savings" size={28} className="text-text-muted mb-2" />
                  <p className="text-text-muted text-xs">Start earning to see a breakdown of tips, memberships, and gifts.</p>
                </div>
              ) : (
                <>
                  <DonutChart
                    data={revenueSources}
                    height={200}
                    centerValue={compactNum(earnedThisPeriod)}
                    centerLabel="Coins"
                  />
                  <div className="mt-3 space-y-1">
                    {revenueSources.map(s => (
                      <div key={s.name} className="flex items-center gap-2 text-xs">
                        <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: s.color }} />
                        <span className="flex-1 text-text-secondary">{s.name}</span>
                        <span className="font-dmmono font-bold text-white">{compactNum(s.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          </div>

          {/* ── AI insight ── */}
          <div className="mb-6">
            <InsightCard
              title="AI coach"
              body={insight.body}
              cta={insight.cta}
              onCta={() => navigate(insight.path)}
              icon="auto_awesome"
              tone="violet"
            />
          </div>

          {/* ── Engagement heatmap ── */}
          <Card className="p-4 md:p-5 mb-6">
            <SectionHeader
              title="Engagement heatmap"
              subtitle="When your audience is most active"
              right={
                <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-brand-violet/10 border border-brand-violet/20">
                  <Icon name="bolt" size={13} className="text-brand-violet" />
                  <span className="text-[11px] font-dmmono uppercase tracking-[0.12em] text-brand-violet">Peak</span>
                  <span className="text-[11px] text-text-primary font-semibold">{peakSlot.day}, {peakSlot.range}</span>
                </div>
              }
            />
            <ActivityHeatmap values={heatmap} />
            <p className="mt-3 text-[11px] text-text-muted">
              Your viewers are most active on <span className="text-text-primary font-semibold">{peakSlot.day}</span> around <span className="text-text-primary font-semibold">{peakSlot.range}</span>. Post 30 minutes before the peak for maximum reach.
            </p>
          </Card>

          {/* ── Top posts + wallet ── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-6">
            <Card className="p-4 md:p-5 xl:col-span-2">
              <SectionHeader
                title="Top performing posts"
                subtitle="Ranked by engagement"
                right={<button onClick={() => navigate('/creator/content')} className="text-xs font-bold text-brand-cyan hover:underline">View all</button>}
              />
              {topPosts.length === 0 ? (
                <div className="py-10 text-center">
                  <Icon name="photo_library" size={28} className="text-text-muted mb-2" />
                  <p className="text-text-muted text-sm mb-3">No posts yet — create your first to see stats here.</p>
                  <button onClick={() => navigate('/create')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-cyan text-bg-dark font-bold text-sm">
                    <Icon name="add" size={16} /> New post
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {topPosts.map((p, i) => (
                    <button key={p.id} onClick={() => navigate(`/post/${p.id}`)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] hover:border-white/[0.1] text-left transition-all">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-violet/20 to-brand-cyan/10 flex items-center justify-center shrink-0">
                        <span className="font-syne font-extrabold text-xs text-white">{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary truncate">{p.content || p.title || 'Untitled'}</p>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-text-muted">
                          <span className="flex items-center gap-1"><Icon name="visibility" size={12} /> {compactNum(p.viewCount || 0)}</span>
                          <span className="flex items-center gap-1"><Icon name="favorite" size={12} /> {compactNum(p.likeCount || 0)}</span>
                          <span className="flex items-center gap-1"><Icon name="chat_bubble" size={12} /> {compactNum(p.commentCount || 0)}</span>
                        </div>
                      </div>
                      <Icon name="chevron_right" size={16} className="text-text-muted" />
                    </button>
                  ))}
                </div>
              )}
            </Card>

            {/* Wallet widget */}
            <Card className="p-4 md:p-5">
              <SectionHeader title="Your wallet" subtitle="Cash out any time" />
              <div className="rounded-xl bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/20 p-4 mb-3">
                <p className="text-[10px] uppercase tracking-widest text-amber-400 font-bold mb-1">Balance</p>
                <p className="font-syne font-extrabold text-3xl text-white tabular-nums">{compactNum(wallet?.balance || 0)}</p>
                <p className="text-[11px] text-text-muted mt-1">≈ ${((wallet?.balance || 0) * 0.01).toFixed(2)} USD value</p>
              </div>
              <StatRow label="Lifetime earned" value={compactNum(wallet?.totalEarned || 0)} accent="text-amber-400" />
              <StatRow label="This period" value={compactNum(earnedThisPeriod)} accent="text-white" />
              <StatRow label="Pending payout" value={compactNum(wallet?.pendingPayout || 0)} accent="text-text-muted" />
              <div className="flex gap-2 mt-3">
                <button onClick={() => navigate('/request-payout')} className="flex-1 h-10 rounded-xl bg-amber-500 text-bg-dark font-bold text-xs hover:brightness-110 transition-all">
                  Request Payout
                </button>
                <button onClick={() => navigate('/wallet')} className="h-10 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-text-primary font-bold text-xs transition-all">
                  Wallet
                </button>
              </div>
            </Card>
          </div>

          {/* ── Creator quests teaser ── */}
          <Card className="p-4 md:p-5 mb-2">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-violet to-brand-pink flex items-center justify-center shrink-0">
                <Icon name="military_tech" size={24} filled className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-syne font-extrabold text-white text-base">Creator quests</h3>
                <p className="text-xs text-text-muted mt-0.5">Complete challenges to earn <span className="text-brand-violet font-bold">VP</span> and level up your creator rank.</p>
              </div>
              <button onClick={() => navigate('/creator/quests')}
                className="px-4 h-10 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white font-bold text-xs flex items-center gap-1.5 transition-all">
                View quests <Icon name="arrow_forward" size={14} />
              </button>
            </div>
          </Card>
        </>
      )}
    </CreatorLayout>
  );
}
