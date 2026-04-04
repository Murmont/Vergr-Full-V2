// src/hooks/useTier.js
import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { getTierConfig, checkFeatureAccess, checkFileSizeAccess } from '../utils/tierSystem';

/**
 * useTier — Returns the current user's tier and helper functions.
 *
 * Reads `tier` field from the user's Firestore profile doc.
 * Defaults to 'free' if not set.
 *
 * Returns:
 *   tier        — 'free' | 'lite' | 'pro'
 *   tierConfig  — full config object from tierSystem.js
 *   checkFeature(featureKey) — { allowed, requiredTier, message }
 *   checkFileSize(bytes)     — { allowed, requiredTier, message }
 *   isPro       — boolean shortcut
 *   isLite      — boolean shortcut
 *   isFree      — boolean shortcut
 */
export default function useTier() {
  const [tier, setTier] = useState('free');

  useEffect(() => {
    if (!auth.currentUser) return;
    const unsub = onSnapshot(
      doc(db, 'users', auth.currentUser.uid),
      (snap) => {
        if (snap.exists()) {
          setTier(snap.data().tier || 'free');
        }
      },
      () => {} // silently fail
    );
    return () => unsub();
  }, []);

  const tierConfig = getTierConfig(tier);

  const checkFeature = useCallback((feature) => {
    return checkFeatureAccess(tier, feature);
  }, [tier]);

  const checkFileSize = useCallback((bytes) => {
    return checkFileSizeAccess(tier, bytes);
  }, [tier]);

  return {
    tier,
    tierConfig,
    checkFeature,
    checkFileSize,
    isPro: tier === 'pro',
    isLite: tier === 'lite',
    isFree: tier === 'free',
  };
}