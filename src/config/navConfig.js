// Contextual left-rail configurations.
//
// The app has a global "main" rail by default. Inside certain sections
// (Tournaments, Squads, Messaging, Creator Studio, Settings) the rail swaps
// to a section-specific nav with a "Back to Main" item at the top so the
// user can always escape back to global navigation.
//
// Each config is a list of { header?, items: [{ icon, label, path, badge? }] }
// groups. Group order is preserved. The active item is resolved by longest
// matching `path` against the current location.

export const MAIN_NAV = {
  id: 'main',
  groups: [
    {
      items: [
        { icon: 'home', label: 'Home', path: '/' },
        { icon: 'explore', label: 'Explore', path: '/explore' },
        { icon: 'rss_feed', label: 'Social Media', path: '/feed' },
        { icon: 'slow_motion_video', label: 'Shorts', path: '/shorts' },
      ],
    },
    {
      header: 'Community',
      items: [
        { icon: 'chat_bubble', label: 'Messages', path: '/messages' },
        { icon: 'call', label: 'Calls', path: '/calls' },
        { icon: 'amp_stories', label: 'Status', path: '/status' },
        { icon: 'groups', label: 'Squads', path: '/squads' },
      ],
    },
    {
      header: 'Compete',
      items: [
        { icon: 'emoji_events', label: 'Tournaments', path: '/tournaments' },
        { icon: 'leaderboard', label: 'Leaderboard', path: '/leaderboard' },
        { icon: 'live_tv', label: 'Live Streams', path: '/streams' },
      ],
    },
    {
      header: 'You',
      items: [
        { icon: 'account_balance_wallet', label: 'Wallet', path: '/wallet' },
        { icon: 'dashboard', label: 'Creator Studio', path: '/creator/dashboard' },
        { icon: 'storefront', label: 'Marketplace', path: '/marketplace' },
        { icon: 'settings', label: 'Settings', path: '/settings' },
      ],
    },
  ],
};

export const TOURNAMENTS_NAV = {
  id: 'tournaments',
  title: 'Tournaments',
  back: { label: 'Back to Main', path: '/' },
  groups: [
    {
      header: 'Tournaments',
      items: [
        { icon: 'dashboard', label: 'Overview', path: '/tournaments' },
        { icon: 'format_list_bulleted', label: 'All Tournaments', path: '/tournaments/all' },
        { icon: 'star', label: 'My Tournaments', path: '/tournaments/mine' },
        { icon: 'history', label: 'Past Tournaments', path: '/tournaments/past' },
      ],
    },
    {
      header: 'Tournament Types',
      items: [
        { icon: 'person', label: '1v1 Single Elim', path: '/tournaments/type/1v1-single' },
        { icon: 'person', label: '1v1 Double Elim', path: '/tournaments/type/1v1-double' },
        { icon: 'groups', label: 'Squad vs Squad', path: '/tournaments/type/squad-single' },
        { icon: 'groups', label: 'Squad Round Robin', path: '/tournaments/type/squad-round' },
        { icon: 'gamepad', label: 'Free For All', path: '/tournaments/type/ffa' },
        { icon: 'military_tech', label: 'Battle Royale', path: '/tournaments/type/battle' },
        { icon: 'swap_horiz', label: 'Swiss System', path: '/tournaments/type/swiss' },
        { icon: 'mail', label: 'Invitational / Custom', path: '/tournaments/type/invite' },
      ],
    },
    {
      header: 'Organise',
      items: [
        { icon: 'add_circle', label: 'Create Tournament', path: '/create-tournament' },
        { icon: 'trophy', label: 'My Tournaments', path: '/tournaments/mine' },
        { icon: 'inbox', label: 'Applications', path: '/tournaments/applications' },
      ],
    },
    {
      header: 'Support',
      items: [
        { icon: 'gavel', label: 'Rules & Guides', path: '/tournaments/rules' },
        { icon: 'help', label: 'Help Center', path: '/help' },
      ],
    },
  ],
};

export const SQUADS_NAV = {
  id: 'squads',
  title: 'Squads',
  back: { label: 'Back to Main', path: '/' },
  groups: [
    {
      items: [
        { icon: 'search', label: 'Find Squads', path: '/squads' },
        { icon: 'groups', label: 'My Squads', path: '/squads/mine' },
        { icon: 'mail', label: 'Invitations', path: '/squads/invitations' },
        { icon: 'description', label: 'Applications', path: '/squads/applications' },
        { icon: 'person_search', label: 'Browse Players', path: '/squads/players' },
      ],
    },
    {
      header: 'Create',
      items: [
        { icon: 'add_circle', label: 'Create Squad', path: '/squads/create' },
        { icon: 'tune', label: 'Squad Settings', path: '/squads/mine/settings' },
        { icon: 'admin_panel_settings', label: 'Roles & Permissions', path: '/squads/mine/roles' },
        { icon: 'analytics', label: 'Squad Analytics', path: '/squads/mine/analytics' },
      ],
    },
  ],
};

// Messaging uses a dynamic nav that's built per-conversation at render time.
// This is the fallback shape when no conversation is selected yet.
export const MESSAGING_NAV = {
  id: 'messaging',
  title: 'Messages',
  back: { label: 'Back to Main', path: '/' },
  groups: [
    {
      items: [
        { icon: 'forum', label: 'All Chats', path: '/messages' },
        { icon: 'group_add', label: 'Browse Groups', path: '/messages/browse' },
        { icon: 'person', label: 'Friends', path: '/messages/friends' },
        { icon: 'edit_square', label: 'New Message', path: '/messages/new' },
        { icon: 'outbox', label: 'Requests', path: '/messages/requests' },
      ],
    },
  ],
};

export const CREATOR_NAV = {
  id: 'creator',
  title: 'Creator Studio',
  back: { label: 'Back to Main', path: '/' },
  groups: [
    {
      header: 'Creator Studio',
      items: [
        { icon: 'dashboard', label: 'Overview', path: '/creator/dashboard' },
        { icon: 'analytics', label: 'Analytics', path: '/creator/analytics' },
        { icon: 'attach_money', label: 'Revenue', path: '/creator/earnings' },
        { icon: 'live_tv', label: 'Streams', path: '/creator/streams' },
        { icon: 'people', label: 'Audience', path: '/creator/audience' },
        { icon: 'forum', label: 'Community', path: '/creator/community' },
        { icon: 'favorite', label: 'Engagement', path: '/creator/engagement' },
        { icon: 'payments', label: 'Payouts', path: '/creator/payouts' },
        { icon: 'grid_view', label: 'Content', path: '/creator/content' },
        { icon: 'calendar_month', label: 'Schedule', path: '/creator/schedule' },
        { icon: 'check_circle', label: 'Quests', path: '/creator/quests' },
        { icon: 'workspace_premium', label: 'Membership', path: '/creator/membership' },
        { icon: 'settings', label: 'Settings', path: '/creator/settings' },
      ],
    },
  ],
};

export const SETTINGS_NAV = {
  id: 'settings',
  title: 'Settings',
  back: { label: 'Back to Main', path: '/' },
  groups: [
    {
      items: [
        { icon: 'person', label: 'Account', path: '/settings' },
        { icon: 'lock', label: 'Privacy', path: '/settings/privacy' },
        { icon: 'notifications', label: 'Notifications', path: '/settings/notifications' },
        { icon: 'palette', label: 'Appearance', path: '/settings/appearance' },
        { icon: 'shield', label: 'Security', path: '/settings/security' },
        { icon: 'verified', label: 'Verification', path: '/settings/verify' },
        { icon: 'help', label: 'Help & Support', path: '/help' },
      ],
    },
  ],
};

// Route → nav resolver. Longest prefix wins.
const RESOLVERS = [
  { prefix: '/creator', nav: CREATOR_NAV },
  { prefix: '/tournaments', nav: TOURNAMENTS_NAV },
  { prefix: '/create-tournament', nav: TOURNAMENTS_NAV },
  { prefix: '/squads', nav: SQUADS_NAV },
  { prefix: '/messages', nav: MESSAGING_NAV },
  { prefix: '/settings', nav: SETTINGS_NAV },
];

export function resolveNavForPath(pathname) {
  if (!pathname) return MAIN_NAV;
  const match = RESOLVERS
    .filter(r => pathname === r.prefix || pathname.startsWith(r.prefix + '/') || pathname === r.prefix)
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];
  return match ? match.nav : MAIN_NAV;
}

export function findActiveItem(nav, pathname) {
  let best = null;
  for (const g of nav.groups) {
    for (const it of g.items) {
      if (pathname === it.path || pathname.startsWith(it.path + '/')) {
        if (!best || it.path.length > best.path.length) best = it;
      }
    }
  }
  return best;
}
