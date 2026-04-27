// src/utils/streamModeration.js
// Client helpers for the Gemini-backed moderation callables.
// Also provides a frame sampler that runs in the broadcaster's browser
// so we don't need a server-side FFmpeg process per stream.

import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';

const moderateMessageFn = functions ? httpsCallable(functions, 'moderateMessage') : null;
const moderateStreamFrameFn = functions ? httpsCallable(functions, 'moderateStreamFrame') : null;
const reportStreamFn = functions ? httpsCallable(functions, 'reportStream') : null;

/**
 * Run a chat message through Gemini. Returns { ok:true } on pass,
 * { ok:false, reason } on block. Fails open on network errors so
 * an outage doesn't silence chat.
 */
export async function moderateChatMessage(text, chatId = null) {
  if (!moderateMessageFn) return { ok: true, skipped: 'no_functions' };
  try {
    const { data } = await moderateMessageFn({ text, chatId });
    return data || { ok: true };
  } catch (err) {
    console.warn('moderateMessage failed:', err);
    return { ok: true, skipped: 'error' };
  }
}

export async function reportStream(streamId, reason, detail = '') {
  if (!reportStreamFn) return { ok: false };
  try {
    const { data } = await reportStreamFn({ streamId, reason, detail });
    return data || { ok: true };
  } catch (err) {
    console.error('reportStream failed:', err);
    return { ok: false };
  }
}

/**
 * Capture a JPEG frame from a <video> element and send it to Gemini.
 * Returns { ok:true } pass, { ok:false, reason, shouldKill } block.
 */
async function captureAndCheck(videoEl, streamId) {
  if (!videoEl || videoEl.readyState < 2) return { ok: true, skipped: 'not_ready' };
  const canvas = document.createElement('canvas');
  // Downscale to 480p to keep payload small (Gemini accepts up to ~20MB but smaller = faster)
  const w = Math.min(640, videoEl.videoWidth || 640);
  const h = Math.round(w * (videoEl.videoHeight / videoEl.videoWidth || 0.5625));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoEl, 0, 0, w, h);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
  const imageBase64 = dataUrl.split(',')[1];
  try {
    const { data } = await moderateStreamFrameFn({ streamId, imageBase64, mimeType: 'image/jpeg' });
    return data || { ok: true };
  } catch (err) {
    console.warn('moderateStreamFrame failed:', err);
    return { ok: true, skipped: 'error' };
  }
}

/**
 * Start a sampler that grabs a frame from videoEl every intervalMs and
 * sends to Gemini. Returns a stop() function.
 *
 *   const stop = startStreamFrameSampler(videoRef.current, streamId, {
 *     intervalMs: 15000,
 *     onFlag: ({ reason, shouldKill }) => { ... },
 *   });
 */
export function startStreamFrameSampler(videoEl, streamId, {
  intervalMs = 15000,
  onFlag = () => {},
  onWarn = () => {},
} = {}) {
  if (!moderateStreamFrameFn || !videoEl) return () => {};
  let stopped = false;
  const tick = async () => {
    if (stopped) return;
    const result = await captureAndCheck(videoEl, streamId);
    if (!result.ok) {
      if (result.shouldKill) onFlag(result);
      else onWarn(result);
    }
  };
  // First check after 10s — don't flag a black startup frame.
  const firstT = setTimeout(tick, 10_000);
  const loop = setInterval(tick, intervalMs);
  return () => {
    stopped = true;
    clearTimeout(firstT);
    clearInterval(loop);
  };
}
