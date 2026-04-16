import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, collectionGroup, doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, auth, functions } from '../../firebase/config';
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../context/AuthContext';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';
import TopBar from '../../components/TopBar';
import Icon from '../../components/Icon';
import UserAvatar from '../../components/UserAvatar';

const claimQuestReward = httpsCallable(functions, 'claimQuestReward');

/**
 * Shows the user's invite link, who has signed up via them, and whether each
 * invitee has completed the funnel (phone added + joined a squad or
 * subscribed). Claim button per eligible invitee — 3000 VP for the referrer,
 * 5000 VP auto-paid to the invitee.
 */
export default function ReferralScreen() {
  const { isDesktop, isMobile } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { showToast } = useUI();

  const [invitees, setInvitees] = useState([]);
  const [claimedFriendIds, setClaimedFriendIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(null);

  useEffect(() => {
    setRightPanel(null);
    if (isDesktop) setContentAlign('left');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign, isDesktop]);

  const inviteUrl = currentUser ? `${window.location.origin}/?ref=${currentUser.uid}` : '';

  const loadInvitees = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      // 1. Everyone who signed up via this user's link
      const refSnap = await getDocs(query(collection(db, 'users'), where('referredBy', '==', currentUser.uid)));
      const users = refSnap.docs.map(d => ({ uid: d.id, ...d.data() }));

      // 2. For each, check wallet tier + squad membership in parallel. We
      //    only do one squad read per invitee (collectionGroup limited to 1)
      //    so this scales at most O(n) one-doc reads.
      const enriched = await Promise.all(users.map(async (u) => {
        const [walletSnap, squadSnap] = await Promise.all([
          getDoc(doc(db, 'wallets', u.uid)),
          getDocs(query(collectionGroup(db, 'members'), where('userId', '==', u.uid))),
        ]);
        const tier = walletSnap.exists() ? (walletSnap.data().tier || 'free') : 'free';
        const hasSub = tier === 'lite' || tier === 'pro';
        const hasSquad = !squadSnap.empty;
        const hasPhone = !!u.phoneHash;
        const eligible = hasPhone && (hasSub || hasSquad);
        return { ...u, hasPhone, hasSub, hasSquad, eligible };
      }));

      // 3. Which invites has the referrer already claimed? We key quest
      //    claims by `${uid}_refer_friend_${friendId}` so a single query
      //    gets them all.
      const claimsSnap = await getDocs(query(
        collection(db, 'quest_claims'),
        where('userId', '==', currentUser.uid),
        where('questId', '==', 'refer_friend'),
      ));
      const claimed = new Set();
      claimsSnap.docs.forEach(d => { if (d.data().friendId) claimed.add(d.data().friendId); });

      setInvitees(enriched);
      setClaimedFriendIds(claimed);
    } catch (err) {
      console.error('Failed to load invitees:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { loadInvitees(); }, [loadInvitees]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      showToast('Invite link copied!', 'success');
    } catch {
      showToast('Copy failed — select & copy manually', 'error');
    }
  };

  const shareLink = async () => {
    const text = 'Join me on VERGR — the gamer social app. Sign up via my link and we both earn VP.';
    if (navigator.share) {
      try { await navigator.share({ title: 'Join me on VERGR', text, url: inviteUrl }); return; }
      catch { /* fallthrough to SMS */ }
    }
    window.location.href = `sms:?body=${encodeURIComponent(`${text} ${inviteUrl}`)}`;
  };

  const handleClaim = async (friend) => {
    if (!friend.eligible || claimedFriendIds.has(friend.uid)) return;
    setClaiming(friend.uid);
    try {
      await claimQuestReward({ questId: 'refer_friend', reward: 3000, friendId: friend.uid, title: `Referred ${friend.displayName || friend.username}` });
      setClaimedFriendIds(prev => new Set([...prev, friend.uid]));
      showToast('+3000 VP — your friend got +5000 VP too!', 'success');
    } catch (err) {
      showToast(err?.message || 'Could not claim', 'error');
    } finally {
      setClaiming(null);
    }
  };

  return (
    <div className={isDesktop ? 'min-h-screen pb-8' : 'screen-container min-h-screen pb-8'}>
      {isMobile && <TopBar title="Refer a Friend" showBack />}
      {!isMobile && (
        <div className="px-4 lg:px-6 pt-4">
          <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white transition-colors mb-4" aria-label="Go back">
            <Icon name="arrow_back" size={24} />
          </button>
          <h1 className="text-2xl font-syne font-black uppercase italic tracking-tighter">Refer a Friend</h1>
        </div>
      )}

      <div className="px-4 lg:px-6 pt-4 space-y-4">
        {/* Invite link card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-brand-pink/20 to-brand-violet/10 border border-brand-pink/20">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="person_add" size={20} className="text-brand-pink" />
            <p className="text-brand-pink text-xs font-bold uppercase tracking-[0.2em]">Your invite link</p>
          </div>
          <p className="text-white text-sm leading-relaxed mb-3">
            When your friend signs up via this link, adds their phone number, and joins a squad or subscribes to Lite/Pro —
            <span className="text-brand-cyan font-bold"> you earn 3000 VP </span>
            and
            <span className="text-brand-cyan font-bold"> they earn 5000 VP</span>.
          </p>
          <div className="flex items-center gap-2 bg-surface-2 rounded-xl px-3 py-2 mb-3">
            <Icon name="link" size={16} className="text-text-muted shrink-0" />
            <p className="flex-1 text-xs font-dmmono text-white truncate">{inviteUrl}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={copyLink} className="flex-1 py-2.5 rounded-xl bg-surface-2 text-white text-sm font-bold hover:bg-surface-3 transition-all flex items-center justify-center gap-2">
              <Icon name="content_copy" size={16} /> Copy
            </button>
            <button onClick={shareLink} className="flex-1 py-2.5 rounded-xl bg-brand-cyan text-bg-dark text-sm font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2">
              <Icon name="share" size={16} /> Share
            </button>
          </div>
        </div>

        {/* Invitee list */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted mb-2 px-1">
            Your invites {invitees.length > 0 && `(${invitees.length})`}
          </p>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-surface-3 border-t-brand-cyan rounded-full animate-spin" />
            </div>
          ) : invitees.length === 0 ? (
            <div className="p-6 rounded-2xl bg-surface-1 border border-white/[0.06] text-center">
              <p className="text-text-muted text-sm">No one has signed up via your link yet.</p>
              <p className="text-text-muted text-xs mt-1">Share it with a friend to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {invitees.map((f) => {
                const isClaimed = claimedFriendIds.has(f.uid);
                return (
                  <div key={f.uid} className="flex items-center gap-3 p-3 rounded-2xl bg-surface-1 border border-white/[0.06]">
                    <UserAvatar src={f.avatar} size={44} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-white truncate">{f.displayName || f.username}</p>
                      <p className="text-xs text-text-muted font-dmmono truncate">@{f.username}</p>
                      <div className="flex gap-2 mt-1">
                        <Req ok={f.hasPhone} label="Phone" />
                        <Req ok={f.hasSub || f.hasSquad} label={f.hasSub ? 'Subscribed' : f.hasSquad ? 'In squad' : 'Squad/Sub'} />
                      </div>
                    </div>
                    {isClaimed ? (
                      <span className="text-brand-cyan text-xs font-semibold shrink-0">Claimed ✓</span>
                    ) : f.eligible ? (
                      <button
                        onClick={() => handleClaim(f)}
                        disabled={claiming === f.uid}
                        className="px-3 py-1.5 rounded-full bg-brand-gold text-bg-dark text-xs font-bold hover:brightness-110 active:scale-95 transition-all shrink-0"
                      >
                        {claiming === f.uid ? '...' : 'Claim 3000 VP'}
                      </button>
                    ) : (
                      <span className="text-text-muted text-xs shrink-0">Pending</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Req({ ok, label }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${ok ? 'text-brand-cyan' : 'text-text-muted'}`}>
      <Icon name={ok ? 'check_circle' : 'radio_button_unchecked'} size={10} />
      {label}
    </span>
  );
}
