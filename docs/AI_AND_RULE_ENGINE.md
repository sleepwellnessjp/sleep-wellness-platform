# AI and Rule Engine

> 調査日: 2026-07-22  
> **外部 AI / ルール / 固定・ダミー / 将来 AI 化** を区別する。

## 分類一覧

| 機能 | 分類 | 根拠 |
|---|---|---|
| OCR（指標抽出） | **外部 AI API** | OpenAI Vision `gpt-4o` `/api/extract` |
| AI 分析（レポート本文・Score・おすすめ） | **外部 AI API** | OpenAI `gpt-4o` `/api/analyze` |
| プロフィール要約 | **ルールベース** | `buildProfileAiSummaryStructured`（OpenAI 不使用） |
| Sleep Coach | **ルールベース**（将来 GPT 差し替え口あり） | `lib/sleep-coach.ts` |
| Journey Summary | **ルールベース** | `lib/sleep-wellness-journey.ts` |
| Instructor Insight | **ルールベース**（名称に AI とあるが外部 AI なし） | `lib/instructor-insight.ts` |
| AI Follow Alerts | **ルールベース** | `lib/ai-follow-alerts.ts` |
| todaysRecommendations / recommendationsUntilNext | **外部 AI API**（分析時生成） | analyze schema |
| メトリクス改善カード | **ルールベース** | `lib/improvement-suggestions.ts` |
| Sleep Wellness Score | **外部 AI が算出**（アプリ内加重式なし） | analyze prompt + clamp |
| 日次アドバイスフォールバック | **固定文** | `FALLBACK_ADVICE` in `lib/client-daily-content.ts` |
| メラトニンヨガ™動画 URL | **ダミー/固定ライブラリ** | `lib/client-daily-content.ts` |
| v1 Sleep Coach / Journey API | **ダミー** | `lib/api-platform/v1-resources.ts` |
| Marketplace 等の AI | **未実装** | — |

---

## 1. OCR（外部 AI）

| 項目 | 内容 |
|---|---|
| 入力 | SOXAI 画面の画像（data URL 等） |
| 処理 | `gpt-4o` Vision → screenType / readings → マッピング・マージ・再スキャン |
| 出力 | metrics, graphs, confidence, conflicts |
| 保存先 | 確認後 `analyses`（ocr_data / confirmed_metrics 等）。途中は session |
| 医学的断定回避 | 抽出専用指示（分析・助言禁止）`SOXAI_EXTRACT_INSTRUCTIONS` |
| エラー時 | 400/500。キー未設定は Config Error。クライアントは抽出失敗を表示 |

---

## 2. AI 分析（外部 AI）

| 項目 | 内容 |
|---|---|
| 入力 | 確認済みメトリクス、当日生活文脈、固定プロフィール要約、前回分析（任意） |
| 処理 | `client.responses.create` + JSON schema `swij_sleep_wellness_analysis` |
| 出力 | summary, goodPoints, improvements, score, categoryScores, recommendations, disclaimer 等 |
| 保存先 | session → `analyses.ai_result` / `report_payload` |
| 医学的断定回避 | システム指示で診断・治療断定禁止。`disclaimer`/`caution` 必須 |
| エラー時 | 400 検証 / 500 OpenAI・パース失敗。クライアント `AnalysisError` |

---

## 3. プロフィール要約（ルール）

| 項目 | 内容 |
|---|---|
| 入力 | `client_profiles` 各セクション |
| 処理 | ヒューリスティック文字列化（職業・飲酒・鼻・暑さ・カフェイン等） |
| 出力 | 構造化要約 → 分析プロンプトの `fixedProfileSummary` |
| 保存先 | 要約自体は都度生成。プロファイルは DB |
| 医学的断定回避 | 「診断ではなく事実ベース」コメント |
| エラー時 | 欠落フィールドは省略。OpenAI 依存なし |

---

## 4. Sleep Coach（ルール）

| 項目 | 内容 |
|---|---|
| 入力 | 最新分析メトリクス、ストリーク、宿題達成等 |
| 処理 | 閾値・シグナル選択・日付ハッシュで文言ローテーション |
| 出力 | focus, actions, message（`source: "rules"`） |
| 保存先 | 永続必須ではない（都度生成）。UI カード表示 |
| 医学的断定回避 | ウェルネス助言トーン。診断名を断定しない設計 |
| エラー時 | 分析なし時はデフォルト文。外部 API 失敗なし |
| 将来 | `SleepCoachGenerator` を渡して GPT 差し替え可能（未配線） |

---

## 5. Journey Summary（ルール）

| 項目 | 内容 |
|---|---|
| 入力 | 分析履歴、宿題達成、ストリーク |
| 処理 | タイムライン・バッジ・サマリーをルール生成 |
| 出力 | Journey オブジェクト（`source: "rules"`） |
| 保存先 | 都度生成（v1 API は別途デモ固定文） |
| 医学的断定回避 | 改善物語表現。診断断定なし |
| エラー時 | 履歴不足時は空/初期メッセージ |

---

## 6. Instructor Insight（ルール）

| 項目 | 内容 |
|---|---|
| 入力 | 分析、宿題、Journey ルール結果 |
| 処理 | 改善点・課題・質問・介入・要約を組み立て |
| 出力 | Insight（`source: "rules"`） |
| 保存先 | 都度生成（ダッシュボード表示） |
| 医学的断定回避 | UI「診断ではありません」 |
| エラー時 | データ不足時は限定メッセージ |
| 将来 | GPT ジェネレータ差し替え口あり（未配線） |

---

## 7. おすすめ行動

| 種類 | 分類 | 備考 |
|---|---|---|
| `todaysRecommendations`（3件） | 外部 AI | 分析時 |
| `recommendationsUntilNext`（AI宿題） | 外部 AI → 講師編集可 | DB の ai_result 更新 |
| Sleep Coach actions | ルール | 上記 |
| `pickDailyAdvice` | AI 結果優先、なければ goals、なければ固定 FALLBACK | |
| `buildImprovementSuggestions` | ルール（閾値） | |

---

## 8. Sleep Wellness Score

| 項目 | 内容 |
|---|---|
| 入力 | プロフィール・生活・ストレス・環境・SOXAI（プロンプト指示） |
| 処理 | **モデルが 0–100 を出力**。アプリ内に独自加重計算式は無し |
| 出力 | score + scoreBreakdown + categoryScores |
| 保存先 | `analyses` の wellness 系 / `ai_result`。SOXAI デバイススコアは別フィールド |
| 正規化 | `Math.round` + 0–100 clamp。欠損時 breakdown 補完 |
| 医学的断定回避 | 「独自ウェルネススコア」。SOXAI 睡眠スコアのコピー禁止 |
| エラー時 | 不正値は 0 にフォールバック（normalize） |

---

## 9. 将来 AI 化する予定（コードコメント上）

コードに明示されているもののみ:

- Sleep Coach → GPT ジェネレータ差し替え
- Journey → 同様のジェネレータ引数
- Instructor Insight → 同様

ロードマップ上の願望で、実装・契約・プロンプトは未着手。

---

## 10. 開発時の注意

1. UI の「AI」表記があっても、必ずしも OpenAI 呼び出しではない（Insight / Follow Alerts / Coach）。
2. Score をローカル再計算していると誤解しないこと（現状はモデル出力）。
3. v1 External API の Coach/Journey はデモであり、本番カード実装と別系統。
