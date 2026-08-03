"use client";

import type { AnalysisMetrics } from "@/lib/soxai-metrics";
import type { GraphPanelData, GraphPoint, SoxaiGraphBundle } from "@/lib/soxai-graphs";
import {
  clamp,
  computeSleepStageSummary,
  displayValue,
  parseHHMM,
  parseLeadingNumber,
  parsePercent,
  REM_NREM_COLORS,
  STAGE_COLORS,
} from "@/lib/soxai-graphs";
import {
  evaluateMetric,
  formatHrvRange,
  metricGuideline,
} from "@/lib/report-metric-guide";

const NAVY = "#071426";

function evaluationText(
  key: Parameters<typeof evaluateMetric>[0],
  metrics: AnalysisMetrics,
): string | undefined {
  const ev = evaluateMetric(key, metrics);
  if (!ev) return undefined;
  return `${ev.starsLabel}　${ev.label}`;
}

function SimpleMeterBar({
  label,
  valueText,
  ratio01,
  color,
}: {
  label: string;
  valueText: string;
  ratio01: number | null;
  color: string;
}) {
  const safeRatio = ratio01 == null ? null : clamp(ratio01, 0, 1);
  return (
    <div>
      <div className="flex min-w-0 items-baseline justify-between gap-2">
        <p className="min-w-0 truncate text-[10px] font-semibold text-slate-500 sm:text-[11px]">
          {label}
        </p>
        <p
          className="shrink-0 text-[10px] font-semibold sm:text-[11px]"
          style={{ color: NAVY }}
        >
          {valueText}
        </p>
      </div>
      <div
        className="mt-1 h-2 w-full overflow-hidden rounded-full"
        style={{ background: "rgba(7,20,38,0.06)" }}
        aria-hidden
      >
        <div
          className="h-full"
          style={{
            width: safeRatio == null ? "0%" : `${safeRatio * 100}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

function MiniLineChart({
  points,
  color = "#315f68",
  yMax,
}: {
  points: GraphPoint[];
  color?: string;
  yMax?: number;
}) {
  if (points.length < 2) return null;

  const values = points.map((p) => p.y);
  const minY = Math.min(...values);
  const maxY = yMax ?? Math.max(...values);
  const range = maxY - minY || 1;
  const w = 100;
  const h = 40;
  const pad = 2;

  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (p.y - minY) / range) * (h - pad * 2);
    return `${x},${y}`;
  });

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="mt-2 h-10 w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={coords.join(" ")}
      />
      {points.map((p, i) => {
        const x = pad + (i / (points.length - 1)) * (w - pad * 2);
        const y = pad + (1 - (p.y - minY) / range) * (h - pad * 2);
        return (
          <circle key={`${p.x}-${i}`} cx={x} cy={y} r="1.2" fill={color} />
        );
      })}
    </svg>
  );
}

function SleepStageStatCard({
  label,
  value,
  color,
  featured,
}: {
  label: string;
  value: string;
  color: string;
  featured: boolean;
}) {
  return (
    <div
      className={
        featured
          ? "min-w-0 rounded-lg border border-[#071426]/08 bg-white/70 px-3 py-2.5"
          : "min-w-0 rounded-md border border-[#071426]/06 bg-white/60 px-2.5 py-2"
      }
    >
      <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 sm:text-[11px]">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </p>
      <p
        className={`mt-1 font-semibold tracking-[-0.02em] ${
          featured ? "text-[13px] sm:text-[14px]" : "text-[12px] sm:text-[13px]"
        }`}
        style={{ color: NAVY }}
      >
        {value || "未測定"}
      </p>
    </div>
  );
}

type SleepStagePrintRow = {
  label: string;
  value: string;
  color: string;
};

/**
 * PDF印刷専用の睡眠ステージ（2列×3段・横長カード）。
 * 画面用 SleepStagesOverview とは DOM を分離し、印刷時のみ表示する。
 */
export function SleepStagesPrintBlock({
  metrics,
}: {
  metrics: AnalysisMetrics;
}) {
  const summary = computeSleepStageSummary(metrics);
  const cells: SleepStagePrintRow[] = [
    {
      label: "覚醒時間",
      value: displayValue(metrics.awakenings),
      color: "#8a6a2d",
    },
    {
      label: "覚醒率",
      value: displayValue(metrics.awakeningRate),
      color: "#8a6a2d",
    },
    {
      label: "レム睡眠",
      value: summary.rem.durationText || displayValue(metrics.remSleep),
      color: REM_NREM_COLORS.rem,
    },
    {
      label: "レム睡眠率",
      value: summary.rem.percentText || displayValue(metrics.remSleepRate),
      color: REM_NREM_COLORS.rem,
    },
    {
      label: "浅い睡眠",
      value: summary.light.durationText || displayValue(metrics.lightSleep),
      color: REM_NREM_COLORS.light,
    },
    {
      label: "浅い睡眠率",
      value: summary.light.percentText || displayValue(metrics.lightSleepRate),
      color: REM_NREM_COLORS.light,
    },
    {
      label: "深い睡眠",
      value: summary.deep.durationText || displayValue(metrics.deepSleep),
      color: REM_NREM_COLORS.deep,
    },
    {
      label: "深い睡眠率",
      value: summary.deep.percentText || displayValue(metrics.deepSleepRate),
      color: REM_NREM_COLORS.deep,
    },
  ];

  return (
    <div
      className="report-sleep-stages-print"
      data-print-sleep-stages="1"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: "8px",
        width: "100%",
        minWidth: 0,
        height: "auto",
        overflow: "visible",
      }}
    >
      {cells.map((cell) => (
        <div
          key={cell.label}
          className="report-sleep-stages-print-card"
          style={{
            display: "block",
            width: "100%",
            minWidth: 0,
            height: "auto",
            whiteSpace: "normal",
            wordBreak: "keep-all",
            overflowWrap: "normal",
            writingMode: "horizontal-tb",
            boxSizing: "border-box",
            border: "1px solid rgba(7,20,38,0.1)",
            borderRadius: "6px",
            background: "rgba(255,255,255,0.85)",
            padding: "8px 10px",
          }}
        >
          <p
            style={{
              display: "block",
              margin: 0,
              fontSize: "9px",
              fontWeight: 600,
              color: "#64748b",
              whiteSpace: "normal",
              wordBreak: "keep-all",
              writingMode: "horizontal-tb",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "6px",
                height: "6px",
                borderRadius: "999px",
                backgroundColor: cell.color,
                marginRight: "6px",
                verticalAlign: "middle",
              }}
            />
            {cell.label}
          </p>
          <p
            style={{
              display: "block",
              margin: "4px 0 0",
              fontSize: "13px",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: NAVY,
              whiteSpace: "normal",
              wordBreak: "keep-all",
              overflowWrap: "normal",
              writingMode: "horizontal-tb",
            }}
          >
            {cell.value || "未測定"}
          </p>
        </div>
      ))}
    </div>
  );
}

/** 覚醒 / レム / 浅い / 深い（2列×4段）。SOXAI元表示に合わせ個別表示 */
export function SleepStagesOverview({
  metrics,
  graph,
  variant = "compact",
}: {
  metrics: AnalysisMetrics;
  graph?: GraphPanelData;
  variant?: "compact" | "featured";
}) {
  const summary = computeSleepStageSummary(metrics);
  const awakeDuration = displayValue(metrics.awakenings);
  const awakeRate = displayValue(metrics.awakeningRate);
  const remDuration = summary.rem.durationText || displayValue(metrics.remSleep);
  const remRate = summary.rem.percentText || displayValue(metrics.remSleepRate);
  const lightDuration =
    summary.light.durationText || displayValue(metrics.lightSleep);
  const lightRate =
    summary.light.percentText || displayValue(metrics.lightSleepRate);
  const deepDuration =
    summary.deep.durationText || displayValue(metrics.deepSleep);
  const deepRate =
    summary.deep.percentText || displayValue(metrics.deepSleepRate);
  const segments = graph?.segments ?? [];
  const isFeatured = variant === "featured";

  return (
    <div
      className={`screen-sleep-stages ${isFeatured ? "mt-1" : "mt-1.5"}`}
    >
      <div className="report-stage-grid grid grid-cols-2 gap-1.5 sm:gap-2">
        <SleepStageStatCard
          label="覚醒時間"
          value={awakeDuration}
          color="#8a6a2d"
          featured={isFeatured}
        />
        <SleepStageStatCard
          label="覚醒率"
          value={awakeRate}
          color="#8a6a2d"
          featured={isFeatured}
        />
        <SleepStageStatCard
          label="レム睡眠"
          value={remDuration}
          color={REM_NREM_COLORS.rem}
          featured={isFeatured}
        />
        <SleepStageStatCard
          label="レム睡眠率"
          value={remRate}
          color={REM_NREM_COLORS.rem}
          featured={isFeatured}
        />
        <SleepStageStatCard
          label="浅い睡眠"
          value={lightDuration}
          color={REM_NREM_COLORS.light}
          featured={isFeatured}
        />
        <SleepStageStatCard
          label="浅い睡眠率"
          value={lightRate}
          color={REM_NREM_COLORS.light}
          featured={isFeatured}
        />
        <SleepStageStatCard
          label="深い睡眠"
          value={deepDuration}
          color={REM_NREM_COLORS.deep}
          featured={isFeatured}
        />
        <SleepStageStatCard
          label="深い睡眠率"
          value={deepRate}
          color={REM_NREM_COLORS.deep}
          featured={isFeatured}
        />
      </div>

      {segments.length > 0 ? (
        <div
          className={`report-hypnogram ${isFeatured ? "mt-2.5" : "mt-2"}`}
        >
          <p className="text-[9px] font-semibold tracking-[0.14em] text-slate-400">
            ハイプノグラム
          </p>
          <div
            className="mt-1.5 flex h-3 w-full overflow-hidden rounded-full"
            style={{ background: "rgba(7,20,38,0.06)" }}
            aria-hidden
          >
            {segments.map((seg, i) => {
              const total = segments.reduce((s, x) => s + (x.ratio ?? 1), 0);
              const w = total > 0 ? ((seg.ratio ?? 1) / total) * 100 : 0;
              return (
                <div
                  key={`${seg.stage}-${i}`}
                  style={{
                    width: `${w}%`,
                    backgroundColor: STAGE_COLORS[seg.stage],
                  }}
                  title={`${seg.stage} ${seg.startTime ?? ""}–${seg.endTime ?? ""}`}
                />
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function HypnogramChart({
  graph,
  metrics,
}: {
  graph?: GraphPanelData;
  metrics: AnalysisMetrics;
}) {
  /* PDF詳細は compact で縦長・重なりを防ぐ（ページ1に featured 済み） */
  return (
    <SleepStagesOverview metrics={metrics} graph={graph} variant="compact" />
  );
}

function StressGauge({
  stressText,
  graph,
}: {
  stressText: string;
  graph?: GraphPanelData;
}) {
  if ((graph?.points?.length ?? 0) >= 2) {
    const points = graph!.points;
    return (
      <div className="mt-2">
        <MiniLineChart points={points} color="#a33a3a" yMax={100} />
        {(graph?.annotations?.length ?? 0) > 0 && (
          <div className="mt-1 flex flex-wrap gap-2">
            {graph!.annotations.map((a) => (
              <span key={a.label} className="text-[10px] text-slate-500">
                {a.label}: {a.value}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  const stress = parseLeadingNumber(stressText);
  const ratio01 = stress == null ? null : clamp(stress / 100, 0, 1);
  return (
    <div className="mt-2">
      <SimpleMeterBar
        label="測定ストレス"
        valueText={displayValue(stressText)}
        ratio01={ratio01}
        color="#a33a3a"
      />
    </div>
  );
}

function CircadianTimeline({
  bedtime,
  wakeTime,
  phaseText,
  graph,
}: {
  bedtime: string;
  wakeTime: string;
  phaseText: string;
  graph?: GraphPanelData;
}) {
  if ((graph?.points?.length ?? 0) >= 2) {
    const points = graph!.points;
    return (
      <div className="mt-2">
        <MiniLineChart points={points} color="#d8b36a" />
        <p className="mt-2 text-[11px] font-semibold" style={{ color: NAVY }}>
          {phaseText || "未測定"}
        </p>
      </div>
    );
  }

  const bed = parseHHMM(bedtime);
  const wake = parseHHMM(wakeTime);

  if (bed == null || wake == null) {
    return (
      <div className="mt-2">
        <p className="text-[11px] font-semibold text-slate-500">体内時計</p>
        <p className="mt-1 text-[13px] font-semibold" style={{ color: NAVY }}>
          {phaseText || "未測定"}
        </p>
      </div>
    );
  }

  const start = bed;
  let end = wake;
  let crosses = false;
  if (end <= start) {
    crosses = true;
    end += 1440;
  }

  const startPct = (start / 1440) * 100;
  const endPctRaw = (end % 1440) / 1440;
  const endPct = crosses ? endPctRaw * 100 : (end / 1440) * 100;
  const widthPct = crosses ? 100 - startPct : endPct - startPct;
  const widthPct2 = crosses ? endPct : 0;

  return (
    <div className="mt-2">
      <div
        className="relative h-3 w-full overflow-hidden rounded-full"
        style={{ background: "rgba(7,20,38,0.06)" }}
        aria-hidden
      >
        <div
          className="absolute h-full"
          style={{
            left: `${startPct}%`,
            width: `${Math.max(0, widthPct)}%`,
            backgroundColor: "#d8b36a",
          }}
        />
        {crosses && (
          <div
            className="absolute h-full"
            style={{
              left: "0%",
              width: `${Math.max(0, widthPct2)}%`,
              backgroundColor: "#d8b36a",
            }}
          />
        )}
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-x-2 gap-y-1">
        <p className="min-w-0 text-[10px] font-semibold text-slate-500 sm:text-[11px]">
          入眠 {bedtime || "未測定"}
        </p>
        <p className="min-w-0 text-[10px] font-semibold text-slate-500 sm:text-[11px]">
          起床 {wakeTime || "未測定"}
        </p>
      </div>
      <p className="mt-2 text-[11px] font-semibold" style={{ color: NAVY }}>
        {phaseText || "未測定"}
      </p>
    </div>
  );
}

function VitalsChart({
  graph,
  fallbackLabel,
  fallbackValue,
  color,
  ratio01,
}: {
  graph?: GraphPanelData;
  fallbackLabel: string;
  fallbackValue: string;
  color: string;
  ratio01: number | null;
}) {
  if ((graph?.points?.length ?? 0) >= 2) {
    const points = graph!.points;
    return (
      <div className="mt-2">
        <MiniLineChart points={points} color={color} />
        {(graph?.annotations?.length ?? 0) > 0 && (
          <div className="mt-1 space-y-0.5">
            {graph!.annotations.map((a) => (
              <p key={a.label} className="text-[10px] text-slate-500">
                {a.label}: {a.value}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-2">
      <SimpleMeterBar
        label={fallbackLabel}
        valueText={displayValue(fallbackValue)}
        ratio01={ratio01}
        color={color}
      />
    </div>
  );
}

export type VisualPanel = {
  id: string;
  title: string;
  subtitle: string;
  graph?: React.ReactNode;
  values?: Array<{
    label: string;
    value: string;
    /** 評価（★＋文言）。無い項目は省略 */
    evaluation?: string;
  }>;
  /** カード下の一般的な目安 */
  guide?: string;
  /** OCRグラフ由来か */
  fromOcrGraph?: boolean;
};

/**
 * confirmedMetrics + graphBundle から Visual パネルを構築。
 * Medical / Visual / PDF は同じ metrics + graphs を渡すこと。
 */
export function buildVisualPanels(
  confirmedMetrics: AnalysisMetrics,
  graphBundle: SoxaiGraphBundle = {},
): VisualPanel[] {
  const m = confirmedMetrics;
  const g = graphBundle;

  return [
    {
      id: "stages",
      title: "睡眠ステージ",
      subtitle: "SLEEP STAGES",
      fromOcrGraph: Boolean(
        (g.stages?.segments?.length ?? 0) > 0 ||
          (g.stages?.points?.length ?? 0) > 0,
      ),
      graph: <HypnogramChart graph={g.stages} metrics={m} />,
      guide: metricGuideline("stages"),
    },
    {
      id: "stage-detail",
      title: "睡眠ステージ詳細",
      subtitle: "STAGE DETAIL",
      fromOcrGraph: Boolean((g["stage-detail"]?.points?.length ?? 0) > 0),
      graph: (() => {
        const detailGraph = g["stage-detail"];
        if ((detailGraph?.points?.length ?? 0) >= 2) {
          return (
            <div className="mt-2">
              <MiniLineChart points={detailGraph!.points} color="#315f68" />
            </div>
          );
        }
        const eff = parsePercent(m.sleepEfficiency);
        const awake = parsePercent(m.awakeningRate);
        return (
          <div className="mt-2 space-y-1">
            <SimpleMeterBar
              label="睡眠効率"
              valueText={displayValue(m.sleepEfficiency)}
              ratio01={eff == null ? null : clamp(eff / 100, 0, 1)}
              color="#315f68"
            />
            <SimpleMeterBar
              label="覚醒率"
              valueText={displayValue(m.awakeningRate)}
              ratio01={awake == null ? null : clamp(awake / 100, 0, 1)}
              color="#8a6a2d"
            />
          </div>
        );
      })(),
      values: [
        {
          label: "睡眠時間",
          value: displayValue(m.sleepDuration),
          evaluation: evaluationText("sleepDuration", m),
        },
        {
          label: "睡眠効率",
          value: displayValue(m.sleepEfficiency),
          evaluation: evaluationText("sleepEfficiency", m),
        },
        {
          label: "覚醒時間",
          value: displayValue(m.awakenings),
        },
        {
          label: "覚醒率",
          value: displayValue(m.awakeningRate),
          evaluation: evaluationText("awakeningRate", m),
        },
        {
          label: "入眠潜時",
          value: displayValue(m.sleepLatency),
          evaluation: evaluationText("sleepLatency", m),
        },
        {
          label: "睡眠負債",
          value: displayValue(m.sleepDebt),
          evaluation: evaluationText("sleepDebt", m),
        },
      ],
      guide: metricGuideline("stage-detail"),
    },
    {
      id: "stress",
      title: "ストレスモニター",
      subtitle: "STRESS MONITOR",
      fromOcrGraph: Boolean((g.stress?.points?.length ?? 0) > 0),
      graph: <StressGauge stressText={m.stress} graph={g.stress} />,
      values: [
        {
          label: "ストレス（測定）",
          value: displayValue(m.stress),
          evaluation: evaluationText("stress", m),
        },
      ],
      guide: metricGuideline("stress"),
    },
    {
      id: "circadian",
      title: "体内時計",
      subtitle: "CIRCADIAN",
      fromOcrGraph: Boolean((g.circadian?.points?.length ?? 0) > 0),
      graph: (
        <CircadianTimeline
          bedtime={m.bedtime}
          wakeTime={m.wakeTime}
          phaseText={m.circadianRhythm}
          graph={g.circadian}
        />
      ),
      values: [{ label: "位相", value: displayValue(m.circadianRhythm) }],
      guide: metricGuideline("circadian"),
    },
    {
      id: "respiration",
      title: "睡眠時呼吸",
      subtitle: "SLEEP RESPIRATION",
      fromOcrGraph: Boolean((g.respiration?.points?.length ?? 0) > 0),
      graph: (() => {
        const respGraph = g.respiration;
        if ((respGraph?.points?.length ?? 0) >= 2) {
          return (
            <div className="mt-2 space-y-1">
              <MiniLineChart points={respGraph!.points} color="#315f68" />
              {respGraph!.annotations?.map((a) => (
                <p key={a.label} className="text-[10px] text-slate-500">
                  {a.label}: {a.value}
                </p>
              ))}
            </div>
          );
        }
        const rr = parseLeadingNumber(m.respiratoryRate);
        const spo2 = parsePercent(m.spo2) ?? parseLeadingNumber(m.spo2);
        return (
          <div className="mt-2 space-y-1">
            <SimpleMeterBar
              label="呼吸速度"
              valueText={displayValue(m.respiratoryRate)}
              ratio01={rr == null ? null : clamp(rr / 30, 0, 1)}
              color="#315f68"
            />
            <SimpleMeterBar
              label="SpO₂"
              valueText={displayValue(m.spo2)}
              ratio01={spo2 == null ? null : clamp(Number(spo2) / 100, 0, 1)}
              color="#d8b36a"
            />
          </div>
        );
      })(),
      values: [
        {
          label: "呼吸速度",
          value: displayValue(m.respiratoryRate),
          evaluation: evaluationText("respiratoryRate", m),
        },
        {
          label: "平均SpO₂",
          value: displayValue(m.spo2),
          evaluation: evaluationText("spo2", m),
        },
      ],
      guide: metricGuideline("respiration"),
    },
    {
      id: "rhr",
      title: "安静時心拍数",
      subtitle: "RESTING HR",
      fromOcrGraph: Boolean((g.rhr?.points?.length ?? 0) > 0),
      graph: (() => {
        const rhrGraph = g.rhr;
        const avgText = displayValue(m.restingHeartRate);
        const minText = displayValue(m.restingHeartRateMin);
        const maxText = displayValue(m.restingHeartRateMax);
        const avgN = parseLeadingNumber(m.restingHeartRate);
        if ((rhrGraph?.points?.length ?? 0) >= 2) {
          return (
            <div className="mt-2">
              <MiniLineChart points={rhrGraph!.points} color="#0f6b5c" />
              <div className="mt-1 space-y-0.5">
                <p className="text-[10px] text-slate-500">平均心拍: {avgText}</p>
                <p className="text-[10px] text-slate-500">最小心拍: {minText}</p>
                <p className="text-[10px] text-slate-500">最大心拍: {maxText}</p>
              </div>
            </div>
          );
        }
        return (
          <div className="mt-2 space-y-1">
            <SimpleMeterBar
              label="平均心拍"
              valueText={avgText}
              ratio01={avgN == null ? null : clamp((avgN - 40) / 50, 0, 1)}
              color="#0f6b5c"
            />
            <SimpleMeterBar
              label="最小心拍"
              valueText={minText}
              ratio01={null}
              color="#315f68"
            />
            <SimpleMeterBar
              label="最大心拍"
              valueText={maxText}
              ratio01={null}
              color="#8a6a2d"
            />
          </div>
        );
      })(),
      values: [
        {
          label: "平均心拍",
          value: displayValue(m.restingHeartRate),
          evaluation: evaluationText("restingHeartRate", m),
        },
        {
          label: "最小心拍",
          value: displayValue(m.restingHeartRateMin),
          evaluation: evaluationText("restingHeartRateMin", m),
        },
        {
          label: "最大心拍",
          value: displayValue(m.restingHeartRateMax),
          evaluation: evaluationText("restingHeartRateMax", m),
        },
      ],
      guide: metricGuideline("rhr"),
    },
    {
      id: "hrv",
      title: "HRV",
      subtitle: "HRV",
      fromOcrGraph: Boolean((g.hrv?.points?.length ?? 0) > 0),
      graph: (() => {
        const hrvGraph = g.hrv;
        const avgText = displayValue(m.hrv);
        const minText = displayValue(m.hrvMin);
        const maxText = displayValue(m.hrvMax);
        const rangeText = formatHrvRange(m) || "未測定";
        const avgN = parseLeadingNumber(m.hrv);
        const maxN = parseLeadingNumber(m.hrvMax);
        if ((hrvGraph?.points?.length ?? 0) >= 2) {
          return (
            <div className="mt-2">
              <MiniLineChart points={hrvGraph!.points} color="#8a6a2d" />
              <div className="mt-1 space-y-0.5">
                <p className="text-[10px] text-slate-500">平均HRV: {avgText}</p>
                <p className="text-[10px] text-slate-500">最小: {minText}</p>
                <p className="text-[10px] text-slate-500">最大: {maxText}</p>
                <p className="text-[10px] text-slate-500">
                  HRVレンジ: {rangeText}
                </p>
              </div>
            </div>
          );
        }
        return (
          <div className="mt-2 space-y-1">
            <SimpleMeterBar
              label="平均HRV"
              valueText={avgText}
              ratio01={avgN == null ? null : clamp((avgN - 10) / 90, 0, 1)}
              color="#8a6a2d"
            />
            <SimpleMeterBar
              label="最小HRV"
              valueText={minText}
              ratio01={null}
              color="#315f68"
            />
            <SimpleMeterBar
              label="最大HRV"
              valueText={maxText}
              ratio01={maxN == null ? null : clamp((maxN - 10) / 90, 0, 1)}
              color="#b89242"
            />
          </div>
        );
      })(),
      values: [
        {
          label: "平均HRV",
          value: displayValue(m.hrv),
          evaluation: evaluationText("hrv", m),
        },
        {
          label: "最小HRV",
          value: displayValue(m.hrvMin),
          evaluation: evaluationText("hrvMin", m),
        },
        {
          label: "最大HRV",
          value: displayValue(m.hrvMax),
          evaluation: evaluationText("hrvMax", m),
        },
        {
          label: "HRVレンジ",
          value: formatHrvRange(m) || "未測定",
          evaluation: evaluationText("hrvRange", m),
        },
      ],
      guide: metricGuideline("hrv"),
    },
    {
      id: "skin-temp",
      title: "皮膚温度",
      subtitle: "SKIN TEMP",
      fromOcrGraph: Boolean((g["skin-temp"]?.points?.length ?? 0) > 0),
      graph: (
        <VitalsChart
          graph={g["skin-temp"]}
          fallbackLabel="Skin Temp"
          fallbackValue={m.skinTemperature}
          color="#b89242"
          ratio01={(() => {
            const t = parseLeadingNumber(m.skinTemperature);
            return t == null ? null : clamp((t + 1) / 2, 0, 1);
          })()}
        />
      ),
      values: [
        {
          label: "皮膚温度",
          value: displayValue(m.skinTemperature),
          evaluation: evaluationText("skinTemperature", m),
        },
      ],
      guide: metricGuideline("skin-temp"),
    },
  ];
}

/** Medical Report 用：確認済みメトリクス一覧（単一ソース）
 * 睡眠ステージ（覚醒 / レム / 浅い / 深い）は SleepStagesOverview で別表示
 */
export const MEDICAL_METRIC_ROWS: Array<{
  label: string;
  key: keyof AnalysisMetrics;
}> = [
  { label: "睡眠スコア", key: "sleepScore" },
  { label: "睡眠時間", key: "sleepDuration" },
  { label: "入眠時間", key: "bedtime" },
  { label: "起床時間", key: "wakeTime" },
  { label: "睡眠効率", key: "sleepEfficiency" },
  { label: "睡眠負債", key: "sleepDebt" },
  { label: "入眠潜時", key: "sleepLatency" },
  { label: "体内時計", key: "circadianRhythm" },
  { label: "呼吸速度", key: "respiratoryRate" },
  { label: "平均SpO₂", key: "spo2" },
  { label: "平均心拍", key: "restingHeartRate" },
  { label: "最小心拍", key: "restingHeartRateMin" },
  { label: "最大心拍", key: "restingHeartRateMax" },
  { label: "平均HRV", key: "hrv" },
  { label: "最小HRV", key: "hrvMin" },
  { label: "最大HRV", key: "hrvMax" },
  { label: "皮膚温度", key: "skinTemperature" },
  { label: "ストレス", key: "stress" },
];
