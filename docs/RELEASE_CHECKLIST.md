# Release Checklist — Version 1.0

> 公開前チェックリスト。調査日時点の品質結果も末尾に記録。

## A. 認証・権限

- [ ] メールログインが本番 Supabase で成功する
- [ ] ログアウト後に保護ルートへ戻れない
- [ ] `instructor` は `/dashboard` へ着地する
- [ ] `client` は `/client` へ着地する
- [ ] `admin` / `super_admin` は `/admin` へ着地する
- [ ] `instructor` が `/admin` `/developer` に入れない
- [ ] `client` が `/clients` `/analysis/*` に入れない
- [ ] `enterprise` が講師専用ルートに入れない
- [ ] デモモード（Supabase 未設定）が **本番環境で無効**
- [ ] `x-swij-role` 等のデモ認証が本番で無効

## B. RLS・データ隔離

- [ ] migrations を時系列どおり適用済み（ルート SQL の場当たり適用なし）
- [ ] 講師 A が講師 B の clients を SELECT できない
- [ ] 講師 A が講師 B の analyses を読めない
- [ ] 未リンク client が他人の分析を読めない
- [ ] リンク client が自分の分析のみ読める
- [ ] Academy 資格を一般ユーザーが自己 INSERT できない（硬化後）
- [ ] `profiles.role` をユーザーが自己昇格できない
- [ ] membership を suspended から自己復活できない

## C. CRUD・空データ・通信エラー

- [ ] クライアント作成・更新・削除（方針どおり）が動作
- [ ] プロフィール保存が動作
- [ ] 分析保存が動作
- [ ] 宿題作成・完了が動作
- [ ] クライアント 0 件で EmptyState が崩れない
- [ ] 分析 0 件で Coach/Journey が安全に表示
- [ ] OpenAI キー欠如時に分かりやすいエラー
- [ ] ネットワーク切断時にクラッシュしない
- [ ] クレジット不足時に分析が適切に拒否される

## D. 分析・PDF

- [ ] OCR → 確認 → 分析 → 結果の E2E
- [ ] disclaimer / 非医療表示が結果に出る
- [ ] Medical（Expert）Report が表示される
- [ ] Visual Report が表示される
- [ ] PDF（印刷）が Chrome で可能
- [ ] PDF（印刷）が Safari で可能
- [ ] 印刷時に個人情報が意図どおり（余分な UI が出ない）

## E. 表示・法務

- [ ] 個人情報（氏名・連絡先・健康情報）の表示範囲が Role どおり
- [ ] 画面上の免責が表示される
- [ ] 利用規約ページまたはリンクがある
- [ ] プライバシーポリシーがある
- [ ] 問い合わせ先が正しい

## F. クライアント体験（v1.0 範囲）

- [ ] ポータルリンク後に client Home が開く
- [ ] 宿題チェックが保存される
- [ ] 分析履歴が自分の分のみ
- [ ] Sleep Coach / Journey が非診断表現

## G. 運用・インフラ

- [ ] 本番環境変数: `NEXT_PUBLIC_SUPABASE_URL`
- [ ] 本番環境変数: `NEXT_PUBLIC_SUPABASE_ANON_KEY` または `PUBLISHABLE_KEY`
- [ ] 本番環境変数: `OPENAI_API_KEY`（サーバーのみ）
- [ ] `service_role` をクライアントに露出していない
- [ ] Supabase 本番: Auth URL / Redirect 設定
- [ ] Supabase 本番: RLS 有効の確認
- [ ] バックアップ方針（DB スナップショット）がある
- [ ] インシデント時の鍵ローテーション手順がある

## H. 品質ゲート

- [ ] `npx tsc --noEmit` 成功
- [ ] `npm run lint` 成功
- [ ] `npm run build` 成功
- [ ] 主要画面のスマホ表示確認（iPhone Safari）
- [ ] 主要画面のデスクトップ確認（Chrome）

## I. Version 1.0 スコープ外の明示（誤公開防止）

- [ ] `/billing` `/companies` `/research` `/retreat` `/events` `/reports` を本番ナビから外すか「準備中」と明示
- [ ] Developer API を外部公開しない（または認証を本番実装してから）
- [ ] Marketplace を案内しない
- [ ] Enterprise を実顧客に提供しない（デモである旨）

---

## 調査時点の品質結果（2026-07-22）

| 検査 | 結果 | メモ |
|---|---|---|
| TypeScript (`npx tsc --noEmit`) | **成功** | エラー出力なし |
| ESLint (`npm run lint`) | **成功** | エラー出力なし |
| Build (`npm run build`) | **成功** | 全ページ生成。Proxy (Middleware) 有効 |

※ 上記は開発ワークスペースでの結果。本番デプロイ先での再実行が必要。
