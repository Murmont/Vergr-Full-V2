import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  THEMES,
  BANNER_FN,
  BUTTON_STYLES_FN,
  SOCIAL_META,
  needsDarkText,
} from '../utils/vergrMeThemes';
import {
  trackPageView,
  trackLinkClick,
  trackMessageTap,
  trackEmailTap,
  trackTipTap,
} from '../utils/vergrMeTracking';

export default function VergrMePage() {
  const { username } = useParams();
  const [data, setData] = useState(null);
  const [uid, setUid] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const unSnap = await getDoc(doc(db, 'usernames', username?.toLowerCase()));
      if (!unSnap.exists()) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const resolvedUid = unSnap.data().uid;
      setUid(resolvedUid);

      const pageSnap = await getDoc(doc(db, 'users', resolvedUid, 'vergrMe', 'page'));
      if (!pageSnap.exists() || !pageSnap.data().isPublic) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const pageData = pageSnap.data();
      setData(pageData);

      if (pageData.useProfileAvatar) {
        const profileSnap = await getDoc(doc(db, 'users', resolvedUid));
        setAvatarUrl(profileSnap.data()?.avatar || profileSnap.data()?.photoURL || null);
      } else {
        setAvatarUrl(pageData.customAvatarUrl);
      }

      setLoading(false);
      trackPageView(resolvedUid);
      document.title = `${pageData.displayName} — vergr.me`;
      document
        .querySelector('meta[name="description"]')
        ?.setAttribute('content', pageData.bio || '');
    }
    load();
  }, [username]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0b0b0d]">
        <div className="w-8 h-8 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 bg-[#0b0b0d] text-white">
        <p className="text-lg font-semibold">Page not found</p>
        <p className="text-sm text-white/40">vergr.me/{username} doesn't exist</p>
        <a href="https://vergr.app" className="text-brand-cyan text-sm mt-2">
          Join Vergr for free
        </a>
      </div>
    );
  }

  const t = THEMES[data.theme || 'dark'];
  const accent = data.accentColor || '#00e5ff';
  const atc = needsDarkText(accent) ? '#111' : '#fff';
  const bannerBg =
    data.bannerStyle === 'image' && data.bannerUrl
      ? `url(${data.bannerUrl}) center/cover no-repeat`
      : BANNER_FN[data.bannerStyle || 'gradient'](accent, t.bg);
  const btnSty = BUTTON_STYLES_FN[data.buttonStyle || 'card'](accent, t);

  const activeSocials = Object.entries(data.socials || {}).filter(([, v]) => v);
  const enabledLinks = (data.links || [])
    .filter((l) => l.enabled)
    .sort((a, b) => a.order - b.order);

  const handleMessage = () => {
    trackMessageTap(uid);
    const deep = `vergr://chat/new?uid=${uid}`;
    const fallback = `https://vergr.app/install?ref=${uid}&from=vergrme`;
    window.location = deep;
    setTimeout(() => (window.location = fallback), 1500);
  };

  const handleLink = (link) => {
    trackLinkClick(uid, link.id);
    window.open(link.url, '_blank', 'noopener');
  };

  const handleEmail = () => {
    trackEmailTap(uid);
    window.location = `mailto:${data.contactEmail}`;
  };

  const handleTip = () => {
    trackTipTap(uid);
    window.location = `vergr://tip?uid=${uid}`;
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: t.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <style>{`
        .lbtn:hover{opacity:0.82;transform:translateY(-1px)}
        .lbtn:active{transform:scale(0.97);opacity:0.75}
        .sbtn:hover{opacity:0.7}
        .mbtn:hover{opacity:0.88;transform:translateY(-1px)}
      `}</style>

      <div className="w-full max-w-[480px]">
        <div style={{ height: 120, background: bannerBg, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              bottom: -34,
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            <div style={{ position: 'relative', width: 70, height: 70 }}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={data.displayName}
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: `3px solid ${t.bg}`,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: '50%',
                    background: t.surface,
                    border: `3px solid ${t.bg}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 26,
                    color: t.text,
                  }}
                >
                  {(data.displayName || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <div
                style={{
                  position: 'absolute',
                  inset: -3,
                  borderRadius: '50%',
                  border: `2px solid ${accent}`,
                  pointerEvents: 'none',
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3.5 pt-[46px] pb-12 px-5">
          <div className="flex flex-col items-center gap-1">
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: t.text,
                letterSpacing: '-0.02em',
              }}
            >
              {data.displayName}
            </h1>
            <p style={{ fontSize: 13, color: t.textSub }}>@{data.username}</p>
          </div>

          {data.bio && (
            <p
              style={{
                fontSize: 13,
                color: t.textSub,
                textAlign: 'center',
                lineHeight: 1.6,
                maxWidth: 320,
              }}
            >
              {data.bio}
            </p>
          )}

          {data.showFollowers && data.followerCount > 0 && (
            <p style={{ fontSize: 12, color: t.textMuted }}>
              {data.followerCount.toLocaleString()} followers
            </p>
          )}

          {data.showMessageBtn && (
            <button
              className="mbtn"
              onClick={handleMessage}
              style={{
                width: '100%',
                padding: '13px 16px',
                borderRadius: 14,
                border: 'none',
                background: accent,
                color: atc,
                fontSize: 15,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <span>💬</span> Message on Vergr
            </button>
          )}

          {data.showEmail && data.contactEmail && (
            <button
              className="lbtn"
              onClick={handleEmail}
              style={{
                width: '100%',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                ...btnSty,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: t.iconBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                }}
              >
                ✉️
              </div>
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: 14, fontWeight: 500, color: t.text }}>
                  Connect with me
                </div>
                <div style={{ fontSize: 11, color: t.textSub, marginTop: 2 }}>
                  {data.contactEmail}
                </div>
              </div>
              <span style={{ fontSize: 16, color: t.textMuted }}>›</span>
            </button>
          )}

          {data.showSocials && activeSocials.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center">
              {activeSocials.map(([key, handle]) => (
                <a
                  key={key}
                  href={`${SOCIAL_META[key]?.baseUrl}${handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sbtn flex items-center justify-center w-9 h-9 rounded-lg text-xs font-bold no-underline"
                  style={{
                    background: t.surface,
                    border: `0.5px solid ${t.border}`,
                    color: t.textSub,
                  }}
                >
                  {SOCIAL_META[key]?.label}
                </a>
              ))}
            </div>
          )}

          {enabledLinks.map((link) => (
            <button
              key={link.id}
              className="lbtn"
              onClick={() => handleLink(link)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                ...btnSty,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: t.iconBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                }}
              >
                {link.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: t.text,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {link.title}
                </div>
                {link.subtitle && (
                  <div
                    style={{
                      fontSize: 11,
                      color: t.textSub,
                      marginTop: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {link.subtitle}
                  </div>
                )}
              </div>
              <span style={{ fontSize: 16, color: t.textMuted }}>›</span>
            </button>
          ))}

          {data.tipJarEnabled && (
            <button
              className="lbtn"
              onClick={handleTip}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                background: `${accent}15`,
                border: `1px solid ${accent}30`,
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: `${accent}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                }}
              >
                ☕
              </div>
              <div className="flex-1">
                <div style={{ fontSize: 14, fontWeight: 600, color: accent }}>
                  {data.tipJarLabel || 'Buy me a coffee'}
                </div>
                <div style={{ fontSize: 11, color: t.textSub, marginTop: 2 }}>
                  Support via Vergr
                </div>
              </div>
              <span style={{ fontSize: 16, color: accent }}>›</span>
            </button>
          )}

          <div className="flex flex-col items-center gap-2 mt-6">
            <p style={{ fontSize: 11, color: t.textMuted }}>Made with Vergr</p>
            <a
              href="https://vergr.app"
              style={{
                background: accent,
                color: atc,
                padding: '8px 18px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Join Vergr for free
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}