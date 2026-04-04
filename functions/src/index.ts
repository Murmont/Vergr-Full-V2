import * as admin from "firebase-admin";

admin.initializeApp();

// Export all function groups
export { onUserCreated, onUserDeleted } from "./auth";
export { sendTip, purchaseCoins, getWalletBalance } from "./coins";
export { sendPushNotification, onNewFollower, onNewLike, onNewComment, onNewMessage } from "./notifications";
export { calculateRankScores, updateTrending, cleanupExpiredStories } from "./scheduled";
export { submitReport, autoModCheck } from "./moderation";
export { createOrder, handleStripeWebhook, requestPayout } from "./commerce";
export { subscribeMembership, cancelMembership } from "./memberships";
export { onUserStatusChanged } from "./presence";

