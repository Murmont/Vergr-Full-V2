import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

import { db } from "./db";

/**
 * Subscribe to a creator's membership tier.
 * Deducts coins monthly (or processes Stripe payment).
 */
export const subscribeMembership = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }

  const { membershipId, paymentType } = data; // paymentType: "coins" | "stripe"
  const userId = context.auth.uid;

  if (!membershipId) {
    throw new functions.https.HttpsError("invalid-argument", "membershipId required");
  }

  // Get membership tier
  const membership = await db.collection("memberships").doc(membershipId).get();
  if (!membership.exists) {
    throw new functions.https.HttpsError("not-found", "Membership tier not found");
  }

  const tier = membership.data()!;

  // Check if already subscribed
  const existingSub = await db.collection("member_subscriptions")
    .where("userId", "==", userId)
    .where("membershipId", "==", membershipId)
    .where("status", "==", "active")
    .limit(1)
    .get();

  if (!existingSub.empty) {
    throw new functions.https.HttpsError("already-exists", "Already subscribed to this tier");
  }

  if (paymentType === "coins") {
    // Pay with coins
    return db.runTransaction(async (tx) => {
      const walletRef = db.collection("wallets").doc(userId);
      const wallet = await tx.get(walletRef);
      const balance = wallet.data()?.balance || 0;

      if (balance < tier.priceCoins) {
        throw new functions.https.HttpsError("failed-precondition", "Insufficient coin balance");
      }

      // Deduct coins
      tx.update(walletRef, {
        balance: admin.firestore.FieldValue.increment(-tier.priceCoins),
        totalSpent: admin.firestore.FieldValue.increment(tier.priceCoins),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Credit creator (90% — 10% platform fee)
      const platformFee = Math.floor(tier.priceCoins * 0.10);
      const creatorAmount = tier.priceCoins - platformFee;

      const creatorWalletRef = db.collection("wallets").doc(tier.creatorId);
      tx.update(creatorWalletRef, {
        balance: admin.firestore.FieldValue.increment(creatorAmount),
        totalEarned: admin.firestore.FieldValue.increment(creatorAmount),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Create subscription
      const subRef = db.collection("member_subscriptions").doc();
      tx.set(subRef, {
        userId,
        creatorId: tier.creatorId,
        membershipId,
        tierName: tier.name,
        priceCoins: tier.priceCoins,
        paymentType: "coins",
        status: "active",
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
        renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Record transaction
      tx.set(db.collection("transactions").doc(), {
        userId,
        type: "membership",
        amount: -tier.priceCoins,
        balance: balance - tier.priceCoins,
        description: `Subscribed to ${tier.name} membership`,
        membershipId,
        creatorId: tier.creatorId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Notify creator
      tx.set(db.collection("notifications").doc(), {
        recipientId: tier.creatorId,
        type: "membership",
        title: "New subscriber!",
        body: `Someone subscribed to your ${tier.name} tier`,
        senderId: userId,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { subscriptionId: subRef.id };
    });
  } else {
    // Stripe payment — create subscription via Stripe
    // TODO: Implement Stripe subscription creation
    throw new functions.https.HttpsError("unimplemented", "Stripe subscriptions coming soon");
  }
});

/**
 * Cancel a membership subscription.
 */
export const cancelMembership = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }

  const { subscriptionId } = data;
  if (!subscriptionId) {
    throw new functions.https.HttpsError("invalid-argument", "subscriptionId required");
  }

  const subRef = db.collection("member_subscriptions").doc(subscriptionId);
  const sub = await subRef.get();

  if (!sub.exists) {
    throw new functions.https.HttpsError("not-found", "Subscription not found");
  }

  if (sub.data()!.userId !== context.auth.uid) {
    throw new functions.https.HttpsError("permission-denied", "Not your subscription");
  }

  await subRef.update({
    status: "cancelled",
    cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
    // Stays active until renewsAt date
  });

  return { cancelled: true };
});
