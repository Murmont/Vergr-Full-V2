const { getFirestore } = require('firebase-admin/firestore');
const functions = require('firebase-functions/v2');
const axios = require('axios');
const cheerio = require('cheerio');
const admin = require('firebase-admin');

if (admin.apps.length === 0) admin.initializeApp();
functions.setGlobalOptions({ region: 'europe-west1' });
const db = getFirestore('vgrdb');

// ──────────────────────────────────────────────────────────────
// 1. LINK PREVIEW
// ──────────────────────────────────────────────────────────────
exports.getLinkPreviewV2 = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing url' });
  try {
    const response = await axios.get(url, { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0)' } });
    const $ = cheerio.load(response.data);
    const title = $('meta[property="og:title"]').attr('content') || $('title').text() || url;
    const description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
    const image = $('meta[property="og:image"]').attr('content') || '';
    const resolvedImage = image ? new URL(image, url).href : '';
    return res.json({ title: title.trim(), description: description.trim(), image: resolvedImage, url });
  } catch (error) {
    console.error('Link preview error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch preview' });
  }
});

// ──────────────────────────────────────────────────────────────
// 2. DAILY LOGIN — 5 consecutive days to earn 25 coins
// ──────────────────────────────────────────────────────────────
exports.claimDailyReward = functions.https.onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');

  const walletRef = db.collection('wallets').doc(uid);

  return db.runTransaction(async (tx) => {
    const walletSnap = await tx.get(walletRef);
    const currentBalance = walletSnap.exists ? (walletSnap.data().balance || 0) : 0;
    const currentEarned = walletSnap.exists ? (walletSnap.data().totalEarned || 0) : 0;
    const currentStreak = walletSnap.exists ? (walletSnap.data().dailyStreak || 0) : 0;
    const lastCheckIn = walletSnap.exists ? walletSnap.data().lastDailyCheckIn : null;

    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    // Already checked in today
    if (lastCheckIn) {
      const lastDate = lastCheckIn.toDate ? lastCheckIn.toDate() : new Date(lastCheckIn);
      if (lastDate.toISOString().slice(0, 10) === today) {
        throw new functions.https.HttpsError('already-exists', 'Already checked in today');
      }
    }

    // Calculate streak — was yesterday the last check-in?
    let newStreak = 1;
    if (lastCheckIn) {
      const lastDate = lastCheckIn.toDate ? lastCheckIn.toDate() : new Date(lastCheckIn);
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      if (lastDate.toISOString().slice(0, 10) === yesterday.toISOString().slice(0, 10)) {
        newStreak = currentStreak + 1;
      }
      // else: missed a day, reset to 1
    }

    // Only pay out on day 5, then reset
    let reward = 0;
    let vpReward = 10; // 10 VP per daily check-in always
    let streakToSave = newStreak;
    if (newStreak >= 5) {
      reward = 5;    // 5 coins on day 5
      vpReward = 50; // 50 VP bonus for completing streak
      streakToSave = 0; // Reset after payout
    }

    // Update wallet — coins + VP
    const walletData = {
      balance: currentBalance + reward,
      totalEarned: currentEarned + reward,
      vp: (walletSnap.exists ? (walletSnap.data().vp || 0) : 0) + vpReward,
      totalSpent: walletSnap.exists ? (walletSnap.data().totalSpent || 0) : 0,
      gems: walletSnap.exists ? (walletSnap.data().gems || 0) : 0,
      totalGemsEarned: walletSnap.exists ? (walletSnap.data().totalGemsEarned || 0) : 0,
      totalReceived: walletSnap.exists ? (walletSnap.data().totalReceived || 0) : 0,
      totalTipped: walletSnap.exists ? (walletSnap.data().totalTipped || 0) : 0,
      tier: walletSnap.exists ? (walletSnap.data().tier || 'free') : 'free',
      lastDailyCheckIn: now,
      dailyStreak: streakToSave,
      updatedAt: now,
      ...(!walletSnap.exists ? { createdAt: now } : {}),
    };
    tx.set(walletRef, walletData);

    // Also mark quest_claims so earn page knows today is done
    const claimId = `${uid}_daily_login_${today}`;
    tx.set(db.collection('quest_claims').doc(claimId), {
      userId: uid, questId: 'daily_login', amount: reward, claimedAt: now,
    });

    if (reward > 0) {
      tx.set(db.collection('transactions').doc(), {
        userId: uid, type: 'daily_reward', amount: reward,
        description: `5-day streak: +${reward} coins + ${vpReward} VP`, createdAt: now,
      });
      tx.set(db.collection('notifications').doc(), {
        recipientId: uid, type: 'coins',
        title: `+${reward} coins + ${vpReward} VP — 5-day streak!`,
        body: 'Streak reset — start again tomorrow!',
        read: false, data: { amount: reward, vp: vpReward, type: 'daily_reward' }, createdAt: now,
      });
    }

    return { 
      reward, vpReward,
      streak: newStreak >= 5 ? 0 : newStreak, 
      dayOfStreak: newStreak >= 5 ? 5 : newStreak,
      paid: reward > 0,
      message: reward > 0 
        ? `+${reward} coins + ${vpReward} VP! Streak complete!` 
        : `Day ${newStreak}/5 — +${vpReward} VP · ${5 - newStreak} more day${5 - newStreak === 1 ? '' : 's'} for coins`
    };
  });
});

// ──────────────────────────────────────────────────────────────
// 3. QUEST REWARD CLAIM (callable)
// ──────────────────────────────────────────────────────────────
exports.claimQuestReward = functions.https.onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');

  const { questId, reward, title } = request.data || {};
  if (!questId || !reward) throw new functions.https.HttpsError('invalid-argument', 'questId and reward required');
  if (typeof reward !== 'number' || reward <= 0 || reward > 500) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid reward amount');
  }

  if (questId === 'daily_login') {
    throw new functions.https.HttpsError('invalid-argument', 'Use the daily login banner');
  }

  const today = new Date().toISOString().split('T')[0];
  const isOneTime = ['first_squad', 'first_tournament', 'refer_friend', 'creator_content'].includes(questId);
  const claimId = isOneTime ? `${uid}_${questId}` : `${uid}_${questId}_${today}`;
  const claimRef = db.collection('quest_claims').doc(claimId);
  const walletRef = db.collection('wallets').doc(uid);

  return db.runTransaction(async (tx) => {
    const claimSnap = await tx.get(claimRef);
    if (claimSnap.exists) throw new functions.https.HttpsError('already-exists', 'Already claimed');

    // Server-side validation
    if (questId === 'refer_friend') {
      const { friendId } = request.data;
      if (!friendId) throw new functions.https.HttpsError('invalid-argument', 'friendId required');
      const referrerWallet = await tx.get(walletRef);
      const referrerTier = referrerWallet.exists ? referrerWallet.data().tier : 'free';
      if (referrerTier === 'free') throw new functions.https.HttpsError('failed-precondition', 'You need a Lite or Pro subscription');
      const friendWallet = await tx.get(db.collection('wallets').doc(friendId));
      const friendTier = friendWallet.exists ? friendWallet.data().tier : 'free';
      if (friendTier === 'free') throw new functions.https.HttpsError('failed-precondition', 'Your friend needs a Lite or Pro subscription');
      const purchaseSnap = await db.collection('transactions')
        .where('userId', '==', friendId)
        .where('type', '==', 'purchase')
        .limit(1).get();
      if (purchaseSnap.empty) throw new functions.https.HttpsError('failed-precondition', 'Your friend needs to purchase a coin pack first');
    }

    if (questId === 'creator_content') {
      const postsSnap = await db.collection('posts')
        .where('authorId', '==', uid)
        .where('status', '==', 'published')
        .orderBy('createdAt', 'desc')
        .limit(50).get();
      const qualifying = postsSnap.docs.filter(d => {
        const data = d.data();
        return (data.likeCount || 0) >= 5 && (data.commentCount || 0) >= 5;
      });
      if (qualifying.length < 10) {
        throw new functions.https.HttpsError('failed-precondition', 
          `Need 10 posts with 5+ likes and 5+ comments. You have ${qualifying.length} qualifying posts.`);
      }
    }

    if (questId === 'first_squad') {
      const squadsSnap = await db.collectionGroup('members')
        .where('userId', '==', uid).limit(1).get();
      if (squadsSnap.empty) throw new functions.https.HttpsError('failed-precondition', 'Join a squad first');
    }

    if (questId === 'first_tournament') {
      const tourneysSnap = await db.collection('tournaments')
        .where('participants', 'array-contains', uid).limit(1).get();
      if (tourneysSnap.empty) throw new functions.https.HttpsError('failed-precondition', 'Enter a tournament first');
    }

    // Pay out
    const walletSnap = await tx.get(walletRef);
    const currentBalance = walletSnap.exists ? (walletSnap.data().balance || 0) : 0;
    const currentEarned = walletSnap.exists ? (walletSnap.data().totalEarned || 0) : 0;

    if (walletSnap.exists) {
      tx.update(walletRef, { balance: currentBalance + reward, totalEarned: currentEarned + reward, updatedAt: new Date() });
    } else {
      tx.set(walletRef, {
        balance: reward, totalEarned: reward, totalSpent: 0, totalReceived: 0, totalTipped: 0,
        tier: 'free', dailyStreak: 0, lastDailyCheckIn: null, createdAt: new Date(), updatedAt: new Date(),
      });
    }

    tx.set(claimRef, { userId: uid, questId, amount: reward, claimedAt: new Date() });
    tx.set(db.collection('transactions').doc(), {
      userId: uid, type: 'quest_reward', amount: reward,
      description: title || `Quest: ${questId}`, createdAt: new Date(),
    });
    tx.set(db.collection('notifications').doc(), {
      recipientId: uid, type: 'coins',
      title: `+${reward} coins earned!`,
      body: title || `Quest completed: ${questId}`,
      read: false, data: { amount: reward, type: 'quest_reward' }, createdAt: new Date(),
    });

    return { reward, questId };
  });
});

// ──────────────────────────────────────────────────────────────
// 4. ENGAGEMENT REWARD — post liked → author gets 2 VP
// ──────────────────────────────────────────────────────────────
exports.onPostLiked = functions.firestore
  .onDocumentCreated({ document: 'posts/{postId}/likes/{userId}', database: 'vgrdb' }, async (event) => {
    const postId = event.params.postId;
    const likerId = event.params.userId;
    try {
      const postSnap = await db.collection('posts').doc(postId).get();
      if (!postSnap.exists) return;
      const authorId = postSnap.data().authorId;
      if (authorId === likerId) return;

      const today = new Date().toISOString().slice(0, 10);
      const capRef = db.collection('wallets').doc(authorId).collection('daily_caps').doc(today);
      const capSnap = await capRef.get();
      if ((capSnap.exists ? (capSnap.data().likeVP || 0) : 0) >= 40) return;

      await db.collection('wallets').doc(authorId).update({
        vp: admin.firestore.FieldValue.increment(2),
      });
      await capRef.set({ likeVP: admin.firestore.FieldValue.increment(2) }, { merge: true });

      await db.collection('wallets').doc(likerId).update({
        vp: admin.firestore.FieldValue.increment(1),
      }).catch(() => {});
    } catch (error) {
      console.error('VP reward error:', error);
    }
  });

// ──────────────────────────────────────────────────────────────
// 5. MONTHLY TIER REWARDS (1st of month)
// ──────────────────────────────────────────────────────────────
exports.monthlyTierRewards = functions.scheduler
  .onSchedule('0 0 1 * *', async () => {
    const TIER_REWARDS = { lite: 10, pro: 30 };
    for (const [tier, reward] of Object.entries(TIER_REWARDS)) {
      const usersSnap = await db.collection('wallets').where('tier', '==', tier).get();
      const batch = db.batch();
      let count = 0;
      for (const walletDoc of usersSnap.docs) {
        batch.update(walletDoc.ref, {
          balance: admin.firestore.FieldValue.increment(reward),
          totalEarned: admin.firestore.FieldValue.increment(reward),
        });
        batch.set(db.collection('transactions').doc(), {
          userId: walletDoc.id, type: 'tier_reward', amount: reward,
          description: `Monthly ${tier.charAt(0).toUpperCase() + tier.slice(1)} reward`, createdAt: new Date(),
        });
        batch.set(db.collection('notifications').doc(), {
          recipientId: walletDoc.id, type: 'coins',
          title: `+${reward} monthly coins!`, body: `Your ${tier} tier reward`,
          read: false, data: { amount: reward, type: 'tier_reward' }, createdAt: new Date(),
        });
        count++;
        if (count % 200 === 0) await batch.commit();
      }
      if (count % 200 !== 0) await batch.commit();
      console.log(`Distributed ${reward} coins to ${count} ${tier} users`);
    }
  });

// ──────────────────────────────────────────────────────────────
// 6. ADMIN ANNOUNCEMENT
// ──────────────────────────────────────────────────────────────
exports.sendAnnouncement = functions.https.onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists || userDoc.data().role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  const { title, body, audience, type, coinReward, actionUrl } = request.data || {};
  if (!title) throw new functions.https.HttpsError('invalid-argument', 'Title required');

  let usersQuery;
  if (audience === 'lite') usersQuery = db.collection('wallets').where('tier', '==', 'lite');
  else if (audience === 'pro') usersQuery = db.collection('wallets').where('tier', '==', 'pro');
  else if (audience === 'paid') usersQuery = db.collection('wallets').where('tier', 'in', ['lite', 'pro']);
  else usersQuery = db.collection('users').select();

  const snap = await usersQuery.get();
  const now = new Date();
  let count = 0;
  let batch = db.batch();

  for (const userDoc of snap.docs) {
    const recipientId = userDoc.id;
    batch.set(db.collection('notifications').doc(), {
      recipientId, type: type || 'system', title, body: body || '',
      read: false, actionUrl: actionUrl || null,
      data: coinReward > 0 ? { amount: coinReward, type: 'admin_reward' } : null, createdAt: now,
    });
    if (coinReward > 0 && type === 'coins') {
      batch.update(db.collection('wallets').doc(recipientId), {
        balance: admin.firestore.FieldValue.increment(coinReward),
        totalEarned: admin.firestore.FieldValue.increment(coinReward),
      });
      batch.set(db.collection('transactions').doc(), {
        userId: recipientId, type: 'admin_reward', amount: coinReward, description: title, createdAt: now,
      });
    }
    count++;
    if (count % 200 === 0) { await batch.commit(); batch = db.batch(); }
  }
  if (count % 200 !== 0) await batch.commit();
  sendPushToAll(snap.docs.map(d => d.id), title, body || '', { type: type || 'system' }).catch(() => {});
  return { count, title };
});

// ──────────────────────────────────────────────────────────────
// 7. MONTHLY SQUAD ELECTIONS
// ──────────────────────────────────────────────────────────────
exports.monthlySquadElections = functions.scheduler
  .onSchedule('0 12 1 * *', async () => {
    const squadsSnap = await db.collection('squads').where('memberCount', '>=', 3).get();
    let count = 0;
    for (const squadDoc of squadsSnap.docs) {
      const squad = squadDoc.data();
      try {
        const membersSnap = await db.collection('squads').doc(squadDoc.id).collection('members').get();
        const candidates = membersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (candidates.length < 3) continue;
        const voteRef = db.collection('squads').doc(squadDoc.id).collection('votes').doc();
        await voteRef.set({
          title: 'Monthly President Election', type: 'election', targetRole: 'president',
          options: candidates.map(c => c.id), voteCounts: {}, voterIds: [], totalVotes: 0,
          status: 'active', isMonthlyElection: true,
          expiresAt: new Date(Date.now() + 72 * 3600000), createdAt: new Date(),
        });
        const batch = db.batch();
        for (const m of candidates) {
          batch.set(db.collection('notifications').doc(), {
            recipientId: m.id, type: 'squad', title: 'Squad Election',
            body: `Monthly president vote is open for ${squad.name}. Cast your vote!`,
            read: false, data: { squadId: squadDoc.id }, createdAt: new Date(),
          });
        }
        await batch.commit();
        count++;
      } catch (err) { console.error(`Election error for ${squadDoc.id}:`, err); }
    }
    console.log(`Created elections for ${count} squads`);
  });

// ──────────────────────────────────────────────────────────────
// 8. RESOLVE EXPIRED VOTES (every 6 hours)
// ──────────────────────────────────────────────────────────────
exports.resolveExpiredVotes = functions.scheduler
  .onSchedule('0 */6 * * *', async () => {
    const now = new Date();
    const squadsSnap = await db.collection('squads').get();
    let resolved = 0;
    for (const squadDoc of squadsSnap.docs) {
      const votesSnap = await db.collection('squads').doc(squadDoc.id).collection('votes')
        .where('status', '==', 'active').get();
      for (const voteDoc of votesSnap.docs) {
        const vote = voteDoc.data();
        const expiresAt = vote.expiresAt?.toDate ? vote.expiresAt.toDate() : new Date(vote.expiresAt);
        if (expiresAt > now) continue;
        try {
          const batch = db.batch();
          const voteCounts = vote.voteCounts || {};
          let winnerIndex = null, maxVotes = 0;
          Object.entries(voteCounts).forEach(([idx, cnt]) => { if (cnt > maxVotes) { maxVotes = cnt; winnerIndex = idx; } });

          batch.update(voteDoc.ref, { status: 'resolved', winnerIndex, resolvedAt: now });

          // --- Handle elect_role (yes/no) votes ---
          if (vote.type === 'elect_role' && winnerIndex !== null && vote.options?.[winnerIndex] === 'Yes' && vote.targetUserId && vote.targetRole) {
            // Remove current holder of this role (if any)
            const currentHolders = await db.collection('squads').doc(squadDoc.id).collection('members')
              .where('role', '==', vote.targetRole).get();
            for (const holder of currentHolders.docs) {
              if (holder.id !== vote.targetUserId) {
                batch.update(holder.ref, { role: 'member' });
              }
            }
            // Assign new role
            const targetMemberRef = db.collection('squads').doc(squadDoc.id).collection('members').doc(vote.targetUserId);
            batch.update(targetMemberRef, { role: vote.targetRole });
            // ✅ Update squad owner if the role is president
            if (vote.targetRole === 'president') {
              batch.update(squadDoc.ref, { ownerId: vote.targetUserId });
            }
            batch.set(db.collection('notifications').doc(), {
              recipientId: vote.targetUserId, type: 'squad',
              title: `You are now ${vote.targetRole.replace('_', ' ')}!`,
              body: `Elected by your squad`,
              read: false, data: { squadId: squadDoc.id }, createdAt: now,
            });
          }

          // --- Handle election (candidate list) votes ---
          if (vote.type === 'election' && vote.targetRole && winnerIndex !== null && vote.options?.[winnerIndex]) {
            const winnerId = vote.options[winnerIndex];
            const holders = await db.collection('squads').doc(squadDoc.id).collection('members')
              .where('role', '==', vote.targetRole).get();
            for (const h of holders.docs) { if (h.id !== winnerId) batch.update(h.ref, { role: 'member' }); }
            batch.update(db.collection('squads').doc(squadDoc.id).collection('members').doc(winnerId), { role: vote.targetRole });
            // ✅ Update squad owner if the role is president
            if (vote.targetRole === 'president') {
              batch.update(squadDoc.ref, { ownerId: winnerId });
            }
            batch.set(db.collection('notifications').doc(), {
              recipientId: winnerId, type: 'squad',
              title: `You are now ${vote.targetRole.replace('_', ' ')}!`,
              body: `Elected by your squad`, read: false, data: { squadId: squadDoc.id }, createdAt: now,
            });
          }

          // --- Handle kick votes ---
          if (vote.type === 'kick' && winnerIndex === '0' && maxVotes > 0 && vote.targetUserId) {
            batch.delete(db.collection('squads').doc(squadDoc.id).collection('members').doc(vote.targetUserId));
            batch.update(squadDoc.ref, {
              memberCount: admin.firestore.FieldValue.increment(-1),
              memberIds: admin.firestore.FieldValue.arrayRemove(vote.targetUserId),
            });
          }

          await batch.commit();
          resolved++;
        } catch (err) { console.error(`Vote resolve error:`, err); }
      }
    }
    if (resolved > 0) console.log(`Resolved ${resolved} expired votes`);
  });

// ──────────────────────────────────────────────────────────────
// PUSH HELPERS
// ──────────────────────────────────────────────────────────────
async function sendPushToUser(userId, title, body, data = {}) {
  try {
    const fcmDoc = await db.collection('users').doc(userId).collection('private').doc('fcm').get();
    if (!fcmDoc.exists) return;
    const tokens = fcmDoc.data()?.tokens || [];
    if (tokens.length === 0) return;
    const user = await db.collection('users').doc(userId).get();
    if (user.exists && user.data()?.settings?.pushNotifications === false) return;
    const response = await admin.messaging().sendEachForMulticast({
      tokens, notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      webpush: { notification: { icon: '/icons/icon-192.png', badge: '/icons/icon-192.png' } },
    });
    const invalid = [];
    response.responses.forEach((r, i) => {
      if (!r.success && (r.error?.code === 'messaging/invalid-registration-token' || r.error?.code === 'messaging/registration-token-not-registered')) invalid.push(tokens[i]);
    });
    if (invalid.length > 0) await db.collection('users').doc(userId).collection('private').doc('fcm').update({ tokens: admin.firestore.FieldValue.arrayRemove(...invalid) });
  } catch (err) {}
}
async function sendPushToAll(userIds, title, body, data = {}) {
  for (let i = 0; i < userIds.length; i += 10) {
    await Promise.allSettled(userIds.slice(i, i + 10).map(uid => sendPushToUser(uid, title, body, data)));
  }
}