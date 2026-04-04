import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

import { db } from "./db";

/**
 * Submit a report against content or a user.
 */
export const submitReport = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }

  const { targetType, targetId, reason, details } = data;
  const validTypes = ["post", "comment", "user", "squad", "message", "stream", "review"];

  if (!validTypes.includes(targetType)) {
    throw new functions.https.HttpsError("invalid-argument", `Invalid target type. Must be one of: ${validTypes.join(", ")}`);
  }
  if (!targetId) {
    throw new functions.https.HttpsError("invalid-argument", "targetId required");
  }
  if (!reason) {
    throw new functions.https.HttpsError("invalid-argument", "reason required");
  }

  const validReasons = [
    "spam", "harassment", "hate_speech", "violence", "sexual_content",
    "misinformation", "impersonation", "scam", "underage", "other"
  ];

  if (!validReasons.includes(reason)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid reason");
  }

  // Check for duplicate report
  const existing = await db.collection("reports")
    .where("reporterId", "==", context.auth.uid)
    .where("targetId", "==", targetId)
    .where("targetType", "==", targetType)
    .limit(1)
    .get();

  if (!existing.empty) {
    throw new functions.https.HttpsError("already-exists", "You already reported this");
  }

  const report = await db.collection("reports").add({
    reporterId: context.auth.uid,
    targetType,
    targetId,
    reason,
    details: details?.substring(0, 1000) || null,
    status: "pending", // pending | reviewing | resolved | dismissed
    priority: reason === "underage" ? "critical" : "normal",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Check if this target has hit the auto-action threshold
  const reportCount = await db.collection("reports")
    .where("targetId", "==", targetId)
    .where("status", "in", ["pending", "reviewing"])
    .get();

  // Get threshold from config
  const config = await db.collection("app_config").doc("general").get();
  const threshold = config.data()?.reportThreshold || 5;

  if (reportCount.size >= threshold) {
    // Auto-hide content
    if (targetType === "post") {
      await db.collection("posts").doc(targetId).update({
        status: "hidden",
        hiddenReason: "auto_mod_reports",
        hiddenAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else if (targetType === "comment") {
      // Comments are in subcollections — we'd need the postId
      // This would be handled differently in production
      functions.logger.warn(`Comment ${targetId} hit report threshold — needs manual review`);
    }

    // Create mod action log
    await db.collection("mod_actions").add({
      action: "auto_hide",
      targetType,
      targetId,
      reason: `Reached ${threshold} reports`,
      automated: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  return { reportId: report.id };
});

/**
 * Auto-moderation check on post content.
 * Triggered when a new post is created.
 */
export const autoModCheck = functions.firestore
  .document("posts/{postId}")
  .onCreate(async (snap) => {
    const post = snap.data();
    const config = await db.collection("app_config").doc("general").get();

    if (!config.data()?.autoModEnabled) return;

    // Get banned words list
    const bannedDoc = await db.collection("banned_words").doc("list").get();
    const bannedWords: string[] = bannedDoc.data()?.words || [];

    if (bannedWords.length === 0) return;

    const content = (post.content || "").toLowerCase();
    const foundWords = bannedWords.filter(word => content.includes(word.toLowerCase()));

    if (foundWords.length > 0) {
      await snap.ref.update({
        status: "flagged",
        flaggedReason: "banned_words",
        flaggedWords: foundWords,
        flaggedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await db.collection("mod_actions").add({
        action: "auto_flag",
        targetType: "post",
        targetId: snap.id,
        reason: `Banned words detected: ${foundWords.join(", ")}`,
        automated: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      functions.logger.info(`Post ${snap.id} auto-flagged for banned words`);
    }
  });
