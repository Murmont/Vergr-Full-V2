import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUser } from '../../context/UserContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { getFeedPosts, getTrendingPosts, getFollowingFeedPosts } from '../../firebase/firestore';
import PostCard from '../../components/PostCard';
import CoinDisplay from '../../components/CoinDisplay';
import Icon from '../../components/Icon';
import RightSidebarPanel from '../../components/RightSidebarPanel';
import DailyRewardBanner from '../../components/DailyRewardBanner';
import SuggestionsCarousel from '../../components/SuggestionsCarousel';
import AdCard from '../../components/AdCard';
import CreatePostModal from '../../components/CreatePostModal';
import useResponsive from '../../hooks/useResponsive';
import { useLayout } from '../../context/LayoutContext';
import { getKlipyAds } from '../../services/klipyAdService';
import { injectAdsRandomly } from '../../utils/feedInjections';

const FEED_TABS = ['For You', 'Following', 'Gaming News', 'Trending'];

const NEWS_SOURCES = [
  { name: 'IGN', url: 'https://api.rss2json.com/v1/api.json?rss_url=https://feeds.feedburner.com/ign/all', icon: '🎮' },
  { name: 'GameSpot', url: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.gamespot.com/feeds/mashup/', icon: '🕹️' },
  { name: 'Kotaku', url: 'https://api.rss2json.com/v1/api.json?rss_url=https://kotaku.com/rss', icon: '📰' },
];

function newsItemToPost(item, source) {
  return {
    id: `news-${Date.now()}-${Math.random()}`,
    type: 'news',
    content: item.title,
    author: {
      displayName: source.name,
      username: source.name.toLowerCase(),
      avatar: null,
      isVerified: true,
    },
    authorId: 'news-bot',
    createdAt: new Date(item.pubDate),
    mediaUrls: item.thumbnail ? [item.thumbnail] : [],
    linkPreview: { url: item.link, title: item.title, description: item.description?.slice(0, 200) },
    commentCount: 0,
    likeCount: 0,
    shareCount: 0,
    saveCount: 0,
    viewCount: 0,
    isNews: true,
  };
}

export default function HomeFeedScreen() {
  const [activeTab, setActiveTab] = useState('For You');
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [newsItems, setNewsItems] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [klipyAds, setKlipyAds] = useState([]);
  const [adsLoading, setAdsLoading] = useState(false);
  const { profile, wallet } = useUser();
  const { currentUser } = useAuth();
  const { unreadNotifCount } = useNotifications();
  const navigate = useNavigate();
  const { isMobile, isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign, setLayout } = useLayout();

  useEffect(() => {
    if (isDesktop) {
      setRightPanel(<RightSidebarPanel />);
      setContentAlign('left');
      setLayout('professional');
    }
    return () => {
      setRightPanel(null);
      setContentAlign('center');
      setLayout('standard');
    };
  }, [isDesktop, setRightPanel, setContentAlign, setLayout]);

  // Fetch Klipy ads once
  useEffect(() => {
    const fetchAds = async () => {
      setAdsLoading(true);
      const ads = await getKlipyAds(10);
      setKlipyAds(ads);
      setAdsLoading(false);
    };
    fetchAds();
  }, []);

  // Fetch news once when component mounts (for For You feed)
  useEffect(() => {
    const fetchNewsForFeed = async () => {
      setNewsLoading(true);
      try {
        const allNews = await Promise.all(
          NEWS_SOURCES.map(async (source) => {
            try {
              const res = await fetch(source.url);
              const data = await res.json();
              return (data.items || []).map((item) => ({
                ...item,
                source: source.name,
                sourceIcon: source.icon,
              }));
            } catch {
              return [];
            }
          })
        );
        const flatNews = allNews.flat().sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate)).slice(0, 30);
        setNewsItems(flatNews);
      } catch (error) {
        console.error('Error fetching news:', error);
      } finally {
        setNewsLoading(false);
      }
    };
    fetchNewsForFeed();
  }, []);

  const fetchPosts = useCallback(async () => {
    setPostsLoading(true);
    try {
      let data;
      if (activeTab === 'Trending') {
        data = await getTrendingPosts(20);
      } else if (activeTab === 'Following' && currentUser?.uid) {
        data = await getFollowingFeedPosts(currentUser.uid, 20);
      } else {
        data = await getFeedPosts(20);
      }
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  }, [activeTab, currentUser?.uid]);

  const fetchNewsForGamingTab = useCallback(async () => {
    setNewsLoading(true);
    try {
      const allNews = await Promise.all(
        NEWS_SOURCES.map(async (source) => {
          try {
            const res = await fetch(source.url);
            const data = await res.json();
            return (data.items || []).map((item) => ({
              ...item,
              source: source.name,
              sourceIcon: source.icon,
            }));
          } catch {
            return [];
          }
        })
      );
      const flatNews = allNews.flat().sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate)).slice(0, 30);
      setNewsItems(flatNews);
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'Gaming News') {
      fetchNewsForGamingTab();
    } else {
      fetchPosts();
    }
  }, [activeTab, fetchPosts, fetchNewsForGamingTab]);

  const renderGamingNews = () => {
    if (newsLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-text-muted text-sm font-dmmono">Fetching gaming news...</p>
        </div>
      );
    }
    if (newsItems.length === 0) {
      return <div className="text-center py-20 px-6"><p className="text-text-muted">No news available</p></div>;
    }
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
        {newsItems.map((item, idx) => (
          <a key={idx} href={item.link} target="_blank" rel="noopener noreferrer" className="block rounded-2xl border border-white/[0.06] bg-surface-1 overflow-hidden hover:border-white/[0.12] transition-all hover:translate-y-[-2px] group">
            {item.thumbnail && <div className="aspect-video w-full overflow-hidden"><img src={item.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" /></div>}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2"><span className="text-sm">{item.sourceIcon}</span><span className="text-xs text-brand-cyan font-bold uppercase tracking-wider">{item.source}</span><span className="text-text-muted text-xs">· {new Date(item.pubDate).toLocaleDateString()}</span></div>
              <h3 className="font-syne font-bold text-text-primary text-base leading-snug mb-2 line-clamp-2">{item.title}</h3>
              <p className="text-text-secondary text-sm line-clamp-2">{item.description?.replace(/<[^>]*>/g, '').slice(0, 100)}...</p>
            </div>
          </a>
        ))}
      </div>
    );
  };

  const renderForYou = () => {
    if (postsLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-surface-3 border-t-brand-cyan rounded-full animate-spin mb-4" />
          <p className="text-text-muted text-xs font-dmmono">Loading posts...</p>
        </div>
      );
    }

    // Build the feed array: start with posts (or news if no posts)
    let feedItems = [];
    if (posts.length === 0 && newsItems.length > 0) {
      // No posts, show news as placeholders
      const newsPosts = newsItems.slice(0, 5).map((item) => {
        const source = NEWS_SOURCES.find(s => s.name === item.source) || NEWS_SOURCES[0];
        return newsItemToPost(item, source);
      });
      feedItems = newsPosts;
    } else {
      feedItems = [...posts];
    }

    // Inject Klipy ads (if any)
    if (klipyAds.length && !adsLoading) {
      feedItems = injectAdsRandomly(feedItems, klipyAds, 3, 6);
    }

    const elements = [];
    // Force carousel at the top
    elements.push(<SuggestionsCarousel key="carousel-top" />);

    // Inject up to 3 news items at the top (distinct)
    if (newsItems.length > 0) {
      const newsToShow = newsItems.slice(0, 3);
      newsToShow.forEach((news, idx) => {
        const source = NEWS_SOURCES.find(s => s.name === news.source) || NEWS_SOURCES[0];
        const newsPost = newsItemToPost(news, source);
        elements.push(<PostCard key={`news-top-${idx}`} post={newsPost} onDeleted={() => {}} />);
      });
    }

    // Then add all feed items (posts/ads)
    feedItems.forEach((item, index) => {
      if (item.isAd) {
        elements.push(<AdCard key={`ad-${index}`} ad={item} />);
      } else {
        elements.push(
          <PostCard
            key={item.id}
            post={item}
            onDeleted={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
          />
        );
      }
    });

    return elements;
  };

  const renderFollowing = () => {
    if (postsLoading) {
      return <div className="flex flex-col items-center justify-center py-20"><div className="w-8 h-8 border-2 border-surface-3 border-t-brand-cyan rounded-full animate-spin mb-4" /><p className="text-text-muted text-xs font-dmmono">Loading followed posts...</p></div>;
    }
    if (posts.length === 0) {
      return <div className="text-center py-20 px-6"><div className="w-20 h-20 bg-surface-1 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/[0.06]"><Icon name="person_add" size={40} className="text-text-muted/30" /></div><h3 className="font-syne font-bold text-text-primary text-xl mb-2">No followed posts</h3><p className="text-text-muted max-w-xs mx-auto mb-6">Follow gamers to see their posts here.</p><button onClick={() => navigate('/explore')} className="px-6 py-2.5 rounded-full bg-brand-cyan text-bg-dark font-bold text-sm">Explore</button></div>;
    }
    return posts.map((post) => <PostCard key={post.id} post={post} onDeleted={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))} />);
  };

  const renderTrending = () => {
    if (postsLoading) {
      return <div className="flex flex-col items-center justify-center py-20"><div className="w-8 h-8 border-2 border-surface-3 border-t-brand-cyan rounded-full animate-spin mb-4" /><p className="text-text-muted text-xs font-dmmono">Loading trending posts...</p></div>;
    }
    if (posts.length === 0) {
      return <div className="text-center py-20 px-6"><p className="text-text-muted">No trending posts yet</p></div>;
    }
    return posts.map((post) => <PostCard key={post.id} post={post} onDeleted={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))} />);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'For You': return renderForYou();
      case 'Following': return renderFollowing();
      case 'Gaming News': return renderGamingNews();
      case 'Trending': return renderTrending();
      default: return renderForYou();
    }
  };

  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      {isMobile && (
        <header className="sticky top-0 z-40 glass-header px-4 h-[52px] flex items-center justify-between">
          <div className="flex items-center gap-3"><img src={profile?.avatar || '/logo.png'} alt="" className="w-8 h-8 rounded-full object-cover border border-white/[0.08]" /><h1 className="font-syne font-bold text-lg tracking-tight text-text-primary">VERGR</h1></div>
          <div className="flex items-center gap-3"><CoinDisplay amount={wallet?.balance || 0} size="sm" /><button onClick={() => navigate('/notifications')} className="relative"><Icon name="notifications" size={22} className="text-text-secondary" />{unreadNotifCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand-ember text-[10px] flex items-center justify-center font-bold text-white border-2 border-bg-dark">{unreadNotifCount > 9 ? '9+' : unreadNotifCount}</span>}</button></div>
        </header>
      )}
      <div className="sticky top-0 lg:top-0 z-30 glass-header px-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center overflow-x-auto no-scrollbar">
          {FEED_TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-none px-5 py-3.5 text-[13px] font-semibold transition-colors relative ${activeTab === tab ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}>
              {tab}
              {activeTab === tab && <motion.div layoutId="feedTabIndicator" className="absolute bottom-0 left-2 right-2 h-[2px] bg-brand-cyan rounded-full" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
            </button>
          ))}
        </div>
      </div>
      <DailyRewardBanner />
      <div className="flex-1 w-full">{renderContent()}</div>
      {isMobile && <button onClick={() => setShowCreateModal(true)} className="fixed bottom-20 right-4 w-13 h-13 rounded-full bg-brand-cyan flex items-center justify-center z-30 hover:brightness-110 active:scale-95 transition-all shadow-black/30"><Icon name="add" size={26} className="text-bg-dark" /></button>}
      {showCreateModal && <CreatePostModal onClose={() => setShowCreateModal(false)} />}
    </div>
  );
}