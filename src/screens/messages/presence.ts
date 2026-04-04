import { onValueUpdated } from "firebase-functions/v2/database";
import * as admin from "firebase-admin";

export const onUserStatusChanged = onValueUpdated("/status/{uid}", async (event) => {
  const uid = event.params.uid;
  const statusData = event.data.after.val();

  if (!statusData) return;

  const newStatus = statusData.state; // 'online' or 'offline'
  
  // Access your specific database 'vgrdb'
  const db = admin.firestore('vgrdb');

  try {
    // 1. Update the main User document
    await db.collection("users").doc(uid).update({
      status: newStatus,
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 2. Sync status to all active conversations for the Inbox UI
    const conversationsSnapshot = await db.collection("conversations")
      .where("participants", "array-contains", uid)
      .where("status", "==", "active")
      .get();

    if (conversationsSnapshot.empty) return;

    const batch = db.batch();
    conversationsSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        [`metadata.${uid}.status`]: newStatus
      });
    });

    await batch.commit();
  } catch (error) {
    console.error("Error syncing status:", error);
  }
});