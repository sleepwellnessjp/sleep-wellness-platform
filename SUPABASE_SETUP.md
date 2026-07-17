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

## 4. データベース（schema.sql）を実行する

1. Supabase ダッシュボード → **SQL Editor** → **New query**
2. リポジトリの `supabase/schema.sql` の内容をすべて貼り付け
3. **Run** をクリック

以下が作成されます。

- `profiles` … インストラクター情報
- `clients` … クライアント
- `analyses` … 分析結果
- Row Level Security（RLS）… 自分のデータのみ閲覧・編集可能

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
- **データが表示されない:** SQL Editor で `schema.sql` がエラーなく実行されたか確認してください。
- **ビルドエラー:** `.env.local` がなくても `npm run build` は成功します（デモモード）。

---

## 次のステップ（任意）

- 既存 localStorage データの Supabase への移行スクリプト
- プロフィール編集画面
- PDF ダウンロード履歴のクラウド保存

質問がある場合は、Sleep Wellness Institute Japan の開発担当までお問い合わせください。
