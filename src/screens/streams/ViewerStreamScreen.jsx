// src/screens/streams/ViewerStreamScreen.jsx
// Viewer-side live stream UI. In preview/dummy mode, plays a placeholder video
// and simulates chat. Swap to Gcore HLS playback once live.
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import { useUI } from '../../context/UIContext';
import useResponsive from '../../hooks/useResponsive';
import TopBar from '../../components/TopBar';
import Icon from '../../components/Icon';
import { CoinIcon } from '../../components/CoinIcon';
import UserAvatar from '../../components/UserAvatar';
import {
  getPlaybackUrl,
  getDummyViewerCount,
  PREVIEW_CHAT_MESSAGES,
  GCORE_CONFIG,
} from '../../utils/streamConfig';
import {
  sanitizeMessage,
  canSendNow,
  isDuplicate,
  recordSent,
  stripLinksForViewer,
  CHAT_DEFAULTS,
} from '../../utils/chatModeration';
import { moderateChatMessage, reportStream } from '../../utils/streamModeration';

export default function ViewerStreamScreen() {
  const { streamId = 'preview-stream' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { profile } = useUser();
  const { showToast } = useUI();

  const { isDesktop } = useResponsive();
  const isPreview = searchParams.get('preview') === '1' || !GCORE_CONFIG.enabled;
  const videoRef = useRef(null);
  const chatEndRef = useRef(null);
  const inactivityRef = useRef(null);
  const heartsRef = useRef(null);

  const [viewerCount, setViewerCount] = useState(getDummyViewerCount(streamId));
  const [chatMessages, setChatMessages] = useState(PREVIEW_CHAT_MESSAGES);
  const [chatInput, setChatInput] = useState('');
  const [liked, setLiked] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [tipSent, setTipSent] = useState(false);
  const [customTipAmount, setCustomTipAmount] = useState('');
  const [panel, setPanel] = useState('chat'); // 'chat' | 'tip' | 'report' | 'settings' | null — chat open by default on mobile
  const [controlsVisible, setControlsVisible] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [lowLatency, setLowLatency] = useState(true);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [chatFontSize, setChatFontSize] = useState('md'); // sm | md | lg
  const [hearts, setHearts] = useState([]);
  const [reportReason, setReportReason] = useState('');
  const [uiHidden, setUiHidden] = useState(false);
  const [chatProfile, setChatProfile] = useState(null); // { user, color } — selected chat user for quick profile card
  const swipeRef = useRef({ x0: 0, y0: 0, t: 0 });

  const streamMeta = {
    title: isPreview ? 'Preview: Friday Night Valorant Grind' : 'Live Stream',
    broadcasterName: 'NovaKill',
    broadcasterAvatar: null,
    game: 'Valorant',
    category: 'Gameplay',
  };

  // Viewer count drift
  useEffect(() => {
    const id = setInterval(() => setViewerCount(getDummyViewerCount(streamId)), 4000);
    return () => clearInterval(id);
  }, [streamId]);

  // Simulated incoming chat in preview
  useEffect(() => {
    if (!isPreview) return;
    const samples = [
      'nice shot', 'LOL', 'GG', 'how many hours today', 'which crosshair?',
      '👀', 'yooo', 'clip that', 'follow the host!', 'tipped 🎁',
    ];
    const names = ['PhantomStrike', 'NeonByte', 'ZeroCool', 'IcyMint', 'TurboTako'];
    const id = setInterval(() => {
      setChatMessages(m => [
        ...m.slice(-60),
        {
          id: `sim_${Date.now()}`,
          user: names[Math.floor(Math.random() * names.length)],
          text: samples[Math.floor(Math.random() * samples.length)],
          color: ['#5CE1E6', '#B537F2', '#FFB84D', '#FF5A7A', '#7DD87D'][Math.floor(Math.random() * 5)],
        },
      ]);
    }, 3500);
    return () => clearInterval(id);
  }, [isPreview]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Cooldown tick
  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const id = setInterval(() => setCooldownLeft(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldownLeft]);

  const sendChat = async () => {
    const uid = currentUser?.uid || 'local-viewer';
    const rate = canSendNow(uid, 0);
    if (!rate.ok) { showToast(rate.error, 'error'); setCooldownLeft(rate.cooldownSec || 0); return; }
    const clean = sanitizeMessage(chatInput);
    if (!clean.ok) { showToast(clean.error, 'error'); return; }
    let text = stripLinksForViewer(clean.cleaned); // viewers can't post clickable links by default
    if (isDuplicate(uid, text)) { showToast("Please don't spam the same message.", 'error'); return; }

    // Run through Gemini before posting — fail-open on network error
    const aiCheck = await moderateChatMessage(text, streamId);
    if (!aiCheck.ok) { showToast(`Message blocked: ${aiCheck.reason}`, 'error'); return; }

    recordSent(uid, text);
    setChatMessages(m => [...m, {
      id: `local_${Date.now()}`,
      user: profile?.displayName || 'You',
      text,
      color: '#5CE1E6',
    }]);
    setChatInput('');
    if (clean.warning) showToast(clean.warning, 'info');
  };

  // Auto-hide floating bar (mobile only)
  const bumpControls = useCallback(() => {
    setControlsVisible(true);
    clearTimeout(inactivityRef.current);
    inactivityRef.current = setTimeout(() => setControlsVisible(false), 4000);
  }, []);
  useEffect(() => { if (!isDesktop) bumpControls(); return () => clearTimeout(inactivityRef.current); }, [isDesktop, bumpControls]);

  const toggleFullscreen = () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().then(() => setFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setFullscreen(false)).catch(() => {});
    }
  };

  const enterPiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await videoRef.current.requestPictureInPicture();
    } catch (err) { showToast('Picture-in-picture not available', 'error'); }
  };

  const spawnHeart = () => {
    const h = { id: `h_${Date.now()}_${Math.random()}`, x: 30 + Math.random() * 40, drift: (Math.random() - 0.5) * 30 };
    setHearts(arr => [...arr, h]);
    setTimeout(() => setHearts(arr => arr.filter(x => x.id !== h.id)), 1500);
  };
  const onLike = () => {
    setLiked(true);
    spawnHeart();
  };

  // Swipe handlers — swipe right = hide UI (show only video + top bar),
  // swipe left = show UI again
  const onSwipeStart = (e) => {
    const t = e.touches?.[0];
    if (!t) return;
    swipeRef.current = { x0: t.clientX, y0: t.clientY, t: Date.now() };
  };
  const onSwipeMove = () => {};
  const onSwipeEnd = (e) => {
    const end = e.changedTouches?.[0];
    if (!end) return;
    const dx = end.clientX - swipeRef.current.x0;
    const dy = end.clientY - swipeRef.current.y0;
    const dt = Date.now() - swipeRef.current.t;
    if (dt < 500 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0) setUiHidden(true);   // swipe right → hide
      else setUiHidden(false);          // swipe left → show
    }
  };

  const submitReport = async () => {
    if (!reportReason) { showToast('Pick a reason', 'error'); return; }
    await reportStream(streamId, reportReason, '');
    showToast('Report submitted to moderators', 'success');
    setReportReason('');
    setPanel(null);
  };

  const sendTip = (amount) => {
    const amt = Number(amount);
    if (!amt || amt < 1) { showToast('Pick a tip amount', 'error'); return; }
    setTipSent(true);
    setPanel(null);
    setCustomTipAmount('');
    showToast(`Tip sent! +${amt} coins to broadcaster`, 'success');
    setChatMessages(m => [...m, {
      id: `tip_${Date.now()}`,
      user: profile?.displayName || 'You',
      text: `tipped ${amt} coins`,
      color: '#FFB84D',
    }]);
  };

  const playbackUrl = getPlaybackUrl(streamId);
  const fontClass = chatFontSize === 'sm' ? 'text-xs' : chatFontSize === 'lg' ? 'text-base' : 'text-sm';

  // ─── MOBILE / TOUCH IMMERSIVE (stays active in landscape) ───────
  const isTouchPhone = typeof window !== 'undefined' &&
    window.matchMedia?.('(hover: none) and (pointer: coarse)').matches;
  const immersive = !isDesktop || isTouchPhone;
  if (immersive) {
    return (
      <div className="fixed inset-0 z-[90] bg-black overflow-hidden select-none">
        {isPreview ? (
          <div className="absolute inset-0 bg-gradient-to-br from-brand-violet/25 via-bg-dark to-brand-cyan/25 flex items-center justify-center">
            <div className="text-center">
              <Icon name="play_circle" size={72} className="text-white/40 mx-auto mb-2" />
              <p className="text-white/60 text-sm font-bold">Preview Stream</p>
            </div>
          </div>
        ) : (
          <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" src={playbackUrl} />
        )}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/70 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/75 to-transparent" />

        {/* Heart burst overlay */}
        <div className="pointer-events-none absolute inset-0">
          {hearts.map(h => (
            <div key={h.id} className="absolute bottom-28" style={{ left: `${h.x}%`, animation: 'floatUp 1.5s ease-out forwards' }}>
              <Icon name="favorite" size={28} className="text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
            </div>
          ))}
        </div>
        <style>{`@keyframes floatUp { 0% { transform: translateY(0) scale(0.6); opacity: 1; } 100% { transform: translateY(-220px) scale(1.3); opacity: 0; } }`}</style>

        {/* Top bar — always visible; streamer pill and viewer pill are clickable */}
        <div className="absolute top-0 inset-x-0 px-4 pt-3 flex items-center gap-2 z-[3]" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center shrink-0">
            <Icon name="arrow_back_ios_new" size={16} className="text-white" />
          </button>
          <button onClick={() => setPanel('streamerCard')}
            className="flex-1 flex items-center gap-2 min-w-0 px-2 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
            <UserAvatar src={streamMeta.broadcasterAvatar} size={22} />
            <span className="text-white text-xs font-bold truncate">{streamMeta.broadcasterName}</span>
            <span className="w-1 h-1 rounded-full bg-white/40 shrink-0" />
            <span className="text-white/60 text-[11px] truncate">{streamMeta.game}</span>
          </button>
          <button onClick={() => setPanel('viewers')}
            className="flex items-center gap-2 px-3 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-white text-[11px] font-bold tracking-widest">LIVE</span>
            <span className="text-white/50">·</span>
            <Icon name="visibility" size={12} className="text-white/70" />
            <span className="text-white text-[11px] font-dmmono">{viewerCount.toLocaleString()}</span>
          </button>
        </div>

        {/* Chat hide toggle (small eye icon at top-right for the rest of UI) */}
        <button onClick={() => setUiHidden(h => !h)} aria-label={uiHidden ? 'Show UI' : 'Hide UI'}
          className="absolute right-3 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center z-[4]"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 60px)' }}>
          <Icon name={uiHidden ? 'visibility' : 'visibility_off'} size={16} className="text-white" />
        </button>

        {/* Swipe-to-hide gesture zone (right half of video) */}
        <div
          onTouchStart={onSwipeStart}
          onTouchMove={onSwipeMove}
          onTouchEnd={onSwipeEnd}
          onClick={onLike}
          aria-label="Tap for heart, swipe to hide chat"
          className="absolute inset-x-0 top-20 bottom-36 z-[1]" />

        {/* Right-side vertical action rail — TikTok Live pattern (hides on swipe) */}
        {!uiHidden && (
        <div className="absolute right-3 flex flex-col items-center gap-4 z-[2] transition-opacity duration-200"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)' }}>
          <RailBtn icon={followed ? 'check' : 'person_add'} label={followed ? 'Following' : 'Follow'}
            onClick={() => setFollowed(f => !f)} active={followed} tone={followed ? 'subtle' : 'accent'} />
          <RailBtn icon={liked ? 'favorite' : 'favorite_border'} label={hearts.length ? `${hearts.length * 10 + 142}` : '142'}
            onClick={onLike} active={liked} tone="like" />
          <RailBtn icon="paid" label="Tip" onClick={() => setPanel('tip')} tone="gold" />
          <RailBtn icon="share" label="Share"
            onClick={() => navigator.share?.({ url: window.location.href, title: `${streamMeta.broadcasterName} is live` }).catch(() => {}) || showToast('Link copied', 'success')} />
          <RailBtn icon="more_horiz" label="More" onClick={() => setPanel('settings')} />
        </div>
        )}

        {/* Scrollable chat overlay (TikTok-style, bottom-left) — hidden when UI hidden */}
        {!uiHidden && (
        <div className="absolute left-2 pointer-events-auto z-[2]"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 68px)', right: '72px', maxHeight: '42vh' }}>
          <div className="flex flex-col justify-end gap-1 max-h-[42vh] overflow-y-auto overscroll-contain"
            style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 100%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 100%)' }}>
            {chatMessages.map((m) => (
              <button key={m.id} onClick={() => setChatProfile(m)}
                className={`${fontClass} leading-snug drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] text-left`}>
                <span className="font-bold mr-1.5 hover:underline" style={{ color: m.color }}>{m.user}</span>
                <span className="text-white/95 break-words">{m.text}</span>
              </button>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>
        )}

        {/* Always-on chat input (hides when UI hidden) */}
        {!uiHidden && (
        <div className="absolute left-3 right-3 pointer-events-auto z-[2]"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)' }}>
          <VChatInput value={chatInput} onChange={setChatInput} onSend={sendChat} cooldownLeft={cooldownLeft} />
        </div>
        )}

        {/* Tip bottom sheet */}
        <VSheet open={panel === 'tip'} onClose={() => setPanel(null)} title="Send a Tip">
          <TipBody broadcaster={streamMeta.broadcasterName} customTipAmount={customTipAmount} setCustomTipAmount={setCustomTipAmount} sendTip={sendTip} />
        </VSheet>

        {/* Report sheet */}
        <VSheet open={panel === 'report'} onClose={() => setPanel(null)} title="Report Stream">
          <ReportBody reason={reportReason} setReason={setReportReason} onSubmit={submitReport} />
        </VSheet>

        {/* Settings sheet */}
        <VSheet open={panel === 'settings'} onClose={() => setPanel(null)} title="Viewing Options">
          <ViewerSettings
            lowLatency={lowLatency} setLowLatency={setLowLatency}
            chatFontSize={chatFontSize} setChatFontSize={setChatFontSize}
            onShare={() => navigator.share?.({ url: window.location.href }) || showToast('Link copied', 'success')}
            onReport={() => setPanel('report')}
          />
        </VSheet>

        {/* Streamer profile card */}
        <VSheet open={panel === 'streamerCard'} onClose={() => setPanel(null)} title="Streamer">
          <StreamerCard meta={streamMeta} viewerCount={viewerCount} followed={followed}
            onFollow={() => setFollowed(f => !f)}
            onTip={() => setPanel('tip')}
            onReport={() => setPanel('report')} />
        </VSheet>

        {/* Viewers list */}
        <VSheet open={panel === 'viewers'} onClose={() => setPanel(null)} title={`${viewerCount.toLocaleString()} watching`}>
          <ViewersList viewerCount={viewerCount} />
        </VSheet>

        {/* Chat user quick card (tap chat username) */}
        <VSheet open={!!chatProfile} onClose={() => setChatProfile(null)} title="Viewer">
          <ChatUserCard profile={chatProfile} onClose={() => setChatProfile(null)} />
        </VSheet>
      </div>
    );
  }

  // ─── DESKTOP ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-24 lg:pb-8">
      <TopBar title={streamMeta.title} showBack />

      {isPreview && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-xl bg-brand-violet/10 border border-brand-violet/30 flex items-center gap-2">
          <Icon name="preview" size={16} className="text-brand-violet" />
          <span className="text-brand-violet text-xs font-bold">Preview Mode</span>
          <span className="text-text-muted text-xs">— showing mock stream while Gcore is not connected.</span>
        </div>
      )}

      <div className="px-4 py-4 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
        {/* Player + meta */}
        <div className="space-y-3">
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-white/[0.06]">
            {isPreview ? (
              <div className="absolute inset-0 bg-gradient-to-br from-brand-violet/20 via-bg-dark to-brand-cyan/20 flex items-center justify-center">
                <div className="text-center">
                  <Icon name="play_circle" size={64} className="text-white/40 mx-auto mb-2" />
                  <p className="text-white/60 text-sm font-bold">Preview Stream</p>
                  <p className="text-text-muted text-xs mt-1">{playbackUrl}</p>
                </div>
              </div>
            ) : (
              <video ref={videoRef} autoPlay playsInline controls className="w-full h-full object-cover" src={playbackUrl} />
            )}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-brand-ember text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                LIVE
              </span>
            </div>
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 text-white text-xs font-dmmono flex items-center gap-1.5">
              <Icon name="visibility" size={14} />
              {viewerCount.toLocaleString()}
            </div>
          </div>

          {/* Broadcaster header */}
          <div className="p-4 rounded-2xl bg-surface-1 border border-white/[0.06] flex items-center gap-3">
            <UserAvatar src={streamMeta.broadcasterAvatar} size={44} />
            <div className="flex-1 min-w-0">
              <p className="text-text-primary text-sm font-bold truncate">{streamMeta.broadcasterName}</p>
              <p className="text-text-muted text-xs">{streamMeta.category} · {streamMeta.game}</p>
            </div>
            <button onClick={() => setFollowed(f => !f)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                followed ? 'bg-surface-2 text-text-secondary border border-white/[0.06]' : 'bg-brand-cyan text-bg-dark'
              }`}>
              {followed ? 'Following' : 'Follow'}
            </button>
          </div>

          {/* Action bar */}
          <div className="flex items-center gap-2">
            <ActionBtn icon={liked ? 'favorite' : 'favorite_border'} label="Like"
              active={liked} onClick={onLike} color="text-brand-ember" />
            <ActionBtn icon="attach_money" label={tipSent ? 'Tipped' : 'Tip'}
              active={tipSent} onClick={() => setPanel('tip')} color="text-brand-gold" />
            <ActionBtn icon="picture_in_picture_alt" label="PiP" onClick={enterPiP} />
            <ActionBtn icon={fullscreen ? 'fullscreen_exit' : 'fullscreen'} label={fullscreen ? 'Exit' : 'Fullscreen'} onClick={toggleFullscreen} />
            <ActionBtn icon="share" label="Share"
              onClick={() => navigator.share?.({ url: window.location.href }) || showToast('Link copied', 'success')} />
            <ActionBtn icon="flag" label="Report" onClick={() => setPanel('report')} />
          </div>
        </div>

        {/* Chat */}
        <div className="flex flex-col rounded-2xl bg-surface-1 border border-white/[0.06] overflow-hidden h-[520px] lg:h-[calc(100vh-180px)]">
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <span className="text-text-primary text-sm font-bold">Stream Chat</span>
            <span className="text-text-muted text-xs">{viewerCount.toLocaleString()} watching</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 text-sm">
            {chatMessages.map(m => (
              <div key={m.id} className="flex items-start gap-1.5">
                <span className="font-bold text-xs shrink-0" style={{ color: m.color }}>{m.user}:</span>
                <span className="text-text-secondary break-words">{m.text}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="p-3 border-t border-white/[0.06]">
            <VChatInput value={chatInput} onChange={setChatInput} onSend={sendChat} cooldownLeft={cooldownLeft} />
          </div>
        </div>
      </div>

      {/* Tip sheet (desktop uses centered modal via VSheet lg styles) */}
      <VSheet open={panel === 'tip'} onClose={() => setPanel(null)} title="Send a Tip">
        <TipBody broadcaster={streamMeta.broadcasterName} customTipAmount={customTipAmount} setCustomTipAmount={setCustomTipAmount} sendTip={sendTip} />
      </VSheet>
      <VSheet open={panel === 'report'} onClose={() => setPanel(null)} title="Report Stream">
        <ReportBody reason={reportReason} setReason={setReportReason} onSubmit={submitReport} />
      </VSheet>
      <VSheet open={panel === 'settings'} onClose={() => setPanel(null)} title="Viewing Options">
        <ViewerSettings
          lowLatency={lowLatency} setLowLatency={setLowLatency}
          chatFontSize={chatFontSize} setChatFontSize={setChatFontSize}
          fullscreen={fullscreen}
          onToggleFullscreen={toggleFullscreen}
          onPopOut={enterPiP}
          onShare={() => navigator.share?.({ url: window.location.href }) || showToast('Link copied', 'success')}
          onReport={() => setPanel('report')}
        />
      </VSheet>

      <VSheet open={panel === 'streamerCard'} onClose={() => setPanel(null)} title="Streamer">
        <StreamerCard meta={streamMeta} viewerCount={viewerCount} followed={followed}
          onFollow={() => setFollowed(f => !f)}
          onTip={() => setPanel('tip')}
          onReport={() => setPanel('report')} />
      </VSheet>
      <VSheet open={panel === 'viewers'} onClose={() => setPanel(null)} title={`${viewerCount.toLocaleString()} watching`}>
        <ViewersList viewerCount={viewerCount} />
      </VSheet>
      <VSheet open={!!chatProfile} onClose={() => setChatProfile(null)} title="Viewer">
        <ChatUserCard profile={chatProfile} onClose={() => setChatProfile(null)} />
      </VSheet>
    </div>
  );
}

function ActionBtn({ icon, label, onClick, active = false, color = 'text-text-secondary' }) {
  return (
    <button onClick={onClick}
      className={`flex-1 py-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${
        active ? 'border-white/[0.12] bg-surface-2' : 'border-white/[0.06] bg-surface-1 hover:bg-surface-2'
      }`}>
      <Icon name={icon} size={16} className={active ? color : 'text-text-muted'} />
      <span className={`text-xs font-bold ${active ? color : 'text-text-secondary'}`}>{label}</span>
    </button>
  );
}

// ─── Immersive mobile viewer components ────────────────────────────────
function RailBtn({ icon, onClick, label, active = false, tone = 'default' }) {
  const bg = {
    default: 'bg-black/40 border-white/15 text-white',
    subtle:  'bg-white/15 border-white/20 text-white',
    accent:  'bg-accent-primary border-accent-primary text-black',
    gold:    'bg-gradient-to-br from-amber-400 to-yellow-600 border-amber-300 text-black',
    like:    active ? 'bg-rose-500 border-rose-400 text-white' : 'bg-black/40 border-white/15 text-white',
  }[tone];
  return (
    <button onClick={onClick} aria-label={label}
      className="flex flex-col items-center gap-1">
      <span className={`w-12 h-12 rounded-full backdrop-blur-md border flex items-center justify-center transition-all shadow-[0_6px_20px_rgba(0,0,0,0.4)] ${bg}`}>
        <Icon name={icon} size={22} />
      </span>
      {label && <span className="text-[11px] font-bold text-white leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] max-w-[60px] truncate">{label}</span>}
    </button>
  );
}

function VCircle({ icon, onClick, active = false, tone = 'default', label }) {
  const toneMap = {
    default: active ? 'bg-white/20 text-white' : 'bg-white/10 text-white hover:bg-white/15',
    accent:  'bg-accent-primary text-black hover:brightness-110',
    danger:  'bg-red-500/90 text-white hover:bg-red-500',
    like:    active ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/15',
  };
  return (
    <button onClick={onClick} aria-label={label}
      className="flex flex-col items-center gap-1 min-w-[44px]">
      <span className={`w-10 h-10 rounded-full backdrop-blur-md border border-white/10 flex items-center justify-center transition-all ${toneMap[tone]}`}>
        <Icon name={icon} size={18} />
      </span>
      {label && <span className="text-[10px] font-semibold text-white/90 leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{label}</span>}
    </button>
  );
}

function VDrawer({ open, onClose, side = 'right', children, title }) {
  if (!open) return null;
  const sideCls = side === 'right' ? 'right-0' : 'left-0';
  const translate = side === 'right' ? 'translate-x-0' : 'translate-x-0';
  return (
    <div className="fixed inset-0 z-[60]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute top-0 bottom-0 ${sideCls} w-[88%] max-w-md bg-surface-0/95 backdrop-blur-xl border-l border-white/[0.06] flex flex-col ${translate}`}>
        {title && (
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="text-sm font-bold text-text-primary">{title}</h3>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center">
              <Icon name="x" size={16} className="text-text-secondary" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

function VSheet({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute left-0 right-0 bottom-0 lg:inset-0 lg:m-auto lg:w-[440px] lg:h-max lg:rounded-2xl bg-surface-0 border-t lg:border border-white/[0.06] rounded-t-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
          <h3 className="text-sm font-bold text-text-primary">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center">
            <Icon name="x" size={16} className="text-text-secondary" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

function VChatInput({ value, onChange, onSend, cooldownLeft = 0 }) {
  const disabled = cooldownLeft > 0;
  const canSend = !disabled && value.trim().length > 0;
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (canSend) onSend(); }} className="flex items-center gap-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={disabled ? `Wait ${cooldownLeft}s…` : 'Say something…'}
        maxLength={CHAT_DEFAULTS.maxChars}
        disabled={disabled}
        className="flex-1 bg-black/55 backdrop-blur-md border border-white/15 rounded-full px-4 py-2.5 text-sm text-white placeholder-white/60 focus:outline-none focus:border-white/30 disabled:opacity-50"
      />
      <button type="submit" disabled={!canSend}
        className={`px-4 h-10 rounded-full text-sm font-bold flex items-center gap-1.5 transition-all ${canSend ? 'bg-rose-500 text-white shadow-[0_4px_14px_rgba(244,63,94,0.45)]' : 'bg-white/10 text-white/40'}`}>
        <Icon name="send" size={14} />
        Send
      </button>
    </form>
  );
}

function TipBody({ broadcaster, customTipAmount, setCustomTipAmount, sendTip }) {
  const presets = [10, 50, 100, 500, 1000, 5000];
  return (
    <div className="p-4 space-y-4">
      <p className="text-xs text-text-secondary">Support {broadcaster} with coins.</p>
      <div className="grid grid-cols-3 gap-2">
        {presets.map((amt) => (
          <button key={amt} onClick={() => sendTip(amt)}
            className="py-3 rounded-xl bg-gradient-to-br from-amber-500/15 to-yellow-600/10 hover:from-amber-500/25 hover:to-yellow-600/20 border border-amber-400/20 text-sm font-bold text-amber-200 flex items-center justify-center gap-1.5">
            <CoinIcon size={14} />
            {amt.toLocaleString()}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2"><CoinIcon size={14} /></div>
          <input
            type="number" min="1" max="100000"
            value={customTipAmount}
            onChange={(e) => setCustomTipAmount(e.target.value)}
            placeholder="Custom amount"
            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl pl-9 pr-3 py-2 text-sm text-text-primary focus:outline-none focus:border-amber-400/40"
          />
        </div>
        <button onClick={() => sendTip(Number(customTipAmount))}
          disabled={!customTipAmount || Number(customTipAmount) < 1}
          className="px-4 py-2 rounded-xl bg-amber-500 text-black text-sm font-bold disabled:opacity-40">
          Send
        </button>
      </div>
    </div>
  );
}

function ReportBody({ reason, setReason, onSubmit }) {
  const options = [
    { v: 'harassment', l: 'Harassment or hate' },
    { v: 'sexual',     l: 'Sexual content' },
    { v: 'violence',   l: 'Violence or gore' },
    { v: 'illegal',    l: 'Illegal activity' },
    { v: 'spam',       l: 'Spam or scam' },
    { v: 'other',      l: 'Other' },
  ];
  return (
    <div className="p-4 space-y-3">
      <p className="text-xs text-text-secondary">Your report is anonymous. Moderators will review the stream.</p>
      <div className="space-y-2">
        {options.map((o) => (
          <button key={o.v} onClick={() => setReason(o.v)}
            className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
              reason === o.v ? 'border-accent-primary bg-accent-primary/10 text-text-primary' : 'border-white/[0.06] bg-white/[0.02] text-text-secondary hover:bg-white/[0.04]'
            }`}>
            {o.l}
          </button>
        ))}
      </div>
      <button onClick={onSubmit} disabled={!reason}
        className="w-full py-3 rounded-xl bg-red-500 text-white text-sm font-bold disabled:opacity-40">
        Submit report
      </button>
    </div>
  );
}

function ViewerSettings({ lowLatency, setLowLatency, chatFontSize, setChatFontSize, onShare, onReport, onToggleFullscreen, onPopOut, fullscreen }) {
  const sizes = [
    { v: 'sm', l: 'Small' },
    { v: 'md', l: 'Medium' },
    { v: 'lg', l: 'Large' },
  ];
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-text-primary">Low-latency mode</div>
          <div className="text-xs text-text-muted">Reduce delay (may buffer more)</div>
        </div>
        <button onClick={() => setLowLatency(!lowLatency)}
          className={`w-11 h-6 rounded-full transition-colors relative ${lowLatency ? 'bg-accent-primary' : 'bg-white/10'}`}>
          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${lowLatency ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>
      <div>
        <div className="text-sm font-semibold text-text-primary mb-2">Chat font size</div>
        <div className="grid grid-cols-3 gap-2">
          {sizes.map((s) => (
            <button key={s.v} onClick={() => setChatFontSize(s.v)}
              className={`py-2 rounded-xl border text-sm ${chatFontSize === s.v ? 'border-accent-primary bg-accent-primary/10 text-text-primary' : 'border-white/[0.06] bg-white/[0.02] text-text-secondary'}`}>
              {s.l}
            </button>
          ))}
        </div>
      </div>
      <div className="pt-2 border-t border-white/[0.06] space-y-2">
        {onPopOut && (
          <button onClick={onPopOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] text-sm text-text-primary">
            <Icon name="picture_in_picture_alt" size={16} className="text-text-secondary" />
            Pop-out mini player
            <span className="ml-auto text-[10px] text-text-muted">Keeps playing over other apps</span>
          </button>
        )}
        {onToggleFullscreen && (
          <button onClick={onToggleFullscreen}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] text-sm text-text-primary">
            <Icon name={fullscreen ? 'fullscreen_exit' : 'fullscreen'} size={16} className="text-text-secondary" />
            {fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          </button>
        )}
        <button onClick={onShare}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] text-sm text-text-primary">
          <Icon name="share" size={16} className="text-text-secondary" />
          Share stream
        </button>
        <button onClick={onReport}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-sm text-red-400">
          <Icon name="flag" size={16} />
          Report stream
        </button>
      </div>
    </div>
  );
}

// Streamer profile card — shown when tapping the streamer pill in the top bar
function StreamerCard({ meta, viewerCount, followed, onFollow, onTip, onReport }) {
  const stats = [
    { label: 'Viewers', value: viewerCount.toLocaleString() },
    { label: 'Followers', value: '24.8K' },
    { label: 'Streams', value: '312' },
  ];
  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-3">
        <UserAvatar src={meta.broadcasterAvatar} size={64} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-text-primary text-lg font-extrabold truncate">{meta.broadcasterName}</p>
            <Icon name="verified" size={16} className="text-brand-cyan" />
          </div>
          <p className="text-text-muted text-xs">@{meta.broadcasterName.toLowerCase()}</p>
          <p className="text-text-secondary text-xs mt-0.5">{meta.category} · {meta.game}</p>
        </div>
      </div>
      <p className="text-sm text-text-secondary leading-relaxed">
        Streaming {meta.game} most nights. Chill vibes, competitive matches, and the occasional rage.
      </p>
      <div className="grid grid-cols-3 gap-2 pt-1">
        {stats.map(s => (
          <div key={s.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 text-center">
            <div className="text-text-primary text-sm font-extrabold font-dmmono">{s.value}</div>
            <div className="text-text-muted text-[10px] uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button onClick={onFollow}
          className={`flex-1 h-11 rounded-xl text-sm font-bold transition-all ${followed ? 'bg-surface-2 text-text-secondary border border-white/[0.06]' : 'bg-brand-cyan text-bg-dark'}`}>
          {followed ? 'Following' : 'Follow'}
        </button>
        <button onClick={onTip}
          className="h-11 px-4 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 text-black text-sm font-bold flex items-center gap-1.5">
          <CoinIcon size={14} /> Tip
        </button>
        <button onClick={onReport}
          className="h-11 w-11 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-text-secondary hover:bg-white/[0.08]">
          <Icon name="flag" size={16} />
        </button>
      </div>
    </div>
  );
}

// Ranked viewer list — dummy data for preview mode
const DUMMY_VIEWERS = [
  { id: 'v1', name: 'CryoNova',    tips: 12500, color: '#22d3ee' },
  { id: 'v2', name: 'PixelFable',  tips: 8400,  color: '#a78bfa' },
  { id: 'v3', name: 'ZestyNinja',  tips: 3200,  color: '#f472b6' },
  { id: 'v4', name: 'GhostReply',  tips: 1800,  color: '#fb923c' },
  { id: 'v5', name: 'MochaWave',   tips: 900,   color: '#34d399' },
  { id: 'v6', name: 'SaltyDuck',   tips: 420,   color: '#fbbf24' },
  { id: 'v7', name: 'NullPointer', tips: 150,   color: '#60a5fa' },
  { id: 'v8', name: 'HexFox',      tips: 50,    color: '#f87171' },
];
function ViewersList({ viewerCount }) {
  const rest = Math.max(0, viewerCount - DUMMY_VIEWERS.length);
  return (
    <div className="p-3">
      <p className="px-2 pb-2 text-[11px] uppercase tracking-widest text-text-muted">Top tippers this stream</p>
      <div className="space-y-1">
        {DUMMY_VIEWERS.map((v, idx) => (
          <div key={v.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/[0.04]">
            <span className="w-5 text-center text-text-muted text-xs font-dmmono">{idx + 1}</span>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
              style={{ backgroundColor: v.color }}>{v.name[0]}</div>
            <span className="flex-1 truncate text-sm font-semibold text-text-primary" style={{ color: v.color }}>{v.name}</span>
            <span className="flex items-center gap-1 text-xs font-dmmono text-amber-300">
              <CoinIcon size={12} />
              {v.tips.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
      {rest > 0 && (
        <p className="text-center text-text-muted text-xs mt-3">
          + {rest.toLocaleString()} more watching
        </p>
      )}
    </div>
  );
}

// Quick profile card shown when tapping a username in chat
function ChatUserCard({ profile, onClose }) {
  if (!profile) return null;
  const color = profile.color || '#22d3ee';
  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-extrabold text-white"
          style={{ backgroundColor: color }}>
          {(profile.user || 'U')[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-text-primary text-base font-extrabold truncate" style={{ color }}>{profile.user}</p>
          <p className="text-text-muted text-xs">@{(profile.user || '').toLowerCase()}</p>
        </div>
      </div>
      {profile.text && (
        <div className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <p className="text-[11px] uppercase tracking-widest text-text-muted mb-1">Said</p>
          <p className="text-sm text-text-secondary break-words">{profile.text}</p>
        </div>
      )}
      <div className="flex items-center gap-2">
        <button onClick={onClose}
          className="flex-1 h-11 rounded-xl bg-brand-cyan text-bg-dark text-sm font-bold flex items-center justify-center gap-1.5">
          <Icon name="person_add" size={14} /> Follow
        </button>
        <button onClick={onClose}
          className="h-11 px-4 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm font-bold text-text-secondary flex items-center gap-1.5">
          <Icon name="chat_bubble" size={14} /> DM
        </button>
      </div>
    </div>
  );
}
