# Sleep Wellness Platform

**Version 1.0 Beta** — 認定講師限定公開版

認定講師がクライアントの睡眠データを分析・指導するための Sleep Wellness Institute Japan（SWIJ）プラットフォームです。  
本バージョンをもって開発フェーズを終了し、第1期・第2期認定講師限定の β 運用を開始します。

---

## 概要

SOXAI 睡眠データの OCR 抽出、AI による睡眠分析、クライアント管理、宿題・フォローアップ、ルールベースの Sleep Coach / Journey / Instructor Insight を一体で提供します。  
認証・永続化は Supabase、画像 OCR / AI 分析は OpenAI（`gpt-4o`）を利用します。環境変数未設定時はデモモード（localStorage）で動作します。

---

## 主な機能

- **認証・ロール**: Supabase Auth（講師 / クライアント / 管理者 など）とルート保護
- **クライアント管理**: CRUD、プロフィール、タグ、比較、ポータル連携
- **睡眠分析フロー**: 画像アップロード → OCR → 確認 → AI 分析 → 結果保存
- **レポート（PDF / 印刷）**: Visual / Expert Report（ブラウザ印刷・A4×3）
  - **AIから講師への提案**: 重点ヒアリング / 次回比較データ / 生活習慣確認 / 改善見込み / 観察ポイント
- **クレジット**: 月次分析クレジットの消費・残高管理
- **宿題 / フォローアップ**: 講師付与・クライアント完了・達成率
- **Sleep Coach / Journey / Instructor Insight**: ルールベースの指導支援
- **Closed Beta 運営**: 招待・同意・フィードバック・Evidence 収集（本部向け）

---

## 開発環境

| 項目 | 内容 |
|---|---|
| Node.js | 20 LTS 以上推奨 |
| パッケージマネージャ | npm |
| フレームワーク | Next.js 16（App Router） |
| UI | React 19 / Tailwind CSS 4 |
| 言語 | TypeScript 5 |
| BaaS | Supabase（Auth / DB / RLS） |
| AI | OpenAI API（`OPENAI_API_KEY`） |

---

## 起動方法

```bash
# 依存関係のインストール
npm install

# 環境変数（初回）
cp .env.example .env.local
# .env.local を編集してキーを設定

# 開発サーバー
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

```bash
# 型チェック
npx tsc --noEmit

# ESLint
npm run lint

# 本番ビルド
npm run build
npm start
```

---

## Supabase 設定方法

詳細は [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) を参照してください。概要は次のとおりです。

1. [Supabase](https://supabase.com/) でプロジェクトを作成する  
2. **Project Settings → API** から Project URL と anon / publishable key を取得する  
3. プロジェクトルートの `.env.local` に設定する:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...
# または後方互換:
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
OPENAI_API_KEY=sk-...
```

4. Supabase SQL Editor で `supabase/migrations/` 下の SQL を **ファイル名順** に適用する  
5. Auth でユーザーを作成し、`profiles.role` を講師（`instructor`）等に設定する

> `service_role` キーは `NEXT_PUBLIC_*` やブラウザに絶対に含めないでください。  
> Supabase 未設定の場合はデモモードで起動できますが、OCR / AI 分析には `OPENAI_API_KEY` が必要です。

---

## フォルダ構成

```text
sleep-wellness-platform/
├── app/                 # Next.js App Router（画面・API）
├── components/          # UI コンポーネント
├── design-system/       # デザインシステム
├── hooks/               # 共通 React hooks
├── lib/                 # ドメインロジック・repositories・Supabase
├── modules/             # Module Registry（機能単位）
├── public/              # 静的アセット
├── scripts/             # 検証スクリプト
├── supabase/            # schema / migrations / Editor 用 SQL
├── docs/                # 設計・実装状況・Roadmap 等
├── Architecture.md      # アーキテクチャ方針
├── SUPABASE_SETUP.md    # Supabase セットアップ詳細
├── CHANGELOG.md         # 変更履歴
└── TODO.md              # 残タスク / 既知課題
```

---

## Version 1.0 Beta で実装済み機能

認定講師の実運用に必要な中核機能です。

| 領域 | 内容 |
|---|---|
| 講師ダッシュボード | クライアント一覧・分析導線・オンボーディング |
| クライアント CRUD / プロフィール | 基本情報・生活習慣・タグ・比較 |
| SOXAI OCR | `/api/extract`（Vision）による指標抽出・競合検出 |
| AI 睡眠分析 | `/api/analyze` + 結果画面（Visual / Expert） |
| AIから講師への提案 | ヒアリング・次回比較・生活習慣・改善見込み・観察（PDF 含む） |
| 分析クレジット | 月次クレジット確保・分析時消費（RPC） |
| 宿題 | 講師管理・AI 次回までの推奨・クライアント完了 |
| Sleep Coach / Journey / Insight | ルールベース生成・画面組み込み |
| クライアント Home | Coach / Journey / 宿題 / 分析履歴（ポータル） |
| Auth / ルート保護 | 公開は `/` のみ。他は `proxy.ts` でログイン必須・Role 別保護 |
| Closed Beta 運営 | 招待・同意・フィードバック・Evidence・本部 KPI |

**含まない / 限定:** 本番向け Academy 資格発行の完全硬化、Community / Insights 本番運用、Enterprise / Billing 本実装、サーバ PDF エンジン、GPT 版 Coach。

---

## 今後の予定（Version 1.1）

認定講師テストのフィードバックを反映する改善版です。

- OCR 精度・確認画面 UX の改善
- AI 宿題の編集・達成 UX 改善
- 通知の実データ配信（demo フォールバック削減）
- Settings（パスワード変更など）の強化
- Admin / Evidence の実データ経路への一本化
- 比較・トレンド表示の磨き込み

中長期（v2.0 以降）は Academy / Community / Insights の本番運用、Enterprise、Billing、Developer API 本番化を予定しています。詳細は [`docs/ROADMAP.md`](./docs/ROADMAP.md) を参照してください。

---

## 品質ゲート

| コマンド | 用途 |
|---|---|
| `npx tsc --noEmit` | TypeScript |
| `npm run lint` | ESLint |
| `npm run build` | 本番ビルド |

---

## ライセンス / 注意

本プロダクトは医療機器・診断ではありません。分析結果は指導支援のための参考情報として扱ってください。  
Version 1.0 Beta は認定講師限定の非公開運用です。
