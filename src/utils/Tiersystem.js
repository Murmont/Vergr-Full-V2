// ═══════════════════════════════════════════
// VERGR SUBSCRIPTION TIERS — Free / Lite / Pro
// ═══════════════════════════════════════════
// Commission is determined ONLY by VP level, NOT by plan.
// Plans grant VP multipliers, monthly bonuses, and feature unlocks.

export const TIERS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceLabel: 'Free',
    color: '#7B82A8',
    icon: 'person',
    tagline: 'Get started',
    features: [
      'Ads between posts',
      '25MB uploads, 60s shorts',
      '720p video',
      'Core social + tournaments',
    ],
  },
  lite: {
    id: 'lite',
    name: 'Lite',
    price: 9.99,
    priceLabel: '$9.99/mo',
    color: '#7B6FFF',
    icon: 'bolt',
    tagline: 'Level up faster',
    features: [
      'No ads',
      '100MB uploads, 1080p',
      '1.5× VP multiplier',
      '+1,000 VP & +50 coins monthly',
      'Create squads & tournaments',
      'Stream at 1080p',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 24.99,
    priceLabel: '$24.99/mo',
    color: '#F5C542',
    icon: 'workspace_premium',
    tagline: 'Go all-in',
    features: [
      'No ads',
      '500MB uploads, 4K',
      '2× VP multiplier',
      '+3,000 VP & +150 coins monthly',
      'Stream at 1440p/60fps',
      'Vergr.me custom domain',
      'Advanced analytics',
      'Priority support',
    ],
  },
};

// ── FEATURE FLAGS (per tier, complete matrix) ──
export const TIER_FEATURES = {
  free: {
    // Access & Core
    ads: true,
    mediaPerDay: 50,
    // Uploads
    maxUploadMB: 25,
    maxShortSeconds: 60,
    maxQuality: '720p',
    // Streaming
    canStream: false,
    streamQuality: null,
    streamHoursPerMonth: 0,
    coStream: false,
    // Tournaments
    canCreateTournament: false,
    maxTournamentSize: 0,
    tournamentBracketTypes: [],
    // Squads
    canCreateSquad: false,
    maxSquadsOwned: 0,
    maxSquadMembers: 0,
    // Messaging
    voiceMessages: false,
    videoMessages: false,
    maxPinnedChats: 0,
    // Economy
    vpMultiplier: 1,
    monthlyVP: 0,
    monthlyCoins: 0,
    coinPackDiscount: 0,
    // Vergr.me
    vergrMeEnabled: true,
    vergrMeCustomDomain: false,
    vergrMeAnalytics: false,
    vergrMeThemes: 'basic',
    // Content creation
    postBoosts: false,
    scheduledPosts: false,
    draftsLimit: 5,
    // Profile
    animatedAvatar: false,
    customBanner: false,
    profileBadge: null,
    // Tools
    advancedAnalytics: false,
    earlyAccess: false,
    prioritySupport: false,
  },
  lite: {
    ads: false,
    mediaPerDay: 200,
    maxUploadMB: 100,
    maxShortSeconds: 60,
    maxQuality: '1080p',
    canStream: true,
    streamQuality: '1080p30',
    streamHoursPerMonth: 40,
    coStream: false,
    canCreateTournament: true,
    maxTournamentSize: 32,
    tournamentBracketTypes: ['single_elim', 'double_elim', 'round_robin'],
    canCreateSquad: true,
    maxSquadsOwned: 2,
    maxSquadMembers: 25,
    voiceMessages: true,
    videoMessages: false,
    maxPinnedChats: 5,
    vpMultiplier: 1.5,
    monthlyVP: 1000,
    monthlyCoins: 50,
    coinPackDiscount: 0.05,
    vergrMeEnabled: true,
    vergrMeCustomDomain: false,
    vergrMeAnalytics: true,
    vergrMeThemes: 'standard',
    postBoosts: true,
    scheduledPosts: true,
    draftsLimit: 25,
    animatedAvatar: false,
    customBanner: true,
    profileBadge: 'lite',
    advancedAnalytics: false,
    earlyAccess: false,
    prioritySupport: false,
  },
  pro: {
    ads: false,
    mediaPerDay: Infinity,
    maxUploadMB: 500,
    maxShortSeconds: 180,
    maxQuality: '4K',
    canStream: true,
    streamQuality: '1440p60',
    streamHoursPerMonth: Infinity,
    coStream: true,
    canCreateTournament: true,
    maxTournamentSize: 256,
    tournamentBracketTypes: ['single_elim', 'double_elim', 'round_robin', 'swiss', 'battle_royale', 'invitational'],
    canCreateSquad: true,
    maxSquadsOwned: 10,
    maxSquadMembers: 100,
    voiceMessages: true,
    videoMessages: true,
    maxPinnedChats: 25,
    vpMultiplier: 2,
    monthlyVP: 3000,
    monthlyCoins: 150,
    coinPackDiscount: 0.10,
    vergrMeEnabled: true,
    vergrMeCustomDomain: true,
    vergrMeAnalytics: true,
    vergrMeThemes: 'premium',
    postBoosts: true,
    scheduledPosts: true,
    draftsLimit: Infinity,
    animatedAvatar: true,
    customBanner: true,
    profileBadge: 'pro',
    advancedAnalytics: true,
    earlyAccess: true,
    prioritySupport: true,
  },
};

// ── TIER COMPARISON ROWS (used by pricing screen) ──
export const TIER_COMPARISON = [
  { section: 'Core',          feature: 'Ads',                 free: 'Yes',      lite: 'No',        pro: 'No' },
  { section: 'Core',          feature: 'Media/day',           free: '50',       lite: '200',       pro: 'Unlimited' },
  { section: 'Uploads',       feature: 'Upload limit',        free: '25MB',     lite: '100MB',     pro: '500MB' },
  { section: 'Uploads',       feature: 'Max short length',    free: '60s',      lite: '60s',       pro: '180s' },
  { section: 'Uploads',       feature: 'Max quality',         free: '720p',     lite: '1080p',     pro: '4K' },
  { section: 'Streaming',     feature: 'Go live',             free: 'No',       lite: 'Yes',       pro: 'Yes' },
  { section: 'Streaming',     feature: 'Stream quality',      free: '—',        lite: '1080p30',   pro: '1440p60' },
  { section: 'Streaming',     feature: 'Monthly stream hrs',  free: '—',        lite: '40h',       pro: 'Unlimited' },
  { section: 'Streaming',     feature: 'Co-streaming',        free: 'No',       lite: 'No',        pro: 'Yes' },
  { section: 'Tournaments',   feature: 'Create tournaments',  free: 'No',       lite: 'Up to 32',  pro: 'Up to 256' },
  { section: 'Tournaments',   feature: 'Bracket formats',     free: '—',        lite: '3 formats', pro: 'All 6 formats' },
  { section: 'Squads',        feature: 'Create squads',       free: 'No',       lite: '2 squads',  pro: '10 squads' },
  { section: 'Squads',        feature: 'Max members',         free: '—',        lite: '25',        pro: '100' },
  { section: 'Messaging',     feature: 'Voice messages',      free: 'No',       lite: 'Yes',       pro: 'Yes' },
  { section: 'Messaging',     feature: 'Video messages',      free: 'No',       lite: 'No',        pro: 'Yes' },
  { section: 'Messaging',     feature: 'Pinned chats',        free: '0',        lite: '5',         pro: '25' },
  { section: 'Economy',       feature: 'VP multiplier',       free: '1×',       lite: '1.5×',      pro: '2×' },
  { section: 'Economy',       feature: 'Monthly VP',          free: '0',        lite: '1,000',     pro: '3,000' },
  { section: 'Economy',       feature: 'Monthly coins',       free: '0',        lite: '50',        pro: '150' },
  { section: 'Economy',       feature: 'Coin pack discount',  free: '0%',       lite: '5%',        pro: '10%' },
  { section: 'Vergr.me',      feature: 'Custom domain',       free: 'No',       lite: 'No',        pro: 'Yes' },
  { section: 'Vergr.me',      feature: 'Analytics',           free: 'No',       lite: 'Basic',     pro: 'Advanced' },
  { section: 'Vergr.me',      feature: 'Themes',              free: 'Basic',    lite: 'Standard',  pro: 'Premium' },
  { section: 'Content',       feature: 'Post boosts',         free: 'No',       lite: 'Yes',       pro: 'Yes' },
  { section: 'Content',       feature: 'Scheduled posts',     free: 'No',       lite: 'Yes',       pro: 'Yes' },
  { section: 'Content',       feature: 'Drafts',              free: '5',        lite: '25',        pro: 'Unlimited' },
  { section: 'Profile',       feature: 'Animated avatar',     free: 'No',       lite: 'No',        pro: 'Yes' },
  { section: 'Profile',       feature: 'Custom banner',       free: 'No',       lite: 'Yes',       pro: 'Yes' },
  { section: 'Profile',       feature: 'Plan badge',          free: '—',        lite: 'Lite',      pro: 'Pro' },
  { section: 'Tools',         feature: 'Advanced analytics',  free: 'No',       lite: 'No',        pro: 'Yes' },
  { section: 'Tools',         feature: 'Early access',        free: 'No',       lite: 'No',        pro: 'Yes' },
  { section: 'Tools',         feature: 'Priority support',    free: 'No',       lite: 'No',        pro: 'Yes' },
];

export default TIERS;

export const getTierConfig = (t) => TIERS[t] || TIERS.free;
export const getTierFeatures = (t) => TIER_FEATURES[t] || TIER_FEATURES.free;

export const checkFeatureAccess = (tier, feature) => {
  const t = TIER_FEATURES[tier] || TIER_FEATURES.free;
  return t[feature] ?? TIER_FEATURES.free[feature];
};

export const checkFileSizeAccess = (tier, fileSize) => {
  const isBytes = fileSize > 1000;
  const mb = isBytes ? fileSize / 1024 / 1024 : fileSize;
  const max = (TIER_FEATURES[tier] || TIER_FEATURES.free).maxUploadMB;
  return {
    allowed: mb <= max,
    message: mb > max ? `File too large. Max ${max}MB for ${tier} tier.` : 'OK',
    maxMB: max,
  };
};
