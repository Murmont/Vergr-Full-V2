import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { collection, query, limit, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getLiveStreams, getSquads, getFeedPosts } from '../../firebase/firestore';
import Icon from '../../components/Icon';
import UserAvatar from '../../components/UserAvatar';
import PostCard from '../../components/PostCard';
import RightSidebarPanel from '../../components/RightSidebarPanel';
import { useLayout } from '../../context/LayoutContext';
import { timeAgo } from '../../utils/helpers';
import { trackEvent } from '../../utils/trackEvent';

const CATEGORIES = ['All', 'Creators', 'Squads', 'Streams', 'Clips', 'News'];

export default function ExploreScreen() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  // Debounced search tracking — only log after the user stops typing for 900ms
  useEffect(() => {
    if (!search || search.trim().length < 2) return;
    const t = setTimeout(() => trackEvent('search', { query: search.trim().slice(0, 80) }), 900);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (activeCategory && activeCategory !== 'All') {
      trackEvent('tag_click', { target: activeCategory, source: 'explore_category' });
    }
  }, [activeCategory]);
  const [posts, setPosts] = useState([]);
  const [creators, setCreators] = useState([]);
  const [squads, setSquads] = useState([]);
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { setRightPanel, setContentAlign } = useLayout();

  useEffect(() => {
    setRightPanel(<RightSidebarPanel />);
    setContentAlign('left');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign]);

  // Load posts — one-shot via getFeedPosts which uses the shared author cache.
  // Was a real-time onSnapshot + N+1 author getDoc per post = ~60 reads per
  // Explore open. Now ~20 reads on first visit, 0 on cached repeat visits.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const posts = await getFeedPosts(30) || [];
        if (!cancelled) setPosts(posts);
      } catch {}
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // Load category data
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (activeCategory === 'Creators') {
          const q = query(collection(db, 'users'), where('role', '==', 'creator'), limit(20));
          const snap = await getDocs(q);
          setCreators(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } else if (activeCategory === 'Squads') {
          setSquads(await getSquads(20));
        } else if (activeCategory === 'Streams') {
          setStreams(await getLiveStreams(20));
        }
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    if (['Creators', 'Squads', 'Streams'].includes(activeCategory)) load();
    else setLoading(false);
  }, [activeCategory]);

  // Filter posts by category and search
  const getFilteredPosts = () => {
    let filtered = posts;

    // Filter by type
    if (activeCategory === 'Clips') {
      filtered = filtered.filter(p => p.type === 'clip' || p.type === 'video');
    } else if (activeCategory === 'News') {
      filtered = filtered.filter(p => p.type === 'article' || p.type === 'news');
    }
    // "All" shows everything

    // Search filter
    if (search.trim()) {
      const s = search.toLowerCase();
      filtered = filtered.filter(p =>
        p.content?.toLowerCase().includes(s) ||
        p.author?.displayName?.toLowerCase().includes(s) ||
        p.author?.username?.toLowerCase().includes(s) ||
        p.hashtags?.some(t => t.toLowerCase().includes(s))
      );
    }

    return filtered;
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center py-20">
          <div className="w-7 h-7 border-2 border-surface-3 border-t-brand-cyan rounded-full animate-spin mb-4" />
          <p className="text-text-muted text-xs font-dmmono">Loading</p>
        </div>
      );
    }

    // Creators
    if (activeCategory === 'Creators') {
      return creators.length > 0 ? (
        <div className="space-y-2">
          {creators.map(user => (
            <button key={user.id} onClick={() => navigate(`/user/${user.id}`)}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/[0.06] bg-surface-1 hover:bg-surface-2/50 transition-colors text-left group">
              <UserAvatar src={user.avatar} size={48} isVerified={user.isVerified} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-text-primary truncate">{user.displayName}</span>
                  {user.isVerified && <span className="w-4 h-4 rounded-full bg-brand-cyan flex items-center justify-center shrink-0"><Icon name="check" size={10} className="text-bg-dark" /></span>}
                </div>
                <p className="text-brand-cyan text-xs font-dmmono">@{user.username}</p>
                {user.bio && <p className="text-text-muted text-xs mt-1 line-clamp-1">{user.bio}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold font-dmmono">{(user.followerCount || 0).toLocaleString()}</p>
                <p className="text-[9px] text-text-muted uppercase font-bold tracking-wider">Fans</p>
              </div>
            </button>
          ))}
        </div>
      ) : <EmptyState icon="person_search" text="No creators found yet" />;
    }

    // Squads
    if (activeCategory === 'Squads') {
      return squads.length > 0 ? (
        <div className="space-y-2">
          {squads.map(squad => (
            <button key={squad.id} onClick={() => navigate(`/squads/${squad.id}`)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border border-white/[0.06] bg-surface-1 hover:border-white/[0.12] transition-all text-left group">
              <div className="w-12 h-12 rounded-2xl bg-surface-3 flex items-center justify-center text-xl overflow-hidden border border-white/[0.04]">
                {squad.image ? <img src={squad.image} className="w-full h-full object-cover" alt="" /> : squad.icon || '🎮'}
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-bold text-text-primary truncate block">{squad.name}</span>
                <p className="text-text-muted text-[11px] font-dmmono">{squad.game} · {squad.memberCount || 0} members</p>
              </div>
              <Icon name="chevron_right" size={20} className="text-text-muted" />
            </button>
          ))}
        </div>
      ) : <EmptyState icon="groups" text="No public squads yet" />;
    }

    // Streams
    if (activeCategory === 'Streams') {
      return streams.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {streams.map(stream => (
            <button key={stream.id} onClick={() => navigate(`/stream/${stream.id}`)}
              className="rounded-2xl border border-white/[0.06] bg-surface-1 overflow-hidden hover:border-white/[0.12] transition-all text-left">
              <div className="relative h-32 bg-surface-3">
                {stream.thumbnail && <img src={stream.thumbnail} alt="" className="w-full h-full object-cover" />}
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-brand-ember rounded text-[10px] font-bold text-white uppercase flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
                </div>
                <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 rounded text-[10px] font-bold text-white flex items-center gap-1">
                  <Icon name="visibility" size={12} /> {stream.viewerCount || 0}
                </div>
              </div>
              <div className="p-3 flex items-center gap-3">
                <UserAvatar src={stream.streamer?.avatar} size={32} isLive />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text-primary truncate">{stream.title}</p>
                  <p className="text-xs text-text-muted truncate">{stream.streamer?.displayName} · {stream.game}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : <EmptyState icon="live_tv" text="No one is streaming right now" />;
    }

    // All / Clips / News — show proper post cards
    const filtered = getFilteredPosts();

    if (filtered.length === 0) {
      const emptyText = activeCategory === 'Clips' ? 'No clips yet' : activeCategory === 'News' ? 'No articles yet' : 'Nothing to explore yet';
      return <EmptyState icon="explore" text={emptyText} />;
    }

    return (
      <div className="space-y-0">
        {filtered.map(post => <PostCard key={post.id} post={post} onDeleted={(id) => setPosts(prev => prev.filter(p => p.id !== id))} />)}
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-20 lg:pb-0 bg-bg-dark">
      <div className="sticky top-0 z-40 glass-header px-4 pt-3 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <label className="block relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
            <Icon name="search" size={20} />
          </div>
          <input type="text" placeholder="Search gamers, squads, streams..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-surface-2/60 border border-white/[0.06] rounded-full py-2.5 pl-10 pr-4 text-text-primary text-sm focus:border-brand-cyan/40 transition-colors outline-none placeholder:text-text-muted" />
        </label>
        <div className="flex gap-2 mt-2.5 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`relative px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                activeCategory === cat ? 'text-bg-dark' : 'text-text-muted hover:text-text-secondary'
              }`}>
              {activeCategory === cat && (
                <motion.div
                  layoutId="exploreCategoryPill"
                  className="absolute inset-0 bg-brand-cyan rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              {activeCategory !== cat && (
                <div className="absolute inset-0 bg-surface-2/60 rounded-full" />
              )}
              <span className="relative z-10">{cat}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-0 lg:px-0">
        {renderContent()}
      </div>
    </div>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div className="text-center py-20 px-10">
      <Icon name={icon} size={48} className="mx-auto text-surface-3 mb-4" />
      <p className="text-text-secondary text-sm">{text}</p>
    </div>
  );
}
