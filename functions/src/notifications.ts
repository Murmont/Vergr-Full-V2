import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

import { db } from "./db";
const messaging = admin.messaging();

/**
 * Send push notification to a specific user via FCM.
 */
export const sendPushNotification = async (
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
) => {
  // Get user's FCM tokens
  const userDoc = await db.collection("users").doc(userId).collection("private").doc("fcm").get();
  if (!userDoc.exists) return;

  const tokens: string[] = userDoc.data()?.tokens || [];
  if (tokens.length === 0) return;

  // Check if user has push notifications enabled
  const user = await db.collection("users").doc(userId).get();
  if (!user.exists || !user.data()?.settings?.pushNotifications) return;

  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: { title, body },
    data: data || {},
    android: {
      notification: {
        channelId: "vergr_default",
        color: "#4DFFD4",
        priority: "high",
      },
    },
    apns: {
      payload: {
        aps: {
          badge: 1,
          sound: "default",
        },
      },
    },
  };

  try {
    const response = await messaging.sendEachForMulticast(message);

    // Clean up invalid tokens
    const invalidTokens: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error?.code === "messaging/invalid-registration-token") {
        invalidTokens.push(tokens[idx]);
      }
    });

    if (invalidTokens.length > 0) {
      await db.collection("users").doc(userId).collection("private").doc("fcm").update({
        tokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens),
      });
    }
  } catch (error) {
    functions.logger.error(`Failed to send push to ${userId}:`, error);
  }
};

/**
 * When someone follows a user → create notification + push.
 */
export const onNewFollower = functions.firestore
  .document("follows/{followId}")
  .onCreate(async (snap) => {
    const { followerId, followingId } = snap.data();

    // Get follower's display name
    const follower = await db.collection("users").doc(followerId).get();
    const followerName = follower.data()?.displayName || "Someone";

    // Increment counters
    const batch = db.batch();
    batch.update(db.collection("users").doc(followerId), {
      followingCount: admin.firestore.FieldValue.increment(1),
    });
    batch.update(db.collection("users").doc(followingId), {
      followerCount: admin.firestore.FieldValue.increment(1),
    });

    // Create notification
    batch.set(db.collection("notifications").doc(), {
      recipientId: followingId,
      type: "follow",
      title: "New follower",
      body: `${followerName} started following you`,
      senderId: followerId,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();

    // Push notification
    await sendPushNotification(
      followingId,
      "New follower",
      `${followerName} started following you`,
      { type: "follow", senderId: followerId }
    );
  });

/**
 * When someone likes a post → notify post author.
 */
export const onNewLike = functions.firestore
  .document("posts/{postId}/likes/{userId}")
  .onCreate(async (snap, context) => {
    const { postId } = context.params;
    const likerId = context.params.userId;

    // Get post to find author
    const post = await db.collection("posts").doc(postId).get();
    if (!post.exists) return;

    const authorId = post.data()!.authorId;
    if (authorId === likerId) return; // don't notify self-likes

    // Increment like count on post
    await db.collection("posts").doc(postId).update({
      likeCount: admin.firestore.FieldValue.increment(1),
    });

    // Get liker name
    const liker = await db.collection("users").doc(likerId).get();
    const likerName = liker.data()?.displayName || "Someone";

    // Create notification
    await db.collection("notifications").add({
      recipientId: authorId,
      type: "like",
      title: "Post liked",
      body: `${likerName} liked your post`,
      senderId: likerId,
      data: { postId },
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await sendPushNotification(
      authorId,
      "Post liked",
      `${likerName} liked your post`,
      { type: "like", postId }
    );
  });

/**
 * When someone comments on a post → notify post author.
 */
export const onNewComment = functions.firestore
  .document("posts/{postId}/comments/{commentId}")
  .onCreate(async (snap, context) => {
    const { postId } = context.params;
    const comment = snap.data();

    const post = await db.collection("posts").doc(postId).get();
    if (!post.exists) return;

    const authorId = post.data()!.authorId;
    if (authorId === comment.authorId) return;

    // Increment comment count
    await db.collection("posts").doc(postId).update({
      commentCount: admin.firestore.FieldValue.increment(1),
    });

    const commenter = await db.collection("users").doc(comment.authorId).get();
    const commenterName = commenter.data()?.displayName || "Someone";

    await db.collection("notifications").add({
      recipientId: authorId,
      type: "comment",
      title: "New comment",
      body: `${commenterName} commented on your post`,
      senderId: comment.authorId,
      data: { postId, commentId: snap.id },
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await sendPushNotification(
      authorId,
      "New comment",
      `${commenterName}: ${comment.content.substring(0, 100)}`,
      { type: "comment", postId }
    );
  });

/**
 * When a new DM is sent → notify recipient.
 */
export const onNewMessage = functions.firestore
  .document("conversations/{convoId}/messages/{messageId}")
  .onCreate(async (snap, context) => {
    const { convoId } = context.params;
    const message = snap.data();

    // Update conversation's last message
    await db.collection("conversations").doc(convoId).update({
      lastMessage: message.content?.substring(0, 100) || "Sent an attachment",
      lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
      lastMessageBy: message.senderId,
    });

    // Get conversation to find other participants
    const convo = await db.collection("conversations").doc(convoId).get();
    if (!convo.exists) return;

    const participants: string[] = convo.data()!.participants || [];
    const sender = await db.collection("users").doc(message.senderId).get();
    const senderName = sender.data()?.displayName || "Someone";

    // Notify all participants except sender
    for (const participantId of participants) {
      if (participantId === message.senderId) continue;

      await sendPushNotification(
        participantId,
        senderName,
        message.content?.substring(0, 100) || "Sent an attachment",
        { type: "message", conversationId: convoId }
      );
    }
  });
