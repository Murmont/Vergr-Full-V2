// src/screens/squads/SquadRolesScreen.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { getSquadMembers, getActiveSquadVotes, castSquadVote, createSquadVote } from '../../firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { SQUAD_ROLES } from '../../utils/constants';
import TopBar from '../../components/TopBar';
import UserAvatar from '../../components/UserAvatar';
import Icon from '../../components/Icon';
import Modal from '../../components/Modal';
import useResponsive from '../../hooks/useResponsive';

export default function SquadRolesScreen() {
  const { squadId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { showToast } = useUI();
  const { isMobile } = useResponsive();

  const [members, setMembers] = useState([]);
  const [votes, setVotes] = useState([]);
  const [myRole, setMyRole] = useState(null);
  const [squadOwnerId, setSquadOwnerId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNominateModal, setShowNominateModal] = useState(false);
  const [nominateRole, setNominateRole] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  useEffect(() => {
    if (!squadId || !currentUser) return;
    const load = async () => {
      setLoading(true);
      try {
        // Get squad info to know the owner
        const squadSnap = await getDoc(doc(db, 'squads', squadId));
        if (squadSnap.exists()) {
          setSquadOwnerId(squadSnap.data().ownerId);
        }

        const [mems, v] = await Promise.all([
          getSquadMembers(squadId),
          getActiveSquadVotes(squadId),
        ]);
        setMembers(mems);
        setVotes(v);
        const me = mems.find(m => m.id === currentUser.uid);
        setMyRole(me?.role);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    load();
  }, [squadId, currentUser]);

  const handleVote = async (voteId, optionIndex) => {
    try {
      await castSquadVote(squadId, voteId, currentUser.uid, optionIndex);
      showToast('Vote cast!', 'success');
      const v = await getActiveSquadVotes(squadId);
      setVotes(v);
    } catch (err) {
      showToast(err.message || 'Failed to vote', 'error');
    }
  };

  const handleNominate = async () => {
    if (!selectedCandidate || !nominateRole) return;
    try {
      const candidate = members.find(m => m.id === selectedCandidate);
      await createSquadVote(squadId, currentUser.uid, {
        title: `Elect @${candidate?.user?.username} as ${SQUAD_ROLES[nominateRole]?.label}?`,
        type: 'elect_role',
        options: ['Yes', 'No'],
        targetUserId: selectedCandidate,
        targetRole: nominateRole,
        duration: 48,
      });
      showToast('Election vote started!', 'success');
      setShowNominateModal(false);
      setNominateRole(null);
      setSelectedCandidate(null);
      const v = await getActiveSquadVotes(squadId);
      setVotes(v);
    } catch (err) {
      showToast('Failed to start vote', 'error');
    }
  };

  // Allow nomination if user is president, vice president, or the squad owner
  const canNominate = myRole === 'president' || myRole === 'vice_president' || currentUser?.uid === squadOwnerId;
  const roleKeys = ['president', 'vice_president', 'treasury', 'security'];

  const getEligibleCandidates = (role) => {
    const currentHolder = members.find(m => m.role === role);
    if (currentHolder) {
      return members.filter(m => m.id !== currentHolder.id);
    }
    return members;
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-surface-3 border-t-brand-cyan rounded-full animate-spin" /></div>;

  const goToChat = () => navigate(`/squads/${squadId}/chat`);

  return (
    <div className="pb-8">
      {isMobile ? (
        <div className="sticky top-0 z-40 glass-header flex items-center gap-3 px-4 py-3 border-b border-white/[0.04]">
          <button onClick={goToChat} className="text-white/80 hover:text-white transition-colors">
            <Icon name="arrow_back" size={24} />
          </button>
          <h1 className="text-white font-syne font-bold text-lg">Roles & Governance</h1>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 lg:px-6 pt-4 pr-12 lg:pr-16">
          <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white transition-colors">
            <Icon name="arrow_back" size={24} />
          </button>
          <h1 className="text-white font-syne font-bold text-lg">Roles & Governance</h1>
          <div className="w-6" />
        </div>
      )}

      <div className="px-4 py-4">
        <h3 className="font-syne font-bold text-base mb-3">Squad Positions</h3>
        <p className="text-text-muted text-xs mb-4">
          All positions are elected by members. The squad operates as a democracy.
          <br />
          <span className="inline-block mt-1 text-[10px] text-brand-cyan">
            💡 Members can type <span className="font-mono font-bold">/vote</span> in the squad chat to start a presidential election (requires 50% participation within 12 hours).
          </span>
        </p>

        <div className="space-y-3 mb-6">
          {roleKeys.map(roleKey => {
            const role = SQUAD_ROLES[roleKey];
            const holder = members.find(m => m.role === roleKey);
            const eligible = getEligibleCandidates(roleKey);

            return (
              <div key={roleKey} className="p-4 rounded-2xl bg-surface-1 border border-white/[0.06]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{role.icon}</span>
                    <h4 className="font-bold text-sm">{role.label}</h4>
                  </div>
                  {canNominate && !holder && eligible.length > 0 && (
                    <button
                      onClick={() => { setNominateRole(roleKey); setShowNominateModal(true); }}
                      className="px-3 py-1 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan text-[10px] font-bold"
                    >
                      Nominate
                    </button>
                  )}
                </div>
                <p className="text-text-muted text-xs mb-3">{role.desc}</p>
                {holder ? (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-surface-2">
                    <UserAvatar src={holder.user?.avatar} size={32} />
                    <div className="flex-1">
                      <p className="text-xs font-semibold">{holder.user?.displayName || holder.user?.username}</p>
                      <p className="text-[10px] text-text-muted">@{holder.user?.username}</p>
                    </div>
                    <Icon name="check_circle" filled size={16} className="text-green-500" />
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-surface-2 border border-dashed border-white/[0.06] text-center">
                    <p className="text-text-muted text-xs">Position vacant — needs election</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {votes.length > 0 && (
          <>
            <h3 className="font-syne font-bold text-base mb-3">Active Votes</h3>
            <div className="space-y-3">
              {votes.map(vote => {
                const hasVoted = vote.voterIds?.includes(currentUser.uid);
                const totalVotes = vote.totalVotes || 0;
                const expired = vote.expiresAt?.toDate ? new Date() > vote.expiresAt.toDate() : false;

                return (
                  <div key={vote.id} className="p-4 rounded-2xl bg-surface-1 border border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon name={vote.type === 'kick_member' ? 'gavel' : 'how_to_vote'} size={16} className="text-brand-violet" />
                      <span className="text-[10px] text-text-muted uppercase tracking-wider">{vote.type === 'kick_member' ? 'Kick Vote' : 'Election'}</span>
                      {expired && <span className="text-[10px] text-brand-ember font-bold ml-auto">EXPIRED</span>}
                    </div>
                    <p className="text-sm font-semibold mb-3">{vote.title}</p>

                    <div className="space-y-2">
                      {vote.options?.map((option, i) => {
                        const count = vote.voteCounts?.[i] || 0;
                        const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;

                        return (
                          <button
                            key={i}
                            onClick={() => !hasVoted && !expired && handleVote(vote.id, i)}
                            disabled={hasVoted || expired}
                            className={`w-full p-3 rounded-xl text-left transition-all relative overflow-hidden ${
                              hasVoted || expired ? 'bg-surface-2' : 'bg-surface-2 hover:border-white/[0.12] border border-white/[0.06]'
                            }`}
                          >
                            {(hasVoted || expired) && (
                              <div className="absolute inset-y-0 left-0 bg-brand-cyan/10 transition-all" style={{ width: `${pct}%` }} />
                            )}
                            <div className="relative flex items-center justify-between">
                              <span className="text-sm font-medium">{option}</span>
                              {(hasVoted || expired) && (
                                <span className="text-xs font-dmmono text-text-muted">{pct}% ({count})</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-text-muted text-[10px] mt-2 font-dmmono">{totalVotes} votes cast</p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <Modal isOpen={showNominateModal} onClose={() => { setShowNominateModal(false); setNominateRole(null); setSelectedCandidate(null); }}
        title={`Nominate ${SQUAD_ROLES[nominateRole]?.label || ''}`}>
        <p className="text-text-secondary text-sm mb-4">Select a member to nominate. All squad members will vote for 48 hours.</p>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {nominateRole && getEligibleCandidates(nominateRole).map(member => (
            <button key={member.id} onClick={() => setSelectedCandidate(member.id)}
              className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all text-left ${
                selectedCandidate === member.id ? 'bg-brand-cyan/10 border border-brand-cyan/30' : 'bg-surface-2 border border-transparent'
              }`}>
              <UserAvatar src={member.user?.avatar} size={32} />
              <div className="flex-1">
                <p className="text-sm font-semibold">{member.user?.displayName || member.user?.username}</p>
                <p className="text-xs text-text-muted">
                  {member.role !== 'member' ? `${SQUAD_ROLES[member.role]?.label} · ` : ''}{member.totalContributed || 0} contributed
                </p>
              </div>
              {selectedCandidate === member.id && <Icon name="check_circle" filled size={18} className="text-brand-cyan" />}
            </button>
          ))}
          {nominateRole && getEligibleCandidates(nominateRole).length === 0 && (
            <p className="text-text-muted text-sm text-center py-4">No eligible members to nominate for this role</p>
          )}
        </div>
        <button onClick={handleNominate} disabled={!selectedCandidate}
          className={`w-full py-3 rounded-xl font-bold text-sm mt-4 transition-all ${
            selectedCandidate ? 'bg-brand-cyan text-bg-dark' : 'bg-surface-3 text-text-muted'
          }`}>
          Start Election Vote
        </button>
      </Modal>
    </div>
  );
}