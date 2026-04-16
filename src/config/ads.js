// ────────────────────────────────────────────────────────────
// Ads configuration
// ────────────────────────────────────────────────────────────
// Two ad networks, strictly partitioned by page to stay policy-safe:
//
//   • AdSense (Google)  — in-feed display ads. Lives on content pages
//     ONLY (feed, profile, clip viewer). AdSense forbids sharing a page
//     with incentivised or misleading ads, so the Earn screen must
//     never render an AdSense unit.
//
//   • Monetag (PropellerAds) — Direct Link for Watch-to-Earn, and a
//     pending Banner zone for inline feed units once Monetag approves
//     the publisher. Direct Link is the ONLY Monetag format allowed on
//     the Earn screen; In-Page Push (corner popups) is disabled because
//     it looks spammy and also conflicts with AdSense policy.
//
// While AdSense is in review, `adsense.publisherId` and `adsense.slots`
// stay blank and the in-feed component renders nothing (no ugly empty
// placeholders). Set the values from the AdSense dashboard to go live.

export const ADS_CONFIG = {
  // ── Google AdSense (non-incentivised display) ──────────────────────
  adsense: {
    // From AdSense → Account information. Format: ca-pub-XXXXXXXXXXXXXXXX
    publisherId: '',
    slots: {
      // From AdSense → Ads → By ad unit → In-feed ads
      feed: '',
    },
  },

  // ── Monetag ────────────────────────────────────────────────────────
  // In-Page Push intentionally removed (see sw.js comment).
  // Banner zone pending Monetag approval — add here when it lands:
  //   banner: { zoneId: '...', scriptSrc: '...' },
  banner: null,

  // Vignette (fullscreen pre-roll) — kept in config but DISABLED in
  // favour of a policy-clean experience while AdSense is the primary
  // monetisation path. Flip `enabled: true` only on pages that have no
  // AdSense unit on them.
  vignette: {
    enabled: false,
    zoneId: '10851366',
    scriptSrc: 'https://n6wxm.com/vignette.min.js',
  },

  // Direct Link opened by the Watch-to-Earn daily quest on /earn only
  directLinkUrl: 'https://omg10.com/4/10851371',

  // ── Tunable knobs ──────────────────────────────────────────────────

  // Feed posts between in-feed AdSense placements. AdSense requires a
  // healthy content-to-ad ratio; 6 is a safe floor.
  feedAdInterval: 6,

  // Watch-to-Earn (Earn screen only)
  watchToEarnSeconds: 30,
  watchToEarnVp: 100,
  dailyAdBonusThreshold: 10,
  dailyAdBonusVp: 250,
};

/** Returns true if the given zone has been configured AND is enabled. */
export const isAdZoneReady = (zone) => {
  if (zone === 'adsense-feed') {
    return !!(ADS_CONFIG.adsense.publisherId && ADS_CONFIG.adsense.slots.feed);
  }
  if (zone === 'banner') {
    return !!(ADS_CONFIG.banner && ADS_CONFIG.banner.zoneId && ADS_CONFIG.banner.scriptSrc);
  }
  if (zone === 'interstitial' || zone === 'vignette') {
    return !!(ADS_CONFIG.vignette.enabled && ADS_CONFIG.vignette.zoneId && ADS_CONFIG.vignette.scriptSrc);
  }
  if (zone === 'directlink') return !!ADS_CONFIG.directLinkUrl;
  return false;
};
