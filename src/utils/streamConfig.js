// src/utils/streamConfig.js
// Gcore streaming config (stubbed — swap in real ingest/playback URLs post-domain purchase).
// ALL values are placeholder/dummy. The API surface stays constant once real creds are wired.

export const STREAM_TYPES = {
  just_chatting: {
    id: 'just_chatting',
    label: 'Just Chatting',
    icon: 'forum',
    description: 'Talk with your audience, no gameplay.',
    minPlan: 'free',
  },
  gameplay: {
    id: 'gameplay',
    label: 'Gameplay',
    icon: 'sports_esports',
    description: 'Stream your game with overlay + chat.',
    minPlan: 'free',
  },
  tournament_match: {
    id: 'tournament_match',
    label: 'Tournament Match',
    icon: 'emoji_events',
    description: 'Broadcast a VERGR tournament match with scoreboard.',
    minPlan: 'free',
  },
  co_stream: {
    id: 'co_stream',
    label: 'Co-Stream',
    icon: 'groups',
    description: 'Multi-host stream with up to 4 broadcasters.',
    minPlan: 'lite',
  },
  watch_party: {
    id: 'watch_party',
    label: 'Watch Party',
    icon: 'theaters',
    description: 'Watch a video together with synced playback + chat.',
    minPlan: 'lite',
  },
  squad_hangout: {
    id: 'squad_hangout',
    label: 'Squad Hangout',
    icon: 'diversity_3',
    description: 'Private squad-only stream for team chats.',
    minPlan: 'free',
  },
};

export const STREAM_TYPE_LIST = Object.values(STREAM_TYPES);

/**
 * Gcore config — all placeholder values. Swap in production credentials when ready.
 * Real values you'll get from Gcore console:
 *   - streamingApiBase (your CDN endpoint)
 *   - rtmpIngest (rtmp://...)
 *   - hlsPlayback base URL
 *   - apiKey (server-side only; do not embed in client)
 */
export const GCORE_CONFIG = {
  enabled: false, // flip to true once domain + creds ready
  streamingApiBase: 'https://api.gcore.com/streaming/v1',
  rtmpIngest: 'rtmp://live.vergr.dummy/live',
  hlsBase: 'https://cdn.vergr.dummy/hls',
  lowLatencyHlsBase: 'https://cdn.vergr.dummy/ll-hls',
  webrtcPlayback: 'wss://wrtc.vergr.dummy/whep',
  regions: ['eu-west', 'eu-central', 'us-east'],
};

/**
 * Returns a stream key for broadcasting. In preview/dummy mode this is
 * a predictable local token; in prod, Gcore issues it server-side.
 */
export function getStreamKey(userId, streamId) {
  if (GCORE_CONFIG.enabled) {
    // TODO: call Cloud Function 'issueGcoreStreamKey' here once live
    return null;
  }
  return `preview_${userId}_${streamId}`;
}

/** Returns RTMP ingest URL for a broadcaster. */
export function getIngestUrl(streamKey) {
  return `${GCORE_CONFIG.rtmpIngest}/${streamKey}`;
}

/** Returns HLS playback URL for a viewer. */
export function getPlaybackUrl(streamId, { lowLatency = true } = {}) {
  const base = lowLatency ? GCORE_CONFIG.lowLatencyHlsBase : GCORE_CONFIG.hlsBase;
  return `${base}/${streamId}/index.m3u8`;
}

/** Returns WHEP WebRTC playback endpoint (sub-second latency). */
export function getWebRTCPlaybackUrl(streamId) {
  return `${GCORE_CONFIG.webrtcPlayback}/${streamId}`;
}

/** Generate a dummy/preview viewer count that behaves organically. */
export function getDummyViewerCount(streamId = '') {
  // stable seed per stream for deterministic preview numbers
  let seed = 0;
  for (const c of streamId) seed = (seed * 31 + c.charCodeAt(0)) | 0;
  const base = 50 + Math.abs(seed % 1800);
  const drift = Math.floor((Date.now() / 4000) % 40) - 20;
  return Math.max(1, base + drift);
}

/** Dummy chat messages for preview mode. */
export const PREVIEW_CHAT_MESSAGES = [
  { id: 'pm1', user: 'NovaKill', text: 'LETS GOOO', avatar: null, color: '#5CE1E6' },
  { id: 'pm2', user: 'xShadow', text: 'GG that play was insane', avatar: null, color: '#B537F2' },
  { id: 'pm3', user: 'GhostRider', text: 'clip it clip it', avatar: null, color: '#FFB84D' },
  { id: 'pm4', user: 'ApexQueen', text: 'W stream', avatar: null, color: '#FF5A7A' },
  { id: 'pm5', user: 'TachyonZ', text: 'pog', avatar: null, color: '#7DD87D' },
  { id: 'pm6', user: 'MidnightFox', text: 'been here since the start 💪', avatar: null, color: '#5CE1E6' },
  { id: 'pm7', user: 'Blaze', text: '🔥🔥🔥', avatar: null, color: '#FF4444' },
];

export function streamTypesForPlan(plan = 'free') {
  const order = { free: 0, lite: 1, pro: 2 };
  const userLevel = order[plan] ?? 0;
  return STREAM_TYPE_LIST.filter(t => userLevel >= (order[t.minPlan] ?? 0));
}

export function isStreamTypeAllowed(typeId, plan = 'free') {
  const t = STREAM_TYPES[typeId];
  if (!t) return false;
  const order = { free: 0, lite: 1, pro: 2 };
  return (order[plan] ?? 0) >= (order[t.minPlan] ?? 0);
}
