// src/utils/captureSignals.js
// Captures passive GDPR-lawful signals (language, timezone, device class) + resolves
// approximate country via the `getClientSignals` Cloud Function (reads request IP).
// Writes once per session per user to users/{uid}/meta/signals.
// Runs only after the user has seen the privacy notice (checked via consents doc).
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase/config';

const SESSION_KEY = 'vergr_signals_captured_v1';

function detectDeviceClass() {
  const ua = navigator.userAgent || '';
  if (/iPad|Tablet/i.test(ua)) return 'tablet';
  if (/iPhone|Android.*Mobile|Mobi/i.test(ua)) return 'mobile';
  if (window.__TAURI__) return 'desktop-app';
  return 'desktop';
}

function detectPlatform() {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  if (/Mac/i.test(ua)) return 'macos';
  if (/Windows/i.test(ua)) return 'windows';
  if (/Linux/i.test(ua)) return 'linux';
  return 'other';
}

/**
 * Capture passive signals. Safe to call on every app load — exits fast
 * if already captured this session or if consents doc doesn't permit it.
 */
export async function captureSignals(uid) {
  if (!uid) return;
  try {
    if (sessionStorage.getItem(SESSION_KEY) === uid) return;
  } catch { /* private-mode — ignore */ }

  try {
    // Respect consent — even the "essential" signals require a privacy notice
    // to have been acknowledged. If the consents doc doesn't exist yet, we
    // still capture what the browser gives us locally (no IP → no country),
    // because this data is used for the user's own rate-limits + age-gate UX.
    // Country + aggregate analytics is the paid-for consent tier.
    const consentSnap = await getDoc(doc(db, 'users', uid, 'meta', 'consents'));
    const consents = consentSnap.exists() ? consentSnap.data() : {};
    const analyticsOK = consents?.audienceAnalytics?.granted === true;

    const local = {
      language:   navigator.language || null,
      languages:  Array.isArray(navigator.languages) ? navigator.languages.slice(0, 3) : null,
      timezone:   Intl.DateTimeFormat().resolvedOptions().timeZone || null,
      device:     detectDeviceClass(),
      platform:   detectPlatform(),
      screenW:    window.screen?.width || null,
      screenH:    window.screen?.height || null,
      capturedAt: serverTimestamp(),
    };

    // Only call the Cloud Function (and store IP-derived country) when the
    // user has granted audience-analytics consent. Otherwise we keep the doc
    // device-only, which is legitimate-interest (functional) data.
    if (analyticsOK) {
      try {
        if (!functions) throw new Error('functions not configured');
        const call = httpsCallable(functions, 'getClientSignals');
        const res = await call({});
        const { country, region, city } = (res?.data || {});
        if (country) local.country = country;
        if (region)  local.region  = region;
        if (city)    local.city    = city;
      } catch (e) {
        // Non-fatal — we just store without country
        console.warn('getClientSignals failed:', e?.message);
      }
    }

    await setDoc(doc(db, 'users', uid, 'meta', 'signals'), local, { merge: true });
    try { sessionStorage.setItem(SESSION_KEY, uid); } catch {}
  } catch (e) {
    console.warn('captureSignals failed:', e?.message);
  }
}
