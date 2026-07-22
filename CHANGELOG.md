# Changelog

All notable changes to this project are documented in this file.

## [Unreleased] — 2026-07-22

### Added

#### Client Home / Homework
- クライアント Home（`/client`）: Sleep Coach、Journey、宿題、分析履歴
- `client_homeworks` / client mypage 向け SQL・migration・repository
- 講師側宿題管理（`ClientHomeworkManager`）とポータル連携カード

#### Sleep Coach / Journey / Instructor Insight
- ルールベース Sleep Coach（`lib/sleep-coach.ts`）
- Sleep Wellness Journey（`lib/sleep-wellness-journey.ts`）
- Instructor Insight（`lib/instructor-insight.ts`）と分析結果画面への組み込み

#### Academy
- 学習・試験・証明書 UI（`/academy/*`）
- Academy catalog / scoring / repository
- Admin Academy 画面・API
- `supabase/migrations/20260722230000_academy.sql`

#### Admin Console
- Admin 各画面（dashboard / instructors / clients / academy / community / insights / analytics / settings）
- Admin API 群と `lib/admin`（本番 service + demo-admin-store フォールバック）
- `supabase/migrations/20260722240000_admin_console.sql`

#### Community
- Community 一覧・ディスカッション詳細
- catalog / repository / Admin community
- `supabase/migrations/20260722250000_community.sql`

#### Insights（SWI）
- Sleep Wellness Intelligence 集計・ダッシュボード UI
- `lib/swi` + `/api/insights` + Admin insights
- `supabase/migrations/20260722260000_swi_insights.sql`

#### Sleep Wellness OS
- OS Chrome（TopBar / Nav / Search / Notification Center / Shell）
- Role 別 Home（instructor / client / admin / enterprise）
- `/settings` `/notifications` `/enterprise`
- enterprise role migration（`20260722270000_sleep_wellness_os_enterprise_role.sql`）

#### Developer API Platform
- Developer Console（keys / webhooks / audit / docs）
- OpenAPI と `/api/v1/*` ルート一式
- `lib/api-platform`（現状は demo-store 中心）

#### Architecture / Design System / Modules
- Module Registry（`modules/`）と Thin Routes 方針（`Architecture.md`）
- Design System（`design-system/`）と共通 Hooks（`hooks/`）
- UI primitives（`components/ui/`）との段階移行

#### Docs
- Platform Bible と周辺文書一式（実装状況・DB/RLS・Role・画面地図・AI/ルール・Roadmap・Release Checklist・Glossary・OS 設計・API ガイド）

#### DB / Security
- `clients.instructor_id` / client mypage / homework / security hardening migrations
- `database.types.ts` 大幅更新

### Changed
- `package.json` version `0.1.0` → `1.0.0`（製品 Version 1.0 完成とは別。公開チェックは未完了）
- Auth callback / login / proxy の Role リダイレクト・保護強化
- 講師ダッシュボード・クライアント詳細・分析結果・宿題カードの統合
- Admin 既存 logs / instructors API の整理

### Removed
- 未使用コンポーネント整理: `AnalysisInsightCards`, `AuthStatusBar`, `ClientAiKarteTimeline`, `ClientLongTermTrends`, `DashboardRetentionRings`, `NewClientModal` など

### Quality (2026-07-22 終了時点)
| 検査 | 結果 |
|---|---|
| `npx tsc --noEmit` | 成功（エラーなし） |
| `npm run lint` | 成功（エラーなし） |
| `npm run build` | 成功（73 ルート生成） |

### Notes
- Academy / Community / Insights / Developer API / Notifications は **一部実装またはデモフォールバックあり**。Version 1.0 本番スコープは `docs/ROADMAP.md` 参照。
- `supabase/api-platform.sql` は migration 未収録（実行時は demo-store）。
- Planned Module（billing / companies / research / retreat / events / reports）は UI プレースホルダのみ。
