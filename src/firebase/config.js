import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { getDatabase } from 'firebase/database';
import { getMessaging, isSupported } from 'firebase/messaging';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: "AIzaSyCuwlEMPFzhmXx_FqdWiYWlshuRT_EIkoI",
  authDomain: "vergr-44494.firebaseapp.com",
  databaseURL: "https://vergr-44494-default-rtdb.firebaseio.com",
  projectId: "vergr-44494",
  storageBucket: "vergr-44494.firebasestorage.app",
  messagingSenderId: "674096624319",
  appId: "1:674096624319:web:a01744f81795f15b354c0a",
  measurementId: "G-674096624319"
};

// Check if Firebase is configured (has a real API key)
export const isFirebaseConfigured = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== 'demo-key';

const app = initializeApp(firebaseConfig);

// ─── App Check (reCAPTCHA Enterprise) ─────────────────────────────
// Token is attached automatically to all Firestore / Functions / Storage calls.
// To enable the debug token during local dev, set VITE_APPCHECK_DEBUG=true in .env.local
// then grab the printed token from the browser console and allow-list it in the
// Firebase console → App Check → Apps → Debug tokens.
try {
  if (typeof window !== 'undefined' && isFirebaseConfigured) {
    if (import.meta.env.DEV && import.meta.env.VITE_APPCHECK_DEBUG === 'true') {
      // eslint-disable-next-line no-undef
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider('6LeJdbksAAAAAPARHuVkmwui1xGN37vuz3DLxCXu'),
      isTokenAutoRefreshEnabled: true,
    });
  }
} catch (err) {
  // App Check init failures should not crash the app — log and move on.
  console.warn('App Check init failed:', err?.message || err);
}

// IMPORTANT: Your Firestore uses custom database ID 'vgrdb', not '(default)'
export const db = isFirebaseConfigured
  ? initializeFirestore(app, {}, 'vgrdb')
  : null;

export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = isFirebaseConfigured ? getFunctions(app, 'europe-west1') : null;
export const rtdb = getDatabase(app);

// Auth providers
export const googleProvider = new GoogleAuthProvider();

// FCM messaging — only available in supported browsers
export let messaging = null;
isSupported().then(supported => {
  if (supported && isFirebaseConfigured) {
    messaging = getMessaging(app);
  }
}).catch(() => {});

export default app;