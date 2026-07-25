# Sleep Wellness Platform — Architecture (Version 3.0)

> モジュール型プラットフォーム設計  
> 目的: 今後 100 画面以上になっても、機能単位で独立して追加・保守できる構造にする

---

## 1. 設計原則

| 原則 | 内容 |
|---|---|
| Module-first | 全機能は独立した Module として定義する |
| Thin Routes | `app/` はルーティングとページ組み立てのみ。業務ロジックを置かない |
| Design System | UI の共通部品は `@/design-system` に集約する |
| Shared Hooks | データ取得・生成の入口は `@/hooks` に揃える |
| Stable Facades | 既存 `lib/` / `components/` は当面維持し、Module から再エクスポートする |

既存実装を壊さず、**境界（Module / Design System / Hooks）を先に固定**する方針です。  
ドメインロジックの物理移動は段階的に行い、新しい機能は最初から Module 配下に実装します。

---

## 2. フォルダ構成

```text
sleep-wellness-platform/
├── app/                      # Next.js App Router（薄い Route 層）
│   ├── dashboard/            # 講師 Home
│   ├── clients/              # Clients Module routes
│   ├── analysis/             # Analysis Module routes
│   ├── academy/              # Academy Module routes
│   ├── community/            # Community Module routes
│   ├── insights/             # Insights Module routes
│   ├── client/               # クライアント Home（Coach / Journey / Homework）
│   ├── research/             # Research（planned）
│   ├── retreat/              # Retreat（planned）
│   ├── events/               # Events（planned）
│   ├── companies/            # Companies（planned）
│   ├── reports/              # Reports（planned）
│   ├── billing/              # Billing（planned）
│   ├── notifications/        # Notifications Module
│   ├── settings/             # Settings Module
│   └── api/                  # HTTP adapters（Module service を呼ぶ）
│
├── modules/                  # ★ Version 3.0 の中核
│   ├── index.ts              # Registry 公開 API
│   ├── registry.ts           # Module 一覧・ステータス
│   ├── types.ts              # ModuleManifest 契約
│   ├── _shared/              # 横断ユーティリティ / ModulePageShell
│   ├── dashboard/
│   ├── clients/
│   ├── analysis/
│   ├── ai/
│   ├── sleep-coach/
│   ├── journey/
│   ├── homework/
│   ├── academy/
│   ├── community/
│   ├── insights/
│   ├── research/
│   ├── retreat/
│   ├── events/
│   ├── companies/
│   ├── reports/
│   ├── billing/
│   ├── notifications/
│   └── settings/
│
├── design-system/            # ★ 共通 UI（Design System）
│   ├── index.ts
│   ├── Card / Button / Modal / Table / Timeline
│   ├── Chart / ScoreGauge / Badge / Toast
│   ├── Loading / Skeleton / ErrorView / ProfileCard
│   └── tokens.ts
│
├── hooks/                    # ★ 共通 Hooks
│   ├── useAuth / useClient / useAnalysis
│   ├── useJourney / useHomework / useInsights / useAI
│   ├── useSleepCoach / useAcademy / useCommunity
│   └── useNotifications
│
├── components/               # 既存 UI（段階移行中）
│   ├── ui/                   # design-system の実装元（互換維持）
│   └── os/                   # OS Chrome（TopBar / Nav / Search / Notify）
│
├── lib/                      # 既存ドメイン実装（段階移行中）
│   ├── repositories/         # データアクセス（Module repository が再エクスポート）
│   ├── academy / community / swi / os / platform ...
│   └── auth / supabase ...
│
├── docs/
│   └── SLEEP_WELLNESS_OS.md  # Role / OS Chrome 設計
└── Architecture.md           # 本ドキュメント
```

### 各 Module の標準構成

```text
modules/<module-id>/
├── index.ts              # 公開 API（barrel）
├── routes.ts             # ルート定数
├── components/           # Module 専用 UI
├── services/             # 業務ロジック facade
├── repositories/         # データアクセス facade
└── hooks/                # Module 向け hook 再エクスポート
```

---

## 3. Module 構成

`modules/registry.ts` が単一の真実源です。

| Module | Status | Base Path | 役割 |
|---|---|---|---|
| Dashboard | active | `/dashboard` | ロール別 Home（講師 / 管理 / クライアント / 企業） |
| Clients | active | `/clients` | クライアント CRUD・詳細 |
| Analysis | active | `/analysis` | SOXAI 分析フロー |
| AI | active | `/insights` | Instructor Insight / Follow Alerts |
| Sleep Coach | active | `/client#sleep-coach` | 日次コーチ提案 |
| Journey | active | `/client#journey` | Sleep Wellness Journey™ |
| Homework | active | `/client#homework` | 宿題・達成率 |
| Academy | active | `/academy` | 講座・テスト・証明書 |
| Community | active | `/community` | ディスカッション・ナレッジ |
| Insights | active | `/insights` | SWI 集計（匿名化） |
| Research | planned | `/research` | 研究ライブラリ（独立予定） |
| Retreat | planned | `/retreat` | リトリート |
| Events | planned | `/events` | イベント・セミナー |
| Companies | planned | `/companies` | 企業テナント |
| Reports | planned | `/reports` | PDF / レポート |
| Billing | planned | `/billing` | クレジット・請求 |
| Notifications | beta | `/notifications` | OS 通知 |
| Settings | active | `/settings` | プロフィール・通知設定 |

### Module 間の依存ルール

1. **Module → Design System / Hooks / `_shared`** … OK  
2. **Module → 自 Module の service / repository** … OK  
3. **Module → 他 Module の内部実装** … NG（公開 `index.ts` 経由のみ）  
4. **`app/` → Module** … OK（薄い組み立て）  
5. **`app/api` → Module service / repository** … OK  

---

## 4. Component 構成（Design System）

`@/design-system` から import します。

| Component | 用途 |
|---|---|
| `Card` | セクション / インタラクション容器 |
| `Button` | CTA / 操作 |
| `Modal` | 確認・フォームダイアログ |
| `Table` | 一覧テーブル |
| `Timeline` | 時系列イベント |
| `Chart` | 簡易折れ線（ダッシュボード向け） |
| `ScoreGauge` | スコア円ゲージ |
| `Badge` | ステータスラベル |
| `Toast` | 一時通知（Provider + `useToast`） |
| `Loading` | スピナー |
| `Skeleton` | スケルトン |
| `ErrorView` | エラー表示 |
| `EmptyState` | 空状態 |
| `ProfileCard` | 人物 / 組織の要約カード |
| `tokens` | Navy / Gold / Teal / Surface など |

ドメイン特化 UI（例: `SleepCoachCard`, `SwiInsightsDashboard`）は **各 Module の `components/`** に置きます。

---

## 5. 共通 Hooks

| Hook | Module | 説明 |
|---|---|---|
| `useAuth` | 横断 | 認証状態・サインアウト |
| `useClient` | Clients | 一覧 or 詳細取得 |
| `useAnalysis` | Analysis | 保存済み分析の取得 |
| `useJourney` | Journey | Journey™ 生成 |
| `useHomework` | Homework | 宿題一覧 + refresh |
| `useInsights` | Insights | SWI overview（API） |
| `useAI` | AI | Insight + Follow Alerts |
| `useSleepCoach` | Sleep Coach | 日次コーチ生成 |
| `useAcademy` | Academy | レッスンカタログ |
| `useCommunity` | Community | ディスカッション取得 |
| `useNotifications` | Notifications | 通知フィード |

非同期状態は `modules/_shared/async-state.ts` の  
`{ data, loading, error }` に統一しています。

---

## 6. Route / Service / Repository の関係

```text
Browser
  │
  ▼
app/<route>/page.tsx          ← Route（薄い）
  │  imports Module UI / Hooks
  ▼
modules/<id>/components       ← Module UI
modules/<id>/hooks            ← Module Hook
  │
  ▼
modules/<id>/services         ← Service facade
  │
  ▼
modules/<id>/repositories     ← Repository facade
  │
  ▼
lib/repositories/*            ← 現行実装（Supabase / demo store）
lib/<domain>/*                ← 現行ドメインロジック
```

API Route も同様に薄いアダプタにします。

```text
app/api/.../route.ts  →  modules/*/services  →  lib/*
```

---

## 7. 今後追加しやすい設計

### 新 Module を追加する手順

1. `modules/<id>/` に標準 4 層（components / services / repositories / hooks）を作成  
2. `modules/registry.ts` に `ModuleManifest` を登録  
3. `app/<id>/page.tsx` を薄い Route として追加  
4. 画面はデフォルトで認証必須（`proxy.ts` の公開許可リスト外）。新規公開パスが必要なら許可リストに明示追加する。  
5. Design System 部品のみで UI を組み立て、独自 UI は Module `components/` へ  
6. データ取得は `hooks/` に置き、画面は表示に専念  

### Planned → Active への昇格

planned Module（Research / Retreat / Events / Companies / Reports / Billing）は  
すでに Route + Service stub + `PlannedModulePanel` を持っています。

昇格時:

1. repository を実データ接続  
2. service に業務ルールを実装  
3. `PlannedModulePanel` を本画面に置換  
4. registry の `status` を `active` / `beta` に更新  

### 段階的移行（既存コード）

| Phase | 内容 |
|---|---|
| Now | Module facade + Design System + Hooks + Registry（本実装） |
| Next | 新規画面は Module 配下のみに実装 |
| Later | `lib/*` / `components/*` を Module 内へ物理移動 |
| Final | `app/` はほぼ re-export / composition のみ |

---

## 8. OS との関係

Version 3.0 は **Module アーキテクチャ** と **Sleep Wellness OS（Role Home / Chrome）** を両立します。

- OS Chrome: `components/os/*`, `lib/os/*`  
- Role Home: `/admin`, `/dashboard`, `/client`, `/enterprise`  
- Module: 機能単位の境界（本ドキュメント）  

詳細は `docs/SLEEP_WELLNESS_OS.md` を参照してください。

---

## 8.1 Version 4.0 — API Platform（Open Platform）

Version 4.0 で Sleep Wellness Platform を外部連携可能な Open Platform へ拡張します。

| 要素 | パス |
|---|---|
| Developer Dashboard | `/developer` |
| OpenAPI（自動生成） | `/api/v1/openapi` |
| REST API v1 | `/api/v1/*` |
| コア実装 | `lib/api-platform/` |
| Module | `modules/developer/` |
| Developer Guide | `docs/API_PLATFORM_DEVELOPER_GUIDE.md` |
| DB スキーマ | `supabase/api-platform.sql` |

認証: API Key / JWT / Role · Webhook · Rate Limit · 監査ログ

---

## 9. Import ガイド

```ts
// ✅ Design System
import { Card, Button, Badge, Loading } from "@/design-system";

// ✅ Shared hooks
import { useClient, useHomework, useAuth } from "@/hooks";

// ✅ Module public API
import { clientsService, CLIENTS_ROUTES } from "@/modules/clients";
import { MODULE_REGISTRY, getModule } from "@/modules";

// ⚠️ 既存互換（移行中）
import Button from "@/components/ui/Button";
import { loadClients } from "@/lib/repositories/client-repository";
```

---

## 10. 成功指標

1. 新機能追加時に触るディレクトリが `modules/<id>` + `app/<route>` +（必要なら）`hooks` / `design-system` に収まる  
2. Module 間の deep import が発生しない  
3. UI の見た目差分は Design System tokens で吸収できる  
4. TypeScript / lint / build が常に通る  

---

*Generated for Sleep Wellness Platform Version 3.0 Architecture.*
