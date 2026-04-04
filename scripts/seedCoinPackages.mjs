// Run this once to seed coin packages into Firestore.
// Usage: node scripts/seedCoinPackages.mjs
// Requires: GOOGLE_APPLICATION_CREDENTIALS env var or Firebase CLI login

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore('vgrdb');

const PACKAGES = [
  { id: 'starter', name: 'Starter', coins: 100, priceEUR: 0.99, priceGBP: 0.89, bonus: 0, icon: '🪙', sortOrder: 1, active: true },
  { id: 'value', name: 'Value Pack', coins: 500, priceEUR: 4.49, priceGBP: 3.99, bonus: 50, icon: '💰', sortOrder: 2, active: true, popular: false },
  { id: 'popular', name: 'Popular', coins: 1200, priceEUR: 9.99, priceGBP: 8.99, bonus: 200, icon: '🔥', sortOrder: 3, active: true, popular: true },
  { id: 'premium', name: 'Premium', coins: 2500, priceEUR: 19.99, priceGBP: 17.99, bonus: 500, icon: '💎', sortOrder: 4, active: true },
  { id: 'whale', name: 'Whale Pack', coins: 6500, priceEUR: 49.99, priceGBP: 44.99, bonus: 1500, icon: '🐋', sortOrder: 5, active: true },
  { id: 'mega', name: 'Mega Pack', coins: 15000, priceEUR: 99.99, priceGBP: 89.99, bonus: 5000, icon: '👑', sortOrder: 6, active: true },
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
