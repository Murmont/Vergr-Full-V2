import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

import { db } from "./db";

/**
 * Recalculate rank scores for all recent posts.
 * Runs every 15 minutes.
 * Formula: Rank = (BaseScore + Engagement + Recency) × BoostMultiplier
 */
export const calculateRankScores = functions.pubsub
  .schedule("every 15 minutes")
  .onRun(async () => {
    const now = Date.now();
    const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);

    // Get posts from last 24 hours
    const posts = await db.collection("posts")
      .where("status", "==", "published")
      .where("createdAt", ">=", twentyFourHoursAgo)
      .get();

    const batch = db.batch();
    let count = 0;

    for (const doc of posts.docs) {
      const post = doc.data();

      // Base score from engagement
      const likes = post.likeCount || 0;
      const comments = post.commentCount || 0;
      const shares = post.shareCount || 0;
      const saves = post.saveCount || 0;

      const engagementScore = (likes * 1) + (comments * 3) + (shares * 5) + (saves * 2);

      // Recency decay (posts lose points as they age)
      const postAge = (now - post.createdAt.toMillis()) / (1000 * 60 * 60); // hours
      const recencyScore = Math.max(0, 100 - (postAge * 4)); // lose 4 points per hour

      // Boost multipliers
      let boostMultiplier = 1.0;

      // Get author info for boost
      const author = await db.collection("users").doc(post.authorId).get();
      if (author.exists) {
        const verificationTier = author.data()?.verificationTier;
        if (verificationTier === "pro") boostMultiplier = 2.0;
        else if (verificationTier === "legend") boostMultiplier = 2.5;
        else if (verificationTier === "verified") boostMultiplier = 1.5;
      }

      // News posts get slightly lower boost
      if (post.type === "news") boostMultiplier *= 0.8;

      // Calculate final rank
      const rankScore = (engagementScore + recencyScore) * boostMultiplier;

      batch.update(doc.ref, { rankScore, lastRankedAt: admin.firestore.FieldValue.serverTimestamp() });
      count++;

      // Firestore batch limit is 500
      if (count % 400 === 0) {
        await batch.commit();
      }
    }

    await batch.commit();
    functions.logger.info(`Ranked ${count} posts`);
  });

/**
 * Update trending hashtags.
 * Runs every hour.
 */
export const updateTrending = functions.pubsub
  .schedule("every 1 hours")
  .onRun(async () => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Get recent posts
    const posts = await db.collection("posts")
      .where("status", "==", "published")
      .where("createdAt", ">=", twentyFourHoursAgo)
      .get();

    // Count hashtags
    const tagCounts: Record<string, { count: number; engagement: number }> = {};

    for (const doc of posts.docs) {
      const post = doc.data();
      const hashtags: string[] = post.hashtags || [];
      const engagement = (post.likeCount || 0) + (post.commentCount || 0) * 3;

      for (const tag of hashtags) {
        if (!tagCounts[tag]) tagCounts[tag] = { count: 0, engagement: 0 };
        tagCounts[tag].count++;
        tagCounts[tag].engagement += engagement;
      }
    }

    // Sort by combined score and take top 20
    const sorted = Object.entries(tagCounts)
      .map(([tag, data]) => ({ tag, score: data.count * 10 + data.engagement, ...data }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    // Write to trending collection
    await db.collection("trending").doc("hashtags").set({
      tags: sorted,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update individual hashtag docs
    const batch = db.batch();
    for (const item of sorted) {
      batch.set(db.collection("hashtags").doc(item.tag), {
        tag: item.tag,
        postCount24h: item.count,
        engagement24h: item.engagement,
        trendScore: item.score,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    await batch.commit();

    functions.logger.info(`Updated ${sorted.length} trending hashtags`);
  });

/**
 * Clean up expired stories (older than 24 hours).
 * Runs every hour.
 */
export const cleanupExpiredStories = functions.pubsub
  .schedule("every 1 hours")
  .onRun(async () => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const expired = await db.collection("stories")
      .where("active", "==", true)
      .where("createdAt", "<=", twentyFourHoursAgo)
      .get();

    const batch = db.batch();
    let count = 0;

    for (const doc of expired.docs) {
      batch.update(doc.ref, { active: false, expiredAt: admin.firestore.FieldValue.serverTimestamp() });
      count++;
    }

    await batch.commit();
    if (count > 0) functions.logger.info(`Expired ${count} stories`);
  });
