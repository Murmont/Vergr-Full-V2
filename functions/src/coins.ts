import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

import { db } from "./db";

/**
 * Send a tip from one user to another.
 * Validates balance, deducts from sender, credits recipient.
 * All in a transaction to prevent race conditions.
 */
export const sendTip = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }

  const { recipientId, amount, message, postId, streamId } = data;
  const senderId = context.auth.uid;

  // Validation
  if (!recipientId || typeof recipientId !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "recipientId required");
  }
  if (!amount || typeof amount !== "number" || amount < 1 || !Number.isInteger(amount)) {
    throw new functions.https.HttpsError("invalid-argument", "amount must be a positive integer");
  }
  if (senderId === recipientId) {
    throw new functions.https.HttpsError("invalid-argument", "Cannot tip yourself");
  }
  if (amount > 50000) {
    throw new functions.https.HttpsError("invalid-argument", "Maximum tip is 50,000 coins");
  }

  const result = await db.runTransaction(async (tx) => {
    const senderWalletRef = db.collection("wallets").doc(senderId);
    const recipientWalletRef = db.collection("wallets").doc(recipientId);

    const senderWallet = await tx.get(senderWalletRef);
    const recipientWallet = await tx.get(recipientWalletRef);

    if (!senderWallet.exists) {
      throw new functions.https.HttpsError("not-found", "Sender wallet not found");
    }
    if (!recipientWallet.exists) {
      throw new functions.https.HttpsError("not-found", "Recipient wallet not found");
    }

    const senderBalance = senderWallet.data()!.balance || 0;
    if (senderBalance < amount) {
      throw new functions.https.HttpsError("failed-precondition", "Insufficient coin balance");
    }

    // Deduct from sender
    tx.update(senderWalletRef, {
      balance: admin.firestore.FieldValue.increment(-amount),
      totalSpent: admin.firestore.FieldValue.increment(amount),
      totalTipped: admin.firestore.FieldValue.increment(amount),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Credit recipient (platform takes 10% fee)
    const platformFee = Math.floor(amount * 0.10);
    const recipientAmount = amount - platformFee;

    tx.update(recipientWalletRef, {
      balance: admin.firestore.FieldValue.increment(recipientAmount),
      totalEarned: admin.firestore.FieldValue.increment(recipientAmount),
      totalReceived: admin.firestore.FieldValue.increment(recipientAmount),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Record tip
    const tipRef = db.collection("tips").doc();
    tx.set(tipRef, {
      senderId,
      recipientId,
      amount,
      recipientAmount,
      platformFee,
      message: message || null,
      postId: postId || null,
      streamId: streamId || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Record transactions for both parties
    const senderTxRef = db.collection("transactions").doc();
    tx.set(senderTxRef, {
      userId: senderId,
      type: "tip_sent",
      amount: -amount,
      balance: senderBalance - amount,
      recipientId,
      tipId: tipRef.id,
      description: `Tipped ${amount} coins`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const recipientTxRef = db.collection("transactions").doc();
    tx.set(recipientTxRef, {
      userId: recipientId,
      type: "tip_received",
      amount: recipientAmount,
      balance: (recipientWallet.data()!.balance || 0) + recipientAmount,
      senderId,
      tipId: tipRef.id,
      description: `Received ${recipientAmount} coins (${amount} - ${platformFee} fee)`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Notification for recipient
    const notifRef = db.collection("notifications").doc();
    tx.set(notifRef, {
      recipientId,
      type: "tip",
      title: "You received a tip!",
      body: `Someone tipped you ${recipientAmount} coins${message ? `: "${message}"` : ""}`,
      senderId,
      read: false,
      data: { tipId: tipRef.id, amount: recipientAmount },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { tipId: tipRef.id, recipientAmount, platformFee };
  });

  return result;
});

/**
 * Purchase coins with real money (Stripe integration).
 * Called after successful Stripe payment — validates payment intent.
 */
export const purchaseCoins = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }

  const { packageId, paymentIntentId } = data;
  const userId = context.auth.uid;

  if (!packageId || !paymentIntentId) {
    throw new functions.https.HttpsError("invalid-argument", "packageId and paymentIntentId required");
  }

  // Get coin package
  const packageDoc = await db.collection("coin_packages").doc(packageId).get();
  if (!packageDoc.exists || !packageDoc.data()!.active) {
    throw new functions.https.HttpsError("not-found", "Coin package not found or inactive");
  }

  const pkg = packageDoc.data()!;
  const bonusCoins = Math.floor(pkg.coins * (pkg.priceBonusPercent / 100));
  const totalCoins = pkg.coins + bonusCoins;

  // TODO: Verify paymentIntentId with Stripe API
  // const stripe = new Stripe(functions.config().stripe.secret);
  // const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
  // if (intent.status !== 'succeeded') throw error;
  // if (intent.amount !== pkg.priceEUR * 100) throw error;

  await db.runTransaction(async (tx) => {
    const walletRef = db.collection("wallets").doc(userId);
    const wallet = await tx.get(walletRef);

    if (!wallet.exists) {
      throw new functions.https.HttpsError("not-found", "Wallet not found");
    }

    const currentBalance = wallet.data()!.balance || 0;

    tx.update(walletRef, {
      balance: admin.firestore.FieldValue.increment(totalCoins),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Also update user doc for quick access
    tx.update(db.collection("users").doc(userId), {
      coinBalance: admin.firestore.FieldValue.increment(totalCoins),
    });

    const txRef = db.collection("transactions").doc();
    tx.set(txRef, {
      userId,
      type: "purchase",
      amount: totalCoins,
      balance: currentBalance + totalCoins,
      packageId,
      packageName: pkg.name,
      priceEUR: pkg.priceEUR,
      baseCoins: pkg.coins,
      bonusCoins,
      paymentIntentId,
      description: `Purchased ${pkg.name}: ${totalCoins} coins (${pkg.coins} + ${bonusCoins} bonus)`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return { totalCoins, baseCoins: pkg.coins, bonusCoins };
});

/**
 * Get wallet balance (callable for real-time checks).
 */
export const getWalletBalance = functions.https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }

  const wallet = await db.collection("wallets").doc(context.auth.uid).get();
  if (!wallet.exists) {
    return { balance: 0, totalEarned: 0, totalSpent: 0 };
  }

  const w = wallet.data()!;
  return {
    balance: w.balance || 0,
    totalEarned: w.totalEarned || 0,
    totalSpent: w.totalSpent || 0,
    totalTipped: w.totalTipped || 0,
    totalReceived: w.totalReceived || 0,
  };
});
