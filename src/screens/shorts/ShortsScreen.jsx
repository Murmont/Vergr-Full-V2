import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getUser, toggleLike, incrementShareCount } from '../../firebase/firestore';
import UserAvatar from '../../components/UserAvatar';
import Icon from '../../components/Icon';
import { getEmbedUrl } from '../../components/EmbedVideoPlayer';
import { timeAgo } from '../../utils/helpers';
import { trackEvent } from '../../utils/trackEvent';

export default function ShortsScreen() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { setRightPanel, setContentAlign } = useLayout();
  const { isDesktop } = useResponsive();

  const [shorts, setShorts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);

  useEffect(() => {
    setRightPanel(null);
    setContentAlign('center');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign]);

  // Load shorts
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Query short-type posts + recent clips (which are also short-form video)
        const q = query(
          collection(db, 'posts'),
          where('status', '==', 'published'),
          where('type', 'in', ['short', 'clip']),
          orderBy('createdAt', 'desc'),
          limit(30)
        );
        const snap = await getDocs(q);
        const all = [];

        for (const d of snap.docs) {
          const post = { id: d.id, ...d.data() };
          post.author = await getUser(post.authorId);
          post.videoUrl = post.mediaUrls?.[0] || post.mediaUrl || null;
          post.isEmbed = !!(post.embedVideoUrl || post.youtubeVideoId);
          if (post.isEmbed) {
            post.embedParsed = post.youtubeVideoId
              ? { platform: 'youtube', videoId: post.youtubeVideoId }
              : null;
          }
          if (post.videoUrl || post.isEmbed) all.push(post);
        }

        setShorts(all);
      } catch (err) {
        console.error('Failed to load shorts:', err);
      }
      setLoading(false);
    };
    load();
  }, []);

  const current = shorts[currentIndex];

  // Track "short_watched" after 1.5s on a short (consent-gated inside trackEvent)
  useEffect(() => {
    if (!current?.id) return;
    const t = setTimeout(() => {
      trackEvent('short_watched', {
        postId: current.id,
        authorId: current.authorId || current.userId,
        contentType: 'short',
        tags: current.tags?.slice?.(0, 5),
        gameId: current.gameId,
        source: 'shorts',
      });
    }, 1500);
    return () => clearTimeout(t);
  }, [current?.id]);

  const goNext = useCallback(() => {
    if (currentIndex < shorts.length - 1) setCurrentIndex(p => p + 1);
  }, [currentIndex, shorts.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(p => p - 1);
  }, [currentIndex]);

  // Touch
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx)) {
      if (dy > 0) goNext(); else goPrev();
    }
  };

  // Keyboard
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'j') goNext();
      else if (e.key === 'ArrowUp' || e.key === 'k') goPrev();
      else if (e.key === 'Escape') navigate(-1);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [goNext, goPrev, navigate]);

  // Mouse wheel
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let wt;
    const h = (e) => {
      e.preventDefault();
      clearTimeout(wt);
      wt = setTimeout(() => {
        if (e.deltaY > 30) goNext();
        else if (e.deltaY < -30) goPrev();
      }, 100);
    };
    el.addEventListener('wheel', h, { passive: false });
    return () => el.removeEventListener('wheel', h);
  }, [goNext, goPrev]);

  const handleShare = async (post) => {
    const url = `${window.location.origin}/share/clip/${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: post.content?.slice(0, 50) || 'Check this on VERGR', url });
        incrementShareCount(post.id).catch(() => {});
        trackEvent('share', { postId: post.id, authorId: post.authorId || post.userId, contentType: 'short', tags: post.tags?.slice?.(0, 5), gameId: post.gameId });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
        incrementShareCount(post.id).catch(() => {});
      } catch {}
    }
  };

  const fmtCount = (n) => {
    if (!n) return '0';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toString();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-brand-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (shorts.length === 0) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center gap-4">
        <div className="w-20 h-20 rounded-3xl bg-surface-2/30 flex items-center justify-center">
          <Icon name="play_circle" size={44} className="text-text-muted" />
        </div>
        <div className="text-center">
          <p className="text-white font-syne font-bold text-lg">No Shorts Yet</p>
          <p className="text-text-muted text-sm mt-1">Be the first to upload a short clip</p>
        </div>
        <div className="flex gap-3 mt-2">
          <button onClick={() => navigate('/create/short')} className="px-6 py-2.5 rounded-full bg-brand-cyan text-bg-dark font-bold text-sm hover:brightness-110 active:scale-[0.97] transition-all">
            <span className="flex items-center gap-2"><Icon name="add" size={18} /> Create Short</span>
          </button>
          <button onClick={() => navigate(-1)} className="px-6 py-2.5 rounded-full bg-surface-2 text-text-primary text-sm font-semibold">Go Back</button>
        </div>
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
      {current.isEmbed ? (
        <EmbedFullscreen key={current.id} post={current} />
      ) : (
        <VideoPlayer key={current.id} src={current.videoUrl} poster={current.thumbnailUrl} />
      )}

      {/* Swipe zones for embeds */}
      {current.isEmbed && (
        <>
          <div className="absolute top-16 bottom-32 left-0 w-16 z-[5]" style={{ touchAction: 'pan-y' }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} />
          <div className="absolute top-16 bottom-32 right-16 w-16 z-[5]" style={{ touchAction: 'pan-y' }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} />
        </>
      )}

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-4 pb-10 bg-gradient-to-b from-black/70 to-transparent safe-top">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
          <Icon name="arrow_back" size={22} className="text-white" />
        </button>
        <h2 className="font-syne font-bold text-white text-base tracking-tight">Shorts</h2>
        <button onClick={() => navigate('/create/short')} className="w-10 h-10 rounded-full bg-brand-cyan/20 backdrop-blur-md flex items-center justify-center">
          <Icon name="videocam" size={20} className="text-brand-cyan" />
        </button>
      </div>

      {/* Counter pill */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10">
        <span className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white/50 text-[10px] font-dmmono">
          {currentIndex + 1} / {shorts.length}
        </span>
      </div>

      {/* Right engagement bar */}
      <div className="absolute right-3 bottom-36 z-10 flex flex-col items-center gap-5">
        {/* Author avatar */}
        <button onClick={() => navigate(`/user/${current.authorId}`)} className="relative mb-1">
          <UserAvatar src={current.author?.avatar} size={44} className="border-2 border-white" />
        </button>
        <EngageBtn
          icon="favorite"
          count={current.likeCount}
          active={current.isLiked}
          activeColor="text-brand-ember"
          onTap={() => { if (currentUser) { toggleLike?.(current.id, currentUser.uid); trackEvent('like', { postId: current.id, authorId: current.authorId || current.userId, contentType: 'short', tags: current.tags?.slice?.(0, 5), gameId: current.gameId }); } }}
        />
        <EngageBtn icon="chat_bubble" count={current.commentCount} onTap={() => navigate(`/post/${current.id}`)} />
        <EngageBtn icon="bookmark" count={current.saveCount} />
        <EngageBtn icon="share" count={current.shareCount} onTap={() => handleShare(current)} />
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-16 z-10 px-4 pb-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent safe-bottom">
        <div className="flex items-center gap-2.5 mb-2">
          <button onClick={() => navigate(`/user/${current.authorId}`)}>
            <div>
              <p className="text-white font-bold text-sm">{current.author?.displayName || 'User'}</p>
              <p className="text-white/50 text-[11px] font-dmmono">@{current.author?.username}
                {current.createdAt && <span className="ml-2 text-white/30">· {timeAgo(current.createdAt?.toDate ? current.createdAt.toDate() : current.createdAt)}</span>}
              </p>
            </div>
          </button>
        </div>
        {current.content && (
          <p className="text-white/90 text-sm leading-relaxed line-clamp-2">{current.content}</p>
        )}
        {current.hashtags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {current.hashtags.map(tag => (
              <span key={tag} className="text-brand-cyan text-xs font-semibold">#{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Scroll hint */}
      {currentIndex === 0 && shorts.length > 1 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <Icon name="expand_less" size={28} className="text-white/30" />
        </div>
      )}
    </div>
  );
}

// ─── Native video player ───
function VideoPlayer({ src, poster }) {
  const ref = useRef(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.play().catch(() => {});
    setPaused(false);
  }, [src]);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) { v.play(); setPaused(false); }
    else { v.pause(); setPaused(true); }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black" onClick={toggle}>
      <video ref={ref} src={src} poster={poster} loop playsInline className="w-full h-full object-contain" />
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

// ─── Embedded video fullscreen ───
function EmbedFullscreen({ post }) {
  const [loaded, setLoaded] = useState(false);

  let embedSrc = null;
  let posterUrl = null;

  if (post.youtubeVideoId) {
    embedSrc = `https://www.youtube-nocookie.com/embed/${post.youtubeVideoId}?autoplay=1&controls=1&modestbranding=1&rel=0&playsinline=1&mute=0`;
    posterUrl = `https://img.youtube.com/vi/${post.youtubeVideoId}/hqdefault.jpg`;
  } else if (post.embedVideoUrl) {
    const match = post.embedVideoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match) {
      embedSrc = `https://www.youtube-nocookie.com/embed/${match[1]}?autoplay=1&controls=1&modestbranding=1&rel=0&playsinline=1&mute=0`;
      posterUrl = `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
    }
  }

  if (!embedSrc) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black">
      {posterUrl && (
        <img src={posterUrl} alt="" className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${loaded ? 'opacity-0' : 'opacity-100'}`} />
      )}
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[2]">
          <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      )}
      <iframe
        src={embedSrc}
        onLoad={() => setLoaded(true)}
        className="w-full h-full relative z-[1]"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        frameBorder="0"
        title="Short"
      />
    </div>
  );
}

// ─── Engagement button ───
function EngageBtn({ icon, count, active, activeColor, onTap }) {
  const [on, setOn] = useState(active);
  return (
    <button onClick={() => { setOn(!on); onTap?.(); }} className="flex flex-col items-center gap-0.5">
      <div className={`w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center ${on && activeColor ? activeColor : 'text-white'}`}>
        <Icon name={icon} filled={on} size={24} />
      </div>
      <span className="text-white text-[10px] font-dmmono font-bold">
        {count ? (count >= 1000 ? (count / 1000).toFixed(1) + 'K' : count) : ''}
      </span>
    </button>
  );
}
