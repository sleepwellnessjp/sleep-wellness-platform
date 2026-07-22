# TODO

最終更新: 2026-07-22（終業時点）  
基準: `docs/ROADMAP.md` / `docs/RELEASE_CHECKLIST.md` / `docs/CURRENT_IMPLEMENTATION.md`

---

## 今日完了したこと（2026-07-22）

- [x] クライアント Home（Coach / Journey / 宿題 / 履歴）と homework / mypage DB
- [x] Sleep Coach / Journey / Instructor Insight（ルールベース）
- [x] Academy（学習・試験・証明書 UI + DB + Admin）
- [x] Admin Console 拡張（各画面・API・demo フォールバック）
- [x] Community（画面・DB・Admin）
- [x] Insights / SWI（集計・UI・API・demo store）
- [x] Sleep Wellness OS Chrome（検索・通知・Role Home・Settings）
- [x] Developer API Platform（UI + v1 ルート + OpenAPI、demo 認証）
- [x] Module Registry / Design System / Hooks 骨格
- [x] ドキュメント一式（Bible / 実装状況 / Roadmap / Release Checklist 等）
- [x] セキュリティ hardening 含む当日分 migrations 追加
- [x] `tsc` / `lint` / `build` 成功確認（エラーなし）
- [x] CHANGELOG.md / TODO.md 整備

---

## 途中までの作業

- [ ] **未コミットの大規模差分**（modified + untracked 約 150 エントリ）— まだ git commit / PR 未実施
- [ ] Academy 本番硬化（資格の自己 INSERT を塞ぐ）— RLS 強化は途中認識、完全検証未了
- [ ] Admin / Insights / Notifications の **demo-store 依存** — UI はあるが本番データ経路の一本化は未完
- [ ] Developer API — DB 永続 API Key / 本番認証は未実装（demo-store）
- [ ] `api-platform.sql` の migrations 取り込み未了
- [ ] Design System と `components/ui` の二重化 — 移行中
- [ ] Planned Module（billing / companies / research / retreat / events / reports）— プレースホルダのみ
- [ ] 利用規約・プライバシー・非医療表示の公開導線 — 未整備
- [ ] 本番 Supabase への migrations 一式適用・RLS 横断テスト — 未実施

---

## 明日最初にやること

1. **未コミット差分の整理・コミット方針決定**（機能単位で分割するか一括か）
2. **Version 1.0 スコープの再確認**（`docs/ROADMAP.md`）— Academy/Community/Insights 本番は v1.0 に入れない方針を維持
3. **P0: Supabase 本番 migrations 適用手順の確認**（ルート SQL ではなく `supabase/migrations/` のみ）
4. **P0: Auth + Role リダイレクトの実機確認**（instructor / client / admin）
5. （余裕があれば）Academy 自己発行 INSERT の塞ぎ、または RLS 横断テストの着手

---

## Version 1.0 完成まで残りタスク

> 目的: 認定講師が安全にクライアント分析・指導できる最小セット。  
> **含めない:** Academy 本格運用、Community、Insights 本番、Enterprise、Billing、Marketplace、Research/Retreat/Events、本物 PDF エンジン、GPT 版 Coach。

### P0（必須）

| # | タスク | 想定 | 状態 |
|---|---|---|---|
| 1 | Supabase 本番に migrations 一式適用 | 1–2日 | 未 |
| 2 | Auth + Role リダイレクト動作確認（全保護ルート） | 1日 | 一部実装・検証未 |
| 3 | クレジット消費の冪等確認 | 0.5日 | 実装あり・検証未 |
| 4 | 利用規約・プライバシー・非医療表示の設置・同意導線 | 1–2日 | 未 |
| 5 | RLS / 他人データ横断テスト（チェックリスト合格） | 2–3日 | 未 |
| 6 | Academy 資格自己 INSERT の塞ぎ（管理/RPC のみ） | 1日 | 未 |
| 7 | Developer API / demo 認証の本番無効化 | 1–2日 | 未 |
| 8 | 分析 E2E（OCR→確認→AI→保存）+ disclaimer | 既存+確認 | 実装済・本番確認未 |
| 9 | 宿題（講師付与・クライアント完了）本番確認 | 既存+確認 | 実装済・本番確認未 |

### P1（v1.0 推奨）

| # | タスク | 想定 | 状態 |
|---|---|---|---|
| 10 | PDF（印刷）+ 免責（Safari/Chrome） | 0.5日 | 一部実装 |
| 11 | Admin 最小（講師・ログ）を本番データ経路のみに | 1–2日 | 一部（demo 混在） |
| 12 | Planned ルートをナビから外す or「準備中」明示 | 0.5日 | 未 |
| 13 | `RELEASE_CHECKLIST.md` 全項目の消化 | 2–4日 | 未着手 |

### 推定残作業（v1.0 公開まで）

- **P0 のみ:** 約 **8–13 人日**
- **P0 + P1（チェックリスト含む）:** 約 **12–18 人日**
- 機能コードの大半は揃っている。残りは **本番適用・権限硬化・法務・検証** が主。

---

## Version 1.1 以降（メモ・着手しない）

- OCR / AI 宿題 UX 改善
- 通知の実データ配信
- Admin 実データ化の深化
- proxy matcher 完全一致
- Academy / Community / Insights 本番運用（→ v2.0）
- Enterprise / Billing / Developer API 本番（→ v3.0）

---

## 品質ゲート（終業時点）

| コマンド | 結果 | エラー一覧 |
|---|---|---|
| `npx tsc --noEmit` | ✅ 成功 | なし |
| `npm run lint` | ✅ 成功 | なし |
| `npm run build` | ✅ 成功 | なし |

※ 今回はエラー修正不要。次回は本番環境での再実行が必要。
