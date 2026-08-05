/**
 * Sleep Wellness Insight — ルール定義。
 * 単一指標では発火せず、複数指標の組み合わせでのみ原因を推定する。
 */

import type { SleepWellnessScoreFactorKey } from "@/lib/sleep-analysis/sleep-wellness-weights";

export const SLEEP_WELLNESS_INSIGHT_VERSION = "1.0.0";

/** 項目スコアの弱さ判定閾値 */
export const INSIGHT_WEAK_SCORE = 60;
export const INSIGHT_VERY_WEAK_SCORE = 45;
export const INSIGHT_STRONG_SCORE = 75;

export type InsightSeverity = "high" | "medium" | "low";
export type InsightConfidence = "high" | "medium" | "low";
export type InsightSuggestionCategory =
  | "schedule"
  | "recovery"
  | "environment"
  | "load"
  | "monitor";

export type InsightFactorSnapshot = {
  key: SleepWellnessScoreFactorKey;
  score: number | null;
  inputValue: number | null;
  available: boolean;
};

export type InsightRuleContext = {
  factors: Map<SleepWellnessScoreFactorKey, InsightFactorSnapshot>;
  totalSleepMinutes: number | null;
  sleepLatencyMinutes: number | null;
  awakeMinutes: number | null;
  spo2: number | null;
  scoreTotal: number | null;
};

export type MatchedInsightRule = {
  id: string;
  severity: InsightSeverity;
  /** 優先度ソート用（大きいほど先） */
  priorityWeight: number;
  causeTitle: string;
  causeDescription: string;
  evidenceKeys: SleepWellnessScoreFactorKey[];
  priorityTitle: string;
  priorityReason: string;
  targetKeys: SleepWellnessScoreFactorKey[];
  suggestionTitle: string;
  suggestionBody: string;
  suggestionCategory: InsightSuggestionCategory;
};

function factor(
  ctx: InsightRuleContext,
  key: SleepWellnessScoreFactorKey,
): InsightFactorSnapshot | null {
  return ctx.factors.get(key) ?? null;
}

function scoreOf(
  ctx: InsightRuleContext,
  key: SleepWellnessScoreFactorKey,
): number | null {
  const f = factor(ctx, key);
  return f?.score ?? null;
}

function available(
  ctx: InsightRuleContext,
  key: SleepWellnessScoreFactorKey,
): boolean {
  return factor(ctx, key)?.available === true;
}

function weak(
  ctx: InsightRuleContext,
  key: SleepWellnessScoreFactorKey,
  threshold = INSIGHT_WEAK_SCORE,
): boolean {
  const s = scoreOf(ctx, key);
  return s != null && s < threshold;
}

function veryWeak(
  ctx: InsightRuleContext,
  key: SleepWellnessScoreFactorKey,
): boolean {
  return weak(ctx, key, INSIGHT_VERY_WEAK_SCORE);
}

function strong(
  ctx: InsightRuleContext,
  key: SleepWellnessScoreFactorKey,
): boolean {
  const s = scoreOf(ctx, key);
  return s != null && s >= INSIGHT_STRONG_SCORE;
}

function allAvailable(
  ctx: InsightRuleContext,
  keys: SleepWellnessScoreFactorKey[],
): boolean {
  return keys.every((k) => available(ctx, k));
}

type InsightRule = {
  id: string;
  /** 2指標以上必須。false ならスキップ */
  match: (ctx: InsightRuleContext) => MatchedInsightRule | null;
};

/**
 * 複合ルール一覧。
 * 各ルールは必ず複数の指標条件を満たしたときだけ発火する。
 */
export const SLEEP_WELLNESS_INSIGHT_RULES: InsightRule[] = [
  {
    id: "short_sleep_low_efficiency",
    match(ctx) {
      if (!allAvailable(ctx, ["sleepDuration", "sleepEfficiency"])) return null;
      if (!weak(ctx, "sleepDuration") || !weak(ctx, "sleepEfficiency")) {
        return null;
      }
      return {
        id: "short_sleep_low_efficiency",
        severity: veryWeak(ctx, "sleepDuration") ? "high" : "medium",
        priorityWeight: 95,
        causeTitle: "睡眠機会と睡眠の質の両方が不足",
        causeDescription:
          "総睡眠時間が短く、かつ睡眠効率も低い状態です。単なる時短ではなく、途中覚醒や入眠の難しさが重なっている可能性が高いです。",
        evidenceKeys: ["sleepDuration", "sleepEfficiency"],
        priorityTitle: "まず睡眠の「量と連続性」を同時に立て直す",
        priorityReason:
          "時間が短いまま効率だけを上げようとしても改善が頭打ちになりやすく、両面の底上げが必要です。",
        targetKeys: ["sleepDuration", "sleepEfficiency"],
        suggestionTitle: "就寝ウィンドウを固定し、中断要因を減らす",
        suggestionBody:
          "就寝・起床時刻を一定にし、就床時間を先に確保したうえで、光・温度・騒音など中断要因を点検してください。短時間睡眠が続いている日は、日中の仮眠で負債を広げないことも重要です。",
        suggestionCategory: "schedule",
      };
    },
  },
  {
    id: "adequate_duration_low_efficiency",
    match(ctx) {
      if (!allAvailable(ctx, ["sleepDuration", "sleepEfficiency"])) return null;
      if (!strong(ctx, "sleepDuration") || !weak(ctx, "sleepEfficiency")) {
        return null;
      }
      const latency = ctx.sleepLatencyMinutes;
      const awake = ctx.awakeMinutes;
      const latencyHint =
        latency != null && latency >= 30
          ? "入眠潜時も長めです。"
          : awake != null && awake >= 40
            ? "覚醒時間が多めです。"
            : "";
      return {
        id: "adequate_duration_low_efficiency",
        severity: "medium",
        priorityWeight: 88,
        causeTitle: "睡眠時間は足りるが、睡眠の連続性が弱い",
        causeDescription: `総睡眠は確保できている一方で睡眠効率が低いため、ベッド上の時間に対して実睡眠が足りていません。${latencyHint}断片化や覚醒の増加が主因候補です。`,
        evidenceKeys: ["sleepDuration", "sleepEfficiency"],
        priorityTitle: "睡眠効率（連続性）を最優先で改善する",
        priorityReason:
          "量は確保済みのため、次に効きやすいのは覚醒の削減と入眠の安定化です。",
        targetKeys: ["sleepEfficiency"],
        suggestionTitle: "就床と実睡眠のギャップを縮める",
        suggestionBody:
          "眠れないまま長く横にならない、起床時刻を守り、日中の強い眠気以外の仮眠を控えるなど、睡眠圧とリズムを整える行動が有効です。室温と遮光も合わせて確認してください。",
        suggestionCategory: "environment",
      };
    },
  },
  {
    id: "autonomic_stress_load",
    match(ctx) {
      const keys: SleepWellnessScoreFactorKey[] = [
        "hrv",
        "restingHeartRate",
        "stress",
      ];
      const present = keys.filter((k) => available(ctx, k));
      if (present.length < 2) return null;
      const hrvWeak = available(ctx, "hrv") && weak(ctx, "hrv");
      const rhrWeak =
        available(ctx, "restingHeartRate") && weak(ctx, "restingHeartRate");
      const stressWeak = available(ctx, "stress") && weak(ctx, "stress");
      const hits = [hrvWeak, rhrWeak, stressWeak].filter(Boolean).length;
      if (hits < 2) return null;
      const evidence = keys.filter((k) => available(ctx, k) && weak(ctx, k));
      return {
        id: "autonomic_stress_load",
        severity: hits >= 3 || veryWeak(ctx, "hrv") ? "high" : "medium",
        priorityWeight: 92,
        causeTitle: "自律神経・負荷のサインが複数重なっている",
        causeDescription:
          "HRV・安静時心拍・ストレス指標のうち複数が弱いため、単発の睡眠ステージ異常ではなく、日中を含む回復負荷の蓄積が疑われます。",
        evidenceKeys: evidence,
        priorityTitle: "負荷の削減と回復時間の確保を優先する",
        priorityReason:
          "睡眠ステージだけを追っても、負荷が高いままでは改善が続きにくいパターンです。",
        targetKeys: evidence,
        suggestionTitle: "就寝前の刺激と日中負荷を一段下げる",
        suggestionBody:
          "激しい運動や強い精神負荷を就寝直前に置かない、休憩の区切りを増やす、就寝前のスクリーンとカフェインを見直すなど、負荷側の調整を先に行ってください。",
        suggestionCategory: "load",
      };
    },
  },
  {
    id: "deep_sleep_recovery_deficit",
    match(ctx) {
      if (!allAvailable(ctx, ["deepSleep", "recovery"])) return null;
      if (!weak(ctx, "deepSleep") || !weak(ctx, "recovery")) return null;
      const extras: SleepWellnessScoreFactorKey[] = ["deepSleep", "recovery"];
      if (available(ctx, "hrv") && weak(ctx, "hrv")) extras.push("hrv");
      if (
        available(ctx, "restingHeartRate") &&
        weak(ctx, "restingHeartRate")
      ) {
        extras.push("restingHeartRate");
      }
      return {
        id: "deep_sleep_recovery_deficit",
        severity: extras.length >= 3 ? "high" : "medium",
        priorityWeight: 90,
        causeTitle: "深い睡眠と回復指標の同時低下",
        causeDescription:
          "深睡眠と回復がともに弱いため、身体的な回復プロセスが十分に回っていない可能性が高いです。HRVや安静時心拍も弱い場合、回復負債の複合サインです。",
        evidenceKeys: extras,
        priorityTitle: "深睡眠と回復をセットで底上げする",
        priorityReason:
          "どちらか一方だけでは説明しにくく、回復条件（負荷・体温・リズム）の見直しが必要です。",
        targetKeys: ["deepSleep", "recovery"],
        suggestionTitle: "回復を阻む夜間条件を整える",
        suggestionBody:
          "就寝前の過度な運動を避け、寝室を涼しく暗く保ち、就寝時刻を安定させてください。体調不良や発熱の兆候がある場合は無理なトレーニングを控え、回復を優先してください。",
        suggestionCategory: "recovery",
      };
    },
  },
  {
    id: "rem_short_with_sleep_debt",
    match(ctx) {
      if (!allAvailable(ctx, ["rem", "sleepDuration"])) return null;
      if (!weak(ctx, "rem") || !weak(ctx, "sleepDuration")) return null;
      return {
        id: "rem_short_with_sleep_debt",
        severity: "medium",
        priorityWeight: 84,
        causeTitle: "睡眠不足に伴う REM 減少の可能性",
        causeDescription:
          "総睡眠と REM が同時に弱いため、REM 単独の異常というより、睡眠時間の不足が後半に多い REM を削っている構図が疑われます。",
        evidenceKeys: ["rem", "sleepDuration"],
        priorityTitle: "まず総睡眠時間を回復させる",
        priorityReason:
          "REM を直接狙い撃ちするより、睡眠機会を延ばす方が再現性の高い改善です。",
        targetKeys: ["sleepDuration", "rem"],
        suggestionTitle: "起床時刻を固定したまま就寝を前倒しする",
        suggestionBody:
          "週末の寝だめに頼らず、平日の就寝を15〜30分ずつ早めて総睡眠を増やしてください。アルコールは REM を抑えやすいため、就寝前の飲酒も見直してください。",
        suggestionCategory: "schedule",
      };
    },
  },
  {
    id: "thermoregulation_sleep_disruption",
    match(ctx) {
      if (!allAvailable(ctx, ["temperatureDeviation", "deepSleep"])) return null;
      if (!weak(ctx, "temperatureDeviation") || !weak(ctx, "deepSleep")) {
        return null;
      }
      const evidence: SleepWellnessScoreFactorKey[] = [
        "temperatureDeviation",
        "deepSleep",
      ];
      if (available(ctx, "sleepEfficiency") && weak(ctx, "sleepEfficiency")) {
        evidence.push("sleepEfficiency");
      }
      if (available(ctx, "recovery") && weak(ctx, "recovery")) {
        evidence.push("recovery");
      }
      return {
        id: "thermoregulation_sleep_disruption",
        severity: evidence.length >= 3 ? "high" : "medium",
        priorityWeight: 86,
        causeTitle: "体温リズムと深い睡眠の不安定",
        causeDescription:
          "体温変化が大きく、深睡眠も弱いため、熱放散や体調負荷が睡眠の深さに影響している可能性があります。効率や回復も弱い場合、環境・体調要因の複合です。",
        evidenceKeys: evidence,
        priorityTitle: "寝室の温熱環境と体調負荷を先に整える",
        priorityReason:
          "深睡眠の低さだけを見るより、体温偏差とセットで見ると介入点が明確になります。",
        targetKeys: ["temperatureDeviation", "deepSleep"],
        suggestionTitle: "就寝前の体温を下げやすい環境をつくる",
        suggestionBody:
          "寝室をやや涼しくし、厚着や発熱を避ける、就寝直前の熱い入浴を長時間にしすぎないなど、入眠前後の熱収支を整えてください。体調不良時は回復を優先してください。",
        suggestionCategory: "environment",
      };
    },
  },
  {
    id: "stress_blocks_recovery",
    match(ctx) {
      if (!allAvailable(ctx, ["stress", "recovery"])) return null;
      if (!weak(ctx, "stress") || !weak(ctx, "recovery")) return null;
      const evidence: SleepWellnessScoreFactorKey[] = ["stress", "recovery"];
      if (available(ctx, "hrv") && weak(ctx, "hrv")) evidence.push("hrv");
      return {
        id: "stress_blocks_recovery",
        severity: evidence.length >= 3 ? "high" : "medium",
        priorityWeight: 87,
        causeTitle: "ストレス負荷に対して回復が追いついていない",
        causeDescription:
          "ストレス指標が弱い一方で回復も弱いため、負荷と回復のバランスが崩れている状態です。HRV も弱い場合、回復サイクルの停滞がより明確です。",
        evidenceKeys: evidence,
        priorityTitle: "負荷を減らし、回復ウィンドウを意図的に作る",
        priorityReason:
          "回復行動だけを増やしても、ストレス源が大きいままだと効果が限定的です。",
        targetKeys: ["stress", "recovery"],
        suggestionTitle: "高負荷日の翌日に回復日を入れる",
        suggestionBody:
          "強度の高い仕事・運動が続いた日は、翌日の負荷を意図的に下げ、就寝前にリラックス時間を確保してください。短い呼吸法や散歩など、低刺激の切り替えを日中に挟むのも有効です。",
        suggestionCategory: "load",
      };
    },
  },
  {
    id: "efficiency_stress_arousal",
    match(ctx) {
      if (!allAvailable(ctx, ["sleepEfficiency", "stress"])) return null;
      if (!weak(ctx, "sleepEfficiency") || !weak(ctx, "stress")) return null;
      const evidence: SleepWellnessScoreFactorKey[] = [
        "sleepEfficiency",
        "stress",
      ];
      if (available(ctx, "rem") && weak(ctx, "rem")) evidence.push("rem");
      return {
        id: "efficiency_stress_arousal",
        severity: "medium",
        priorityWeight: 82,
        causeTitle: "覚醒寄りの状態が睡眠効率を下げている可能性",
        causeDescription:
          "睡眠効率の低さとストレス指標の弱さが同時に見られるため、心身の緊張が睡眠の連続性を下げている構図が疑われます。",
        evidenceKeys: evidence,
        priorityTitle: "就寝前の覚醒レベルを下げる",
        priorityReason:
          "効率低下の背景に負荷がある場合、スケジュール調整だけでは不十分なことがあります。",
        targetKeys: ["sleepEfficiency", "stress"],
        suggestionTitle: "就寝90分前から刺激を段階的に減らす",
        suggestionBody:
          "仕事・ニュース・強い光を早めに切り上げ、暗い環境と一定の就寝ルーチンへ移行してください。心配事が頭から離れない場合は、紙に書き出して翌日に回す方法も有効です。",
        suggestionCategory: "load",
      };
    },
  },
  {
    id: "architecture_imbalance_with_duration",
    match(ctx) {
      if (
        !allAvailable(ctx, ["rem", "deepSleep", "sleepDuration"])
      ) {
        return null;
      }
      // 時間はそこそこ、だが REM と深睡眠が両方弱い
      const durationScore = scoreOf(ctx, "sleepDuration");
      if (durationScore == null || durationScore < 65) return null;
      if (!weak(ctx, "rem") || !weak(ctx, "deepSleep")) return null;
      return {
        id: "architecture_imbalance_with_duration",
        severity: "medium",
        priorityWeight: 80,
        causeTitle: "睡眠時間に対して睡眠構造の質が偏っている",
        causeDescription:
          "総睡眠は比較的確保できている一方で、REM と深睡眠がともに弱いため、単なる時短ではなく睡眠構造のバランスに課題がある可能性があります。",
        evidenceKeys: ["rem", "deepSleep", "sleepDuration"],
        priorityTitle: "睡眠構造（深睡眠・REM）のバランス改善を狙う",
        priorityReason:
          "量の問題だけでは説明しにくいため、リズム・アルコール・負荷・体温など構造に効く要因を見直します。",
        targetKeys: ["deepSleep", "rem"],
        suggestionTitle: "規則正しい睡眠リズムと就寝前の負荷管理",
        suggestionBody:
          "毎日同じ時間帯に眠る、就寝前の飲酒を減らす、午後以降のカフェインを控える、就寝直前の高強度運動を避ける、といった基本行動から整えてください。",
        suggestionCategory: "schedule",
      };
    },
  },
  {
    id: "respiratory_with_efficiency",
    match(ctx) {
      if (!allAvailable(ctx, ["respiratoryRate", "sleepEfficiency"])) {
        return null;
      }
      if (!weak(ctx, "respiratoryRate") || !weak(ctx, "sleepEfficiency")) {
        return null;
      }
      const evidence: SleepWellnessScoreFactorKey[] = [
        "respiratoryRate",
        "sleepEfficiency",
      ];
      const spo2Low = ctx.spo2 != null && ctx.spo2 < 95;
      return {
        id: "respiratory_with_efficiency",
        severity: spo2Low ? "high" : "medium",
        priorityWeight: spo2Low ? 91 : 78,
        causeTitle: "呼吸関連指標と睡眠効率の同時悪化",
        causeDescription: spo2Low
          ? "呼吸数のスコアが弱く、睡眠効率も低いことに加え、SpO2 も低めです。鼻閉や睡眠時の呼吸負荷など、呼吸面の確認が優先されます。"
          : "呼吸数のスコアと睡眠効率が同時に弱いため、睡眠の断片化に呼吸負荷が関与している可能性があります。",
        evidenceKeys: evidence,
        priorityTitle: "呼吸・気道のコンディションを確認する",
        priorityReason:
          "効率だけを追うより、呼吸側の要因を併せて見た方が安全で再現性があります。",
        targetKeys: evidence,
        suggestionTitle: "鼻呼吸しやすい環境と横向き姿勢を試す",
        suggestionBody:
          "寝室の湿度を整え、鼻閉があれば就寝前にケアし、仰向けでいびきが出やすい場合は横向きを試してください。強い息苦しさや持続する低 SpO2 がある場合は専門家への相談を検討してください。",
        suggestionCategory: "monitor",
      };
    },
  },
  {
    id: "low_hrv_poor_deep_sleep",
    match(ctx) {
      if (!allAvailable(ctx, ["hrv", "deepSleep"])) return null;
      if (!weak(ctx, "hrv") || !weak(ctx, "deepSleep")) return null;
      // ストレス単独ルールと差別化: 回復 or 心拍も弱い、または非常に弱い組み合わせ
      const extraWeak =
        (available(ctx, "recovery") && weak(ctx, "recovery")) ||
        (available(ctx, "restingHeartRate") &&
          weak(ctx, "restingHeartRate")) ||
        veryWeak(ctx, "hrv") ||
        veryWeak(ctx, "deepSleep");
      if (!extraWeak) return null;
      const evidence: SleepWellnessScoreFactorKey[] = ["hrv", "deepSleep"];
      if (available(ctx, "recovery") && weak(ctx, "recovery")) {
        evidence.push("recovery");
      }
      if (
        available(ctx, "restingHeartRate") &&
        weak(ctx, "restingHeartRate")
      ) {
        evidence.push("restingHeartRate");
      }
      return {
        id: "low_hrv_poor_deep_sleep",
        severity: "high",
        priorityWeight: 89,
        causeTitle: "回復系（HRV）と深睡眠の同時低下",
        causeDescription:
          "HRV と深睡眠がともに弱く、さらに回復または安静時心拍も弱いため、身体回復のコア指標がまとめて低下しています。",
        evidenceKeys: evidence,
        priorityTitle: "回復系指標の底上げを最優先する",
        priorityReason:
          "複数の回復サインが同時に弱いため、単一ステージの微調整より全体の回復条件整備が先です。",
        targetKeys: ["hrv", "deepSleep"],
        suggestionTitle: "トレーニング強度を一時的に落とし回復を優先",
        suggestionBody:
          "高強度トレーニングや睡眠不足の重ねを避け、就寝時刻を安定させ、カフェインとアルコールを控えめにしてください。数日単位で HRV と深睡眠の戻りを観察します。",
        suggestionCategory: "recovery",
      };
    },
  },
];
