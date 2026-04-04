import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { claimQuestReward, getQuestClaims } from '../../firebase/firestore';
import TopBar from '../../components/TopBar';
import Icon from '../../components/Icon';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';

const CREATOR_QUESTS = [
  { id: 'creator_post', title: 'Post Content', desc: 'Create a post today', reward: 30, icon: 'edit' },
  { id: 'creator_stream', title: 'Go Live', desc: 'Stream for at least 30 minutes', reward: 100, icon: 'live_tv' },
  { id: 'creator_engage', title: 'Engage Fans', desc: 'Reply to 5 comments', reward: 25, icon: 'chat_bubble' },
  { id: 'creator_collab', title: 'Collaborate', desc: 'Co-stream with another creator', reward: 200, icon: 'group' },
];

export default function CreatorQuestsScreen() {
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  useEffect(() => {
    setRightPanel(null);
    if (isDesktop) setContentAlign('left');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign, isDesktop]);
  const { currentUser } = useAuth();
  const { showToast } = useUI();
  const [claimed, setClaimed] = useState([]);
  const [claiming, setClaiming] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    getQuestClaims(currentUser.uid).then(setClaimed).catch(console.error);
  }, [currentUser]);

  const handleClaim = async (quest) => {
    setClaiming(quest.id);
    try {
      await claimQuestReward(currentUser.uid, quest.id, quest.reward, quest.title);
      setClaimed(prev => [...prev, quest.id]);
      showToast(`+${quest.reward} coins!`, 'coins');
    } catch (err) {
      showToast(err.message?.includes('already') ? 'Already claimed' : 'Failed', 'error');
    }
    setClaiming(null);
  };

  return (
    <div className={isDesktop ? "min-h-screen pb-8" : "screen-container min-h-screen pb-8"}>
      <TopBar title="Creator Quests" showBack />
      <div className="px-4 py-4">
        <p className="text-text-muted text-sm mb-4">Complete daily quests to earn bonus coins as a creator.</p>
        <div className="space-y-3">
          {CREATOR_QUESTS.map(quest => {
            const isClaimed = claimed.includes(quest.id);
            return (
              <div key={quest.id} className="flex items-center gap-3 p-4 rounded-2xl bg-surface-1 border border-white/[0.06]">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isClaimed ? 'bg-brand-cyan/10' : 'bg-surface-3'}`}>
                  <Icon name={isClaimed ? 'check_circle' : quest.icon} filled={isClaimed} size={22} className={isClaimed ? 'text-brand-cyan' : 'text-text-muted'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{quest.title}</p>
                  <p className="text-xs text-text-muted">{quest.desc}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-brand-gold text-xs font-dmmono font-bold">{quest.reward}</p>
                  {!isClaimed && (
                    <button onClick={() => handleClaim(quest)} disabled={claiming === quest.id}
                      className="mt-1 px-3 py-1 rounded-full bg-brand-gold text-bg-dark text-xs font-bold">
                      {claiming === quest.id ? '...' : 'Claim'}
                    </button>
                  )}
                  {isClaimed && <span className="text-brand-cyan text-xs">Done ✓</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
