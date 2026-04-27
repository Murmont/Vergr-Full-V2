import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/Icon';

const navItems = [
  { to: '/', label: 'Platform' },
  { to: '/store', label: 'Coins' },
  { to: '/download', label: 'Download' },
  { to: '/help', label: 'Help' },
];

const platformPillars = [
  {
    icon: 'live_tv',
    title: 'Live streams that feel native',
    body: 'Edge-to-edge viewing, fast chat, tips, stream health, and mobile-first controls for broadcasters and viewers.',
  },
  {
    icon: 'emoji_events',
    title: 'Skill-based tournaments',
    body: 'Brackets, prize pools, match verification, disputes, and payout tracking for competitive communities.',
  },
  {
    icon: 'groups',
    title: 'Squads with shared momentum',
    body: 'Create crews, coordinate events, share clips, and keep fans, teammates, and creators close.',
  },
  {
    icon: 'account_balance_wallet',
    title: 'Wallets with real utility',
    body: 'Coins power tips, memberships, tournament prizes, and boosts. Eligible earnings can be withdrawn through crypto payouts.',
  },
];

const economyFlows = [
  ['Fans buy coins', 'Coins are used inside VERGR for tips, memberships, tournament prizes, and boosts.'],
  ['Creators earn', 'Creators receive support from fans and eligible monetized activity. Creator quests award VP only.'],
  ['Winners get paid', 'Tournament prizes come from clear rules and defined brackets, not random chance mechanics.'],
  ['Withdraw eligible earnings', 'Approved balances can move to external crypto wallets, with fraud checks and payout controls.'],
];

const coinBundles = [
  { coins: 100, price: '$1.00', note: 'Try tipping' },
  { coins: 500, price: '$5.00', note: 'Boost ready' },
  { coins: 1000, price: '$10.00', note: 'Creator support' },
  { coins: 2500, price: '$25.00', note: 'Tournament night' },
];

const downloadCards = [
  ['Web app', 'Use VERGR in the browser today. No install required.', 'language', 'Open app', '/signup', true],
  ['Windows desktop', 'Planned desktop client for streaming, verification, and match result tools.', 'desktop_windows', 'Planned', '/download', false],
  ['iOS and Android', 'Planned mobile apps for viewing, chat, creator alerts, and wallet notifications.', 'phone_iphone', 'Planned', '/download', false],
];

const liveCreators = [
  ['@StreamQueen', 'from-cyan-300 via-fuchsia-500 to-rose-500', 'linear-gradient(135deg,#0F1118 0%,#203E58 45%,#FF2D7A 100%)'],
  ['@TheNexusGuy', 'from-violet-300 via-pink-500 to-brand-ember', 'linear-gradient(135deg,#211739 0%,#7830B5 48%,#4DFFD4 100%)'],
  ['CYBER_V', 'from-brand-cyan via-brand-violet to-brand-pink', 'linear-gradient(135deg,#172E3D 0%,#7B6FFF 48%,#07111B 100%)'],
  ['@Artist21', 'from-brand-gold via-brand-ember to-brand-pink', 'linear-gradient(135deg,#2D1B2D 0%,#F5C542 40%,#C87FFF 100%)'],
  ['@Scookmetik', 'from-pink-400 via-brand-ember to-brand-cyan', 'linear-gradient(135deg,#0B1628 0%,#FF4D6A 48%,#4DFFD4 100%)'],
];

const storySlides = [
  {
    key: 'creator',
    eyebrow: 'For streamers',
    title: 'Go live and turn a clutch moment into income.',
    body: 'A creator streams a finals match, fans tip during the win, memberships convert high-intent viewers, and eligible earnings move into payout review.',
    outcome: 'Live stream -> tips + memberships -> creator wallet',
    stat: '$648.39',
    statLabel: 'eligible earnings',
    accent: 'text-brand-ember',
  },
  {
    key: 'competitor',
    eyebrow: 'For competitive squads',
    title: 'Win skill-based tournaments with proof, not arguments.',
    body: 'Squads join posted brackets, results are verified, disputes have a trail, and prize pools are credited to eligible winners after checks.',
    outcome: 'Bracket -> verified result -> prize credited',
    stat: '$520',
    statLabel: 'finals prize',
    accent: 'text-brand-gold',
  },
  {
    key: 'fan',
    eyebrow: 'For fans',
    title: 'Back players, shape the feed, and be part of the run.',
    body: 'Fans follow live creators, tip big plays, boost posts, join memberships, and keep every stream, clip, and tournament story connected.',
    outcome: 'Watch -> tip -> boost -> belong',
    stat: '18.4K',
    statLabel: 'watching live',
    accent: 'text-brand-cyan',
  },
  {
    key: 'organizer',
    eyebrow: 'For organizers',
    title: 'Run events that feel premium from lobby to payout.',
    body: 'Tournament hosts get brackets, match control, standings, prize visibility, stream links, and an audit trail that makes competitive events credible.',
    outcome: 'Create event -> run bracket -> publish winners',
    stat: '64',
    statLabel: 'player bracket',
    accent: 'text-brand-violet',
  },
];

const legalSections = {
  privacy: {
    label: 'Privacy Policy',
    updated: 'Last updated: April 22, 2026',
    intro:
      'This Privacy Policy explains how VERGR collects, uses, and protects information when you use the platform.',
    sections: [
      ['Information we collect', 'We collect account details, profile information, content you create, device and usage data, payment-related records, wallet activity, and safety signals needed to operate the service.'],
      ['How we use information', 'We use information to provide accounts, posts, streams, chat, tournaments, creator tools, payments, safety systems, support, and service improvements.'],
      ['Wallets and payouts', 'Payment and crypto payout providers may process purchase, withdrawal, and verification information. VERGR stores records needed for balances, receipts, fraud prevention, and compliance.'],
      ['Safety and moderation', 'Reports, blocked words, account signals, stream safety checks, and moderation actions may be reviewed to protect users and enforce platform rules.'],
      ['Your choices', 'You can update account details in the app, adjust privacy settings, request data export where available, or request account deletion.'],
      ['Contact', 'Privacy questions can be sent to privacy@vergr.app when the mailbox is available.'],
    ],
  },
  terms: {
    label: 'Terms of Service',
    updated: 'Last updated: April 22, 2026',
    intro:
      'These Terms explain the rules for using VERGR. By creating an account or using the service, you agree to follow them.',
    sections: [
      ['Eligibility', 'You must be old enough to use online social, wallet, tournament, and payment features in your location, and you must provide accurate account information.'],
      ['Accounts', 'You are responsible for your login details and activity on your account. VERGR may restrict accounts that break these Terms or create safety risks.'],
      ['Coins and creator earnings', 'Coins are used inside VERGR for Tips, Memberships, Tournament prizes, and Boosts. Creator quests award VP only, not coins.'],
      ['No gambling position', 'VERGR tournament prizes are tied to skill-based competitions with posted rules and eligible participants. VERGR does not present random-chance betting, casino games, or wagering as a product feature.'],
      ['Content and conduct', 'You keep ownership of your content, but you grant VERGR permission to host, display, and distribute it inside the service. Illegal, abusive, deceptive, or harmful content is not allowed.'],
      ['Payouts and fraud checks', 'Eligible earnings may be withdrawn through supported payout methods, including crypto payout flows when available. Payouts can be delayed, reviewed, or denied for fraud, abuse, chargebacks, sanctions, or rules violations.'],
    ],
  },
};

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function MarketingStyles() {
  return (
    <style>{`
      .marketing-shell {
        background:
          linear-gradient(115deg, rgba(77,255,212,0.12), transparent 34%),
          linear-gradient(245deg, rgba(200,127,255,0.16), transparent 36%),
          linear-gradient(180deg, #07080D 0%, #0B0D14 48%, #07080D 100%);
      }
      .hero-stage {
        min-height: auto;
        background:
          linear-gradient(105deg, rgba(77,255,212,0.18) 0 1px, transparent 1px 120px),
          linear-gradient(255deg, rgba(200,127,255,0.13) 0 1px, transparent 1px 140px),
          linear-gradient(180deg, rgba(255,255,255,0.04), transparent 34%);
        background-size: 170px 170px, 190px 190px, 100% 100%;
        overflow-x: clip;
        overflow-y: visible;
      }
      .hero-stage::before {
        content: "";
        position: absolute;
        inset: 0;
        background:
          linear-gradient(110deg, transparent 0 38%, rgba(77,255,212,0.10) 39%, transparent 43%),
          linear-gradient(75deg, transparent 0 63%, rgba(255,77,106,0.10) 64%, transparent 68%);
        opacity: .75;
        pointer-events: none;
      }
      .hero-stage::after {
        content: "";
        position: absolute;
        inset: auto 0 0;
        height: 22%;
        background: linear-gradient(180deg, transparent, #07080D);
        pointer-events: none;
      }
      .hero-copy,
      .hero-visual-cell {
        position: relative;
        z-index: 2;
        min-width: 0;
      }
      .hero-visual-cell {
        overflow: hidden;
        isolation: isolate;
      }
      .hero-visual {
        width: min(100%, 680px);
      }
      .product-story-scene {
        min-height: 640px;
        background:
          radial-gradient(circle at 26% 26%, rgba(255,77,106,.22), transparent 22rem),
          radial-gradient(circle at 72% 30%, rgba(77,255,212,.18), transparent 26rem),
          linear-gradient(135deg, rgba(22,25,34,.88), rgba(7,8,13,.96));
        isolation: isolate;
      }
      .product-story-scene::before {
        content: "";
        position: absolute;
        inset: 0;
        background:
          linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
        background-size: 44px 44px;
        mask-image: linear-gradient(180deg, rgba(0,0,0,.88), transparent 88%);
        pointer-events: none;
      }
      .story-stream-card {
        animation: storyFloat 7s ease-in-out infinite;
      }
      .story-wallet-card {
        animation: storyFloat 7s ease-in-out infinite reverse;
      }
      .story-bracket {
        animation: bracketPulse 4.8s ease-in-out infinite;
      }
      .story-beam {
        animation: beamFlow 2.9s ease-in-out infinite;
      }
      .story-chat {
        animation: chatRise 6s ease-in-out infinite;
      }
      .story-chat:nth-child(2) { animation-delay: -1.4s; }
      .story-chat:nth-child(3) { animation-delay: -2.8s; }
      .coin-orbit {
        animation: coinOrbit 4.4s ease-in-out infinite;
      }
      .coin-orbit:nth-child(2) { animation-delay: -1.1s; }
      .coin-orbit:nth-child(3) { animation-delay: -2.2s; }
      .win-flash {
        animation: winFlash 2.8s ease-in-out infinite;
      }
      .payout-progress {
        animation: payoutProgress 4.8s ease-in-out infinite;
      }
      .story-carousel-shell {
        min-height: 680px;
        background:
          radial-gradient(circle at 24% 18%, rgba(255,77,106,.23), transparent 22rem),
          radial-gradient(circle at 78% 22%, rgba(77,255,212,.2), transparent 25rem),
          radial-gradient(circle at 54% 86%, rgba(123,111,255,.18), transparent 24rem),
          linear-gradient(135deg, rgba(18,21,34,.92), rgba(7,8,13,.98));
        isolation: isolate;
      }
      .story-carousel-shell::before {
        content: "";
        position: absolute;
        inset: 0;
        background:
          linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
        background-size: 46px 46px;
        mask-image: linear-gradient(180deg, rgba(0,0,0,.88), transparent 92%);
        pointer-events: none;
      }
      .story-perspective {
        perspective: 1200px;
      }
      .story-3d {
        min-height: 540px;
        transform-style: preserve-3d;
        overflow: visible;
      }
      .scene-floor {
        position: absolute;
        left: 50%;
        bottom: 24px;
        width: min(86%, 520px);
        height: 190px;
        border-radius: 999px;
        transform: translateX(-50%) rotateX(68deg);
        background:
          radial-gradient(circle, rgba(77,255,212,.22), transparent 56%),
          linear-gradient(90deg, rgba(255,77,106,.22), rgba(123,111,255,.22));
        border: 1px solid rgba(77,255,212,.24);
        filter: drop-shadow(0 0 36px rgba(77,255,212,.22));
      }
      .scene-core {
        animation: sceneFloat 6s ease-in-out infinite;
        transform-style: preserve-3d;
      }
      .holo-phone {
        transform: rotateY(-15deg) rotateX(5deg) rotateZ(-2deg);
        box-shadow: 0 34px 110px rgba(0,0,0,.68), 0 0 46px rgba(77,255,212,.16);
      }
      .holo-card {
        transform: rotateY(14deg) rotateX(5deg) rotateZ(2deg);
        box-shadow: 0 34px 110px rgba(0,0,0,.68), 0 0 46px rgba(255,77,106,.14);
      }
      .trophy-3d {
        animation: trophySpin 7s ease-in-out infinite;
        transform-style: preserve-3d;
      }
      .energy-beam {
        animation: energyBeam 2.6s ease-in-out infinite;
      }
      @keyframes sceneFloat {
        0%, 100% { transform: translate3d(0,0,0); }
        50% { transform: translate3d(0,-14px,28px); }
      }
      @keyframes trophySpin {
        0%, 100% { transform: rotateY(-18deg) rotateX(8deg); }
        50% { transform: rotateY(18deg) rotateX(4deg) translateY(-8px); }
      }
      @keyframes energyBeam {
        0%, 100% { opacity: .28; transform: scaleX(.72); }
        50% { opacity: 1; transform: scaleX(1); }
      }
      .hero-phone {
        transform: rotate(-10deg) perspective(900px) rotateY(-12deg);
        animation: phoneFloat 8s ease-in-out infinite;
      }
      .live-glass {
        transform: rotate(-8deg);
        animation: glassFloat 7s ease-in-out infinite;
      }
      .creator-rail {
        animation: creatorDrift 18s linear infinite;
      }
      .live-avatar {
        box-shadow: 0 0 0 4px rgba(255,77,106,.92), 0 0 34px rgba(255,45,85,.92), 0 0 52px rgba(77,255,212,.18);
      }
      .hero-scanline {
        animation: scanline 4.4s linear infinite;
      }
      .metric-pop {
        animation: metricPop 4.6s ease-in-out infinite;
      }
      .metric-pop:nth-child(2) { animation-delay: -1.35s; }
      .metric-pop:nth-child(3) { animation-delay: -2.7s; }
      .ticker-track {
        animation: ticker 22s linear infinite;
        will-change: transform;
      }
      .ticker-group {
        display: flex;
        gap: 12px;
        padding-right: 12px;
        flex: 0 0 auto;
      }
      @keyframes phoneFloat {
        0%, 100% { transform: rotate(-10deg) perspective(900px) rotateY(-12deg) translate3d(0,0,0); }
        50% { transform: rotate(-10deg) perspective(900px) rotateY(-12deg) translate3d(0,-14px,0); }
      }
      @keyframes glassFloat {
        0%, 100% { transform: rotate(-8deg) translate3d(0,0,0); }
        50% { transform: rotate(-8deg) translate3d(0,-10px,0); }
      }
      @keyframes creatorDrift {
        0% { transform: translateX(0); }
        100% { transform: translateX(-48%); }
      }
      @keyframes scanline {
        0% { transform: translateY(-40%); opacity: 0; }
        12%, 70% { opacity: .55; }
        100% { transform: translateY(220%); opacity: 0; }
      }
      @keyframes metricPop {
        0%, 100% { transform: translateY(0); opacity: .72; }
        50% { transform: translateY(-5px); opacity: 1; }
      }
      @keyframes ticker {
        to { transform: translateX(-50%); }
      }
      @keyframes storyFloat {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }
      @keyframes bracketPulse {
        0%, 100% { filter: drop-shadow(0 0 0 rgba(245,197,66,0)); opacity: .88; }
        50% { filter: drop-shadow(0 0 18px rgba(245,197,66,.45)); opacity: 1; }
      }
      @keyframes beamFlow {
        0%, 100% { opacity: .34; transform: scaleX(.82); }
        50% { opacity: 1; transform: scaleX(1); }
      }
      @keyframes chatRise {
        0%, 100% { opacity: .2; transform: translateY(18px); }
        18%, 72% { opacity: 1; transform: translateY(0); }
      }
      @keyframes coinOrbit {
        0%, 100% { transform: translate3d(0,0,0) rotate(0deg); opacity: .35; }
        50% { transform: translate3d(var(--x, 18px), var(--y, -26px), 0) rotate(12deg); opacity: 1; }
      }
      @keyframes winFlash {
        0%, 100% { box-shadow: 0 0 0 rgba(255,77,106,0); }
        50% { box-shadow: 0 0 42px rgba(255,77,106,.45); }
      }
      @keyframes payoutProgress {
        0% { width: 18%; }
        50% { width: 74%; }
        100% { width: 100%; }
      }
      @media (max-width: 1023px) {
        .hero-visual {
          height: 520px;
          margin-top: 16px;
        }
      }
      @media (max-width: 639px) {
        .hero-visual {
          height: 430px;
        }
        .live-glass {
          top: 150px;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .hero-phone, .live-glass, .creator-rail, .hero-scanline, .metric-pop, .story-stream-card, .story-wallet-card, .story-bracket, .story-beam, .story-chat, .coin-orbit, .win-flash, .payout-progress, .story-3d, .scene-core, .trophy-3d, .energy-beam, .ticker-track {
          animation: none;
        }
      }
    `}</style>
  );
}

function MarketingShell({ children }) {
  return (
    <div className="marketing-shell min-h-screen text-text-primary font-dmsans">
      <MarketingStyles />
      <header className="sticky top-0 z-40 border-b border-white/10 bg-bg-dark/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-syne text-xl font-extrabold text-white">
            <span className="h-2.5 w-2.5 rounded-sm bg-brand-cyan shadow-[0_0_18px_rgba(77,255,212,0.85)]" />
            VERGR
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-md px-3 py-2 text-sm font-semibold text-text-secondary transition hover:bg-white/5 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-md border border-white/15 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/5"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="rounded-md bg-brand-cyan px-3 py-2 text-sm font-extrabold text-bg-dark transition hover:bg-white"
            >
              Join beta
            </Link>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-white/10 px-4 py-8 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-6 text-sm text-text-muted md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="font-syne text-lg font-extrabold text-white">VERGR</div>
            <p className="mt-1 max-w-2xl">A gaming social platform for streams, squads, creator income, tournaments, and verified competitive moments.</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link to="/privacy" className="hover:text-white">Privacy</Link>
            <Link to="/terms" className="hover:text-white">Terms</Link>
            <Link to="/help" className="hover:text-white">Help</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Section({ eyebrow, title, body, children, className }) {
  return (
    <section className={cx('px-4 py-14 sm:px-6 lg:py-20', className)}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 max-w-3xl">
          {eyebrow && <p className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-brand-cyan">{eyebrow}</p>}
          <h2 className="font-syne text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl">{title}</h2>
          {body && <p className="mt-4 text-base leading-7 text-text-secondary sm:text-lg">{body}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}

function Ticker() {
  const items = ['Live stream', 'Squads', 'Tips', 'Memberships', 'Tournament prizes', 'Boosts', 'Crypto payouts', 'VP ranks', 'Match verification'];
  const renderItems = (suffix) => items.map((item) => (
    <span key={`${item}-${suffix}`} className="inline-flex min-h-12 items-center gap-2 rounded-md border border-white/10 bg-bg-dark px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-text-secondary">
      <span className="h-1.5 w-1.5 rounded-sm bg-brand-cyan" />
      {item}
    </span>
  ));

  return (
    <div className="relative z-10 overflow-hidden border-y border-white/10 bg-white/[0.03] py-3">
      <div className="ticker-track flex w-max">
        <div className="ticker-group">{renderItems('a')}</div>
        <div className="ticker-group" aria-hidden="true">{renderItems('b')}</div>
      </div>
    </div>
  );
}

function Story3DScene({ slide }) {
  return (
    <div className="story-perspective">
      <div className={cx('story-3d relative overflow-hidden rounded-lg border border-white/10 bg-black/35', `story-${slide.key}`)}>
        <div className="scene-floor" />
        <div className="energy-beam absolute left-[14%] right-[14%] top-1/2 h-1 origin-left rounded-full bg-gradient-to-r from-brand-ember via-brand-cyan to-brand-gold" />

        {slide.key === 'creator' && (
          <>
            <div className="scene-core holo-phone absolute left-[8%] top-20 h-[340px] w-[220px] rounded-[32px] border border-white/15 bg-black p-2">
              <div className="relative h-full overflow-hidden rounded-[26px] bg-[linear-gradient(160deg,#151A32,#07080D_70%)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_32%,rgba(255,77,106,.32),transparent_11rem)]" />
                <div className="absolute left-4 top-5 flex items-center gap-2">
                  <span className="rounded-md bg-brand-ember px-2 py-1 font-dmmono text-xs font-black text-white">LIVE</span>
                  <span className="font-dmmono text-xs font-bold text-brand-cyan tabular-nums">18.4K</span>
                </div>
                <div className="absolute left-1/2 top-24 h-24 w-24 -translate-x-1/2 rounded-full bg-[linear-gradient(135deg,#4DFFD4,#C87FFF_45%,#FF4D6A)] shadow-[0_0_42px_rgba(255,77,106,.42)]" />
                <div className="absolute bottom-0 left-1/2 h-44 w-48 -translate-x-1/2 rounded-t-full bg-[linear-gradient(135deg,#1A2035,#31406F_48%,#111827)]" />
                <div className="absolute bottom-5 left-4 right-4 rounded-md border border-brand-gold/35 bg-black/55 p-3 backdrop-blur">
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-brand-gold">Finals won</p>
                  <p className="font-dmmono text-2xl font-black text-white tabular-nums">+$520</p>
                </div>
              </div>
            </div>
            <div className="holo-card absolute right-[6%] top-28 w-[260px] rounded-lg border border-brand-cyan/30 bg-black/65 p-4 backdrop-blur-xl">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-cyan">Creator wallet</p>
              <p className="mt-3 font-dmmono text-4xl font-black text-white tabular-nums">$648.39</p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="payout-progress h-full rounded-full bg-gradient-to-r from-brand-gold via-brand-cyan to-brand-violet" />
              </div>
              <p className="mt-3 text-xs leading-5 text-text-muted">Tips, memberships, boosts, and prize earnings move into payout review.</p>
            </div>
          </>
        )}

        {slide.key === 'competitor' && (
          <>
            <div className="trophy-3d absolute left-1/2 top-16 flex h-48 w-48 -translate-x-1/2 items-center justify-center rounded-full border border-brand-gold/35 bg-brand-gold/10 shadow-[0_0_72px_rgba(245,197,66,.28)]">
              <Icon name="emoji_events" size={104} className="text-brand-gold" />
            </div>
            <div className="absolute bottom-20 left-[8%] right-[8%] grid gap-3 md:grid-cols-3">
              {['Quarterfinal', 'Semifinal', 'Grand Final'].map((round, index) => (
                <div key={round} className="story-bracket rounded-lg border border-white/10 bg-black/62 p-4 backdrop-blur">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-text-muted">{round}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-syne text-lg font-extrabold text-white">Squad V</span>
                    <span className={cx('font-dmmono text-sm font-black tabular-nums', index === 2 ? 'text-brand-gold' : 'text-brand-cyan')}>{index === 2 ? 'WIN' : 'W'}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {slide.key === 'fan' && (
          <>
            <div className="absolute left-1/2 top-12 w-[min(92%,620px)] -translate-x-1/2 rounded-lg border border-brand-cyan/40 bg-[#172034]/72 p-5 shadow-[0_0_52px_rgba(77,255,212,.22)] backdrop-blur-xl">
              <div className="flex justify-center gap-5">
                {liveCreators.slice(0, 4).map(([handle, ring, fill]) => (
                  <div key={handle} className="text-center">
                    <div className={cx('live-avatar h-20 w-20 rounded-full bg-gradient-to-br p-1', ring)}>
                      <div className="h-full w-full rounded-full" style={{ background: fill }} />
                    </div>
                    <p className="mt-2 max-w-24 truncate text-xs font-bold text-white">{handle}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute bottom-20 left-[12%] right-[12%] grid gap-3 md:grid-cols-3">
              {[
                ['Tip', '+100c', 'paid'],
                ['Boost', 'Clip rising', 'rocket_launch'],
                ['Join', 'Tier 1', 'workspace_premium'],
              ].map(([title, value, icon]) => (
                <div key={title} className="rounded-lg border border-white/10 bg-black/62 p-4 text-center backdrop-blur">
                  <Icon name={icon} size={28} className="mx-auto text-brand-cyan" />
                  <p className="mt-2 font-syne text-lg font-extrabold text-white">{title}</p>
                  <p className="font-dmmono text-sm font-black text-brand-gold tabular-nums">{value}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {slide.key === 'organizer' && (
          <>
            <div className="holo-card absolute left-[8%] top-16 w-[330px] rounded-lg border border-brand-violet/35 bg-black/65 p-4 backdrop-blur-xl">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-violet">Event control</p>
              <p className="mt-2 font-syne text-2xl font-extrabold text-white">Squad Clash Finals</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {['Check-in', 'Match room', 'Prize pool', 'Disputes'].map((item) => (
                  <div key={item} className="rounded-md border border-white/10 bg-white/[0.04] p-3 text-xs font-bold text-text-secondary">{item}</div>
                ))}
              </div>
            </div>
            <div className="scene-core absolute right-[10%] top-20 h-72 w-56 rounded-lg border border-brand-cyan/30 bg-black/55 p-4 backdrop-blur">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-cyan">Live bracket</p>
              {['64 players', '16 squads', '4 rounds', '1 winner'].map((item, index) => (
                <div key={item} className="mt-4 flex items-center gap-3">
                  <span className="h-3 w-3 rounded-sm bg-brand-cyan shadow-[0_0_18px_rgba(77,255,212,.75)]" />
                  <span className={cx('font-dmmono text-sm font-black tabular-nums', index === 3 ? 'text-brand-gold' : 'text-white')}>{item}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="absolute bottom-4 left-4 right-4 z-30 grid grid-cols-3 gap-2">
          {[
            [slide.stat, slide.statLabel, 'text-brand-gold'],
            ['Verified', 'result flow', 'text-brand-cyan'],
            ['USDC', 'payout rail', 'text-brand-violet'],
          ].map(([value, label, color]) => (
            <div key={`${value}-${label}`} className="rounded-md border border-white/10 bg-black/72 px-3 py-2 text-center backdrop-blur">
              <p className={cx('truncate font-dmmono text-xs font-black tabular-nums', color)}>{value}</p>
              <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.08em] text-text-muted">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductStoryCarousel() {
  const [active, setActive] = useState(0);
  const slide = storySlides[active];

  useEffect(() => {
    const id = window.setInterval(() => {
      setActive((value) => (value + 1) % storySlides.length);
    }, 7000);
    return () => window.clearInterval(id);
  }, []);

  const go = (direction) => {
    setActive((value) => (value + direction + storySlides.length) % storySlides.length);
  };

  return (
    <section className="hero-stage relative z-10 px-4 py-8 sm:px-6 lg:py-10">
      <div className="mx-auto max-w-7xl">
        <div className="story-carousel-shell relative rounded-lg border border-white/10 p-4 shadow-[0_32px_120px_rgba(0,0,0,.55)] sm:p-6 lg:p-8">
          <div className="relative z-10 grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
            <div>
              <p className="mb-4 inline-flex items-center gap-2 rounded-md border border-brand-cyan/25 bg-brand-cyan/10 px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-brand-cyan shadow-[0_0_28px_rgba(77,255,212,.16)]">
                <Icon name="bolt" size={16} />
                Live gaming, creator money, verified competition
              </p>
              <p className={cx('text-xs font-black uppercase tracking-[0.22em]', slide.accent)}>{slide.eyebrow}</p>
              <h1 className="mt-3 font-syne text-4xl font-extrabold leading-[0.96] text-white sm:text-5xl xl:text-6xl">
                {slide.title}
              </h1>
              <p className="mt-5 text-base leading-7 text-text-secondary sm:text-lg">{slide.body}</p>
              <p className="mt-3 text-sm leading-6 text-text-muted">
                Skill-based competitions, posted rules, result verification, and payout checks. No casino mechanics, no random-chance betting, no wagering against the house.
              </p>
              <div className="mt-6 rounded-lg border border-white/10 bg-black/45 p-4 backdrop-blur">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-text-muted">Outcome</p>
                <p className="mt-2 font-syne text-xl font-extrabold text-white">{slide.outcome}</p>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <div>
                    <p className={cx('font-dmmono text-4xl font-black tabular-nums', slide.accent)}>{slide.stat}</p>
                    <p className="text-xs font-bold text-text-muted">{slide.statLabel}</p>
                  </div>
                  <span className="rounded-md border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-2 font-dmmono text-xs font-black text-brand-cyan tabular-nums">
                    no wagering
                  </span>
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link to="/signup" className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-cyan px-5 py-3 font-extrabold text-bg-dark transition hover:bg-white">
                  Claim your handle
                  <Icon name="arrow_forward" size={20} />
                </Link>
                <Link to="/download" className="inline-flex items-center justify-center gap-2 rounded-md border border-white/15 px-5 py-3 font-bold text-white transition hover:bg-white/5">
                  <Icon name="play_circle" size={20} />
                  Preview platform
                </Link>
              </div>
              <div className="mt-6 rounded-lg border border-white/10 bg-black/30 p-3 backdrop-blur">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => go(-1)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-white/15 text-white transition hover:bg-white/10"
                    aria-label="Previous story"
                  >
                    <Icon name="arrow_back" size={20} />
                  </button>
                  <div className="min-w-0 text-center">
                    <p className="font-dmmono text-xs font-black uppercase tracking-[0.18em] text-brand-cyan tabular-nums">
                      Slide {active + 1} / {storySlides.length}
                    </p>
                    <p className="truncate text-xs font-bold text-text-muted">{slide.eyebrow}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => go(1)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-white/15 text-white transition hover:bg-white/10"
                    aria-label="Next story"
                  >
                    <Icon name="arrow_forward" size={20} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {storySlides.map((item, index) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setActive(index)}
                      className={cx(
                        'min-h-14 rounded-md border px-3 py-2 text-left transition',
                        index === active
                          ? 'border-brand-cyan bg-brand-cyan/12 text-white shadow-[0_0_24px_rgba(77,255,212,.16)]'
                          : 'border-white/10 bg-white/[0.03] text-text-muted hover:border-white/25 hover:text-white'
                      )}
                      aria-current={index === active ? 'true' : undefined}
                    >
                      <span className="block font-dmmono text-[11px] font-black tabular-nums">0{index + 1}</span>
                      <span className="mt-1 block truncate text-xs font-black uppercase tracking-[0.08em]">{item.eyebrow.replace('For ', '')}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Story3DScene slide={slide} />
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductStoryScene() {
  const chatItems = [
    ['@RiftMain', 'clutch finish', '+50c'],
    ['@Nova', 'membership unlocked', '+$4.99'],
    ['@CasterJay', 'boosted the final', '+200c'],
  ];

  return (
    <section className="relative z-10 px-4 pb-12 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="product-story-scene relative overflow-hidden rounded-lg border border-white/10 p-4 shadow-[0_32px_120px_rgba(0,0,0,.55)] sm:p-6 lg:p-8">
          <div className="relative z-10 mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-cyan">How VERGR works</p>
              <h2 className="mt-2 max-w-3xl font-syne text-3xl font-extrabold leading-tight text-white sm:text-4xl">
                A creator goes live, wins the bracket, and gets paid.
              </h2>
            </div>
            <div className="rounded-md border border-white/10 bg-black/45 px-3 py-2 font-dmmono text-xs font-bold text-text-secondary tabular-nums">
              skill based final · verified result · payout checks
            </div>
          </div>

          <div className="relative z-10 grid gap-4 lg:grid-cols-[1.08fr_0.42fr_0.9fr]">
            <div className="story-stream-card relative min-h-[390px] overflow-hidden rounded-lg border border-brand-ember/30 bg-black/55 shadow-[0_0_52px_rgba(255,77,106,.12)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_34%,rgba(255,77,106,.28),transparent_22rem),linear-gradient(145deg,rgba(77,255,212,.14),transparent_42%)]" />
              <div className="absolute left-4 top-4 z-10 flex items-center gap-2">
                <span className="rounded-md bg-brand-ember px-2 py-1 font-dmmono text-xs font-black text-white tabular-nums">LIVE</span>
                <span className="rounded-md bg-black/50 px-2 py-1 font-dmmono text-xs font-bold text-brand-cyan tabular-nums">18.4K watching</span>
              </div>
              <div className="absolute right-4 top-4 z-10 rounded-md bg-black/50 px-2 py-1 font-dmmono text-xs font-bold text-brand-gold tabular-nums">
                Finals · BO3
              </div>

              <div className="absolute inset-x-8 bottom-20 top-16 rounded-lg border border-white/10 bg-[#111827]/70">
                <div className="absolute inset-0 overflow-hidden rounded-lg">
                  <div className="absolute left-1/2 top-14 h-28 w-28 -translate-x-1/2 rounded-full bg-[linear-gradient(135deg,#4DFFD4,#C87FFF_45%,#FF4D6A)] opacity-90 blur-sm" />
                  <div className="absolute left-1/2 top-20 h-24 w-24 -translate-x-1/2 rounded-full bg-[#10131D] shadow-[0_0_34px_rgba(77,255,212,.35)]" />
                  <div className="absolute left-1/2 bottom-0 h-44 w-52 -translate-x-1/2 rounded-t-full bg-[linear-gradient(135deg,#182032,#273B68_45%,#10131D)]" />
                  <div className="win-flash absolute left-1/2 top-36 flex h-24 w-24 -translate-x-1/2 items-center justify-center rounded-full border border-brand-gold/45 bg-brand-gold/10">
                    <Icon name="emoji_events" size={56} className="text-brand-gold" />
                  </div>
                </div>
              </div>

              <div className="absolute bottom-4 left-4 right-4 z-10 rounded-lg border border-brand-gold/35 bg-black/70 p-4 backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-gold">Tournament won</p>
                    <p className="mt-1 font-syne text-2xl font-extrabold text-white">StreamQueen takes Grand Finals</p>
                  </div>
                  <div className="text-right">
                    <p className="font-dmmono text-3xl font-black text-brand-gold tabular-nums">$520</p>
                    <p className="text-xs font-bold text-text-muted">prize credited</p>
                  </div>
                </div>
              </div>

              <div className="absolute left-5 top-24 z-20 hidden w-56 space-y-2 md:block">
                {chatItems.map(([user, body, amount]) => (
                  <div key={user} className="story-chat rounded-md border border-white/10 bg-black/58 p-2 backdrop-blur">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white">{user}</span>
                      <span className="font-dmmono text-xs font-black text-brand-cyan tabular-nums">{amount}</span>
                    </div>
                    <p className="mt-1 text-xs text-text-muted">{body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative hidden min-h-[390px] items-center justify-center lg:flex">
              <div className="story-beam absolute left-0 right-0 top-1/2 h-1 origin-left rounded-full bg-gradient-to-r from-brand-gold via-brand-cyan to-brand-violet" />
              <div className="coin-orbit absolute left-8 top-32 flex h-12 w-12 items-center justify-center rounded-full border border-brand-gold/40 bg-brand-gold/15 font-dmmono font-black text-brand-gold" style={{ '--x': '52px', '--y': '-36px' }}>$</div>
              <div className="coin-orbit absolute right-10 top-44 flex h-10 w-10 items-center justify-center rounded-full border border-brand-cyan/40 bg-brand-cyan/15 font-dmmono font-black text-brand-cyan" style={{ '--x': '-42px', '--y': '-28px' }}>c</div>
              <div className="coin-orbit absolute left-1/2 bottom-28 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full border border-brand-violet/40 bg-brand-violet/15 font-dmmono font-black text-brand-violet" style={{ '--x': '18px', '--y': '-42px' }}>VP</div>
              <div className="relative z-10 rounded-full border border-white/10 bg-black/65 p-5 shadow-[0_0_48px_rgba(77,255,212,.18)]">
                <Icon name="sync_alt" size={42} className="text-brand-cyan" />
              </div>
            </div>

            <div className="story-wallet-card relative min-h-[390px] overflow-hidden rounded-lg border border-brand-cyan/30 bg-black/55 p-4 shadow-[0_0_52px_rgba(77,255,212,.12)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_68%_28%,rgba(77,255,212,.22),transparent_18rem),linear-gradient(145deg,rgba(123,111,255,.16),transparent_48%)]" />
              <div className="relative z-10">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-cyan">Wallet outcome</p>
                    <h3 className="mt-1 font-syne text-2xl font-extrabold text-white">Eligible earnings</h3>
                  </div>
                  <Icon name="account_balance_wallet" size={34} className="text-brand-cyan" />
                </div>

                <div className="rounded-lg border border-white/10 bg-black/55 p-4">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-text-muted">Available after checks</p>
                      <p className="mt-1 font-dmmono text-4xl font-black text-white tabular-nums">$648.39</p>
                    </div>
                    <span className="rounded-md bg-brand-cyan px-2 py-1 font-dmmono text-xs font-black text-bg-dark tabular-nums">USDC</span>
                  </div>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="payout-progress h-full rounded-full bg-gradient-to-r from-brand-gold via-brand-cyan to-brand-violet" />
                  </div>
                  <div className="mt-3 flex justify-between text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted">
                    <span>Result</span>
                    <span>Review</span>
                    <span>Payout</span>
                  </div>
                </div>

                <div className="story-bracket mt-4 rounded-lg border border-brand-gold/25 bg-black/45 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-syne text-lg font-extrabold text-white">Verified bracket</p>
                    <Icon name="verified" size={22} className="text-brand-gold" />
                  </div>
                  {['Quarterfinal', 'Semifinal', 'Grand final'].map((round, index) => (
                    <div key={round} className="mb-2 grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 last:mb-0">
                      <span className="text-sm font-bold text-text-secondary">{round}</span>
                      <span className={cx('font-dmmono text-xs font-black tabular-nums', index === 2 ? 'text-brand-gold' : 'text-brand-cyan')}>{index === 2 ? 'WIN' : 'W'}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    ['Tips', '+$88'],
                    ['Prize', '+$520'],
                    ['Boosts', '24'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-md border border-white/10 bg-black/45 p-3 text-center">
                      <p className="font-dmmono text-lg font-black text-white tabular-nums">{value}</p>
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-5 grid gap-3 md:grid-cols-4">
            {[
              ['1', 'Go live', 'Stream starts with chat, tips, and viewer actions.'],
              ['2', 'Win the final', 'The bracket records a skill-based result.'],
              ['3', 'Credit earnings', 'Prize, tips, and boosts update the wallet.'],
              ['4', 'Withdraw', 'Eligible balances move through payout checks.'],
            ].map(([step, title, body]) => (
              <div key={step} className="rounded-md border border-white/10 bg-black/42 p-4 backdrop-blur">
                <div className="font-dmmono text-xs font-black text-brand-cyan tabular-nums">0{step}</div>
                <h3 className="mt-2 font-syne text-lg font-extrabold text-white">{title}</h3>
                <p className="mt-1 text-xs leading-5 text-text-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingScreen() {
  return (
    <MarketingShell>
      <ProductStoryCarousel />
      <Ticker />

      <Section
        eyebrow="Platform"
        title="One product surface for the moments gaming communities already care about."
        body="The roadmap points toward a complete ecosystem: immersive live screens, creator monetization, verified results, smarter onboarding, and safety systems that can grow without paid service sprawl."
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {platformPillars.map((card) => (
            <article key={card.title} className="rounded-lg border border-white/10 bg-surface-1 p-5 transition hover:-translate-y-1 hover:border-brand-cyan/35">
              <Icon name={card.icon} size={30} className="text-brand-cyan" />
              <h3 className="mt-4 font-syne text-xl font-extrabold text-white">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{card.body}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Earnings"
        title="Real-money outcomes without gambling positioning."
        body="The economy should be easy to understand: users buy coins for platform actions, creators and competitors earn through defined activity, and eligible earnings can be withdrawn after checks."
        className="border-y border-white/10 bg-surface-1/45"
      >
        <div className="grid gap-4 lg:grid-cols-4">
          {economyFlows.map(([title, body], index) => (
            <div key={title} className="rounded-lg border border-white/10 bg-bg-dark p-5">
              <div className="font-dmmono text-sm font-black text-brand-gold tabular-nums">0{index + 1}</div>
              <h3 className="mt-3 font-syne text-2xl font-extrabold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{body}</p>
            </div>
          ))}
        </div>
      </Section>

      <section className="px-4 py-14 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-6 rounded-lg border border-brand-cyan/30 bg-brand-cyan p-6 text-bg-dark md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="font-syne text-3xl font-extrabold">Build the first cohort around creators and competitive squads.</h2>
            <p className="mt-2 max-w-3xl font-semibold text-bg-dark/80">
              Start with the web app, prove retention through streams and tournaments, then add desktop verification and mobile-native viewing.
            </p>
          </div>
          <Link to="/signup" className="inline-flex items-center justify-center gap-2 rounded-md bg-bg-dark px-5 py-3 font-extrabold text-white">
            Join beta
            <Icon name="arrow_forward" size={20} />
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}

export function StoreScreen() {
  return (
    <MarketingShell>
      <Section
        eyebrow="Coin Store"
        title="Coins should feel like fuel, not confusion."
        body="Coins power Tips, Memberships, Tournament prizes, and Boosts. Earnings that users receive from eligible activity can be withdrawn through supported payout flows after review."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {coinBundles.map((bundle) => (
            <article key={bundle.coins} className="rounded-lg border border-white/10 bg-surface-1 p-5 transition hover:-translate-y-1 hover:border-brand-gold/40">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-gold">{bundle.note}</p>
              <div className="mt-4 font-dmmono text-3xl font-black text-white tabular-nums">{bundle.coins.toLocaleString()}c</div>
              <div className="mt-1 font-dmmono text-lg font-bold text-text-secondary tabular-nums">{bundle.price}</div>
              <Link to="/signup" className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-brand-cyan px-4 py-3 font-extrabold text-bg-dark">
                Start account
              </Link>
            </article>
          ))}
        </div>
      </Section>
      <Section
        eyebrow="Important distinction"
        title="Tournament prizes are competition rewards."
        body="VERGR should describe tournaments as skill-based competitions with posted rules, eligible entrants, brackets, verification, and dispute handling. Avoid casino language, random-chance mechanics, or anything that sounds like betting against the house."
        className="border-t border-white/10 bg-surface-1/45"
      >
        <div className="grid gap-4 md:grid-cols-3">
          {['Posted rules', 'Verified results', 'Fraud checks'].map((item) => (
            <div key={item} className="rounded-lg border border-white/10 bg-bg-dark p-5">
              <Icon name="verified_user" size={26} className="text-brand-cyan" />
              <h3 className="mt-3 font-syne text-xl font-extrabold text-white">{item}</h3>
            </div>
          ))}
        </div>
      </Section>
    </MarketingShell>
  );
}

export function DownloadScreen() {
  return (
    <MarketingShell>
      <Section
        eyebrow="Download"
        title="Web first. Desktop and mobile when they unlock the next product layer."
        body="The public site should send early users to the web app now, while the roadmap reserves desktop for verified match tooling and mobile apps for immersive viewing, chat, alerts, and wallet flows."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {downloadCards.map(([title, body, icon, cta, to, active]) => (
            <article key={title} className="rounded-lg border border-white/10 bg-surface-1 p-5">
              <Icon name={icon} size={34} className={active ? 'text-brand-cyan' : 'text-text-muted'} />
              <h3 className="mt-4 font-syne text-2xl font-extrabold text-white">{title}</h3>
              <p className="mt-2 min-h-20 text-sm leading-6 text-text-secondary">{body}</p>
              <Link
                to={to}
                className={cx(
                  'mt-5 inline-flex w-full items-center justify-center rounded-md px-4 py-3 font-extrabold',
                  active ? 'bg-brand-cyan text-bg-dark' : 'border border-white/15 text-text-secondary'
                )}
              >
                {cta}
              </Link>
            </article>
          ))}
        </div>
      </Section>
    </MarketingShell>
  );
}

export function HelpScreen() {
  const faqs = [
    ['How can users earn?', 'Creators can earn from tips and memberships, competitors can win skill-based tournament prizes, and users may benefit from approved monetized activity. Eligible earnings can be withdrawn through supported payout flows.'],
    ['Is this gambling?', 'VERGR should not be positioned as gambling. Tournaments are skill-based competitions with posted rules, brackets, verification, and dispute handling.'],
    ['What can users post?', 'VERGR supports Text, Photo, Clip, Article, Short, Achievement, LFG, TierList, Quote, and Live Stream content.'],
    ['What happens after signup?', 'Users should get progressive onboarding: games, creator/viewer intent, interests, safety preferences, notification choices, and optional payout setup later.'],
  ];

  return (
    <MarketingShell>
      <Section eyebrow="Help" title="Clear answers for users before they sign up." body="The public help page should reduce doubt around earning, crypto withdrawals, tournament rules, and what the app actually does.">
        <div className="grid gap-4 md:grid-cols-2">
          {faqs.map(([question, answer]) => (
            <article key={question} className="rounded-lg border border-white/10 bg-surface-1 p-5">
              <h3 className="font-syne text-xl font-extrabold text-white">{question}</h3>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{answer}</p>
            </article>
          ))}
        </div>
      </Section>
    </MarketingShell>
  );
}

export function LegalScreen({ type }) {
  const page = legalSections[type] || legalSections.privacy;
  return (
    <MarketingShell>
      <section className="px-4 py-12 sm:px-6 lg:py-16">
        <article className="mx-auto max-w-4xl rounded-lg border border-white/10 bg-surface-1 p-5 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-cyan">{page.updated}</p>
          <h1 className="mt-3 font-syne text-4xl font-extrabold text-white">{page.label}</h1>
          <p className="mt-4 text-base leading-7 text-text-secondary">{page.intro}</p>
          <div className="mt-8 space-y-7">
            {page.sections.map(([title, body]) => (
              <section key={title}>
                <h2 className="font-syne text-2xl font-extrabold text-white">{title}</h2>
                <p className="mt-2 leading-7 text-text-secondary">{body}</p>
              </section>
            ))}
          </div>
        </article>
      </section>
    </MarketingShell>
  );
}
