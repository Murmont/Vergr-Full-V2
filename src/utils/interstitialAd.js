// ────────────────────────────────────────────────────────────
// Monetag vignette (interstitial) trigger
// ────────────────────────────────────────────────────────────
// Single source of truth for firing the fullscreen interstitial ad
// when the user explicitly hits "Play" on a video. Used by:
//   - src/components/EmbedVideoPlayer.jsx (in-feed videos)
//   - src/screens/viewer/ClipViewerScreen.jsx (fullscreen clip viewer)
//
// Currently a no-op: ADS_CONFIG.vignette.enabled is false while AdSense
// is the primary in-feed unit. Running a Monetag vignette on the same
// page as AdSense would trigger an incentivised-traffic / competing-
// network policy flag. Flip `enabled: true` in src/config/ads.js ONLY
// on pages that have no AdSense placements.
//
// Behaviour:
//   1. No-op if the interstitial zone hasn't been configured + enabled.
//   2. Loads the Monetag script tag once per page load (the script
//      hooks itself into the document and listens for the next user
//      interaction — that's how their interstitial format works).
//   3. Enforces a per-session cooldown so we don't burn through goodwill
//      by interrupting back-to-back plays. Monetag also has its own
//      server-side frequency capping but this is a safety net.

import { ADS_CONFIG, isAdZoneReady } from '../config/ads';

const SCRIPT_FLAG = '__vergrad_interstitial_loaded__';
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between interstitials
let lastFiredAt = 0;

function loadScriptOnce() {
  if (typeof window === 'undefined') return;
  if (window[SCRIPT_FLAG]) return;
  const { zoneId, scriptSrc } = ADS_CONFIG.vignette || {};
  if (!zoneId || !scriptSrc) return;
  window[SCRIPT_FLAG] = true;
  try {
    // Match Monetag's exact "Get tag" injection pattern (append-first,
    // then set dataset.zone, then set src).
    const s = document.createElement('script');
    s.async = true;
    s.setAttribute('data-cfasync', 'false');
    (document.body || document.documentElement).appendChild(s);
    s.dataset.zone = String(zoneId);
    s.src = scriptSrc;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[interstitialAd] injection failed:', err && err.message);
  }
}

/**
 * Fire the interstitial. Safe to call from any video Play handler —
 * silently no-ops if not configured or still in cooldown.
 */
export function triggerInterstitial() {
  if (!isAdZoneReady('interstitial')) return;
  const now = Date.now();
  if (now - lastFiredAt < COOLDOWN_MS) return;
  lastFiredAt = now;
  loadScriptOnce();
  // PropellerAds interstitials hook themselves into the next user
  // gesture; loading the script during the click handler is enough.
}
