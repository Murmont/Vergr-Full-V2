// src/utils/trackEvent.js
// Consent-gated behavioural event tracking. Writes fire-and-forget batched
// docs to users/{uid}/events/{autoId} so rollupUserAffinity can derive
// interest/creator/contentType/activeHours affinities nightly.
//
// GDPR notes:
//  - Requires personalizedAds consent === true (checked once per session).
//  - Events are for product usage: personalization + aggregate creator stats.
//  - No third-party trackers. Data stays in our Firestore.
//  - Retention: 90 days (rollups keep the aggregate, raw events get TTL-cleaned).
import { doc, getDoc, collection, addDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';

let _consentCache = null;          // { uid, personalizedAds, at }
let _sessionId = null;
let _queue = [];
let _flushTimer = null;
let _uid = null;

function getSessionId() {
  if (_sessionId) return _sessionId;
  try {
    const existing = sessionStorage.getItem('vergr_sid');
    if (existing) { _sessionId = existing; return _sessionId; }
    const sid = 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    sessionStorage.setItem('vergr_sid', sid);
    _sessionId = sid;
  } catch {
    _sessionId = 's_' + Date.now().toString(36);
  }
  return _sessionId;
}

async function checkConsent(uid) {
  if (!uid) return false;
  if (_consentCache && _consentCache.uid === uid && (Date.now() - _consentCache.at) < 60000) {
    return _consentCache.personalizedAds;
  }
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'meta', 'consents'));
    const data = snap.exists() ? snap.data() : {};
    const ok = data?.personalizedAds?.granted === true;
    _consentCache = { uid, personalizedAds: ok, at: Date.now() };
    return ok;
  } catch {
    return false;
  }
}

/** Call once on auth change to bind the tracker to a user */
export function setTrackingUser(uid) {
  _uid = uid || null;
  _consentCache = null;
}

/** Flush the in-memory queue to Firestore as a batch write */
async function flush() {
  if (!_uid || _queue.length === 0) return;
  const allowed = await checkConsent(_uid);
  if (!allowed) { _queue = []; return; }

  const batch = writeBatch(db);
  const eventsRef = collection(db, 'users', _uid, 'events');
  const items = _queue.splice(0, _queue.length);
  for (const ev of items) {
    const ref = doc(eventsRef);
    batch.set(ref, {
      ...ev,
      sid: getSessionId(),
      ts: serverTimestamp(),
      tsMs: Date.now(),
    });
  }
  try {
    await batch.commit();
  } catch (e) {
    console.warn('trackEvent flush failed:', e?.message);
  }
}

function scheduleFlush() {
  if (_flushTimer) return;
  _flushTimer = setTimeout(() => { _flushTimer = null; flush(); }, 4000);
}

/**
 * Track a user action. Fire-and-forget — no await needed.
 * type: 'view' | 'dwell' | 'like' | 'unlike' | 'comment' | 'share' | 'repost'
 *     | 'save' | 'hide' | 'report' | 'profile_visit' | 'creator_follow'
 *     | 'search' | 'tag_click' | 'game_click' | 'short_watched'
 *     | 'ad_impression' | 'ad_click' | 'ad_dismiss'
 * payload: { postId?, authorId?, contentType?, tags?, gameId?, dwellMs?, pct?, query?, ... }
 */
export function trackEvent(type, payload = {}) {
  if (!_uid || !type) return;
  const ev = { type };
  const keys = ['postId','authorId','contentType','tags','gameId','dwellMs','pct','query','target','adId','source'];
  for (const k of keys) if (payload[k] !== undefined && payload[k] !== null) ev[k] = payload[k];
  _queue.push(ev);
  if (_queue.length >= 20) flush(); else scheduleFlush();
}

/** Flush on unload so no events are lost */
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => { flush(); });
  window.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
}
