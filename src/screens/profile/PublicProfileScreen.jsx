import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { getUserById, getUserByUsername, getUserPosts, followUser, unfollowUser, isFollowing as checkFollowing, createConversation, getWallet } from '../../firebase/firestore';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';
import UserAvatar from '../../components/UserAvatar';
import PostCard from '../../components/PostCard';
import TopBar from '../../components/TopBar';
import Icon from '../../components/Icon';
import TierBadge from '../../components/TierBadge';
import VPLevelBadge from '../../components/VPLevelBadge';
import { getVPLevel, getVPProgress, getNextVPLevel } from '../../utils/vpSystem';

export default function PublicProfileScreen() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const { showToast } = useUI();
  const navigate = useNavigate();
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  const [user, setUser] = useState(null);
  const [userVP, setUserVP] = useState(0);
  const [posts, setPosts] = useState([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Posts');
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    setRightPanel(null);
    setContentAlign('left');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        let u = await getUserById(id);
        if (!u) u = await getUserByUsername(id);
        if (u) {
          setUser(u);
          const [userPosts, isFollow, walletData] = await Promise.all([
            getUserPosts(u.id, 20),
            currentUser ? checkFollowing(currentUser.uid, u.id) : false,
            getWallet(u.id).catch(() => ({ vp: 0 })),
          ]);
          setPosts(userPosts);
          setFollowing(isFollow);
          setUserVP(walletData?.vp || 0);
        }
      } catch (err) { console.error("Error loading profile:", err); }
      setLoading(false);
    };
    load();
  }, [id, currentUser]);

  const handleFollowToggle = async () => {
    if (!currentUser || !user || toggling) return;
    setToggling(true);
    const wasFollowing = following;
    const change = wasFollowing ? -1 : 1;
    setFollowing(!wasFollowing);
    setUser(prev => ({ ...prev, followerCount: (prev.followerCount || 0) + change }));
    try {
      if (wasFollowing) await unfollowUser(currentUser.uid, user.id);
      else await followUser(currentUser.uid, user.id);
    } catch (err) {
      setFollowing(wasFollowing);
      setUser(prev => ({ ...prev, followerCount: (prev.followerCount || 0) - change }));
      showToast('Failed to update follow status', 'error');
    }
    setToggling(false);
  };

  const handleMessage = async () => {
    if (!currentUser || !user) return;
    try {
      const convoId = await createConversation(currentUser.uid, user);
      navigate(`/messages/${convoId}`);
    } catch (err) { showToast('Failed to start conversation', 'error'); }
  };

  const formatCount = (n) => {
    if (!n) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };

  if (loading) return (
    <div className="min-h-screen"><TopBar showBack /><div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-surface-3 border-t-brand-cyan rounded-full animate-spin" /></div></div>
  );
  if (!user) return (
    <div className="min-h-screen"><TopBar showBack title="Profile" /><div className="flex flex-col items-center py-20"><Icon name="person_off" size={48} className="text-text-muted/30 mb-3" /><p className="text-text-muted text-sm">User not found</p></div></div>
  );

  const isMe = currentUser?.uid === user.id;
  const vpLevel = getVPLevel(userVP);
  const vpProgress = getVPProgress(userVP);
  const vpNext = getNextVPLevel(userVP);

  const tabContent = (
    <>
      {activeTab === 'Posts' && (
        posts.length === 0 ? (
          <div className="text-center py-12"><Icon name="edit_note" size={48} className="text-text-muted/20 mx-auto mb-3" /><p className="text-text-muted text-sm">No posts yet</p></div>
        ) : (
          <div className={isDesktop ? 'grid grid-cols-2 gap-4' : 'space-y-4'}>
            {posts.map(post => <PostCard key={post.id} post={{ ...post, author: user }} />)}
          </div>
        )
      )}
      {activeTab === 'Media' && (<div className="text-center py-12"><Icon name="photo_library" size={48} className="text-text-muted/20 mx-auto mb-3" /><p className="text-text-muted text-sm">No media shared yet</p></div>)}
      {activeTab === 'Likes' && (<div className="text-center py-12"><Icon name="favorite_border" size={48} className="text-text-muted/20 mx-auto mb-3" /><p className="text-text-muted text-sm">Liked posts are private</p></div>)}
    </>
  );

  const actionButtons = !isMe && (
    <div className="flex gap-2">
      <button onClick={handleMessage} className="w-10 h-10 rounded-full bg-surface-2 border border-white/[0.06] flex items-center justify-center hover:bg-surface-3 transition-colors"><Icon name="chat_bubble" size={18} /></button>
      <button onClick={() => navigate('/wallet')} className="w-10 h-10 rounded-full bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center hover:bg-brand-gold/20 transition-colors"><Icon name="paid" size={18} className="text-brand-gold" /></button>
      <motion.button
        onClick={handleFollowToggle}
        disabled={toggling}
        whileTap={{ scale: 0.92 }}
        animate={{ scale: toggling ? 0.95 : 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        className={`px-5 py-2 rounded-full font-bold text-sm transition-colors ${following ? 'bg-surface-2 border border-white/[0.06] text-text-secondary hover:border-brand-ember hover:text-brand-ember' : 'bg-brand-cyan text-bg-dark'}`}>
        {following ? 'Following' : 'Follow'}
      </motion.button>
    </div>
  );

  if (isDesktop) {
    return (
      <div className="pb-8">
        <TopBar showBack title={`@${user.username}`} />
        <div className="relative h-40 bg-gradient-to-br from-brand-violet/30 via-brand-cyan/20 to-brand-pink/30">
          {user.banner && <img src={user.banner} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="px-6">
          <div className="flex gap-8 items-start -mt-10">
            <div className="relative shrink-0">
              <div className="border-4 border-bg-dark rounded-full"><UserAvatar src={user.avatar} size={100} /></div>
              <div className="absolute -bottom-1 -right-1 px-2.5 py-1 rounded-lg border-2 border-bg-dark" style={{ background: vpLevel.ringColor || '#7B6FFF' }}><span className="text-xs font-black text-white">{vpLevel.name}</span></div>
            </div>
            <div className="flex-1 min-w-0 pt-12">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-syne font-bold">{user.displayName || user.username}</h2>
                  {user.isVerified && <Icon name="verified" filled size={20} className="text-brand-cyan" />}
                </div>
                {actionButtons}
              </div>
              <p className="text-brand-cyan text-sm font-dmmono mb-2">@{user.username}</p>
              {user.bio && <p className="text-text-secondary text-sm leading-relaxed mb-4 max-w-lg">{user.bio}</p>}
              <div className="flex items-center gap-6 mb-4">
                <span><span className="text-lg font-bold font-dmmono">{formatCount(user.followerCount)}</span> <span className="text-text-muted text-xs">Fans</span></span>
                <span><span className="text-lg font-bold font-dmmono">{formatCount(user.followingCount)}</span> <span className="text-text-muted text-xs">Following</span></span>
                <span><span className="text-lg font-bold font-dmmono">{formatCount(user.postCount)}</span> <span className="text-text-muted text-xs">Posts</span></span>
              </div>
              <div className="p-3 bg-surface-2/50 rounded-2xl border border-white/[0.04] max-w-md">
                <div className="flex justify-between items-center mb-1.5">
                  <VPLevelBadge vp={userVP} size="sm" />
                  {vpNext ? <span className="text-[10px] text-brand-violet font-dmmono">{userVP.toLocaleString()} / {vpNext.vpRequired.toLocaleString()} VP</span> : <span className="text-[10px] text-brand-violet font-dmmono">MAX</span>}
                </div>
                <div className="h-1.5 w-full bg-bg-dark rounded-full overflow-hidden border border-white/[0.04]"><div className="h-full rounded-full transition-all" style={{ width: `${vpProgress}%`, background: vpLevel.ringColor || '#7B6FFF' }} /></div>
              </div>
            </div>
          </div>
          <div className="flex border-b border-white/[0.04] mt-6 mb-4">
            {['Posts', 'Media', 'Likes'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3.5 text-xs font-bold uppercase tracking-widest relative ${activeTab === tab ? 'text-brand-cyan' : 'text-text-muted hover:text-text-secondary'}`}>
                {tab}{activeTab === tab && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-brand-cyan" />}
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
    <div className="screen-container min-h-screen pb-8">
      <TopBar showBack title={`@${user.username}`} />
      <div className="relative h-28 bg-gradient-to-br from-brand-violet/30 via-brand-cyan/20 to-brand-pink/30">
        {user.banner && <img src={user.banner} alt="" className="w-full h-full object-cover" />}
      </div>
      <div className="px-4 -mt-10 flex items-end justify-between mb-3">
        <div className="relative">
          <div className="border-4 border-bg-dark rounded-full"><UserAvatar src={user.avatar} size={72} /></div>
          <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-lg border-2 border-bg-dark" style={{ background: vpLevel.ringColor || '#7B6FFF' }}><span className="text-[10px] font-black text-white">{vpLevel.name}</span></div>
        </div>
        {!isMe && (
          <div className="flex gap-2 pb-1">
            <button onClick={handleMessage} className="w-10 h-10 rounded-full bg-surface-2 border border-white/[0.06] flex items-center justify-center"><Icon name="chat_bubble" size={18} /></button>
            <button onClick={() => navigate('/wallet')} className="w-10 h-10 rounded-full bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center"><Icon name="paid" size={18} className="text-brand-gold" /></button>
            <motion.button onClick={handleFollowToggle} disabled={toggling}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className={`px-5 py-2 rounded-full font-bold text-sm transition-colors ${following ? 'bg-surface-2 border border-white/[0.06] text-text-secondary' : 'bg-brand-cyan text-bg-dark'}`}>
              {following ? 'Following' : 'Follow'}
            </motion.button>
          </div>
        )}
      </div>
      <div className="px-4">
        <div className="flex items-center gap-1.5 mb-0.5"><h2 className="text-xl font-syne font-bold">{user.displayName || user.username}</h2>{user.isVerified && <Icon name="verified" filled size={16} className="text-brand-cyan" />}<TierBadge tier={user.tier} /></div>
        <p className="text-brand-cyan text-sm font-dmmono mb-2">@{user.username}</p>
        {user.bio && <p className="text-text-secondary text-sm leading-relaxed mb-4">{user.bio}</p>}
        <div className="flex items-center gap-0 mb-4 border border-white/[0.06] rounded-2xl overflow-hidden bg-surface-1">
          <div className="flex-1 py-3 text-center"><p className="text-base font-bold font-dmmono">{formatCount(user.followerCount)}</p><p className="text-[9px] text-text-muted uppercase font-semibold tracking-wider mt-0.5">Fans</p></div>
          <div className="w-px h-8 bg-border-accent" />
          <div className="flex-1 py-3 text-center"><p className="text-base font-bold font-dmmono">{formatCount(user.followingCount)}</p><p className="text-[9px] text-text-muted uppercase font-semibold tracking-wider mt-0.5">Following</p></div>
          <div className="w-px h-8 bg-border-accent" />
          <div className="flex-1 py-3 text-center"><p className="text-base font-bold font-dmmono">{formatCount(user.postCount)}</p><p className="text-[9px] text-text-muted uppercase font-semibold tracking-wider mt-0.5">Posts</p></div>
        </div>
        <div className="p-3 bg-surface-2/50 rounded-2xl border border-white/[0.04] mb-2">
          <div className="flex justify-between items-center mb-1.5"><VPLevelBadge vp={userVP} size="sm" />{vpNext ? <span className="text-[10px] text-brand-violet font-dmmono">{userVP.toLocaleString()} / {vpNext.vpRequired.toLocaleString()}</span> : <span className="text-[10px] text-brand-violet font-dmmono">MAX</span>}</div>
          <div className="h-1.5 w-full bg-bg-dark rounded-full overflow-hidden border border-white/[0.04]"><div className="h-full rounded-full transition-all" style={{ width: `${vpProgress}%`, background: vpLevel.ringColor || '#7B6FFF' }} /></div>
        </div>
      </div>
      <div className="flex border-b border-white/[0.04] mt-4 px-2">
        {['Posts', 'Media', 'Likes'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-widest relative ${activeTab === tab ? 'text-brand-cyan' : 'text-text-muted'}`}>
            {tab}{activeTab === tab && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-brand-cyan" />}
          </button>
        ))}
      </div>
      <div className="px-4 py-4">{tabContent}</div>
    </div>
  );
}
