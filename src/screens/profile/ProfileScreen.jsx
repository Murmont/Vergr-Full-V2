import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import { useUI } from '../../context/UIContext';
import { getUserPosts, getBookmarks } from '../../firebase/firestore';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';
import useTier from '../../hooks/useTier';
import UserAvatar from '../../components/UserAvatar';
import CoinDisplay from '../../components/CoinDisplay';
import Icon from '../../components/Icon';
import PostCard from '../../components/PostCard';
import TierBadge from '../../components/TierBadge';
import VPLevelBadge from '../../components/VPLevelBadge';
import { getVPLevel, getVPProgress, getNextVPLevel } from '../../utils/vpSystem';

const PROFILE_TABS = ['Posts', 'Media', 'Likes', 'Bookmarks'];

export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState('Posts');
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);

  const { currentUser } = useAuth();
  const { profile, wallet, loading } = useUser();
  const { showToast } = useUI();
  const navigate = useNavigate();
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();
  const { tier } = useTier();
  const isPro = tier === 'pro';

  useEffect(() => {
    setRightPanel(null);
    setContentAlign('left');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign]);

  useEffect(() => {
    if (!currentUser) return;
    setLoadingPosts(true);
    getUserPosts(currentUser.uid, 20)
      .then(setPosts)
      .catch(console.error)
      .finally(() => setLoadingPosts(false));
  }, [currentUser]);

  // Load bookmarks when tab is active
  useEffect(() => {
    if (activeTab !== 'Bookmarks' || !currentUser) return;
    setLoadingBookmarks(true);
    getBookmarks(currentUser.uid, 50)
      .then(setBookmarks)
      .catch(console.error)
      .finally(() => setLoadingBookmarks(false));
  }, [activeTab, currentUser]);

  const copyUsername = () => {
    if (!profile?.username) return;
    navigator.clipboard.writeText(`@${profile.username}`).then(() => {
      showToast('Username copied!', 'success');
    }).catch(() => {
      showToast(`@${profile.username}`, 'info');
    });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-bg-dark">
      <div className="w-8 h-8 border-4 border-brand-cyan border-t-transparent animate-spin rounded-full" />
    </div>
  );

  const prestige = profile?.level || profile?.prestigeLevel || 1;
  const xp = profile?.totalXP || profile?.xp || 0;
  const progress = Math.min((xp % 1000) / 1000 * 100, 100);
  const formatCount = (n) => {
    if (!n) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };

  const tabContent = (
    <>
      {activeTab === 'Posts' && (
        loadingPosts ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-surface-3 border-t-brand-cyan rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <Icon name="edit_note" size={48} className="text-text-muted/30 mb-4" />
            <p className="text-text-muted text-sm font-medium mb-1">No posts yet</p>
            <p className="text-text-muted/60 text-xs mb-4">Share your first gaming moment</p>
            <button onClick={() => navigate('/create')} className="px-5 py-2.5 rounded-full bg-brand-cyan text-bg-dark text-sm font-semibold">
              Create Post
            </button>
          </div>
        ) : (
          <div className={isDesktop ? 'grid grid-cols-2 gap-4' : 'space-y-4'}>
            {posts.map(post => <PostCard key={post.id} post={post} onDeleted={(id) => setPosts(prev => prev.filter(p => p.id !== id))} />)}
          </div>
        )
      )}
      {activeTab === 'Media' && (
        <div className="py-16 flex flex-col items-center justify-center">
          <Icon name="photo_library" size={48} className="text-text-muted/30 mb-4" />
          <p className="text-text-muted text-sm">No media shared yet</p>
        </div>
      )}
      {activeTab === 'Likes' && (
        <div className="py-16 flex flex-col items-center justify-center">
          <Icon name="favorite_border" size={48} className="text-text-muted/30 mb-4" />
          <p className="text-text-muted text-sm">No liked posts yet</p>
        </div>
      )}
      {activeTab === 'Bookmarks' && (
        loadingBookmarks ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-surface-3 border-t-brand-cyan rounded-full animate-spin" />
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <Icon name="bookmark_border" size={48} className="text-text-muted/30 mb-4" />
            <p className="text-text-muted text-sm font-medium mb-1">No bookmarks yet</p>
            <p className="text-text-muted/60 text-xs">Save posts to find them later</p>
          </div>
        ) : (
          <div className="space-y-0">
            {bookmarks.map(post => <PostCard key={post.id} post={post} onDeleted={(id) => setBookmarks(prev => prev.filter(p => p.id !== id))} />)}
          </div>
        )
      )}
    </>
  );

  /* Header — shared between layouts */
  const header = (
    <header className="sticky top-0 z-40 glass-header flex items-center justify-between px-4 h-[52px]">
      <button onClick={copyUsername} className="flex items-center gap-1 active:opacity-70 transition-opacity">
        <span className="font-dmmono text-sm font-bold text-text-primary">@{profile?.username || 'username'}</span>
        <Icon name="content_copy" size={12} className="text-text-muted" />
      </button>
      <div className="flex items-center gap-1.5">
        <CoinDisplay amount={wallet?.balance || 0} size="sm" />
        <button onClick={() => navigate('/edit-profile')}
          className="w-8 h-8 flex items-center justify-center rounded-full text-text-secondary hover:text-text-primary transition-colors">
          <Icon name="edit" size={18} />
        </button>
        <button onClick={() => navigate('/vergrme/edit')}
          className="w-8 h-8 flex items-center justify-center rounded-full text-text-secondary hover:text-text-primary transition-colors relative"
          title="My Vergr.me page">
          <Icon name="link" size={18} />
          {isPro && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-brand-cyan" />
          )}
        </button>
        <button onClick={() => navigate('/settings')}
          className="w-8 h-8 flex items-center justify-center rounded-full text-text-secondary hover:text-text-primary transition-colors">
          <Icon name="settings" size={20} />
        </button>
      </div>
    </header>
  );

  if (isDesktop) {
    return (
      <div className="pb-8">
        {header}
        <div className="px-6 pt-8">
          {/* Profile hero — horizontal */}
          <div className="flex gap-8 items-start mb-8">
            <div className="relative shrink-0">
              <UserAvatar src={profile?.avatar || profile?.photoURL} size={120} className="rounded-full" />
              <div className="absolute -bottom-1 -right-1 px-2.5 py-1 rounded-lg border-2 border-bg-dark z-10" style={{ background: getVPLevel(wallet?.vp || 0).ringColor || '#7B6FFF' }}>
                <span className="text-xs font-black text-white">{getVPLevel(wallet?.vp || 0).name}</span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-syne font-bold text-text-primary truncate">{profile?.displayName || 'Gamer'}</h2>
                {profile?.isVerified && <Icon name="verified" filled size={20} className="text-brand-cyan shrink-0" />}
                <TierBadge tier={profile?.tier} />
                {profile?.role === 'creator' && (
                  <span className="px-2 py-0.5 rounded-full bg-brand-violet/15 border border-brand-violet/30 text-brand-violet text-[10px] font-bold uppercase tracking-wider">Creator</span>
                )}
              </div>
              {profile?.bio && <p className="text-text-secondary text-sm leading-relaxed mb-4 max-w-lg">{profile.bio}</p>}

              <div className="flex items-center gap-6 mb-5">
                <button onClick={() => navigate('/followers/followers')} className="hover:opacity-80 transition-opacity">
                  <span className="text-lg font-bold text-white font-dmmono">{formatCount(profile?.followerCount)}</span>
                  <span className="text-text-muted text-xs ml-1.5">Fans</span>
                </button>
                <button onClick={() => navigate('/followers/following')} className="hover:opacity-80 transition-opacity">
                  <span className="text-lg font-bold text-white font-dmmono">{formatCount(profile?.followingCount)}</span>
                  <span className="text-text-muted text-xs ml-1.5">Following</span>
                </button>
                <button onClick={() => navigate('/prestige')} className="hover:opacity-80 transition-opacity">
                  <span className="text-lg font-bold text-white font-dmmono">{formatCount(profile?.totalLikes || profile?.postCount || 0)}</span>
                  <span className="text-text-muted text-xs ml-1.5">Rep</span>
                </button>
              </div>

              <div className="p-3.5 bg-surface-2/50 rounded-2xl border border-white/[0.04] max-w-md">
                {(() => {
                  const vp = wallet?.vp || 0;
                  const level = getVPLevel(vp);
                  const vpProg = getVPProgress(vp);
                  const next = getNextVPLevel(vp);
                  return (<>
                    <div className="flex justify-between items-center mb-2">
                      <VPLevelBadge vp={vp} size="sm" />
                      {next ? <span className="text-[11px] text-brand-violet font-dmmono">{vp.toLocaleString()} / {next.vpRequired.toLocaleString()} VP</span> : <span className="text-[11px] text-brand-violet font-dmmono">MAX LEVEL</span>}
                    </div>
                    <div className="h-1.5 w-full bg-bg-dark rounded-full overflow-hidden border border-white/[0.04]">
                      <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${vpProg}%`, background: level.ringColor || '#7B6FFF' }} />
                    </div>
                    {level.discount > 0 && <p className="text-[9px] text-text-muted mt-1.5">Perks: {Math.round(level.discount * 100)}% coin discount · {Math.round((1 - level.commission) * 100)}% gem rate</p>}
                  </>);
                })()}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/[0.04] mb-4">
            {PROFILE_TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-6 py-3.5 text-xs font-semibold uppercase tracking-widest transition-colors relative ${
                  activeTab === tab ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary'
                }`}>
                {tab}
                {activeTab === tab && (
                  <motion.div
                    layoutId="profileDesktopTabIndicator"
                    className="absolute bottom-0 left-4 right-4 h-[2px] bg-brand-cyan rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
              </button>
            ))}
          </div>
          {tabContent}
        </div>
      </div>
    );
  }

  /* ════════ MOBILE (unchanged) ════════ */
  return (
    <div className="min-h-screen pb-20 bg-bg-dark">
      {header}
      <div className="px-5 pt-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative shrink-0 w-24 h-24">
            <UserAvatar src={profile?.avatar || profile?.photoURL} size={88} className="w-full h-full object-cover rounded-full" />
            <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-lg border-2 border-bg-dark z-10" style={{ background: getVPLevel(wallet?.vp || 0).ringColor || '#7B6FFF' }}>
              <span className="text-[10px] font-black text-white">{getVPLevel(wallet?.vp || 0).name}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h2 className="text-xl font-syne font-bold text-text-primary truncate">{profile?.displayName || 'Gamer'}</h2>
              {profile?.isVerified && <Icon name="verified" filled size={16} className="text-brand-cyan shrink-0" />}
              <TierBadge tier={profile?.tier} size="xs" />
            </div>
            {profile?.role === 'creator' && (
              <span className="inline-block px-2 py-0.5 rounded-full bg-brand-violet/15 border border-brand-violet/30 text-brand-violet text-[10px] font-bold uppercase tracking-wider">Creator</span>
            )}
          </div>
        </div>
        {profile?.bio && <p className="text-text-secondary text-sm leading-relaxed mb-4">{profile.bio}</p>}
        <div className="flex items-center gap-0 mb-5 border border-white/[0.06] rounded-xl overflow-hidden bg-surface-1">
          <button onClick={() => navigate('/followers/followers')} className="flex-1 py-3 text-center hover:bg-surface-2/50 transition-colors">
            <p className="text-base font-bold text-text-primary font-dmmono leading-none">{formatCount(profile?.followerCount)}</p>
            <p className="text-[9px] text-text-muted uppercase font-semibold tracking-wider mt-1">Fans</p>
          </button>
          <div className="w-px h-8 bg-white/[0.06]" />
          <button onClick={() => navigate('/followers/following')} className="flex-1 py-3 text-center hover:bg-surface-2/50 transition-colors">
            <p className="text-base font-bold text-text-primary font-dmmono leading-none">{formatCount(profile?.followingCount)}</p>
            <p className="text-[9px] text-text-muted uppercase font-semibold tracking-wider mt-1">Following</p>
          </button>
          <div className="w-px h-8 bg-white/[0.06]" />
          <button onClick={() => navigate('/prestige')} className="flex-1 py-3 text-center hover:bg-surface-2/50 transition-colors">
            <p className="text-base font-bold text-text-primary font-dmmono leading-none">{formatCount(profile?.totalLikes || profile?.postCount || 0)}</p>
            <p className="text-[9px] text-text-muted uppercase font-semibold tracking-wider mt-1">Rep</p>
          </button>
        </div>
        <div className="p-3.5 bg-surface-2/30 rounded-xl border border-white/[0.04] mb-2">
          {(() => {
            const vp = wallet?.vp || 0;
            const level = getVPLevel(vp);
            const vpProg = getVPProgress(vp);
            const next = getNextVPLevel(vp);
            return (<>
              <div className="flex justify-between items-center mb-2">
                <VPLevelBadge vp={vp} size="sm" />
                {next ? <span className="text-[11px] text-brand-violet font-dmmono">{vp.toLocaleString()} / {next.vpRequired.toLocaleString()}</span> : <span className="text-[11px] text-brand-violet font-dmmono">MAX</span>}
              </div>
              <div className="h-1.5 w-full bg-bg-dark rounded-full overflow-hidden border border-white/[0.04]">
                <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${vpProg}%`, background: level.ringColor || '#7B6FFF' }} />
              </div>
            </>);
          })()}
        </div>
      </div>
      <div className="flex border-b border-white/[0.04] mt-4 px-2">
        {PROFILE_TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3.5 text-xs font-semibold uppercase tracking-widest transition-colors relative ${
              activeTab === tab ? 'text-text-primary' : 'text-text-muted'
            }`}>
            {tab}
            {activeTab === tab && (
              <motion.div
                layoutId="profileTabIndicator"
                className="absolute bottom-0 left-4 right-4 h-[2px] bg-brand-cyan rounded-full"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        ))}
      </div>
      <div className="px-4 py-4">{tabContent}</div>
    </div>
  );
}