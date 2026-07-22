# Sleep Wellness Platform Bible

> 基準文書（Single Source of Truth）  
> 調査日: 2026-07-22  
> 根拠: リポジトリ内の実装・SQL・既存文書のみ（構想のみの機能は実装済みとしない）

関連文書:

| 文書 | 内容 |
|---|---|
| [CURRENT_IMPLEMENTATION.md](./CURRENT_IMPLEMENTATION.md) | 機能の実装段階 |
| [DATABASE_AND_RLS.md](./DATABASE_AND_RLS.md) | テーブル・RLS |
| [ROLE_AND_PERMISSION_MATRIX.md](./ROLE_AND_PERMISSION_MATRIX.md) | Role 権限 |
| [SCREEN_AND_ROUTE_MAP.md](./SCREEN_AND_ROUTE_MAP.md) | 画面・ルート |
| [AI_AND_RULE_ENGINE.md](./AI_AND_RULE_ENGINE.md) | AI / ルールエンジン |
| [ROADMAP.md](./ROADMAP.md) | 現実的ロードマップ |
| [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) | v1.0 公開前チェック |
| [GLOSSARY.md](./GLOSSARY.md) | 用語統一 |

---

## 1. プロジェクト名称

| 種別 | 表記 |
|---|---|
| リポジトリ / パッケージ名 | `sleep-wellness-platform`（`package.json`） |
| プロダクト名 | **Sleep Wellness Platform** |
| 運営ブランド | **Sleep Wellness Institute Japan** |
| 略称 | **SWIJ** |
| OS 構想名（設計文書） | Sleep Wellness OS（`docs/SLEEP_WELLNESS_OS.md`） |

---

## 2. 運営ブランド

**Sleep Wellness Institute Japan（SWIJ）**

コード・UI 上の根拠:

- フッター・ログイン・分析画面のロゴ alt / コピー（`components/Footer.tsx`, `app/login/page.tsx`）
- ダッシュボードの「Sleep Wellness Institute Japan News」（`app/dashboard/page.tsx`）
- Community 画面の「SWIJ COMMUNITY」（`app/community/page.tsx`）
- 認定番号形式 `SWIJ-YYYY-XXXX`（`lib/academy/scoring.ts`）

---

## 3. Mission / Vision / Values

既存コード・ランディング表現から抽出した現時点の公式メッセージ。別途ブランドブックはリポジトリ内に未確認。

### Mission（使命）

睡眠科学・ヨガ・呼吸・瞑想・日本文化・テクノロジーを融合し、**一人ひとりの眠りを整え、社会全体のウェルネスへつなげる**。

根拠: `components/Hero.tsx` / `components/Vision.tsx` / `components/About.tsx`

### Vision（ビジョン）

> Sleep is the Foundation of Life.  
> 睡眠を、人生の土台へ。  
> 睡眠を、日本の新しい文化へ。

根拠: `components/Vision.tsx`, `components/Hero.tsx`

### Values（価値観）— エコシステム4本柱

| Pillar | 日本語 | 内容（画面コピー） |
|---|---|---|
| DATA | 睡眠分析 | ウェアラブルと生活習慣から眠りの状態を可視化する |
| PRACTICE | 身体実践 | ヨガ・呼吸・瞑想で心身を休息モードへ導く |
| LEARNING | 学びと育成 | アカデミーと講座で睡眠ウェルネスを伝える人を育てる |
| COMMUNITY | 社会実装 | 企業・地域・メディアと連携し、良い眠りを社会へ広げる |

根拠: `components/Vision.tsx`

---

## 4. ブランドメッセージ

| 用途 | 推奨表記 |
|---|---|
| メインキャッチ | 睡眠を、日本の新しい文化へ。 |
| 英語ビジョン | Sleep is the Foundation of Life. |
| サブコピー | 日本初の Sleep Wellness Platform |
| エコシステム | Sleep Wellness Ecosystem |
| 非医療免責 | 本サービス／本レポートは睡眠ウェルネス支援であり、医療診断・治療を代替しません。 |

根拠: Hero / Vision / 分析結果の `disclaimer` フィールド / `lib/client-store.ts` シード文言

---

## 5. プラットフォームの目的

Sleep Wellness Platform は、SWIJ の認定講師がクライアントの睡眠データを理解し、実践（メラトニンヨガ™等）と学びを通じて継続的な睡眠ウェルネス改善を支援するための **業務・実践プラットフォーム** である。

現時点の中核ユースケース（実装あり）:

1. SOXAI 画面の OCR → 指標確認 → AI 分析レポート
2. クライアント管理・プロフィール・プログラム
3. 宿題・達成・継続のフォロー
4. ルールベースの Sleep Coach / Journey / Instructor Insight
5. Academy / Community / Insights（一部デモフォールバックあり）
6. Role 別 Home（管理者 / 講師 / クライアント / 企業デモ）

---

## 6. 対象ユーザー

| Role（DB: `profiles.role`） | 対象 | Home |
|---|---|---|
| `super_admin` / `admin` | プラットフォーム運営者 | `/admin` |
| `instructor` | 認定講師 | `/dashboard` |
| `client` | 指導を受けるクライアント（ポータル連携時） | `/client` |
| `enterprise` | 企業管理者（型・画面デモ） | `/enterprise` |

※ `company_admin` という Role 名はコード・SQL に存在しない。企業向けは `enterprise`。

---

## 7. サービス全体像

```text
[Landing /] ─── ブランド・Programs 紹介
      │
[Login] ─── Supabase Auth（未設定時はデモモード）
      │
      ├─ admin / super_admin ──► Admin OS（KPI / Academy / Insights / Community / Developer / System）
      ├─ instructor ───────────► Instructor OS（予約・宿題・Insight・Clients・Analysis・Academy…）
      ├─ client ───────────────► Client Home（Coach / Journey / Mission / 宿題 / 履歴 / ヨガ）
      └─ enterprise ───────────► Enterprise Home（デモKPI）
```

技術スタック（`package.json` より）:

- Next.js 16 / React 19 / TypeScript / Tailwind CSS 4
- Supabase（Auth + Postgres + RLS）
- OpenAI（`gpt-4o` — OCR Vision / AI 分析）

---

## 8. 設計原則

コード・Architecture 文書に明示されている原則:

| 原則 | 内容 | 根拠 |
|---|---|---|
| Module-first | 機能は `modules/` に登録し独立保守 | `Architecture.md` |
| Thin Routes | `app/` は組み立て中心 | `Architecture.md` |
| Design System | `@/design-system` に UI 共通化（移行中） | `Architecture.md` |
| Role-first Home | ログイン後は Role 別 Home | `docs/SLEEP_WELLNESS_OS.md` |
| Unified Chrome | 検索・通知・設定を共有 | `components/os/*` |
| Progressive | 既存 `lib/` / `components/` を壊さず段階移行 | `Architecture.md` |
| Demo fallback | Supabase 未設定時は localStorage / demo store | `SUPABASE_SETUP.md`, `lib/auth/use-auth.ts` |

---

## 9. 医療サービスではないこと

本プラットフォームは **医療機器・医療機関・診断・治療を提供しない**。

実装上の担保:

- AI 分析プロンプトで診断・治療断定を禁止（`app/api/analyze/route.ts`）
- 分析結果に `disclaimer` / `caution` を必須スキーマ項目として要求
- 分析画面に非医療文言を表示（`app/analysis/new/page.tsx` 等）
- Instructor Insight 説明: 「診断ではありません」（`app/dashboard/page.tsx`）

---

## 10. 個人情報と睡眠データを扱う基本原則

コード・RLS・設計から読み取れる原則:

1. **最小権限**: 講師は自担当クライアント（`clients.instructor_id`）、クライアントはリンク済み本人データ、管理者は運営範囲。
2. **RLS 前提**: 主要テーブルで RLS 有効。ポリシーと SECURITY DEFINER RPC の組み合わせで制御。
3. **匿名集計**: Insights（SWI）は個人を返さない設計（`lib/swi/swi-service.ts` コメント・集計層）。
4. **デモと本番の分離**: 環境変数未設定時はデモ。本番では `NEXT_PUBLIC_SUPABASE_*` と `OPENAI_API_KEY` が必須。
5. **医療・機微情報の扱い**: プロフィールに健康関連フィールドがある。AI 入力は「診断ではなく事実ベース整理」（`lib/client-profiles/ai-input.ts`）。
6. **公開前の必須確認**: RLS・他人データ横断・免責・利用規約・プライバシーポリシー（→ `RELEASE_CHECKLIST.md`）。

---

## 11. ブランド表現一覧（優先表記）

| 名称 | 推奨表記 | 備考 |
|---|---|---|
| 運営団体 | Sleep Wellness Institute Japan | 正式名称 |
| 略称 | SWIJ | ロゴ・認定番号・API ヘッダ |
| プロダクト | Sleep Wellness Platform | アプリ全体 |
| スコア | Sleep Wellness Score | SOXAI 睡眠スコアとは別物 |
| 日次コーチ | Sleep Coach | 現状ルールベース |
| 改善物語 | Sleep Wellness Journey | 画面では Journey |
| 身体実践 | メラトニンヨガ™ | 商標表記を維持 |

詳細は [GLOSSARY.md](./GLOSSARY.md)。

---

## 12. 開発者への使い方

1. 機能追加・変更前に本 Bible と `CURRENT_IMPLEMENTATION.md` で **実装段階** を確認する。
2. DB / 権限変更は `DATABASE_AND_RLS.md` と `ROLE_AND_PERMISSION_MATRIX.md` を更新してから行う。
3. 構想のみの Module（Research / Retreat / Events / Companies / Billing / Reports / Marketplace）を「実装済み」と書かない。
4. AI とルールエンジンの区別は `AI_AND_RULE_ENGINE.md` に従う。
5. 公開判定は `ROADMAP.md` の Version 1.0 と `RELEASE_CHECKLIST.md` を使う。

---

## 13. 品質スナップショット（2026-07-22）

本調査時に実行:

| 検査 | 結果 |
|---|---|
| `npx tsc --noEmit` | 成功（エラーなし） |
| `npm run lint` | 成功（エラーなし） |
| `npm run build` | 成功 |

詳細は `CURRENT_IMPLEMENTATION.md` 末尾および `RELEASE_CHECKLIST.md`。
