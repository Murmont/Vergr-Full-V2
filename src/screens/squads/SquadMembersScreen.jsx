import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import {
  getSquadMembers,
  muteSquadMember,
  unmuteSquadMember,
  createSquadVote,
  isFollowing,
  followUser,
  createConversation,
} from '../../firebase/firestore';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { SQUAD_ROLES, MUTE_DURATIONS } from '../../utils/constants';
import TopBar from '../../components/TopBar';
import UserAvatar from '../../components/UserAvatar';
import Icon from '../../components/Icon';
import Modal from '../../components/Modal';
import useResponsive from '../../hooks/useResponsive';

export default function SquadMembersScreen() {
  const { squadId } = useParams();
  const { currentUser } = useAuth();
  const { showToast } = useUI();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();

  const [members, setMembers] = useState([]);
  const [myRole, setMyRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showMuteModal, setShowMuteModal] = useState(false);
  const [followingMap, setFollowingMap] = useState({});
  
  // Kick vote reason modal
  const [showKickReasonModal, setShowKickReasonModal] = useState(false);
  const [kickReason, setKickReason] = useState('');
  const [kickTarget, setKickTarget] = useState(null);

  // Load members and role
  useEffect(() => {
    if (!squadId || !currentUser) return;
    const load = async () => {
      setLoading(true);
      try {
        const mems = await getSquadMembers(squadId);
        setMembers(mems);
        const me = mems.find(m => m.id === currentUser.uid);
        setMyRole(me?.role);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [squadId, currentUser]);

  // Load follow status for each member (skip self)
  useEffect(() => {
    if (!members.length || !currentUser) return;
    const fetchFollowStatus = async () => {
      const newMap = { ...followingMap };
      for (const member of members) {
        if (member.id === currentUser.uid) continue;
        if (newMap[member.id] === undefined) {
          const following = await isFollowing(currentUser.uid, member.id);
          newMap[member.id] = following;
        }
      }
      setFollowingMap(newMap);
    };
    fetchFollowStatus();
  }, [members, currentUser]);

  const canModerate = ['president', 'vice_president', 'security'].includes(myRole);

  const handleMute = async (duration) => {
    if (!selectedMember) return;
    try {
      await muteSquadMember(squadId, selectedMember.id, duration.ms, 'Muted by moderator');
      showToast(`${selectedMember.user?.username} muted for ${duration.label}`, 'info');
      setShowMuteModal(false);
      setSelectedMember(null);
      const mems = await getSquadMembers(squadId);
      setMembers(mems);
    } catch (err) {
      showToast('Failed to mute member', 'error');
    }
  };

  const handleUnmute = async (member) => {
    try {
      await unmuteSquadMember(squadId, member.id);
      showToast(`${member.user?.username} unmuted`, 'success');
      const mems = await getSquadMembers(squadId);
      setMembers(mems);
    } catch (err) {
      showToast('Failed to unmute', 'error');
    }
  };

  // Open reason modal before starting kick vote
  const openKickModal = (member) => {
    setKickTarget(member);
    setKickReason('');
    setShowKickReasonModal(true);
  };

  const startKickVote = async () => {
    if (!kickTarget) return;
    try {
      const voteId = await createSquadVote(
        squadId,
        currentUser.uid,
        {
          title: `Kick @${kickTarget.user?.username} from squad?`,
          type: 'kick_member',
          options: ['Yes - Remove', 'No - Keep'],
          targetUserId: kickTarget.id,
          duration: 24,
          reason: kickReason.trim() || 'No reason provided',
        }
      );

      // Add system message to squad chat (using current user as sender)
      await addDoc(collection(db, 'squads', squadId, 'messages'), {
        type: 'vote',
        voteId: voteId,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'Anonymous',
        senderAvatar: currentUser.photoURL || '',
        createdAt: serverTimestamp(),
        readBy: [currentUser.uid],
      });

      showToast('Kick vote started! All members can vote for 24 hours.', 'success');
      setShowKickReasonModal(false);
      setKickTarget(null);
    } catch (err) {
      console.error('Error starting kick vote:', err);
      showToast(`Failed to start vote: ${err.message || 'Unknown error'}`, 'error');
    }
  };

  const handleFollow = async (member) => {
    try {
      await followUser(currentUser.uid, member.id);
      setFollowingMap(prev => ({ ...prev, [member.id]: true }));
      showToast(`You are now following ${member.user?.username}`, 'success');
    } catch (err) {
      showToast('Failed to follow', 'error');
    }
  };

  const handleMessage = async (member) => {
    try {
      const convoId = await createConversation(currentUser.uid, {
        id: member.id,
        username: member.user?.username,
        displayName: member.user?.displayName,
        avatar: member.user?.avatar,
      });
      navigate(`/messages/${convoId}`);
    } catch (err) {
      console.error(err);
      showToast('Could not open chat', 'error');
    }
  };

  const isMuted = (member) =>
    member.mutedUntil &&
    new Date(member.mutedUntil?.toDate ? member.mutedUntil.toDate() : member.mutedUntil) > new Date();

  if (loading)
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-surface-3 border-t-brand-cyan rounded-full animate-spin" />
      </div>
    );

  const goToChat = () => navigate(`/squads/${squadId}/chat`);

  return (
    <div className="pb-8">
      {/* Mobile header with back button */}
      {isMobile ? (
        <div className="sticky top-0 z-40 glass-header flex items-center gap-3 px-4 py-3 border-b border-white/[0.04]">
          <button onClick={goToChat} className="text-white/80 hover:text-white transition-colors">
            <Icon name="arrow_back" size={24} />
          </button>
          <h1 className="text-white font-syne font-bold text-lg">Members ({members.length})</h1>
          {canModerate && (
            <button
              onClick={() => navigate(`/squads/${squadId}/invite`)}
              className="ml-auto w-9 h-9 rounded-full bg-brand-cyan flex items-center justify-center"
            >
              <Icon name="person_add" size={18} className="text-bg-dark" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 lg:px-6 pt-4 pr-12 lg:pr-16">
          <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white transition-colors">
            <Icon name="arrow_back" size={24} />
          </button>
          <h1 className="text-white font-syne font-bold text-lg">Members ({members.length})</h1>
          <div className="w-6" />
        </div>
      )}

      <div className="px-4 py-3 space-y-2">
        {members.map((member) => {
          const role = SQUAD_ROLES[member.role] || SQUAD_ROLES.member;
          const muted = isMuted(member);
          const isMe = member.id === currentUser.uid;
          const following = followingMap[member.id] || false;

          return (
            <div
              key={member.id}
              className={`flex items-center gap-3 p-3 rounded-2xl bg-surface-1 border ${
                muted ? 'border-brand-ember/30' : 'border-white/[0.06]'
              }`}
            >
              {/* Avatar */}
              <button
                onClick={() => !isMe && navigate(`/user/${member.user?.id || member.id}`)}
                className="shrink-0"
              >
                <UserAvatar src={member.user?.avatar} size={40} />
              </button>

              {/* Name & username */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold truncate">
                    {member.user?.displayName || member.user?.username}
                  </p>
                  {isMe && <span className="text-[9px] text-brand-cyan font-bold">(You)</span>}
                  {member.user?.isVerified && (
                    <Icon name="verified" filled size={12} className="text-brand-cyan" />
                  )}
                </div>
                <p className="text-xs text-text-muted">@{member.user?.username}</p>
                {member.totalContributed > 0 && (
                  <p className="text-[10px] text-brand-gold font-dmmono mt-0.5">
                    {member.totalContributed} contributed
                  </p>
                )}
              </div>

              {/* Role badge (right side) */}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 shrink-0">
                <span className="text-xs">{role.icon}</span>
                <span className="text-[10px] font-bold text-brand-cyan uppercase whitespace-nowrap">
                  {role.label}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-1 shrink-0">
                {canModerate && !isMe && member.role === 'member' ? (
                  <>
                    {muted ? (
                      <button
                        onClick={() => handleUnmute(member)}
                        className="px-2 py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-bold whitespace-nowrap"
                      >
                        Unmute
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedMember(member);
                          setShowMuteModal(true);
                        }}
                        className="px-2 py-1 rounded-lg bg-brand-ember/10 border border-brand-ember/20 text-brand-ember text-[10px] font-bold whitespace-nowrap"
                      >
                        Mute
                      </button>
                    )}
                    <button
                      onClick={() => openKickModal(member)}
                      className="px-2 py-1 rounded-lg bg-surface-2 border border-white/[0.06] text-text-muted text-[10px] font-bold whitespace-nowrap"
                    >
                      Vote Kick
                    </button>
                  </>
                ) : !isMe ? (
                  following ? (
                    <button
                      onClick={() => handleMessage(member)}
                      className="px-3 py-1 rounded-full bg-brand-cyan text-bg-dark text-xs font-bold whitespace-nowrap"
                    >
                      Message
                    </button>
                  ) : (
                    <button
                      onClick={() => handleFollow(member)}
                      className="px-3 py-1 rounded-full bg-surface-2 border border-white/[0.06] text-text-primary text-xs font-bold whitespace-nowrap hover:bg-surface-3 transition-colors"
                    >
                      Follow
                    </button>
                  )
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mute modal */}
      <Modal
        isOpen={showMuteModal}
        onClose={() => {
          setShowMuteModal(false);
          setSelectedMember(null);
        }}
        title={`Mute @${selectedMember?.user?.username}`}
      >
        <p className="text-text-secondary text-sm mb-4">
          Choose how long to mute this member. They won't be able to send messages in squad chat.
        </p>
        <div className="space-y-2">
          {MUTE_DURATIONS.map((duration) => (
            <button
              key={duration.label}
              onClick={() => handleMute(duration)}
              className="w-full p-3 rounded-xl bg-surface-2 border border-white/[0.06] text-left hover:border-white/[0.12] transition-colors"
            >
              <p className="text-sm font-semibold">{duration.label}</p>
            </button>
          ))}
        </div>
      </Modal>

      {/* Kick vote reason modal */}
      <Modal
        isOpen={showKickReasonModal}
        onClose={() => {
          setShowKickReasonModal(false);
          setKickTarget(null);
          setKickReason('');
        }}
        title={`Kick @${kickTarget?.user?.username}`}
      >
        <p className="text-text-secondary text-sm mb-2">
          Please provide a reason for this kick vote. This will be visible to all members.
        </p>
        <textarea
          value={kickReason}
          onChange={(e) => setKickReason(e.target.value)}
          placeholder="Reason for kick (optional)"
          className="w-full bg-surface-2 border border-white/[0.06] rounded-xl p-3 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-cyan focus:outline-none mb-4"
          rows={3}
        />
        <button
          onClick={startKickVote}
          className="w-full py-3 rounded-xl bg-brand-cyan text-bg-dark font-bold text-sm hover:brightness-110 transition-all"
        >
          Start Kick Vote
        </button>
      </Modal>
    </div>
  );
}