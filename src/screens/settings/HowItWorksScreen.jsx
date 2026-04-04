import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import TopBar from '../../components/TopBar';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';

const SECTIONS = [
  {
    id: 'overview',
    icon: 'stadia_controller',
    color: '#4DFFD4',
    title: 'What is VERGR?',
    content: 'VERGR is a gaming social platform where you compete, create, earn, and cash out. Unlike other platforms where you just spend money, VERGR rewards you for being active. Every like you get, every quest you complete, every tournament you win — you earn real coins that have real value.',
  },
  {
    id: 'economy',
    icon: 'account_balance',
    color: '#F5C542',
    title: 'The VERGR Economy',
    content: 'VERGR runs on three currencies. Coins are bought with real money and used to spend. Gems are earned when people spend coins ON YOU — these can be cashed out. VP (VERGR Points) are earned through activity and unlock levels, perks, and discounts.',
    items: [
      { label: 'Coins (●)', value: 'Bought with real money. 1 coin = €0.01. Spend on tips, tournaments, services, boosts.' },
      { label: 'Gems (◆)', value: 'Earned when someone spends coins on you. Cashable. 1 gem = €0.01. You keep 70-85% depending on your VP level.' },
      { label: 'VP (★)', value: 'Earned through activity. Levels up your profile, unlocks perks, lowers your commission rate.' },
    ],
    extra: 'Every gem that exists was funded by coins someone bought with real money. The platform takes a commission (15-30% depending on your level) when coins convert to gems. This keeps the economy sustainable.',
  },
  {
    id: 'earning',
    icon: 'diamond',
    color: '#4DFFD4',
    title: 'How to Earn Real Money',
    content: 'There are three main ways to earn gems (cashable money) on VERGR:',
    items: [
      { label: 'Offer services', value: 'Coaching, editing, design, moderation — clients pay coins, you receive gems.' },
      { label: 'Win tournaments', value: 'Entry fees form the prize pool. Winners receive gems.' },
      { label: 'Receive tips', value: 'When someone tips you with coins, you get gems.' },
      { label: 'Cash out', value: 'Minimum 1000 gems (€10). Paid via Wise/PayPal. ~3% processor fee.' },
    ],
    extra: 'A coach charging 2000 coins/session at Rookie level keeps 1400 gems (€14). Five sessions/week = €280/month. At Mythic level: 1700 gems (€17) per session = €340/month.',
  },
  {
    id: 'coins',
    icon: 'paid',
    color: '#F5C542',
    title: 'Free Coin Bonuses',
    content: 'You earn small coin bonuses for high-value actions. These are marketing bonuses — the platform covers them.',
    items: [
      { label: '5-day login streak', value: '5 coins + 50 VP' },
      { label: 'Refer a friend', value: '25 coins + 500 VP each (both need paid sub + friend bought coins)' },
      { label: 'Lite sub (€0.99/mo)', value: '10 coins/month bonus' },
      { label: 'Pro sub (€2.99/mo)', value: '30 coins/month bonus' },
      { label: 'Buy coin packs', value: '10% bonus coins included' },
    ],
  },
  {
    id: 'vp',
    icon: 'star',
    color: '#7B6FFF',
    title: 'VP Levels & Perks',
    content: 'VP unlocks ranks with real benefits. Higher ranks mean lower commission on gems, coin purchase discounts, and profile customisation.',
    items: [
      { label: 'Rookie (0 VP)', value: 'Basic profile, 30% commission' },
      { label: 'Contender (500)', value: 'Bronze avatar ring, 28% commission' },
      { label: 'Rival (2,000)', value: 'Silver ring, coloured squad name, 25% commission' },
      { label: 'Elite (5,000)', value: 'Gold ring, 3% coin discount, 22% commission' },
      { label: 'Champion (15,000)', value: 'Platinum ring, 5% discount, LFG priority, 20% commission' },
      { label: 'Legend (40,000)', value: 'Diamond ring, 10% discount, weekly post boost, 18%' },
      { label: 'Mythic (100,000)', value: 'Animated ring, 15% discount, Mythic badge, 15% commission' },
    ],
  },
  {
    id: 'tiers',
    icon: 'workspace_premium',
    color: '#C87FFF',
    title: 'Subscription Tiers',
    content: 'VERGR has three tiers. Free gives you access to everything with ads. Lite removes ads. Pro gives you maximum quality and the most monthly coin bonus.',
    items: [
      { label: 'Free', value: 'Ads, 25MB uploads, 720p, 50 media/day' },
      { label: 'Lite (€0.99/mo)', value: 'No ads, 100MB, 1080p, +10 coins/month' },
      { label: 'Pro (€2.99/mo)', value: 'No ads, 500MB, 4K, +30 coins/month' },
    ],
  },
  {
    id: 'squads',
    icon: 'shield',
    color: '#4DFFD4',
    title: 'Squads',
    content: 'Squads are your gaming crew. Create or join a squad to compete together in tournaments, chat, share media, and climb the squad leaderboard. Every squad has a leadership structure elected by members.',
    items: [
      { label: 'President', value: 'Runs the squad. Set by creator, then monthly elections.' },
      { label: 'Vice President', value: 'Steps in if president is inactive 4+ days.' },
      { label: 'Treasury', value: 'Manages squad wallet and tournament entry fees.' },
      { label: 'Security', value: 'Moderates chat. Can mute members and start kick votes.' },
      { label: 'Members', value: 'Vote, contribute coins, and participate in everything.' },
    ],
    extra: 'Elections happen on the 1st of every month. Every member gets one vote. The person with the most votes becomes president. When squad members win tournaments, 10% of their prize automatically goes to the squad treasury.',
  },
  {
    id: 'tournaments',
    icon: 'emoji_events',
    color: '#FF4D6A',
    title: 'Tournaments',
    content: 'Anyone in a squad can create a tournament. Set an entry fee (in coins), and the entry fees form the prize pool. The bracket is generated automatically — single elimination. When you report match results, the next round generates on its own.',
    items: [
      { label: 'Entry fee', value: 'Set by creator (0 for free tournaments)' },
      { label: '1st place', value: '57% of pool (60% after mod fee, minus 10% squad contribution)' },
      { label: '2nd place', value: '24% of pool' },
      { label: '3rd/4th place', value: '~7% each' },
      { label: 'Moderator', value: '5% of total pool for running the tournament' },
      { label: 'Squad treasury', value: '10% of each winner\'s prize auto-contributed' },
    ],
  },
  {
    id: 'streams',
    icon: 'live_tv',
    color: '#C87FFF',
    title: 'Streaming',
    content: 'VERGR doesn\'t host streams directly. Instead, you link your Twitch, YouTube, Kick, or other streaming platform. When you go live there, your followers on VERGR see it and can watch the embedded stream right inside the app. Tournament moderators watch matches this way too.',
  },
  {
    id: 'posts',
    icon: 'edit_note',
    color: '#7B6FFF',
    title: 'Creating Content',
    content: 'Post text updates, photos, video clips, articles, LFG requests (looking for group), tier lists, achievements, and polls. Every like you receive earns you 1 coin. Repost and quote other users\' content. Bookmark posts to save them for later.',
    items: [
      { label: 'Text', value: 'Quick thoughts, updates' },
      { label: 'Photo', value: 'Screenshots, up to 10 images' },
      { label: 'Clip', value: 'Short video moments' },
      { label: 'Article', value: 'Long-form guides and blogs' },
      { label: 'LFG', value: 'Find players — game, platform, region, rank' },
      { label: 'Tier List', value: 'Rank anything in S/A/B/C/D tiers' },
      { label: 'Achievement', value: 'Show off your gaming wins' },
      { label: 'Poll', value: 'Ask the community anything' },
    ],
  },
  {
    id: 'moderation',
    icon: 'admin_panel_settings',
    color: '#F5C542',
    title: 'Moderation & Safety',
    content: 'Report any post, comment, or user through the three-dot menu. Reports are reviewed by moderators. Content that hits a report threshold is automatically hidden. Moderators earn coins by running tournaments (5% of the prize pool). Squad Security officers moderate squad chat and can mute or kick members via vote.',
  },
  {
    id: 'cashout',
    icon: 'account_balance',
    color: '#4DFFD4',
    title: 'Cashing Out',
    content: 'When your wallet has at least 1000 coins (€10), you can request a payout. VERGR takes a 10% platform fee, and the payment processor takes ~3%. You receive the rest via Wise (bank transfer), PayPal, or direct bank deposit. For example: 1000 coins = €10, minus €1 platform fee, minus ~€0.27 processor fee = you receive ~€8.73.',
  },
];

export default function HowItWorksScreen() {
  const navigate = useNavigate();
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();
  const [expandedId, setExpandedId] = useState('overview');

  useEffect(() => {
    setRightPanel(null);
    setContentAlign(isDesktop ? 'left' : 'center');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign, isDesktop]);

  return (
    <div className="min-h-screen pb-24 lg:pb-8">
      <TopBar showBack title="How VERGR Works" />

      <div className={`px-4 py-4 ${isDesktop ? 'max-w-2xl' : ''}`}>
        {/* Hero */}
        <div className="p-5 rounded-2xl bg-surface-1 border border-white/[0.06] mb-5">
          <h2 className="font-syne text-xl font-bold mb-2">Where Gamers Converge</h2>
          <p className="text-text-secondary text-sm leading-relaxed">
            VERGR is built for gamers who want more than just another social feed. 
            You earn real money for doing what you already do — gaming, posting, competing, and being part of a community.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-2">
          {SECTIONS.map(section => {
            const isExpanded = expandedId === section.id;
            return (
              <div key={section.id} className="rounded-2xl border border-white/[0.06] bg-surface-1 overflow-hidden">
                <button onClick={() => setExpandedId(isExpanded ? null : section.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface-2/30 transition-colors">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${section.color}15` }}>
                    <Icon name={section.icon} size={20} style={{ color: section.color }} />
                  </div>
                  <span className="flex-1 font-bold text-sm text-text-primary">{section.title}</span>
                  <Icon name={isExpanded ? 'expand_less' : 'expand_more'} size={20} className="text-text-muted" />
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-0">
                    <p className="text-text-secondary text-sm leading-relaxed mb-3">{section.content}</p>

                    {section.items && (
                      <div className="space-y-1.5">
                        {section.items.map((item, i) => (
                          <div key={i} className="flex items-start gap-2 py-1.5 px-3 rounded-lg bg-surface-2/50">
                            <span className="text-text-primary text-xs font-bold shrink-0 w-28">{item.label}</span>
                            <span className="text-text-secondary text-xs">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {section.extra && (
                      <p className="text-text-muted text-xs leading-relaxed mt-3 pl-3 border-l-2 border-brand-cyan/30">{section.extra}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-6 p-5 rounded-2xl bg-surface-1 border border-white/[0.06] text-center">
          <h3 className="font-syne font-bold text-base mb-2">Ready to start?</h3>
          <p className="text-text-secondary text-sm mb-4">Create your first post, join a squad, or enter a tournament.</p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => navigate('/create')} className="px-5 py-2.5 rounded-xl bg-brand-cyan text-bg-dark text-sm font-bold">Create Post</button>
            <button onClick={() => navigate('/squads')} className="px-5 py-2.5 rounded-xl bg-surface-2 border border-white/[0.06] text-text-secondary text-sm font-bold">Find a Squad</button>
          </div>
        </div>
      </div>
    </div>
  );
}
