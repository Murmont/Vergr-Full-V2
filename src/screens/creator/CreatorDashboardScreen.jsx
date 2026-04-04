import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import { getUserPosts, getTransactions } from '../../firebase/firestore';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';
import TopBar from '../../components/TopBar';
import CoinDisplay from '../../components/CoinDisplay';
import Icon from '../../components/Icon';

export default function CreatorDashboardScreen() {
  const [period, setPeriod] = useState('7d');
  const [posts, setPosts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const { currentUser } = useAuth();
  const { profile, wallet } = useUser();
  const navigate = useNavigate();
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  useEffect(() => {
    setRightPanel(null);
    setContentAlign('left');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign]);

  useEffect(() => {
    if (!currentUser) return;
    const load = async () => {
      setLoading(true);
      try {
        const [userPosts, txs] = await Promise.all([
          getUserPosts(currentUser.uid, 20),
          getTransactions(currentUser.uid, 50),
        ]);
        setPosts(userPosts);
        setTransactions(txs);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    load();
  }, [currentUser]);

  const totalEarned = wallet?.totalEarned || 0;
  const followerCount = profile?.followerCount || 0;
  const totalViews = posts.reduce((sum, p) => sum + (p.viewCount || 0), 0);
  const totalLikes = posts.reduce((sum, p) => sum + (p.likeCount || 0), 0);
  const engagement = posts.length > 0 ? ((totalLikes / Math.max(totalViews, 1)) * 100).toFixed(1) : '0.0';

  const now = Date.now();
  const periodMs = period === '7d' ? 7 * 86400000 : period === '30d' ? 30 * 86400000 : period === '90d' ? 90 * 86400000 : Infinity;
  const recentEarnings = transactions
    .filter(tx => {
      if (tx.amount <= 0) return false;
      const txTime = tx.createdAt?.toDate ? tx.createdAt.toDate().getTime() : 0;
      return now - txTime <= periodMs;
    })
    .reduce((sum, tx) => sum + tx.amount, 0);

  const formatNum = (n) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };

  const stats = [
    { label: 'Total Earnings', value: formatNum(totalEarned), icon: 'paid', color: 'text-brand-gold', bg: 'bg-brand-gold/10', prefix: '●' },
    { label: 'Followers', value: formatNum(followerCount), icon: 'group', color: 'text-brand-cyan', bg: 'bg-brand-cyan/10' },
    { label: 'Total Views', value: formatNum(totalViews), icon: 'visibility', color: 'text-brand-violet', bg: 'bg-brand-violet/10' },
    { label: 'Engagement', value: `${engagement}%`, icon: 'trending_up', color: 'text-brand-pink', bg: 'bg-brand-pink/10' },
  ];

  const topPosts = [...posts].sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0)).slice(0, 5);

  if (isDesktop) {
    return (
      <div className="pb-8">
        <TopBar title="Creator Dashboard" showBack actions={
          <button onClick={() => navigate('/settings')} className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center">
            <Icon name="settings" size={20} />
          </button>
        } />

        {/* Profile banner + quick actions */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-5 mb-6">
            <img src={profile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username}`} alt="" className="w-20 h-20 rounded-full border-2 border-brand-cyan object-cover" />
            <div className="flex-1">
              <h2 className="font-syne text-2xl font-bold">{profile?.displayName || 'Creator'}</h2>
              <span className="inline-block px-2 py-0.5 rounded-full bg-brand-violet/15 border border-brand-violet/30 text-brand-violet text-[10px] font-bold uppercase mt-1">Creator</span>
            </div>
            <CoinDisplay amount={wallet?.balance || 0} size="sm" />
          </div>

          {/* Quick actions — row */}
          <div className="grid grid-cols-5 gap-3 mb-6">
            {[
              { label: 'Go Live', icon: 'radio_button_checked', route: '/go-live', color: 'brand-ember' },
              { label: 'New Post', icon: 'add', route: '/create', color: 'brand-cyan' },
              { label: 'Wallet', icon: 'account_balance_wallet', route: '/wallet', color: 'brand-gold' },
              { label: 'Manage Tiers', icon: 'auto_awesome', route: '/creator/membership', color: 'brand-violet' },
              { label: 'Analytics', icon: 'analytics', route: '/creator/analytics', color: 'brand-pink' },
            ].map(a => (
              <button key={a.label} onClick={() => navigate(a.route)}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-${a.color}/10 border border-${a.color}/30 text-${a.color} hover:bg-${a.color}/20 transition-colors`}>
                <Icon name={a.icon} filled size={16} /><span className="font-bold text-sm">{a.label}</span>
              </button>
            ))}
          </div>

          {/* Period selector */}
          <div className="flex gap-2 mb-5">
            {['7d', '30d', '90d', 'All'].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  period === p ? 'bg-brand-cyan text-bg-dark' : 'bg-surface-2 text-text-muted hover:text-text-secondary'
                }`}>
                {p}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-surface-3 border-t-brand-cyan rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Stats row — 4 equal columns */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                {stats.map(stat => (
                  <div key={stat.label} className="p-5 rounded-2xl bg-surface-1 border border-white/[0.06]">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[11px] text-text-muted uppercase tracking-wider">{stat.label}</p>
                      <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center`}>
                        <Icon name={stat.icon} filled size={20} className={stat.color} />
                      </div>
                    </div>
                    <p className={`font-dmmono text-2xl font-bold ${stat.color}`}>
                      {stat.prefix || ''}{stat.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Two columns: Earnings card + Top posts */}
              <div className="grid grid-cols-5 gap-6">
                <div className="col-span-2">
                  <div className="p-6 rounded-2xl bg-surface-1 border border-white/[0.06] h-full">
                    <p className="text-text-muted text-xs uppercase tracking-wider mb-2">Earned this period</p>
                    <CoinDisplay amount={recentEarnings} size="lg" clickable={false} />
                    <div className="mt-6 pt-4 border-t border-white/[0.04]">
                      <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Lifetime earnings</p>
                      <p className="font-dmmono text-lg text-brand-gold font-bold">{formatNum(totalEarned)}</p>
                    </div>
                  </div>
                </div>
                <div className="col-span-3">
                  <h3 className="font-syne font-bold text-lg mb-3">Top Performing Posts</h3>
                  {topPosts.length === 0 ? (
                    <div className="text-center py-12 rounded-2xl bg-surface-1 border border-white/[0.06]">
                      <p className="text-text-muted text-sm">Create your first post to see performance stats</p>
                      <button onClick={() => navigate('/create')} className="mt-3 px-5 py-2 rounded-full bg-brand-cyan/10 text-brand-cyan text-sm font-bold">
                        Create Post
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {topPosts.map((post, i) => (
                        <button key={post.id} onClick={() => navigate(`/post/${post.id}`)}
                          className="flex items-center gap-3 p-4 rounded-2xl border border-white/[0.06] bg-surface-1 w-full text-left hover:border-white/[0.12] transition-colors">
                          <span className="font-dmmono text-text-muted text-sm w-8 text-center">#{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-text-primary truncate">{post.content}</p>
                            <div className="flex items-center gap-4 mt-1.5">
                              <span className="text-xs text-text-muted flex items-center gap-1"><Icon name="visibility" size={14} /> {formatNum(post.viewCount || 0)}</span>
                              <span className="text-xs text-text-muted flex items-center gap-1"><Icon name="favorite" size={14} /> {formatNum(post.likeCount || 0)}</span>
                              <span className="text-xs text-text-muted flex items-center gap-1"><Icon name="chat_bubble" size={14} /> {post.commentCount || 0}</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  /* ════════ MOBILE (unchanged) ════════ */
  return (
    <div className="screen-container min-h-screen pb-8">
      <TopBar title="Creator Dashboard" showBack actions={
        <button onClick={() => navigate('/settings')} className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center">
          <Icon name="settings" size={20} />
        </button>
      } />

      <div className="px-4 py-4 flex items-center gap-4">
        <img src={profile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username}`} alt="" className="w-16 h-16 rounded-full border-2 border-brand-cyan object-cover" />
        <div className="flex-1">
          <h2 className="font-syne text-xl font-bold">{profile?.displayName || 'Creator'}</h2>
          <span className="inline-block px-2 py-0.5 rounded-full bg-brand-violet/15 border border-brand-violet/30 text-brand-violet text-[10px] font-bold uppercase">Creator</span>
        </div>
        <CoinDisplay amount={wallet?.balance || 0} size="sm" />
      </div>

      <div className="px-4 overflow-x-auto no-scrollbar">
        <div className="flex gap-3 w-max pb-1">
          <button onClick={() => navigate('/go-live')} className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-brand-ember/10 border border-brand-ember/30 text-brand-ember whitespace-nowrap">
            <Icon name="radio_button_checked" filled size={16} /><span className="font-bold text-sm">Go Live</span>
          </button>
          <button onClick={() => navigate('/create')} className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan whitespace-nowrap">
            <Icon name="add" size={16} /><span className="font-bold text-sm">New Post</span>
          </button>
          <button onClick={() => navigate('/wallet')} className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-brand-gold/10 border border-brand-gold/30 text-brand-gold whitespace-nowrap">
            <Icon name="account_balance_wallet" size={16} /><span className="font-bold text-sm">Wallet</span>
          </button>
          <button onClick={() => navigate('/creator/membership')} className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-brand-violet/10 border border-brand-violet/30 text-brand-violet whitespace-nowrap">
            <Icon name="auto_awesome" size={16} /><span className="font-bold text-sm">Manage Tiers</span>
          </button>
          <button onClick={() => navigate('/creator/analytics')} className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-brand-pink/10 border border-brand-pink/30 text-brand-pink whitespace-nowrap">
            <Icon name="analytics" size={16} /><span className="font-bold text-sm">Analytics</span>
          </button>
        </div>
      </div>

      <div className="flex gap-2 px-4 mt-6 mb-4">
        {['7d', '30d', '90d', 'All'].map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              period === p ? 'bg-brand-cyan text-bg-dark' : 'bg-surface-2 text-text-muted'
            }`}>
            {p}
          </button>
        ))}
      </div>

      <div className="mx-4 p-4 rounded-2xl bg-surface-1 border border-white/[0.06] mb-4">
        <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Earned this period</p>
        <CoinDisplay amount={recentEarnings} size="lg" clickable={false} />
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-surface-3 border-t-brand-cyan rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="px-4 grid grid-cols-2 gap-3">
            {stats.map(stat => (
              <div key={stat.label} className="p-4 rounded-2xl bg-surface-1 border border-white/[0.06]">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] text-text-muted uppercase tracking-wider">{stat.label}</p>
                  <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <Icon name={stat.icon} filled size={18} className={stat.color} />
                  </div>
                </div>
                <p className={`font-dmmono text-xl font-bold ${stat.color}`}>
                  {stat.prefix || ''}{stat.value}
                </p>
              </div>
            ))}
          </div>

          <div className="px-4 mt-6">
            <h3 className="font-syne font-bold text-lg mb-3">Top Performing Posts</h3>
            {topPosts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-text-muted text-sm">Create your first post to see performance stats</p>
                <button onClick={() => navigate('/create')} className="mt-3 px-5 py-2 rounded-full bg-brand-cyan/10 text-brand-cyan text-sm font-bold">
                  Create Post
                </button>
              </div>
            ) : (
              topPosts.map((post, i) => (
                <button key={post.id} onClick={() => navigate(`/post/${post.id}`)}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-white/[0.06] bg-surface-1 mb-2 w-full text-left">
                  <span className="font-dmmono text-text-muted text-sm w-6 text-center">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">{post.content}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-text-muted flex items-center gap-1"><Icon name="visibility" size={12} /> {formatNum(post.viewCount || 0)}</span>
                      <span className="text-xs text-text-muted flex items-center gap-1"><Icon name="favorite" size={12} /> {formatNum(post.likeCount || 0)}</span>
                      <span className="text-xs text-text-muted flex items-center gap-1"><Icon name="chat_bubble" size={12} /> {post.commentCount || 0}</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
