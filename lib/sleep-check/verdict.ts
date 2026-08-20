import { judgeChronotype } from "@/lib/sleep-check/chronotype";

export type ThreeAxisInput = {
  insomniaScore: number; // AIS 0-24
  daytimeScore: number; // calcDaytimeScore result 0-24
  chronotype: ReturnType<typeof judgeChronotype>;
};

export type AxisLevel = "none" | "mild" | "moderate" | "severe";

export type PriorityVerdict =
  | "daytime-severe"
  | "insomnia-severe"
  | "rhythm"
  | "daytime-moderate"
  | "insomnia-moderate"
  | "stable";

export type ThreeAxisVerdict = {
  insomniaLevel: AxisLevel;
  daytimeLevel: AxisLevel;
  rhythmLevel: "none" | "moderate" | "severe";
  priority: PriorityVerdict;
  showMedical: boolean;
};

export type PriorityMessage = {
  heading: string;
  body: string;
};

export const PRIORITY_MESSAGES: Record<PriorityVerdict, PriorityMessage> = {
  "daytime-severe": {
    heading: "日中の眠気が強く続いているみたい",
    body:
      "夜の睡眠時間が足りているように見えても、日中の強い眠気が続くときは生活の工夫だけでは届かないことがあります。ここまで頑張ってきたからこそ、専門機関で相談する選択肢を持っておくのも大切です。ひとりで抱えず、頼れる先を一緒に探していきましょう。",
  },
  "insomnia-severe": {
    heading: "眠りにくさが続いていて、しんどいですね",
    body:
      "寝つきにくさや途中で目が覚める状態が続くと、心も体も消耗しやすくなります。あなたのせいではないので、ひとりで抱えこまなくて大丈夫です。必要なときは、専門家に相談するという選択肢をぜひ使ってください。",
  },
  rhythm: {
    heading: "からだのリズムと生活時間にずれがあるかも",
    body:
      "いまの状態は、生活リズムと体内時計のタイミングが少しずれている可能性があります。まずは起床時刻をできるだけ一定にし、朝の光を浴びるところから始めてみましょう。小さな調整でも、数日から数週間で変化が出ることがあります。",
  },
  "daytime-moderate": {
    heading: "日中の眠気が少し気になる状態かも",
    body:
      "日中に眠気が出る背景には、睡眠時間そのものが足りていない可能性もあります。まずは睡眠時間を確保できる日を少しずつ増やして、からだの反応を見てみましょう。無理のない範囲で整えるだけでも、変化につながることがあります。",
  },
  "insomnia-moderate": {
    heading: "寝つきや夜中の目覚めが気になるかも",
    body:
      "眠りの入り口や途中での目覚めに、少し負担がかかっているようです。就寝前の過ごし方をやさしく見直すところから始めると、整いやすくなることがあります。できるところから一つずつで大丈夫です。",
  },
  stable: {
    heading: "いまは大きな乱れはなさそうです",
    body:
      "全体としては、眠りの状態は比較的安定しているように見えます。いま続けられている習慣は、あなたに合っている可能性があります。無理を重ねすぎない範囲で、この調子を大切にしていきましょう。",
  },
};

export const AXIS_COMMENTS: {
  insomnia: Record<AxisLevel, string>;
  daytime: Record<AxisLevel, string>;
  rhythm: Record<"none" | "moderate" | "severe", string>;
} = {
  insomnia: {
    none: "夜の眠りは、いまのところ大きくは乱れていないようです。",
    mild: "眠りの質に小さな揺らぎがあるので、早めに整えると安心です。",
    moderate: "寝つきや中途覚醒が続く傾向があり、負担がかかっているかもしれません。",
    severe: "眠りにくさが強く続いている可能性があり、丁寧なケアが必要な状態です。",
  },
  daytime: {
    none: "日中の眠気は強くなく、活動への影響は小さそうです。",
    mild: "日中に軽い眠気が出る場面があり、睡眠量の見直し余地がありそうです。",
    moderate: "日中の眠気が生活に入り込みはじめており、調整の優先度が上がっています。",
    severe: "日中の眠気がかなり強く、安全面を含めた対策が必要な可能性があります。",
  },
  rhythm: {
    none: "生活時間と体内リズムのずれは、いまのところ大きくなさそうです。",
    moderate:
      "生活の時刻とからだのリズムがずれ気味で、睡眠の質に影響しているかもしれません。",
    severe:
      "夜型傾向に加えて時差が大きく、日々のリズム負担が強くなっている可能性があります。",
  },
};

export function insomniaLevelFor(score: number): AxisLevel {
  if (score <= 3) return "none";
  if (score <= 5) return "mild";
  if (score <= 9) return "moderate";
  return "severe";
}

export function daytimeLevelFor(score: number): AxisLevel {
  if (score <= 5) return "none";
  if (score <= 10) return "mild";
  if (score <= 15) return "moderate";
  return "severe";
}

export function rhythmLevelFor(
  chronotype: ReturnType<typeof judgeChronotype>,
): "none" | "moderate" | "severe" {
  if (
    (chronotype.type === "morning" || chronotype.type === "intermediate") &&
    !chronotype.socialJetlag
  ) {
    return "none";
  }
  if (chronotype.type === "evening" && chronotype.socialJetlag) {
    return "severe";
  }
  return "moderate";
}

export function judgeThreeAxis(input: ThreeAxisInput): ThreeAxisVerdict {
  const insomniaLevel = insomniaLevelFor(input.insomniaScore);
  const daytimeLevel = daytimeLevelFor(input.daytimeScore);
  const rhythmLevel = rhythmLevelFor(input.chronotype);

  const priority: PriorityVerdict =
    daytimeLevel === "severe"
      ? "daytime-severe"
      : insomniaLevel === "severe"
        ? "insomnia-severe"
        : rhythmLevel !== "none"
          ? "rhythm"
          : daytimeLevel === "moderate"
            ? "daytime-moderate"
            : insomniaLevel === "moderate"
              ? "insomnia-moderate"
              : "stable";

  const showMedical =
    priority === "daytime-severe" || priority === "insomnia-severe";

  return {
    insomniaLevel,
    daytimeLevel,
    rhythmLevel,
    priority,
    showMedical,
  };
}
