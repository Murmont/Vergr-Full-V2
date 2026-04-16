import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase/config';

const REF = (uid) => doc(db, 'users', uid, 'vergrMe', 'page');

export function useVergrMe(uid) {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    getDoc(REF(uid)).then((snap) => {
      setPage(snap.exists() ? snap.data() : null);
      setLoading(false);
    });
  }, [uid]);

  return { page, loading };
}

export function useMyVergrMe() {
  return useVergrMe(auth.currentUser?.uid);
}

export async function initVergrMePage(uid, profile) {
  const ref = REF(uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();

  const defaults = {
    username: profile.username,
    displayName: profile.displayName || profile.username,
    bio: profile.bio || '',
    useProfileAvatar: true,
    customAvatarUrl: null,
    theme: 'dark',
    accentColor: '#00e5ff',
    bannerStyle: 'gradient',
    bannerUrl: null,
    buttonStyle: 'card',
    showMessageBtn: true,
    showFollowers: true,
    showSocials: true,
    showEmail: false,
    contactEmail: null,
    socials: {
      instagram: null,
      x: null,
      youtube: null,
      tiktok: null,
      linkedin: null,
      github: null,
      twitch: null,
      discord: null,
    },
    links: [],
    pinnedMedia: [],
    tipJarEnabled: false,
    tipJarLabel: 'Buy me a coffee',
    isPublic: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, defaults);
  return defaults;
}

export async function saveVergrMePage(updates) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  await setDoc(REF(uid), { ...updates, updatedAt: serverTimestamp() }, { merge: true });
}

export async function addVergrMeLink(link) {
  const uid = auth.currentUser?.uid;
  const snap = await getDoc(REF(uid));
  const links = snap.data()?.links || [];
  links.push({
    ...link,
    id: `l${Date.now()}`,
    clicks: 0,
    enabled: true,
    order: links.length,
  });
  await updateDoc(REF(uid), { links, updatedAt: serverTimestamp() });
}

export async function removeVergrMeLink(linkId) {
  const uid = auth.currentUser?.uid;
  const snap = await getDoc(REF(uid));
  const links = (snap.data()?.links || []).filter((l) => l.id !== linkId);
  await updateDoc(REF(uid), { links, updatedAt: serverTimestamp() });
}