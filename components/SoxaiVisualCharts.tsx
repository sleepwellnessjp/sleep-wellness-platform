"use client";

import type { AnalysisMetrics } from "@/lib/soxai-metrics";
import type { GraphPanelData, GraphPoint, SoxaiGraphBundle } from "@/lib/soxai-graphs";
import {
  clamp,
  displayValue,
  parseHHMM,
  parseLeadingNumber,
  parsePercent,
  stageRatiosFromData,
  STAGE_COLORS,
} from "@/lib/soxai-graphs";

const NAVY = "#071426";

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
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-semibold text-slate-500">{label}</p>
        <p className="text-[11px] font-semibold" style={{ color: NAVY }}>
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

function HypnogramChart({
  graph,
  metrics,
}: {
  graph?: GraphPanelData;
  metrics: AnalysisMetrics;
}) {
  const segments = graph?.segments ?? [];
  if (segments.length > 0) {
    const total = segments.reduce((s, seg) => s + (seg.ratio ?? 1), 0);
    return (
      <div className="mt-2">
        <div
          className="flex h-4 w-full overflow-hidden rounded-full"
          style={{ background: "rgba(7,20,38,0.06)" }}
          aria-hidden
        >
          {segments.map((seg, i) => {
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
        <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1">
          {(["awake", "rem", "light", "deep"] as const).map((stage) => (
            <span
              key={stage}
              className="inline-flex items-center gap-1 text-[10px] text-slate-500"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: STAGE_COLORS[stage] }}
              />
              {stage === "awake"
                ? "覚醒"
                : stage === "rem"
                  ? "REM"
                  : stage === "light"
                    ? "浅い"
                    : "深い"}
            </span>
          ))}
        </div>
      </div>
    );
  }

  const ratios = stageRatiosFromData(metrics, graph);
  return (
    <div className="mt-2">
      <div
        className="flex h-3 w-full overflow-hidden rounded-full"
        style={{ background: "rgba(7,20,38,0.06)" }}
        aria-hidden
      >
        <div style={{ width: `${ratios.rem * 100}%`, backgroundColor: STAGE_COLORS.rem }} />
        <div style={{ width: `${ratios.light * 100}%`, backgroundColor: STAGE_COLORS.light }} />
        <div style={{ width: `${ratios.deep * 100}%`, backgroundColor: STAGE_COLORS.deep }} />
      </div>
      <div className="mt-2 flex justify-between">
        <p className="text-[11px] font-semibold text-slate-500">REM</p>
        <p className="text-[11px] font-semibold text-slate-500">浅い</p>
        <p className="text-[11px] font-semibold text-slate-500">深い</p>
      </div>
    </div>
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
          {phaseText || "—"}
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
          {phaseText || "—"}
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
      <div className="mt-2 flex justify-between">
        <p className="text-[11px] font-semibold text-slate-500">
          入眠 {bedtime || "—"}
        </p>
        <p className="text-[11px] font-semibold text-slate-500">
          起床 {wakeTime || "—"}
        </p>
      </div>
      <p className="mt-2 text-[11px] font-semibold" style={{ color: NAVY }}>
        {phaseText || "—"}
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
  values?: Array<{ label: string; value: string }>;
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
      values: [
        { label: "REM（時間）", value: displayValue(m.remSleep) },
        { label: "REM睡眠率", value: displayValue(m.remSleepRate) },
        { label: "浅い睡眠（時間）", value: displayValue(m.lightSleep) },
        { label: "浅い睡眠率", value: displayValue(m.lightSleepRate) },
        { label: "深い睡眠（時間）", value: displayValue(m.deepSleep) },
        { label: "深い睡眠率", value: displayValue(m.deepSleepRate) },
      ],
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
        { label: "睡眠時間", value: displayValue(m.sleepDuration) },
        { label: "睡眠効率", value: displayValue(m.sleepEfficiency) },
        { label: "覚醒時間", value: displayValue(m.awakenings) },
        { label: "覚醒率", value: displayValue(m.awakeningRate) },
        { label: "入眠潜時", value: displayValue(m.sleepLatency) },
        { label: "睡眠負債", value: displayValue(m.sleepDebt) },
      ],
    },
    {
      id: "stress",
      title: "ストレスモニター",
      subtitle: "STRESS MONITOR",
      fromOcrGraph: Boolean((g.stress?.points?.length ?? 0) > 0),
      graph: <StressGauge stressText={m.stress} graph={g.stress} />,
      values: [{ label: "ストレス（測定）", value: displayValue(m.stress) }],
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
              {respGraph!.annotations.map((a) => (
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
        { label: "呼吸速度", value: displayValue(m.respiratoryRate) },
        { label: "平均SpO₂", value: displayValue(m.spo2) },
      ],
    },
    {
      id: "rhr",
      title: "安静時心拍数",
      subtitle: "RESTING HR",
      fromOcrGraph: Boolean((g.rhr?.points?.length ?? 0) > 0),
      graph: (
        <VitalsChart
          graph={g.rhr}
          fallbackLabel="RHR"
          fallbackValue={m.restingHeartRate}
          color="#0f6b5c"
          ratio01={(() => {
            const rhr = parseLeadingNumber(m.restingHeartRate);
            return rhr == null ? null : clamp((rhr - 40) / 50, 0, 1);
          })()}
        />
      ),
      values: [
        { label: "安静時心拍数", value: displayValue(m.restingHeartRate) },
      ],
    },
    {
      id: "hrv",
      title: "HRV",
      subtitle: "HRV",
      fromOcrGraph: Boolean((g.hrv?.points?.length ?? 0) > 0),
      graph: (
        <VitalsChart
          graph={g.hrv}
          fallbackLabel="HRV"
          fallbackValue={m.hrv}
          color="#8a6a2d"
          ratio01={(() => {
            const hrv = parseLeadingNumber(m.hrv);
            return hrv == null ? null : clamp((hrv - 10) / 90, 0, 1);
          })()}
        />
      ),
      values: [{ label: "HRV", value: displayValue(m.hrv) }],
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
        { label: "皮膚温度", value: displayValue(m.skinTemperature) },
      ],
    },
  ];
}

/** Medical Report 用：確認済みメトリクス一覧（単一ソース） */
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
  { label: "覚醒時間", key: "awakenings" },
  { label: "覚醒率", key: "awakeningRate" },
  { label: "REM睡眠", key: "remSleep" },
  { label: "レム睡眠率", key: "remSleepRate" },
  { label: "浅い睡眠", key: "lightSleep" },
  { label: "浅い睡眠率", key: "lightSleepRate" },
  { label: "深い睡眠", key: "deepSleep" },
  { label: "深い睡眠率", key: "deepSleepRate" },
  { label: "呼吸速度", key: "respiratoryRate" },
  { label: "平均SpO₂", key: "spo2" },
  { label: "安静時心拍数", key: "restingHeartRate" },
  { label: "HRV", key: "hrv" },
  { label: "皮膚温度", key: "skinTemperature" },
  { label: "ストレス", key: "stress" },
];
