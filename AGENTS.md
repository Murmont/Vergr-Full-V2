# VERGR — Codex working notes

Keep this file current. It replaces long re-exploration every session.

## Hard rules (do not violate)

- **Zero out-of-pocket cost.** No new paid services. Firebase Spark-compatible only.
- **Terse output.** No trailing recaps, no emoji in code/docs unless asked.
- **WebRTC, never Jitsi.** We use raw WebRTC + Google STUN. Never call it Jitsi.
- **Creator quests award VP only — never coins.** Coins are bought/earned via tips/memberships/tournaments/boosts.
- **No "Gifts" as a revenue category.** VERGR has: Tips, Memberships, Tournament prizes, Boosts. That's it. No Ads, no Sponsored, no Gifts category.
- **Content types:** Text, Photo, Clip, Article, Short, Achievement, LFG, TierList, Quote, Live Stream. No "Reels".
- **Moderation UI belongs to Mod/Manager/Owner dashboards — NOT the creator dashboard.**
- **Desktop-only-actions rule applies to Moderator/Manager/Super-Admin dashboards. Creator dashboard must work on mobile AND desktop.**
- **Don't wander.** Only do what the user asked. No proactive docs, refactors, or tangents.

## Stack

- React 18 + Vite SPA, HashRouter
- Tailwind (no `grid-cols-24` — use inline `gridTemplateColumns` style)
- Firebase v10.14: Firestore, Functions (`europe-west1`), Hosting, FCM
- Recharts (installed), Dexie.js (installed — chat cache)
- Tauri desktop wrapper
- Material Symbols Rounded icons via `<Icon name="..." />`
- Fonts: **Syne** (headings), **DM Sans** (body), **DM Mono** (all numbers, with `tabular-nums`)

## Design tokens

```
--brand-cyan   #4DFFD4   (hex used in Recharts: #22d3ee)
--brand-violet #7B6FFF   (hex in charts:        #a78bfa)
--brand-pink   #C87FFF   (hex in charts:        #f472b6)
--brand-gold   #F5C542   (hex in charts:        #fbbf24)
--brand-ember  #FF4D6A   (hex in charts:        #fb7185)
--bg-dark      #07080D
--surface-1    #0F1118
```
Chart palette lives in `src/components/creator/charts.jsx` → `PALETTE`.

## Key paths

| Path | Purpose |
|---|---|
| `src/router/AppRouter.jsx` | All routes. Creator Studio lives in its own `<Outlet>` group outside `MainLayout` so CreatorLayout owns the chrome. |
| `src/layouts/MainLayout.jsx` | Regular app shell (`ResponsiveLayout` → `DesktopSidebar` + `BottomNav`) |
| `src/components/ResponsiveLayout.jsx` | Injects `DesktopSidebar` + `BottomNav` on `/`-style routes |
| `src/components/BottomNav.jsx` | `HIDE_ON_PATHS` includes `/creator` — extend when adding more immersive routes |
| `src/components/creator/CreatorLayout.jsx` | Creator Studio chrome: 260px collapsible sidebar + 64px topbar + mobile bottom nav + Exit Studio button |
| `src/components/creator/Widgets.jsx` | `Card`, `KpiCard`, `SectionHeader`, `InsightCard`, `StatRow`, `PeriodPicker` |
| `src/components/creator/charts.jsx` | `Sparkline`, `TrendLineChart`, `StackedAreaChart`, `HorizontalBarChart`, `VerticalBarChart`, `DonutChart`, `ActivityHeatmap`, `compactNum`, `PALETTE` |
| `src/firebase/firestore.js` | All Firestore helpers (`getUserPosts`, `getTransactions`, `getFollowers`, `getFollowing`, `claimQuestReward`, etc.) |
| `src/context/UserContext.jsx` | `profile`, `wallet`, etc. |
| `src/context/AuthContext.jsx` | `currentUser` |
| `src/hooks/useResponsive.js` | `{ isDesktop, isTablet, isMobile }` |

## Creator Studio screens

All wrap themselves in `<CreatorLayout page="..." title="..." subtitle="...">`.

- `CreatorDashboardScreen` (`/creator/dashboard`) — Home: KPIs, Trend+Donut, top posts, wallet, quest teaser
- `CreatorEarningsScreen` (`/creator/earnings`) — Revenue hero, stacked area, donut, supporters, payouts, tx list
- `CreatorContentScreen` (`/creator/content`) — Post grid with engagement chips, filters
- `CreatorScheduleScreen` (`/creator/schedule`) — Month grid + agenda view, type-colored chips
- `CreatorAudienceScreen` (`/creator/audience`) — Growth trend, gender/age/country, top supporters
- `CreatorCommunityScreen` (`/creator/community`) — Activity stream, announcement composer, replies needed, milestones, sentiment. **No moderation.**
- `MonthlyAnalyticsScreen` (`/creator/analytics`) — accepts `embedded` prop; route wraps it in CreatorLayout
- `CreatorQuestsScreen` (`/creator/quests`) — same pattern. **VP rewards only.**
- `MembershipTiersScreen` (`/creator/membership`) — same pattern
- `CreatorVerificationScreen` (`/creator/verify`) — still inside MainLayout (flow screen)

## Build + deploy

```
npm run build
firebase deploy --only hosting     # → https://vergr-44494.web.app
firebase deploy --only functions   # europe-west1
```

## Conventions

- **Numbers use DM Mono + `tabular-nums`:** `className="font-dmmono font-bold tabular-nums"`. Not Syne.
- **Empty states always present** — use `Icon` + muted copy, never render blank charts.
- **Period pickers use the shared `PeriodPicker` widget** — options default `['7d','30d','90d','6m','All']`.
- **Firestore timestamps**: always normalize via `tsMs(t)` helper (supports `.toDate()`, `.seconds`, ISO).
- **Currency display**: coins use `compactNum` + `"c"` suffix (e.g. `1.2Kc`). USD shown as `$X.XX` next to coins, NOT instead of.
- **Never create new files unless necessary.** Prefer editing existing. No unsolicited README/docs.

## Things NOT done yet (backlog — only touch if asked)

- Scheduled posts backend (`CreatorScheduleScreen` uses mock `buildMockSchedule`)
- Audience demographics backend (gender/age/country in `CreatorAudienceScreen` are placeholders)
- `claimQuestReward` still credits coins server-side — needs VP field migration
- Chat messaging rewrite (Dexie + `relayMessage` relay) — plan file exists but not executed
- Thanos dissolve delete effect for messages — plan file exists

## What wastes tokens (do not do)

- Reading docx/pdf files in `Downloads/` or temp dirs unless the user points at them
- Re-exploring the codebase when this file already documents the relevant paths
- Running broad greps when the user's request names a specific file
- Asking confirmation for tasks the user already specified
- Trailing "here's what I did" summaries after edits — the diff shows it
