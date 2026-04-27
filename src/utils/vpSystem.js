// ═══════════════════════════════════════════
// VERGR ECONOMY — THREE CURRENCIES
// ═══════════════════════════════════════════
// Coins: bought with real money, spent in-app
// Gems: earned when someone spends coins ON YOU, cashable
// VP: earned through activity, drives levels/perks/commission

// ── RANK TIERS (11 ranks, 10 levels each; L100 = Immortal) ──
// Levels 1-10 Rookie, 11-20 Contender, 21-30 Rival, 31-40 Challenger,
// 41-50 Elite, 51-60 Champion, 61-70 Veteran, 71-80 Legend,
// 81-90 Mythic, 91-99 Ascendant, 100 Immortal
export const RANK_TIERS = [
  { min: 1,   max: 10,  name: 'Rookie',     ring: null,        ringColor: '#8A8F98' },
  { min: 11,  max: 20,  name: 'Contender',  ring: 'bronze',    ringColor: '#CD7F32' },
  { min: 21,  max: 30,  name: 'Rival',      ring: 'silver',    ringColor: '#C0C0C0' },
  { min: 31,  max: 40,  name: 'Challenger', ring: 'gold',      ringColor: '#F5C542' },
  { min: 41,  max: 50,  name: 'Elite',      ring: 'platinum',  ringColor: '#4DFFD4' },
  { min: 51,  max: 60,  name: 'Champion',   ring: 'diamond',   ringColor: '#7B6FFF' },
  { min: 61,  max: 70,  name: 'Veteran',    ring: 'onyx',      ringColor: '#2A2A2A' },
  { min: 71,  max: 80,  name: 'Legend',     ring: 'ruby',      ringColor: '#E0115F' },
  { min: 81,  max: 90,  name: 'Mythic',     ring: 'mythic',    ringColor: '#C87FFF' },
  { min: 91,  max: 99,  name: 'Ascendant',  ring: 'ascendant', ringColor: '#FFB347' },
  { min: 100, max: 100, name: 'Immortal',   ring: 'immortal',  ringColor: '#FFFFFF' },
];

const getRankForLevel = (level) => RANK_TIERS.find(t => level >= t.min && level <= t.max) || RANK_TIERS[0];

// Per-level VP cost to reach level N from N-1.
// L2..L10 = 2000, L11..L20 = 3000, ... +1000 per 10-level bracket. L91..L100 = 11000.
// Total to hit L100 = 648,000 VP.
const levelCost = (level) => {
  if (level <= 1) return 0;
  const bracket = Math.floor((level - 1) / 10); // 0..9
  return 2000 + 1000 * bracket;
};

// Commission: linear 30% at L1 → 10% at L100. Minimum 10%.
const commissionForLevel = (level) => {
  const raw = 0.30 - ((level - 1) / 99) * 0.20;
  return Math.max(0.10, raw);
};

// Discount: gradual coin discount on shop purchases, 0% at L1 → 20% at L100.
const discountForLevel = (level) => {
  if (level < 10) return 0;
  return Math.min(0.20, ((level - 10) / 90) * 0.20);
};

// Custom reactions unlocked progressively: 1 per 10 levels above 10.
const reactionsForLevel = (level) => Math.max(0, Math.floor((level - 1) / 10));

// Build 100 levels (index 0 = L1)
export const VP_LEVELS = (() => {
  const out = [];
  let cumulative = 0;
  for (let lvl = 1; lvl <= 100; lvl++) {
    cumulative += levelCost(lvl);
    const rank = getRankForLevel(lvl);
    out.push({
      level: lvl,
      name: rank.name,
      vpRequired: cumulative,         // total VP needed to be AT this level
      vpToNext: levelCost(lvl + 1),   // VP cost of next transition (0 at L100 unless prestige)
      ring: rank.ring,
      ringColor: rank.ringColor,
      discount: discountForLevel(lvl),
      commission: commissionForLevel(lvl),
      reactions: reactionsForLevel(lvl),
    });
  }
  return out;
})();

export const MAX_VP_LEVEL = 100;
export const TOTAL_VP_TO_MAX = VP_LEVELS[99].vpRequired; // 648,000

// ── PRESTIGE SYSTEM (post-L100, optional, cosmetic) ──
// After hitting L100, users may optionally prestige: reset displayed level to 1
// with a prestige badge (P1, P2, ...). Permanent VP history preserved.
// Each prestige adds a star on the rank ring. Never forced.
export const PRESTIGE_MAX = 10;
export const PRESTIGE_REWARDS = [
  { prestige: 1,  badge: '★',     coinReward: 500,  title: 'Ascendant I'  },
  { prestige: 2,  badge: '★★',    coinReward: 750,  title: 'Ascendant II' },
  { prestige: 3,  badge: '★★★',   coinReward: 1000, title: 'Ascendant III'},
  { prestige: 4,  badge: '✦',     coinReward: 1250, title: 'Immortal I'   },
  { prestige: 5,  badge: '✦✦',    coinReward: 1500, title: 'Immortal II'  },
  { prestige: 6,  badge: '✦✦✦',   coinReward: 2000, title: 'Immortal III' },
  { prestige: 7,  badge: '❂',     coinReward: 2500, title: 'Eternal I'    },
  { prestige: 8,  badge: '❂❂',    coinReward: 3000, title: 'Eternal II'   },
  { prestige: 9,  badge: '❂❂❂',   coinReward: 4000, title: 'Eternal III'  },
  { prestige: 10, badge: '⟁',     coinReward: 5000, title: 'Transcendent' },
];

// Get user's VP level from total VP (capped at L100; prestige handled separately)
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
  if (current.level >= MAX_VP_LEVEL) return 100;
  const next = VP_LEVELS[current.level]; // current.level is 1-indexed, array is 0-indexed
  const progress = (totalVP - current.vpRequired) / (next.vpRequired - current.vpRequired);
  return Math.min(Math.max(progress * 100, 0), 100);
};

// Get the next level info
export const getNextVPLevel = (totalVP) => {
  const current = getVPLevel(totalVP);
  if (current.level >= MAX_VP_LEVEL) return null;
  return VP_LEVELS[current.level];
};

// Gem rate (seller share per coin spent on them). Buyer pays X coins → seller receives X × (1 - commission) gems.
export const getGemRate = (totalVP) => 1 - getVPLevel(totalVP).commission;

// Coin discount on shop purchases
export const getCoinDiscount = (totalVP) => getVPLevel(totalVP).discount;

// ── PLAN VP MULTIPLIERS ──
// Applied server-side when granting VP. Pro users level up 2× as fast.
export const PLAN_VP_MULTIPLIER = {
  free: 1,
  lite: 1.5,
  pro:  2,
};
export const getVPMultiplier = (plan) => PLAN_VP_MULTIPLIER[plan] || 1;

// ── MONTHLY PLAN BONUSES ──
// Paid out on the 1st of each month by the scheduled function.
export const MONTHLY_VP_BONUS  = { free: 0, lite: 1000, pro: 3000 };
export const MONTHLY_COIN_REWARDS = { free: 0, lite: 50,   pro: 150  };

// ── VP EARNING RATES (base, pre-multiplier) ──
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
  purchase_coins:    25,
  boost_post:        10,
  go_live:           30,
  stream_hour:       20,
  watch_stream_hour: 5,
};

// ── BOOST COSTS ──
export const BOOST_COSTS = {
  post:       { coins: 50,  duration: 24, label: 'Post Boost',       desc: '3x visibility in For You for 24h' },
  profile:    { coins: 100, duration: 48, label: 'Profile Boost',    desc: 'Shown in Suggested Users for 48h' },
  lfg:        { coins: 25,  duration: 12, label: 'LFG Boost',        desc: 'Pinned to top of LFG for 12h' },
  squad:      { coins: 75,  duration: 48, label: 'Squad Boost',      desc: 'Featured in Explore → Squads for 48h' },
  tournament: { coins: 100, duration: 0,  label: 'Tournament Boost', desc: 'Promoted on home feed until start' },
  stream:     { coins: 60,  duration: 4,  label: 'Stream Boost',     desc: 'Pinned to Live tab for 4h' },
};

// ── COIN PACK CONFIG ──────────────────────────────────────────────
// HARD FLOOR: €0.0090 per coin. Do NOT drop below this on any pack
// (including with promos/discounts). Derivation:
//   max user payout per coin = topTierKeep × coinFaceValue × (1 − payoutFee)
//                            = 0.85 × €0.01 × 0.97 = €0.008245
// Selling at €0.0090 keeps ~€0.0008/coin margin even when a Titan-tier user
// converts and cashes out — the worst case for the platform.
//
// `vpBonus` is the BASE VP awarded with the pack. Optional promo fields
// (`promoVPBonus`, `promoLabel`, `promoStartsAt`, `promoEndsAt`) can be set
// per-pack server-side to layer a temporary bonus on any pack.
export const COIN_PACKS = [
  { id: 'starter',   name: 'Starter Pack',   coins: 100,    vpBonus: 0,    priceEUR: 0.99,   tagline: 'Get started for less than a coffee' },
  { id: 'gamer',     name: 'Gamer Pack',     coins: 500,    vpBonus: 0,    priceEUR: 4.79,   tagline: 'Best per-coin value at this size' },
  { id: 'pro',       name: 'Pro Pack',       coins: 1200,   vpBonus: 0,    priceEUR: 11.49,  tagline: 'Enough to tip 24 creators or run a tournament', badge: 'MOST POPULAR', badgeStyle: 'popular' },
  { id: 'elite',     name: 'Elite Pack',     coins: 2500,   vpBonus: 0,    priceEUR: 22.99,  tagline: '7% bulk discount + headroom for streaks',         badge: 'BEST VALUE',   badgeStyle: 'value' },
  { id: 'legend',    name: 'Legend Pack',    coins: 5000,   vpBonus: 0,    priceEUR: 44.99,  tagline: '9% off — for serious players & squads' },
  { id: 'champion',  name: 'Champion Pack',  coins: 10000,  vpBonus: 0,    priceEUR: 89.99,  tagline: '10K coins · maximum bulk discount' },
  { id: 'titan',     name: 'Titan Pack',     coins: 15000,  vpBonus: 1500, priceEUR: 134.99, tagline: 'Skip ranks faster, earn more on every conversion', badge: '+1,500 VP BONUS', badgeStyle: 'vp' },
  { id: 'ascendant', name: 'Ascendant Pack', coins: 25000,  vpBonus: 3000, priceEUR: 224.99, tagline: 'For top creators & squad leaders',                badge: 'BIGGEST VP BONUS', badgeStyle: 'vp' },
];

// ── FIRST-PURCHASE DISCOUNT ────────────────────────────────────────
// 20% off ANY pack on the user's first paid purchase. No absolute cap —
// every subsequent purchase is at full price. New users buy at Rookie tier
// (30% commission), so the conversion margin still covers the discount;
// tiering up far enough to extract value takes weeks of activity, by which
// point the user has already burned coins on tips/boosts/tournaments.
//   Starter   €0.99   → €0.79
//   Gamer     €4.79   → €3.83
//   Pro       €11.49  → €9.19
//   Elite     €22.99  → €18.39
//   Legend    €44.99  → €35.99
//   Champion  €89.99  → €71.99
//   Titan     €134.99 → €107.99
//   Ascendant €224.99 → €179.99
export const FIRST_PURCHASE_DISCOUNT = { pct: 0.20 };

export function applyFirstPurchaseDiscount(priceEUR) {
  const saving = priceEUR * FIRST_PURCHASE_DISCOUNT.pct;
  return {
    finalPrice: Math.max(0, +(priceEUR - saving).toFixed(2)),
    saving: +saving.toFixed(2),
    capped: false,
  };
}

// ── NOWPAYMENTS / WITHDRAWAL CONSTANTS ─────────────────────────────
// 2% spread platform takes on gem→crypto conversion (covers NOWPayments
// spread + rate-refresh slack). 60s quote TTL.
export const PAYOUT_SPREAD_PCT = 0.02;
export const PAYOUT_QUOTE_TTL_MS = 60_000;

// Currencies surfaced in the picker. NOWPayments supports more, but starting
// with this short list keeps the UX simple. Cheap-network options first.
export const PAYOUT_CURRENCIES = [
  { code: 'usdttrc20',  name: 'USDT',  network: 'TRC-20',   tagline: 'Cheapest fees', recommended: true },
  { code: 'usdcsol',    name: 'USDC',  network: 'Solana',   tagline: 'Fast & cheap' },
  { code: 'usdterc20',  name: 'USDT',  network: 'ERC-20',   tagline: 'Ethereum mainnet' },
  { code: 'usdtbsc',    name: 'USDT',  network: 'BSC',      tagline: 'Binance chain' },
  { code: 'btc',        name: 'BTC',   network: 'Bitcoin' },
  { code: 'eth',        name: 'ETH',   network: 'Ethereum' },
  { code: 'sol',        name: 'SOL',   network: 'Solana' },
  { code: 'ltc',        name: 'LTC',   network: 'Litecoin' },
  { code: 'doge',       name: 'DOGE',  network: 'Dogecoin' },
  { code: 'matic',      name: 'MATIC', network: 'Polygon' },
];

// ── ECONOMY CONSTANTS ──
export const COIN_TO_EUR = 0.01;
export const GEM_TO_EUR = 0.01;
export const MIN_CASHOUT_GEMS = 1000;
export const CASHOUT_PLATFORM_FEE = 0;
export const CASHOUT_PROCESSOR_FEE = 0.03;
export const DAILY_STREAK_REWARD = 5;
export const DAILY_STREAK_DAYS = 5;
// Referral VP rewards — paid out when referee completes onboarding (signup
// via referrer's link + adds phone + joins a squad OR subscribes to Lite/Pro).
export const REFERRAL_VP_REFERRER = 5000; // person doing the inviting
export const REFERRAL_VP_REFEREE  = 3000; // the friend who joins
// Legacy export kept for backwards compatibility — points at the referrer reward.
export const REFERRAL_REWARD = REFERRAL_VP_REFERRER;
export const LIKE_REWARD_VP = 2;
export const LIKE_REWARD_CAP = 20;

// ── SQUAD ECONOMICS ──
export const SQUAD_CONTRIBUTION_RATE = 0.10;
export const TOURNAMENT_MOD_FEE_RATE = 0.05;
