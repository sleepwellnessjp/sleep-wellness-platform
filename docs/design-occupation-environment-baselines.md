# 勤務環境属性・測定 provider・本人ベースライン設計

Sleep Wellness Platform の AI 分析コンテキスト拡張。

## 方針（必須）

1. **AI は職業名そのものを評価根拠にしない。**  
   UI 上の職業ラベルがあっても、分析エンジンが参照するのは **環境属性**（`occupation_master`）のみ。
2. **測定値は provider を持てる拡張構造**にする。  
   現状の主入力は SOXAI 画像だが、将来の Apple Watch / Garmin / Oura 等の直接連携を壊さない。
3. **本人基準を第一評価**とする。  
   当日・7日・30日・90日・180日・365日の本人窓を計算できる構造にし、**一般基準は最後の補助評価**のみ。

---

## 1. 環境属性（職業名ではない）

### 原則

| 層 | 役割 | AI 参照 |
|----|------|---------|
| 職業名（任意・表示用） | 「パン職人」「看護師」など人が理解するラベル | **参照しない**（プロンプトに職業名だけで渡さない） |
| **環境属性** | 高温・立ち仕事・夜勤・粉塵など | **必須参照** |
| 環境イベント | 旅行・ホテル・飛行機など当日例外 | 可能性として参照 |

職業名はクライアント入力の便宜用。保存時または分析前に **属性 ID 群へ展開**し、AI には属性＋強度＋ `ai_context` だけを渡す。

### マッピング例（職業名 → 環境属性）

| 職業名（表示例） | 展開する環境属性 |
|------------------|------------------|
| パン職人 | 高温・立ち仕事・早朝勤務・粉塵 |
| 看護師 | 夜勤・立ち仕事・高ストレス |
| ホットヨガ講師 | 高温・高湿度・発汗・立ち仕事 |

※ 属性はマスター行（例: `heat_high`, `standing_work`, `early_shift`, `dust_exposure`, `night_shift`, `high_stress`, `humidity_high`, `sweating_load`）。職業名文字列を AI にそのまま渡さない。

### AI プロンプト契約

- 渡すもの: `occupationAttributeIds[]` + 各属性の `label` / `category` / `intensity` / `ai_context` / `sleep_relevance`
- 渡さないもの: 職業名のみの断定（「パン職人だから〜」）
- 言い方: 「高温・立ち仕事・早朝勤務の曝露がある場合、〜の可能性があります」

### テーブル

| テーブル | 役割 |
|---------|------|
| `occupation_master` | 環境属性マスター（`ai_context` / `sleep_relevance`） |
| `client_occupation_attributes` | クライアント固定の属性紐づけ（強度・payload） |
| `environment_event_master` | 旅行・ホテル・飛行機等 |
| `analysis_environment_events` | 分析日ごとの環境イベント |

---

## 2. 測定値の provider 拡張構造

将来のデバイス連携（SOXAI、Apple Watch、Garmin、Oura など）を想定し、**単一デバイス前提のフラット構造にロックしない**。

### Provider 識別子

```text
soxai | apple_watch | garmin | oura | manual | unknown | <将来追加>
```

### 推奨データ形状（アプリ／永続化共通）

```ts
type MetricProvider =
  | "soxai"
  | "apple_watch"
  | "garmin"
  | "oura"
  | "manual"
  | "unknown"
  | string;

type MetricSample = {
  metricKey: string;          // sleep_score, hrv, ...
  value: number | string | null;
  unit?: string;
  observedAt?: string;        // ISO
  /** 取得元デバイス／入力経路 */
  provider: MetricProvider;
  /** 同一メトリクスの複数ソース時の信頼度・優先度 */
  confidence?: number;        // 0..1
  sourceRef?: string;         // 画像 ID、API レコード ID 等
  raw?: Record<string, unknown>;
};

type MetricSet = {
  schemaVersion: 1;
  /** 分析に使う確定値（provider 優先ルール適用後） */
  confirmed: Record<string, MetricSample>;
  /** 生サンプル（マルチデバイス時に保持） */
  samples?: MetricSample[];
};
```

### 優先ルール（設計）

1. ユーザー確認済み（confirm 画面）を最優先。
2. 同一 `metricKey` に複数 provider がある場合:  
   `manual`（明示手入力）> デバイス API > SOXAI OCR > `unknown`。  
   ※ プロダクト設定で上書き可能にする余地を残す。
3. AI 分析に渡すのは原則 `confirmed`。競合がある場合のみ `samples` 要約を補助で渡す。

### 既存との関係

- 現行フロー（SOXAI 画像 → extract → confirm）は `provider: "soxai"`（手入力補完は `"manual"`）として表現できる。
- `analyses.confirmed_metrics` は当面フラットでも可。拡張時は `MetricSet` へ移行、または横に `metric_samples` jsonb を追加。

---

## 3. 本人基準ウィンドウ

### 計算対象窓

| キー | 日数 | 用途 |
|------|------|------|
| `d1` / `day` | 当日（測定日） | その夜の値そのもの・例外日判定の起点 |
| `d7` | 7日 | 超短期トレンド |
| `d30` | 30日 | 短期本人基準 |
| `d90` | 90日 | 中期本人基準 |
| `d180` | 180日 | 半期トレンド |
| `d365` | 365日 | 長期本人基準 |

一般基準（人口統計・教科書的レンジ）は **上記の後**に置く補助評価のみ。

### AI 評価優先順（厳守）

1. **本人基準** — `d1` → `d7` → `d30` → `d90` → `d180` → `d365`（サンプル十分な窓を優先使用）
2. **環境属性・環境イベント** — 可能性として（原因断定禁止）
3. **一般基準** — 最後の補助。本人窓が不足するときのみ。断定しない

### サンプル不足の目安（設計）

| 窓 | 不足とみなす目安 |
|----|------------------|
| 7日 | 有効日数 3 未満 |
| 30日 | 3 未満 |
| 90日 | 7 未満 |
| 180日 | 14 未満 |
| 365日 | 28 未満 |

不足時はその窓を `insufficientData: true` とし、より長い窓 → なお不足なら一般基準（補助）。

### スナップショット形状

```ts
type PersonalBaselineSnapshot = {
  schemaVersion: 2;
  asOfDate: string;
  evaluationPolicy: "personal_first"; // 一般のみは例外時
  windows: {
    d1?: PersonalBaselineWindow;
    d7?: PersonalBaselineWindow;
    d30?: PersonalBaselineWindow;
    d90?: PersonalBaselineWindow;
    d180?: PersonalBaselineWindow;
    d365?: PersonalBaselineWindow;
  };
  /** 補助のみ。本文の主評価にしない */
  generalReference?: Record<string, { label: string; note: string }>;
  occupationAttributeIds?: string[];
  environmentEventTypeIds?: string[];
  metricProvidersUsed?: MetricProvider[];
  computedAt?: string;
};
```

### テーブル

| テーブル / カラム | 役割 |
|-------------------|------|
| `client_metric_baselines` | 本人窓ごとの平均等の永続化（`window_days` を 1/7/30/90/180/365 に拡張） |
| `analyses.personal_baseline` | 分析時点スナップショット（上記 JSON） |

---

## 4. アプリ側の対応型

- `lib/masters/occupation-environment.ts` … 属性／イベント／ベースライン型、AI 優先ルール文言、provider 型
- `lib/client-profiles/types.ts` … `work.environmentAttributeIds` / `day_context.environmentEvents`

表示用の職業名フィールドを持つ場合でも、**分析パイプラインには属性 ID のみ**を流す。

---

## 5. SQL 適用

`supabase/occupation-environment-baselines.sql`  
（または `supabase/migrations/20260722140000_occupation_environment_baselines.sql`）

窓の 1/7/180/365 および provider 列は、既存 30/90 実装の上に **後方互換で拡張**する（既存行を消さない）。

---

## 変更履歴（設計）

| 版 | 内容 |
|----|------|
| v1 | 環境属性マスター、イベント、本人 30/90、一般は補助 |
| v2 | 職業→属性マッピング例を明文化。測定値に provider。本人窓を 当日/7/30/90/180/365 に拡張。一般基準を最終補助と再定義 |
