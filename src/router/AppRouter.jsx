import { HashRouter as BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { UserProvider } from '../context/UserContext';
import { NotificationProvider } from '../context/NotificationContext';
import { UIProvider } from '../context/UIContext';
import { LayoutProvider } from '../context/LayoutContext';
import ProtectedRoute from '../components/ProtectedRoute';
import Toast from '../components/Toast';
import PushToast from '../components/PushToast';
import IncomingCallOverlay from '../components/IncomingCallOverlay';
import AdminAnnounceScreen from '../screens/admin/AdminAnnounceScreen';
import DesktopNotificationManager from '../components/DesktopNotificationManager';
import IncomingCallManager from '../components/IncomingCallManager';
import NotificationsDrawer from '../components/NotificationsDrawer';
import MainLayout from '../layouts/MainLayout';
import MessagesMasterDetail from '../layouts/MessagesMasterDetail';
import SquadsMasterDetail from '../layouts/SquadsMasterDetail';
import ResponsiveLayout from '../components/ResponsiveLayout';
import usePresence from '../hooks/usePresence';
import { useEffect } from 'react';
import { checkScheduledBackup } from '../utils/chatBackup';

// Renders nothing — just activates the presence system inside the auth context
function PresenceManager() {
  usePresence();
  return null;
}

// Renders nothing — checks if a scheduled backup is due on app startup
function BackupChecker() {
  useEffect(() => {
    checkScheduledBackup().catch(() => {});
  }, []);
  return null;
}

// Auth
import SplashScreen from '../screens/auth/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpStep1 from '../screens/auth/SignUpStep1';
import SignUpStep2 from '../screens/auth/SignUpStep2';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import TwoFASetupScreen from '../screens/auth/TwoFASetupScreen';
import TwoFALoginScreen from '../screens/auth/TwoFALoginScreen';
import EmailVerificationScreen from '../screens/auth/EmailVerificationScreen';
import PhoneEntryScreen from '../screens/auth/PhoneEntryScreen';
import PhoneOTPScreen from '../screens/auth/PhoneOTPScreen';
import NewPasswordScreen from '../screens/auth/NewPasswordScreen';
import ResetSuccessScreen from '../screens/auth/ResetSuccessScreen';
import SocialLoginScreen from '../screens/auth/SocialLoginScreen';
import AccountTypeScreen from '../screens/auth/AccountTypeScreen';
import ConnectGamingScreen from '../screens/auth/ConnectGamingScreen';

// Onboarding
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import InterestSelectionScreen from '../screens/onboarding/InterestSelectionScreen';
import ProfileSetupScreen from '../screens/onboarding/ProfileSetupScreen';
import FollowSuggestionsScreen from '../screens/onboarding/FollowSuggestionsScreen';
import OnboardingCompleteScreen from '../screens/onboarding/OnboardingCompleteScreen';
import ProfileSetupStep2Screen from '../screens/onboarding/ProfileSetupStep2Screen';
import ProfileIdentityScreen from '../screens/onboarding/ProfileIdentityScreen';

// Main tabs
import HomeFeedScreen from '../screens/home/HomeFeedScreen';
import ExploreScreen from '../screens/explore/ExploreScreen';
import SquadsScreen from '../screens/squads/SquadsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

// Home
import EarnCoinsScreen from '../screens/home/EarnCoinsScreen';
import NotificationsScreen from '../screens/home/NotificationsScreen';
import CreatePostScreen from '../screens/home/CreatePostScreen';
import LeaderboardScreen from '../screens/home/LeaderboardScreen';
import PostDetailScreen from '../screens/home/PostDetailScreen';
import CreatePollScreen from '../screens/home/CreatePollScreen';
import TrendingHashtagsScreen from '../screens/home/TrendingHashtagsScreen';

// Create (post types)
import CreatePostSelectorScreen from '../screens/create/CreatePostSelectorScreen';
import CreateTextPostScreen from '../screens/create/CreateTextPostScreen';
import CreatePhotoPostScreen from '../screens/create/CreatePhotoPostScreen';
import CreateClipPostScreen from '../screens/create/CreateClipPostScreen';
import CreateArticleScreen from '../screens/create/CreateArticleScreen';
import CreateLFGScreen from '../screens/create/CreateLFGScreen';
import CreateTierListScreen from '../screens/create/CreateTierListScreen';
import CreateAchievementScreen from '../screens/create/CreateAchievementScreen';
import QuotePostScreen from '../screens/create/QuotePostScreen';

// Viewers
import ClipViewerScreen from '../screens/viewer/ClipViewerScreen';

// Profile
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import FollowListScreen from '../screens/profile/FollowListScreen';
import PublicProfileScreen from '../screens/profile/PublicProfileScreen';
import BrowseCreatorsScreen from '../screens/profile/BrowseCreatorsScreen';
import EsportsTeamScreen from '../screens/profile/EsportsTeamScreen';
import PrestigeLevelsScreen from '../screens/profile/PrestigeLevelsScreen';

// Messages
import MessagesInboxScreen from '../screens/messages/MessagesInboxScreen';
import ChatThreadScreen from '../screens/messages/ChatThreadScreen';
import MessageRequestsScreen from '../screens/messages/MessageRequestsScreen';
import CreateGroupChatScreen from '../screens/messages/CreateGroupChatScreen';
import NewMessageScreen from '../screens/messages/NewMessageScreen';
import ChatSettingsScreen from '../screens/messages/ChatSettingsScreen';
import ChatDetailScreen from '../screens/messages/ChatDetailScreen';
import CallScreen from '../screens/messages/CallScreen';

// Squads
import CreateSquadScreen from '../screens/squads/CreateSquadScreen';
import SquadDetailScreen from '../screens/squads/SquadDetailScreen';
import SquadChatThreadScreen from '../screens/squads/SquadChatThreadScreen';
import SquadSettingsScreen from '../screens/squads/SquadSettingsScreen';
import SquadRolesScreen from '../screens/squads/SquadRolesScreen';
import SquadMembersScreen from '../screens/squads/SquadMembersScreen';
import SquadMediaScreen from '../screens/squads/SquadMediaScreen';
import SquadPinnedScreen from '../screens/squads/SquadPinnedScreen';
import SquadChallengesScreen from '../screens/squads/SquadChallengesScreen';
import SquadEventsScreen from '../screens/squads/SquadEventsScreen';
import SquadJoinRequestsScreen from '../screens/squads/SquadJoinRequestsScreen';
import SquadAnnouncementsScreen from '../screens/squads/SquadAnnouncementsScreen';
import SquadLeaderboardScreen from '../screens/squads/SquadLeaderboardScreen';
import InviteMembersScreen from '../screens/squads/InviteMembersScreen';

// Wallet & Coins
import WalletScreen from '../screens/wallet/WalletScreen';
import BuyCoinsScreen from '../screens/wallet/BuyCoinsScreen';
import TransactionReceiptScreen from '../screens/wallet/TransactionReceiptScreen';
import TransactionFiltersScreen from '../screens/wallet/TransactionFiltersScreen';
import RequestPayoutScreen from '../screens/wallet/RequestPayoutScreen';
import PayoutSuccessScreen from '../screens/wallet/PayoutSuccessScreen';
import WalletSecurityScreen from '../screens/wallet/WalletSecurityScreen';

// Creator
import CreatorDashboardScreen from '../screens/creator/CreatorDashboardScreen';
import MonthlyAnalyticsScreen from '../screens/creator/MonthlyAnalyticsScreen';
import CreatorQuestsScreen from '../screens/creator/CreatorQuestsScreen';
import MembershipTiersScreen from '../screens/creator/MembershipTiersScreen';
import CreatorVerificationScreen from '../screens/creator/CreatorVerificationScreen';
import VerificationPendingScreen from '../screens/creator/VerificationPendingScreen';

// Streams
import GoLiveSetupScreen from '../screens/streams/GoLiveSetupScreen';
import LiveStreamScreen from '../screens/streams/LiveStreamScreen';
import StreamAnalyticsScreen from '../screens/streams/StreamAnalyticsScreen';
import StreamEndingScreen from '../screens/streams/StreamEndingScreen';
import StreamModerationScreen from '../screens/streams/StreamModerationScreen';
import CoStreamingScreen from '../screens/streams/CoStreamingScreen';

// Tournaments
import TournamentScreen from '../screens/tournaments/TournamentScreen';
import TournamentStandingsScreen from '../screens/tournaments/TournamentStandingsScreen';
import TournamentPrizePoolScreen from '../screens/tournaments/TournamentPrizePoolScreen';
import MatchDetailsScreen from '../screens/tournaments/MatchDetailsScreen';
import TeamManagementScreen from '../screens/tournaments/TeamManagementScreen';
import TeamFundingScreen from '../screens/tournaments/TeamFundingScreen';
import ContributeScreen from '../screens/tournaments/ContributeScreen';
import ContributionSuccessScreen from '../screens/tournaments/ContributionSuccessScreen';
import PrizeReceiptScreen from '../screens/tournaments/PrizeReceiptScreen';
import CreateTournamentScreen from '../screens/tournaments/CreateTournamentScreen';
import ModeratorMatchControlScreen from '../screens/tournaments/ModeratorMatchControlScreen';

// Settings
import SettingsScreen from '../screens/settings/SettingsScreen';
import BackupSettingsScreen from '../screens/settings/BackupSettingsScreen';
import PrivacySettingsScreen from '../screens/settings/PrivacySettingsScreen';
import LinkedAccountsScreen from '../screens/settings/LinkedAccountsScreen';
import NotificationSettingsScreen from '../screens/settings/NotificationSettingsScreen';
import AboutScreen from '../screens/settings/AboutScreen';
import SecuritySettingsScreen from '../screens/settings/SecuritySettingsScreen';
import LanguageSettingsScreen from '../screens/settings/LanguageSettingsScreen';
import DisplaySettingsScreen from '../screens/settings/DisplaySettingsScreen';
import AppPermissionsScreen from '../screens/settings/AppPermissionsScreen';
import BlockedWordsScreen from '../screens/settings/BlockedWordsScreen';
import BlockedUsersScreen from '../screens/settings/BlockedUsersScreen';
import AccountDataExportScreen from '../screens/settings/AccountDataExportScreen';
import AccountDeletionScreen from '../screens/settings/AccountDeletionScreen';
import DisconnectAccountScreen from '../screens/settings/DisconnectAccountScreen';
import HelpCenterScreen from '../screens/settings/HelpCenterScreen';
import HowItWorksScreen from '../screens/settings/HowItWorksScreen';
import ServiceMarketplaceScreen from '../screens/services/ServiceMarketplaceScreen';
import CreateServiceScreen from '../screens/services/CreateServiceScreen';
import ServiceDetailScreen from '../screens/services/ServiceDetailScreen';
import BoostScreen from '../screens/wallet/BoostScreen';
import CallsScreen from '../screens/calls/CallsScreen';
import StatusScreen from '../screens/status/StatusScreen';
import PrivacyPolicyScreen from '../screens/settings/PrivacyPolicyScreen';

// Ad Center
import AdCenterScreen from '../screens/ad/AdCenterScreen';

// Search
import SearchResultsAllScreen from '../screens/search/SearchResultsAllScreen';
import SearchResultsStreamsScreen from '../screens/search/SearchResultsStreamsScreen';
import NoSearchResultsScreen from '../screens/search/NoSearchResultsScreen';

// Utility
import MaintenanceScreen from '../screens/utility/MaintenanceScreen';
import ForceUpdateScreen from '../screens/utility/ForceUpdateScreen';
import NetworkErrorScreen from '../screens/utility/NetworkErrorScreen';
import ActivityLogScreen from '../screens/utility/ActivityLogScreen';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <UserProvider>
          <NotificationProvider>
            <UIProvider>
              <LayoutProvider>
                <div className="app-container mx-auto min-h-screen bg-bg-dark text-text-primary relative">
                  <Toast />
                  <PushToast />
                  <IncomingCallOverlay />
                  <DesktopNotificationManager />
                  <IncomingCallManager />
                  <PresenceManager />
                  <BackupChecker />
                  <NotificationsDrawer />
                  <Routes>
                    {/* ---------- PUBLIC ROUTES (no layout) ---------- */}
                    {/* Auth */}
                    <Route path="/splash" element={<SplashScreen />} />
                    <Route path="/login" element={<LoginScreen />} />
                    <Route path="/signup" element={<SignUpStep1 />} />
                    <Route path="/signup/step2" element={<SignUpStep2 />} />
                    <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
                    <Route path="/2fa-setup" element={<TwoFASetupScreen />} />
                    <Route path="/2fa-login" element={<TwoFALoginScreen />} />
                    <Route path="/verify-email" element={<EmailVerificationScreen />} />
                    <Route path="/phone-entry" element={<PhoneEntryScreen />} />
                    <Route path="/phone-otp" element={<PhoneOTPScreen />} />
                    <Route path="/new-password" element={<NewPasswordScreen />} />
                    <Route path="/reset-success" element={<ResetSuccessScreen />} />
                    <Route path="/social-login" element={<SocialLoginScreen />} />
                    <Route path="/account-type" element={<AccountTypeScreen />} />
                    <Route path="/connect-gaming" element={<ConnectGamingScreen />} />

                    {/* Onboarding */}
                    <Route path="/onboarding" element={<OnboardingScreen />} />
                    <Route path="/onboarding/interests" element={<InterestSelectionScreen />} />
                    <Route path="/onboarding/profile" element={<ProfileSetupScreen />} />
                    <Route path="/onboarding/profile-step2" element={<ProfileSetupStep2Screen />} />
                    <Route path="/onboarding/identity" element={<ProfileIdentityScreen />} />
                    <Route path="/onboarding/follow" element={<FollowSuggestionsScreen />} />
                    <Route path="/onboarding/complete" element={<OnboardingCompleteScreen />} />

                    {/* Utility (public) */}
                    <Route path="/maintenance" element={<MaintenanceScreen />} />
                    <Route path="/update-required" element={<ForceUpdateScreen />} />
                    <Route path="/offline" element={<NetworkErrorScreen />} />

                    {/* ---------- PROTECTED MAIN APP (with MainLayout) ---------- */}
                    <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                      {/* Main tabs */}
                      <Route path="/" element={<HomeFeedScreen />} />
                      <Route path="/explore" element={<ExploreScreen />} />
                      <Route path="/profile" element={<ProfileScreen />} />

                      {/* Home */}
                      <Route path="/earn" element={<EarnCoinsScreen />} />
                      <Route path="/notifications" element={<NotificationsScreen />} />
                      <Route path="/create-post" element={<Navigate to="/create" replace />} />
                      <Route path="/create-poll" element={<CreatePollScreen />} />
                      <Route path="/leaderboard" element={<LeaderboardScreen />} />
                      <Route path="/post/:postId" element={<PostDetailScreen />} />
                      <Route path="/trending" element={<TrendingHashtagsScreen />} />

                      {/* Create */}
                      <Route path="/create" element={<CreatePostSelectorScreen />} />
                      <Route path="/create/text" element={<CreateTextPostScreen />} />
                      <Route path="/create/photo" element={<CreatePhotoPostScreen />} />
                      <Route path="/create/clip" element={<CreateClipPostScreen />} />
                      <Route path="/create/article" element={<CreateArticleScreen />} />
                      <Route path="/create/lfg" element={<CreateLFGScreen />} />
                      <Route path="/create/tierlist" element={<CreateTierListScreen />} />
                      <Route path="/create/achievement" element={<CreateAchievementScreen />} />
                      <Route path="/create/quote" element={<QuotePostScreen />} />

                      {/* Viewers */}
                      <Route path="/clip/:postId" element={<ClipViewerScreen />} />

                      {/* Profile */}
                      <Route path="/edit-profile" element={<EditProfileScreen />} />
                      <Route path="/followers/:tab" element={<FollowListScreen />} />
                      <Route path="/user/:id" element={<PublicProfileScreen />} />
                      <Route path="/browse-creators" element={<BrowseCreatorsScreen />} />
                      <Route path="/esports-team/:teamId" element={<EsportsTeamScreen />} />
                      <Route path="/prestige" element={<PrestigeLevelsScreen />} />

                      {/* Standalone message screens (not master‑detail) */}
                      <Route path="/messages/new" element={<NewMessageScreen />} />
                      <Route path="/messages/requests" element={<MessageRequestsScreen />} />
                      <Route path="/messages/create-group" element={<CreateGroupChatScreen />} />
                      <Route path="/messages/:chatId/settings" element={<ChatSettingsScreen />} />
                      <Route path="/messages/:chatId/details" element={<ChatDetailScreen />} />
                      <Route path="/call/:chatId/:callType" element={<CallScreen />} />

                      {/* Standalone squad creation */}
                      <Route path="/squads/create" element={<CreateSquadScreen />} />

                      {/* Wallet & Coins */}
                      <Route path="/wallet" element={<WalletScreen />} />
                      <Route path="/wallet/security" element={<WalletSecurityScreen />} />
                      <Route path="/buy-coins" element={<BuyCoinsScreen />} />
                      <Route path="/transaction/:txId" element={<TransactionReceiptScreen />} />
                      <Route path="/transactions/filter" element={<TransactionFiltersScreen />} />
                      <Route path="/request-payout" element={<RequestPayoutScreen />} />
                      <Route path="/payout-success" element={<PayoutSuccessScreen />} />

                      {/* Creator */}
                      <Route path="/creator/dashboard" element={<CreatorDashboardScreen />} />
                      <Route path="/creator/analytics" element={<MonthlyAnalyticsScreen />} />
                      <Route path="/creator/quests" element={<CreatorQuestsScreen />} />
                      <Route path="/creator/membership" element={<MembershipTiersScreen />} />
                      <Route path="/creator/verify" element={<CreatorVerificationScreen />} />
                      <Route path="/verification-pending" element={<VerificationPendingScreen />} />

                      {/* Streams */}
                      <Route path="/go-live" element={<GoLiveSetupScreen />} />
                      <Route path="/go-live/co-stream" element={<CoStreamingScreen />} />
                      <Route path="/stream/:streamId" element={<LiveStreamScreen />} />
                      <Route path="/stream/:streamId/moderation" element={<StreamModerationScreen />} />
                      <Route path="/stream/analytics" element={<StreamAnalyticsScreen />} />
                      <Route path="/stream/ended" element={<StreamEndingScreen />} />

                      {/* Tournaments */}
                      <Route path="/tournaments" element={<TournamentScreen />} />
                      <Route path="/tournaments/standings" element={<TournamentStandingsScreen />} />
                      <Route path="/tournaments/prizes" element={<TournamentPrizePoolScreen />} />
                      <Route path="/match/:matchId" element={<MatchDetailsScreen />} />
                      <Route path="/team/:teamId/manage" element={<TeamManagementScreen />} />
                      <Route path="/team/:teamId/funding" element={<TeamFundingScreen />} />
                      <Route path="/team-contribute" element={<ContributeScreen />} />
                      <Route path="/contribution-success" element={<ContributionSuccessScreen />} />
                      <Route path="/prize-receipt/:prizeId" element={<PrizeReceiptScreen />} />
                      <Route path="/create-tournament" element={<CreateTournamentScreen />} />
                      <Route path="/match/:matchId/control" element={<ModeratorMatchControlScreen />} />

                      {/* Settings */}
                      <Route path="/settings" element={<SettingsScreen />} />
                      <Route path="/settings/backup" element={<BackupSettingsScreen />} />
                      <Route path="/settings/privacy" element={<PrivacySettingsScreen />} />
                      <Route path="/settings/linked-accounts" element={<LinkedAccountsScreen />} />
                      <Route path="/settings/notifications" element={<NotificationSettingsScreen />} />
                      <Route path="/settings/about" element={<AboutScreen />} />
                      <Route path="/settings/security" element={<SecuritySettingsScreen />} />
                      <Route path="/settings/language" element={<LanguageSettingsScreen />} />
                      <Route path="/settings/display" element={<DisplaySettingsScreen />} />
                      <Route path="/settings/permissions" element={<AppPermissionsScreen />} />
                      <Route path="/settings/blocked-words" element={<BlockedWordsScreen />} />
                      <Route path="/settings/blocked-users" element={<BlockedUsersScreen />} />
                      <Route path="/settings/export-data" element={<AccountDataExportScreen />} />
                      <Route path="/settings/delete-account" element={<AccountDeletionScreen />} />
                      <Route path="/settings/disconnect/:platform" element={<DisconnectAccountScreen />} />
                      <Route path="/settings/help" element={<HelpCenterScreen />} />
                      <Route path="/settings/how-it-works" element={<HowItWorksScreen />} />

                      {/* Services */}
                      <Route path="/services" element={<ServiceMarketplaceScreen />} />
                      <Route path="/services/create" element={<CreateServiceScreen />} />
                      <Route path="/services/:id" element={<ServiceDetailScreen />} />

                      {/* Boost */}
                      <Route path="/boost" element={<BoostScreen />} />

                      {/* Calls */}
                      <Route path="/calls" element={<CallsScreen />} />

                      {/* Status */}
                      <Route path="/status" element={<StatusScreen />} />

                      {/* Ad Center - NEW */}
                      <Route path="/ad-center" element={<AdCenterScreen />} />

                      <Route path="/settings/privacy-policy" element={<PrivacyPolicyScreen />} />

                      {/* Admin */}
                      <Route path="/admin/announce" element={<AdminAnnounceScreen />} />

                      {/* Search */}
                      <Route path="/search" element={<SearchResultsAllScreen />} />
                      <Route path="/search/streams" element={<SearchResultsStreamsScreen />} />
                      <Route path="/search/empty" element={<NoSearchResultsScreen />} />

                      {/* Activity */}
                      <Route path="/activity" element={<ActivityLogScreen />} />
                    </Route>

                    {/* ---------- MESSAGES MASTER‑DETAIL ---------- */}
                    <Route path="/messages" element={<ProtectedRoute><MessagesMasterDetail /></ProtectedRoute>}>
                      <Route index element={<MessagesInboxScreen />} />
                      <Route path=":chatId" element={<ChatThreadScreen />} />
                    </Route>

                    {/* ---------- SQUADS MASTER‑DETAIL ---------- */}
                    <Route path="/squads" element={<ProtectedRoute><SquadsMasterDetail /></ProtectedRoute>}>
                      <Route index element={<SquadsScreen />} />
                      <Route path=":squadId" element={<SquadDetailScreen />} />
                      <Route path=":squadId/chat" element={<SquadChatThreadScreen />} />
                      <Route path=":squadId/settings" element={<SquadSettingsScreen />} />
                      <Route path=":squadId/roles" element={<SquadRolesScreen />} />
                      <Route path=":squadId/members" element={<SquadMembersScreen />} />
                      <Route path=":squadId/media" element={<SquadMediaScreen />} />
                      <Route path=":squadId/pinned" element={<SquadPinnedScreen />} />
                      <Route path=":squadId/challenges" element={<SquadChallengesScreen />} />
                      <Route path=":squadId/events" element={<SquadEventsScreen />} />
                      <Route path=":squadId/requests" element={<SquadJoinRequestsScreen />} />
                      <Route path=":squadId/announcements" element={<SquadAnnouncementsScreen />} />
                      <Route path=":squadId/leaderboard" element={<SquadLeaderboardScreen />} />
                      <Route path=":squadId/invite" element={<InviteMembersScreen />} />
                    </Route>

                    {/* ---------- CATCH‑ALL ---------- */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </div>
              </LayoutProvider>
            </UIProvider>
          </NotificationProvider>
        </UserProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}