// ═══════════════════════════════════════════
// CLIENT-SIDE VIDEO COMPRESSION
// ═══════════════════════════════════════════
// Shrinks videos before upload using ffmpeg.wasm. Uses the single-threaded
// build so we don't need COOP/COEP headers (which would break Twitch/Klipy
// iframes). Trade-off: roughly 40% slower than the multi-threaded build.
//
// The ~25MB wasm binary is lazy-loaded only when the user actually picks a
// video, so the initial app bundle stays light.

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

// Per-tier compression targets.
// duration = hard cap in seconds (enforced by -t flag, also checked before).
// height   = target vertical resolution; width auto-scaled keeping aspect.
// bitrate  = target video bitrate.
// audio    = audio bitrate.
export const VIDEO_TIER_LIMITS = {
  free: { duration: 60,  height: 720,  bitrate: '1500k', audio: '96k'  },
  lite: { duration: 180, height: 1080, bitrate: '3000k', audio: '128k' },
  pro:  { duration: 600, height: 1080, bitrate: '4000k', audio: '192k' },
};

let ffmpegInstance = null;
let loadPromise = null;

async function getFFmpeg(onLog) {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const ffmpeg = new FFmpeg();
    if (onLog) ffmpeg.on('log', ({ message }) => onLog(message));

    // Single-threaded UMD build — no SharedArrayBuffer required.
    const base = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpeg.load({
      coreURL:    await toBlobURL(`${base}/ffmpeg-core.js`,  'text/javascript'),
      wasmURL:    await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  return loadPromise;
}

/**
 * Read a video's duration (seconds) without loading the whole file.
 * Uses an HTMLVideoElement so there's no ffmpeg round-trip.
 */
export function probeDuration(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      const d = v.duration;
      URL.revokeObjectURL(url);
      resolve(d);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Cannot read video metadata'));
    };
    v.src = url;
  });
}

/**
 * Compress a video Blob/File for the given tier.
 * @param {File|Blob} file
 * @param {'free'|'lite'|'pro'} tier
 * @param {(progress:number)=>void} [onProgress]  0..1
 * @returns {Promise<Blob>}
 */
export async function compressForTier(file, tier = 'free', onProgress) {
  const t = VIDEO_TIER_LIMITS[tier] || VIDEO_TIER_LIMITS.free;
  const ffmpeg = await getFFmpeg();

  // Wire progress callback (ffmpeg.wasm fires this with ratio 0..1).
  const handler = ({ progress }) => {
    if (onProgress && typeof progress === 'number') {
      onProgress(Math.min(Math.max(progress, 0), 1));
    }
  };
  ffmpeg.on('progress', handler);

  const inName  = 'input'  + (file.name ? file.name.slice(file.name.lastIndexOf('.')) : '.mp4');
  const outName = 'output.mp4';

  try {
    await ffmpeg.writeFile(inName, await fetchFile(file));

    // -vf scale=-2:H   → scale to target height, width auto (-2 keeps even)
    // -c:v libx264     → H.264 for universal playback
    // -preset veryfast → good speed/quality balance for browser ffmpeg
    // -crf 26          → quality floor; combined with -maxrate/-bufsize caps bitrate
    // -movflags +faststart → moves MOOV atom to front, instant play
    await ffmpeg.exec([
      '-i', inName,
      '-t', String(t.duration),
      '-vf', `scale=-2:${t.height}`,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '26',
      '-maxrate', t.bitrate,
      '-bufsize', `${parseInt(t.bitrate) * 2}k`,
      '-c:a', 'aac',
      '-b:a', t.audio,
      '-movflags', '+faststart',
      outName,
    ]);

    const data = await ffmpeg.readFile(outName);
    return new Blob([data.buffer], { type: 'video/mp4' });
  } finally {
    try { ffmpeg.off('progress', handler); } catch {}
    // Best-effort cleanup of ffmpeg's virtual FS
    try { await ffmpeg.deleteFile(inName); } catch {}
    try { await ffmpeg.deleteFile(outName); } catch {}
  }
}

/**
 * Friendly size formatter for progress UIs.
 */
export const formatMB = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)}MB`;
