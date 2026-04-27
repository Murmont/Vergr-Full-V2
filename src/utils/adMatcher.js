// src/utils/adMatcher.js
// Consent-gated ad targeting. Loads the current user's affinity rollup
// (users/{uid}/meta/affinity, built by rollupUserAffinity) and scores each
// Firestore ad against it. Falls back to random order when the user hasn't
// consented to personalizedAds, or has no affinity yet.
//
// Ad schema expected (all optional, any combination):
//   targetGames:   string[]   — e.g. ['valorant','apex']
//   targetTags:    string[]   — e.g. ['esports','fps']
//   targetContentTypes: string[] — e.g. ['clip','short']
//   targetAgeBuckets: string[] — ['18-24','25-34', ...]
//   targetGenders: string[]   — ['male','female','nyb']
//   targetCountries: string[] — ISO-2 codes
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

let _cache = null; // { uid, affinity, consents, user, at }

async function loadContext(uid) {
  if (!uid) return null;
  if (_cache && _cache.uid === uid && (Date.now() - _cache.at) < 5 * 60 * 1000) return _cache;
  try {
    const [affSnap, conSnap, userSnap, sigSnap] = await Promise.all([
      getDoc(doc(db, 'users', uid, 'meta', 'affinity')),
      getDoc(doc(db, 'users', uid, 'meta', 'consents')),
      getDoc(doc(db, 'users', uid)),
      getDoc(doc(db, 'users', uid, 'meta', 'signals')),
    ]);
    _cache = {
      uid,
      affinity: affSnap.exists() ? affSnap.data() : null,
      consents: conSnap.exists() ? conSnap.data() : {},
      user:     userSnap.exists() ? userSnap.data() : {},
      signals:  sigSnap.exists() ? sigSnap.data() : {},
      at: Date.now(),
    };
    return _cache;
  } catch {
    return null;
  }
}

function score(ad, ctx) {
  if (!ctx) return 0;
  const { affinity, user, signals, consents } = ctx;
  const personalizedOK = consents?.personalizedAds?.granted === true;
  let s = 0;

  // Demographic targeting — always allowed (non-behavioral)
  if (ad.targetAgeBuckets?.length && user?.ageBucket) {
    if (ad.targetAgeBuckets.includes(user.ageBucket)) s += 6;
    else s -= 3; // hard-miss: don't show 45+-targeted ad to a 17 yr old
  }
  if (ad.targetGenders?.length && user?.gender) {
    if (ad.targetGenders.includes(user.gender)) s += 4;
  }
  if (ad.targetCountries?.length) {
    const country = user?.country || signals?.country;
    if (country && ad.targetCountries.includes(country)) s += 4;
  }

  // Behavioural targeting — only with personalizedAds consent
  if (personalizedOK && affinity) {
    const mapVal = (arr) => {
      const m = {};
      (arr || []).forEach(({ name, value }) => { if (name) m[name] = value || 1; });
      return m;
    };
    const games = mapVal(affinity.topGames);
    const tags  = mapVal(affinity.topTags);
    const types = mapVal(affinity.topContentTypes);

    if (ad.targetGames?.length) {
      for (const g of ad.targetGames) if (games[g]) s += Math.min(games[g] / 5, 10);
    }
    if (ad.targetTags?.length) {
      for (const t of ad.targetTags) if (tags[t]) s += Math.min(tags[t] / 5, 8);
    }
    if (ad.targetContentTypes?.length) {
      for (const ct of ad.targetContentTypes) if (types[ct]) s += Math.min(types[ct] / 10, 5);
    }
  }

  // Tie-breaker — small randomness so untargeted ads rotate
  s += Math.random() * 0.5;
  return s;
}

/**
 * Score + order ads by relevance to the current user. Returns a new array.
 * Ads with hard-miss demographic filters (e.g. age mismatch) drop to the tail.
 */
export async function orderAdsByAffinity(ads, uid) {
  if (!Array.isArray(ads) || ads.length === 0) return ads || [];
  const ctx = await loadContext(uid);
  if (!ctx) return ads;
  return [...ads]
    .map(ad => ({ ad, s: score(ad, ctx) }))
    .sort((a, b) => b.s - a.s)
    .map(x => x.ad);
}

/** Clear the cache — call on logout or consent change */
export function invalidateAdMatcher() { _cache = null; }
