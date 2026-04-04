import { db, storage, auth } from './config';
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc,
  query, where, orderBy, limit, startAfter, onSnapshot, serverTimestamp,
  increment, arrayUnion, arrayRemove, writeBatch, runTransaction,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// ═══════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════

export const getUser = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const getUserByUsername = async (username) => {
  const q = query(collection(db, 'users'), where('username', '==', username), limit(1));
  const snap = await getDocs(q);
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
};

export const getUserById = async (userId) => {
  const docRef = doc(db, 'users', userId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

export const updateUser = async (uid, data) => {
  await updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() });
};

export const completeOnboarding = async (uid, { username, displayName, bio, gameTags, linkedAccounts }) => {
  await updateDoc(doc(db, 'users', uid), {
    username,
    displayName,
    bio: bio || '',
    gameTags: gameTags || [],
    linkedAccounts: linkedAccounts || {},
    isOnboarded: true,
    level: 1,
    totalXP: 0,
    updatedAt: serverTimestamp(),
  });
};

export const updateUserCoins = async (uid, amount) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    coins: increment(amount),
    coinsSpent: amount < 0 ? increment(Math.abs(amount)) : increment(0),
    updatedAt: serverTimestamp()
  });
};

export const subscribeToUser = (uid, callback) => {
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
};

// ═══════════════════════════════════════════
// FOLLOWS
// ═══════════════════════════════════════════

export const followUser = async (followerId, followingId) => {
  const followId = `${followerId}_${followingId}`;
  const batch = writeBatch(db);
  
  batch.set(doc(db, 'follows', followId), {
    followerId,
    followingId,
    createdAt: serverTimestamp(),
  });

  batch.update(doc(db, 'users', followerId), { 
    followingCount: increment(1) 
  });

  batch.update(doc(db, 'users', followingId), { 
    followerCount: increment(1) 
  });

  await batch.commit();
};

export const unfollowUser = async (followerId, followingId) => {
  const followId = `${followerId}_${followingId}`;
  const batch = writeBatch(db);

  batch.delete(doc(db, 'follows', followId));

  batch.update(doc(db, 'users', followerId), { 
    followingCount: increment(-1) 
  });

  batch.update(doc(db, 'users', followingId), { 
    followerCount: increment(-1) 
  });

  await batch.commit();
};

export const isFollowing = async (followerId, followingId) => {
  const snap = await getDoc(doc(db, 'follows', `${followerId}_${followingId}`));
  return snap.exists();
};

export const getFollowing = async (uid) => {
  const q = query(collection(db, 'follows'), where('followerId', '==', uid));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getFollowers = async (uid) => {
  const q = query(collection(db, 'follows'), where('followingId', '==', uid));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// ═══════════════════════════════════════════
// POSTS
// ═══════════════════════════════════════════

export const createPost = async (authorId, { 
  content, type = 'text', mediaUrls = [], hashtags = [], pollOptions = [],
  linkPreview = null, lfgData = null, articleData = null, tierListData = null, achievementData = null 
}) => {
  const postData = {
    authorId,
    content,
    type,
    mediaUrls,
    hashtags,
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    saveCount: 0,
    viewCount: 0,
    status: 'published',
    rankScore: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (pollOptions.length > 0) postData.pollOptions = pollOptions.map(opt => ({ text: opt, votes: 0 }));
  if (linkPreview) postData.linkPreview = linkPreview;
  if (lfgData) postData.lfgData = lfgData;
  if (articleData) postData.articleData = articleData;
  if (tierListData) postData.tierListData = tierListData;
  if (achievementData) postData.achievementData = achievementData;
  if (type === 'lfg') postData.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const postRef = await addDoc(collection(db, 'posts'), postData);
  await updateDoc(doc(db, 'users', authorId), { postCount: increment(1) });
  return postRef.id;
};

export const updatePostMediaUrl = async (postId, url) => {
  await updateDoc(doc(db, 'posts', postId), {
    mediaUrls: arrayUnion(url),
    mediaUrl: url,
  });
};

export const getFeedPosts = async (limitCount = 20, lastDoc = null) => {
  let q = query(
    collection(db, 'posts'), 
    where('status', '==', 'published'), 
    orderBy('createdAt', 'desc'), 
    limit(limitCount)
  );
  
  if (lastDoc) q = query(q, startAfter(lastDoc));
  
  const snap = await getDocs(q);
  const posts = [];
  for (const d of snap.docs) {
    const post = { id: d.id, ...d.data(), _doc: d };
    const author = await getUser(post.authorId);
    post.author = author || { displayName: 'Vergr Member', avatar: null };
    posts.push(post);
  }
  return posts;
};

export const getFollowingFeedPosts = async (userId, limitCount = 20) => {
  // Get list of users this person follows
  const followsSnap = await getDocs(query(collection(db, 'follows'), where('followerId', '==', userId)));
  const followingIds = followsSnap.docs.map(d => d.data().followingId).filter(Boolean);

  if (followingIds.length === 0) return [];

  // Firestore 'in' supports max 30 items — chunk if needed
  const posts = [];
  const chunks = [];
  for (let i = 0; i < followingIds.length; i += 30) {
    chunks.push(followingIds.slice(i, i + 30));
  }

  for (const chunk of chunks) {
    const q = query(
      collection(db, 'posts'),
      where('status', '==', 'published'),
      where('authorId', 'in', chunk),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      const post = { id: d.id, ...d.data() };
      const author = await getUser(post.authorId);
      post.author = author || { displayName: 'Vergr Member', avatar: null };
      posts.push(post);
    }
  }

  // Sort by date and take top N
  posts.sort((a, b) => {
    const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
    const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
    return bTime - aTime;
  });
  return posts.slice(0, limitCount);
};

export const getTrendingPosts = async (limitCount = 20) => {
  // Use rankScore calculated by the calculateRankScores Cloud Function
  // Falls back to likeCount ordering if rankScore hasn't been set yet
  const q = query(
    collection(db, 'posts'),
    where('status', '==', 'published'),
    orderBy('rankScore', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  const posts = [];
  for (const d of snap.docs) {
    const post = { id: d.id, ...d.data() };
    // Skip posts with zero engagement
    if ((post.likeCount || 0) + (post.commentCount || 0) + (post.shareCount || 0) === 0) continue;
    const author = await getUser(post.authorId);
    post.author = author || { displayName: 'Vergr Member', avatar: null };
    posts.push(post);
  }
  return posts;

};

export const getUserPosts = async (uid, limitCount = 20) => {
  const q = query(
    collection(db, 'posts'), 
    where('authorId', '==', uid), 
    orderBy('createdAt', 'desc'), 
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getPost = async (postId) => {
  const snap = await getDoc(doc(db, 'posts', postId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const deletePost = async (postId, authorId) => {
  await deleteDoc(doc(db, 'posts', postId));
  if (authorId) {
    const userSnap = await getDoc(doc(db, 'users', authorId));
    const currentPosts = userSnap.exists() ? (userSnap.data().postCount || 0) : 0;
    await updateDoc(doc(db, 'users', authorId), { postCount: Math.max(0, currentPosts - 1) }).catch(() => {});
  }
};

export const reportPost = async (reporterId, postId, reason, details = '') => {
  await addDoc(collection(db, 'reports'), {
    reporterId,
    targetType: 'post',
    targetId: postId,
    reason,
    details: details.substring(0, 1000) || null,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
};

// ═══════════════════════════════════════════
// COMMENTS
// ═══════════════════════════════════════════

export const getComments = async (postId, limitCount = 20) => {
  const q = query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  const comments = [];
  for (const d of snap.docs) {
    const comment = { id: d.id, ...d.data() };
    comment.author = await getUser(comment.authorId);
    comments.push(comment);
  }
  return comments;
};

export const addComment = async (postId, authorId, content) => {
  const ref = await addDoc(collection(db, 'posts', postId, 'comments'), {
    authorId,
    content,
    likeCount: 0,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'posts', postId), { commentCount: increment(1) });
  return ref.id;
};

// ═══════════════════════════════════════════
// POST ENGAGEMENT
// ═══════════════════════════════════════════

export const toggleLike = async (postId, userId) => {
  const likeRef = doc(db, 'posts', postId, 'likes', userId);
  const postRef = doc(db, 'posts', postId);
  return runTransaction(db, async (tx) => {
    const likeSnap = await tx.get(likeRef);
    const postSnap = await tx.get(postRef);
    const currentCount = postSnap.exists() ? (postSnap.data().likeCount || 0) : 0;
    if (likeSnap.exists()) {
      tx.delete(likeRef);
      tx.update(postRef, { likeCount: Math.max(0, currentCount - 1) });
      return false;
    } else {
      tx.set(likeRef, { userId, createdAt: serverTimestamp() });
      // onNewLike Cloud Function handles likeCount increment + notification
      return true;
    }
  });
};

export const isPostLiked = async (postId, userId) => {
  if (!userId) return false;
  const likeRef = doc(db, 'posts', postId, 'likes', userId);
  const snap = await getDoc(likeRef);
  return snap.exists();
};

export const toggleBookmark = async (postId, userId) => {
  const bmRef = doc(db, 'users', userId, 'bookmarks', postId);
  const postRef = doc(db, 'posts', postId);
  return runTransaction(db, async (tx) => {
    const bmSnap = await tx.get(bmRef);
    const postSnap = await tx.get(postRef);
    const currentCount = postSnap.exists() ? (postSnap.data().saveCount || 0) : 0;
    if (bmSnap.exists()) {
      tx.delete(bmRef);
      tx.update(postRef, { saveCount: Math.max(0, currentCount - 1) });
      return false;
    } else {
      tx.set(bmRef, { postId, createdAt: serverTimestamp() });
      tx.update(postRef, { saveCount: currentCount + 1 });
      return true;
    }
  });
};

export const isBookmarked = async (postId, userId) => {
  if (!userId) return false;
  const bmRef = doc(db, 'users', userId, 'bookmarks', postId);
  const snap = await getDoc(bmRef);
  return snap.exists();
};

export const getBookmarks = async (userId, limitCount = 50) => {
  const q = query(collection(db, 'users', userId, 'bookmarks'), orderBy('createdAt', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  const bookmarks = [];
  for (const d of snap.docs) {
    const post = await getPost(d.data().postId);
    if (post) bookmarks.push(post);
  }
  return bookmarks;
};

export const incrementShareCount = async (postId) => {
  await updateDoc(doc(db, 'posts', postId), { shareCount: increment(1) });
};

export const incrementViewCount = async (postId) => {
  await updateDoc(doc(db, 'posts', postId), { viewCount: increment(1) });
};

// ═══════════════════════════════════════════
// REPOSTS & QUOTES
// ═══════════════════════════════════════════

export const repost = async (userId, originalPostId) => {
  const existing = await getDocs(
    query(collection(db, 'posts'), where('authorId', '==', userId), where('repostOf', '==', originalPostId), where('type', '==', 'repost'), limit(1))
  );
  if (!existing.empty) throw new Error('Already reposted');

  await addDoc(collection(db, 'posts'), {
    authorId: userId,
    type: 'repost',
    repostOf: originalPostId,
    content: '',
    mediaUrls: [],
    hashtags: [],
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    saveCount: 0,
    viewCount: 0,
    status: 'published',
    rankScore: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const origSnap = await getDoc(doc(db, 'posts', originalPostId));
  const currentShare = origSnap.exists() ? (origSnap.data().shareCount || 0) : 0;
  await updateDoc(doc(db, 'posts', originalPostId), { shareCount: currentShare + 1 });

  const userSnap = await getDoc(doc(db, 'users', userId));
  const currentPosts = userSnap.exists() ? (userSnap.data().postCount || 0) : 0;
  await updateDoc(doc(db, 'users', userId), { postCount: currentPosts + 1 });
};

export const undoRepost = async (userId, originalPostId) => {
  const existing = await getDocs(
    query(collection(db, 'posts'), where('authorId', '==', userId), where('repostOf', '==', originalPostId), where('type', '==', 'repost'), limit(1))
  );
  if (existing.empty) return;
  await deleteDoc(existing.docs[0].ref);

  const origSnap = await getDoc(doc(db, 'posts', originalPostId));
  const currentShare = origSnap.exists() ? (origSnap.data().shareCount || 0) : 0;
  await updateDoc(doc(db, 'posts', originalPostId), { shareCount: Math.max(0, currentShare - 1) });

  const userSnap = await getDoc(doc(db, 'users', userId));
  const currentPosts = userSnap.exists() ? (userSnap.data().postCount || 0) : 0;
  await updateDoc(doc(db, 'users', userId), { postCount: Math.max(0, currentPosts - 1) });
};

export const isReposted = async (userId, originalPostId) => {
  if (!userId) return false;
  const existing = await getDocs(
    query(collection(db, 'posts'), where('authorId', '==', userId), where('repostOf', '==', originalPostId), where('type', '==', 'repost'), limit(1))
  );
  return !existing.empty;
};

export const createQuotePost = async (userId, originalPostId, { content, mediaUrls = [], hashtags = [] }) => {
  const postRef = await addDoc(collection(db, 'posts'), {
    authorId: userId,
    type: 'quote',
    quotedPostId: originalPostId,
    content: content.trim(),
    mediaUrls,
    hashtags,
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    saveCount: 0,
    viewCount: 0,
    status: 'published',
    rankScore: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await updateDoc(doc(db, 'posts', originalPostId), { shareCount: increment(1) });
  await updateDoc(doc(db, 'users', userId), { postCount: increment(1) });
  return postRef.id;
};

export const getPostWithAuthor = async (postId) => {
  const snap = await getDoc(doc(db, 'posts', postId));
  if (!snap.exists()) return null;
  const post = { id: snap.id, ...snap.data() };
  post.author = await getUser(post.authorId);
  return post;
};

// ═══════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════

export const getNotifications = async (uid, limitCount = 30) => {
  const q = query(collection(db, 'notifications'), where('recipientId', '==', uid), orderBy('createdAt', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const subscribeToNotifications = (uid, callback) => {
  const q = query(collection(db, 'notifications'), where('recipientId', '==', uid), orderBy('createdAt', 'desc'), limit(30));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

export const markNotificationRead = async (notifId) => {
  await updateDoc(doc(db, 'notifications', notifId), { read: true });
};

export const markAllNotificationsRead = async (uid) => {
  const q = query(collection(db, 'notifications'), where('recipientId', '==', uid), where('read', '==', false));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.update(d.ref, { read: true }));
  await batch.commit();
};

// ═══════════════════════════════════════════
// CONVERSATIONS / MESSAGES
// ═══════════════════════════════════════════

export const getConversations = async (uid) => {
  try {
    const q = query(
      collection(db, 'conversations'), 
      where('participants', 'array-contains', uid), 
      where('status', '==', 'active'),
      orderBy('lastMessageAt', 'desc')
    );
    const snap = await getDocs(q);
    const convos = [];
    for (const d of snap.docs) {
      const convo = { id: d.id, ...d.data() };
      const otherIds = convo.participants.filter(id => id !== uid);
      convo.otherUsers = await Promise.all(otherIds.map(id => getUser(id)));
      convos.push(convo);
    }
    return convos;
  } catch (error) {
    console.error("Error getting conversations:", error);
    return [];
  }
};

export const createConversation = async (currentUserId, targetUser, initialMessage = null) => {
  try {
    const participants = [currentUserId, targetUser.id].sort();
    const convoId = participants.join('_');
    const convoRef = doc(db, 'conversations', convoId);
    
    const snap = await getDoc(convoRef);
    if (snap.exists()) {
      if (snap.data().status !== 'active') {
        await updateDoc(convoRef, { status: 'active' });
      }
      return convoId;
    }

    await setDoc(convoRef, {
      participants,
      status: 'active',
      requestedBy: currentUserId,
      lastMessage: initialMessage || 'New conversation started',
      lastMessageAt: serverTimestamp(),
      lastSenderId: currentUserId,
      createdAt: serverTimestamp(),
      metadata: {
        [currentUserId]: { 
          name: auth.currentUser?.displayName || 'Vergr Member', 
          avatar: auth.currentUser?.photoURL || null 
        },
        [targetUser.id]: { 
          name: targetUser.displayName || targetUser.username, 
          avatar: targetUser.avatar || null 
        }
      },
      unreadCount: {
        [currentUserId]: 0,
        [targetUser.id]: initialMessage ? 1 : 0
      }
    });

    return convoId;
  } catch (error) {
    console.error("Error starting conversation:", error);
    throw error;
  }
};

export const sendMessage = async (convoId, senderId, content, type = 'text') => {
  try {
    const batch = writeBatch(db);
    const msgRef = doc(collection(db, 'conversations', convoId, 'messages'));
    
    batch.set(msgRef, { 
      senderId, 
      content, 
      type, 
      createdAt: serverTimestamp(),
      read: false
    });

    batch.update(doc(db, 'conversations', convoId), {
      lastMessage: type === 'text' ? content : `Sent a ${type}`,
      lastMessageAt: serverTimestamp(),
      lastSenderId: senderId,
      status: 'active'
    });

    await batch.commit();
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

export const subscribeToMessages = (convoId, callback) => {
  const q = query(
    collection(db, 'conversations', convoId, 'messages'), 
    orderBy('createdAt', 'asc'),
    limit(100)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

export const markAsRead = async (convoId, userId) => {
  try {
    const convoRef = doc(db, 'conversations', convoId);
    await updateDoc(convoRef, {
      [`unreadCount.${userId}`]: 0
    });
  } catch (error) {
    console.error("Error marking as read:", error);
  }
};

export const deleteConversation = async (convoId) => {
  try {
    await updateDoc(doc(db, 'conversations', convoId), {
      status: 'deleted',
      deletedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    throw error;
  }
};

export const acceptMessageRequest = async (convoId) => {
  try {
    await updateDoc(doc(db, 'conversations', convoId), {
      status: 'active',
      acceptedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error accepting message request:", error);
    throw error;
  }
};

export const getMessageRequests = async (uid) => {
  try {
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', uid),
      where('status', '==', 'pending')
    );
    const snap = await getDocs(q);
    const requests = [];
    for (const d of snap.docs) {
      const data = d.data();
      if (data.requestedBy !== uid) {
        const convo = { id: d.id, ...data };
        const otherId = data.participants.find(id => id !== uid);
        convo.otherUser = await getUser(otherId);
        requests.push(convo);
      }
    }
    return requests;
  } catch (error) {
    console.error("Error getting message requests:", error);
    return [];
  }
};

export const searchUsers = async (searchTerm, limitCount = 10) => {
  if (!searchTerm) return [];
  const q = query(
    collection(db, 'users'),
    where('username', '>=', searchTerm.toLowerCase()),
    where('username', '<=', searchTerm.toLowerCase() + '\uf8ff'),
    limit(10)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// ═══════════════════════════════════════════
// WALLET
// ═══════════════════════════════════════════

const DEFAULT_WALLET = { balance: 0, gems: 0, vp: 0, totalEarned: 0, totalSpent: 0, totalGemsEarned: 0 };

export const getWallet = async (uid) => {
  const snap = await getDoc(doc(db, 'wallets', uid));
  return snap.exists() ? { ...DEFAULT_WALLET, ...snap.data() } : DEFAULT_WALLET;
};

export const subscribeToWallet = (uid, callback) => {
  return onSnapshot(doc(db, 'wallets', uid), (snap) => {
    callback(snap.exists() ? { ...DEFAULT_WALLET, ...snap.data() } : DEFAULT_WALLET);
  });
};

export const getTransactions = async (uid, limitCount = 30) => {
  const q = query(collection(db, 'transactions'), where('userId', '==', uid), orderBy('createdAt', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// Award VP to a user (called from frontend for actions like posting, commenting, etc.)
export const awardVP = async (userId, amount, reason = '') => {
  if (!userId || amount <= 0) return;
  await updateDoc(doc(db, 'wallets', userId), {
    vp: increment(amount),
  }).catch(() => {});
};

// ═══════════════════════════════════════════
// SERVICE MARKETPLACE
// ═══════════════════════════════════════════

export const getService = async (serviceId) => {
  const snap = await getDoc(doc(db, 'services', serviceId));
  if (!snap.exists()) return null;
  const data = { id: snap.id, ...snap.data() };
  data.seller = await getUser(data.sellerId).catch(() => null);
  return data;
};

// Buyer purchases a service — coins go to escrow, not directly to seller
export const purchaseService = async (buyerId, serviceId) => {
  const serviceSnap = await getDoc(doc(db, 'services', serviceId));
  if (!serviceSnap.exists()) throw new Error('Service not found');
  const service = serviceSnap.data();
  if (service.sellerId === buyerId) throw new Error('Cannot buy your own service');

  const buyerWalletRef = doc(db, 'wallets', buyerId);

  return runTransaction(db, async (tx) => {
    const buyerWallet = await tx.get(buyerWalletRef);
    if (!buyerWallet.exists()) throw new Error('Wallet not found');
    if (buyerWallet.data().balance < service.priceCoins) throw new Error('Insufficient coins');

    // Deduct from buyer
    tx.update(buyerWalletRef, {
      balance: increment(-service.priceCoins),
      totalSpent: increment(service.priceCoins),
    });

    // Create order (coins held in escrow)
    const orderRef = doc(collection(db, 'service_orders'));
    tx.set(orderRef, {
      serviceId,
      buyerId,
      sellerId: service.sellerId,
      title: service.title,
      category: service.category,
      priceCoins: service.priceCoins,
      sellerCommission: service.sellerCommission || 0.30,
      deliveryDays: service.deliveryDays,
      status: 'in_progress', // in_progress → delivered → completed / disputed
      createdAt: serverTimestamp(),
      deadline: new Date(Date.now() + (service.deliveryDays || 3) * 86400000),
    });

    tx.set(doc(collection(db, 'transactions')), {
      userId: buyerId, type: 'service_payment', amount: -service.priceCoins,
      description: `Purchased: ${service.title}`, serviceId, createdAt: serverTimestamp(),
    });

    tx.set(doc(collection(db, 'notifications')), {
      recipientId: service.sellerId, type: 'system',
      title: 'New order!', body: `Someone purchased your service: ${service.title}`,
      read: false, data: { serviceId, type: 'service_order' }, createdAt: serverTimestamp(),
    });

    return orderRef.id;
  });
};

// Seller marks order as delivered
export const deliverServiceOrder = async (orderId, sellerId, deliveryMessage = '') => {
  const orderRef = doc(db, 'service_orders', orderId);
  const snap = await getDoc(orderRef);
  if (!snap.exists()) throw new Error('Order not found');
  const order = snap.data();
  if (order.sellerId !== sellerId) throw new Error('Not your order');
  if (order.status !== 'in_progress') throw new Error('Order not in progress');

  await updateDoc(orderRef, {
    status: 'delivered',
    deliveryMessage: deliveryMessage.substring(0, 2000),
    deliveredAt: serverTimestamp(),
  });

  await addDoc(collection(db, 'notifications'), {
    recipientId: order.buyerId, type: 'system',
    title: 'Order delivered!', body: `Your order "${order.title}" is ready for review.`,
    read: false, data: { orderId, type: 'service_delivered' }, createdAt: serverTimestamp(),
  });
};

// Buyer approves delivery → seller gets gems
export const approveServiceOrder = async (orderId, buyerId) => {
  const orderRef = doc(db, 'service_orders', orderId);

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists()) throw new Error('Order not found');
    const order = snap.data();
    if (order.buyerId !== buyerId) throw new Error('Not your order');
    if (order.status !== 'delivered') throw new Error('Order not delivered yet');

    const commission = order.sellerCommission || 0.30;
    const gemsEarned = Math.round(order.priceCoins * (1 - commission));

    // Pay seller in gems
    tx.update(doc(db, 'wallets', order.sellerId), {
      gems: increment(gemsEarned),
      totalGemsEarned: increment(gemsEarned),
      vp: increment(30), // VP for completing a service
    });

    tx.update(orderRef, { status: 'completed', completedAt: serverTimestamp() });

    // Update service stats
    tx.update(doc(db, 'services', order.serviceId), {
      completedCount: increment(1),
    });

    tx.set(doc(collection(db, 'transactions')), {
      userId: order.sellerId, type: 'service_earned', amount: gemsEarned, currency: 'gems',
      description: `Service completed: ${order.title} (${Math.round((1 - commission) * 100)}% rate)`,
      orderId, createdAt: serverTimestamp(),
    });

    tx.set(doc(collection(db, 'notifications')), {
      recipientId: order.sellerId, type: 'coins',
      title: `+${gemsEarned} gems earned!`,
      body: `Service approved: ${order.title}`,
      read: false, data: { amount: gemsEarned, type: 'service_earned' }, createdAt: serverTimestamp(),
    });
  });
};

// Buyer disputes — refund coins, no gems to seller
export const disputeServiceOrder = async (orderId, buyerId, reason = '') => {
  const orderRef = doc(db, 'service_orders', orderId);

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists()) throw new Error('Order not found');
    const order = snap.data();
    if (order.buyerId !== buyerId) throw new Error('Not your order');
    if (!['delivered', 'in_progress'].includes(order.status)) throw new Error('Cannot dispute');

    // Refund buyer
    tx.update(doc(db, 'wallets', order.buyerId), {
      balance: increment(order.priceCoins),
      totalSpent: increment(-order.priceCoins),
    });

    tx.update(orderRef, {
      status: 'disputed',
      disputeReason: reason.substring(0, 500),
      disputedAt: serverTimestamp(),
    });

    tx.set(doc(collection(db, 'transactions')), {
      userId: order.buyerId, type: 'service_refund', amount: order.priceCoins,
      description: `Refund: ${order.title}`, orderId, createdAt: serverTimestamp(),
    });

    tx.set(doc(collection(db, 'notifications')), {
      recipientId: order.sellerId, type: 'system',
      title: 'Order disputed', body: `Buyer disputed: ${order.title}`,
      read: false, data: { orderId, type: 'service_dispute' }, createdAt: serverTimestamp(),
    });
  });
};

// Get user's orders (as buyer or seller)
export const getServiceOrders = async (userId, role = 'buyer', limitCount = 20) => {
  const field = role === 'buyer' ? 'buyerId' : 'sellerId';
  const q = query(collection(db, 'service_orders'), where(field, '==', userId), orderBy('createdAt', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getCoinPackages = async () => {
  const q = query(collection(db, 'coin_packages'), where('active', '==', true), orderBy('sortOrder', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// ═══════════════════════════════════════════
// SQUADS
// ═══════════════════════════════════════════

export const getSquads = async (limitCount = 20) => {
  const q = query(collection(db, 'squads'), where('isPublic', '==', true), orderBy('memberCount', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getUserSquads = async (uid) => {
  const q = query(collection(db, 'squads'), where('memberIds', 'array-contains', uid));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const createSquad = async (ownerId, { name, description, game, isPublic, avatar }) => {
  const squadRef = await addDoc(collection(db, 'squads'), {
    name,
    description: description || '',
    game,
    isPublic: isPublic !== false,
    avatar: avatar || null,
    memberCount: 1,
    memberIds: [ownerId],
    ownerId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await setDoc(doc(db, 'squads', squadRef.id, 'members', ownerId), {
    userId: ownerId,
    role: 'president',
    joinedAt: serverTimestamp(),
  });
  return squadRef.id;
};

export const getSquadChat = async (squadId, limitCount = 50) => {
  const q = query(collection(db, 'squads', squadId, 'chat'), orderBy('createdAt', 'asc'), limit(limitCount));
  const snap = await getDocs(q);
  const messages = [];
  for (const d of snap.docs) {
    const msg = { id: d.id, ...d.data() };
    msg.author = await getUser(msg.authorId);
    messages.push(msg);
  }
  return messages;
};

export const sendSquadMessage = async (squadId, authorId, content, type = 'text', extra = {}) => {
  await addDoc(collection(db, 'squads', squadId, 'chat'), {
    authorId,
    content,
    type,
    ...extra,
    createdAt: serverTimestamp(),
  });
};

// ═══════════════════════════════════════════
// SQUAD GOVERNANCE & DEMOCRATIC SYSTEM
// ═══════════════════════════════════════════

export const getSquadMembers = async (squadId) => {
  const snap = await getDocs(collection(db, 'squads', squadId, 'members'));
  const members = [];
  for (const d of snap.docs) {
    const member = { id: d.id, ...d.data() };
    member.user = await getUser(d.id);
    members.push(member);
  }
  return members.sort((a, b) => {
    const roleOrder = { president: 0, vice_president: 1, treasury: 2, security: 3, member: 4 };
    return (roleOrder[a.role] || 4) - (roleOrder[b.role] || 4);
  });
};

export const getSquadMember = async (squadId, userId) => {
  const snap = await getDoc(doc(db, 'squads', squadId, 'members', userId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const joinSquad = async (squadId, userId) => {
  const squadRef = doc(db, 'squads', squadId);
  const memberRef = doc(db, 'squads', squadId, 'members', userId);

  await runTransaction(db, async (transaction) => {
    const squadSnap = await transaction.get(squadRef);
    if (!squadSnap.exists()) throw new Error('Squad not found');

    const data = squadSnap.data();
    if (data.memberIds?.includes(userId)) throw new Error('Already a member');

    transaction.update(squadRef, {
      memberIds: arrayUnion(userId),
      memberCount: increment(1),
      updatedAt: serverTimestamp(),
    });

    transaction.set(memberRef, {
      userId,
      role: 'member',
      totalContributed: 0,
      joinedAt: serverTimestamp(),
    });
  });
};

export const leaveSquad = async (squadId, userId) => {
  const memberRef = doc(db, 'squads', squadId, 'members', userId);
  const memberSnap = await getDoc(memberRef);
  if (memberSnap.data()?.role === 'president') throw new Error('President cannot leave without transferring leadership');

  const squadRef = doc(db, 'squads', squadId);
  const batch = writeBatch(db);
  batch.delete(memberRef);
  batch.update(squadRef, {
    memberIds: arrayRemove(userId),
    memberCount: increment(-1),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
};

export const updateMemberRole = async (squadId, userId, newRole) => {
  await updateDoc(doc(db, 'squads', squadId, 'members', userId), {
    role: newRole,
    updatedAt: serverTimestamp(),
  });
};

export const muteSquadMember = async (squadId, userId, durationMs, reason = '') => {
  const muteUntil = new Date(Date.now() + durationMs);
  await updateDoc(doc(db, 'squads', squadId, 'members', userId), {
    mutedUntil: muteUntil,
    muteReason: reason,
    updatedAt: serverTimestamp(),
  });
};

export const unmuteSquadMember = async (squadId, userId) => {
  await updateDoc(doc(db, 'squads', squadId, 'members', userId), {
    mutedUntil: null,
    muteReason: null,
    updatedAt: serverTimestamp(),
  });
};

export const getSquadWallet = async (squadId) => {
  const snap = await getDoc(doc(db, 'squads', squadId, 'wallet', 'main'));
  return snap.exists() ? snap.data() : { balance: 0, totalContributed: 0, totalWon: 0 };
};

export const contributeToSquad = async (squadId, userId, amount) => {
  const userWalletRef = doc(db, 'wallets', userId);
  const squadWalletRef = doc(db, 'squads', squadId, 'wallet', 'main');
  const memberRef = doc(db, 'squads', squadId, 'members', userId);

  await runTransaction(db, async (transaction) => {
    const userWallet = await transaction.get(userWalletRef);
    if (!userWallet.exists() || userWallet.data().balance < amount) {
      throw new Error('Insufficient balance');
    }

    transaction.update(userWalletRef, {
      balance: increment(-amount),
      totalSpent: increment(amount),
      updatedAt: serverTimestamp(),
    });

    transaction.set(squadWalletRef, {
      balance: increment(amount),
      totalContributed: increment(amount),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    transaction.update(memberRef, {
      totalContributed: increment(amount),
      updatedAt: serverTimestamp(),
    });

    const userTxRef = doc(collection(db, 'transactions'));
    transaction.set(userTxRef, {
      userId,
      type: 'squad_contribution',
      amount: -amount,
      desc: `Squad contribution`,
      squadId,
      createdAt: serverTimestamp(),
    });

    const squadTxRef = doc(collection(db, 'squads', squadId, 'transactions'));
    transaction.set(squadTxRef, {
      userId,
      type: 'contribution',
      amount,
      createdAt: serverTimestamp(),
    });
  });
};

export const getSquadTransactions = async (squadId, limitCount = 30) => {
  const q = query(collection(db, 'squads', squadId, 'transactions'), orderBy('createdAt', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// Updated createSquadVote with reason parameter
export const createSquadVote = async (squadId, creatorId, { title, type, options, targetUserId, targetRole, duration = 48, reason = '' }) => {
  const voteRef = await addDoc(collection(db, 'squads', squadId, 'votes'), {
    title,
    type, 
    options: options || ['Yes', 'No'],
    targetUserId: targetUserId || null,
    targetRole: targetRole || null,
    reason: reason || '',               // <-- store the reason
    createdBy: creatorId,
    voteCounts: {},
    voterIds: [],
    totalVotes: 0,
    status: 'active',
    expiresAt: new Date(Date.now() + duration * 3600000),
    createdAt: serverTimestamp(),
  });
  return voteRef.id;
};

export const castSquadVote = async (squadId, voteId, userId, optionIndex) => {
  const voteRef = doc(db, 'squads', squadId, 'votes', voteId);

  await runTransaction(db, async (transaction) => {
    const voteSnap = await transaction.get(voteRef);
    if (!voteSnap.exists()) throw new Error('Vote not found');
    const data = voteSnap.data();
    if (data.status !== 'active') throw new Error('Vote is closed');
    if (data.voterIds?.includes(userId)) throw new Error('Already voted');
    if (new Date() > data.expiresAt?.toDate()) throw new Error('Vote expired');

    transaction.update(voteRef, {
      [`voteCounts.${optionIndex}`]: increment(1),
      voterIds: arrayUnion(userId),
      totalVotes: increment(1),
    });
  });
};

export const getActiveSquadVotes = async (squadId) => {
  const q = query(
    collection(db, 'squads', squadId, 'votes'),
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getSquadLeaderboard = async (squadId) => {
  const members = await getSquadMembers(squadId);
  return members.sort((a, b) => (b.totalContributed || 0) - (a.totalContributed || 0));
};

export const submitJoinRequest = async (squadId, userId, message = '') => {
  await addDoc(collection(db, 'squads', squadId, 'join_requests'), {
    userId,
    message,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
};

export const handleJoinRequest = async (squadId, requestId, userId, approved) => {
  const requestRef = doc(db, 'squads', squadId, 'join_requests', requestId);
  await updateDoc(requestRef, {
    status: approved ? 'approved' : 'denied',
    reviewedAt: serverTimestamp(),
  });

  if (approved) {
    await joinSquad(squadId, userId);
  }
};

export const getSquadJoinRequests = async (squadId) => {
  const q = query(
    collection(db, 'squads', squadId, 'join_requests'),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  const requests = [];
  for (const d of snap.docs) {
    const req = { id: d.id, ...d.data() };
    req.user = await getUser(req.userId);
    requests.push(req);
  }
  return requests;
};

export const getSquadAnnouncements = async (squadId, limitCount = 20) => {
  const q = query(collection(db, 'squads', squadId, 'announcements'), orderBy('createdAt', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const createSquadAnnouncement = async (squadId, authorId, content, pinned = false) => {
  await addDoc(collection(db, 'squads', squadId, 'announcements'), {
    authorId,
    content,
    pinned,
    createdAt: serverTimestamp(),
  });
};

// Added: function to set squad chat background
export const setSquadChatBackground = async (squadId, type, value) => {
  await updateDoc(doc(db, 'squads', squadId), {
    chatBackground: type,
    chatBackgroundValue: value
  });
};

// ═══════════════════════════════════════════
// WALLET OPERATIONS
// ═══════════════════════════════════════════

// Tip/send coins → recipient receives GEMS (not coins)
// Sender pays X coins. Platform takes commission. Recipient gets gems.
export const sendCoins = async (fromUid, toUid, amount, desc = '') => {
  const fromWalletRef = doc(db, 'wallets', fromUid);
  const toWalletRef = doc(db, 'wallets', toUid);

  await runTransaction(db, async (transaction) => {
    const fromSnap = await transaction.get(fromWalletRef);
    const toSnap = await transaction.get(toWalletRef);
    if (!fromSnap.exists()) throw new Error('Wallet not found');
    if (fromSnap.data().balance < amount) throw new Error('Insufficient balance');

    // Calculate gems based on recipient's VP level
    const recipientVP = toSnap.exists() ? (toSnap.data().vp || 0) : 0;
    // Import dynamically would be complex in firestore.js — inline the commission lookup
    const commissionRates = [0.30, 0.28, 0.25, 0.22, 0.20, 0.18, 0.15];
    const vpThresholds = [0, 500, 2000, 5000, 15000, 40000, 100000];
    let commission = 0.30;
    for (let i = vpThresholds.length - 1; i >= 0; i--) {
      if (recipientVP >= vpThresholds[i]) { commission = commissionRates[i]; break; }
    }
    const gemsEarned = Math.round(amount * (1 - commission));

    // Deduct coins from sender
    transaction.update(fromWalletRef, {
      balance: increment(-amount),
      totalSpent: increment(amount),
      totalTipped: increment(amount),
      updatedAt: serverTimestamp(),
    });

    // Give gems to recipient
    transaction.update(toWalletRef, {
      gems: increment(gemsEarned),
      totalGemsEarned: increment(gemsEarned),
      vp: increment(5), // bonus VP for receiving a tip
      updatedAt: serverTimestamp(),
    });

    transaction.set(doc(collection(db, 'transactions')), {
      userId: fromUid, recipientId: toUid, type: 'tip_sent',
      amount: -amount, description: desc || 'Sent tip', createdAt: serverTimestamp(),
    });
    transaction.set(doc(collection(db, 'transactions')), {
      userId: toUid, senderId: fromUid, type: 'tip_received',
      amount: gemsEarned, currency: 'gems',
      description: `Received ${gemsEarned} gems from tip (${Math.round((1 - commission) * 100)}% rate)`,
      createdAt: serverTimestamp(),
    });
    transaction.set(doc(collection(db, 'notifications')), {
      recipientId: toUid, type: 'coins',
      title: `+${gemsEarned} gems received!`,
      body: desc || 'Someone tipped you',
      read: false, data: { amount: gemsEarned, type: 'tip_received' }, createdAt: serverTimestamp(),
    });
  });
};

export const claimQuestReward = async (uid, questId, rewardAmount, questTitle) => {
  const walletRef = doc(db, 'wallets', uid);
  const questClaimRef = doc(db, 'quest_claims', `${uid}_${questId}_${new Date().toISOString().split('T')[0]}`);

  await runTransaction(db, async (transaction) => {
    const claimSnap = await transaction.get(questClaimRef);
    if (claimSnap.exists()) throw new Error('Quest already claimed today');

    transaction.update(walletRef, {
      balance: increment(rewardAmount),
      totalEarned: increment(rewardAmount),
      updatedAt: serverTimestamp(),
    });

    transaction.set(questClaimRef, {
      userId: uid,
      questId,
      amount: rewardAmount,
      claimedAt: serverTimestamp(),
    });

    const txRef = doc(collection(db, 'transactions'));
    transaction.set(txRef, {
      userId: uid,
      type: 'quest_reward',
      amount: rewardAmount,
      desc: questTitle || 'Quest reward',
      createdAt: serverTimestamp(),
    });
  });
};

export const requestPayout = async (uid, amount, method, details) => {
  const COIN_TO_EUR = 0.01;
  const PLATFORM_FEE_PCT = 0.10;
  const PROCESSOR_FEE_PCT = 0.03;
  const MIN_PAYOUT = 1000;

  if (amount < MIN_PAYOUT) throw new Error(`Minimum payout is ${MIN_PAYOUT} coins`);

  const eurTotal = amount * COIN_TO_EUR;
  const platformFee = parseFloat((eurTotal * PLATFORM_FEE_PCT).toFixed(2));
  const processorFee = parseFloat((eurTotal * PROCESSOR_FEE_PCT).toFixed(2));
  const userReceives = parseFloat((eurTotal - platformFee - processorFee).toFixed(2));

  const walletRef = doc(db, 'wallets', uid);

  await runTransaction(db, async (transaction) => {
    const walletSnap = await transaction.get(walletRef);
    if (!walletSnap.exists()) throw new Error('Wallet not found');
    if (walletSnap.data().balance < amount) throw new Error('Insufficient balance');

    transaction.update(walletRef, {
      balance: increment(-amount),
      totalSpent: increment(amount),
      updatedAt: serverTimestamp(),
    });

    const payoutRef = doc(collection(db, 'payouts'));
    transaction.set(payoutRef, {
      userId: uid,
      coinAmount: amount,
      eurTotal,
      platformFee,
      processorFee,
      userReceives,
      method,
      details,
      status: 'pending',
      createdAt: serverTimestamp(),
    });

    const txRef = doc(collection(db, 'transactions'));
    transaction.set(txRef, {
      userId: uid,
      type: 'payout',
      amount: -amount,
      description: `Cash out €${userReceives} via ${method}`,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
  });
};

// ═══════════════════════════════════════════
// USER SETTINGS
// ═══════════════════════════════════════════

export const updateUserSettings = async (uid, settings) => {
  await updateDoc(doc(db, 'users', uid), {
    settings: settings,
    updatedAt: serverTimestamp(),
  });
};

export const updateLinkedAccount = async (uid, platform, accountInfo) => {
  await updateDoc(doc(db, 'users', uid), {
    [`linkedAccounts.${platform}`]: accountInfo,
    updatedAt: serverTimestamp(),
  });
};

export const removeLinkedAccount = async (uid, platform) => {
  await updateDoc(doc(db, 'users', uid), {
    [`linkedAccounts.${platform}`]: null,
    updatedAt: serverTimestamp(),
  });
};

export const blockUser = async (uid, blockedUid) => {
  await setDoc(doc(db, 'users', uid, 'blocked', blockedUid), {
    blockedAt: serverTimestamp(),
  });
};

export const unblockUser = async (uid, blockedUid) => {
  await deleteDoc(doc(db, 'users', uid, 'blocked', blockedUid));
};

export const getBlockedUsers = async (uid) => {
  const snap = await getDocs(collection(db, 'users', uid, 'blocked'));
  const users = [];
  for (const d of snap.docs) {
    const user = await getUser(d.id);
    if (user) users.push(user);
  }
  return users;
};

export const getQuestClaims = async (uid) => {
  const today = new Date().toISOString().split('T')[0];
  const q = query(
    collection(db, 'quest_claims'),
    where('userId', '==', uid),
    where('claimedAt', '>=', new Date(today))
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data().questId);
};

// ═══════════════════════════════════════════
// STREAMS
// ═══════════════════════════════════════════

export const getLiveStreams = async (limitCount = 20) => {
  const q = query(collection(db, 'streams'), where('isLive', '==', true), orderBy('viewerCount', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  const streams = [];
  for (const d of snap.docs) {
    const stream = { id: d.id, ...d.data() };
    stream.streamer = await getUser(stream.streamerId);
    streams.push(stream);
  }
  return streams;
};

export const createStream = async (streamerId, { title, game, platforms }) => {
  const ref = await addDoc(collection(db, 'streams'), {
    streamerId,
    title,
    game,
    platforms: platforms || ['vergr'],
    isLive: true,
    viewerCount: 0,
    chatEnabled: true,
    tipsEnabled: true,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

// ═══════════════════════════════════════════
// TOURNAMENTS
// ═══════════════════════════════════════════

export const getTournaments = async (status = null, limitCount = 20) => {
  let q;
  if (status && status !== 'All') {
    q = query(collection(db, 'tournaments'), where('status', '==', status.toLowerCase()), orderBy('startDate', 'asc'), limit(limitCount));
  } else {
    q = query(collection(db, 'tournaments'), orderBy('startDate', 'desc'), limit(limitCount));
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const createTournament = async (adminId, squadId, { name, game, entryFee, maxParticipants, type }) => {
  const tournamentRef = await addDoc(collection(db, 'tournaments'), {
    adminId, squadId, name, game, entryFee, maxParticipants, type,
    status: 'open', prizePool: 0, participants: [],
    createdAt: serverTimestamp(),
  });
  return tournamentRef.id;
};

export const submitRoundResult = async (matchId, currentRound, winnerId, loserId) => {
  const roundRef = doc(db, 'tournaments', matchId, 'rounds', `round_${currentRound}`);
  await setDoc(roundRef, {
    winnerId,
    loserId,
    completedAt: serverTimestamp()
  }, { merge: true });
};

export const finalizeTournament = async (matchId, winnerId, teamId, squadId, prizePool, xpAmount) => {
  const tournamentRef = doc(db, 'tournaments', matchId);
  const transactionRef = doc(collection(db, 'transactions'));

  await runTransaction(db, async (transaction) => {
    transaction.update(tournamentRef, { 
      status: 'completed',
      winnerId: winnerId,
      finalizedAt: serverTimestamp() 
    });

    transaction.set(transactionRef, {
      userId: winnerId,
      type: 'escrow',
      amount: prizePool || 0,
      desc: `Tournament Win: ${matchId}`,
      status: 'pending',
      createdAt: serverTimestamp(),
      unlockAt: new Date(Date.now() + 24 * 60 * 60 * 1000) 
    });
  });
  
  await distributeWinRewards(winnerId, teamId, squadId, xpAmount);
};

// ═══════════════════════════════════════════
// MODERATOR
// ═══════════════════════════════════════════

export const recordModeratorPayout = async (moderatorId, amount, tournamentId) => {
  const transactionRef = doc(collection(db, 'transactions'));
  await setDoc(transactionRef, {
    userId: moderatorId,
    type: 'mod_payout', 
    amount: amount,
    tournamentId: tournamentId,
    status: 'completed',
    createdAt: serverTimestamp(),
  });
};

// ═══════════════════════════════════════════
// TOURNAMENT PARTICIPATION & PRIZES
// ═══════════════════════════════════════════

export const getTournament = async (tournamentId) => {
  const snap = await getDoc(doc(db, 'tournaments', tournamentId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const joinTournament = async (tournamentId, userId) => {
  const tournamentRef = doc(db, 'tournaments', tournamentId);
  const walletRef = doc(db, 'wallets', userId);

  await runTransaction(db, async (transaction) => {
    const tournamentSnap = await transaction.get(tournamentRef);
    if (!tournamentSnap.exists()) throw new Error('Tournament not found');
    const t = tournamentSnap.data();

    if (t.status !== 'open') throw new Error('Tournament is not open for registration');
    if (t.participants?.includes(userId)) throw new Error('Already registered');
    if (t.participants?.length >= t.maxParticipants) throw new Error('Tournament is full');

    // Collect entry fee
    if (t.entryFee > 0) {
      const walletSnap = await transaction.get(walletRef);
      if (!walletSnap.exists()) throw new Error('Wallet not found');
      if (walletSnap.data().balance < t.entryFee) throw new Error('Insufficient coins for entry fee');

      transaction.update(walletRef, {
        balance: increment(-t.entryFee),
        totalSpent: increment(t.entryFee),
        updatedAt: serverTimestamp(),
      });

      // Record transaction
      const txRef = doc(collection(db, 'transactions'));
      transaction.set(txRef, {
        userId,
        type: 'tournament_entry',
        amount: -t.entryFee,
        description: `Entry fee: ${t.name}`,
        tournamentId,
        createdAt: serverTimestamp(),
      });
    }

    // Add to participants and prize pool
    transaction.update(tournamentRef, {
      participants: arrayUnion(userId),
      prizePool: increment(t.entryFee || 0),
      updatedAt: serverTimestamp(),
    });

    // Notify admin
    if (t.adminId && t.adminId !== userId) {
      transaction.set(doc(collection(db, 'notifications')), {
        recipientId: t.adminId, type: 'tournament',
        title: 'Player joined', body: `Someone joined ${t.name}`,
        read: false, data: { tournamentId }, createdAt: serverTimestamp(),
      });
    }
  });
};

export const leaveTournament = async (tournamentId, userId) => {
  const tournamentRef = doc(db, 'tournaments', tournamentId);
  const walletRef = doc(db, 'wallets', userId);

  await runTransaction(db, async (transaction) => {
    const tournamentSnap = await transaction.get(tournamentRef);
    if (!tournamentSnap.exists()) throw new Error('Tournament not found');
    const t = tournamentSnap.data();

    if (t.status !== 'open') throw new Error('Cannot leave after tournament starts');
    if (!t.participants?.includes(userId)) throw new Error('Not registered');

    // Refund entry fee
    if (t.entryFee > 0) {
      transaction.update(walletRef, {
        balance: increment(t.entryFee),
        totalSpent: increment(-t.entryFee),
        updatedAt: serverTimestamp(),
      });

      const txRef = doc(collection(db, 'transactions'));
      transaction.set(txRef, {
        userId,
        type: 'tournament_refund',
        amount: t.entryFee,
        description: `Refund: ${t.name}`,
        tournamentId,
        createdAt: serverTimestamp(),
      });
    }

    transaction.update(tournamentRef, {
      participants: arrayRemove(userId),
      prizePool: increment(-(t.entryFee || 0)),
      updatedAt: serverTimestamp(),
    });
  });
};

export const startTournament = async (tournamentId, adminId) => {
  const tournamentRef = doc(db, 'tournaments', tournamentId);
  const snap = await getDoc(tournamentRef);
  if (!snap.exists()) throw new Error('Tournament not found');
  const t = snap.data();
  if (t.adminId !== adminId) throw new Error('Only the admin can start this tournament');
  if (t.status !== 'open') throw new Error('Tournament already started');
  if ((t.participants?.length || 0) < 2) throw new Error('Need at least 2 participants');

  // Generate bracket — simple single elimination
  const participants = [...t.participants];
  // Shuffle
  for (let i = participants.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [participants[i], participants[j]] = [participants[j], participants[i]];
  }

  // Create round 1 matches
  const matches = [];
  for (let i = 0; i < participants.length; i += 2) {
    const match = {
      player1: participants[i],
      player2: participants[i + 1] || null, // bye if odd
      winner: participants[i + 1] ? null : participants[i], // auto-win on bye
      round: 1,
      matchNumber: Math.floor(i / 2) + 1,
      status: participants[i + 1] ? 'pending' : 'completed',
    };
    matches.push(match);
  }

  const batch = writeBatch(db);
  matches.forEach((match, idx) => {
    const matchRef = doc(db, 'tournaments', tournamentId, 'matches', `r1_m${idx + 1}`);
    batch.set(matchRef, { ...match, createdAt: serverTimestamp() });
  });

  batch.update(tournamentRef, {
    status: 'active',
    bracket: { totalRounds: Math.ceil(Math.log2(participants.length)), currentRound: 1 },
    startedAt: serverTimestamp(),
  });

  // Notify all participants
  for (const pid of participants) {
    batch.set(doc(collection(db, 'notifications')), {
      recipientId: pid, type: 'tournament',
      title: 'Tournament started!', body: `${t.name} has begun. Check your bracket.`,
      read: false, data: { tournamentId }, createdAt: serverTimestamp(),
    });
  }

  await batch.commit();
  return matches;
};

export const getTournamentMatches = async (tournamentId, round = null) => {
  let q;
  if (round) {
    q = query(collection(db, 'tournaments', tournamentId, 'matches'), where('round', '==', round), orderBy('matchNumber'));
  } else {
    q = query(collection(db, 'tournaments', tournamentId, 'matches'), orderBy('round'), orderBy('matchNumber'));
  }
  const snap = await getDocs(q);
  const matches = [];
  for (const d of snap.docs) {
    const match = { id: d.id, ...d.data() };
    if (match.player1) match.player1Data = await getUser(match.player1);
    if (match.player2) match.player2Data = await getUser(match.player2);
    matches.push(match);
  }
  return matches;
};

export const reportMatchResult = async (tournamentId, matchId, winnerId) => {
  const matchRef = doc(db, 'tournaments', tournamentId, 'matches', matchId);
  const matchSnap = await getDoc(matchRef);
  if (!matchSnap.exists()) throw new Error('Match not found');
  const match = matchSnap.data();

  if (match.status === 'completed') throw new Error('Match already completed');
  if (match.player1 !== winnerId && match.player2 !== winnerId) throw new Error('Winner must be a participant');

  const loserId = match.player1 === winnerId ? match.player2 : match.player1;

  await updateDoc(matchRef, {
    winner: winnerId,
    loser: loserId,
    status: 'completed',
    completedAt: serverTimestamp(),
  });

  // Notify players
  const tSnap = await getDoc(doc(db, 'tournaments', tournamentId));
  const tName = tSnap.exists() ? tSnap.data().name : 'Tournament';

  await addDoc(collection(db, 'notifications'), {
    recipientId: winnerId, type: 'tournament',
    title: 'Match won!', body: `You advanced in ${tName}`,
    read: false, data: { tournamentId }, createdAt: serverTimestamp(),
  }).catch(() => {});
  if (loserId) {
    await addDoc(collection(db, 'notifications'), {
      recipientId: loserId, type: 'tournament',
      title: 'Match result', body: `You were eliminated from ${tName}`,
      read: false, data: { tournamentId }, createdAt: serverTimestamp(),
    }).catch(() => {});
  }

  // Auto-advance: check if all matches in this round are done
  await advanceBracket(tournamentId, match.round);
};

// Auto-advance bracket — generates next round when current round is complete
const advanceBracket = async (tournamentId, completedRound) => {
  const tournamentRef = doc(db, 'tournaments', tournamentId);
  const tSnap = await getDoc(tournamentRef);
  if (!tSnap.exists()) return;
  const t = tSnap.data();

  // Get all matches in this round
  const matchesSnap = await getDocs(
    query(collection(db, 'tournaments', tournamentId, 'matches'), where('round', '==', completedRound))
  );
  const roundMatches = matchesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Check if all matches are completed
  const pending = roundMatches.filter(m => m.status !== 'completed');
  if (pending.length > 0) return; // Not all done yet

  // Collect winners
  const winners = roundMatches.map(m => m.winner).filter(Boolean);

  // If only 1 winner left, tournament is over
  if (winners.length === 1) {
    const allMatches = await getDocs(collection(db, 'tournaments', tournamentId, 'matches'));
    const allDocs = allMatches.docs.map(d => d.data());

    // Find 2nd place (loser of final match)
    const finalMatch = roundMatches[0];
    const secondPlace = finalMatch?.loser;

    // Find 3rd/4th (losers of semi-final round)
    const semiRound = completedRound - 1;
    const semiLosers = allDocs.filter(m => m.round === semiRound).map(m => m.loser).filter(Boolean);

    await updateDoc(tournamentRef, {
      status: 'completed',
      winnerId: winners[0],
      placements: { first: winners[0], second: secondPlace || null, third: semiLosers },
      completedAt: serverTimestamp(),
      'bracket.currentRound': completedRound,
    });

    // Notify winner
    await addDoc(collection(db, 'notifications'), {
      recipientId: winners[0], type: 'tournament',
      title: 'Tournament won!', body: `You won ${t.name}!`,
      read: false, data: { tournamentId }, createdAt: serverTimestamp(),
    }).catch(() => {});
    return;
  }

  // Generate next round matches
  const nextRound = completedRound + 1;
  const batch = writeBatch(db);

  for (let i = 0; i < winners.length; i += 2) {
    const p1 = winners[i];
    const p2 = winners[i + 1] || null;
    const matchNum = Math.floor(i / 2) + 1;
    const matchRef = doc(db, 'tournaments', tournamentId, 'matches', `r${nextRound}_m${matchNum}`);
    batch.set(matchRef, {
      player1: p1,
      player2: p2,
      winner: p2 ? null : p1, // auto-win on bye
      round: nextRound,
      matchNumber: matchNum,
      status: p2 ? 'pending' : 'completed',
      createdAt: serverTimestamp(),
    });
  }

  batch.update(tournamentRef, { 'bracket.currentRound': nextRound });
  await batch.commit();
};

// Prize distribution: coins → gems conversion
// Entry fees paid in coins. Winners receive gems. Platform keeps commission.
// Commission based on each winner's VP level (30% Rookie → 15% Mythic)
export const distributePrizePool = async (tournamentId) => {
  const tournamentRef = doc(db, 'tournaments', tournamentId);
  const snap = await getDoc(tournamentRef);
  if (!snap.exists()) throw new Error('Tournament not found');
  const t = snap.data();
  if (!t.prizePool || t.prizePool <= 0) return;

  // Commission lookup
  const getCommission = (vp) => {
    const rates = [[100000, 0.15], [40000, 0.18], [15000, 0.20], [5000, 0.22], [2000, 0.25], [500, 0.28], [0, 0.30]];
    for (const [threshold, rate] of rates) { if (vp >= threshold) return rate; }
    return 0.30;
  };

  // Split pool: 60/25/7.5/7.5 — mod gets 5% off top
  const modFee = Math.floor(t.prizePool * 0.05);
  const playerPool = t.prizePool - modFee;
  const splits = { first: Math.floor(playerPool * 0.60), second: Math.floor(playerPool * 0.25), third: Math.floor(playerPool * 0.075) };

  const placements = t.placements || {};
  const batch = writeBatch(db);
  const squadId = t.squadId || null;

  const awardPrize = async (userId, coinAllocation, placement) => {
    if (!userId || coinAllocation <= 0) return;

    // Get winner's VP for commission rate
    const walletSnap = await getDoc(doc(db, 'wallets', userId));
    const vp = walletSnap.exists() ? (walletSnap.data().vp || 0) : 0;
    const commission = getCommission(vp);
    const gemsEarned = Math.round(coinAllocation * (1 - commission));

    // Squad contribution: 10% of gems
    let squadCut = 0;
    let netGems = gemsEarned;
    if (squadId) {
      squadCut = Math.floor(gemsEarned * 0.10);
      netGems = gemsEarned - squadCut;
    }

    batch.update(doc(db, 'wallets', userId), {
      gems: increment(netGems),
      totalGemsEarned: increment(netGems),
      vp: increment(placement === '1st' ? 200 : placement === '2nd' ? 100 : 50),
    });
    batch.set(doc(collection(db, 'transactions')), {
      userId, type: 'tournament_prize', amount: netGems, currency: 'gems',
      description: `${placement} place: ${t.name} (${Math.round((1 - commission) * 100)}% rate)${squadCut > 0 ? ` · ${squadCut} to squad` : ''}`,
      tournamentId, createdAt: serverTimestamp(),
    });
    batch.set(doc(collection(db, 'notifications')), {
      recipientId: userId, type: 'coins',
      title: `+${netGems} gems — ${placement} place!`,
      body: `Prize from ${t.name}`,
      read: false, data: { amount: netGems, tournamentId, type: 'tournament_prize' },
      createdAt: serverTimestamp(),
    });

    if (squadId && squadCut > 0) {
      batch.update(doc(db, 'squads', squadId), {
        'wallet.balance': increment(squadCut),
        'wallet.totalReceived': increment(squadCut),
      });
    }
  };

  await awardPrize(placements.first, splits.first, '1st');
  await awardPrize(placements.second, splits.second, '2nd');
  if (Array.isArray(placements.third)) {
    for (const uid of placements.third) await awardPrize(uid, splits.third, '3rd');
  }

  // Mod fee → gems for the mod
  if (t.adminId && modFee > 0) {
    const modWallet = await getDoc(doc(db, 'wallets', t.adminId));
    const modVP = modWallet.exists() ? (modWallet.data().vp || 0) : 0;
    const modCommission = getCommission(modVP);
    const modGems = Math.round(modFee * (1 - modCommission));

    batch.update(doc(db, 'wallets', t.adminId), {
      gems: increment(modGems),
      totalGemsEarned: increment(modGems),
      vp: increment(30),
    });
    batch.set(doc(collection(db, 'transactions')), {
      userId: t.adminId, type: 'mod_payout', amount: modGems, currency: 'gems',
      description: `Moderator fee: ${t.name}`, tournamentId, createdAt: serverTimestamp(),
    });
    batch.set(doc(collection(db, 'notifications')), {
      recipientId: t.adminId, type: 'coins',
      title: `+${modGems} gems — moderator fee`,
      body: `For running ${t.name}`, read: false, data: { amount: modGems, type: 'mod_payout' }, createdAt: serverTimestamp(),
    });
  }

  batch.update(tournamentRef, {
    status: 'completed', prizeDistributed: true, modFee, finalizedAt: serverTimestamp(),
  });

  await batch.commit();
};

// ═══════════════════════════════════════════
// LEADERBOARDS
// ═══════════════════════════════════════════

export const getLeaderboard = async (boardId = 'players', limitCount = 50) => {
  const boardDoc = await getDoc(doc(db, 'leaderboards', boardId));
  if (!boardDoc.exists()) return [];
  const q = query(collection(db, 'leaderboards', boardId, 'entries'), orderBy('score', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  const entries = [];
  for (const d of snap.docs) {
    const entry = { id: d.id, ...d.data() };
    entry.user = await getUser(entry.userId || entry.id);
    entries.push(entry);
  }
  return entries;
};

// ═══════════════════════════════════════════
// FILE UPLOADS
// ═══════════════════════════════════════════

export const uploadFile = async (path, file) => {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};

export const uploadAvatar = async (uid, file) => {
  return uploadFile(`users/${uid}/avatar/${file.name}`, file);
};

export const uploadBanner = async (uid, file) => {
  return uploadFile(`users/${uid}/banner/${file.name}`, file);
};

export const uploadPostMedia = async (postId, file) => {
  return uploadFile(`posts/${postId}/${file.name}`, file);
};

// ═══════════════════════════════════════════
// APP CONFIG
// ═══════════════════════════════════════════

export const getAppConfig = async () => {
  const snap = await getDoc(doc(db, 'app_config', 'general'));
  return snap.exists() ? snap.data() : {};
};

// ═══════════════════════════════════════════
// POLLS
// ═══════════════════════════════════════════

export const createPoll = async (uid, pollData) => {
  const pollRef = await addDoc(collection(db, 'polls'), {
    ...pollData,
    createdBy: uid,
    createdAt: serverTimestamp(),
    votes: {}, 
    totalVotes: 0,
    status: 'active'
  });
  return pollRef.id;
};

export const voteOnPoll = async (pollId, optionIndex, uid) => {
  const pollRef = doc(db, 'polls', pollId);
  const userVoteRef = doc(db, 'polls', pollId, 'votes', uid);

  await runTransaction(db, async (transaction) => {
    const pollDoc = await transaction.get(pollRef);
    if (!pollDoc.exists()) throw "Poll does not exist!";

    transaction.update(pollRef, {
      totalVotes: increment(1),
      [`votes.${optionIndex}`]: increment(1)
    });

    transaction.set(userVoteRef, { 
      optionIndex, 
      votedAt: serverTimestamp() 
    });
  });
};

export const createRosterVote = async (adminId, squadId, candidateId, candidateName) => {
  return await createPoll(adminId, {
    title: `Add ${candidateName} to official roster?`,
    type: 'roster_vote',
    squadId, candidateId,
    options: ['Yes', 'No'],
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), 
  });
};

// ═══════════════════════════════════════════
// TEAMS
// ═══════════════════════════════════════════

export const createTeam = async (ownerId, squadId, { name, tag, game, region }) => {
  const teamRef = await addDoc(collection(db, 'teams'), {
    name,
    tag,
    game,
    region,
    squadId, 
    ownerId,
    roster: [ownerId],
    wins: 0,
    losses: 0,
    teamXP: 0,
    createdAt: serverTimestamp(),
  });
  
  await updateDoc(doc(db, 'squads', squadId), { officialTeamId: teamRef.id });
  return teamRef.id;
};

export const addPlayerToRoster = async (teamId, playerId) => {
  const teamRef = doc(db, 'teams', teamId);
  await updateDoc(teamRef, {
    roster: arrayUnion(playerId)
  });
};

// ═══════════════════════════════════════════
// LEVELING & REWARD ENGINE
// ═══════════════════════════════════════════

export const calculateLevel = (totalXP) => {
  if (!totalXP || totalXP <= 0) return 1;
  const level = Math.floor(totalXP / 1000) + 1; 
  return Math.min(level, 500); 
};

export const distributeWinRewards = async (winnerId, teamId, squadId, xpGained) => {
  const userRef = doc(db, 'users', winnerId);
  const teamRef = doc(db, 'teams', teamId);
  const squadRef = doc(db, 'squads', squadId);

  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) return;
    
    const userData = userDoc.data();
    const newXP = (userData.totalXP || 0) + xpGained;

    transaction.update(userRef, { 
      totalXP: newXP, 
      level: calculateLevel(newXP) 
    });

    transaction.update(teamRef, { 
      teamXP: increment(xpGained), 
      wins: increment(1) 
    });

    transaction.update(squadRef, { 
      leaderboardPoints: increment(xpGained) 
    });
  });
};