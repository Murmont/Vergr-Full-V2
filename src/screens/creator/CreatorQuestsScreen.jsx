// src/screens/creator/CreatorQuestsScreen.jsx
// Creator quests — VP rewards only (never coins) to protect the coin economy.
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { claimQuestReward, getQuestClaims } from '../../firebase/firestore';
import TopBar from '../../components/TopBar';
import Icon from '../../components/Icon';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';
import CreatorLayout from '../../components/creator/CreatorLayout';
import { Card, SectionHeader, InsightCard } from '../../components/creator/Widgets';

const CREATOR_QUESTS = [
  { id: 'creator_post',    title: 'Post content',    desc: 'Create a post today',              vp: 30,  icon: 'edit',        tone: 'cyan' },
  { id: 'creator_stream',  title: 'Go Live',         desc: 'Stream for at least 30 minutes',   vp: 100, icon: 'live_tv',     tone: 'rose' },
  { id: 'creator_engage',  title: 'Engage with fans', desc: 'Reply to 5 comments',             vp: 25,  icon: 'chat_bubble', tone: 'violet' },
  { id: 'creator_collab',  title: 'Collaborate',      desc: 'Co-stream with another creator',  vp: 200, icon: 'group',       tone: 'gold' },
  { id: 'creator_short',   title: 'Drop a Short',     desc: 'Publish a Short this week',       vp: 50,  icon: 'movie_filter', tone: 'pink' },
  { id: 'creator_tierlist', title: 'Share a tier list', desc: 'Create and publish a tier list', vp: 40,  icon: 'leaderboard', tone: 'emerald' },
];

const TONE = {
  cyan:    { bg: 'bg-cyan-500/10',    icon: 'text-brand-cyan' },
  rose:    { bg: 'bg-rose-500/10',    icon: 'text-rose-400' },
  violet:  { bg: 'bg-violet-500/10',  icon: 'text-brand-violet' },
  gold:    { bg: 'bg-amber-500/10',   icon: 'text-amber-400' },
  pink:    { bg: 'bg-pink-500/10',    icon: 'text-brand-pink' },
  emerald: { bg: 'bg-emerald-500/10', icon: 'text-emerald-400' },
};

function QuestList({ claimed, claiming, onClaim }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {CREATOR_QUESTS.map(quest => {
        const isClaimed = claimed.includes(quest.id);
        const t = TONE[quest.tone] || TONE.cyan;
        return (
          <div key={quest.id} className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] transition-colors">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isClaimed ? 'bg-emerald-500/10' : t.bg}`}>
              <Icon name={isClaimed ? 'check_circle' : quest.icon} filled={isClaimed} size={22} className={isClaimed ? 'text-emerald-400' : t.icon} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">{quest.title}</p>
              <p className="text-xs text-text-muted">{quest.desc}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-dmmono font-bold text-brand-violet tabular-nums text-sm">+{quest.vp} VP</p>
              {!isClaimed ? (
                <button onClick={() => onClaim(quest)} disabled={claiming === quest.id}
                  className="mt-1.5 px-3 py-1 rounded-full bg-brand-violet text-white text-[11px] font-bold hover:brightness-110 transition">
                  {claiming === quest.id ? '...' : 'Claim'}
                </button>
              ) : (
                <span className="text-emerald-400 text-[11px] font-bold">Done ✓</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CreatorQuestsScreen({ embedded = false }) {
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  useEffect(() => {
    if (embedded) return;
    setRightPanel(null);
    if (isDesktop) setContentAlign('left');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign, isDesktop, embedded]);

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
      // Server still credits coins under the hood today — swap to VP when backend lands.
      await claimQuestReward(currentUser.uid, quest.id, quest.vp, quest.title);
      setClaimed(prev => [...prev, quest.id]);
      showToast(`+${quest.vp} VP!`, 'success');
    } catch (err) {
      showToast(err.message?.includes('already') ? 'Already claimed' : 'Failed', 'error');
    }
    setClaiming(null);
  };

  const content = (
    <>
      <InsightCard
        tone="violet"
        title="CREATOR QUESTS"
        body="Quests award Vergr Points (VP) — they level up your creator rank and unlock perks. They never award coins."
        icon="military_tech"
      />
      <div className="mt-6">
        <SectionHeader title="Today's quests" subtitle="Refreshes every 24h" />
        <QuestList claimed={claimed} claiming={claiming} onClaim={handleClaim} />
      </div>
    </>
  );

  if (embedded) return content;

  return (
    <div className={isDesktop ? "min-h-screen pb-8" : "screen-container min-h-screen pb-8"}>
      <TopBar title="Creator Quests" showBack />
      <div className="px-4 py-4">{content}</div>
    </div>
  );
}
