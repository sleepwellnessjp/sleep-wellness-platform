import {
  normalizeMetrics,
  type AnalysisMetrics,
} from "@/lib/soxai-metrics";

/** Visual Report パネル ID（8種） */
export type GraphPanelId =
  | "stages"
  | "stage-detail"
  | "stress"
  | "circadian"
  | "respiration"
  | "rhr"
  | "hrv"
  | "skin-temp";

export type GraphPoint = {
  /** X軸ラベル（時刻 HH:MM または相対時間） */
  x: string;
  /** Y軸数値 */
  y: number;
  /** 系列名（REM / 浅い / 深い / 覚醒 など） */
  series?: string;
};

export type SleepStageSegment = {
  stage: "awake" | "rem" | "light" | "deep";
  startTime?: string;
  endTime?: string;
  /** 睡眠ウィンドウ内の割合 0–100 */
  ratio?: number;
};

export type GraphPanelData = {
  id: GraphPanelId;
  /** 折れ線・棒・エリア等の時系列 */
  points: GraphPoint[];
  /** 睡眠ステージ hypnogram */
  segments: SleepStageSegment[];
  /** グラフ上の注釈（平均/最小/最大 等） */
  annotations: Array<{ label: string; value: string }>;
  /** 元画像インデックス */
  sourceImageIndex?: number;
};

export type SoxaiGraphBundle = Partial<Record<GraphPanelId, GraphPanelData>>;

const PANEL_IDS: GraphPanelId[] = [
  "stages",
  "stage-detail",
  "stress",
  "circadian",
  "respiration",
  "rhr",
  "hrv",
  "skin-temp",
];

const PANEL_ALIASES: Record<string, GraphPanelId> = {
  stages: "stages",
  stage: "stages",
  sleepstages: "stages",
  睡眠ステージ: "stages",
  stagedetail: "stage-detail",
  "stage-detail": "stage-detail",
  睡眠ステージ詳細: "stage-detail",
  stress: "stress",
  ストレス: "stress",
  ストレスモニター: "stress",
  circadian: "circadian",
  体内時計: "circadian",
  respiration: "respiration",
  呼吸: "respiration",
  睡眠時呼吸: "respiration",
  rhr: "rhr",
  restinghr: "rhr",
  安静時心拍: "rhr",
  安静時心拍数: "rhr",
  hrv: "hrv",
  心拍変動: "hrv",
  skintemp: "skin-temp",
  "skin-temp": "skin-temp",
  皮膚温度: "skin-temp",
  皮膚温: "skin-temp",
};

function normalizePanelId(raw: string): GraphPanelId | null {
  const key = raw
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[\s　_\-－—–：:（）()【】\[\]「」『』・･./／]/g, "");
  return PANEL_ALIASES[key] ?? null;
}

function normalizeStage(raw: string): SleepStageSegment["stage"] | null {
  const s = raw
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[\s　_\-]/g, "");
  if (/覚醒|awake|wake/.test(s)) return "awake";
  if (/rem|レム/.test(s)) return "rem";
  if (/浅|light/.test(s)) return "light";
  if (/深|deep/.test(s)) return "deep";
  return null;
}

function parseNumber(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw !== "string") return null;
  const match = raw.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

function asString(raw: unknown): string {
  if (typeof raw === "string") return raw.trim();
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  return "";
}

export type RawGraphReading = {
  panel?: unknown;
  points?: unknown;
  segments?: unknown;
  annotations?: unknown;
};

export function normalizeGraphReading(
  raw: RawGraphReading,
  sourceImageIndex?: number,
): GraphPanelData | null {
  const panelRaw = asString(raw.panel);
  const id = normalizePanelId(panelRaw);
  if (!id) return null;

  const points: GraphPoint[] = [];
  if (Array.isArray(raw.points)) {
    for (const item of raw.points) {
      if (!item || typeof item !== "object") continue;
      const record = item as Record<string, unknown>;
      const x = asString(record.x ?? record.time ?? record.label);
      const y = parseNumber(record.y ?? record.value);
      if (!x || y == null) continue;
      points.push({
        x,
        y,
        series: asString(record.series ?? record.stage) || undefined,
      });
    }
  }

  const segments: SleepStageSegment[] = [];
  if (Array.isArray(raw.segments)) {
    for (const item of raw.segments) {
      if (!item || typeof item !== "object") continue;
      const record = item as Record<string, unknown>;
      const stage = normalizeStage(asString(record.stage ?? record.series));
      if (!stage) continue;
      segments.push({
        stage,
        startTime: asString(record.startTime ?? record.start) || undefined,
        endTime: asString(record.endTime ?? record.end) || undefined,
        ratio: parseNumber(record.ratio) ?? undefined,
      });
    }
  }

  const annotations: Array<{ label: string; value: string }> = [];
  if (Array.isArray(raw.annotations)) {
    for (const item of raw.annotations) {
      if (!item || typeof item !== "object") continue;
      const record = item as Record<string, unknown>;
      const label = asString(record.label ?? record.name);
      const value = asString(record.value);
      if (!label || !value) continue;
      annotations.push({ label, value });
    }
  }

  if (points.length === 0 && segments.length === 0 && annotations.length === 0) {
    return null;
  }

  return {
    id,
    points,
    segments,
    annotations,
    sourceImageIndex,
  };
}

export function normalizeGraphReadings(
  raw: unknown,
  sourceImageIndex?: number,
): GraphPanelData[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) =>
      normalizeGraphReading(
        item && typeof item === "object" ? (item as RawGraphReading) : {},
        sourceImageIndex,
      ),
    )
    .filter((item): item is GraphPanelData => item !== null);
}

function panelRichness(panel: GraphPanelData): number {
  return (
    panel.points.length * 2 +
    panel.segments.length * 3 +
    panel.annotations.length
  );
}

/** 複数画像の graphReadings をパネル単位で統合（最も情報量の多いものを採用） */
export function mergeGraphBundles(
  bundles: Array<{ imageIndex: number; panels: GraphPanelData[] }>,
): SoxaiGraphBundle {
  const merged: SoxaiGraphBundle = {};

  for (const { imageIndex, panels } of bundles) {
    for (const panel of panels) {
      const existing = merged[panel.id];
      const candidate = { ...panel, sourceImageIndex: imageIndex };
      if (!existing || panelRichness(candidate) > panelRichness(existing)) {
        merged[panel.id] = candidate;
      }
    }
  }

  return merged;
}

export function emptyGraphBundle(): SoxaiGraphBundle {
  return {};
}

export function graphPanelCount(bundle: SoxaiGraphBundle): number {
  return PANEL_IDS.filter((id) => bundle[id]).length;
}

export function graphPanelIds(bundle: SoxaiGraphBundle): GraphPanelId[] {
  return PANEL_IDS.filter((id) => bundle[id]);
}

/** グラフ annotations から不足 metrics を補完（数値ラベルと整合） */
export function enrichMetricsFromGraphs(
  metrics: AnalysisMetrics,
  bundle: SoxaiGraphBundle,
): AnalysisMetrics {
  const next = { ...metrics };

  const applyAnnotation = (
    panelId: GraphPanelId,
    key: keyof AnalysisMetrics,
    preferLabels: RegExp,
  ) => {
    const panel = bundle[panelId];
    if (!panel) return;
    const current =
      key === "sleepScore"
        ? next.sleepScore != null
          ? String(next.sleepScore)
          : ""
        : String(next[key] ?? "").trim();
    if (current) return;

    // 明示ラベル一致（単位付き注釈・改行ラベルも許容）
    const match = panel.annotations.find((a) => {
      const label = a.label
        .normalize("NFKC")
        .replace(/[\r\n\t]+/g, " ")
        .trim();
      return preferLabels.test(label);
    });
    if (match?.value.trim()) {
      if (key === "sleepScore") {
        const n = parseNumber(match.value);
        if (n != null) next.sleepScore = n;
      } else {
        (next as Record<string, unknown>)[key] = match.value.trim();
      }
    }
  };

  applyAnnotation("rhr", "restingHeartRate", /平均|avg|mean|心拍|rhr|bpm/i);
  applyAnnotation("hrv", "hrv", /平均|avg|mean|hrv|心拍変動|rmssd|ms/i);
  applyAnnotation(
    "stress",
    "stress",
    /平均|avg|mean|現在|ストレス|stress|レベル/i,
  );
  applyAnnotation(
    "respiration",
    "respiratoryRate",
    /呼吸|respiratory|平均|rpm|brpm/i,
  );
  applyAnnotation("respiration", "spo2", /spo|酸素|飽和/i);
  applyAnnotation(
    "skin-temp",
    "skinTemperature",
    /平均|avg|mean|皮膚|皮虜|体表|偏差|温度|delta|現在|℃|temp/i,
  );
  applyAnnotation(
    "circadian",
    "circadianRhythm",
    /位相|体内|circadian|クロノ/i,
  );

  // stage-detail / stages の注釈から時間・割合を補完
  for (const panelId of ["stage-detail", "stages"] as GraphPanelId[]) {
    const panel = bundle[panelId];
    if (!panel?.annotations.length) continue;
    for (const ann of panel.annotations) {
      const label = ann.label.normalize("NFKC").replace(/[\r\n\t]+/g, " ");
      const value = ann.value.normalize("NFKC").trim();
      if (!value) continue;
      const isPct = /%|％/.test(value);
      const fill = (key: keyof AnalysisMetrics) => {
        if (!String(next[key] ?? "").trim()) {
          (next as Record<string, unknown>)[key] = value;
        }
      };
      if (/覚醒/.test(label) && !/起床/.test(label)) {
        fill(isPct ? "awakeningRate" : "awakenings");
      } else if (/レム|rem/i.test(label)) {
        fill(isPct ? "remSleepRate" : "remSleep");
      } else if (/浅|light/i.test(label)) {
        fill(isPct ? "lightSleepRate" : "lightSleep");
      } else if (/深|deep/i.test(label)) {
        fill(isPct ? "deepSleepRate" : "deepSleep");
      } else if (/spo|酸素/i.test(label)) {
        fill("spo2");
      }
    }
  }

  // 皮膚温度パネル: 明示ラベル付きの ±値のみ（最初の数値注釈への推測補完はしない）
  if (!String(next.skinTemperature ?? "").trim()) {
    const panel = bundle["skin-temp"];
    if (panel?.annotations.length) {
      const labeled = panel.annotations.find((a) => {
        const label = a.label.normalize("NFKC");
        const value = a.value.normalize("NFKC").trim();
        return (
          /皮膚|皮虜|体表|温度|偏差|平均|現在|avg|delta|temp|℃/i.test(label) &&
          /^[+-]?\s*\d+(\.\d+)?/.test(value)
        );
      });
      if (labeled?.value.trim()) {
        next.skinTemperature = labeled.value.trim();
      }
    }
  }

  // RHR / HRV: 平均注釈が無く points に平均相当が無い場合でも、
  // 「平均 XX bpm/ms」形式の annotation value を拾う
  if (!String(next.restingHeartRate ?? "").trim()) {
    const panel = bundle.rhr;
    const hit = panel?.annotations.find((a) =>
      /bpm|\d{2,3}/i.test(a.value.normalize("NFKC")),
    );
    if (hit?.value.trim() && /平均|avg|mean|心拍/i.test(hit.label)) {
      next.restingHeartRate = hit.value.trim();
    }
  }
  if (!String(next.hrv ?? "").trim()) {
    const panel = bundle.hrv;
    const hit = panel?.annotations.find((a) =>
      /\bms\b|\d{1,3}/i.test(a.value.normalize("NFKC")),
    );
    if (hit?.value.trim() && /平均|avg|mean|hrv|心拍変動/i.test(hit.label)) {
      next.hrv = hit.value.trim();
    }
  }

  // segments からの割合推測は行わない（明示 OCR のみ採用）

  return normalizeMetrics(next);
}

// —— 可視化ユーティリティ ——

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function displayValue(value: string | number | null | undefined): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return "未測定";
}

export function parsePercent(text: string): number | null {
  if (!text.trim()) return null;
  const normalized = text.replace(/,/g, "").replace(/％/g, "%").trim();
  const withPct = normalized.match(/(-?\d+(?:\.\d+)?)\s*%/);
  if (withPct) {
    const n = Number(withPct[1]);
    return Number.isFinite(n) ? n : null;
  }
  const bare = normalized.match(/^(-?\d+(?:\.\d+)?)$/);
  if (bare) {
    const n = Number(bare[1]);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function parseLeadingNumber(text: string): number | null {
  if (!text.trim()) return null;
  const match = text.replace(/,/g, "").match(/(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

export function parseDurationMinutes(text: string): number | null {
  const t = text.normalize("NFKC").trim();
  if (!t) return null;

  const signed = t.startsWith("-") || /^-/.test(t);
  const absText = t.replace(/^\s*-/, "").trim();

  const hMatch = absText.match(/(-?\d+(?:\.\d+)?)\s*時間/);
  const mMatch = absText.match(/(-?\d+(?:\.\d+)?)\s*分/);
  if (hMatch || mMatch) {
    const hours = hMatch ? Number(hMatch[1]) : 0;
    const minutes = mMatch ? Number(mMatch[1]) : 0;
    const total = hours * 60 + minutes;
    if (!Number.isFinite(total)) return null;
    return signed ? -Math.abs(total) : total;
  }

  // 「1:15」「0:49」「6:22」→ 時間:分（時計ではなく経過時間）
  const hm = absText.match(/^(\d{1,2})\s*[:：]\s*(\d{2})$/);
  if (hm) {
    const hours = Number(hm[1]);
    const minutes = Number(hm[2]);
    if (
      Number.isFinite(hours) &&
      Number.isFinite(minutes) &&
      minutes >= 0 &&
      minutes <= 59 &&
      hours >= 0 &&
      hours <= 23
    ) {
      const total = hours * 60 + minutes;
      return signed ? -total : total;
    }
  }

  // 「75分」のみは上の mMatch で処理済み。「1h15m」
  const en = absText.match(
    /^(\d+)\s*(?:h|hr|hrs|hour|hours)\s*(\d+)?\s*(?:m|min|mins|minute|minutes)?$/i,
  );
  if (en) {
    const hours = Number(en[1]);
    const minutes = en[2] ? Number(en[2]) : 0;
    if (Number.isFinite(hours) && Number.isFinite(minutes)) {
      const total = hours * 60 + minutes;
      return signed ? -total : total;
    }
  }

  // 単位の「分」表記ゆれなし（例: 12）は duration としては扱わない
  return null;
}

export function parseHHMM(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  const match = t.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

const STAGE_COLORS: Record<SleepStageSegment["stage"], string> = {
  awake: "#8a6a2d",
  rem: "#0f6b5c",
  light: "#b89242",
  deep: "#315f68",
};

/** REM / ノンレム対比用（ノンレム = 浅い + 深い） */
export const REM_NREM_COLORS = {
  rem: "#0f6b5c",
  nonRem: "#315f68",
  light: "#b89242",
  deep: "#1e4a52",
} as const;

function formatStageMinutes(totalMinutes: number): string {
  const abs = Math.abs(Math.round(totalMinutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${m}分`;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}

function formatStagePercent(pct: number): string {
  const shown = Number.isInteger(pct) ? String(pct) : String(Math.round(pct * 10) / 10);
  return `${shown}%`;
}

export type SleepStagePart = {
  minutes: number | null;
  percent: number | null;
  durationText: string;
  percentText: string;
  /** 「1時間28分 · 20%」または片方のみ / 未測定 */
  combined: string;
};

export type SleepStageSummary = {
  rem: SleepStagePart;
  nonRem: SleepStagePart;
  light: SleepStagePart;
  deep: SleepStagePart;
  /** REM vs ノンレムの棒/ドーナツ用（合計1、データなしは0） */
  remShare: number;
  nonRemShare: number;
  /** ノンレム内の浅い/深い比率（合計1） */
  lightOfNonRem: number;
  deepOfNonRem: number;
  hasData: boolean;
};

function buildStagePart(
  minutes: number | null,
  percent: number | null,
): SleepStagePart {
  const durationText = minutes != null ? formatStageMinutes(minutes) : "";
  const percentText = percent != null ? formatStagePercent(percent) : "";
  let combined = "未測定";
  if (durationText && percentText) combined = `${durationText} · ${percentText}`;
  else if (durationText) combined = durationText;
  else if (percentText) combined = percentText;
  return { minutes, percent, durationText, percentText, combined };
}

/**
 * REM / ノンレム（浅い+深い）と内訳を算出。
 * 割合は明示%を優先し、なければ時間から再計算する。
 */
export function computeSleepStageSummary(
  metrics: AnalysisMetrics,
): SleepStageSummary {
  const remM = parseDurationMinutes(metrics.remSleep);
  const lightM = parseDurationMinutes(metrics.lightSleep);
  const deepM = parseDurationMinutes(metrics.deepSleep);
  const remP = parsePercent(metrics.remSleepRate);
  const lightP = parsePercent(metrics.lightSleepRate);
  const deepP = parsePercent(metrics.deepSleepRate);

  const nonRemM =
    lightM != null || deepM != null
      ? (lightM ?? 0) + (deepM ?? 0)
      : null;
  const nonRemPFromRates =
    lightP != null || deepP != null ? (lightP ?? 0) + (deepP ?? 0) : null;

  let remPct = remP;
  let nonRemPct = nonRemPFromRates;
  if (remPct == null && nonRemPct == null && remM != null && nonRemM != null) {
    const sum = remM + nonRemM;
    if (sum > 0) {
      remPct = (remM / sum) * 100;
      nonRemPct = (nonRemM / sum) * 100;
    }
  } else if (remPct == null && nonRemPct != null) {
    remPct = Math.max(0, 100 - nonRemPct);
  } else if (nonRemPct == null && remPct != null) {
    nonRemPct = Math.max(0, 100 - remPct);
  }

  let lightPct = lightP;
  let deepPct = deepP;
  if (
    (lightPct == null || deepPct == null) &&
    lightM != null &&
    deepM != null &&
    lightM + deepM > 0 &&
    nonRemPct != null
  ) {
    const shareLight = lightM / (lightM + deepM);
    if (lightPct == null) lightPct = nonRemPct * shareLight;
    if (deepPct == null) deepPct = nonRemPct * (1 - shareLight);
  }

  const rem = buildStagePart(remM, remPct);
  const nonRem = buildStagePart(nonRemM, nonRemPct);
  const light = buildStagePart(lightM, lightPct);
  const deep = buildStagePart(deepM, deepPct);

  const hasData =
    rem.combined !== "未測定" ||
    nonRem.combined !== "未測定" ||
    light.combined !== "未測定" ||
    deep.combined !== "未測定";

  const remShareRaw =
    remPct ??
    (remM != null && nonRemM != null && remM + nonRemM > 0
      ? (remM / (remM + nonRemM)) * 100
      : remM != null && remM > 0
        ? 100
        : 0);
  const nonRemShareRaw =
    nonRemPct ??
    (remM != null && nonRemM != null && remM + nonRemM > 0
      ? (nonRemM / (remM + nonRemM)) * 100
      : nonRemM != null && nonRemM > 0
        ? 100
        : 0);
  const shareSum = remShareRaw + nonRemShareRaw;
  const remShare = shareSum > 0 ? remShareRaw / shareSum : 0;
  const nonRemShare = shareSum > 0 ? nonRemShareRaw / shareSum : 0;

  const lightMin = lightM ?? 0;
  const deepMin = deepM ?? 0;
  const nremMinSum = lightMin + deepMin;
  let lightOfNonRem = 0.5;
  let deepOfNonRem = 0.5;
  if (nremMinSum > 0) {
    lightOfNonRem = lightMin / nremMinSum;
    deepOfNonRem = deepMin / nremMinSum;
  } else if (lightPct != null || deepPct != null) {
    const lp = lightPct ?? 0;
    const dp = deepPct ?? 0;
    const ps = lp + dp;
    if (ps > 0) {
      lightOfNonRem = lp / ps;
      deepOfNonRem = dp / ps;
    }
  }

  return {
    rem,
    nonRem,
    light,
    deep,
    remShare,
    nonRemShare,
    lightOfNonRem,
    deepOfNonRem,
    hasData,
  };
}

/** OCR hypnogram segments → 比率（metrics フォールバック込み） */
export function stageRatiosFromData(
  metrics: AnalysisMetrics,
  graph?: GraphPanelData,
): { rem: number; light: number; deep: number; awake: number } {
  if (graph?.segments.length) {
    const totals: Record<SleepStageSegment["stage"], number> = {
      awake: 0,
      rem: 0,
      light: 0,
      deep: 0,
    };
    for (const seg of graph.segments) {
      totals[seg.stage] += seg.ratio ?? 1;
    }
    const sum = totals.awake + totals.rem + totals.light + totals.deep;
    if (sum > 0) {
      return {
        awake: totals.awake / sum,
        rem: totals.rem / sum,
        light: totals.light / sum,
        deep: totals.deep / sum,
      };
    }
  }

  const remP = parsePercent(metrics.remSleepRate);
  const lightP = parsePercent(metrics.lightSleepRate);
  const deepP = parsePercent(metrics.deepSleepRate);
  const awakeP = parsePercent(metrics.awakeningRate);

  if (remP != null || lightP != null || deepP != null || awakeP != null) {
    return {
      rem: (remP ?? 0) / 100,
      light: (lightP ?? 0) / 100,
      deep: (deepP ?? 0) / 100,
      awake: (awakeP ?? 0) / 100,
    };
  }

  const remM = parseDurationMinutes(metrics.remSleep) ?? 0;
  const lightM = parseDurationMinutes(metrics.lightSleep) ?? 0;
  const deepM = parseDurationMinutes(metrics.deepSleep) ?? 0;
  const awakeM = parseDurationMinutes(metrics.awakenings) ?? 0;
  const sum = remM + lightM + deepM + awakeM;
  if (sum > 0) {
    return {
      rem: remM / sum,
      light: lightM / sum,
      deep: deepM / sum,
      awake: awakeM / sum,
    };
  }

  return { rem: 0.33, light: 0.34, deep: 0.33, awake: 0 };
}

export { STAGE_COLORS };
