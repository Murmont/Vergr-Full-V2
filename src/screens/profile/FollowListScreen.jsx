import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { getFollowers, getFollowing, followUser, unfollowUser, isFollowing as checkFollowing } from '../../firebase/firestore';
import TopBar from '../../components/TopBar';
import UserAvatar from '../../components/UserAvatar';
import Icon from '../../components/Icon';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';

export default function FollowListScreen() {
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  useEffect(() => {
    setRightPanel(null);
    if (isDesktop) setContentAlign('left');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign, isDesktop]);
  const { tab: initialTab } = useParams();
  const [activeTab, setActiveTab] = useState(initialTab || 'followers');
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followStates, setFollowStates] = useState({});

  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) return;
    const load = async () => {
      setLoading(true);
      try {
        const [fans, followed] = await Promise.all([
          getFollowers(currentUser.uid, 50),
          getFollowing(currentUser.uid, 50),
        ]);
        setFollowers(fans);
        setFollowing(followed);

        // Check follow status for each follower
        const states = {};
        for (const user of fans) {
          states[user.id] = await checkFollowing(currentUser.uid, user.id);
        }
        setFollowStates(states);
      } catch (err) {
        console.error('Failed to load follow data:', err);
      }
      setLoading(false);
    };
    load();
  }, [currentUser]);

  const handleFollowToggle = async (userId) => {
    const isCurrentlyFollowing = followStates[userId];
    setFollowStates(prev => ({ ...prev, [userId]: !isCurrentlyFollowing }));
    try {
      if (isCurrentlyFollowing) {
        await unfollowUser(currentUser.uid, userId);
      } else {
        await followUser(currentUser.uid, userId);
      }
    } catch (err) {
      console.error(err);
      setFollowStates(prev => ({ ...prev, [userId]: isCurrentlyFollowing }));
    }
  };

  const currentList = activeTab === 'followers' ? followers : following;

  return (
    <div className={isDesktop ? "min-h-screen pb-8" : "screen-container min-h-screen pb-8"}>
      <TopBar showBack title={activeTab === 'followers' ? 'Fans' : 'Following'} />

      {/* Tabs */}
      <div className="flex border-b border-white/[0.04]">
        {['followers', 'following'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3.5 text-sm font-bold text-center relative transition-colors ${
              activeTab === tab ? 'text-white' : 'text-text-muted'
            }`}
          >
            {tab === 'followers' ? `Fans${followers.length > 0 ? ` (${followers.length})` : ''}` : `Following${following.length > 0 ? ` (${following.length})` : ''}`}
            {activeTab === tab && (
              <motion.div
                layoutId="followTabIndicator"
                className="absolute bottom-0 left-4 right-4 h-[2px] bg-brand-cyan rounded-full"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="px-4 py-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-surface-3 border-t-brand-cyan rounded-full animate-spin" />
          </div>
        ) : currentList.length === 0 ? (
          <div className="text-center py-16">
            <Icon name={activeTab === 'followers' ? 'group' : 'person_search'} size={48} className="text-text-muted/30 mx-auto mb-3" />
            <p className="text-text-muted text-sm">
              {activeTab === 'followers' ? "No fans yet. Share your content to grow your audience!" : "You're not following anyone yet. Discover creators and gamers!"}
            </p>
            {activeTab === 'following' && (
              <button onClick={() => navigate('/explore')} className="mt-4 px-5 py-2.5 rounded-full bg-brand-cyan text-bg-dark text-sm font-bold">
                Explore
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {currentList.map(user => (
              <div key={user.id} className="flex items-center gap-3 py-3">
                <button onClick={() => navigate(`/user/${user.id}`)} className="shrink-0">
                  <UserAvatar src={user.avatar} size="md" />
                </button>
                <button onClick={() => navigate(`/user/${user.id}`)} className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-semibold truncate">{user.displayName || user.username}</p>
                    {user.isVerified && <Icon name="verified" filled size={14} className="text-brand-cyan shrink-0" />}
                  </div>
                  <p className="text-xs text-text-muted">@{user.username}</p>
                </button>
                {user.id !== currentUser.uid && (
                  <motion.button
                    onClick={() => handleFollowToggle(user.id)}
                    whileTap={{ scale: 0.92 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
                      followStates[user.id]
                        ? 'bg-surface-2 border border-white/[0.06] text-text-secondary'
                        : 'bg-brand-cyan text-bg-dark'
                    }`}
                  >
                    {followStates[user.id] ? 'Following' : 'Follow'}
                  </motion.button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
