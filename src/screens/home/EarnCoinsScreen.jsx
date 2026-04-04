import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import { useUI } from '../../context/UIContext';
import { getQuestClaims, getUserPosts, getFollowing, getTransactions } from '../../firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase/config';
import TopBar from '../../components/TopBar';
import CoinDisplay from '../../components/CoinDisplay';
import Icon from '../../components/Icon';
import InfoTooltip from '../../components/InfoTooltip';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';

const QUEST_DEFS = {
  daily: [
    { id: 'daily_post', title: 'Create a Post', description: 'Share something with the community', reward: 15, currency: 'vp', target: 1 },
    { id: 'daily_like', title: 'Like 5 Posts', description: 'Engage with the community', reward: 5, currency: 'vp', target: 5 },
    { id: 'daily_squad_msg', title: 'Squad Activity', description: 'Send a message in any squad', reward: 10, currency: 'vp', target: 1 },
  ],
  weekly: [
    { id: 'weekly_posts', title: 'Content Creator', description: 'Create 3 posts this week', reward: 50, currency: 'vp', target: 3 },
    { id: 'weekly_follow', title: 'Social Butterfly', description: 'Follow 10 new people this week', reward: 50, currency: 'vp', target: 10 },
  ],
  special: [
    { id: 'creator_content', title: 'Creator Content', description: 'Post 10 times with 5+ likes and 5+ comments each', reward: 100, currency: 'vp', target: 10, oneTime: true },
    { id: 'first_squad', title: 'Join a Squad', description: 'Join or create your first squad', reward: 50, currency: 'vp', target: 1, oneTime: true },
    { id: 'first_tournament', title: 'Enter a Tournament', description: 'Compete in your first tournament', reward: 100, currency: 'vp', target: 1, oneTime: true },
    { id: 'refer_friend', title: 'Refer a Friend', description: 'Both need paid sub + friend must have bought coins', reward: 25, currency: 'coins', bonusVP: 500, target: 1, oneTime: true, requiresFriend: true },
  ],
};

export default function EarnCoinsScreen() {
  const [activeTab, setActiveTab] = useState('daily');
  const [claimedIds, setClaimedIds] = useState([]);
  const [claiming, setClaiming] = useState(null);
  const [userActivity, setUserActivity] = useState({});
  const [loading, setLoading] = useState(true);
  const [todayEarned, setTodayEarned] = useState(0);

  const { currentUser } = useAuth();
  const { wallet } = useUser();
  const { showToast } = useUI();
  const navigate = useNavigate();
  const { setRightPanel, setContentAlign } = useLayout();
  const { isMobile } = useResponsive();

  // Full‑width layout (like Settings)
  useEffect(() => {
    setRightPanel(null);
    setContentAlign('left');
    return () => {
      setRightPanel(null);
      setContentAlign('center');
    };
  }, [setRightPanel, setContentAlign]);

  useEffect(() => {
    if (!currentUser) return;
    const load = async () => {
      setLoading(true);
      try {
        const [claims, posts, following, txs] = await Promise.all([
          getQuestClaims(currentUser.uid),
          getUserPosts(currentUser.uid, 10).catch(() => []),
          getFollowing(currentUser.uid, 50).catch(() => []),
          getTransactions(currentUser.uid, 50).catch(() => []),
        ]);
        setClaimedIds(claims);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Calculate today's earnings from actual transactions
        const earned = txs.filter(t => {
          if (t.amount <= 0) return false;
          const d = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
          return d >= today;
        }).reduce((sum, t) => sum + (t.amount || 0), 0);
        setTodayEarned(earned);

        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());

        const todayPosts = posts.filter(p => {
          const d = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
          return d >= today;
        }).length;

        const weekPosts = posts.filter(p => {
          const d = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
          return d >= weekStart;
        }).length;

        setUserActivity({
          daily_login: 1,
          daily_post: todayPosts,
          daily_like: 0,
          daily_squad_msg: 0,
          weekly_posts: weekPosts,
          weekly_follow: following.length,
          weekly_streak: 1,
          refer_friend: 0,
          first_squad: 0,
          first_tournament: 0,
        });
      } catch (err) {
        console.error('Failed to load earn data:', err);
      }
      setLoading(false);
    };
    load();
  }, [currentUser]);

  const handleClaim = useCallback(async (quest) => {
    if (claiming || claimedIds.includes(quest.id)) return;
    setClaiming(quest.id);
    try {
      await httpsCallable(functions, 'claimQuestReward')({ questId: quest.id, reward: quest.reward, title: quest.title });
      setClaimedIds(prev => [...prev, quest.id]);
      showToast(`+${quest.reward} ${quest.currency === "coins" ? "coins" : "VP"} earned!`, quest.currency === "coins" ? "coins" : "success");
    } catch (err) {
      if (err.code === 'functions/already-exists' || err.message?.includes('already claimed')) {
        showToast('Already claimed today', 'info');
        setClaimedIds(prev => [...prev, quest.id]);
      } else {
        showToast('Failed to claim reward', 'error');
        console.error(err);
      }
    }
    setClaiming(null);
  }, [claiming, claimedIds, currentUser, showToast]);

  const quests = QUEST_DEFS[activeTab] || [];

  const EARN_METHODS = [
    { icon: 'star', title: 'Daily Quests', desc: 'Complete tasks for VP', reward: '15-30 VP/day', color: 'text-brand-violet', action: () => setActiveTab('daily') },
    { icon: 'login', title: '5-Day Streak', desc: 'Log in 5 days straight', reward: '5 coins + 50 VP', color: 'text-brand-gold', action: () => navigate('/') },
    { icon: 'diamond', title: 'Offer Services', desc: 'Earn gems from clients', reward: 'Gems (cashable)', color: 'text-brand-cyan', action: () => navigate('/services') },
    { icon: 'emoji_events', title: 'Win Tournaments', desc: 'Win gems from prize pools', reward: 'Gems + VP', color: 'text-brand-ember', action: () => navigate('/tournaments') },
    { icon: 'person_add', title: 'Refer Friends', desc: 'Both need paid sub + coins', reward: '25 coins + 500 VP', color: 'text-brand-pink', action: () => setActiveTab('special') },
    { icon: 'trending_up', title: 'Level Up', desc: 'Higher VP = lower fees', reward: 'Up to 15% discount', color: 'text-brand-gold', action: () => navigate('/settings/how-it-works') },
  ];

  return (
    <div className="min-h-full">
      {/* Mobile header */}
      {isMobile && <TopBar title="Earn Coins" showBack actions={<CoinDisplay amount={wallet?.balance || 0} />} />}

      {/* Desktop header – with right padding to avoid notification icon overlap */}
      {!isMobile && (
        <div className="flex items-center justify-between px-4 lg:px-6 pt-4 pr-12 lg:pr-16">
          <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white transition-colors" aria-label="Go back">
            <Icon name="arrow_back" size={24} />
          </button>
          <CoinDisplay amount={wallet?.balance || 0} />
        </div>
      )}

      {/* Hero card */}
      <div className="mx-4 lg:mx-6 mt-2 p-5 rounded-2xl bg-surface-1 border border-white/[0.06] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-violet/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <p className="text-text-secondary text-xs uppercase tracking-wider font-bold mb-2">How You Earn</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-surface-2/50 text-center">
              <Icon name="star" size={20} className="text-brand-violet mx-auto mb-1" />
              <p className="text-brand-violet text-lg font-black font-dmmono">{wallet?.vp || 0}</p>
              <p className="text-text-secondary text-[9px]">VP (levels + perks)</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-2/50 text-center">
              <Icon name="diamond" size={20} className="text-brand-cyan mx-auto mb-1" />
              <p className="text-brand-cyan text-lg font-black font-dmmono">{wallet?.gems || 0}</p>
              <p className="text-text-secondary text-[9px]">Gems (cashable)</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-2/50 text-center">
              <Icon name="paid" size={20} className="text-brand-gold mx-auto mb-1" />
              <p className="text-brand-gold text-lg font-black font-dmmono">{wallet?.balance || 0}</p>
              <p className="text-text-secondary text-[9px]">Coins (spendable)</p>
            </div>
          </div>
          <p className="text-text-primary text-[10px] mt-3 text-center">Quests earn VP · Services & tournaments earn gems · Streaks & referrals earn coins</p>
        </div>
      </div>

      <div className="mx-4 lg:mx-6 mt-3">
        <InfoTooltip id="earn_intro" icon="diamond" color="#4DFFD4" title="Earning real money on VERGR">
          Offer services (coaching, editing, design) and win tournaments to earn <strong>gems</strong> — these can be cashed out. 
          Complete quests to earn <strong>VP</strong> — this levels up your profile and lowers your commission rate, meaning you keep more from every sale.
        </InfoTooltip>
      </div>

      {/* Two‑column layout on desktop */}
      {isMobile ? (
        // Mobile: stack sections vertically
        <>
          <div className="px-4 mt-6">
            <h3 className="font-syne font-bold text-lg mb-3">Ways to Earn</h3>
            <div className="grid grid-cols-2 gap-3">
              {EARN_METHODS.map((method, i) => (
                <button key={i} onClick={method.action} className="p-3 rounded-2xl border border-white/[0.06] bg-surface-1 text-left hover:border-white/[0.12] transition-colors">
                  <Icon name={method.icon} filled size={24} className={method.color} />
                  <p className="text-text-primary text-sm font-semibold mt-2">{method.title}</p>
                  <p className="text-text-muted text-xs mt-0.5">{method.desc}</p>
                  <p className="text-brand-gold text-xs font-dmmono mt-2">{method.reward}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 mt-6">
            <h3 className="font-syne font-bold text-lg mb-3">Active Quests</h3>
            <div className="flex gap-2 mb-4">
              {['daily', 'weekly', 'special'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
                    activeTab === tab ? 'bg-brand-cyan text-bg-dark' : 'bg-surface-2 text-text-secondary'
                  }`}>
                  {tab}
                </button>
              ))}
            </div>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-surface-3 border-t-brand-cyan rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {quests.map(quest => {
                  const progress = userActivity[quest.id] || 0;
                  const completed = progress >= quest.target || quest.checkAuto;
                  const claimed = claimedIds.includes(quest.id);

                  return (
                    <div key={quest.id} className="flex items-center gap-3 p-4 rounded-2xl border border-white/[0.06] bg-surface-1">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${completed ? 'bg-brand-cyan/10' : 'bg-surface-3'}`}>
                        <Icon name={completed ? 'check_circle' : 'radio_button_unchecked'} filled={completed} size={22}
                          className={completed ? 'text-brand-cyan' : 'text-text-muted'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-primary">{quest.title}</p>
                        <p className="text-xs text-text-muted">{quest.description}</p>
                        {!completed && (
                          <>
                            <div className="w-full h-1.5 bg-surface-3 rounded-full mt-2 overflow-hidden">
                              <div className="h-full bg-brand-cyan rounded-full transition-all" style={{ width: `${Math.min((progress / quest.target) * 100, 100)}%` }} />
                            </div>
                            <p className="text-xs text-text-muted font-dmmono mt-1">{progress}/{quest.target}</p>
                          </>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-xs font-dmmono font-bold ${quest.currency === "coins" ? "text-brand-gold" : "text-brand-violet"}`}>{quest.currency === "coins" ? "●" : "★"} {quest.reward} {quest.currency === "coins" ? "" : "VP"}</p>
                        {completed && !claimed && (
                          <button
                            onClick={() => handleClaim(quest)}
                            disabled={claiming === quest.id}
                            className="mt-1 px-3 py-1 rounded-full bg-brand-gold text-bg-dark text-xs font-bold hover:brightness-110 active:scale-95 transition-all">
                            {claiming === quest.id ? '...' : 'Claim'}
                          </button>
                        )}
                        {claimed && <span className="text-brand-cyan text-xs font-semibold">Claimed ✓</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        // Desktop: two columns with full width
        <div className="px-4 lg:px-6 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Ways to Earn */}
          <div className="lg:col-span-1">
            <h3 className="font-syne font-bold text-lg mb-3">Ways to Earn</h3>
            <div className="space-y-3">
              {EARN_METHODS.map((method, i) => (
                <button key={i} onClick={method.action} className="w-full p-4 rounded-2xl border border-white/[0.06] bg-surface-1 text-left hover:border-white/[0.12] transition-colors">
                  <div className="flex items-center gap-3">
                    <Icon name={method.icon} filled size={28} className={method.color} />
                    <div>
                      <p className="text-text-primary text-base font-semibold">{method.title}</p>
                      <p className="text-text-muted text-xs mt-0.5">{method.desc}</p>
                      <p className="text-brand-gold text-xs font-dmmono mt-2">{method.reward}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right column: Active Quests */}
          <div className="lg:col-span-2">
            <h3 className="font-syne font-bold text-lg mb-3">Active Quests</h3>
            <div className="flex gap-2 mb-4">
              {['daily', 'weekly', 'special'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold capitalize transition-all ${
                    activeTab === tab ? 'bg-brand-cyan text-bg-dark' : 'bg-surface-2 text-text-secondary'
                  }`}>
                  {tab}
                </button>
              ))}
            </div>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-surface-3 border-t-brand-cyan rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {quests.map(quest => {
                  const progress = userActivity[quest.id] || 0;
                  const completed = progress >= quest.target || quest.checkAuto;
                  const claimed = claimedIds.includes(quest.id);

                  return (
                    <div key={quest.id} className="flex items-center gap-4 p-4 rounded-2xl border border-white/[0.06] bg-surface-1">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${completed ? 'bg-brand-cyan/10' : 'bg-surface-3'}`}>
                        <Icon name={completed ? 'check_circle' : 'radio_button_unchecked'} filled={completed} size={26}
                          className={completed ? 'text-brand-cyan' : 'text-text-muted'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-text-primary">{quest.title}</p>
                        <p className="text-sm text-text-muted">{quest.description}</p>
                        {!completed && (
                          <>
                            <div className="w-full h-2 bg-surface-3 rounded-full mt-3 overflow-hidden">
                              <div className="h-full bg-brand-cyan rounded-full transition-all" style={{ width: `${Math.min((progress / quest.target) * 100, 100)}%` }} />
                            </div>
                            <p className="text-xs text-text-muted font-dmmono mt-1">{progress}/{quest.target}</p>
                          </>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-dmmono font-bold ${quest.currency === "coins" ? "text-brand-gold" : "text-brand-violet"}`}>{quest.currency === "coins" ? "●" : "★"} {quest.reward} {quest.currency === "coins" ? "" : "VP"}</p>
                        {completed && !claimed && (
                          <button
                            onClick={() => handleClaim(quest)}
                            disabled={claiming === quest.id}
                            className="mt-2 px-4 py-1.5 rounded-full bg-brand-gold text-bg-dark text-xs font-bold hover:brightness-110 active:scale-95 transition-all">
                            {claiming === quest.id ? '...' : 'Claim'}
                          </button>
                        )}
                        {claimed && <span className="text-brand-cyan text-xs font-semibold">Claimed ✓</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}