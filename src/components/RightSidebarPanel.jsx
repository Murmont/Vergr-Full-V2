import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, limit, onSnapshot, where, getDocs, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import Icon from './Icon';
import UserAvatar from './UserAvatar';

export default function RightSidebarPanel() {
  const navigate = useNavigate();
  const [trendingTags, setTrendingTags] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);

  useEffect(() => {
    // Trending tags — reads from trending/hashtags doc (populated by updateTrending Cloud Function)
    const unsubTags = onSnapshot(
      doc(db, 'trending', 'hashtags'),
      (snap) => {
        if (snap.exists() && snap.data().tags?.length > 0) {
          setTrendingTags(snap.data().tags.slice(0, 8).map(t => t.tag || t));
        } else {
          setTrendingTags([]);
        }
      }
    );

    // Suggested users (creators/verified)
    const usersQuery = query(collection(db, 'users'), where('isVerified', '==', true), limit(5));
    getDocs(usersQuery).then(snap => {
      setSuggestedUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }).catch(() => {});

    return () => unsubTags();
  }, []);

  return (
    <div className="space-y-5">
      {/* Search */}
      <label className="block relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
          <Icon name="search" size={20} />
        </div>
        <input
          type="text"
          placeholder="Search Vergr..."
          onClick={() => navigate('/search')}
          readOnly
          className="w-full bg-surface-2 border border-white/[0.06] rounded-full py-2.5 pl-10 pr-4 text-text-primary text-sm focus:border-brand-cyan transition-colors outline-none cursor-pointer"
        />
      </label>

      {/* Trending — only shows when Cloud Function has populated real data */}
      {trendingTags.length > 0 && (
        <div className="bg-surface-1 rounded-2xl border border-white/[0.06] overflow-hidden">
          <h3 className="px-4 pt-4 pb-2 text-sm font-syne font-bold text-text-primary">Trending Now</h3>
          <div className="px-4 pb-3 flex flex-wrap gap-2">
            {trendingTags.map((tag, index) => (
              <button key={index} onClick={() => navigate(`/search?q=%23${tag}`)}
                className="px-3 py-1.5 rounded-lg bg-surface-2 border border-white/[0.06] text-brand-cyan text-xs font-bold hover:border-white/[0.12] transition-colors">
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Who to follow */}
      {suggestedUsers.length > 0 && (
        <div className="bg-surface-1 rounded-2xl border border-white/[0.06] overflow-hidden">
          <h3 className="px-4 pt-4 pb-2 text-sm font-syne font-bold text-text-primary">Who to Follow</h3>
          <div className="divide-y divide-white/[0.04]">
            {suggestedUsers.map(user => (
              <button
                key={user.id}
                onClick={() => navigate(`/user/${user.id}`)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-2/40 transition-colors text-left"
              >
                <UserAvatar src={user.avatar} size={36} isVerified={user.isVerified} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text-primary truncate">{user.displayName}</p>
                  <p className="text-xs text-text-muted font-dmmono truncate">@{user.username}</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-brand-cyan/10 text-brand-cyan text-[10px] font-bold border border-brand-cyan/20">
                  Follow
                </span>
              </button>
            ))}
          </div>
          <button 
            onClick={() => navigate('/browse-creators')}
            className="w-full px-4 py-3 text-brand-cyan text-sm font-semibold hover:bg-surface-2/30 transition-colors"
          >
            Show more
          </button>
        </div>
      )}

      {/* Footer links */}
      <div className="px-2 text-[10px] text-text-muted font-dmmono space-y-1">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <button onClick={() => navigate('/settings/privacy-policy')} className="hover:text-text-secondary transition-colors">Privacy</button>
          <button onClick={() => navigate('/settings/about')} className="hover:text-text-secondary transition-colors">About</button>
          <button onClick={() => navigate('/settings/help')} className="hover:text-text-secondary transition-colors">Help</button>
        </div>
        <p className="mt-2">© 2026 Vergr. All rights reserved.</p>
      </div>
    </div>
  );
}