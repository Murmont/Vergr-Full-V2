import { useEffect, useRef } from 'react';
import { ADS_CONFIG, isAdZoneReady } from '../config/ads';

// ────────────────────────────────────────────────────────────
// VergrAd — Google AdSense in-feed ad unit
// ────────────────────────────────────────────────────────────
// Drops a single AdSense <ins> block styled to match PostCard. The
// AdSense loader script is injected exactly once per page; every
// mounted <VergrAd /> just calls `adsbygoogle.push({})` to request a
// fill for its own slot.
//
// IMPORTANT policy boundaries (do NOT relax these without reading the
// AdSense program policies):
//
//   1. Never render this component on /earn, /quests or anywhere that
//      also prompts the user to watch ads for rewards. That's an
//      incentivised-traffic violation and AdSense will ban the account.
//   2. Never auto-click, hover-click, or encourage users to click. No
//      "click this ad for VP" copy anywhere nearby.
//   3. Until the account + domain is approved, `publisherId` / `slots.feed`
//      stay blank and this component renders nothing — no blank grey
//      boxes, no "Sponsored" placeholder. Clean feed while in review.
//
// Props:
//   zone — "inpage" is the only supported value today. Kept so callers
//          don't have to change when a secondary slot (e.g. profile)
//          is added later.

const SCRIPT_FLAG = '__vergr_adsense_loaded__';

function loadAdSenseOnce(publisherId) {
  if (typeof window === 'undefined') return;
  if (window[SCRIPT_FLAG]) return;
  window[SCRIPT_FLAG] = true;
  try {
    const s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(publisherId)}`;
    s.setAttribute('data-cfasync', 'false');
    document.head.appendChild(s);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[VergrAd] AdSense loader failed:', err && err.message);
  }
}

export default function VergrAd({ zone = 'inpage' }) {
  const insRef = useRef(null);
  const pushedRef = useRef(false);

  const ready = isAdZoneReady('adsense-feed');
  const { publisherId, slots } = ADS_CONFIG.adsense;
  const slotId = zone === 'inpage' ? slots.feed : null;

  useEffect(() => {
    if (!ready || !slotId) return;
    loadAdSenseOnce(publisherId);
    if (pushedRef.current) return;
    pushedRef.current = true;
    // Defer the push so the <ins> has been laid out before AdSense reads
    // its width. Without this, the first request on SPA route change can
    // arrive with width=0 and return nothing.
    const t = setTimeout(() => {
      try {
        // eslint-disable-next-line no-undef
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[VergrAd] adsbygoogle.push failed:', err && err.message);
      }
    }, 0);
    return () => clearTimeout(t);
  }, [ready, publisherId, slotId]);

  // Not configured yet → render nothing. Clean feed during review.
  if (!ready || !slotId) return null;

  return (
    <div className="mb-3 overflow-hidden rounded-2xl border border-white/[0.06] bg-surface-1">
      <ins
        ref={insRef}
        className="adsbygoogle block"
        style={{ display: 'block' }}
        data-ad-client={publisherId}
        data-ad-slot={slotId}
        data-ad-format="fluid"
        data-ad-layout-key="-6t+ed+2i-1n-4w"
        data-full-width-responsive="true"
      />
    </div>
  );
}
