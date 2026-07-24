# TODO

最終更新: 2026-07-24（**Version 1.0 Beta リリース完了**）  
基準: `docs/ROADMAP.md` / `docs/RELEASE_CHECKLIST.md` / `docs/CURRENT_IMPLEMENTATION.md`

---

## Version 1.0 Beta（認定講師限定公開）ステータス

- [x] AIから講師への提案（PDF・結果画面）
- [x] 最終品質チェック（保存 / 分析 / PDF / 印刷 / 履歴 / 画面遷移 / レスポンシブ）
- [x] ソース整理（仮データ・不要コード）
- [x] README / CHANGELOG 更新
- [x] GitHub Push · Tag `v1.0.0-beta` · Vercel Deploy
- [ ] Supabase マイグレーション本番適用（v21〜v29 含む未適用分）
- [ ] コメント分析の本番 NLP（現状モック）
- [ ] 実メール送信（招待など現状モック）
- [ ] 週次レポート実自動配信（現状モック表示）
- [ ] 通知の実データ配信（demo フォールバック削減）

---

## Version 2.9（Closed Beta Evidence Collection）ステータス

- [x] 認定講師: カウンセリング終了時 30秒アンケート（満足度・理解度・宿題実施見込み・次回予約・自由コメント）
- [x] クライアント: 翌朝アンケート（睡眠満足度・起床時気分・日中の調子・自由コメント）
- [x] 本部: 匿名集計（改善率・満足度・継続率・宿題実施率・コメント分析モック）
- [x] Supabase スキーマ追加（evidence_session_surveys / evidence_morning_surveys）
- [ ] Supabase マイグレーション本番適用（`20260724290000_closed_beta_evidence_v29.sql`）
- [ ] コメント分析の本番 NLP（現状モック）
- [ ] 未コミット差分の git commit（ユーザー指示後）

---

## Version 2.8（Closed Beta Operation）ステータス

- [x] Module1 Beta KPI Dashboard（講師・クライアント・分析・継続率・改善率・FB対応率・新規 + グラフ）
- [x] Module2 Feature Requests（カテゴリ・優先度・投票・対応予定・完了）
- [x] Module3 Bug Tracker（Critical〜Low · 修正状況）
- [x] Module4 Client Outcomes（睡眠改善・継続・Homework・Journey）
- [x] Module5 Weekly Report（成果・課題・改善提案 · モック）
- [x] Module6 Product Backlog（未着手・進行中・完了・保留）
- [x] Supabase スキーマ追加（feature_requests / bug_reports / weekly_reports / beta_metrics / product_backlog）
- [ ] Supabase マイグレーション本番適用（`20260724280000_closed_beta_operation_v28.sql`）
- [ ] 週次レポート実自動配信（現状モック表示）
- [ ] 未コミット差分の git commit（ユーザー指示後）

---

## Version 2.7（Closed Beta Launch）ステータス

- [x] Module1 Beta Invitation（認定講師招待 · メールモック · コード · 利用開始日 · 規約同意）
- [x] Module2 Onboarding（初回 5 ステップ · 約3分）
- [x] Module3 Beta Agreement（β版 · データ協力 · バグ報告 · 守秘義務）
- [x] Module4 Feedback Priority（Critical / High / Medium / Low）
- [x] Module5 Admin Action（受付 / 対応中 / 保留 / 完了）
- [x] Module6 Beta Metrics（週次 · 講師 · 分析 · クライアント · 継続率 · 改善率 · バグ）
- [ ] Supabase マイグレーション本番適用（v21〜v27）
- [ ] 第1期・第2期認定講師への Closed Beta 案内・運用開始
- [ ] 実メール送信（現状モック）
- [ ] 未コミット差分の git commit（ユーザー指示後）

---

## Version 2.6（Beta Freeze）ステータス

- [x] Final QA（画面・リンク・スマホ/タブレット/PC・エラー画面）
- [x] Performance（表示速度確認 · 不要アセット整理 · Console 確認）
- [x] Beta Mode（右下 BETA バッジ · Version 表示）
- [x] Feedback（全画面右下「フィードバックを送る」固定）
- [x] Safety（重大エラー時の分かりやすい画面）
- [ ] Supabase マイグレーション本番適用（v21〜v24）
- [ ] 第1期・第2期認定講師への Closed Beta 案内・運用開始
- [ ] 未コミット差分の git commit（ユーザー指示後）

---

## Version 2.4（Closed Beta 運営モード）ステータス

- [x] Module1 Beta Dashboard（本部 KPI）
- [x] Module2 Beta Feedback（講師送信 · 本部対応）
- [x] Module3 Health Score
- [x] Module4 Release Notes
- [x] Module5 Usage Analytics（モック）
- [x] Module6 Roadmap（2.5 / 3.0 / Coming Soon）
- [x] Supabase スキーマ追加（beta_feedback 拡張 / release_notes / usage_statistics / system_health / roadmap_items）
- [ ] Supabase マイグレーション本番適用（`20260724240000_closed_beta_ops_v24.sql`）
- [ ] 第1期・第2期認定講師への Closed Beta 案内・運用開始
- [ ] 未コミット差分の git commit（ユーザー指示後）

---

## Version 2.3（UI/UX ブラッシュアップ）ステータス

- [x] 画面遷移アニメーション（template + sw-page-enter）
- [x] ローディング改善（Loading · route loading）
- [x] Skeleton 表示（シマー · SoftSkeleton / ListSkeleton / dashboard）
- [x] カード統一（SectionCard · CARD_CLASS · CSS 変数）
- [x] ボタン統一（variants · focus · touch）
- [x] 余白調整（mobile / tablet / desktop）
- [x] スマホ操作性（min-h-11 · h-scroll · safe-area）
- [x] タブレット最適化（md パディング · shell pad）
- [x] ダークモード対応準備（`data-theme="dark"` トークン）
- [x] アクセシビリティ（Skip link · focus-visible · aria）
- [ ] テーマトグル UI（ダークモード本実装）
- [ ] 未コミット差分の git commit（ユーザー指示後）

---

## Version 2.2（ライセンス・課金・権限）ステータス

- [x] Module1 Role Management（SWIJ本部 / 認定校 / 認定講師 / クライアント）
- [x] Module2 License Management（番号・レベル・取得日・更新期限・有効/失効・履歴）
- [x] Module3 Subscription（Basic / Professional / Enterprise モック）
- [x] Module4 Invitation System（認定講師のみ・コード・メール）
- [x] Module5 Audit Log（ログイン・分析・レポート・クライアント追加・ライセンス更新）
- [x] Module6 Security（RBAC・セッション・管理画面保護・403/404/error）
- [x] Supabase スキーマ追加（roles / licenses / subscriptions / invitations / audit_logs）
- [ ] Supabase マイグレーション本番適用（`20260724220000_license_billing_rbac_v22.sql`）
- [ ] 実メール送信・課金ゲートウェイ接続
- [ ] 未コミット差分の git commit（ユーザー指示後）

---

## Version 2.1（運営システム）ステータス

- [x] Module1 認定講師管理（校・講師・レベル・更新・停止・退会）UI / データ設計
- [x] Module2 認定校管理（所属講師・受講生・講座・修了率・活動）
- [x] Module3 認定講師ダッシュボード KPI
- [x] Module4 本部ダッシュボード KPI
- [x] Module5 通知センター（本部 / 講師）
- [x] Module6 ブランド統一（Navy / Gold / White）
- [ ] Supabase マイグレーション本番適用（`20260724200000_swij_ops_v21.sql`）
- [ ] 運営データ実投入・実運用テスト
- [ ] 未コミット差分の git commit（ユーザー指示後）

---

## RC1（凍結版）ステータス

- [x] Version 1.0 Beta を RC1 として整理
- [x] `typecheck` スクリプト追加（版番号は現在 `2.6.0`）
- [x] README を RC1 向けに更新
- [ ] 未コミット差分の git commit（ユーザー指示後）
- [ ] 認定講師による実運用テスト開始

---

## 実運用テスト中に確認すること（RC1）

1. Auth + Role リダイレクト（instructor / client / admin / school）
2. OCR → 確認 → AI 分析 → 保存の E2E
3. クレジット消費の冪等
4. 宿題（講師付与・クライアント完了）
5. RLS / 担当外データが読めないこと
6. 招待コード発行・受諾・監査ログ記録

---

## Version 1.1 以降（着手メモ）

- [x] AI Counseling Assistant
- [x] Admin HQ Dashboard
- [x] Demo Mode
- [x] βテスト フィードバック機能
- [x] ライセンス・サブスクリプション管理
- [x] Client Portal
- [x] Sleep Wellness Journey™
- [x] Sleep Wellness AI Intelligence
- [x] Version 2.1 運営システム（認定校・認定講師・本部KPI・通知センター・ブランド統一）
- [x] Version 2.2 ライセンス・課金・権限（RBAC・招待・監査・課金モック）
- [x] Version 2.3 UI/UX ブラッシュアップ（遷移・Skeleton・カード/ボタン・余白・a11y・ダーク準備）
- OCR / AI 宿題 UX 改善
- 通知の実データ配信（既読テーブル深化）
- Admin 実データ化の深化（講師招待フロー）
- Academy / Community / Insights 本番運用
- Enterprise / Billing / Developer API 本番（Stripe 等）
- Client Portal: Push通知・動画CDN・PDF署名付きURL・目標の講師編集UI深化

詳細は `docs/ROADMAP.md` を参照。

---

## 品質ゲート

| コマンド | 結果 |
|---|---|
| `npm run typecheck` | OK（2.2.0） |
| `npm run lint` | 要再確認（2.2） |
| `npm run build` | 要再確認（2.2） |
