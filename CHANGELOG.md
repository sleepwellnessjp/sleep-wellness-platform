# Changelog

All notable changes to this project are documented in this file.

## [1.0.0-beta] — 2026-07-24（Version 1.0 Beta / 認定講師限定公開）

### Released
- **Sleep Wellness Platform Version 1.0 Beta** を認定講師限定公開版として凍結
- 開発フェーズ終了。以降は新機能追加せず、運用フィードバックに基づく軽微修正のみ

### Added / Finalized
- **AIから講師への提案**（PDF / 結果画面・講師コメント欄の上）
  - 今回重点的にヒアリングする内容
  - 次回比較するデータ
  - 生活習慣で確認すること
  - 改善が見込めるポイント
  - 注意して観察するポイント
  - 分析結果から毎回自動生成（ルールフォールバック付き）

## [Unreleased] — 2026-07-24（Version 2.9 / Closed Beta Evidence Collection）

### Added
- **Version 2.9 Closed Beta Evidence Collection**: 新機能ではなく実証データ収集を追加（既存機能は変更なし）
  - 認定講師: カウンセリング終了時 30秒アンケート（満足度・理解度・宿題実施見込み・次回予約・自由コメント）`/analysis/result`
  - クライアント: 翌朝アンケート（睡眠満足度・起床時気分・日中の調子・自由コメント）`/client/morning`
  - 本部: 全データ匿名集計（改善率・満足度・継続率・宿題実施率・コメント分析モック）`/admin/evidence`
  - API: `POST /api/evidence/session` · `GET|POST /api/evidence/morning` · `GET /api/admin/evidence`
  - Supabase: `evidence_session_surveys` · `evidence_morning_surveys`
  - Migration: `20260724290000_closed_beta_evidence_v29.sql`

## [Unreleased] — 2026-07-24（Version 2.8 / Closed Beta Operation）

### Added
- **Version 2.8 Closed Beta Operation**: SWIJ本部がベータ状況を把握し PDCA を回す運営機能
  - Module1 Beta KPI Dashboard: アクティブ講師・クライアント・週間分析・継続率・改善率・FB対応率・新規登録 + グラフ
  - Module2 Feature Requests: カテゴリ・優先度・投票数・対応予定・完了管理
  - Module3 Bug Tracker: Critical / High / Medium / Low · 修正状況
  - Module4 Client Outcomes: 睡眠改善率・継続率・Homework達成率・Journey進捗
  - Module5 Weekly Report: Closed Beta Report（成果・課題・改善提案 · モック）
  - Module6 Product Backlog: 未着手 / 進行中 / 完了 / 保留
  - API: `GET|PATCH /api/admin/closed-beta-operation`
  - Supabase: `feature_requests` · `bug_reports` · `weekly_reports` · `beta_metrics` · `product_backlog`
  - Migration: `20260724280000_closed_beta_operation_v28.sql`

## [Unreleased] — 2026-07-24（Version 2.7 / Closed Beta Launch）

### Added
- **Version 2.7 Closed Beta Launch**: 新機能追加なし。認定講師が安心して使える状態へ整備
  - Module1 Beta Invitation: 認定講師招待（メールモック・コード・利用開始日・利用規約同意）
  - Module2 Onboarding: 初回ログイン 5 ステップ（約3分）
  - Module3 Beta Agreement: 利用開始前確認（β版・データ協力・バグ報告・守秘義務）
  - Module4 Feedback Priority: Critical / High / Medium / Low
  - Module5 Admin Action: 受付 / 対応中 / 保留 / 完了
  - Module6 Beta Metrics: 週次集計（利用講師・分析・クライアント・継続率・改善率・バグ件数）

## [Unreleased] — 2026-07-24（Version 2.6 / Beta Freeze）

### Changed
- **Version 2.6 Beta Freeze**: 新機能追加なし。Closed Beta 運用開始のための最終調整
  - 全画面右下に BETA バッジ · Version（`2.6.0`）·「フィードバックを送る」固定表示
  - 重大エラー時のセーフティ画面（`error` / `global-error`）を分かりやすい文言に統一
  - 内部リンク・エラー画面・レスポンシブ前提の最終 QA

## [Unreleased] — 2026-07-24（Version 2.4 / Closed Beta 運営モード）

### Added
- **Version 2.4 Closed Beta 運営モード**: 第1期・第2期認定講師限定の正式運用コンソール
  - Module1 Beta Dashboard `/admin/beta`（参加認定講師・クライアント・分析・AI・レポート・Journey継続率・Homework実施率・フィードバック件数）
  - Module2 Beta Feedback `/feedback` · `/admin/feedback`（改善要望・不具合・新機能・使いやすさ5段階 / 一覧・対応状況・優先順位・対応完了）
  - Module3 Health Score（サーバー・DB・AI・API・利用率）
  - Module4 Release Notes（Version / 日付 / 変更 / 改善）
  - Module5 Usage Analytics（利用画面・平均時間・端末比率・離脱ポイント · モック）
  - Module6 Roadmap（Version 2.5 / 3.0 / Coming Soon）
  - API: `GET /api/admin/closed-beta`
  - Supabase: `beta_feedback` 拡張 · `release_notes` · `usage_statistics` · `system_health` · `roadmap_items`
  - Migration: `20260724240000_closed_beta_ops_v24.sql`

## [Unreleased] — 2026-07-24（Version 2.3 / UI·UX ブラッシュアップ）

### Improved
- **Version 2.3 UI/UX**: 既存機能はそのまま、体験品質のみ向上
  - 画面遷移: `app/template.tsx` + `sw-page-enter`（控えめなフェードアップ）
  - ローディング: ルート `loading.tsx` · Loading スピナー刷新 · Skeleton シマー
  - カード / ボタン統一: `SectionCard` · `Button` · `CARD_CLASS` · CSS 変数 `--sw-*`
  - 余白: モバイル → タブレット → デスクトップの段階的パディング
  - スマホ / タブレット: タッチターゲット 44px · 横スクロールナビ · safe-area
  - ダークモード準備: `[data-theme="dark"]` トークン（デフォルトはライト固定）
  - アクセシビリティ: Skip link · `focus-visible` · `aria-busy` · `prefers-reduced-motion`

## [Unreleased] — 2026-07-24（Version 2.2 / ライセンス・課金・権限）

### Added
- **Version 2.2 ライセンス・課金・権限管理**: 正式運用向けの基盤
  - Module1 権限管理（SWIJ本部 / 認定校 / 認定講師 / クライアント）`/admin/roles` · `lib/rbac/*`
  - Module2 ライセンス管理（番号・レベル・取得日・更新期限・有効/失効・更新履歴）既存 `/license` · `/admin/license` を監査連携
  - Module3 サブスクリプション（Basic / Professional / Enterprise モック）`/billing` · `/admin/subscriptions`
  - Module4 招待システム（認定講師のみ）`/invitations` · `/invite/[code]` · `ClientInviteCard`
  - Module5 監査ログ `/admin/audit`（ログイン・分析・レポート・クライアント追加・ライセンス更新）
  - Module6 セキュリティ（RBAC・proxy matcher 拡充・`/forbidden` 403・既存 404/error）
  - 認定校ホーム `/school` · profiles.role `school`
  - Supabase: `roles` / `invitations` / `audit_logs` / `commercial_subscriptions`（+ licenses/subscriptions 保証）
  - Migration: `20260724220000_license_billing_rbac_v22.sql`

## [Unreleased] — 2026-07-24（Version 2.1 / SWIJ 運営システム）

### Added
- **Version 2.1 運営システム（認定講師専用 OS）**: 新機能追加より運営基盤を優先
  - Module1 認定講師管理 `/admin/certification`（認定校紐付け・レベル・更新・停止・退会）
  - Module2 認定校管理 `/admin/schools` · `/admin/schools/[id]`（所属講師・受講生・開催講座・修了率・活動状況）
  - Module3 認定講師ダッシュボード `/dashboard` KPI（今月クライアント・分析・改善率・継続率・ライセンス・更新期限）
  - Module4 本部ダッシュボード `/admin`（全国認定講師数・認定校数・分析件数・平均改善率・アクティブ率・イベント数）
  - Module5 通知センター `/admin/notifications` · `/notifications`（本部お知らせ・認定更新・イベント・教材・AI）
  - Module6 ブランド統一（Navy / Gold / White · tokens · SectionCard · AdminShell）
  - API: `/api/admin/ops` · `/api/ops/instructor-dashboard` · `/api/ops/notifications`
  - Supabase: `certification_levels` / `certified_schools` / `certified_instructors` / `school_courses` / `school_students` / `ops_notifications` / `ops_events`
  - `lib/ops/*` · `lib/brand/swij-brand.ts` · `components/ops/*`

## [Unreleased] — 2026-07-24（Version 2.0 / Sleep Wellness AI Intelligence）

### Added
- **Sleep Wellness AI Intelligence**: Platform 最大の AI レイヤー（モック / 将来 OpenAI 差し替え可）
  - ① Sleep Coach（毎朝：睡眠状態・コンディション・おすすめ行動・メラトニンヨガ™・励まし）`/client` · `/client/coach`
  - ② Instructor Assistant（改善点・悪化原因・質問候補・カウンセリング内容・Homework）`/analysis/result`
  - ③ SWIJ Intelligence（全国平均・年代別・改善率/講師ランキング・イベント効果・季節変動）`/admin/ai`
  - ④ Predictive Analysis（14日後などの改善予測）クライアント Coach · 分析結果
  - ⑤ Research AI（匿名データから研究レポート自動生成）`/admin/ai`
  - ⑥ Knowledge Base（Method / ヨガ / 睡眠科学 / 認定テキスト / 論文検索）`/knowledge`
  - API: `/api/ai-intelligence/*` · `GET /api/admin/ai-intelligence`
  - `lib/ai-intelligence/*` · `components/ai-intelligence/*`（Generator 注入口つき）

## [Unreleased] — 2026-07-24（Version 2.0 / Sleep Wellness Journey™）

### Added
- **Sleep Wellness Journey™**: クライアントが睡眠改善の進捗をゲームのように楽しく継続できるロードマップ
  - 5ステージ Journey Map（Sleep Awareness → Balance → Recovery → Performance → Wellness）
  - Progress（現在ステージ / 達成率 / 改善率 / スコア推移 / 連続記録 / 次の目標）
  - Achievements バッジ（初回分析・7日/30日継続・効率90%・HRV/ストレス改善・メラトニンヨガ™継続）
  - AI Coach（励まし・改善提案・次の目標 / ルールベース）
  - クライアント画面 `/client/journey` を拡張
  - 認定講師 `/journey` 進捗一覧（全員）+ 既存の個別詳細（`?clientId=`）
  - 本部 `/admin/journey`（講師別 平均改善率・継続率・修了率）
  - API: `GET /api/journey/roster` · `GET /api/admin/journey`
  - Supabase: `journey_stages` / `achievement_master` / `journey_progress` / `client_achievements` + RLS
  - `lib/journey/*` · `components/journey/*` · `supabase/migrations/20260724180000_sleep_wellness_journey.sql`

## [Unreleased] — 2026-07-24（Version 2.0 / Client Portal）

### Added
- **Client Portal（クライアント専用画面）**: 認定講師だけでなく、クライアント本人が自分の睡眠改善状況を確認できる専用画面
  - `/client` Home（今日のスコア / 今週推移 / 改善率 / 現在の目標 / 今日のメッセージ）
  - `/client/sleep` Sleep Record（睡眠時間・効率・HRV・ストレス・体内時計・呼吸数・安静時心拍 + グラフ）
  - `/client/advice` Today's Advice（AIアドバイス）
  - `/client/homework` Homework（宿題・呼吸法・メラトニンヨガ™ / 動画・PDF・完了チェック）
  - `/client/journey` Journey（5ステージ Map / Progress / Achievements / AI Coach / 前回比較・認定講師コメント）
  - `/client/reports` Report（改善レポート PDF 閲覧・過去レポート）
  - `/client/chat` Chat（認定講師とのメッセージ）
  - `/client/goals` Goals（睡眠改善目標・達成率）
  - 講師側: `/clients/[id]` に Client Portal 連携・宿題管理・チャット送信を接続
  - API: `/api/client-portal/messages` · `/notifications` · `/goals`
  - Supabase: `client_profiles` 拡張 / `client_messages` / `client_notifications` / `client_goal_progress` + RLS
  - `lib/client-portal/*` · `supabase/migrations/20260724160000_client_portal.sql`

## [Unreleased] — 2026-07-24（Version 2.0 / ライセンス・サブスクリプション）

### Added
- **ライセンス・サブスクリプション管理**: SWIJ 認定講師ライセンスをプラットフォーム上で管理
  - 講師画面 `/license`（My License / Subscription / Digital Certificate / Continuing Education）
  - 管理者画面 `/admin/license`（発行・更新・停止・失効・認定履歴・検索・CSV）
  - API: `GET /api/license` · `GET/POST/PATCH /api/admin/license`
  - Supabase: `licenses` / `subscriptions` / `certificates` / `continuing_education` / `payment_history` + RLS
  - `lib/license/*` · `supabase/migrations/20260724140000_licenses_subscriptions.sql`

## [Unreleased] — 2026-07-24（Version 2.0 / βフィードバック）

### Added
- **βテスト フィードバック機能**: 認定講師が不具合・改善要望などを送信し、管理者が対応状況を管理
  - 送信画面 `/feedback`（カテゴリー / 対象画面 / 重要度 / 内容 / 再現手順 / 端末・ブラウザ + 自動取得情報）
  - 管理者画面 `/admin/feedback`（一覧・絞り込み・詳細・対応状況・管理者メモ）
  - API: `POST/GET /api/feedback` · `GET/PATCH /api/admin/feedback`
  - Supabase: `beta_feedback` テーブル + RLS（自分の作成・閲覧 / 管理者の全件閲覧・更新）
  - `lib/feedback/*` · `supabase/migrations/20260724120000_beta_feedback.sql`

## [Unreleased] — 2026-07-24（Version 1.1 / Demo Mode）

### Added
- **Demo Mode**: 初見ユーザーが約30秒で全体像を把握できるデモ体験
  - Demo Dashboard（`/demo`）: サンプル認定講師・クライアント12名・AI / Journey / Homework / Follow Up / レポート概要
  - Demo Flow（`/demo/flow/*`）: データ収集 → 睡眠分析 → AI提案 → Homework → Journey → Follow Up → 改善レポートを1クリック体験
  - ログイン画面からワンクリック開始（Supabase 設定時もサンプルのみ・実データ非連携）
  - `lib/demo-mode/*` · `components/demo/*` · `lib/demo-clients.ts`（12名）
- **AI Counseling Assistant**: クライアント詳細（`/clients/[id]`）に、睡眠データ・Journey・Homework・過去分析から次回カウンセリング確認ポイントを提案するカードを追加（ルールベース / LLM 差し替え口あり）
  - AI Summary / AI Recommendations / Suggested Homework / Risk Alerts
  - `lib/ai-counseling-assistant.ts` · `components/AiCounselingAssistantCard.tsx`
- **Admin HQ Dashboard**: SWIJ 本部向け管理者ダッシュボードを `/admin` に実装
  - Overview / Instructor Management / Client Statistics / Platform Analytics / Alerts / Quick Actions
  - `getAdminHqDashboard`（Supabase 実データ）+ demo フォールバック
  - `components/admin/AdminHqDashboard.tsx`

## [1.0.0-rc.1] — 2026-07-24

### Changed
- Version 1.0 Beta を **Release Candidate 1（RC1）** として凍結整理
- `package.json` version `1.0.0` → `1.0.0-rc.1`、`typecheck` スクリプト追加
- README を製品向け（概要・機能・起動・Supabase・フォルダ構成・実装済み / v1.1 予定）に更新
- OCR / 分析まわりの冗長 `console.info` を削除（本番ノイズ削減）
- TODO.md を RC1 / 実運用テスト向けに整理

### Removed
- 未使用: `SchemaSetupBanner` / `lib/supabase/health.ts` / `lib/trend-analysis.ts`
- 未使用 hooks stub・空 API ディレクトリ
- Create-Next-App 由来および未参照の public アセット

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
