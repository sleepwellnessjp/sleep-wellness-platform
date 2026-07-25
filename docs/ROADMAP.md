# Roadmap

> 調査日: 2026-07-22  
> **現在の実装状況から現実的に再整理**。未実装の大規模機能を Version 1.0 に入れない。

---

## Version 1.0 — 公開必須（Pilot / 講師本番）

目的: 認定講師が安全にクライアント分析・指導できる最小セット。

| 項目 | 優先度 | 依存 | 想定工数 | リスク | リリース条件 |
|---|---|---|---|---|---|
| Supabase 本番適用（migrations 一式） | P0 | なし | 1–2日 | ルート SQL 誤適用 | migrations のみで再現可能 |
| Auth + Role リダイレクト動作確認 | P0 | Supabase | 1日 | 完了（公開は `/` のみ） | 全保護ルートで未ログイン拒否 |
| クライアント CRUD / プロフィール | P0 | DB | 既存 | RLS | 担当外データ不可 |
| OCR → 確認 → AI 分析 → 保存 | P0 | OpenAI key | 既存 | コスト/失敗時 UX | E2E 成功 + disclaimer 表示 |
| クレジット消費の冪等 | P0 | platform RPC | 0.5日 | 二重消費 | 同一分析で二重減算なし |
| 宿題（講師付与・クライアント完了） | P0 | homeworks | 既存 | portal リンク | リンク client のみ完了可 |
| Sleep Coach / Journey / Insight（ルール） | P1 | 分析データ | 既存 | 「AI」誤解 | 非診断表示の確認 |
| PDF（印刷）+ 免責 | P1 | 結果画面 | 0.5日 | ブラウザ差 | Safari/Chrome で印刷確認 |
| 利用規約・プライバシー・非医療表示 | P0 | 法務 | 1–2日 | 未整備 | 公開 URL に設置・同意導線 |
| RLS / 他人データ横断テスト | P0 | 全テーブル | 2–3日 | ポリシー漏れ | チェックリスト合格 |
| Academy 自己発行の塞ぎ | P0 | academy RLS | 1日 | 資格改ざん | INSERT を管理/RPC のみに |
| Developer API / demo 認証の本番無効化 | P0 | api-platform | 1–2日 | `x-swij-role` | 本番でデモ認証経路オフ |
| Admin 最小（講師・ログ閲覧） | P1 | admin | 1–2日 | demo 混在 | 本番データ経路のみ |

**Version 1.0 に含めない:** Academy 本格運用、Community、Insights 本番、Enterprise、Billing Module、Marketplace、Research/Retreat/Events、本物の PDF エンジン、GPT 版 Coach。

---

## Version 1.1 — フィードバック後の改善

| 項目 | 優先度 | 依存 | 想定工数 | リスク | リリース条件 |
|---|---|---|---|---|---|
| OCR 精度・確認 UX 改善 | P0 | v1.0 分析 | 3–5日 | 誤抽出 | 主要画面種別の回帰 |
| AI 宿題編集・達成 UX | P0 | homework | 2–3日 | データ不整合 | 達成率が正しく保存 |
| 継続日数の定義統一（宿題 vs 日次） | P1 | client Home | 1–2日 | 指標混乱 | Glossary と一致 |
| 通知（実データ配信） | P1 | notifications テーブル | 3–5日 | スパム | demo フォールバック削減 |
| Settings（パスワード変更等） | P1 | Auth | 2日 | セッション | 主要ブラウザ確認 |
| proxy matcher 完全一致 | P0 | proxy.ts | 0.5日 | 完了 | 公開許可リスト＋ catch-all（`/` 以外は認証必須） |
| Admin 実データ化 | P1 | admin-service | 3–5日 | 権限 | demo-store 本番不使用 |
| 比較・トレンド表示磨き | P2 | analyses | 2–4日 | 誤解釈 | 非断定コピー |

---

## Version 2.0 — Academy / Community / Insights 拡張

| 項目 | 優先度 | 依存 | 想定工数 | リスク | リリース条件 |
|---|---|---|---|---|---|
| Academy 本番（受講・試験・認定発行の権威付け） | P0 | 硬化済み RLS | 2–4週 | 不正合格 | 管理発行のみ・監査 |
| Community 本番運用 | P1 | community RLS | 2–3週 | 炎上/PII | モデレーション手順 |
| Insights（SWI）本番集計 | P1 | 十分な分析件数 | 2週 | 再識別 | 匿名性レビュー |
| Research を knowledge から独立（任意） | P2 | Community | 1–2週 | 重複 | コンテンツ運用体制 |
| Coach/Insight の GPT オプション | P2 | OpenAI / コスト | 2–3週 | 医療表現 | ルールと同等の免責 |

---

## Version 3.0 以降 — 企業・研究・API・Marketplace

| 項目 | 優先度 | 依存 | 想定工数 | リスク | リリース条件 |
|---|---|---|---|---|---|
| Enterprise テナント（組織・部署） | P0（企業向け時） | `enterprise` role | 1–2ヶ月 | データ分離失敗 | テナント RLS + 契約 |
| Companies / 組織管理 UI | P1 | テナント | 3–4週 | 権限設計 | Role マトリクス更新 |
| Billing（請求・プラン） | P1 | 決済外部 | 1–2ヶ月 | 課金事故 | 本番決済サンドボックス合格 |
| Developer API 本番（DB API Key・レート制限） | P1 | api-platform マイグレーション | 3–5週 | 鍵漏洩 | demo 認証完全除去 |
| Events / Retreat | P2 | Community | 各 2–4週 | 運用負荷 | コンテンツ体制 |
| 本 PDF 生成（サーバ） | P2 | 帳票要件 | 2–3週 | PII 一時ファイル | 保管ポリシー |
| Marketplace | P3 | 未着手 | 不明 | 法務・品質 | 別プロダクト判断 |
| Sleep Wellness OS 深化（検索インデックス等） | P2 | OS Chrome | 継続 | 複雑化 | Module 境界維持 |

---

## 依存関係（概略）

```text
v1.0 セキュリティ硬化 ─┬─► v1.1 UX
                       ├─► v2.0 Academy/Community/Insights
                       └─► v3.0 Enterprise / API 本番 / Billing
```

---

## 原則

1. **デモ認証・demo-store を本番に残したまま機能追加しない。**
2. Registry の `planned` Module は v1.0 スコープ外。
3. 「AI」表記のルール機能を GPT 化するのは v2 以降の任意改善。
