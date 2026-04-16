import { doc, setDoc, increment } from 'firebase/firestore';
import { db } from '../firebase/config';

const today = () => new Date().toISOString().slice(0, 10);
const REF = (uid) => doc(db, 'users', uid, 'vergrMeViews', today());
const seen = new Set();

export async function trackPageView(uid) {
  const key = `${uid}-${today()}`;
  if (seen.has(key)) return;
  seen.add(key);
  const device = /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
  await setDoc(
    REF(uid),
    {
      date: today(),
      views: increment(1),
      [`devices.${device}`]: increment(1),
    },
    { merge: true }
  );
}

export async function trackLinkClick(uid, linkId) {
  await setDoc(
    REF(uid),
    { [`linkClicks.${linkId}`]: increment(1) },
    { merge: true }
  );
}

export async function trackMessageTap(uid) {
  await setDoc(
    REF(uid),
    { messageTaps: increment(1) },
    { merge: true }
  );
}

export async function trackEmailTap(uid) {
  await setDoc(
    REF(uid),
    { emailTaps: increment(1) },
    { merge: true }
  );
}

export async function trackTipTap(uid) {
  await setDoc(
    REF(uid),
    { tipTaps: increment(1) },
    { merge: true }
  );
}