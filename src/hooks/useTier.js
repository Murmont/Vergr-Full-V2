// src/hooks/useTier.js
import { useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { getTierConfig, checkFeatureAccess, checkFileSizeAccess } from '../utils/tierSystem';

/**
 * useTier — Returns the current user's tier and helper functions.
 *
 * Reads `tier` field from the shared UserContext profile (no extra Firestore
 * listener — UserContext already subscribes to the user doc once for the
 * whole app, so adding our own listener here was doubling read costs on
 * every profile/wallet update).
 */
export default function useTier() {
  const { profile } = useUser();
  const tier = profile?.tier || 'free';

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