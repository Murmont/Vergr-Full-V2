import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { getDatabase } from 'firebase/database';
import { getMessaging, isSupported } from 'firebase/messaging';

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