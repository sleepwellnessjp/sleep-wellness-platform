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

    const match =
      panel.annotations.find((a) =>
        preferLabels.test(a.label.normalize("NFKC")),
      ) ?? panel.annotations[0];
    if (match?.value.trim()) {
      if (key === "sleepScore") {
        const n = parseNumber(match.value);
        if (n != null) next.sleepScore = n;
      } else {
        (next as Record<string, unknown>)[key] = match.value.trim();
      }
    }
  };

  applyAnnotation("rhr", "restingHeartRate", /平均|avg|mean/i);
  applyAnnotation("hrv", "hrv", /平均|avg|mean/i);
  applyAnnotation("stress", "stress", /平均|avg|mean|現在/i);
  applyAnnotation("respiration", "respiratoryRate", /呼吸|respiratory|平均/i);
  applyAnnotation("respiration", "spo2", /spo|酸素/i);
  applyAnnotation("skin-temp", "skinTemperature", /平均|avg|mean|皮膚/i);
  applyAnnotation("circadian", "circadianRhythm", /位相|体内|circadian/i);

  // segments から stage rates を補完
  const stages = bundle.stages;
  if (stages?.segments.length) {
    const totals: Record<SleepStageSegment["stage"], number> = {
      awake: 0,
      rem: 0,
      light: 0,
      deep: 0,
    };
    for (const seg of stages.segments) {
      totals[seg.stage] += seg.ratio ?? 1;
    }
    const sum = totals.awake + totals.rem + totals.light + totals.deep;
    if (sum > 0) {
      const pct = (v: number) => `${Math.round((v / sum) * 100)}%`;
      if (!next.awakeningRate.trim() && totals.awake > 0) {
        next.awakeningRate = pct(totals.awake);
      }
      if (!next.remSleepRate.trim() && totals.rem > 0) {
        next.remSleepRate = pct(totals.rem);
      }
      if (!next.lightSleepRate.trim() && totals.light > 0) {
        next.lightSleepRate = pct(totals.light);
      }
      if (!next.deepSleepRate.trim() && totals.deep > 0) {
        next.deepSleepRate = pct(totals.deep);
      }
    }
  }

  return normalizeMetrics(next);
}

// —— 可視化ユーティリティ ——

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function displayValue(value: string | number | null | undefined): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return "—";
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
  const t = text.trim();
  if (!t) return null;
  const hMatch = t.match(/(-?\d+(?:\.\d+)?)\s*時間/);
  const mMatch = t.match(/(-?\d+(?:\.\d+)?)\s*分/);
  if (hMatch || mMatch) {
    const hours = hMatch ? Number(hMatch[1]) : 0;
    const minutes = mMatch ? Number(mMatch[1]) : 0;
    const total = hours * 60 + minutes;
    return Number.isFinite(total) ? total : null;
  }
  const hm = t.match(/^(\d{1,2}):(\d{2})$/);
  if (hm) {
    const total = Number(hm[1]) * 60 + Number(hm[2]);
    return Number.isFinite(total) ? total : null;
  }
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
