/**
 * VERGR Firestore Seed Data
 * 
 * Run this ONCE after deploying to set up initial collections.
 * 
 * Usage (from project root):
 *   node seed-firestore.js
 * 
 * Requires: firebase-admin (already in functions/node_modules)
 */

const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");

// Initialize with your project
const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!serviceAccount) {
  console.log("=== VERGR FIRESTORE SEED ===\n");
  console.log("Before running this script, you need a service account key.\n");
  console.log("1. Go to: https://console.firebase.google.com/project/vergr-44494/settings/serviceaccounts/adminsdk");
  console.log("2. Click 'Generate new private key'");
  console.log("3. Save the JSON file to this folder as 'serviceAccountKey.json'");
  console.log("4. Run: set GOOGLE_APPLICATION_CREDENTIALS=serviceAccountKey.json && node seed-firestore.js");
  console.log("   (on Mac/Linux: GOOGLE_APPLICATION_CREDENTIALS=serviceAccountKey.json node seed-firestore.js)\n");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "vergr-44494",
});

// Use the vgrdb named database
const db = getFirestore("vgrdb");

async function seed() {
  console.log("=== Seeding VERGR Firestore (vgrdb) ===\n");

  // ─────────────────────────────────────────
  // 1. APP CONFIG
  // ─────────────────────────────────────────
  console.log("1. Creating app_config/general...");
  await db.collection("app_config").doc("general").set({
    appName: "VERGR",
    tagline: "Where Gamers Converge",
    maintenanceMode: false,
    minAppVersion: "1.0.0",
    currentVersion: "1.0.0",
    currency: "EUR",
    supportedCurrencies: ["EUR", "USD", "GBP", "ZAR", "JPY", "CAD", "AUD", "BRL", "INR", "KRW"],
    coinName: "VCoin",
    coinSymbol: "VC",
    supportEmail: "support@vergr.com",
    socialLinks: {
      twitter: "https://twitter.com/vergr",
      discord: "https://discord.gg/vergr",
      instagram: "https://instagram.com/vergr",
    },
    features: {
      streamingEnabled: true,
      shopEnabled: true,
      tournamentsEnabled: true,
      tipsEnabled: true,
      squadsEnabled: true,
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log("   ✓ app_config/general created\n");

  // ─────────────────────────────────────────
  // 2. COIN PACKAGES (prices in EUR)
  // ─────────────────────────────────────────
  console.log("2. Creating coin_packages...");
  const coinPackages = [
    { name: "Starter Pack",   coins: 100,   priceEUR: 0.99,   bonus: 0,  icon: "⚡", sortOrder: 1, active: true },
    { name: "Gamer Pack",     coins: 500,   priceEUR: 4.49,   bonus: 25, icon: "🎮", sortOrder: 2, active: true },
    { name: "Pro Pack",       coins: 1200,  priceEUR: 8.99,  bonus: 100, icon: "🔥", sortOrder: 3, active: true },
    { name: "Elite Pack",     coins: 3000,  priceEUR: 19.99,  bonus: 500, icon: "💎", sortOrder: 4, active: true },
    { name: "Legend Pack",    coins: 7000,  priceEUR: 39.99,  bonus: 1500, icon: "👑", sortOrder: 5, active: true },
    { name: "Ultimate Pack",  coins: 15000, priceEUR: 74.99, bonus: 5000, icon: "🏆", sortOrder: 6, active: true },
  ];

  for (const pkg of coinPackages) {
    await db.collection("coin_packages").add({
      ...pkg,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`   ✓ ${pkg.name} - ${pkg.coins} coins for €{pkg.priceEUR}`);
  }
  console.log("");

  // ─────────────────────────────────────────
  // 3. LEADERBOARDS
  // ─────────────────────────────────────────
  console.log("3. Creating leaderboard documents...");
  const leaderboards = ["players", "creators", "squads", "weekly", "monthly"];
  for (const boardId of leaderboards) {
    await db.collection("leaderboards").doc(boardId).set({
      name: boardId.charAt(0).toUpperCase() + boardId.slice(1),
      type: boardId,
      resetPeriod: boardId === "weekly" ? "weekly" : boardId === "monthly" ? "monthly" : "never",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`   ✓ leaderboards/${boardId}`);
  }
  console.log("");

  // ─────────────────────────────────────────
  // 4. TRENDING (empty initial docs)
  // ─────────────────────────────────────────
  console.log("4. Creating trending documents...");
  await db.collection("trending").doc("daily").set({
    hashtags: [],
    posts: [],
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await db.collection("trending").doc("weekly").set({
    hashtags: [],
    posts: [],
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log("   ✓ trending/daily");
  console.log("   ✓ trending/weekly\n");

  // ─────────────────────────────────────────
  // 5. BANNED WORDS (starter list)
  // ─────────────────────────────────────────
  console.log("5. Creating banned words list...");
  await db.collection("banned_words").doc("default").set({
    words: ["slur_placeholder"],
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log("   ✓ banned_words/default (edit in console to add real words)\n");

  // ─────────────────────────────────────────
  }
  console.log("");

  console.log("=== SEED COMPLETE ===");
  console.log("\nCollections created:");
  console.log("  ✓ app_config (1 doc)");
  console.log("  ✓ coin_packages (6 docs)");
  console.log("  ✓ leaderboards (5 docs)");
  console.log("  ✓ trending (2 docs)");
  console.log("  ✓ banned_words (1 doc)");
  console.log("\nThese collections are created AUTOMATICALLY when users interact:");
  console.log("  - users (on signup via Cloud Function)");
  console.log("  - wallets (on signup via Cloud Function)");
  console.log("  - notifications (on signup via Cloud Function)");
  console.log("  - posts (when someone creates a post)");
  console.log("  - follows (when someone follows a user)");
  console.log("  - conversations / messages (when someone sends a DM)");
  console.log("  - squads (when someone creates a squad)");
  console.log("  - streams (when someone goes live)");
  console.log("  - tournaments (when someone creates a tournament)");
  console.log("  - orders / carts / wishlists (when someone shops)");
  console.log("  - transactions / tips (via Cloud Functions)");
  console.log("  - creators (when someone applies for creator status)");
  console.log("  - memberships (when a creator sets up tiers)");
  console.log("  - reports / mod_actions (when someone reports content)");
  console.log("  - feedback (when someone submits feedback)");
  console.log("  - ads (admin-created)");
  console.log("  - news (admin-created or via RSS Cloud Function)");
  console.log("  - hashtags (via Cloud Function when posts use #tags)");
  console.log("\nYou can delete serviceAccountKey.json now for security.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
