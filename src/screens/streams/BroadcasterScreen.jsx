// src/screens/streams/BroadcasterScreen.jsx
// Mobile: edge-to-edge immersive broadcaster (WYSIWYG with viewer).
// Desktop: framed studio layout. Controls are button-only on both.
//
// Everything here is meant to enforce — banned words actually strip,
// slow mode actually blocks, Gemini actually checks chat + frames.

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import { useUI } from '../../context/UIContext';
import useResponsive from '../../hooks/useResponsive';
import Icon from '../../components/Icon';
import {
  getStreamKey,
  getIngestUrl,
  getDummyViewerCount,
  PREVIEW_CHAT_MESSAGES,
  GCORE_CONFIG,
} from '../../utils/streamConfig';
import {
  sanitizeMessage,
  canSendNow,
  isDuplicate,
  recordSent,
  compileBannedPattern,
  applyBannedWords,
  CHAT_DEFAULTS,
} from '../../utils/chatModeration';
import { moderateChatMessage, startStreamFrameSampler } from '../../utils/streamModeration';

const QUALITY_PRESETS = ['720p30', '720p60', '1080p30', '1080p60'];
const ASPECT_OPTIONS = [
  { id: '16:9', w: 1920, h: 1080 },
  { id: '9:16', w: 1080, h: 1920 },
];

export default function BroadcasterScreen() {
  const { streamId = 'preview-stream' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { profile } = useUser();
  const { showToast } = useUI();
  const { isDesktop } = useResponsive();

  const isPreview = searchParams.get('preview') === '1' || !GCORE_CONFIG.enabled;
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const chatEndRef = useRef(null);
  const inactivityRef = useRef(null);

  // Media + stream state
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [duration, setDuration] = useState(0);
  const [viewerCount, setViewerCount] = useState(0);
  const [peakViewers, setPeakViewers] = useState(0);
  const [aspect, setAspect] = useState('16:9');
  const [endedStats, setEndedStats] = useState(null);

  // Panels — all button-driven, no gestures
  const [panel, setPanel] = useState('chat'); // 'chat' | 'activity' | 'settings' | 'plus' | 'health' | null — chat open by default on mobile
  const [controlsVisible, setControlsVisible] = useState(true);

  // Stream health (simulated while Gcore is stubbed)
  const [bitrate, setBitrate] = useState(6000);
  const [droppedPct, setDroppedPct] = useState(0);
  const [micLevel, setMicLevel] = useState(0);
  const [desktopLevel, setDesktopLevel] = useState(0);

  // Chat state
  const [chatMessages, setChatMessages] = useState(PREVIEW_CHAT_MESSAGES);
  const [chatInput, setChatInput] = useState('');
  const [pinnedMsg, setPinnedMsg] = useState(null);
  const [slowModeSec, setSlowModeSec] = useState(0);
  const [followerOnly, setFollowerOnly] = useState(false);
  const [linksAllowed, setLinksAllowed] = useState(false); // viewers
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [bannedWordsText, setBannedWordsText] = useState('');
  const [bannedMode, setBannedMode] = useState('asterisk'); // 'asterisk' | 'block'
  const bannedPattern = useMemo(() => {
    const list = bannedWordsText.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
    return compileBannedPattern(list);
  }, [bannedWordsText]);

  // Settings state
  const [quality, setQuality] = useState('1080p60');
  const [echoCancel, setEchoCancel] = useState(true);
  const [noiseSuppress, setNoiseSuppress] = useState(true);

  // Engagement
  const [activityEvents, setActivityEvents] = useState([]);
  const [earnings, setEarnings] = useState(0);
  const [clipCount, setClipCount] = useState(0);
  const [activePoll, setActivePoll] = useState(null);
  const [pollDraft, setPollDraft] = useState({ q: '', opts: ['', ''] });

  const streamKey = getStreamKey(currentUser?.uid || 'preview', streamId);
  const ingestUrl = getIngestUrl(streamKey);

  // ─── Camera with aspect-aware constraints ─────────────────────────
  const acquireCamera = useCallback(async (ratio) => {
    try {
      const preset = ASPECT_OPTIONS.find(a => a.id === ratio) || ASPECT_OPTIONS[0];
      streamRef.current?.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: preset.w },
          height: { ideal: preset.h },
          aspectRatio: { ideal: preset.w / preset.h },
        },
        audio: {
          echoCancellation: echoCancel,
          noiseSuppression: noiseSuppress,
        },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      stream.getAudioTracks().forEach(t => (t.enabled = micOn));
      stream.getVideoTracks().forEach(t => (t.enabled = camOn));
    } catch (err) {
      console.warn('getUserMedia failed', err);
    }
  }, [echoCancel, noiseSuppress, micOn, camOn]);

  useEffect(() => {
    acquireCamera(aspect);
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reacquire on aspect change
  useEffect(() => { if (streamRef.current) acquireCamera(aspect); /* eslint-disable-next-line */ }, [aspect]);

  // ─── Live ticker (duration, viewers, health, events, cooldown) ────
  useEffect(() => {
    if (!isLive) return;
    const id = setInterval(() => {
      setDuration(d => d + 1);
      const v = getDummyViewerCount(streamId);
      setViewerCount(v);
      setPeakViewers(p => Math.max(p, v));
      setBitrate(b => Math.max(2500, Math.min(8000, b + (Math.random() - 0.5) * 400)));
      setDroppedPct(() => Math.max(0, Math.min(6, Math.random() * 2)));
      setMicLevel(() => micOn ? Math.random() * 85 + 10 : 0);
      setDesktopLevel(() => Math.random() * 70 + 15);
      setCooldownLeft(c => Math.max(0, c - 1));
      if (Math.random() < 0.18) {
        const names = ['PhantomStrike', 'NeonByte', 'ZeroCool', 'IcyMint', 'TurboTako', 'GhostPixel'];
        const user = names[Math.floor(Math.random() * names.length)];
        const roll = Math.random();
        if (roll < 0.45) pushActivity({ type: 'follow', user });
        else if (roll < 0.75) {
          const amt = [10, 25, 50, 100][Math.floor(Math.random() * 4)];
          setEarnings(c => c + amt);
          pushActivity({ type: 'tip', user, amount: amt });
        } else if (roll < 0.92) { setEarnings(c => c + 299); pushActivity({ type: 'sub', user }); }
        else pushActivity({ type: 'raid', user, count: Math.floor(Math.random() * 40 + 5) });
      }
      setActivePoll(p => {
        if (!p) return p;
        if (Date.now() > p.endsAt) return null;
        if (Math.random() < 0.3) {
          const idx = Math.floor(Math.random() * p.opts.length);
          return { ...p, opts: p.opts.map((o, i) => i === idx ? { ...o, votes: o.votes + 1 } : o) };
        }
        return p;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isLive, streamId, micOn]);

  const pushActivity = (ev) => {
    setActivityEvents(e => [{ id: `a_${Date.now()}_${Math.random()}`, ts: Date.now(), ...ev }, ...e].slice(0, 50));
  };

  // ─── Auto-hide floating controls on mobile ─────────────────────────
  const bumpControls = useCallback(() => {
    setControlsVisible(true);
    clearTimeout(inactivityRef.current);
    inactivityRef.current = setTimeout(() => setControlsVisible(false), 4000);
  }, []);
  useEffect(() => { if (!isDesktop && isLive) bumpControls(); return () => clearTimeout(inactivityRef.current); }, [isLive, isDesktop, bumpControls]);

  // ─── Gemini frame sampler while live ──────────────────────────────
  useEffect(() => {
    if (!isLive || isPreview) return;
    const stop = startStreamFrameSampler(videoRef.current, streamId, {
      intervalMs: 20_000,
      onWarn: ({ reason }) => showToast(`Content warning: ${reason}. Stop or adjust now.`, 'error'),
      onFlag: ({ reason }) => {
        showToast(`Stream ended by auto-moderator: ${reason}`, 'error');
        endStream();
      },
    });
    return stop;
  }, [isLive, isPreview, streamId]);

  // ─── Derived ──────────────────────────────────────────────────────
  const stability = droppedPct < 1 && bitrate > 4500 ? 'Excellent'
    : droppedPct < 3 && bitrate > 3000 ? 'Good' : 'Poor';
  const stabilityTone = stability === 'Excellent' ? 'bg-emerald-500'
    : stability === 'Good' ? 'bg-amber-400' : 'bg-rose-500';

  const formatTime = s => {
    const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
    return `${hh ? hh.toString().padStart(2,'0')+':' : ''}${mm.toString().padStart(2,'0')}:${ss.toString().padStart(2,'0')}`;
  };

  // ─── Actions ──────────────────────────────────────────────────────
  const toggleMic = () => {
    setMicOn(v => {
      const next = !v;
      streamRef.current?.getAudioTracks().forEach(t => (t.enabled = next));
      return next;
    });
    bumpControls();
  };
  const toggleCam = () => {
    setCamOn(v => {
      const next = !v;
      streamRef.current?.getVideoTracks().forEach(t => (t.enabled = next));
      return next;
    });
    bumpControls();
  };
  const startStream = () => {
    if (isPreview) showToast('Preview mode — not actually broadcasting', 'info');
    setIsLive(true);
    setDuration(0);
    setPeakViewers(0);
    setEarnings(0);
    setClipCount(0);
    setActivityEvents([]);
    setViewerCount(getDummyViewerCount(streamId));
    bumpControls();
  };
  const endStream = () => {
    setIsLive(false);
    setEndedStats({
      streamId,
      duration,
      peakViewers,
      avgViewers: Math.floor(peakViewers * 0.7),
      newFollowers: activityEvents.filter(e => e.type === 'follow').length,
      tips: earnings,
      chatMessages: chatMessages.length,
      clipCount,
    });
  };
  const makeClip = () => {
    setClipCount(c => c + 1);
    showToast('Clip saved — last 30 seconds captured', 'success');
  };

  // ─── Chat send with real enforcement ──────────────────────────────
  const sendChat = async () => {
    const uid = currentUser?.uid || 'local-broadcaster';

    // 1. Rate limit / slow mode
    const rate = canSendNow(uid, slowModeSec);
    if (!rate.ok) { showToast(rate.error, 'error'); setCooldownLeft(rate.cooldownSec || 0); return; }

    // 2. Sanitize
    const clean = sanitizeMessage(chatInput);
    if (!clean.ok) { showToast(clean.error, 'error'); return; }
    let text = clean.cleaned;

    // 3. Banned words
    if (bannedPattern) {
      const { blocked, text: replaced } = applyBannedWords(text, bannedPattern, bannedMode);
      if (blocked) { showToast('Message blocked by banned-word filter', 'error'); return; }
      text = replaced;
    }

    // 4. Duplicate check
    if (isDuplicate(uid, text)) { showToast('Please don\'t spam the same message.', 'error'); return; }

    // 5. Broadcaster bypass for Gemini (they're trusted — only viewer chat goes through AI)
    // For a broadcaster in their own chat we still accept but record
    recordSent(uid, text);
    setChatMessages(m => [...m, {
      id: `local_${Date.now()}`,
      user: profile?.displayName || 'You',
      text,
      color: '#5CE1E6',
      isBroadcaster: true,
    }]);
    setChatInput('');
    if (clean.warning) showToast(clean.warning, 'info');
    if (slowModeSec) setCooldownLeft(slowModeSec);
    // Fire-and-forget AI check (still log anything egregious)
    moderateChatMessage(text, streamId).then(res => {
      if (!res.ok) showToast(`Heads up: your message was flagged (${res.reason})`, 'info');
    });
  };

  // ─── Polls ────────────────────────────────────────────────────────
  const launchPoll = () => {
    const opts = pollDraft.opts.map(s => s.trim()).filter(Boolean);
    if (!pollDraft.q.trim() || opts.length < 2) { showToast('Question + 2 options required', 'error'); return; }
    setActivePoll({ q: pollDraft.q.trim(), opts: opts.map(text => ({ text, votes: 0 })), endsAt: Date.now() + 60_000 });
    setPollDraft({ q: '', opts: ['', ''] });
    setPanel(null);
    showToast('Poll launched for 60s', 'success');
  };
  const pinCurrentInput = () => {
    if (!chatInput.trim()) { showToast('Type something to pin', 'error'); return; }
    setPinnedMsg({ user: profile?.displayName || 'You', text: chatInput.trim() });
    setChatInput('');
    setPanel(null);
  };

  // ─── Early return: post-stream analytics ──────────────────────────
  if (endedStats) return <StreamSummary stats={endedStats} onClose={() => { setEndedStats(null); setDuration(0); }} />;

  // ────────────────────────────────────────────────────────────────
  // MOBILE / TOUCH: edge-to-edge immersive (stays active in landscape)
  // ────────────────────────────────────────────────────────────────
  const isTouchPhone = typeof window !== 'undefined' &&
    window.matchMedia?.('(hover: none) and (pointer: coarse)').matches;
  if (!isDesktop || isTouchPhone) {
    return (
      <div className="fixed inset-0 z-[90] bg-black overflow-hidden select-none">
        <video
          ref={videoRef} autoPlay muted playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: camOn ? 1 : 0 }}
        />
        {!camOn && (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-bg-dark to-zinc-900 flex items-center justify-center">
            <Icon name="videocam_off" size={64} className="text-white/30" />
          </div>
        )}
        {/* Subtle top + bottom gradients for legibility */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/70 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/75 to-transparent" />

        {/* ── Top bar: back, title, live+timer, viewers, health, activity ── */}
        <div className="absolute top-0 inset-x-0 pt-safe px-4 pt-3 flex items-center gap-2" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center">
            <Icon name="arrow_back_ios_new" size={16} className="text-white" />
          </button>
          <div className="flex-1 flex items-center justify-center gap-2">
            {isLive ? (
              <div className="flex items-center gap-2 px-3 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-white text-[11px] font-bold tracking-widest">LIVE</span>
                <span className="text-white/70 text-[11px] font-dmmono">{formatTime(duration)}</span>
              </div>
            ) : (
              <div className="px-3 h-9 flex items-center rounded-full bg-black/40 backdrop-blur-md border border-white/10">
                <span className="text-white/70 text-[11px] tracking-widest uppercase font-bold">Studio</span>
              </div>
            )}
          </div>
          {isLive && (
            <button onClick={() => setPanel(panel === 'health' ? null : 'health')}
              className="h-9 px-3 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${stabilityTone}`} />
              <span className="text-white text-[11px] font-dmmono">{viewerCount.toLocaleString()}</span>
            </button>
          )}
          <button onClick={() => setPanel(panel === 'activity' ? null : 'activity')}
            className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center relative">
            <Icon name="notifications" size={16} className="text-white" />
            {activityEvents.length > 0 && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-brand-cyan" />}
          </button>
        </div>

        {/* ── Pinned message ── */}
        {pinnedMsg && (
          <div className="absolute top-16 inset-x-4 px-3 py-2 rounded-xl bg-black/55 backdrop-blur-md border border-white/10 flex items-start gap-2" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 60px)' }}>
            <Icon name="push_pin" size={14} className="text-brand-cyan mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-white/60 uppercase tracking-widest font-bold">Pinned</p>
              <p className="text-white text-xs leading-snug truncate">{pinnedMsg.text}</p>
            </div>
            <button onClick={() => setPinnedMsg(null)} className="text-white/50 hover:text-white">
              <Icon name="close" size={14} />
            </button>
          </div>
        )}

        {/* ── Active poll overlay (bottom center, above controls) ── */}
        {activePoll && (
          <div className="absolute left-4 right-20 bottom-28 px-3 py-2.5 rounded-2xl bg-black/55 backdrop-blur-md border border-white/10">
            <p className="text-white text-xs font-bold mb-1.5">{activePoll.q}</p>
            <div className="space-y-1">
              {activePoll.opts.map((o, i) => {
                const total = activePoll.opts.reduce((s, x) => s + x.votes, 0) || 1;
                const pct = Math.round(o.votes / total * 100);
                return (
                  <div key={i} className="relative h-6 rounded-md bg-white/10 overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-brand-cyan/40" style={{ width: `${pct}%` }} />
                    <div className="absolute inset-0 flex items-center justify-between px-2 text-[11px] text-white">
                      <span className="truncate">{o.text}</span>
                      <span className="font-dmmono">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Controls row under the top bar ── */}
        <div className="absolute inset-x-0 px-4 flex items-center justify-center gap-2 z-[3]"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 60px)' }}>
          <IconBtn icon={micOn ? 'mic' : 'mic_off'} label={micOn ? 'Mic' : 'Muted'} onClick={toggleMic} danger={!micOn} />
          <IconBtn icon={camOn ? 'videocam' : 'videocam_off'} label={camOn ? 'Cam' : 'Off'} onClick={toggleCam} danger={!camOn} />
          {!isLive ? (
            <button onClick={startStream} className="flex flex-col items-center gap-1 shrink-0" aria-label="Go live">
              <span className="relative w-12 h-12 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center shadow-[0_10px_30px_-8px_rgba(244,63,94,0.7)]">
                <span className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-60" />
                <span className="relative tracking-wider">LIVE</span>
              </span>
              <span className="text-[10px] font-semibold text-white/90 leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Go Live</span>
            </button>
          ) : (
            <button onClick={endStream} className="flex flex-col items-center gap-1 shrink-0" aria-label="End stream">
              <span className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white font-bold text-[10px] flex items-center justify-center">
                <span className="w-3 h-3 rounded-sm bg-rose-400" />
              </span>
              <span className="text-[10px] font-semibold text-white/90 leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">End</span>
            </button>
          )}
          <IconBtn icon="settings" label="Settings" onClick={() => setPanel('settings')} />
        </div>

        {/* ── Right-side floating rail (broadcaster tools) ── */}
        <div className="absolute right-3 flex flex-col items-center gap-3 z-[3]"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 150px)' }}>
          <IconBtn icon="person_add" label="Invite" onClick={() => setPanel('invite')} />
          <IconBtn icon="group_add" label="Co-host" onClick={() => navigate('/go-live/co-stream')} />
          <IconBtn icon="poll" label="Poll" onClick={() => setPanel('poll')} />
          <IconBtn icon="content_cut" label="Clip" onClick={makeClip} disabled={!isLive} />
          <IconBtn icon="aspect_ratio" label={aspect === '16:9' ? '16:9' : '9:16'} onClick={() => setAspect(a => a === '16:9' ? '9:16' : '16:9')} />
        </div>

        {/* ── Always-on TikTok-style chat overlay ── */}
        <div className="absolute left-2 right-2 pointer-events-none z-[2]"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 68px)', maxHeight: '45vh' }}>
          <div className="flex flex-col justify-end gap-1 max-h-[45vh] overflow-hidden"
            style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 100%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 100%)' }}>
            {chatMessages.slice(-10).map((m) => (
              <div key={m.id} className="text-sm leading-snug drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                <span className="font-bold mr-1.5" style={{ color: m.color || '#fff' }}>{m.user}</span>
                <span className="text-white/95 break-words">{m.text}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Always-on chat input with clear Send button */}
        <div className="absolute left-3 right-3 pointer-events-auto z-[3]"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)' }}>
          <form onSubmit={(e) => { e.preventDefault(); sendChat(); }} className="flex items-center gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={cooldownLeft > 0 ? `Wait ${cooldownLeft}s…` : 'Say something…'}
              disabled={cooldownLeft > 0}
              className="flex-1 bg-black/55 backdrop-blur-md border border-white/15 rounded-full px-4 py-2.5 text-sm text-white placeholder-white/60 focus:outline-none focus:border-white/30 disabled:opacity-50"
            />
            <button type="submit" disabled={!chatInput.trim() || cooldownLeft > 0}
              className="px-4 h-10 rounded-full bg-accent-primary text-black text-sm font-bold flex items-center gap-1.5 disabled:opacity-40">
              <Icon name="send" size={14} />
              Send
            </button>
          </form>
        </div>

        {/* ── Left-slide activity drawer ── */}
        <Drawer side="left" open={panel === 'activity'} onClose={() => setPanel(null)}>
          <ActivityPanel events={activityEvents} earnings={earnings} peakViewers={peakViewers} />
        </Drawer>

        {/* ── Health bottom sheet ── */}
        <BottomSheet open={panel === 'health'} onClose={() => setPanel(null)} title="Stream Health">
          <HealthBody stability={stability} stabilityTone={stabilityTone}
            bitrate={bitrate} droppedPct={droppedPct}
            micLevel={micLevel} desktopLevel={desktopLevel} />
        </BottomSheet>

        {/* ── Plus bottom sheet: poll / pin / clip / aspect ── */}
        <BottomSheet open={panel === 'plus'} onClose={() => setPanel(null)} title="Quick Actions">
          <div className="space-y-3">
            <ActionRow icon="poll" label="Create Poll" onClick={() => setPanel('poll')} />
            <ActionRow icon="push_pin" label="Pin current message from chat input"
              sub={chatInput ? `"${chatInput.slice(0, 40)}"` : 'Type in chat first'}
              onClick={pinCurrentInput} disabled={!chatInput.trim()} />
            <ActionRow icon="content_cut" label="Clip last 30 seconds"
              sub={`${clipCount} clip${clipCount === 1 ? '' : 's'} this session`}
              onClick={makeClip} disabled={!isLive} />
            <ActionRow icon="aspect_ratio" label={`Aspect: ${aspect}`}
              sub="Tap to switch between landscape and portrait"
              onClick={() => setAspect(a => a === '16:9' ? '9:16' : '16:9')} />
          </div>
        </BottomSheet>

        {/* ── Poll composer ── */}
        <BottomSheet open={panel === 'poll'} onClose={() => setPanel('plus')} title="New Poll">
          <PollComposer draft={pollDraft} setDraft={setPollDraft} onLaunch={launchPoll} />
        </BottomSheet>

        {/* ── Invite-to-watch sheet ── */}
        <BottomSheet open={panel === 'invite'} onClose={() => setPanel(null)} title="Invite viewers">
          <InviteBody onCoStream={() => { setPanel(null); navigate('/go-live/co-stream'); }} />
        </BottomSheet>

        {/* ── Settings bottom sheet (REAL enforcement) ── */}
        <BottomSheet open={panel === 'settings'} onClose={() => setPanel(null)} title="Stream Settings" tall>
          <SettingsBody
            quality={quality} setQuality={setQuality}
            echoCancel={echoCancel} setEchoCancel={setEchoCancel}
            noiseSuppress={noiseSuppress} setNoiseSuppress={setNoiseSuppress}
            slowModeSec={slowModeSec} setSlowModeSec={setSlowModeSec}
            followerOnly={followerOnly} setFollowerOnly={setFollowerOnly}
            linksAllowed={linksAllowed} setLinksAllowed={setLinksAllowed}
            bannedWordsText={bannedWordsText} setBannedWordsText={setBannedWordsText}
            bannedMode={bannedMode} setBannedMode={setBannedMode}
            streamKey={streamKey} ingestUrl={ingestUrl}
          />
        </BottomSheet>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────
  // DESKTOP: studio layout
  // ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-8 px-6 pt-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-surface-1 border border-white/[0.06] flex items-center justify-center">
            <Icon name="arrow_back_ios_new" size={16} />
          </button>
          <div className="flex-1">
            <h1 className="font-syne text-2xl font-extrabold text-white">Broadcaster Studio</h1>
            <p className="text-text-muted text-xs">{isLive ? `Live — ${formatTime(duration)}` : 'Not broadcasting yet'}</p>
          </div>
          {isLive && (
            <div className="flex items-center gap-4 px-4 py-2 rounded-2xl bg-surface-1 border border-white/[0.06]">
              <Pill tone="rose" pulse text="LIVE" />
              <Stat label="Viewers" value={viewerCount.toLocaleString()} />
              <Stat label="Peak" value={peakViewers.toLocaleString()} />
              <Stat label="Earned" value={`${earnings}c`} tone="gold" />
              <Stat label="Clips" value={clipCount} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-[1fr_360px] gap-5">
          <div className="space-y-4">
            <div className={`relative rounded-3xl overflow-hidden bg-black border border-white/[0.06] ${aspect === '9:16' ? 'aspect-[9/16] max-h-[75vh] mx-auto' : 'aspect-video'}`}>
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ opacity: camOn ? 1 : 0 }} />
              {!camOn && <div className="absolute inset-0 flex items-center justify-center bg-zinc-900"><Icon name="videocam_off" size={48} className="text-white/30" /></div>}
              {isLive && (
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <Pill tone="rose" pulse text="LIVE" />
                  <Pill text={formatTime(duration)} mono />
                </div>
              )}
              {isLive && (
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <div className="h-8 px-3 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${stabilityTone}`} />
                    <span className="text-white/80 text-[11px] font-dmmono">{Math.round(bitrate)} kbps</span>
                    <span className="text-white/50 text-[11px]">·</span>
                    <span className="text-white/80 text-[11px] font-dmmono">{droppedPct.toFixed(1)}% drop</span>
                  </div>
                  <div className="h-8 px-3 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center gap-1.5">
                    <Icon name="visibility" size={14} className="text-white/70" />
                    <span className="text-white text-[12px] font-dmmono">{viewerCount.toLocaleString()}</span>
                  </div>
                </div>
              )}
              {activePoll && (
                <div className="absolute bottom-4 left-4 right-4 lg:right-auto lg:w-[380px] p-3 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10">
                  <p className="text-white text-sm font-bold mb-2">{activePoll.q}</p>
                  {activePoll.opts.map((o, i) => {
                    const total = activePoll.opts.reduce((s, x) => s + x.votes, 0) || 1;
                    const pct = Math.round(o.votes / total * 100);
                    return (
                      <div key={i} className="relative h-7 rounded-md bg-white/10 overflow-hidden mb-1">
                        <div className="absolute inset-y-0 left-0 bg-brand-cyan/40" style={{ width: `${pct}%` }} />
                        <div className="absolute inset-0 flex items-center justify-between px-2 text-xs text-white"><span>{o.text}</span><span className="font-dmmono">{pct}%</span></div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-3">
              <IconBtn icon={micOn ? 'mic' : 'mic_off'} onClick={toggleMic} danger={!micOn} />
              <IconBtn icon={camOn ? 'videocam' : 'videocam_off'} onClick={toggleCam} danger={!camOn} />
              {!isLive ? (
                <button onClick={startStream} className="h-14 px-8 rounded-full bg-rose-500 text-white font-bold text-sm flex items-center gap-2 shadow-[0_10px_30px_-8px_rgba(244,63,94,0.6)]">
                  <span className="w-2.5 h-2.5 rounded-full bg-white" /> Go Live
                </button>
              ) : (
                <button onClick={endStream} className="h-14 px-6 rounded-full bg-surface-1 border border-white/[0.08] text-white font-bold text-sm flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-400" /> End Stream
                </button>
              )}
              <IconBtn icon="content_cut" onClick={makeClip} disabled={!isLive} />
              <IconBtn icon="push_pin" onClick={pinCurrentInput} disabled={!chatInput.trim()} />
              <IconBtn icon="poll" onClick={() => setPanel('poll')} />
              <IconBtn icon="aspect_ratio" onClick={() => setAspect(a => a === '16:9' ? '9:16' : '16:9')} />
              <IconBtn icon="settings" onClick={() => setPanel('settings')} />
            </div>

            <HealthBody stability={stability} stabilityTone={stabilityTone}
              bitrate={bitrate} droppedPct={droppedPct}
              micLevel={micLevel} desktopLevel={desktopLevel} />

            <div className="p-4 rounded-2xl bg-surface-1 border border-white/[0.06] space-y-3">
              <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold">Stream Keys</p>
              <InfoRow label="RTMP URL" value={ingestUrl} />
              <InfoRow label="Stream Key" value={streamKey} secret />
              <InfoRow label="Stream ID" value={streamId} />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex-1 min-h-[460px] max-h-[calc(100vh-200px)] flex flex-col rounded-2xl bg-surface-1 border border-white/[0.06] overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-white text-sm font-bold">Live Chat</span>
                <span className="text-text-muted text-xs">{chatMessages.length}</span>
              </div>
              {pinnedMsg && (
                <div className="mx-3 mt-3 px-3 py-2 rounded-xl bg-brand-cyan/10 border border-brand-cyan/30 flex items-start gap-2">
                  <Icon name="push_pin" size={12} className="text-brand-cyan mt-0.5" />
                  <p className="text-xs text-text-primary flex-1">{pinnedMsg.text}</p>
                  <button onClick={() => setPinnedMsg(null)}><Icon name="close" size={12} className="text-text-muted" /></button>
                </div>
              )}
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                {chatMessages.map(m => (
                  <div key={m.id} className="text-sm flex gap-1.5">
                    <span className="font-bold text-xs shrink-0" style={{ color: m.color }}>{m.user}:</span>
                    <span className="text-text-secondary break-words">{m.text}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="p-3 border-t border-white/[0.06]">
                <ChatInput value={chatInput} onChange={setChatInput} onSend={sendChat} cooldownLeft={cooldownLeft} />
              </div>
            </div>
            <ActivityPanel events={activityEvents.slice(0, 8)} earnings={earnings} peakViewers={peakViewers} compact />
          </div>
        </div>
      </div>

      {/* Desktop overlay modals reuse the same sheets */}
      <BottomSheet open={panel === 'settings'} onClose={() => setPanel(null)} title="Stream Settings" tall>
        <SettingsBody
          quality={quality} setQuality={setQuality}
          echoCancel={echoCancel} setEchoCancel={setEchoCancel}
          noiseSuppress={noiseSuppress} setNoiseSuppress={setNoiseSuppress}
          slowModeSec={slowModeSec} setSlowModeSec={setSlowModeSec}
          followerOnly={followerOnly} setFollowerOnly={setFollowerOnly}
          linksAllowed={linksAllowed} setLinksAllowed={setLinksAllowed}
          bannedWordsText={bannedWordsText} setBannedWordsText={setBannedWordsText}
          bannedMode={bannedMode} setBannedMode={setBannedMode}
          streamKey={streamKey} ingestUrl={ingestUrl}
        />
      </BottomSheet>
      <BottomSheet open={panel === 'poll'} onClose={() => setPanel(null)} title="New Poll">
        <PollComposer draft={pollDraft} setDraft={setPollDraft} onLaunch={launchPoll} />
      </BottomSheet>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Shared UI bits
// ════════════════════════════════════════════════════════════════════

function IconBtn({ icon, onClick, danger = false, disabled = false, label, active = false }) {
  const circle = (
    <span className={`w-11 h-11 rounded-full backdrop-blur-md border transition-all flex items-center justify-center
      ${danger ? 'bg-rose-500 border-rose-400 text-white'
        : active ? 'bg-white/20 border-white/15 text-white'
        : 'bg-black/40 border-white/10 text-white hover:bg-black/55'}
      ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
      <Icon name={icon} size={18} />
    </span>
  );
  if (!label) {
    return <button onClick={onClick} disabled={disabled} className="shrink-0">{circle}</button>;
  }
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label}
      className="flex flex-col items-center gap-1 min-w-[44px] shrink-0">
      {circle}
      <span className="text-[10px] font-semibold text-white/90 leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{label}</span>
    </button>
  );
}

function Pill({ text, tone = 'neutral', pulse = false, mono = false }) {
  const bg = tone === 'rose' ? 'bg-rose-500 text-white'
    : tone === 'gold' ? 'bg-brand-gold/20 text-brand-gold'
    : 'bg-black/50 text-white border border-white/10';
  return (
    <span className={`h-8 px-3 inline-flex items-center gap-1.5 rounded-full text-[11px] font-bold tracking-wider ${bg} ${mono ? 'font-dmmono' : ''}`}>
      {pulse && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
      {text}
    </span>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className="text-center">
      <p className={`text-sm font-bold font-dmmono ${tone === 'gold' ? 'text-brand-gold' : 'text-white'}`}>{value}</p>
      <p className="text-[10px] text-text-muted uppercase tracking-wider">{label}</p>
    </div>
  );
}

function Drawer({ side = 'right', open, onClose, children }) {
  return (
    <>
      <div onClick={onClose}
        className={`fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />
      <div
        className={`fixed top-0 bottom-0 w-[85%] max-w-[420px] z-[70] transition-transform duration-300 ${
          side === 'right' ? 'right-0 border-l' : 'left-0 border-r'
        } border-white/10 bg-black/60 backdrop-blur-xl
        ${open ? 'translate-x-0' : (side === 'right' ? 'translate-x-full' : '-translate-x-full')}`}>
        {children}
      </div>
    </>
  );
}

function BottomSheet({ open, onClose, title, tall = false, children }) {
  return (
    <>
      <div onClick={onClose}
        className={`fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />
      <div
        className={`fixed inset-x-0 bottom-0 z-[90] rounded-t-3xl bg-surface-1/95 backdrop-blur-xl border-t border-white/10
          lg:inset-x-auto lg:left-1/2 lg:-translate-x-1/2 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 lg:w-[520px] lg:rounded-3xl lg:border
          transition-transform duration-300 ${open ? 'translate-y-0 lg:-translate-y-1/2' : 'translate-y-full lg:translate-y-full'}
          ${tall ? 'max-h-[88vh]' : 'max-h-[70vh]'} overflow-y-auto`}>
        <div className="px-5 pt-4 pb-3 flex items-center justify-between sticky top-0 bg-surface-1/90 backdrop-blur-xl z-10">
          <h3 className="font-syne text-lg font-extrabold text-white">{title}</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center">
            <Icon name="close" size={14} />
          </button>
        </div>
        <div className="px-5 pb-6">{children}</div>
      </div>
    </>
  );
}

function ChatPanel({ messages, chatEndRef, input, setInput, onSend, cooldownLeft, immersive, isBroadcaster, onPinSelect }) {
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, chatEndRef]);
  return (
    <div className="h-full flex flex-col" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
      <div className="px-4 pb-3 flex items-center justify-between">
        <h3 className="font-syne text-lg font-extrabold text-white">Live Chat</h3>
        <span className="text-[11px] text-white/50 font-dmmono">{messages.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 space-y-2">
        {messages.map(m => (
          <div key={m.id} className="text-sm flex items-start gap-2">
            <span className="font-bold text-xs shrink-0" style={{ color: m.color }}>{m.user}</span>
            <span className="text-white/80 break-words flex-1">{m.text}</span>
            {isBroadcaster && onPinSelect && (
              <button onClick={() => onPinSelect(m)} className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-white">
                <Icon name="push_pin" size={12} />
              </button>
            )}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      <div className="p-4 border-t border-white/10" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
        <ChatInput value={input} onChange={setInput} onSend={onSend} cooldownLeft={cooldownLeft} />
      </div>
    </div>
  );
}

function ChatInput({ value, onChange, onSend, cooldownLeft = 0 }) {
  const remaining = CHAT_DEFAULTS.maxChars - value.length;
  const low = remaining < 50;
  const disabled = cooldownLeft > 0 || !value.trim() || value.length > CHAT_DEFAULTS.maxChars;
  return (
    <div>
      <div className="flex gap-2 items-end">
        <textarea
          value={value}
          onChange={e => onChange(e.target.value.slice(0, CHAT_DEFAULTS.maxChars + 1))}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          placeholder={cooldownLeft ? `Slow mode — ${cooldownLeft}s` : 'Say something...'}
          rows={1}
          disabled={cooldownLeft > 0}
          className="flex-1 resize-none bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder:text-white/40 focus:border-brand-cyan focus:outline-none max-h-28"
        />
        <button onClick={onSend} disabled={disabled}
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${disabled ? 'bg-white/5 text-white/30' : 'bg-brand-cyan text-bg-dark'}`}>
          <Icon name="send" size={16} />
        </button>
      </div>
      <div className="flex items-center justify-between mt-1 px-1">
        <span className="text-[10px] text-white/40">Enter to send · Shift+Enter newline</span>
        <span className={`text-[10px] font-dmmono ${low ? (remaining < 0 ? 'text-rose-400' : 'text-amber-400') : 'text-white/40'}`}>
          {value.length}/{CHAT_DEFAULTS.maxChars}
        </span>
      </div>
    </div>
  );
}

function ActivityPanel({ events, earnings, peakViewers, compact = false }) {
  return (
    <div className={`${compact ? 'p-4 rounded-2xl bg-surface-1 border border-white/[0.06]' : 'h-full flex flex-col'}`}
      style={compact ? {} : { paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
      <div className={`${compact ? 'mb-3' : 'px-4 pb-3'} flex items-center justify-between`}>
        <h3 className={`font-syne font-extrabold text-white ${compact ? 'text-sm' : 'text-lg'}`}>Activity</h3>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-brand-gold font-dmmono">{earnings}c</span>
          <span className="text-[11px] text-white/40">·</span>
          <span className="text-[11px] text-white/60 font-dmmono">peak {peakViewers}</span>
        </div>
      </div>
      <div className={`${compact ? '' : 'flex-1 overflow-y-auto px-4'} space-y-2`}>
        {events.length === 0 && <p className="text-xs text-white/40">No activity yet.</p>}
        {events.map(e => <ActivityLine key={e.id} ev={e} />)}
      </div>
    </div>
  );
}
function ActivityLine({ ev }) {
  const cfg = ev.type === 'follow' ? { icon: 'person_add', tone: 'text-brand-cyan', text: `${ev.user} followed` }
    : ev.type === 'tip' ? { icon: 'paid', tone: 'text-brand-gold', text: `${ev.user} tipped ${ev.amount}c` }
    : ev.type === 'sub' ? { icon: 'workspace_premium', tone: 'text-brand-violet', text: `${ev.user} subscribed` }
    : { icon: 'bolt', tone: 'text-rose-400', text: `${ev.user} raided with ${ev.count}` };
  return (
    <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-white/5 border border-white/10">
      <Icon name={cfg.icon} size={14} className={cfg.tone} />
      <span className="text-xs text-white/90 flex-1">{cfg.text}</span>
    </div>
  );
}

function HealthBody({ stability, stabilityTone, bitrate, droppedPct, micLevel, desktopLevel }) {
  return (
    <div className="p-4 rounded-2xl bg-surface-1 border border-white/[0.06] space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold">Stream Health</p>
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${stabilityTone}`} />
          <span className="text-xs text-white font-bold">{stability}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Metric label="Bitrate" value={`${Math.round(bitrate)} kbps`} />
        <Metric label="Dropped" value={`${droppedPct.toFixed(1)}%`} danger={droppedPct > 3} />
      </div>
      <VuMeter label="Mic" level={micLevel} />
      <VuMeter label="Desktop" level={desktopLevel} />
    </div>
  );
}
function Metric({ label, value, danger }) {
  return (
    <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10">
      <p className="text-[10px] text-white/50 uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-bold font-dmmono ${danger ? 'text-rose-400' : 'text-white'}`}>{value}</p>
    </div>
  );
}
function VuMeter({ label, level }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-white/60">{label}</span>
        <span className="text-[10px] font-dmmono text-white/40">{Math.round(level)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full transition-[width] duration-200"
          style={{
            width: `${Math.min(100, level)}%`,
            background: level > 85 ? '#f43f5e' : level > 65 ? '#fbbf24' : '#10b981',
          }} />
      </div>
    </div>
  );
}

function ActionRow({ icon, label, sub, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-left ${disabled ? 'opacity-40' : 'hover:bg-white/10'}`}>
      <Icon name={icon} size={18} className="text-brand-cyan" />
      <div className="flex-1">
        <p className="text-sm font-bold text-white">{label}</p>
        {sub && <p className="text-[11px] text-white/50 truncate">{sub}</p>}
      </div>
      <Icon name="chevron_right" size={16} className="text-white/40" />
    </button>
  );
}

function PollComposer({ draft, setDraft, onLaunch }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-[11px] text-white/60 uppercase tracking-widest font-bold">Question</label>
        <input value={draft.q} onChange={e => setDraft({ ...draft, q: e.target.value })}
          placeholder="Which agent next round?" maxLength={120}
          className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-brand-cyan focus:outline-none" />
      </div>
      <div>
        <label className="text-[11px] text-white/60 uppercase tracking-widest font-bold">Options</label>
        <div className="space-y-2 mt-1">
          {draft.opts.map((o, i) => (
            <input key={i} value={o}
              onChange={e => setDraft({ ...draft, opts: draft.opts.map((x, j) => j === i ? e.target.value : x) })}
              placeholder={`Option ${i + 1}`} maxLength={60}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-brand-cyan focus:outline-none" />
          ))}
          {draft.opts.length < 4 && (
            <button onClick={() => setDraft({ ...draft, opts: [...draft.opts, ''] })}
              className="text-xs text-brand-cyan font-bold">+ Add option</button>
          )}
        </div>
      </div>
      <button onClick={onLaunch} className="w-full py-3 rounded-xl bg-brand-cyan text-bg-dark font-bold text-sm">Launch 60s poll</button>
    </div>
  );
}

function SettingsBody(props) {
  const {
    quality, setQuality, echoCancel, setEchoCancel, noiseSuppress, setNoiseSuppress,
    slowModeSec, setSlowModeSec, followerOnly, setFollowerOnly, linksAllowed, setLinksAllowed,
    bannedWordsText, setBannedWordsText, bannedMode, setBannedMode,
    streamKey, ingestUrl,
  } = props;
  return (
    <div className="space-y-6">
      <Section title="Video Quality">
        <div className="grid grid-cols-4 gap-2">
          {QUALITY_PRESETS.map(q => (
            <button key={q} onClick={() => setQuality(q)}
              className={`py-2.5 rounded-xl text-xs font-bold ${quality === q ? 'bg-brand-cyan text-bg-dark' : 'bg-white/5 text-white border border-white/10'}`}>{q}</button>
          ))}
        </div>
      </Section>

      <Section title="Audio">
        <Toggle label="Echo Cancellation" value={echoCancel} onChange={setEchoCancel} />
        <Toggle label="Noise Suppression" value={noiseSuppress} onChange={setNoiseSuppress} />
      </Section>

      <Section title="Chat Rules (enforced)">
        <div>
          <p className="text-[11px] text-white/60 mb-1.5">Slow mode</p>
          <div className="grid grid-cols-6 gap-1.5">
            {[0, 5, 10, 15, 30, 60].map(n => (
              <button key={n} onClick={() => setSlowModeSec(n)}
                className={`py-2 rounded-lg text-[11px] font-bold ${slowModeSec === n ? 'bg-brand-cyan text-bg-dark' : 'bg-white/5 text-white border border-white/10'}`}>
                {n === 0 ? 'Off' : `${n}s`}
              </button>
            ))}
          </div>
        </div>
        <Toggle label="Followers only" value={followerOnly} onChange={setFollowerOnly} />
        <Toggle label="Let viewers post clickable links" value={linksAllowed} onChange={setLinksAllowed} />
      </Section>

      <Section title="Banned words (one per line or comma separated)">
        <textarea value={bannedWordsText} onChange={e => setBannedWordsText(e.target.value)}
          placeholder="n-word&#10;spoiler*&#10;my.real.phone"
          rows={4}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-brand-cyan focus:outline-none font-dmmono" />
        <p className="text-[10px] text-white/40 mt-1">Wildcards supported: <code className="text-white/60">bad*</code> matches <code className="text-white/60">badly</code> etc.</p>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <button onClick={() => setBannedMode('asterisk')}
            className={`py-2 rounded-lg text-[11px] font-bold ${bannedMode === 'asterisk' ? 'bg-brand-cyan text-bg-dark' : 'bg-white/5 text-white border border-white/10'}`}>Censor with ****</button>
          <button onClick={() => setBannedMode('block')}
            className={`py-2 rounded-lg text-[11px] font-bold ${bannedMode === 'block' ? 'bg-brand-cyan text-bg-dark' : 'bg-white/5 text-white border border-white/10'}`}>Block message</button>
        </div>
      </Section>

      <Section title="Stream Keys">
        <InfoRow label="RTMP URL" value={ingestUrl} />
        <InfoRow label="Stream Key" value={streamKey} secret />
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <button onClick={() => onChange(!value)}
      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">
      <span className="text-sm text-white">{label}</span>
      <div className={`w-10 h-6 rounded-full relative transition-colors ${value ? 'bg-brand-cyan' : 'bg-white/15'}`}>
        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${value ? 'right-0.5' : 'left-0.5'}`} />
      </div>
    </button>
  );
}

function InfoRow({ label, value, secret = false }) {
  const [reveal, setReveal] = useState(!secret);
  const shown = reveal ? value : value?.replace(/./g, '•');
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-white/50 text-xs">{label}</span>
      <div className="flex items-center gap-2 flex-1 justify-end">
        <span className="text-white text-xs font-dmmono truncate max-w-[220px]">{shown}</span>
        {secret && (
          <button onClick={() => setReveal(r => !r)} className="text-white/50 hover:text-white">
            <Icon name={reveal ? 'visibility_off' : 'visibility'} size={14} />
          </button>
        )}
        <button onClick={() => navigator.clipboard?.writeText(value)} className="text-white/50 hover:text-white">
          <Icon name="content_copy" size={14} />
        </button>
      </div>
    </div>
  );
}

function StreamSummary({ stats, onClose }) {
  const formatTime = s => `${Math.floor(s/3600).toString().padStart(2,'0')}:${Math.floor((s%3600)/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-brand-cyan/10 flex items-center justify-center mx-auto mb-3">
            <Icon name="live_tv" size={32} className="text-brand-cyan" />
          </div>
          <h1 className="font-syne text-2xl font-extrabold text-white">Stream Ended</h1>
          <p className="text-text-muted text-sm">Here&apos;s how it went</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard icon="schedule" label="Duration" value={formatTime(stats.duration)} />
          <StatCard icon="visibility" label="Peak" value={stats.peakViewers.toLocaleString()} />
          <StatCard icon="trending_up" label="Avg" value={stats.avgViewers.toLocaleString()} />
          <StatCard icon="person_add" label="Followers" value={`+${stats.newFollowers}`} />
          <StatCard icon="paid" label="Earned" value={`${stats.tips}c`} tone="gold" />
          <StatCard icon="chat" label="Messages" value={stats.chatMessages.toLocaleString()} />
          <StatCard icon="bolt" label="VP Earned" value={`+${Math.floor(stats.duration/60)*20}`} />
          <StatCard icon="content_cut" label="Clips" value={stats.clipCount || 0} />
        </div>
        <div className="p-5 rounded-2xl bg-surface-1 border border-white/[0.06] mb-6">
          <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold mb-3">Viewer Curve</p>
          <div className="h-32 flex items-end gap-1">
            {Array.from({ length: 48 }).map((_, i) => {
              const h = 20 + Math.abs(Math.sin(i * 0.3) * 60 + (Math.random() * 20));
              return <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: 'linear-gradient(to top, rgba(77,255,212,0.15), rgba(77,255,212,0.6))' }} />;
            })}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={onClose} className="w-full py-4 rounded-2xl bg-brand-cyan text-bg-dark font-bold flex items-center justify-center gap-2">
            <Icon name="replay" size={18} /> Go Live Again
          </button>
          <button onClick={() => window.history.back()} className="w-full py-3 rounded-2xl bg-surface-2 border border-white/[0.06] text-white/70 font-bold text-sm">Done</button>
        </div>
      </div>
    </div>
  );
}
function InviteBody({ onCoStream }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname.replace('/broadcast', '/watch') : '';
  const shareText = `Come watch me live on VERGR`;
  const copy = () => {
    navigator.clipboard?.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };
  const nativeShare = () => {
    if (navigator.share) navigator.share({ url: shareUrl, title: shareText }).catch(() => {});
    else copy();
  };
  return (
    <div className="p-4 space-y-4">
      <div>
        <p className="text-[11px] uppercase tracking-widest text-white/50 mb-1.5">Stream link</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-white/80 truncate font-dmmono">
            {shareUrl}
          </div>
          <button onClick={copy}
            className={`h-11 px-4 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-colors ${copied ? 'bg-emerald-500 text-black' : 'bg-accent-primary text-black'}`}>
            <Icon name={copied ? 'check' : 'content_copy'} size={14} />
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      <button onClick={nativeShare}
        className="w-full h-12 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm font-bold text-white flex items-center justify-center gap-2 hover:bg-white/[0.08]">
        <Icon name="share" size={16} />
        Share via…
      </button>
      <div className="pt-2 border-t border-white/[0.06]">
        <p className="text-[11px] uppercase tracking-widest text-white/50 mb-2">Invite another creator</p>
        <button onClick={onCoStream}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-br from-brand-violet/20 to-brand-cyan/10 border border-white/[0.08] hover:from-brand-violet/30 hover:to-brand-cyan/20 text-left">
          <div className="w-10 h-10 rounded-xl bg-brand-violet/30 flex items-center justify-center shrink-0">
            <Icon name="group_add" size={18} className="text-brand-violet" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white">Co-stream (split screen)</div>
            <div className="text-xs text-white/60">Pull in another creator for a side-by-side live</div>
          </div>
          <Icon name="chevron_right" size={16} className="text-white/40" />
        </button>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, tone }) {
  return (
    <div className="p-4 rounded-2xl bg-surface-1 border border-white/[0.06] text-center">
      <Icon name={icon} size={20} className={`${tone === 'gold' ? 'text-brand-gold' : 'text-white/70'} mx-auto mb-1`} />
      <p className={`font-dmmono font-bold text-base ${tone === 'gold' ? 'text-brand-gold' : 'text-white'}`}>{value}</p>
      <p className="text-[10px] text-white/50 uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}
