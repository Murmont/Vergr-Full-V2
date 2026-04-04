import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

import { db } from "./db";

/**
 * Triggered when a new user signs up.
 * Creates user profile doc, wallet, and default settings.
 */
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  const batch = db.batch();

  // Create user profile
  const userRef = db.collection("users").doc(user.uid);
  batch.set(userRef, {
    uid: user.uid,
    email: user.email || null,
    displayName: user.displayName || null,
    username: null, // user must set this during onboarding
    avatar: user.photoURL || null,
    banner: null,
    bio: "",
    role: "user", // user | creator | moderator | admin
    verificationTier: null, // null | verified | pro | legend
    isOnboarded: false,
    followerCount: 0,
    followingCount: 0,
    postCount: 0,
    coinBalance: 0,
    gameTags: [],
    linkedAccounts: {},
    settings: {
      pushNotifications: true,
      emailNotifications: true,
      dmPrivacy: "everyone", // everyone | followers | none
      profileVisibility: "public", // public | private
      activityStatus: true,
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Create wallet
  const walletRef = db.collection("wallets").doc(user.uid);
  batch.set(walletRef, {
    userId: user.uid,
    balance: 0,
    totalEarned: 0,
    totalSpent: 0,
    totalTipped: 0,
    totalReceived: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Welcome notification
  const notifRef = db.collection("notifications").doc();
  batch.set(notifRef, {
    recipientId: user.uid,
    type: "system",
    title: "Welcome to VERGR! 🎮",
    body: "Where Gamers Converge. Complete your profile to get started.",
    read: false,
    actionUrl: "/onboarding",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();
  functions.logger.info(`New user created: ${user.uid}`);
});

/**
 * Triggered when a user is deleted.
 * Cleans up user data (soft delete — marks as deleted, doesn't remove everything).
 */
export const onUserDeleted = functions.auth.user().onDelete(async (user) => {
  const userRef = db.collection("users").doc(user.uid);
  await userRef.update({
    deleted: true,
    deletedAt: admin.firestore.FieldValue.serverTimestamp(),
    displayName: "Deleted User",
    username: null,
    avatar: null,
    banner: null,
    bio: "",
    email: null,
  });

  functions.logger.info(`User deleted (soft): ${user.uid}`);
});
