/**
 * 各評価項目の 0–100 スコア関数。
 * 個人ベースラインは使わず、成人向けの一般的な健全帯で評価する。
 */

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** 区間線形補間（x は昇順のキー） */
function lerpMap(
  x: number,
  points: ReadonlyArray<readonly [number, number]>,
): number {
  if (points.length === 0) return 0;
  if (x <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    if (x <= x1) {
      if (x1 === x0) return y1;
      const t = (x - x0) / (x1 - x0);
      return y0 + t * (y1 - y0);
    }
  }
  return points[points.length - 1][1];
}

/** 睡眠時間（分）。理想 7.5–8.5 時間 */
export function scoreSleepDurationMinutes(minutes: number): number {
  return clampScore(
    lerpMap(minutes, [
      [180, 10],
      [300, 35],
      [360, 60],
      [420, 90],
      [450, 100],
      [510, 100],
      [540, 90],
      [600, 60],
      [660, 35],
      [720, 15],
    ]),
  );
}

/** 睡眠効率（%）。理想 ≥90 */
export function scoreSleepEfficiencyPercent(pct: number): number {
  return clampScore(
    lerpMap(pct, [
      [50, 5],
      [70, 35],
      [75, 50],
      [80, 70],
      [85, 85],
      [90, 100],
      [100, 100],
    ]),
  );
}

/**
 * REM。総睡眠がある場合は比率（理想 18–25%）、
 * 無い場合は分（理想 80–120 分）。
 */
export function scoreRem(
  remMinutes: number,
  totalSleepMinutes: number | null,
): number {
  if (
    totalSleepMinutes != null &&
    totalSleepMinutes > 0 &&
    Number.isFinite(totalSleepMinutes)
  ) {
    const pct = (remMinutes / totalSleepMinutes) * 100;
    return clampScore(
      lerpMap(pct, [
        [5, 10],
        [10, 40],
        [15, 75],
        [18, 100],
        [25, 100],
        [28, 80],
        [35, 45],
        [45, 15],
      ]),
    );
  }
  return clampScore(
    lerpMap(remMinutes, [
      [20, 15],
      [40, 40],
      [60, 65],
      [80, 90],
      [90, 100],
      [120, 100],
      [150, 75],
      [180, 45],
    ]),
  );
}

/**
 * 深睡眠。総睡眠がある場合は比率（理想 13–20%）、
 * 無い場合は分（理想 60–100 分）。
 */
export function scoreDeepSleep(
  deepMinutes: number,
  totalSleepMinutes: number | null,
): number {
  if (
    totalSleepMinutes != null &&
    totalSleepMinutes > 0 &&
    Number.isFinite(totalSleepMinutes)
  ) {
    const pct = (deepMinutes / totalSleepMinutes) * 100;
    return clampScore(
      lerpMap(pct, [
        [3, 10],
        [8, 40],
        [11, 70],
        [13, 100],
        [20, 100],
        [25, 75],
        [35, 40],
        [45, 15],
      ]),
    );
  }
  return clampScore(
    lerpMap(deepMinutes, [
      [15, 15],
      [30, 40],
      [45, 65],
      [60, 90],
      [70, 100],
      [100, 100],
      [130, 75],
      [160, 40],
    ]),
  );
}

/** HRV（ms）。高いほど良い（一般帯） */
export function scoreHrvMs(hrv: number): number {
  return clampScore(
    lerpMap(hrv, [
      [10, 5],
      [20, 30],
      [35, 55],
      [50, 80],
      [70, 100],
      [100, 100],
    ]),
  );
}

/** 安静時心拍（bpm）。成人の健全帯 ~50–60 */
export function scoreRestingHeartRateBpm(bpm: number): number {
  return clampScore(
    lerpMap(bpm, [
      [30, 20],
      [40, 55],
      [45, 85],
      [50, 100],
      [60, 100],
      [65, 90],
      [75, 65],
      [85, 35],
      [100, 10],
    ]),
  );
}

/** 呼吸数（回/分）。睡眠中の健全帯 ~12–16 */
export function scoreRespiratoryRate(rpm: number): number {
  return clampScore(
    lerpMap(rpm, [
      [6, 15],
      [8, 40],
      [10, 75],
      [12, 100],
      [16, 100],
      [18, 80],
      [20, 50],
      [24, 20],
      [30, 5],
    ]),
  );
}

/** 体温変化（℃）。0 に近いほど良い */
export function scoreTemperatureDeviation(deltaC: number): number {
  const abs = Math.abs(deltaC);
  return clampScore(
    lerpMap(abs, [
      [0, 100],
      [0.1, 100],
      [0.2, 90],
      [0.3, 75],
      [0.5, 50],
      [0.8, 25],
      [1.2, 10],
      [2.0, 0],
    ]),
  );
}

/** ストレス時間（分）。短いほど良い */
export function scoreStressMinutes(minutes: number): number {
  return clampScore(
    lerpMap(minutes, [
      [0, 100],
      [30, 100],
      [60, 85],
      [120, 65],
      [180, 45],
      [300, 20],
      [420, 5],
    ]),
  );
}

/**
 * 回復。
 * - minutes: 回復時間（分）が多いほど良い
 * - または 0–100 の回復指数として渡す場合は scoreRecoveryIndex
 */
export function scoreRecoveryMinutes(minutes: number): number {
  return clampScore(
    lerpMap(minutes, [
      [0, 15],
      [20, 35],
      [40, 55],
      [60, 70],
      [90, 85],
      [120, 100],
      [180, 100],
    ]),
  );
}

/** 回復指数（0–100）。そのまま使う */
export function scoreRecoveryIndex(index: number): number {
  return clampScore(index);
}
