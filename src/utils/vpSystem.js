// ═══════════════════════════════════════════
// VERGR ECONOMY — THREE CURRENCIES
// ═══════════════════════════════════════════
// Coins: bought with real money, spent in-app
// Gems: earned when someone spends coins ON YOU, cashable
// VP: earned through activity, drives levels/perks/discounts

// ── VP LEVELS ──
export const VP_LEVELS = [
  { level: 1, name: 'Rookie',    vpRequired: 0,       ring: null,      ringColor: null,         discount: 0,    commission: 0.30, reaction: 0, features: [] },
  { level: 2, name: 'Contender', vpRequired: 500,     ring: 'bronze',  ringColor: '#CD7F32',    discount: 0,    commission: 0.28, reaction: 1, features: ['bronze_ring', 'custom_reaction'] },
  { level: 3, name: 'Rival',     vpRequired: 2000,    ring: 'silver',  ringColor: '#C0C0C0',    discount: 0,    commission: 0.25, reaction: 2, features: ['silver_ring', 'colored_name'] },
  { level: 4, name: 'Elite',     vpRequired: 5000,    ring: 'gold',    ringColor: '#F5C542',    discount: 0.03, commission: 0.22, reaction: 3, features: ['gold_ring', '3%_discount'] },
  { level: 5, name: 'Champion',  vpRequired: 15000,   ring: 'platinum',ringColor: '#4DFFD4',    discount: 0.05, commission: 0.20, reaction: 4, features: ['platinum_ring', '5%_discount', 'lfg_priority'] },
  { level: 6, name: 'Legend',    vpRequired: 40000,   ring: 'diamond', ringColor: '#7B6FFF',    discount: 0.10, commission: 0.18, reaction: 5, features: ['diamond_ring', '10%_discount', 'weekly_boost'] },
  { level: 7, name: 'Mythic',    vpRequired: 100000,  ring: 'mythic',  ringColor: '#C87FFF',    discount: 0.15, commission: 0.15, reaction: 6, features: ['animated_ring', '15%_discount', 'mythic_badge', 'early_access'] },
];

// Get user's VP level from their total VP
export const getVPLevel = (totalVP) => {
  let current = VP_LEVELS[0];
  for (const level of VP_LEVELS) {
    if (totalVP >= level.vpRequired) current = level;
    else break;
  }
  return current;
};

// Get progress to next level (0-100%)
export const getVPProgress = (totalVP) => {
  const current = getVPLevel(totalVP);
  const currentIndex = VP_LEVELS.indexOf(current);
  if (currentIndex >= VP_LEVELS.length - 1) return 100; // Max level
  const next = VP_LEVELS[currentIndex + 1];
  const progress = (totalVP - current.vpRequired) / (next.vpRequired - current.vpRequired);
  return Math.min(Math.max(progress * 100, 0), 100);
};

// Get the next level info
export const getNextVPLevel = (totalVP) => {
  const current = getVPLevel(totalVP);
  const currentIndex = VP_LEVELS.indexOf(current);
  if (currentIndex >= VP_LEVELS.length - 1) return null;
  return VP_LEVELS[currentIndex + 1];
};

// Get gem conversion rate for a user based on VP level
// Buyer pays X coins → seller receives Y gems
// Commission = platform cut. Seller gets (1 - commission) gems per coin.
export const getGemRate = (totalVP) => {
  const level = getVPLevel(totalVP);
  return 1 - level.commission; // e.g. 0.70 at Rookie = 70 gems per 100 coins
};

// Get coin discount for purchases
export const getCoinDiscount = (totalVP) => {
  const level = getVPLevel(totalVP);
  return level.discount;
};

// ── VP EARNING RATES ──
export const VP_ACTIONS = {
  daily_login:       10,
  daily_streak_5:    50,
  create_post:       15,
  get_like:          2,
  get_comment:       5,
  like_post:         1,
  comment_post:      3,
  win_match:         50,
  win_tournament:    200,
  squad_message:     1,
  complete_quest:    20,
  complete_service:  30,  // deliver a service
  purchase_coins:    25,  // buy any coin pack
  boost_post:        10,
};

// ── BOOST COSTS ──
export const BOOST_COSTS = {
  post:       { coins: 50,  duration: 24, label: 'Post Boost',       desc: '3x visibility in For You for 24h' },
  profile:    { coins: 100, duration: 48, label: 'Profile Boost',    desc: 'Shown in Suggested Users for 48h' },
  lfg:        { coins: 25,  duration: 12, label: 'LFG Boost',        desc: 'Pinned to top of LFG for 12h' },
  squad:      { coins: 75,  duration: 48, label: 'Squad Boost',      desc: 'Featured in Explore → Squads for 48h' },
  tournament: { coins: 100, duration: 0,  label: 'Tournament Boost', desc: 'Promoted on home feed until start' },
};

// ── COIN PACK CONFIG ──
// Bonus coins are free marketing — included in pack price
export const COIN_PACKS = [
  { id: 'starter',  name: 'Starter',  coins: 100,   bonus: 10,   priceEUR: 0.99  },
  { id: 'value',    name: 'Value',    coins: 500,   bonus: 50,   priceEUR: 4.49  },
  { id: 'popular',  name: 'Popular',  coins: 1200,  bonus: 200,  priceEUR: 9.99  },
  { id: 'premium',  name: 'Premium',  coins: 2500,  bonus: 500,  priceEUR: 19.99 },
  { id: 'whale',    name: 'Whale',    coins: 6500,  bonus: 1500, priceEUR: 49.99 },
  { id: 'mega',     name: 'Mega',     coins: 15000, bonus: 5000, priceEUR: 99.99 },
];

// ── SERVICE CATEGORIES ──
export const SERVICE_CATEGORIES = [
  { id: 'coaching',    label: 'Game Coaching',       icon: 'school',         desc: '1v1 sessions, ranked climbing' },
  { id: 'editing',     label: 'Video Editing',       icon: 'movie_edit',     desc: 'Highlights, montages, intros' },
  { id: 'design',      label: 'Graphic Design',      icon: 'palette',        desc: 'Thumbnails, banners, overlays' },
  { id: 'moderation',  label: 'Stream Moderation',   icon: 'shield',         desc: 'Hired by creators/squads' },
  { id: 'tournament',  label: 'Tournament Organiser', icon: 'emoji_events',  desc: 'Run tournaments for squads' },
  { id: 'social',      label: 'Social Media',        icon: 'campaign',       desc: 'Post scheduling, engagement' },
  { id: 'writing',     label: 'Content Writing',     icon: 'edit_note',      desc: 'Articles, guides, reviews' },
  { id: 'other',       label: 'Other',               icon: 'more_horiz',     desc: 'Custom services' },
];

// ── ECONOMY CONSTANTS ──
export const COIN_TO_EUR = 0.01;
export const GEM_TO_EUR = 0.01;
export const MIN_CASHOUT_GEMS = 1000;   // €10 minimum
export const CASHOUT_PLATFORM_FEE = 0;  // 0% — platform already took cut at gem conversion
export const CASHOUT_PROCESSOR_FEE = 0.03; // ~3% Wise/PayPal
export const MONTHLY_COIN_REWARDS = { lite: 10, pro: 30 };
export const DAILY_STREAK_REWARD = 5;   // coins
export const DAILY_STREAK_DAYS = 5;     // consecutive days needed
export const REFERRAL_REWARD = 25;      // coins each
export const LIKE_REWARD_VP = 2;        // VP per like received
export const LIKE_REWARD_CAP = 20;      // max like VPs per day

// ── SQUAD ECONOMICS ──
export const SQUAD_CONTRIBUTION_RATE = 0.10; // 10% of tournament gems → squad treasury
export const TOURNAMENT_MOD_FEE_RATE = 0.05; // 5% of gem pool → mod
