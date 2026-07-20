# Supabase セットアップガイド

Sleep Wellness Platform を **本番モード**（クラウド保存＋ログイン）で使うための手順です。

環境変数が未設定の場合は **デモモード** として動作し、データはブラウザの localStorage に保存されます。既存のデモデータもそのまま利用できます。

---

## 1. Supabase プロジェクトを作成する

1. [Supabase](https://supabase.com/) にアクセスし、アカウントを作成（またはログイン）します。
2. **New project** をクリックします。
3. プロジェクト名・データベースパスワード・リージョンを設定し、作成を待ちます（1〜2分）。

---

## 2. Project URL と Anon Key を取得する

1. Supabase ダッシュボードで、作成したプロジェクトを開きます。
2. 左メニューの **Project Settings**（歯車アイコン）→ **API** を開きます。
3. 次の2つをコピーします。
   - **Project URL** … `https://xxxxxxxx.supabase.co`
   - **anon public** キー … `eyJ...` で始まる長い文字列

> **注意:** `service_role` キーはサーバー専用です。ブラウザや `.env.local` の `NEXT_PUBLIC_*` には **絶対に設定しないでください**。

---

## 3. `.env.local` に設定する

プロジェクトルートに `.env.local` を作成（または追記）します。

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxxxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxx
```

`.env.example` を参考にしてください。秘密情報は Git にコミットしないでください。

---

## 4. データベース（SQL）を実行する

1. Supabase ダッシュボード → **SQL Editor** → **New query**
2. 次を **この順** で実行します。

### 4-1. ベーススキーマ

`supabase/schema.sql`（または `supabase/migrations/20260716100000_base_schema.sql`）

作成されるもの:

- `profiles` … Auth ユーザー連携プロフィール
- `clients` … クライアント
- `analyses` … 分析結果
- `programs` … 改善プログラム
- ベース RLS

### 4-2. Platform V1.0（クレジット・会員・履歴）

`supabase/platform-v1.sql`（または `supabase/migrations/20260720100000_platform_v1.sql`）

作成されるもの:

- `roles` / `membership` / `monthly_credit` / `credit_transactions`
- `analysis_history` / `admin_logs` / `notifications`
- 月次 30 クレジット・分析 1 消費の RPC（`ensure_monthly_credit` / `get_credit_balance` / `consume_analysis_credit`）
- Platform RLS（本人＋管理者）

> Auth（メール＋パスワード）は既存のまま利用します。サインアップ時に `profiles`・認定・当月クレジットが自動作成されます。

### 4-3. 分析永続化・二重消費防止（必須・追加）

`supabase/analysis-persist-v1.sql`（または `supabase/migrations/20260720120000_analysis_persist_v1.sql`）

追加されるもの:

- `analyses.confirmed_metrics` / `report_payload` / `credits_consumed` / `updated_at`
- `analysis_history.updated_at` と `analysis_id` 一意制約
- `consume_analysis_credit` の同一分析二重消費防止

> 既に Platform V1 を適用済みのプロジェクトでも、この SQL を追加実行してください。
---

## 5. メール認証の設定

1. **Authentication** → **Providers** → **Email** が有効になっていることを確認
2. **Authentication** → **URL Configuration** で以下を設定
   - **Site URL:** ローカルなら `http://localhost:3000`、本番なら Vercel の URL
   - **Redirect URLs:** 次を追加
     - `http://localhost:3000/auth/callback`
     - `https://あなたのドメイン/auth/callback`

新規登録時は確認メールが送信されます。リンクをクリックすると `/auth/callback` 経由でログイン完了し、`/dashboard` へ移動します。

---

## 6. ローカルで起動する

```bash
npm install
npm run dev
```

ブラウザで [http://localhost:3000/login](http://localhost:3000/login) を開き、メールアドレスとパスワードでログインまたは新規登録してください。

---

## 7. Vercel にデプロイする場合

1. Vercel のプロジェクト → **Settings** → **Environment Variables**
2. 次を追加（Production / Preview 両方推奨）
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`
3. 再デプロイ後、Supabase の Redirect URLs に Vercel の URL を追加

---

## デモモードと本番モードの違い

| 項目 | デモモード（Supabase 未設定） | 本番モード（Supabase 設定済み） |
|------|------------------------------|--------------------------------|
| ログイン | 不要（デモとしてダッシュボードへ） | メール＋パスワード必須 |
| データ保存 | ブラウザ localStorage | Supabase（クラウド） |
| 複数端末 | 不可（端末ごとに別データ） | ログインで同期 |
| 保護ルート | 誰でも `/dashboard` 等にアクセス可 | 未ログインは `/login` へリダイレクト |
| 他インストラクターのデータ | — | RLS により閲覧不可 |

---

## トラブルシューティング

- **ログインできない:** Site URL / Redirect URLs が正しいか確認してください。
- **「登録に失敗しました」/ クライアント登録できない:**
  1. ブラウザ Console に `PGRST205` / `Could not find the table 'public.clients'` が出ていないか確認
  2. 原因は多くの場合 **schema.sql 未実行**（Auth だけ動いてテーブルが無い状態）
  3. アプリの `/setup` を開くか、Supabase SQL Editor で `supabase/schema.sql` をすべて実行
  4. RLS が原因の場合は `new row violates row-level security policy` と表示されます（schema.sql の policy を再実行）
- **データが表示されない:** SQL Editor で `schema.sql` がエラーなく実行されたか確認してください。
- **ビルドエラー:** `.env.local` がなくても `npm run build` は成功します（デモモード）。

---

## 次のステップ（任意）

- 既存 localStorage データの Supabase への移行スクリプト
- プロフィール編集画面
- PDF ダウンロード履歴のクラウド保存

質問がある場合は、Sleep Wellness Institute Japan の開発担当までお問い合わせください。
