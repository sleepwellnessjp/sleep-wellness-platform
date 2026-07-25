# Current Implementation

> 調査日: 2026-07-22  
> 分類は **コード上の実体** に基づく。構想のみは「未実装」。

## 分類定義

| 段階 | 意味 |
|---|---|
| **実装済み** | 主要フローが動作し、本番データ経路（Supabase / OpenAI）または同等の永続化がある |
| **一部実装** | UI・ロジックはあるが、デモフォールバック・未完成・権限/永続化に穴がある |
| **UIのみ／ダミーデータ** | 画面または API はあるが、主に demo store / localStorage / 固定文 / Planned パネル |
| **未実装** | ルート・Module 名・構想文書に名前があっても、実機能がない（Marketplace 等） |

---

## 機能別ステータス

| 機能 | 段階 | 根拠（要約） |
|---|---|---|
| 認証 | **実装済み** | Supabase Auth + `proxy.ts`。公開は `/` のみ（`/login`・`/auth/*`・`/forbidden` は認証インフラ）。未設定時デモ |
| 管理者画面 | **一部実装** | `/admin/*` UI・API あり。Supabase 時は service、未設定時は `demo-admin-store` |
| 認定講師画面 | **実装済み** | `/dashboard`, `/clients`, `/programs`, `/analysis/*`, `/portal` |
| クライアント画面 | **一部実装** | `/client` に Coach/Journey/宿題/履歴。ポータル連携・RLS 依存。デモ可 |
| クライアント管理 | **実装済み** | CRUD・プロフィール・タグ・アポイント・指導メモ・比較 |
| 睡眠分析フロー | **実装済み** | new → confirm → loading → result。クレジット消費・永続化あり |
| OCR | **実装済み** | `POST /api/extract`（OpenAI Vision `gpt-4o`） |
| AI分析 | **実装済み** | `POST /api/analyze`（OpenAI `gpt-4o` + JSON schema） |
| Medical Report | **一部実装** | 結果画面の Expert Report。PDF 専用ライブラリなし（印刷） |
| Visual Report | **一部実装** | 結果画面の Visual Report（チャート）。印刷ベース |
| PDF | **一部実装** | `window.print()` のみ。履歴リストは分析から生成 |
| 宿題 | **実装済み** | `client_homeworks` + AI宿題（`recommendationsUntilNext`） |
| 達成率 | **実装済み** | AI宿題チェック・宿題完了率・比較表示 |
| 継続日数 | **一部実装** | 宿題ストリーク / 日次 content の localStorage ストリーク |
| Sleep Coach | **実装済み** | ルールベース（`lib/sleep-coach.ts`）。GPT 差し替え口はあるが未配線 |
| Journey | **実装済み** | ルールベース（`lib/sleep-wellness-journey.ts`） |
| Instructor Insight | **実装済み** | ルールベース（`lib/instructor-insight.ts`）。名称に AI とあるが外部 AI 不使用 |
| Academy | **一部実装** | カタログ・学習・試験・証明書 UI + DB。未設定時 localStorage/seed。資格の自己 INSERT 可（RLS） |
| Community | **一部実装** | 画面・DB・RLS。未設定時 localStorage seed |
| Insights（SWI） | **一部実装** | 集計ロジック + API。未設定時 `demo-swi-store` |
| Research | **UIのみ／ダミー** | `/research` は PlannedModulePanel。実ライブラリは Community knowledge タブ側 |
| Companies | **UIのみ／ダミー** | `/companies` Planned。`/enterprise` はデモ KPI |
| Billing | **UIのみ／ダミー** | `/billing` Planned。クレジット自体は platform で一部実装 |
| クレジット／会員 | **一部実装** | membership / monthly_credit RPC。ポータル表示あり |
| Notifications | **UIのみ／ダミー** | OS 通知センター。多くが `demoOsNotifications` フォールバック |
| Developer API | **UIのみ／ダミー** | UI・OpenAPI・v1 ルートあり。API Key は **demo-store 固定**。v1 リソースはインメモリデモ多い |
| Marketplace | **未実装** | コード・文書に該当なし |
| Events / Retreat / Reports（独立 Module） | **UIのみ／ダミー** | PlannedModulePanel のみ |
| グローバル検索 | **一部実装** | `/api/os/search` + UI。デモカタログ混在 |
| Settings | **一部実装** | `/settings` プロフィール表示中心。2FA 等は未実装 |

---

## 認証の詳細

| 項目 | 実態 |
|---|---|
| 方式 | Supabase Auth（セッション Cookie、`@supabase/ssr`） |
| 入口 | `/login`, `/auth/callback` |
| 保護 | `proxy.ts`（Next.js Proxy / Middleware） |
| デモ | `NEXT_PUBLIC_SUPABASE_URL` / anon key 未設定 → `isDemoMode` |
| Role 取得 | `profiles.role` |
| 存在する Role | `super_admin`, `admin`, `instructor`, `client`, `enterprise` |

---

## 環境変数（コード参照）

| 変数 | 用途 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key（フォールバック） |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable key（優先） |
| `OPENAI_API_KEY` | OCR / AI 分析（サーバーのみ） |
| `NODE_ENV` | 開発時ログ等 |

`.env.example` はリポジトリ内で未検出（`SUPABASE_SETUP.md` に記載あり）。

---

## 外部 API

| 外部サービス | 用途 | 呼び出し箇所 |
|---|---|---|
| OpenAI Responses API (`gpt-4o`) | OCR / 睡眠分析 | `app/api/extract`, `app/api/analyze` |
| Supabase | Auth / DB | `lib/supabase/*`, repositories |

その他の決済・メール・カレンダー外部連携の本番実装は未確認（アポイントに GCal 向けフィールドはあるが連携クライアント未確認）。

---

## ダミー／デモデータ一覧

| 場所 | 用途 |
|---|---|
| `lib/admin/demo-admin-store.ts` | Admin 各画面フォールバック |
| `lib/swi/demo-swi-store.ts` | Insights デモ |
| `lib/platform/demo-platform-store.ts` | クレジット等デモ |
| `lib/api-platform/demo-store.ts` | API Key / Webhook / Audit |
| `lib/api-platform/v1-resources.ts` | v1 デモリソース |
| `lib/os/enterprise-demo.ts` | 企業 Home |
| `lib/os/notifications.ts` (`demoOsNotifications`) | 通知デモ |
| `lib/auth/demo-session.ts` | デモセッションフラグ |
| `lib/client-store.ts` | ローカル分析シード |
| Academy / Community repository の `seedDemoStore` | localStorage 初期データ |

---

## 未使用・削除・重複の兆候（調査時点）

厳密な dead-code 解析は未実施。コード調査で確認できたもの:

| 種類 | 内容 |
|---|---|
| Git 上削除済みコンポーネント | `AnalysisInsightCards`, `AuthStatusBar`, `NewClientModal`, `ClientAiKarteTimeline`, `ClientLongTermTrends`, `DashboardRetentionRings` 等 |
| UI 二重化 | `components/ui/*` と `design-system/*`（移行中） |
| SQL 二重管理 | `supabase/*.sql`（Editor 用）と `supabase/migrations/*` |
| 未マイグレーション | `supabase/api-platform.sql`（テーブル定義はあるが migrations / `database.types.ts` に未収録。実行時認証は demo-store） |
| TODO コメント | 実質的な `TODO`/`FIXME` はほぼ無し（証明書形式コメント程度） |

---

## Module Registry ステータス（`modules/registry.ts`）

| Module | Registry status | 実コード上の評価 |
|---|---|---|
| dashboard / clients / analysis / ai / sleep-coach / journey / homework / academy / community / insights / settings / developer | active（notifications は beta） | 上記表参照（developer はダミー寄り） |
| research / retreat / events / companies / reports / billing | planned | UI のみ |

---

## 品質結果（2026-07-22 実行）

| コマンド | 結果 |
|---|---|
| `npx tsc --noEmit` | **成功**（エラー出力なし） |
| `npm run lint` | **成功**（エラー出力なし） |
| `npm run build` | **成功**（全ルート生成完了） |

本作業ではアプリコードの修正は行っていない。
