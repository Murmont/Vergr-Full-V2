import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getUser, toggleLike } from '../../firebase/firestore';
import UserAvatar from '../../components/UserAvatar';
import Icon from '../../components/Icon';

/**
 * Full-screen vertical video viewer.
 * Opens when tapping a clip/video post.
 * Swipe up for next, swipe down for previous. Video loops.
 * Engagement bar on right side (TikTok-style).
 */
export default function ClipViewerScreen() {
  const { postId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [clips, setClips] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const containerRef = useRef(null);
  const touchStartY = useRef(0);
  const isScrolling = useRef(false);

  // Load the target clip + more clips
  useEffect(() => {
    const loadClips = async () => {
      setLoading(true);
      try {
        // Get clip-type posts
        const q = query(
          collection(db, 'posts'),
          where('status', '==', 'published'),
          where('type', 'in', ['clip', 'video']),
          orderBy('createdAt', 'desc'),
          limit(30)
        );
        const snap = await getDocs(q);
        const all = [];
        let targetIdx = 0;

        for (const d of snap.docs) {
          const post = { id: d.id, ...d.data() };
          post.author = await getUser(post.authorId);
          // Get the video URL
          post.videoUrl = post.mediaUrls?.[0] || post.mediaUrl || null;
          if (post.videoUrl) {
            if (post.id === postId) targetIdx = all.length;
            all.push(post);
          }
        }

        setClips(all);
        setCurrentIndex(targetIdx);
      } catch (err) {
        console.error('Failed to load clips:', err);
      }
      setLoading(false);
    };
    loadClips();
  }, [postId]);

  const currentClip = clips[currentIndex];

  const goNext = useCallback(() => {
    if (currentIndex < clips.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowComments(false);
    }
  }, [currentIndex, clips.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setShowComments(false);
    }
  }, [currentIndex]);

  // Touch/swipe handling
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
    isScrolling.current = false;
  };

  const handleTouchEnd = (e) => {
    if (isScrolling.current) return;
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(deltaY) > 60) {
      if (deltaY > 0) goNext();
      else goPrev();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'j') goNext();
      else if (e.key === 'ArrowUp' || e.key === 'k') goPrev();
      else if (e.key === 'Escape') navigate(-1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev, navigate]);

  // Mouse wheel
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let wheelTimeout;
    const handleWheel = (e) => {
      e.preventDefault();
      clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(() => {
        if (e.deltaY > 30) goNext();
        else if (e.deltaY < -30) goPrev();
      }, 100);
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [goNext, goPrev]);

  const formatCount = (n) => {
    if (!n) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-brand-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentClip) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center text-white">
        <Icon name="videocam_off" size={48} className="text-text-muted mb-3" />
        <p className="text-text-muted">No clips found</p>
        <button onClick={() => navigate(-1)} className="mt-4 px-6 py-2 rounded-full bg-surface-2 text-sm">Go Back</button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Video */}
      <VideoPlayer key={currentClip.id} src={currentClip.videoUrl} poster={currentClip.thumbnailUrl} />

      {/* Top bar — back + clip counter */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-4 pb-8 bg-gradient-to-b from-black/60 to-transparent safe-top">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <Icon name="arrow_back" size={22} className="text-white" />
        </button>
        <span className="text-white/60 text-xs font-dmmono">{currentIndex + 1} / {clips.length}</span>
      </div>

      {/* Right side engagement bar */}
      <div className="absolute right-3 bottom-32 z-10 flex flex-col items-center gap-5">
        <EngagementButton
          icon="favorite"
          activeIcon="favorite"
          count={currentClip.likeCount}
          active={currentClip.isLiked}
          activeColor="text-brand-ember"
          onTap={() => {
            if (currentUser) toggleLike?.(currentClip.id, currentUser.uid);
          }}
        />
        <EngagementButton
          icon="chat_bubble"
          count={currentClip.commentCount}
          onTap={() => setShowComments(!showComments)}
        />
        <EngagementButton icon="bookmark" count={currentClip.saveCount} />
        <EngagementButton icon="share" count={currentClip.shareCount} />
      </div>

      {/* Bottom info — author, caption */}
      <div className="absolute bottom-0 left-0 right-16 z-10 px-4 pb-6 bg-gradient-to-t from-black/70 via-black/30 to-transparent safe-bottom">
        <div className="flex items-center gap-2.5 mb-2">
          <button onClick={() => navigate(`/user/${currentClip.authorId}`)}>
            <UserAvatar src={currentClip.author?.avatar} size={36} />
          </button>
          <div>
            <p className="text-white font-bold text-sm">{currentClip.author?.displayName || 'User'}</p>
            <p className="text-white/50 text-xs font-dmmono">@{currentClip.author?.username}</p>
          </div>
        </div>
        {currentClip.content && (
          <p className="text-white/90 text-sm leading-relaxed line-clamp-3">{currentClip.content}</p>
        )}
        {currentClip.hashtags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {currentClip.hashtags.map(tag => (
              <span key={tag} className="text-brand-cyan text-xs font-semibold">#{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Scroll hint */}
      {currentIndex === 0 && clips.length > 1 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 ">
          <Icon name="keyboard_arrow_up" size={28} className="text-white/40" />
        </div>
      )}

      {/* Comments drawer */}
      {showComments && (
        <div className="absolute inset-x-0 bottom-0 z-20 h-[60vh] bg-surface-1 rounded-t-3xl border-t border-white/[0.04] shadow-2xl animate-slide-up">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.03]">
            <h3 className="font-syne font-bold text-sm">Comments ({currentClip.commentCount || 0})</h3>
            <button onClick={() => setShowComments(false)} className="text-text-muted"><Icon name="close" size={20} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-text-muted text-sm text-center py-8">Comments loading...</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Video Player component with loop ───
function VideoPlayer({ src, poster }) {
  const videoRef = useRef(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => {});
    setPaused(false);
  }, [src]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setPaused(false);
    } else {
      video.pause();
      setPaused(true);
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black" onClick={togglePlay}>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        loop
        playsInline
        muted={false}
        className="w-full h-full object-contain"
      />
      {paused && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <Icon name="play_arrow" size={40} className="text-white" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Engagement button ───
function EngagementButton({ icon, activeIcon, count, active, activeColor, onTap }) {
  const [isActive, setIsActive] = useState(active);

  return (
    <button
      onClick={() => { setIsActive(!isActive); onTap?.(); }}
      className="flex flex-col items-center gap-0.5"
    >
      <div className={`w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center ${isActive && activeColor ? activeColor : 'text-white'}`}>
        <Icon name={isActive && activeIcon ? activeIcon : icon} filled={isActive} size={24} />
      </div>
      <span className="text-white text-[10px] font-dmmono font-bold">
        {count ? (count >= 1000 ? (count / 1000).toFixed(1) + 'K' : count) : ''}
      </span>
    </button>
  );
}
