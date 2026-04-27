// Run this once to seed coin packages into Firestore.
// Usage: node scripts/seedCoinPackages.mjs
// Requires: GOOGLE_APPLICATION_CREDENTIALS env var or Firebase CLI login

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore('vgrdb');

// Source of truth: src/utils/vpSystem.js → COIN_PACKS. HARD FLOOR: €0.0090 / coin.
const PACKAGES = [
  { id: 'starter',   name: 'Starter Pack',   coins: 100,   priceEUR: 0.99,   vpBonus: 0,    sortOrder: 1, active: true, tagline: 'Get started for less than a coffee' },
  { id: 'gamer',     name: 'Gamer Pack',     coins: 500,   priceEUR: 4.79,   vpBonus: 0,    sortOrder: 2, active: true, tagline: 'Best per-coin value at this size' },
  { id: 'pro',       name: 'Pro Pack',       coins: 1200,  priceEUR: 11.49,  vpBonus: 0,    sortOrder: 3, active: true, badgeStyle: 'popular', badge: 'MOST POPULAR', tagline: 'Enough to tip 24 creators or run a tournament' },
  { id: 'elite',     name: 'Elite Pack',     coins: 2500,  priceEUR: 22.99,  vpBonus: 0,    sortOrder: 4, active: true, badgeStyle: 'value',   badge: 'BEST VALUE',   tagline: '7% bulk discount + headroom for streaks' },
  { id: 'legend',    name: 'Legend Pack',    coins: 5000,  priceEUR: 44.99,  vpBonus: 0,    sortOrder: 5, active: true, tagline: '9% off — for serious players & squads' },
  { id: 'champion',  name: 'Champion Pack',  coins: 10000, priceEUR: 89.99,  vpBonus: 0,    sortOrder: 6, active: true, tagline: '10K coins · maximum bulk discount' },
  { id: 'titan',     name: 'Titan Pack',     coins: 15000, priceEUR: 134.99, vpBonus: 1500, sortOrder: 7, active: true, badgeStyle: 'vp',      badge: '+1,500 VP BONUS',  tagline: 'Skip ranks faster, earn more on every conversion' },
  { id: 'ascendant', name: 'Ascendant Pack', coins: 25000, priceEUR: 224.99, vpBonus: 3000, sortOrder: 8, active: true, badgeStyle: 'vp',      badge: 'BIGGEST VP BONUS', tagline: 'For top creators & squad leaders' },
];

async function seed() {
  console.log('Seeding coin packages...');
  for (const pack of PACKAGES) {
    const { id, ...data } = pack;
    await db.collection('coin_packages').doc(id).set({
      ...data,
      createdAt: new Date(),
    });
    console.log(`  ✓ ${data.name} — ${data.coins} coins for €${data.priceEUR}`);
  }
  console.log('Done! Coin packages seeded.');
}

seed().catch(console.error);
