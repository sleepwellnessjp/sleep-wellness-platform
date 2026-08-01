"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FormEvent,
  ReactNode,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import AnalysisFlow from "@/components/AnalysisFlow";
import SoxaiOcrProgressPanel from "@/components/SoxaiOcrProgressPanel";
import {
  AnalysisError,
  beginNewSoxaiAnalysisSession,
  cancelBackgroundSoxaiExtraction,
  clearBackgroundSoxaiExtraction,
  formatExtractErrorMessage,
  reanalyzeSoxaiImages,
  resolveSoxaiExtraction,
  startBackgroundSoxaiExtraction,
  type BackgroundOcrStatus,
  type MetricConflict,
  type OcrProgressSnapshot,
  type SoxaiExtractSection,
  type SoxaiOcrImageStatusRecord,
  getExtractionDraft,
  setExtractionDraft,
} from "@/lib/analysis-session";
import { resetProgressiveAnalysisJobs } from "@/lib/analysis-progressive";
import type { AnalysisMetrics } from "@/lib/soxai-metrics";
import type { SoxaiGraphBundle } from "@/lib/soxai-graphs";
import type { MetricConfidenceMap } from "@/lib/soxai-merge";
import {
  CLIENT_GENDER_OPTIONS,
  emptyClientProfileBasics,
  parseOptionalAge,
  type ClientProfileBasics,
} from "@/lib/client-profile";
import {
  normalizeClientProfileSections,
  type ClientProfileSections,
} from "@/lib/client-profiles";
import { getClientProfile } from "@/lib/repositories/client-profile-repository";
import {
  getClientById,
  getClientListItems,
  type ClientListItem,
  type StoredClient,
} from "@/lib/repositories/client-repository";
import {
  collectedMetricKeys,
  emptyMetrics,
  SOXAI_METRIC_FIELDS,
} from "@/lib/soxai-metrics";
import { emptyGraphBundle } from "@/lib/soxai-graphs";
import { toSwsMetrics } from "@/lib/sws-standard";

const SLOT_MAX_FILES: Record<SoxaiExtractSection, number> = {
  home: 1,
  stress: 1,
  sleep_overview: 1,
  sleep_detail: 1,
  sleep_stages: 2,
  circadian: 1,
  respiration: 1,
  heart_hrv: 2,
  skin_temp: 1,
};
const MAX_FILES = Object.values(SLOT_MAX_FILES).reduce(
  (sum, value) => sum + value,
  0,
);
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const inputClass =
  "mt-2.5 min-h-12 w-full rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3.5 text-[16px] text-[#071426] outline-none transition duration-300 placeholder:text-slate-400 focus:border-[#315f68] focus:bg-white focus:ring-4 focus:ring-[#315f68]/10 sm:min-h-0 sm:px-5 sm:py-4 sm:text-base";

const textareaClass =
  "mt-2.5 min-h-12 w-full resize-none rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3.5 text-[16px] leading-7 text-[#071426] outline-none transition duration-300 placeholder:text-slate-400 focus:border-[#315f68] focus:bg-white focus:ring-4 focus:ring-[#315f68]/10 sm:min-h-0 sm:px-5 sm:py-4 sm:text-base";

const caffeineTypeOptions = [
  { value: "coffee", label: "コーヒー" },
  { value: "black_tea", label: "紅茶" },
  { value: "green_tea", label: "緑茶" },
  { value: "oolong_tea", label: "ウーロン茶" },
  { value: "energy_drink", label: "エナジードリンク" },
  { value: "cola", label: "コーラ" },
  { value: "chocolate", label: "チョコレート" },
  { value: "other", label: "その他" },
] as const;

const YES_NO_OPTIONS = [
  { value: "yes", label: "はい" },
  { value: "none", label: "いいえ" },
] as const;

const ALCOHOL_DONE_OPTIONS = [
  { value: "none", label: "飲まない" },
  { value: "yes", label: "飲んだ" },
] as const;

const CAFFEINE_DONE_OPTIONS = [
  { value: "none", label: "摂取なし" },
  { value: "yes", label: "摂取した" },
] as const;

const STRESS_LEVEL_OPTIONS = [
  { value: "とても低い", label: "とても低い" },
  { value: "低い", label: "低い" },
  { value: "普通", label: "普通" },
  { value: "高い", label: "高い" },
  { value: "とても高い", label: "とても高い" },
] as const;

const BATHING_OPTIONS = [
  { value: "bath", label: "湯船に入った" },
  { value: "shower", label: "シャワーのみ" },
  { value: "none", label: "入浴していない" },
] as const;

const BATHING_DURATION_OPTIONS = [
  { value: "", label: "選択してください" },
  { value: "under5", label: "5分未満" },
  { value: "5", label: "5分" },
  { value: "10", label: "10分" },
  { value: "15", label: "15分" },
  { value: "20", label: "20分" },
  { value: "30", label: "30分" },
  { value: "45", label: "45分" },
  { value: "60plus", label: "60分以上" },
] as const;

const BATHING_TEMPERATURE_OPTIONS = [
  { value: "", label: "選択してください" },
  { value: "35under", label: "35℃以下" },
  { value: "36", label: "36℃" },
  { value: "37", label: "37℃" },
  { value: "38", label: "38℃" },
  { value: "39", label: "39℃" },
  { value: "40", label: "40℃" },
  { value: "41", label: "41℃" },
  { value: "42", label: "42℃" },
  { value: "43plus", label: "43℃以上" },
  { value: "unknown", label: "不明" },
] as const;

const WEEKDAY_OPTIONS = [
  { value: "月", label: "月" },
  { value: "火", label: "火" },
  { value: "水", label: "水" },
  { value: "木", label: "木" },
  { value: "金", label: "金" },
  { value: "土", label: "土" },
  { value: "日", label: "日" },
] as const;

const COUNT_OPTIONS = [
  { value: "0", label: "0回" },
  { value: "1", label: "1回" },
  { value: "2", label: "2回" },
  { value: "3plus", label: "3回以上" },
] as const;

/** 0〜12時間・30分刻み（value は分） */
const DURATION_MINUTE_OPTIONS: { value: string; label: string }[] = (() => {
  const options: { value: string; label: string }[] = [
    { value: "", label: "選択してください" },
    { value: "0", label: "0分" },
  ];
  for (let minutes = 30; minutes <= 12 * 60; minutes += 30) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    const label =
      hours === 0
        ? `${rest}分`
        : rest === 0
          ? `${hours}時間`
          : `${hours}時間${rest}分`;
    options.push({ value: String(minutes), label });
  }
  return options;
})();

/** 時刻選択：00:00〜23:30・30分刻み */
const HALF_HOUR_TIME_OPTIONS: { value: string; label: string }[] = (() => {
  const options: { value: string; label: string }[] = [
    { value: "", label: "選択してください" },
  ];
  for (let hour = 0; hour < 24; hour += 1) {
    for (const minute of [0, 30]) {
      const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      options.push({ value, label: value });
    }
  }
  return options;
})();

/** 食事時間：未選択・食べていない付き */
const HALF_HOUR_CLOCK_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "選択してください" },
  { value: "none", label: "食べていない" },
  ...HALF_HOUR_TIME_OPTIONS.filter((option) => option.value !== ""),
];

type OtherExerciseEntry = {
  id: string;
  name: string;
  duration: string;
  time: string;
  notes: string;
};

/** ヨガ・ピラティスの1回分（運動欄と同じ考え方：開始時刻・実施時間・補足） */
type PracticeSessionEntry = {
  id: string;
  duration: string;
  time: string;
  notes: string;
};

type CaffeineEntry = {
  id: string;
  type: string;
  typeOther: string;
  time: string;
  amount: string;
};

type InputMethod = "soxai" | "manual" | "oura" | "garmin" | "apple";

type SoxaiUploadSlot = {
  id: SoxaiExtractSection;
  title: string;
  description: string;
  items: readonly string[];
};

const SOXAI_UPLOAD_SLOTS: SoxaiUploadSlot[] = [
  {
    id: "home",
    title: "概要",
    description: "QoL・睡眠・体調・運動のスコアが表示される画面",
    items: [
      "QoLスコア",
      "睡眠スコア",
      "体調スコア",
      "運動スコア",
    ],
  },
  {
    id: "stress",
    title: "ストレス",
    description: "ストレスのスコア・評価・推移が表示される画面",
    items: ["ストレススコア", "ストレス評価", "ストレス推移"],
  },
  {
    id: "sleep_overview",
    title: "睡眠概要",
    description: "睡眠スコアと睡眠全体サマリーが表示される画面",
    items: [
      "睡眠スコア",
      "睡眠時間",
      "必要睡眠時間",
      "目標達成率",
      "就寝時刻",
      "起床時刻",
      "仮眠時間",
      "全就床時間",
    ],
  },
  {
    id: "sleep_detail",
    title: "睡眠詳細",
    description: "睡眠の詳細指標が表示される画面",
    items: ["入眠潜時", "睡眠効率", "睡眠負債", "体内時計"],
  },
  {
    id: "sleep_stages",
    title: "睡眠ステージ",
    description: "睡眠ステージ内訳とグラフが表示される画面",
    items: [
      "覚醒時間と割合",
      "REM睡眠時間と割合",
      "ノンレム睡眠時間と割合",
      "睡眠ステージグラフ",
    ],
  },
  {
    id: "heart_hrv",
    title: "呼吸・心拍",
    description: "呼吸・酸素・心拍・HRVが表示される画面",
    items: [
      "平均酸素レベル",
      "呼吸速度",
      "安静時心拍数の最小値",
      "安静時心拍数の平均値",
      "HRV平均値",
      "HRV最大値",
    ],
  },
  {
    id: "skin_temp",
    title: "皮膚温",
    description: "皮膚温の最新変化とグラフが表示される画面",
    items: ["皮膚温の最新変化", "皮膚温グラフ"],
  },
];

function fileFingerprint(file: File): string {
  return `${file.name}::${file.size}::${file.lastModified}::${file.type}`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("画像の読み込みに失敗しました。"));
      }
    };
    reader.onerror = () => reject(new Error("画像の読み込みに失敗しました。"));
    reader.readAsDataURL(file);
  });
}

function createOtherExerciseEntry(): OtherExerciseEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    duration: "",
    time: "",
    notes: "",
  };
}

function createPracticeSessionEntry(): PracticeSessionEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    duration: "",
    time: "",
    notes: "",
  };
}

function createCaffeineEntry(): CaffeineEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "",
    typeOther: "",
    time: "",
    amount: "",
  };
}

function caffeineTypeLabel(entry: CaffeineEntry): string {
  if (entry.type === "other") {
    return entry.typeOther.trim() || "その他";
  }
  return (
    caffeineTypeOptions.find((option) => option.value === entry.type)?.label ??
    entry.type
  );
}

function composePracticeSessionsSummary(
  done: string,
  entries: PracticeSessionEntry[],
): string {
  if (done === "none") return "なし";
  if (done !== "yes") return "";
  const lines = entries
    .map((entry, index) => {
      const parts = [
        entries.length > 1 ? `${index + 1}回目` : "実施",
        entry.duration ? `${entry.duration}分` : "",
        entry.time ? `開始:${entry.time}` : "",
        entry.notes ? `補足:${entry.notes}` : "",
      ].filter(Boolean);
      return parts.join(" / ");
    })
    .filter((line) => line && line !== "実施");
  if (lines.length === 0) return "実施";
  return lines.join("；");
}

function composeCaffeineSessionsSummary(
  done: string,
  entries: CaffeineEntry[],
): string {
  if (done === "none") return "なし";
  if (done !== "yes") return "";

  const lines = entries
    .map((entry, index) => {
      const typeLabel = caffeineTypeLabel(entry);
      const parts = [
        entries.length > 1 ? `${index + 1}回目` : "あり",
        typeLabel ? `種類:${typeLabel}` : "",
        entry.amount ? `量:${entry.amount}` : "",
        entry.time ? `時刻:${entry.time}` : "",
      ].filter(Boolean);
      return parts.join(" / ");
    })
    .filter((line) => line && line !== "あり");

  if (lines.length === 0) return "あり";
  return lines.join("；");
}

function composeBathingSummary(bathing: {
  method: string;
  time: string;
  duration: string;
  temperature: string;
}): string {
  if (bathing.method === "none") return "入浴していない";
  if (!bathing.method) return "";

  if (bathing.method === "shower") {
    const parts = ["シャワーのみ"];
    if (bathing.time) parts.push(`時刻:${bathing.time}`);
    return parts.join(" / ");
  }

  if (bathing.method === "bath") {
    const durationLabel =
      BATHING_DURATION_OPTIONS.find(
        (option) => option.value === bathing.duration,
      )?.label ?? bathing.duration;
    const temperatureLabel =
      BATHING_TEMPERATURE_OPTIONS.find(
        (option) => option.value === bathing.temperature,
      )?.label ?? bathing.temperature;
    const parts = ["湯船に入った"];
    if (bathing.time) parts.push(`時刻:${bathing.time}`);
    if (durationLabel && bathing.duration) {
      parts.push(`入浴時間:${durationLabel}`);
    }
    if (temperatureLabel && bathing.temperature) {
      parts.push(`温度:${temperatureLabel}`);
    }
    return parts.join(" / ");
  }

  return bathing.method;
}

function composeOtherExerciseSummary(entries: OtherExerciseEntry[]): string {
  const lines = entries
    .map((entry) => {
      const parts = [
        entry.name,
        entry.duration ? `${entry.duration}分` : "",
        entry.time ? `時刻:${entry.time}` : "",
        entry.notes ? `補足:${entry.notes}` : "",
      ].filter(Boolean);
      return parts.join(" / ");
    })
    .filter(Boolean);

  return lines.join("；");
}

function composeMealsSummary(meals: {
  breakfastEaten: string;
  breakfastTime: string;
  breakfastContent: string;
  lunchEaten: string;
  lunchTime: string;
  lunchContent: string;
  dinnerEaten: string;
  dinnerTime: string;
  dinnerContent: string;
}): string {
  const lines: string[] = [];

  const pushMeal = (
    label: string,
    eaten: string,
    time: string,
    content: string,
  ) => {
    if (eaten === "none" || time === "none") {
      lines.push(`${label}: 食べていない`);
      return;
    }
    if (eaten === "yes") {
      const detail = [time && time !== "none" ? time : "", content]
        .filter(Boolean)
        .join(" / ");
      lines.push(detail ? `${label}: 食べた / ${detail}` : `${label}: 食べた`);
      return;
    }
    if (time || content) {
      lines.push(`${label}: ${[time, content].filter(Boolean).join(" / ")}`);
    }
  };

  pushMeal(
    "朝食",
    meals.breakfastEaten,
    meals.breakfastTime,
    meals.breakfastContent,
  );
  pushMeal("昼食", meals.lunchEaten, meals.lunchTime, meals.lunchContent);
  pushMeal("夕食", meals.dinnerEaten, meals.dinnerTime, meals.dinnerContent);

  return lines.join("；");
}

function composeAlcoholSummary(alcohol: {
  drank: string;
  type: string;
  amount: string;
  abv: string;
  endTime: string;
  notes: string;
}): string {
  if (alcohol.drank === "none") return "なし";
  if (alcohol.drank !== "yes") return "";

  const parts: string[] = ["あり"];
  if (alcohol.type) parts.push(`種類:${alcohol.type}`);
  if (alcohol.amount) parts.push(`量:${alcohol.amount}`);
  if (alcohol.abv) parts.push(`度数:${alcohol.abv}`);
  if (alcohol.endTime) parts.push(`終了時刻:${alcohol.endTime}`);
  if (alcohol.notes) parts.push(`補足:${alcohol.notes}`);
  return parts.join(" / ");
}

function applyClientProfile(client: StoredClient): ClientProfileBasics {
  return {
    age: typeof client.age === "number" ? String(client.age) : "",
    gender: client.gender ?? "",
    heightCm: typeof client.heightCm === "number" ? String(client.heightCm) : "",
    weightKg: typeof client.weightKg === "number" ? String(client.weightKg) : "",
    medications: client.medications ?? "",
    drinkingHabit: client.drinkingHabit ?? "",
    exerciseHabit: client.exerciseHabit ?? "",
    snoringNasal: client.snoringNasal ?? "",
    medicalHistory: client.medicalHistory ?? "",
  };
}

/**
 * submitGeneration の有効判定。
 * - 一致: この提出が現在の提出
 * - local > current: HMR / remount で ref がリセットされた → 再クレームして続行
 * - local < current: より新しい提出／戻る操作で無効化 → 破棄
 */
function adoptSubmitGeneration(
  submitGeneration: number,
  submitGenerationRef: { current: number },
  options?: { silent?: boolean },
): boolean {
  if (submitGeneration === submitGenerationRef.current) return true;
  if (submitGeneration > submitGenerationRef.current) {
    if (!options?.silent) {
      console.info(
        "[ocr-trace] ⑥ reclaim submitGeneration after counter reset",
        {
          submitGeneration,
          was: submitGenerationRef.current,
          at: new Date().toISOString(),
        },
      );
    }
    submitGenerationRef.current = submitGeneration;
    return true;
  }
  if (!options?.silent) {
    console.warn("[ocr-trace] ⑥ skip: submitGeneration mismatch（結果を破棄）", {
      submitGeneration,
      current: submitGenerationRef.current,
    });
  }
  return false;
}

export default function NewAnalysisPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5]">
          <p className="text-sm text-slate-500">読み込み中...</p>
        </main>
      }
    >
      <NewAnalysisPageInner />
    </Suspense>
  );
}

function NewAnalysisPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClientId = searchParams.get("clientId")?.trim() || "";

  const [inputMethod, setInputMethod] = useState<InputMethod>("soxai");
  const [flowStep, setFlowStep] = useState<"method" | "input">("method");
  const [slotFiles, setSlotFiles] = useState<
    Partial<Record<SoxaiExtractSection, File[]>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<BackgroundOcrStatus>("idle");
  const [ocrImageCache, setOcrImageCache] = useState<{
    fingerprint: string;
    images: string[];
  } | null>(null);
  const ocrRequestIdRef = useRef(0);
  const submitGenerationRef = useRef(0);
  /** isSubmitting は非同期なので、同ティック二重 submit を同期的に防ぐ */
  const submitInFlightRef = useRef(false);
  const ocrAbortRef = useRef<AbortController | null>(null);
  const [ocrOverlayOpen, setOcrOverlayOpen] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<OcrProgressSnapshot | null>(
    null,
  );
  const [showOcrCancelConfirm, setShowOcrCancelConfirm] = useState(false);
  const [ocrCancelledMenu, setOcrCancelledMenu] = useState(false);
  const [pendingDraftPayload, setPendingDraftPayload] = useState<{
    lifestyle: Parameters<typeof setExtractionDraft>[0]["lifestyle"];
    images: string[];
    sections: SoxaiExtractSection[];
    extraction: {
      metrics: AnalysisMetrics;
      conflicts: MetricConflict[];
      graphs: SoxaiGraphBundle;
      confidence: MetricConfidenceMap;
      imageStatuses: SoxaiOcrImageStatusRecord[];
      cancelled: boolean;
    };
    fixedProfile: Parameters<typeof setExtractionDraft>[0]["fixedProfile"];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alcoholDrank, setAlcoholDrank] = useState("");
  const [yogaDone, setYogaDone] = useState("");
  const [pilatesDone, setPilatesDone] = useState("");
  const [otherExerciseDone, setOtherExerciseDone] = useState("");
  const [yogaSessions, setYogaSessions] = useState<PracticeSessionEntry[]>([
    createPracticeSessionEntry(),
  ]);
  const [pilatesSessions, setPilatesSessions] = useState<PracticeSessionEntry[]>([
    createPracticeSessionEntry(),
  ]);
  const [otherExercises, setOtherExercises] = useState<OtherExerciseEntry[]>([
    createOtherExerciseEntry(),
  ]);
  const [caffeineDone, setCaffeineDone] = useState("");
  const [caffeineEntries, setCaffeineEntries] = useState<CaffeineEntry[]>([
    createCaffeineEntry(),
  ]);
  const [bathing, setBathing] = useState("");
  const [stressLevel, setStressLevel] = useState("");
  const [breakfastEaten, setBreakfastEaten] = useState("");
  const [lunchEaten, setLunchEaten] = useState("");
  const [dinnerEaten, setDinnerEaten] = useState("");
  const [weekdays, setWeekdays] = useState<string[]>([]);
  const [touchedUpload, setTouchedUpload] = useState(false);
  const [clientId, setClientId] = useState(queryClientId);
  const [clientName, setClientName] = useState("");
  const [clientLocked, setClientLocked] = useState(Boolean(queryClientId));
  const [clientOptions, setClientOptions] = useState<ClientListItem[]>([]);
  const [clientsReady, setClientsReady] = useState(false);
  const [profile, setProfile] = useState<ClientProfileBasics>(
    emptyClientProfileBasics(),
  );

  const updateProfile = (key: keyof ClientProfileBasics, value: string) => {
    setProfile((current) => ({ ...current, [key]: value }));
  };

  const files = useMemo(
    () =>
      SOXAI_UPLOAD_SLOTS.flatMap((slot) => {
        const list = slotFiles[slot.id];
        return Array.isArray(list) ? list : [];
      }),
    [slotFiles],
  );
  const sections = useMemo(
    () =>
      SOXAI_UPLOAD_SLOTS.flatMap((slot) => {
        const list = slotFiles[slot.id];
        if (!Array.isArray(list) || list.length === 0) return [];
        return list.map(() => slot.id);
      }),
    [slotFiles],
  );
  const previewUrls = useMemo(() => {
    const next: Partial<Record<SoxaiExtractSection, string[]>> = {};
    for (const slot of SOXAI_UPLOAD_SLOTS) {
      const list = slotFiles[slot.id];
      if (!Array.isArray(list) || list.length === 0) continue;
      next[slot.id] = list.map((file) => URL.createObjectURL(file));
    }
    return next;
  }, [slotFiles]);

  useEffect(() => {
    return () => {
      for (const urls of Object.values(previewUrls)) {
        urls?.forEach((url) => URL.revokeObjectURL(url));
      }
    };
  }, [previewUrls]);

  /** 遷移・bfcache 復帰・unmount 時に OCR overlay を必ず落とす（Safari 幽霊レイヤー対策） */
  useEffect(() => {
    const purgeOverlayDom = () => {
      document
        .querySelectorAll("[data-soxai-ocr-overlay]")
        .forEach((node) => node.remove());
    };
    const forceCloseOverlay = () => {
      setOcrOverlayOpen(false);
      setShowOcrCancelConfirm(false);
      purgeOverlayDom();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) forceCloseOverlay();
    };
    const onPageHide = () => forceCloseOverlay();
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("pagehide", onPageHide);
      forceCloseOverlay();
    };
  }, []);

  /** 画像アップロード直後から OCR をバックグラウンド開始（入力中に解析を進める） */
  useEffect(() => {
    if (inputMethod !== "soxai" || files.length === 0) {
      ocrRequestIdRef.current += 1;
      clearBackgroundSoxaiExtraction();
      setOcrImageCache(null);
      setOcrStatus("idle");
      return;
    }

    const requestId = ++ocrRequestIdRef.current;
    const filesFingerprint = files.map(fileFingerprint).join("||");
    let cancelled = false;

    (async () => {
      try {
        // 新規アップロード開始: 古い draft / pending / OCR キャッシュを破棄（ページ更新では files が空のため呼ばれない）
        beginNewSoxaiAnalysisSession();
        resetProgressiveAnalysisJobs();

        setOcrStatus("running");
        const images = await Promise.all(files.map(fileToDataUrl));
        if (cancelled || requestId !== ocrRequestIdRef.current) return;

        setOcrImageCache({ fingerprint: filesFingerprint, images });
        await startBackgroundSoxaiExtraction(images, sections);
        if (cancelled || requestId !== ocrRequestIdRef.current) return;
        setOcrStatus("ready");
      } catch (ocrError) {
        if (cancelled || requestId !== ocrRequestIdRef.current) return;
        console.error("[analysis/new] background OCR failed:", ocrError);
        console.error("[ocr-trace] ⑧ エラー発生箇所", {
          where: "analysis/new.backgroundOcr",
          message:
            ocrError instanceof Error ? ocrError.message : String(ocrError),
          stack: ocrError instanceof Error ? ocrError.stack : undefined,
        });
        setOcrStatus("error");
        // 提出時に再試行できるよう、ここではフォーム全体のエラーにはしない
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [files, inputMethod, sections]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (queryClientId) {
          const client = await getClientById(queryClientId);
          if (cancelled) return;
          if (client) {
            setClientId(client.id);
            setClientName(client.name);
            setClientLocked(true);
            setProfile(applyClientProfile(client));
          } else {
            setClientId("");
            setClientLocked(false);
            setError(
              "指定されたクライアントが見つかりません。一覧から選択してください。",
            );
          }
        }

        const list = await getClientListItems();
        if (!cancelled) {
          setClientOptions(list);
        }
      } catch (loadError) {
        console.error("[analysis/new] failed to load clients:", loadError);
      } finally {
        if (!cancelled) setClientsReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [queryClientId]);

  const setSlotFilesForSection = (
    slotId: SoxaiExtractSection,
    newFiles: File[],
  ) => {
    if (
      newFiles.some(
        (file) =>
          !(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type),
      )
    ) {
      setError("JPG / JPEG / PNG / WEBP 形式の画像のみアップロードできます。");
      return;
    }
    setError(null);
    setTouchedUpload(true);
    setSlotFiles((current) => {
      const maxCount = SLOT_MAX_FILES[slotId] ?? 1;
      const existing = current[slotId] ?? [];
      const merged =
        maxCount === 1 ? newFiles.slice(-1) : [...existing, ...newFiles].slice(0, maxCount);
      const next = { ...current };
      if (merged.length > 0) {
        next[slotId] = merged;
      } else {
        delete next[slotId];
      }
      return next;
    });
  };

  const removeSlotFile = (slotId: SoxaiExtractSection, fileIndex: number) => {
    setSlotFiles((current) => {
      const existing = current[slotId] ?? [];
      if (fileIndex < 0 || fileIndex >= existing.length) return current;
      const updated = existing.filter((_, index) => index !== fileIndex);
      const next = { ...current };
      if (updated.length > 0) {
        next[slotId] = updated;
      } else {
        delete next[slotId];
      }
      return next;
    });
  };

  const clearAllFiles = () => {
    beginNewSoxaiAnalysisSession();
    resetProgressiveAnalysisJobs();
    setOcrImageCache(null);
    setOcrStatus("idle");
    setSlotFiles({});
    setError(null);
  };

  const handleClientSelect = async (value: string) => {
    if (!value) {
      setClientId("");
      setClientName("");
      return;
    }
    const selected = clientOptions.find((item) => item.id === value);
    if (!selected) return;
    setClientId(selected.id);
    setClientName(selected.name);
    try {
      const full = await getClientById(selected.id);
      if (full) setProfile(applyClientProfile(full));
    } catch (loadError) {
      console.error("[analysis/new] failed to load client profile:", loadError);
    }
  };

  const updateOtherExercise = (
    id: string,
    field: keyof Omit<OtherExerciseEntry, "id">,
    value: string,
  ) => {
    setOtherExercises((current) =>
      current.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry,
      ),
    );
  };

  const addOtherExercise = () => {
    setOtherExercises((current) => [...current, createOtherExerciseEntry()]);
  };

  const removeOtherExercise = (id: string) => {
    setOtherExercises((current) => {
      if (current.length <= 1) {
        return [createOtherExerciseEntry()];
      }
      return current.filter((entry) => entry.id !== id);
    });
  };

  const updateYogaSession = (
    id: string,
    field: keyof Omit<PracticeSessionEntry, "id">,
    value: string,
  ) => {
    setYogaSessions((current) =>
      current.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry,
      ),
    );
  };

  const addYogaSession = () => {
    setYogaSessions((current) => [...current, createPracticeSessionEntry()]);
  };

  const removeYogaSession = (id: string) => {
    setYogaSessions((current) => {
      if (current.length <= 1) {
        return [createPracticeSessionEntry()];
      }
      return current.filter((entry) => entry.id !== id);
    });
  };

  const updatePilatesSession = (
    id: string,
    field: keyof Omit<PracticeSessionEntry, "id">,
    value: string,
  ) => {
    setPilatesSessions((current) =>
      current.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry,
      ),
    );
  };

  const addPilatesSession = () => {
    setPilatesSessions((current) => [...current, createPracticeSessionEntry()]);
  };

  const removePilatesSession = (id: string) => {
    setPilatesSessions((current) => {
      if (current.length <= 1) {
        return [createPracticeSessionEntry()];
      }
      return current.filter((entry) => entry.id !== id);
    });
  };

  const updateCaffeineEntry = (
    id: string,
    field: keyof Omit<CaffeineEntry, "id">,
    value: string,
  ) => {
    setCaffeineEntries((current) =>
      current.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry,
      ),
    );
  };

  const addCaffeineEntry = () => {
    setCaffeineEntries((current) => [...current, createCaffeineEntry()]);
  };

  const removeCaffeineEntry = (id: string) => {
    setCaffeineEntries((current) => {
      if (current.length <= 1) {
        return [createCaffeineEntry()];
      }
      return current.filter((entry) => entry.id !== id);
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // React state の isSubmitting 反映前の二重クリックで generation が進み、
    // 先に完了した提出が mismatch で破棄されるのを防ぐ
    if (submitInFlightRef.current || isSubmitting) return;

    setError(null);
    setTouchedUpload(true);
    if (inputMethod === "oura" || inputMethod === "garmin" || inputMethod === "apple") {
      setError("現在開発中です。今後のアップデートで対応予定です。");
      return;
    }

    if (inputMethod === "soxai" && files.length === 0) {
      setError("SOXAI画像を1枚以上アップロードしてください。");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    if (inputMethod === "soxai" && files.length > MAX_FILES) {
      setError(`画像は最大${MAX_FILES}枚までです。`);
      return;
    }

    const measurementDate = String(formData.get("measurementDate") ?? "");
    const resolvedClientName = clientName.trim();

    if (!resolvedClientName || !measurementDate) {
      setError(
        "対象者名と測定日は必須です。クライアントを選択または入力してください。",
      );
      return;
    }

    if (!profile.age.trim() || !profile.gender.trim()) {
      setError("年齢と性別は必須です。クライアント基本情報を入力してください。");
      return;
    }

    if (parseOptionalAge(profile.age) == null) {
      setError("年齢は 0〜130 の数値で入力してください。");
      return;
    }

    submitInFlightRef.current = true;
    setIsSubmitting(true);
    const submitGeneration = ++submitGenerationRef.current;
    /** 中止メニュー表示中のみ Overlay を残す（Safari で finally 未解除を防ぐ） */
    let retainOcrOverlay = false;

    try {
      let images: string[] = [];

      if (inputMethod === "soxai") {
        const filesFingerprint = files.map(fileFingerprint).join("||");
        if (
          ocrImageCache &&
          ocrImageCache.fingerprint === filesFingerprint &&
          ocrImageCache.images.length === files.length
        ) {
          images = ocrImageCache.images;
        } else {
          images = await Promise.all(files.map(fileToDataUrl));
          setOcrImageCache({ fingerprint: filesFingerprint, images });
        }
      }

      const yogaDoneValue = String(formData.get("yogaDone") ?? "");
      const primaryYoga = yogaSessions[0];
      const yogaDuration = primaryYoga?.duration ?? "";
      const yogaTime = primaryYoga?.time ?? "";
      const yogaNotes =
        yogaDoneValue === "yes"
          ? yogaSessions
              .map((entry, index) => {
                const parts = [
                  yogaSessions.length > 1 ? `${index + 1}回目` : "",
                  entry.duration ? `${entry.duration}分` : "",
                  entry.time ? `開始:${entry.time}` : "",
                  entry.notes ? `補足:${entry.notes}` : "",
                ].filter(Boolean);
                return parts.join(" / ");
              })
              .filter(Boolean)
              .join("；")
          : (primaryYoga?.notes ?? "");

      const pilatesDoneValue = String(formData.get("pilatesDone") ?? "");
      const primaryPilates = pilatesSessions[0];
      const pilatesDuration = primaryPilates?.duration ?? "";
      const pilatesTime = primaryPilates?.time ?? "";
      const pilatesNotes =
        pilatesDoneValue === "yes"
          ? pilatesSessions
              .map((entry, index) => {
                const parts = [
                  pilatesSessions.length > 1 ? `${index + 1}回目` : "",
                  entry.duration ? `${entry.duration}分` : "",
                  entry.time ? `開始:${entry.time}` : "",
                  entry.notes ? `補足:${entry.notes}` : "",
                ].filter(Boolean);
                return parts.join(" / ");
              })
              .filter(Boolean)
              .join("；")
          : (primaryPilates?.notes ?? "");

      const otherExerciseDoneValue = String(
        formData.get("otherExerciseDone") ?? "",
      );
      const primaryOther = otherExercises[0];
      const otherExerciseName = primaryOther?.name ?? "";
      const otherExerciseDuration = primaryOther?.duration ?? "";
      const otherExerciseTime = primaryOther?.time ?? "";
      const otherExerciseNotes =
        otherExerciseDoneValue === "yes"
          ? [
              ...otherExercises.map((entry) => {
                const parts = [
                  entry.name,
                  entry.duration ? `${entry.duration}分` : "",
                  entry.time ? `時刻:${entry.time}` : "",
                  entry.notes ? `補足:${entry.notes}` : "",
                ].filter(Boolean);
                return parts.join(" / ");
              }),
            ]
              .filter(Boolean)
              .join("；")
          : (primaryOther?.notes ?? "");

      const caffeineDoneValue = String(formData.get("caffeineDone") ?? "");
      const primaryCaffeine = caffeineEntries[0];
      const caffeineType =
        caffeineDoneValue === "yes"
          ? caffeineEntries
              .map((entry) => caffeineTypeLabel(entry))
              .filter(Boolean)
              .join("、")
          : "";
      const caffeineAmount =
        caffeineDoneValue === "yes"
          ? caffeineEntries
              .map((entry) => entry.amount)
              .filter(Boolean)
              .join("、")
          : "";
      const caffeineTime =
        caffeineDoneValue === "yes"
          ? caffeineEntries
              .map((entry) => entry.time)
              .filter(Boolean)
              .join("、")
          : "";
      const caffeineNotes =
        caffeineDoneValue === "yes" && caffeineEntries.length > 1
          ? composeCaffeineSessionsSummary("yes", caffeineEntries)
          : primaryCaffeine?.type === "other"
            ? primaryCaffeine.typeOther
            : "";

      const bathingMethod = String(formData.get("bathing") ?? "");
      const bathingTime =
        bathingMethod === "bath" || bathingMethod === "shower"
          ? String(formData.get("bathingTime") ?? "")
          : "";
      const bathingDuration =
        bathingMethod === "bath"
          ? String(formData.get("bathingDuration") ?? "")
          : "";
      const bathingTemperature =
        bathingMethod === "bath"
          ? String(formData.get("bathingTemperature") ?? "")
          : "";
      const bathingSummary = composeBathingSummary({
        method: bathingMethod,
        time: bathingTime,
        duration: bathingDuration,
        temperature: bathingTemperature,
      });

      const breakfastTimeRaw = String(formData.get("breakfastTime") ?? "");
      const breakfastEatenValue =
        formData.get("breakfastEaten") === "yes" &&
        breakfastTimeRaw !== "none"
          ? "yes"
          : "none";
      const breakfastTime =
        breakfastEatenValue === "yes" && breakfastTimeRaw !== "none"
          ? breakfastTimeRaw
          : "";
      const breakfastContent =
        breakfastEatenValue === "yes"
          ? String(formData.get("breakfastContent") ?? "")
          : "";
      const lunchTimeRaw = String(formData.get("lunchTime") ?? "");
      const lunchEatenValue =
        formData.get("lunchEaten") === "yes" && lunchTimeRaw !== "none"
          ? "yes"
          : "none";
      const lunchTime =
        lunchEatenValue === "yes" && lunchTimeRaw !== "none"
          ? lunchTimeRaw
          : "";
      const lunchContent =
        lunchEatenValue === "yes"
          ? String(formData.get("lunchContent") ?? "")
          : "";
      const dinnerTimeRaw = String(formData.get("dinnerTime") ?? "");
      const dinnerEatenValue =
        formData.get("dinnerEaten") === "yes" && dinnerTimeRaw !== "none"
          ? "yes"
          : "none";
      const dinnerTime =
        dinnerEatenValue === "yes" && dinnerTimeRaw !== "none"
          ? dinnerTimeRaw
          : "";
      const dinnerContent =
        dinnerEatenValue === "yes"
          ? String(formData.get("dinnerContent") ?? "")
          : "";

      const alcoholDrankValue = String(formData.get("alcoholDrank") ?? "");
      const alcoholType =
        alcoholDrankValue === "yes"
          ? String(formData.get("alcoholType") ?? "")
          : "";
      const alcoholAmount =
        alcoholDrankValue === "yes"
          ? String(formData.get("alcoholAmount") ?? "")
          : "";
      const alcoholAbv =
        alcoholDrankValue === "yes"
          ? String(formData.get("alcoholAbv") ?? "")
          : "";
      const alcoholEndTime =
        alcoholDrankValue === "yes"
          ? String(formData.get("alcoholEndTime") ?? "")
          : "";
      const alcoholNotes =
        alcoholDrankValue === "yes"
          ? String(formData.get("alcoholNotes") ?? "")
          : "";
      const weekdays = formData.getAll("weekdays").map(String).filter(Boolean);
      const wakeCount = String(formData.get("wakeCount") ?? "");
      const napDuration = String(formData.get("napDuration") ?? "");
      const smartphoneDuration = String(formData.get("smartphoneDuration") ?? "");
      const sleepDurationLifestyle = String(
        formData.get("sleepDurationLifestyle") ?? "",
      );

      const yogaSummary = composePracticeSessionsSummary(
        yogaDoneValue,
        yogaSessions,
      );
      const pilatesSummary = composePracticeSessionsSummary(
        pilatesDoneValue,
        pilatesSessions,
      );
      const caffeineSummary = composeCaffeineSessionsSummary(
        caffeineDoneValue,
        caffeineEntries,
      );

      const lifestyle = {
        clientId: clientId || undefined,
        clientName: resolvedClientName,
        measurementDate,
        age: profile.age.trim(),
        gender: profile.gender.trim(),
        heightCm: profile.heightCm.trim(),
        weightKg: profile.weightKg.trim(),
        medications: profile.medications.trim(),
        drinkingHabit: profile.drinkingHabit.trim(),
        exerciseHabit: profile.exerciseHabit.trim(),
        snoringNasal: profile.snoringNasal.trim(),
        medicalHistory: profile.medicalHistory.trim(),
        bedtime: String(formData.get("bedtime") ?? ""),
        wakeTime: String(formData.get("wakeTime") ?? ""),
        exercise: String(formData.get("exercise") ?? ""),
        yoga: yogaSummary,
        yogaDone: yogaDoneValue,
        yogaDuration,
        yogaTime,
        yogaNotes,
        pilates: pilatesSummary,
        pilatesDone: pilatesDoneValue,
        pilatesDuration,
        pilatesTime,
        pilatesNotes,
        otherExerciseDone: otherExerciseDoneValue,
        otherExerciseName,
        otherExerciseDuration,
        otherExerciseTime,
        otherExerciseNotes,
        bathing: bathingSummary,
        alcohol: composeAlcoholSummary({
          drank: alcoholDrankValue,
          type: alcoholType,
          amount: alcoholAmount,
          abv: alcoholAbv,
          endTime: alcoholEndTime,
          notes: alcoholNotes,
        }),
        alcoholDrank: alcoholDrankValue,
        alcoholType,
        alcoholAmount,
        alcoholEndTime,
        alcoholNotes,
        caffeine: caffeineSummary,
        caffeineDone: caffeineDoneValue,
        caffeineType,
        caffeineAmount,
        caffeineTime,
        caffeineNotes,
        stress: String(formData.get("stress") ?? ""),
        weekdays: weekdays.join("、"),
        wakeCount,
        napDuration,
        smartphoneDuration,
        sleepDurationLifestyle,
        meals: composeMealsSummary({
          breakfastEaten: breakfastEatenValue,
          breakfastTime,
          breakfastContent,
          lunchEaten: lunchEatenValue,
          lunchTime,
          lunchContent,
          dinnerEaten: dinnerEatenValue,
          dinnerTime,
          dinnerContent,
        }),
        breakfastEaten: breakfastEatenValue,
        breakfastTime,
        breakfastContent,
        lunchEaten: lunchEatenValue,
        lunchTime,
        lunchContent,
        dinnerEaten: dinnerEatenValue,
        dinnerTime,
        dinnerContent,
        work: String(formData.get("work") ?? ""),
        condition: String(formData.get("condition") ?? ""),
        notes: String(formData.get("notes") ?? ""),
      };

      let fixedProfile: Parameters<typeof setExtractionDraft>[0]["fixedProfile"];
      if (clientId) {
        try {
          const loaded = await getClientProfile(clientId);
          if (loaded) {
            fixedProfile = normalizeClientProfileSections(loaded);
          }
        } catch (profileError) {
          console.error(
            "[analysis/new] failed to load client_profiles:",
            profileError,
          );
          fixedProfile = undefined;
        }
      }

      if (inputMethod !== "soxai") {
        beginNewSoxaiAnalysisSession({ clearOcrCaches: false });
        resetProgressiveAnalysisJobs();
        setExtractionDraft({
          lifestyle,
          images: [],
          inputSource: "manual",
          extractedMetrics: emptyMetrics(),
          imageKeys: [],
          conflicts: [],
          ocrConfidence: {},
          graphs: emptyGraphBundle(),
          fixedProfile,
          swsMetrics: toSwsMetrics(emptyMetrics(), "manual"),
        });
        router.push("/analysis/confirm");
        return;
      }

      console.log("[overlay]", {
        source: "new",
        action: "open",
        ocrOverlayOpen,
        isSubmitting,
        ocrStatus,
        pathname:
          typeof window !== "undefined" ? window.location.pathname : undefined,
      });
      setOcrOverlayOpen(true);
      setOcrCancelledMenu(false);
      setShowOcrCancelConfirm(false);
      setOcrProgress(null);
      const abortController = new AbortController();
      ocrAbortRef.current = abortController;

      // 提出直前: 古い draft/pending/結果だけ破棄。同一画像の background OCR とキャッシュは維持
      beginNewSoxaiAnalysisSession({
        keepBackgroundOcr: true,
        clearOcrCaches: false,
      });
      resetProgressiveAnalysisJobs();

      const extraction = await resolveSoxaiExtraction(images, sections, {
        signal: abortController.signal,
        onProgress: (snapshot) => {
          if (
            !adoptSubmitGeneration(submitGeneration, submitGenerationRef, {
              silent: true,
            })
          ) {
            return;
          }
          setOcrProgress(snapshot);
        },
      });

      // ページを離れた／新しい提出が始まった場合は遷移しない
      // （HMR・remount で counter がリセットされた場合は reclaim して続行）
      if (!adoptSubmitGeneration(submitGeneration, submitGenerationRef)) {
        console.warn("[ocr-trace] ⑥ skip detail", {
          submitGeneration,
          current: submitGenerationRef.current,
          metricCount: collectedMetricKeys(extraction.metrics).length,
          cancelled: extraction.cancelled,
        });
        return;
      }

      if (extraction.cancelled) {
        console.warn("[ocr-trace] ⑥ cancelled path（確認へ自動遷移しない）", {
          metricCount: collectedMetricKeys(extraction.metrics).length,
          metrics: extraction.metrics,
          imageStatuses: extraction.imageStatuses,
        });
        setPendingDraftPayload({
          lifestyle,
          images,
          sections,
          extraction: {
            metrics: extraction.metrics,
            conflicts: extraction.conflicts,
            graphs: extraction.graphs,
            confidence: extraction.confidence,
            imageStatuses: extraction.imageStatuses,
            cancelled: true,
          },
          fixedProfile,
        });
        retainOcrOverlay = true;
        setOcrCancelledMenu(true);
        setOcrStatus("cancelled");
        setIsSubmitting(false);
        return;
      }

      setOcrStatus("ready");
      const extractedMetrics = extraction.metrics;
      const imageKeys = collectedMetricKeys(extractedMetrics);
      const formKeys = SOXAI_METRIC_FIELDS.map((field) => field.key);
      console.log("[ocr-trace] ⑥ フォームへsetValue開始（metrics生JSON）", {
        metricCount: imageKeys.length,
        imageCount: images.length,
        imageKeys,
        missingKeys: formKeys.filter((key) => !imageKeys.includes(key)),
        metrics: extractedMetrics,
        at: new Date().toISOString(),
      });
      for (const field of SOXAI_METRIC_FIELDS) {
        const key = field.key;
        const raw =
          key === "sleepScore"
            ? extractedMetrics.sleepScore
            : extractedMetrics[key];
        const present = imageKeys.includes(key);
        console.log("[ocr-trace] ⑥ setValue", {
          key,
          formKey: field.key,
          keysMatch: key === field.key,
          present,
          value: raw,
        });
      }
      const statuses =
        extraction.imageStatuses.length === images.length
          ? extraction.imageStatuses
          : images.map((_, index) => ({
              index,
              section: (sections[index] ?? "") as SoxaiExtractSection | "",
              label: String(index + 1),
              status: "failed" as const,
              error: "解析未完了",
            }));

      // 全画像の解析完了を必須（途中キャッシュ・途中結果では確認へ進まない）
      const incomplete = statuses.some(
        (item) =>
          item.status !== "success" &&
          item.status !== "failed" &&
          item.status !== "timeout",
      );
      if (incomplete || statuses.length !== images.length) {
        console.error("[ocr-trace] ⑥ stop: incomplete imageStatuses", {
          statuses,
        });
        throw new AnalysisError(
          "全画像のOCRが完了していません。もう一度お試しください。",
          { errorType: "Empty Extraction" },
        );
      }

      // 失敗画像があっても確認画面へ進める（全失敗のみブロック）
      if (
        imageKeys.length === 0 &&
        statuses.every((item) => item.status !== "success")
      ) {
        console.error("[ocr-trace] ⑥ stop: empty extraction", { statuses });
        throw new AnalysisError(
          "画像から睡眠データを読み取れませんでした。SOXAIのスクリーンショットが鮮明か、対応形式（JPG / JPEG / PNG / WEBP）かを確認してください。",
          { errorType: "Empty Extraction" },
        );
      }

      setExtractionDraft({
        lifestyle,
        images,
        inputSource: "soxai",
        extractedMetrics,
        imageKeys,
        conflicts: extraction.conflicts,
        ocrConfidence: extraction.confidence,
        graphs: extraction.graphs,
        ocrImageStatuses: statuses,
        ocrSections: sections,
        fixedProfile,
        swsMetrics: toSwsMetrics(extractedMetrics, "soxai"),
      });
      console.info("[ocr-trace] ⑦ フォーム反映完了 → /analysis/confirm へ遷移", {
        metricCount: imageKeys.length,
        successImages: statuses.filter((s) => s.status === "success").length,
        draftKeys: getExtractionDraft()?.imageKeys,
        at: new Date().toISOString(),
      });
      // Safari: setState 未コミットのまま router.push すると bfcache で Overlay が残る
      flushSync(() => {
        console.log("[overlay]", {
          source: "new",
          action: "close",
          ocrOverlayOpen,
          isSubmitting,
          ocrStatus,
          pathname:
            typeof window !== "undefined" ? window.location.pathname : undefined,
        });
        setOcrOverlayOpen(false);
        setIsSubmitting(false);
      });
      document
        .querySelectorAll("[data-soxai-ocr-overlay]")
        .forEach((node) => node.remove());
      router.push("/analysis/confirm");
    } catch (err) {
      if (!adoptSubmitGeneration(submitGeneration, submitGenerationRef)) return;
      console.error("SOXAI extract failed:", err);
      console.error("[ocr-trace] ⑧ エラー発生箇所", {
        where: "analysis/new.submitSoxai",
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      setError(formatExtractErrorMessage(err));
      flushSync(() => {
        console.log("[overlay]", {
          source: "new",
          action: "close",
          ocrOverlayOpen,
          isSubmitting,
          ocrStatus,
          pathname:
            typeof window !== "undefined" ? window.location.pathname : undefined,
        });
        setOcrOverlayOpen(false);
        setIsSubmitting(false);
      });
      document
        .querySelectorAll("[data-soxai-ocr-overlay]")
        .forEach((node) => node.remove());
    } finally {
      console.log("[overlay]", {
        source: "new",
        action: "close",
        ocrOverlayOpen,
        isSubmitting,
        ocrStatus,
        pathname:
          typeof window !== "undefined" ? window.location.pathname : undefined,
      });
      if (submitGeneration === submitGenerationRef.current) {
        submitInFlightRef.current = false;
        setIsSubmitting(false);
        if (!retainOcrOverlay) {
          console.log("[overlay]", {
            source: "new",
            action: "close",
            ocrOverlayOpen,
            isSubmitting,
            ocrStatus,
            pathname:
              typeof window !== "undefined"
                ? window.location.pathname
                : undefined,
          });
          setOcrOverlayOpen(false);
        }
      }
    }
  };

  const commitPartialDraftAndConfirm = () => {
    if (!pendingDraftPayload) return;
    const { lifestyle, images, sections, extraction, fixedProfile } =
      pendingDraftPayload;
    const extractedMetrics = extraction.metrics;
    setExtractionDraft({
      lifestyle,
      images,
      inputSource: "soxai",
      extractedMetrics,
      imageKeys: collectedMetricKeys(extractedMetrics),
      conflicts: extraction.conflicts,
      ocrConfidence: extraction.confidence,
      graphs: extraction.graphs,
      ocrImageStatuses: extraction.imageStatuses,
      ocrSections: sections,
      fixedProfile,
      swsMetrics: toSwsMetrics(extractedMetrics, "soxai"),
    });
    flushSync(() => {
      console.log("[overlay]", {
        source: "new",
        action: "close",
        ocrOverlayOpen,
        isSubmitting,
        ocrStatus,
        pathname:
          typeof window !== "undefined" ? window.location.pathname : undefined,
      });
      setOcrOverlayOpen(false);
      setOcrCancelledMenu(false);
      setPendingDraftPayload(null);
    });
    document
      .querySelectorAll("[data-soxai-ocr-overlay]")
      .forEach((node) => node.remove());
    router.push("/analysis/confirm");
  };

  const handleOcrConfirmCancel = () => {
    setShowOcrCancelConfirm(false);
    cancelBackgroundSoxaiExtraction();
    ocrAbortRef.current?.abort();
    // 完了待ちは resolve 側で cancelled 結果を返す
  };

  const handleResumeIncomplete = async () => {
    if (!pendingDraftPayload) return;
    if (submitInFlightRef.current || isSubmitting) return;
    const { lifestyle, images, sections, extraction, fixedProfile } =
      pendingDraftPayload;
    const incomplete = extraction.imageStatuses
      .filter((item) => item.status !== "success")
      .map((item) => item.index);
    if (incomplete.length === 0) {
      commitPartialDraftAndConfirm();
      return;
    }

    setOcrCancelledMenu(false);
    submitInFlightRef.current = true;
    setIsSubmitting(true);
    const submitGeneration = ++submitGenerationRef.current;
    let retainOcrOverlay = false;
    const abortController = new AbortController();
    ocrAbortRef.current = abortController;

    try {
      const result = await reanalyzeSoxaiImages({
        images,
        sections,
        indexes: incomplete,
        seed: {
          metrics: extraction.metrics,
          graphs: extraction.graphs,
          confidence: extraction.confidence,
          conflicts: extraction.conflicts,
          imageStatuses: extraction.imageStatuses,
        },
        signal: abortController.signal,
        onProgress: (snapshot) => {
          if (
            !adoptSubmitGeneration(submitGeneration, submitGenerationRef, {
              silent: true,
            })
          ) {
            return;
          }
          setOcrProgress(snapshot);
        },
      });

      if (!adoptSubmitGeneration(submitGeneration, submitGenerationRef)) return;

      if (result.cancelled) {
        setPendingDraftPayload({
          lifestyle,
          images,
          sections,
          extraction: {
            metrics: result.metrics,
            conflicts: result.conflicts,
            graphs: result.graphs,
            confidence: result.confidence,
            imageStatuses: result.imageStatuses,
            cancelled: true,
          },
          fixedProfile,
        });
        retainOcrOverlay = true;
        setOcrCancelledMenu(true);
        setIsSubmitting(false);
        return;
      }

      setExtractionDraft({
        lifestyle,
        images,
        inputSource: "soxai",
        extractedMetrics: result.metrics,
        imageKeys: collectedMetricKeys(result.metrics),
        conflicts: result.conflicts,
        ocrConfidence: result.confidence,
        graphs: result.graphs,
        ocrImageStatuses: result.imageStatuses,
        ocrSections: sections,
        fixedProfile,
        swsMetrics: toSwsMetrics(result.metrics, "soxai"),
      });
      flushSync(() => {
        console.log("[overlay]", {
          source: "new",
          action: "close",
          ocrOverlayOpen,
          isSubmitting,
          ocrStatus,
          pathname:
            typeof window !== "undefined" ? window.location.pathname : undefined,
        });
        setOcrOverlayOpen(false);
        setPendingDraftPayload(null);
        setIsSubmitting(false);
      });
      document
        .querySelectorAll("[data-soxai-ocr-overlay]")
        .forEach((node) => node.remove());
      router.push("/analysis/confirm");
    } catch (err) {
      if (!adoptSubmitGeneration(submitGeneration, submitGenerationRef)) return;
      setError(formatExtractErrorMessage(err));
      retainOcrOverlay = true;
      setOcrCancelledMenu(true);
      setIsSubmitting(false);
    } finally {
      console.log("[overlay]", {
        source: "new",
        action: "close",
        ocrOverlayOpen,
        isSubmitting,
        ocrStatus,
        pathname:
          typeof window !== "undefined" ? window.location.pathname : undefined,
      });
      if (submitGeneration === submitGenerationRef.current) {
        submitInFlightRef.current = false;
        setIsSubmitting(false);
        if (!retainOcrOverlay) {
          console.log("[overlay]", {
            source: "new",
            action: "close",
            ocrOverlayOpen,
            isSubmitting,
            ocrStatus,
            pathname:
              typeof window !== "undefined"
                ? window.location.pathname
                : undefined,
          });
          setOcrOverlayOpen(false);
        }
      }
    }
  };

  const handleBackToUploadFromOcr = () => {
    submitGenerationRef.current += 1;
    submitInFlightRef.current = false;
    cancelBackgroundSoxaiExtraction();
    ocrAbortRef.current?.abort();
    console.log("[overlay]", {
      source: "new",
      action: "close",
      ocrOverlayOpen,
      isSubmitting,
      ocrStatus,
      pathname:
        typeof window !== "undefined" ? window.location.pathname : undefined,
    });
    setOcrOverlayOpen(false);
    setOcrCancelledMenu(false);
    setShowOcrCancelConfirm(false);
    setPendingDraftPayload(null);
    setIsSubmitting(false);
    setOcrStatus("idle");
  };


  const uploadMissing =
    inputMethod === "soxai" && touchedUpload && files.length === 0;

  const methodPending =
    inputMethod === "oura" ||
    inputMethod === "garmin" ||
    inputMethod === "apple";

  const handleMethodContinue = () => {
    setError(null);
    if (methodPending) {
      setError("現在開発中です。今後のアップデートで対応予定です。");
      return;
    }
    setFlowStep("input");
  };

  console.log("[overlay]", {
    source: "new",
    action: "render",
    ocrOverlayOpen,
    isSubmitting,
    ocrStatus,
    pathname:
      typeof window !== "undefined" ? window.location.pathname : undefined,
  });

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f7f7f5]">
      {ocrOverlayOpen && (
        <SoxaiOcrProgressPanel
          progress={ocrProgress}
          showCancelConfirm={showOcrCancelConfirm}
          cancelledMenu={ocrCancelledMenu}
          onRequestCancel={() => setShowOcrCancelConfirm(true)}
          onContinue={() => setShowOcrCancelConfirm(false)}
          onConfirmCancel={handleOcrConfirmCancel}
          onReviewPartial={commitPartialDraftAndConfirm}
          onResumeIncomplete={() => {
            void handleResumeIncomplete();
          }}
          onBackToUpload={handleBackToUploadFromOcr}
        />
      )}
      <div className="border-b border-slate-200/80 bg-white/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:px-8 sm:py-4">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <Image
              src="/swij-logo-horizontal.png"
              alt="Sleep Wellness Institute Japan"
              width={160}
              height={40}
              className="h-auto w-[110px] sm:w-[140px]"
            />
          </Link>
          <div className="flex shrink-0 items-center gap-3 sm:gap-6">
            <Link
              href="/clients"
              className="inline-flex min-h-11 items-center text-[11px] font-semibold tracking-[0.18em] text-slate-500 transition active:text-[#071426] sm:min-h-10 sm:text-xs sm:hover:text-[#071426] sm:active:text-slate-500"
            >
              CLIENTS
            </Link>
            <p className="text-[10px] font-semibold tracking-[0.22em] text-[#8a6a2d] sm:text-xs sm:tracking-[0.28em]">
              AI ANALYSIS
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-8 sm:py-12 sm:pb-12 lg:py-14 lg:pb-14">
        <div className="mb-6 sm:mb-10">
          <AnalysisFlow current={1} />
        </div>

        {flowStep === "method" ? (
          <div className="mx-auto max-w-2xl">
            <header className="text-center">
              <p className="text-[11px] font-semibold tracking-[0.28em] text-[#8a6a2d]">
                INPUT METHOD
              </p>
              <h1 className="mt-3 break-words text-[1.65rem] font-semibold leading-tight tracking-[-0.05em] text-[#071426] sm:mt-5 sm:text-4xl sm:leading-normal">
                睡眠データの入力方法を選択してください
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-[14px] leading-6 text-slate-600 sm:mt-5 sm:text-base sm:leading-8">
                ご利用のデバイスに合わせて入力方法を選択してください。
              </p>
            </header>

            <section className="mt-8 overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.28)] sm:mt-10">
              <div className="space-y-3 px-4 py-5 sm:px-8 sm:py-8 lg:px-10">
                {(
                  [
                    ["soxai", "SOXAI Ring（対応済み）"],
                    ["oura", "Oura Ring（近日対応予定）"],
                    ["garmin", "Garmin（近日対応予定）"],
                    ["apple", "Apple Watch / ヘルスケア（近日対応予定）"],
                    ["manual", "手入力（対応済み）"],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3.5 transition ${
                      inputMethod === value
                        ? "border-[#315f68]/35 bg-[#f4f7f7]"
                        : "border-slate-200 bg-[#fafaf8]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="inputMethod"
                      value={value}
                      checked={inputMethod === value}
                      onChange={() => {
                        setInputMethod(value);
                        setError(null);
                      }}
                      className="h-4 w-4 border-slate-300 text-[#315f68] focus:ring-[#315f68]/40"
                    />
                    <span className="text-[14px] font-medium text-[#071426] sm:text-sm">
                      {label}
                    </span>
                  </label>
                ))}

                {methodPending && (
                  <p className="rounded-2xl border border-amber-200 bg-[#fffbeb] px-4 py-3 text-[13px] text-amber-900">
                    現在開発中です。今後のアップデートで対応予定です。
                  </p>
                )}

                {error && (
                  <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-medium text-rose-700">
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleMethodContinue}
                  disabled={methodPending}
                  className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#071426] px-8 py-3.5 text-base font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {inputMethod === "soxai"
                    ? "SOXAIアップロードへ進む"
                    : inputMethod === "manual"
                      ? "手入力へ進む"
                      : "選択してください"}
                </button>
              </div>
            </section>
          </div>
        ) : (
          <>
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold tracking-[0.28em] text-[#8a6a2d]">
            SLEEP WELLNESS ANALYSIS
          </p>

          <h1 className="mt-3 break-words text-[1.65rem] font-semibold leading-tight tracking-[-0.05em] text-[#071426] sm:mt-5 sm:text-4xl sm:leading-normal lg:text-5xl">
            {inputMethod === "manual" ? "手入力で睡眠分析" : "SOXAIデータで睡眠分析"}
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-[14px] leading-6 text-slate-600 sm:mt-5 sm:text-base sm:leading-8">
            {inputMethod === "manual"
              ? "画像なしで生活習慣と睡眠データを入力し、Sleep Wellness Report を作成します。"
              : "7種類のSOXAI画面を指定してアップロードし、睡眠データを確認して Sleep Wellness Report を作成します。"}
          </p>
          {inputMethod === "soxai" && (
            <Link
              href="/analysis/ocr-verify"
              className="mt-3 inline-flex text-sm font-semibold text-[#315f68] transition hover:text-[#8a6a2d]"
            >
              OCR検証モードを開く
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              setFlowStep("method");
              setError(null);
            }}
            className="mt-4 text-sm font-semibold text-[#315f68] transition hover:text-[#8a6a2d]"
          >
            ← 入力方法を選び直す
          </button>
        </header>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-6 sm:mt-12 sm:space-y-10"
          noValidate
        >
          <section className="overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.28)]">
            <div className="border-b border-slate-100 px-4 py-5 sm:px-8 sm:py-8 lg:px-10">
              <p className="text-[11px] font-semibold tracking-[0.26em] text-[#8a6a2d]">
                00 · CLIENT
              </p>
              <h2 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#071426] sm:text-2xl">
                {clientLocked ? "対象クライアント" : "クライアントを選択"}
              </h2>
              <p className="mt-2 max-w-xl text-[14px] leading-6 text-slate-500 sm:text-sm sm:leading-7">
                {clientLocked
                  ? "クライアント詳細から引き継いだ対象です。氏名の再入力は不要です。"
                  : "ダッシュボードなどから開始した場合は、先に対象クライアントを選んでください。"}
              </p>
            </div>
            <div className="px-4 py-5 sm:px-8 sm:py-8 lg:px-10">
              {clientLocked ? (
                <div className="rounded-2xl border border-[#315f68]/15 bg-[#f4f7f7] px-4 py-4 sm:px-5">
                  <p className="text-[11px] font-semibold tracking-[0.18em] text-[#315f68]">
                    SELECTED CLIENT
                  </p>
                  <p className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[#071426]">
                    {clientName || "読み込み中..."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-5">
                  <Field label="登録済みクライアント" optional={clientOptions.length === 0}>
                    <select
                      className={inputClass}
                      value={clientId}
                      onChange={(event) => {
                        void handleClientSelect(event.target.value);
                      }}
                      disabled={!clientsReady}
                    >
                      <option value="">
                        {clientsReady
                          ? clientOptions.length > 0
                            ? "選択してください"
                            : "登録クライアントなし"
                          : "読み込み中..."}
                      </option>
                      {clientOptions.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="対象者名" required>
                    <input
                      name="clientName"
                      type="text"
                      required
                      autoComplete="name"
                      className={inputClass}
                      value={clientName}
                      onChange={(event) => {
                        setClientName(event.target.value);
                        if (clientId) {
                          const matched = clientOptions.find(
                            (item) => item.id === clientId,
                          );
                          if (
                            matched &&
                            matched.name !== event.target.value.trim()
                          ) {
                            setClientId("");
                          }
                        }
                      }}
                      placeholder="例：山田 太郎"
                    />
                    <p className="mt-2 text-[12px] text-slate-400">
                      既存は左で選択。新規のみの場合は氏名を直接入力できます。
                    </p>
                  </Field>
                </div>
              )}
            </div>
          </section>

          {/* 00b CLIENT PROFILE */}
          <section className="overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.28)]">
            <div className="border-b border-slate-100 px-4 py-5 sm:px-8 sm:py-8 lg:px-10">
              <p className="text-[11px] font-semibold tracking-[0.26em] text-[#8a6a2d]">
                00 · PROFILE
              </p>
              <h2 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#071426] sm:text-2xl">
                クライアント基本情報
              </h2>
              <p className="mt-2 max-w-xl text-[14px] leading-6 text-slate-500 sm:text-sm sm:leading-7">
                年齢・性別は分析精度のため必須です。身長・体重は推奨、その他は任意です。
              </p>
            </div>
            <div className="space-y-7 px-4 py-5 sm:space-y-8 sm:px-8 sm:py-8 lg:px-10">
              <FormGroup
                title="必須"
                description="Medical Report の評価で年齢・性別を考慮します"
              >
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-5">
                  <Field label="年齢" required>
                    <input
                      name="clientAge"
                      type="number"
                      min={0}
                      max={130}
                      inputMode="numeric"
                      required
                      className={inputClass}
                      value={profile.age}
                      onChange={(event) => updateProfile("age", event.target.value)}
                      placeholder="例：42"
                    />
                  </Field>
                  <Field label="性別" required>
                    <select
                      name="clientGender"
                      required
                      className={inputClass}
                      value={profile.gender}
                      onChange={(event) =>
                        updateProfile("gender", event.target.value)
                      }
                    >
                      <option value="">選択してください</option>
                      {CLIENT_GENDER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </FormGroup>

              <FormGroup
                title="推奨"
                description="分かる範囲で入力すると、参考評価の精度が上がります"
              >
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-5">
                  <Field label="身長（cm）" optional>
                    <input
                      name="clientHeightCm"
                      type="number"
                      min={1}
                      max={299}
                      step="0.1"
                      inputMode="decimal"
                      className={inputClass}
                      value={profile.heightCm}
                      onChange={(event) =>
                        updateProfile("heightCm", event.target.value)
                      }
                      placeholder="例：165"
                    />
                  </Field>
                  <Field label="体重（kg）" optional>
                    <input
                      name="clientWeightKg"
                      type="number"
                      min={1}
                      max={499}
                      step="0.1"
                      inputMode="decimal"
                      className={inputClass}
                      value={profile.weightKg}
                      onChange={(event) =>
                        updateProfile("weightKg", event.target.value)
                      }
                      placeholder="例：58"
                    />
                  </Field>
                </div>
              </FormGroup>

              <FormGroup
                title="任意"
                description="日常の習慣・既往。当日の飲酒・運動とは別に扱います"
              >
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-5">
                  <Field label="服薬" optional>
                    <input
                      name="clientMedications"
                      type="text"
                      className={inputClass}
                      value={profile.medications}
                      onChange={(event) =>
                        updateProfile("medications", event.target.value)
                      }
                      placeholder="例：なし / 睡眠導入剤 など"
                    />
                  </Field>
                  <Field label="飲酒習慣" optional>
                    <input
                      name="clientDrinkingHabit"
                      type="text"
                      className={inputClass}
                      value={profile.drinkingHabit}
                      onChange={(event) =>
                        updateProfile("drinkingHabit", event.target.value)
                      }
                      placeholder="例：週2回程度 / ほぼ飲まない"
                    />
                  </Field>
                  <Field label="運動習慣" optional>
                    <input
                      name="clientExerciseHabit"
                      type="text"
                      className={inputClass}
                      value={profile.exerciseHabit}
                      onChange={(event) =>
                        updateProfile("exerciseHabit", event.target.value)
                      }
                      placeholder="例：週3回ウォーキング"
                    />
                  </Field>
                  <Field label="いびき・鼻づまり" optional>
                    <input
                      name="clientSnoringNasal"
                      type="text"
                      className={inputClass}
                      value={profile.snoringNasal}
                      onChange={(event) =>
                        updateProfile("snoringNasal", event.target.value)
                      }
                      placeholder="例：いびきあり / 鼻づまりしやすい"
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="既往歴" optional>
                      <textarea
                        name="clientMedicalHistory"
                        rows={3}
                        className={textareaClass}
                        value={profile.medicalHistory}
                        onChange={(event) =>
                          updateProfile("medicalHistory", event.target.value)
                        }
                        placeholder="例：特になし / 高血圧の指摘あり など（診断断定には使いません）"
                      />
                    </Field>
                  </div>
                </div>
              </FormGroup>
            </div>
          </section>

          {inputMethod === "soxai" && (
            <section className="overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.28)]">
              <div className="border-b border-slate-100 px-4 py-5 sm:px-8 sm:py-8 lg:px-10">
                <p className="text-[11px] font-semibold tracking-[0.26em] text-[#8a6a2d]">
                  01 · SOXAI DATA
                </p>
                <h2 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#071426] sm:text-2xl">
                  SOXAI専用アップロード
                </h2>
                <p className="mt-2 max-w-xl text-[14px] leading-6 text-slate-500 sm:text-sm sm:leading-7">
                  画面の種類ごとに画像を指定してアップロードしてください。すべて必須ではありませんが、1枚以上必要です。未指定の項目は確認画面で未取得と表示されます。
                </p>
              </div>

              <div className="space-y-4 px-4 py-5 sm:px-8 sm:py-8 lg:px-10">
                {SOXAI_UPLOAD_SLOTS.map((slot, index) => {
                  const filesInSlot = slotFiles[slot.id] ?? [];
                  const hasFile = filesInSlot.length > 0;
                  const maxFilesInSlot = SLOT_MAX_FILES[slot.id] ?? 1;
                  const canPickMore = filesInSlot.length < maxFilesInSlot;
                  const inputId = `soxai-slot-${slot.id}`;
                  return (
                    <div
                      key={slot.id}
                      className="rounded-2xl border border-slate-200 bg-[#fafaf8] p-4 transition sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[14px] font-semibold text-[#071426] sm:text-sm">
                            {slot.title}
                          </p>
                          <p className="mt-1 text-[13px] leading-6 text-slate-500 sm:text-xs sm:leading-5">
                            {slot.description}
                          </p>
                          <ul className="mt-2.5 space-y-1 text-[12px] leading-5 text-slate-500 sm:text-[11px]">
                            {slot.items.map((item) => (
                              <li key={item} className="flex items-start gap-2">
                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8a6a2d]" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        {hasFile ? (
                          <span className="inline-flex shrink-0 items-center rounded-full bg-[#315f68]/12 px-2.5 py-1 text-[11px] font-semibold text-[#315f68]">
                            {filesInSlot.length}/{maxFilesInSlot} 枚
                          </span>
                        ) : (
                          <span className="inline-flex shrink-0 items-center rounded-full bg-slate-200/60 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                            未選択
                          </span>
                        )}
                      </div>

                      <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
                        <input
                          id={inputId}
                          type="file"
                          multiple={maxFilesInSlot > 1}
                          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                          className="sr-only"
                          onChange={(event) => {
                            const selected = Array.from(event.target.files ?? []);
                            setSlotFilesForSection(slot.id, selected);
                            event.target.value = "";
                          }}
                        />
                        <label
                          htmlFor={inputId}
                          className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-[#315f68]/25 bg-white px-4 py-3 text-[14px] font-semibold text-[#071426] transition hover:border-[#315f68]/45 hover:bg-[#f4f7f7] sm:text-sm"
                        >
                          {!hasFile
                            ? "画像を選択"
                            : canPickMore
                              ? "画像を追加"
                              : "画像を差し替えるには削除してください"}
                        </label>
                        {hasFile && (
                          <button
                            type="button"
                            onClick={() => setSlotFilesForSection(slot.id, [])}
                            className="inline-flex min-h-11 items-center justify-center rounded-xl px-3 text-[13px] font-semibold text-slate-500 transition hover:text-[#071426] sm:text-sm"
                          >
                            削除
                          </button>
                        )}
                      </div>

                      {hasFile && (
                        <div className="mt-3 space-y-3">
                          {filesInSlot.map((slotFile, fileIndex) => {
                            const preview = previewUrls[slot.id]?.[fileIndex];
                            return (
                              <div key={`${slotFile.name}-${slotFile.lastModified}-${fileIndex}`}>
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-[13px] text-slate-600 sm:text-sm">
                                    {slotFile.name}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => removeSlotFile(slot.id, fileIndex)}
                                    className="shrink-0 text-[12px] font-semibold text-slate-400 transition hover:text-[#071426]"
                                  >
                                    削除
                                  </button>
                                </div>
                                {preview && (
                                  <div className="relative mt-2 aspect-[9/16] max-w-[220px] overflow-hidden rounded-xl border border-slate-200 bg-white">
                                    <Image
                                      src={preview}
                                      alt={`${slot.title} ${fileIndex + 1}`}
                                      fill
                                      unoptimized
                                      className="object-cover"
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    {files.length} / {SOXAI_UPLOAD_SLOTS.length} 枚選択中
                  </p>
                  <button
                    type="button"
                    onClick={clearAllFiles}
                    className="text-xs font-semibold text-slate-500"
                  >
                    すべてクリア
                  </button>
                </div>
                {uploadMissing && (
                  <p className="text-sm font-medium text-rose-600">
                    SOXAI画像を1枚以上選択してください
                  </p>
                )}
              </div>
            </section>
          )}

          {/* 02 Lifestyle */}
          <section className="overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.28)]">
            <div className="border-b border-slate-100 px-4 py-5 sm:px-8 sm:py-8 lg:px-10">
              <p className="text-[11px] font-semibold tracking-[0.26em] text-[#8a6a2d]">
                02 · LIFESTYLE
              </p>
              <h2 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#071426] sm:text-2xl">
                生活習慣を入力
              </h2>
              <p className="mt-2 max-w-xl text-[14px] leading-6 text-slate-500 sm:text-sm sm:leading-7">
                上から順に入力してください。必須項目以外は分かる範囲で構いません。
              </p>
            </div>

            <div className="space-y-7 px-4 py-5 sm:space-y-10 sm:px-8 sm:py-8 lg:px-10 lg:py-9">
              <FormGroup
                title="測定日"
                description="レポートに表示される測定日です。対象者は上のクライアント欄で設定済みです"
              >
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-5">
                  <Field label="測定日" required>
                    <input
                      name="measurementDate"
                      type="date"
                      required
                      className={inputClass}
                    />
                  </Field>
                </div>
              </FormGroup>

              <FormGroup
                title="睡眠データ（自動抽出）"
                description="入眠・起床・スコア・ステージ・HRV などは画像から自動読み取ります"
              >
                <p className="rounded-2xl border border-[#315f68]/15 bg-[#f4f7f7] px-4 py-3.5 text-[14px] leading-6 text-slate-600 sm:text-sm sm:leading-7">
                  次の画面で抽出結果を確認できます。画像から取れなかった項目だけ、そこで手入力してください。画像にある値は手入力より優先されます。
                </p>
              </FormGroup>

              <FormGroup
                title="睡眠・生活リズム（任意）"
                description="分かる範囲で選択してください。SOXAI画像から取れる項目は確認画面で優先されます"
              >
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-5">
                  <Field label="睡眠時間" optional>
                    <select
                      name="sleepDurationLifestyle"
                      className={inputClass}
                      defaultValue=""
                    >
                      {DURATION_MINUTE_OPTIONS.map((option) => (
                        <option key={`sleep-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="昼寝時間" optional>
                    <select name="napDuration" className={inputClass} defaultValue="">
                      {DURATION_MINUTE_OPTIONS.map((option) => (
                        <option key={`nap-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="スマホ利用時間" optional>
                    <select
                      name="smartphoneDuration"
                      className={inputClass}
                      defaultValue=""
                    >
                      {DURATION_MINUTE_OPTIONS.map((option) => (
                        <option
                          key={`phone-${option.value}`}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="夜間の目覚め回数" optional>
                    <select name="wakeCount" className={inputClass} defaultValue="">
                      <option value="">選択してください</option>
                      {COUNT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="運動・活動した曜日" optional>
                      <div className="mt-2.5 flex flex-wrap gap-2.5">
                        {WEEKDAY_OPTIONS.map((day) => {
                          const checked = weekdays.includes(day.value);
                          return (
                            <label
                              key={day.value}
                              className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-[14px] transition sm:text-sm ${
                                checked
                                  ? "border-[#315f68] bg-white text-[#071426] ring-4 ring-[#315f68]/10"
                                  : "border-slate-200 bg-[#fafaf8] text-[#071426]"
                              }`}
                            >
                              <input
                                type="checkbox"
                                name="weekdays"
                                value={day.value}
                                checked={checked}
                                onChange={(event) => {
                                  setWeekdays((prev) =>
                                    event.target.checked
                                      ? [...prev, day.value]
                                      : prev.filter((item) => item !== day.value),
                                  );
                                }}
                                className="h-4 w-4 accent-[#315f68]"
                              />
                              {day.label}
                            </label>
                          );
                        })}
                      </div>
                    </Field>
                  </div>
                </div>
              </FormGroup>

              <FormGroup
                title="ヨガ"
                description="実施時間と開始時刻が分かると睡眠との関係を見やすくなります。1日に複数回ある場合は追加できます"
              >
                <div className="space-y-4">
                  <Field label="実施したか" optional>
                    <RadioOptions
                      name="yogaDone"
                      value={yogaDone}
                      onChange={setYogaDone}
                      options={YES_NO_OPTIONS}
                    />
                  </Field>

                  {yogaDone === "yes" && (
                    <>
                      {yogaSessions.map((entry, index) => (
                        <div
                          key={entry.id}
                          className="rounded-2xl border border-slate-100 bg-[#fafaf8] px-4 py-4 sm:px-5"
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="text-[15px] font-semibold text-[#071426] sm:text-sm">
                              ヨガ {index + 1}
                            </p>
                            {yogaSessions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeYogaSession(entry.id)}
                                className="inline-flex min-h-11 items-center px-1 text-[13px] font-medium text-slate-400 transition active:text-rose-600 sm:min-h-0 sm:hover:text-rose-600 sm:active:text-slate-400"
                              >
                                削除
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-5">
                            <Field label="実施時間" optional>
                              <select
                                className={inputClass}
                                value={entry.duration}
                                onChange={(event) =>
                                  updateYogaSession(
                                    entry.id,
                                    "duration",
                                    event.target.value,
                                  )
                                }
                              >
                                {DURATION_MINUTE_OPTIONS.map((option) => (
                                  <option
                                    key={`${entry.id}-${option.value}`}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </Field>
                            <Field label="開始時刻または時間帯" optional>
                              <input
                                type="text"
                                value={entry.time}
                                onChange={(event) =>
                                  updateYogaSession(
                                    entry.id,
                                    "time",
                                    event.target.value,
                                  )
                                }
                                className={inputClass}
                                placeholder="例：7:30〜8:00 / 朝"
                              />
                            </Field>
                            <div className="sm:col-span-2">
                              <Field label="補足" optional>
                                <input
                                  type="text"
                                  value={entry.notes}
                                  onChange={(event) =>
                                    updateYogaSession(
                                      entry.id,
                                      "notes",
                                      event.target.value,
                                    )
                                  }
                                  className={inputClass}
                                  placeholder="例：穏やかな呼吸中心、就寝前のストレッチなど"
                                />
                              </Field>
                            </div>
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={addYogaSession}
                        className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-[15px] font-semibold text-[#071426] transition active:bg-slate-50 sm:min-h-11 sm:w-auto sm:text-sm sm:hover:bg-slate-50 sm:active:bg-transparent"
                      >
                        ＋ ヨガを追加
                      </button>
                    </>
                  )}
                </div>
              </FormGroup>

              <FormGroup
                title="ピラティス"
                description="実施時間と開始時刻を区別して入力できます。1日に複数回ある場合は追加できます"
              >
                <div className="space-y-4">
                  <Field label="実施したか" optional>
                    <RadioOptions
                      name="pilatesDone"
                      value={pilatesDone}
                      onChange={setPilatesDone}
                      options={YES_NO_OPTIONS}
                    />
                  </Field>

                  {pilatesDone === "yes" && (
                    <>
                      {pilatesSessions.map((entry, index) => (
                        <div
                          key={entry.id}
                          className="rounded-2xl border border-slate-100 bg-[#fafaf8] px-4 py-4 sm:px-5"
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="text-[15px] font-semibold text-[#071426] sm:text-sm">
                              ピラティス {index + 1}
                            </p>
                            {pilatesSessions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removePilatesSession(entry.id)}
                                className="inline-flex min-h-11 items-center px-1 text-[13px] font-medium text-slate-400 transition active:text-rose-600 sm:min-h-0 sm:hover:text-rose-600 sm:active:text-slate-400"
                              >
                                削除
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-5">
                            <Field label="実施時間" optional>
                              <select
                                className={inputClass}
                                value={entry.duration}
                                onChange={(event) =>
                                  updatePilatesSession(
                                    entry.id,
                                    "duration",
                                    event.target.value,
                                  )
                                }
                              >
                                {DURATION_MINUTE_OPTIONS.map((option) => (
                                  <option
                                    key={`${entry.id}-${option.value}`}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </Field>
                            <Field label="開始時刻または時間帯" optional>
                              <input
                                type="text"
                                value={entry.time}
                                onChange={(event) =>
                                  updatePilatesSession(
                                    entry.id,
                                    "time",
                                    event.target.value,
                                  )
                                }
                                className={inputClass}
                                placeholder="例：13:05〜14:00 / 日中"
                              />
                            </Field>
                            <div className="sm:col-span-2">
                              <Field label="補足" optional>
                                <input
                                  type="text"
                                  value={entry.notes}
                                  onChange={(event) =>
                                    updatePilatesSession(
                                      entry.id,
                                      "notes",
                                      event.target.value,
                                    )
                                  }
                                  className={inputClass}
                                  placeholder="例：マシンピラティス、強度など"
                                />
                              </Field>
                            </div>
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={addPilatesSession}
                        className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-[15px] font-semibold text-[#071426] transition active:bg-slate-50 sm:min-h-11 sm:w-auto sm:text-sm sm:hover:bg-slate-50 sm:active:bg-transparent"
                      >
                        ＋ ピラティスを追加
                      </button>
                    </>
                  )}
                </div>
              </FormGroup>

              <FormGroup
                title="その他の運動"
                description="ヨガ・ピラティス以外の運動（ウォーキング、筋力トレーニングなど）"
              >
                <div className="space-y-4">
                  <Field label="運動したか" optional>
                    <RadioOptions
                      name="otherExerciseDone"
                      value={otherExerciseDone}
                      onChange={setOtherExerciseDone}
                      options={YES_NO_OPTIONS}
                    />
                  </Field>

                  {otherExerciseDone === "yes" && (
                    <>
                      {otherExercises.map((entry, index) => (
                        <div
                          key={entry.id}
                          className="rounded-2xl border border-slate-100 bg-[#fafaf8] px-4 py-4 sm:px-5"
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="text-[15px] font-semibold text-[#071426] sm:text-sm">
                              運動 {index + 1}
                            </p>
                            {otherExercises.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeOtherExercise(entry.id)}
                                className="inline-flex min-h-11 items-center px-1 text-[13px] font-medium text-slate-400 transition active:text-rose-600 sm:min-h-0 sm:hover:text-rose-600 sm:active:text-slate-400"
                              >
                                削除
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-5">
                            <Field label="運動の種類" optional>
                              <input
                                type="text"
                                value={entry.name}
                                onChange={(event) =>
                                  updateOtherExercise(
                                    entry.id,
                                    "name",
                                    event.target.value,
                                  )
                                }
                                className={inputClass}
                                placeholder="例：ウォーキング"
                              />
                            </Field>
                            <Field label="実施時間" optional>
                              <select
                                className={inputClass}
                                value={entry.duration}
                                onChange={(event) =>
                                  updateOtherExercise(
                                    entry.id,
                                    "duration",
                                    event.target.value,
                                  )
                                }
                              >
                                {DURATION_MINUTE_OPTIONS.map((option) => (
                                  <option
                                    key={`${entry.id}-${option.value}`}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </Field>
                            <Field label="実施した時刻または時間帯" optional>
                              <input
                                type="text"
                                value={entry.time}
                                onChange={(event) =>
                                  updateOtherExercise(
                                    entry.id,
                                    "time",
                                    event.target.value,
                                  )
                                }
                                className={inputClass}
                                placeholder="例：18:00〜18:40 / 夕方"
                              />
                            </Field>
                            <Field label="補足" optional>
                              <input
                                type="text"
                                value={entry.notes}
                                onChange={(event) =>
                                  updateOtherExercise(
                                    entry.id,
                                    "notes",
                                    event.target.value,
                                  )
                                }
                                className={inputClass}
                                placeholder="例：強度、屋外など"
                              />
                            </Field>
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={addOtherExercise}
                        className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-[15px] font-semibold text-[#071426] transition active:bg-slate-50 sm:min-h-11 sm:w-auto sm:text-sm sm:hover:bg-slate-50 sm:active:bg-transparent"
                      >
                        ＋ 運動を追加
                      </button>
                    </>
                  )}
                </div>
              </FormGroup>

              <FormGroup
                title="入浴・カフェイン"
                description="入浴とカフェイン摂取の詳細"
              >
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-100 bg-[#fafaf8] px-4 py-4 sm:px-5">
                    <Field label="入浴" optional>
                      <RadioOptions
                        name="bathing"
                        value={bathing}
                        onChange={setBathing}
                        options={BATHING_OPTIONS}
                      />
                    </Field>
                    {(bathing === "bath" || bathing === "shower") && (
                      <div className="mt-3 grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-5">
                        <Field label="入浴した時刻" optional>
                          <select
                            name="bathingTime"
                            className={inputClass}
                            defaultValue=""
                          >
                            {HALF_HOUR_TIME_OPTIONS.map((option) => (
                              <option
                                key={`bathing-time-${option.value}`}
                                value={option.value}
                              >
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </Field>
                        {bathing === "bath" && (
                          <>
                            <Field label="入浴時間" optional>
                              <select
                                name="bathingDuration"
                                className={inputClass}
                                defaultValue=""
                              >
                                {BATHING_DURATION_OPTIONS.map((option) => (
                                  <option
                                    key={`bathing-duration-${option.value}`}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </Field>
                            <Field label="お湯の温度" optional>
                              <select
                                name="bathingTemperature"
                                className={inputClass}
                                defaultValue=""
                              >
                                {BATHING_TEMPERATURE_OPTIONS.map((option) => (
                                  <option
                                    key={`bathing-temp-${option.value}`}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </Field>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <Field label="カフェイン" optional>
                      <RadioOptions
                        name="caffeineDone"
                        value={caffeineDone}
                        onChange={setCaffeineDone}
                        options={CAFFEINE_DONE_OPTIONS}
                      />
                    </Field>

                    {caffeineDone === "yes" && (
                      <>
                        {caffeineEntries.map((entry, index) => (
                          <div
                            key={entry.id}
                            className="rounded-2xl border border-slate-100 bg-[#fafaf8] px-4 py-4 sm:px-5"
                          >
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <p className="text-[15px] font-semibold text-[#071426] sm:text-sm">
                                カフェイン {index + 1}
                              </p>
                              {caffeineEntries.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeCaffeineEntry(entry.id)}
                                  className="inline-flex min-h-11 items-center px-1 text-[13px] font-medium text-slate-400 transition active:text-rose-600 sm:min-h-0 sm:hover:text-rose-600 sm:active:text-slate-400"
                                >
                                  削除
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-5">
                              <Field label="種類" optional>
                                <select
                                  className={inputClass}
                                  value={entry.type}
                                  onChange={(event) =>
                                    updateCaffeineEntry(
                                      entry.id,
                                      "type",
                                      event.target.value,
                                    )
                                  }
                                >
                                  <option value="">選択してください</option>
                                  {caffeineTypeOptions.map((option) => (
                                    <option
                                      key={`${entry.id}-${option.value}`}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </Field>
                              <Field label="摂取時刻" optional>
                                <select
                                  className={inputClass}
                                  value={entry.time}
                                  onChange={(event) =>
                                    updateCaffeineEntry(
                                      entry.id,
                                      "time",
                                      event.target.value,
                                    )
                                  }
                                >
                                  {HALF_HOUR_TIME_OPTIONS.map((option) => (
                                    <option
                                      key={`${entry.id}-time-${option.value}`}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </Field>
                              {entry.type === "other" && (
                                <div className="sm:col-span-2">
                                  <Field label="その他の種類" optional>
                                    <input
                                      type="text"
                                      value={entry.typeOther}
                                      onChange={(event) =>
                                        updateCaffeineEntry(
                                          entry.id,
                                          "typeOther",
                                          event.target.value,
                                        )
                                      }
                                      className={inputClass}
                                      placeholder="例：抹茶ラテ"
                                    />
                                  </Field>
                                </div>
                              )}
                              <div className="sm:col-span-2">
                                <Field label="量" optional>
                                  <input
                                    type="text"
                                    value={entry.amount}
                                    onChange={(event) =>
                                      updateCaffeineEntry(
                                        entry.id,
                                        "amount",
                                        event.target.value,
                                      )
                                    }
                                    className={inputClass}
                                    placeholder="例：1杯 / 200ml / 缶1本 / チョコレート50g"
                                  />
                                </Field>
                              </div>
                            </div>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={addCaffeineEntry}
                          className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-[15px] font-semibold text-[#071426] transition active:bg-slate-50 sm:min-h-11 sm:w-auto sm:text-sm sm:hover:bg-slate-50 sm:active:bg-transparent"
                        >
                          ＋ カフェインを追加
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </FormGroup>

              <FormGroup
                title="食事"
                description="食べた食事にチェックを入れ、必要なら時間と内容を入力"
              >
                <div className="space-y-4">
                  {(
                    [
                      [
                        "朝食",
                        "breakfastEaten",
                        breakfastEaten,
                        setBreakfastEaten,
                        "breakfastTime",
                        "breakfastContent",
                        "例：ご飯、味噌汁、卵",
                      ],
                      [
                        "昼食",
                        "lunchEaten",
                        lunchEaten,
                        setLunchEaten,
                        "lunchTime",
                        "lunchContent",
                        "例：そば、サラダ",
                      ],
                      [
                        "夕食",
                        "dinnerEaten",
                        dinnerEaten,
                        setDinnerEaten,
                        "dinnerTime",
                        "dinnerContent",
                        "例：焼き魚、野菜、ご飯",
                      ],
                    ] as const
                  ).map(
                    ([
                      label,
                      eatenName,
                      eatenValue,
                      setEaten,
                      timeName,
                      contentName,
                      placeholder,
                    ]) => (
                      <div
                        key={label}
                        className="rounded-2xl border border-slate-100 bg-[#fafaf8] px-4 py-4 sm:px-5"
                      >
                        <label
                          className={`inline-flex min-h-11 cursor-pointer items-center gap-2.5 rounded-2xl border px-4 py-3 text-[15px] transition sm:text-sm ${
                            eatenValue === "yes"
                              ? "border-[#315f68] bg-white text-[#071426] ring-4 ring-[#315f68]/10"
                              : "border-slate-200 bg-white text-[#071426]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            name={eatenName}
                            value="yes"
                            checked={eatenValue === "yes"}
                            onChange={(event) =>
                              setEaten(event.target.checked ? "yes" : "none")
                            }
                            className="h-4 w-4 accent-[#315f68]"
                          />
                          {label}を食べた
                        </label>
                        {eatenValue === "yes" && (
                          <div className="mt-3 grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-5">
                            <Field label={`${label}時間`} optional>
                              <select
                                name={timeName}
                                className={inputClass}
                                defaultValue=""
                              >
                                {HALF_HOUR_CLOCK_OPTIONS.map((option) => (
                                  <option
                                    key={`${timeName}-${option.value}`}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </Field>
                            <div className="sm:col-span-2">
                              <Field label={`${label}内容`} optional>
                                <input
                                  name={contentName}
                                  type="text"
                                  className={inputClass}
                                  placeholder={placeholder}
                                />
                              </Field>
                            </div>
                          </div>
                        )}
                      </div>
                    ),
                  )}
                </div>
              </FormGroup>

              <FormGroup
                title="飲酒"
                description="飲んだ場合は種類・量・度数を自由に記入できます（複数種類も可）"
              >
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-5">
                  <div className="sm:col-span-2">
                    <Field label="飲酒" optional>
                      <RadioOptions
                        name="alcoholDrank"
                        value={alcoholDrank}
                        onChange={setAlcoholDrank}
                        options={ALCOHOL_DONE_OPTIONS}
                      />
                    </Field>
                  </div>
                  {alcoholDrank === "yes" && (
                    <>
                      <div className="sm:col-span-2">
                        <Field label="飲んだお酒の種類" optional>
                          <input
                            name="alcoholType"
                            type="text"
                            className={inputClass}
                            placeholder="例：ビール、赤ワイン、ハイボール"
                          />
                        </Field>
                      </div>
                      <div className="sm:col-span-2">
                        <Field label="飲んだ量" optional>
                          <input
                            name="alcoholAmount"
                            type="text"
                            className={inputClass}
                            placeholder="例：ビール350ml、ワイン2杯、ハイボール1杯"
                          />
                        </Field>
                      </div>
                      <div className="sm:col-span-2">
                        <Field label="アルコール度数" optional>
                          <input
                            name="alcoholAbv"
                            type="text"
                            className={inputClass}
                            placeholder="例：5%、12%、7%"
                          />
                        </Field>
                      </div>
                      <Field label="飲み終わった時間" optional>
                        <input
                          name="alcoholEndTime"
                          type="time"
                          className={inputClass}
                        />
                      </Field>
                      <div className="sm:col-span-2">
                        <Field label="補足" optional>
                          <textarea
                            name="alcoholNotes"
                            rows={2}
                            className={textareaClass}
                            placeholder="例：食後に少量、など"
                          />
                        </Field>
                      </div>
                    </>
                  )}
                </div>
              </FormGroup>

              <FormGroup
                title="コンディション"
                description="体調と生活背景"
              >
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-5">
                  <Field label="体調" optional>
                    <input
                      name="condition"
                      type="text"
                      className={inputClass}
                      placeholder="疲労感、風邪症状など"
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="仕事・生活リズム" optional>
                      <textarea
                        name="work"
                        rows={3}
                        className={textareaClass}
                        placeholder="勤務時間、帰宅時間、生活上の制約など"
                      />
                    </Field>
                  </div>
                </div>
              </FormGroup>

              <FormGroup
                title="主観的なストレス・気分"
                description="測定データとは別に扱う任意の補足"
              >
                <p className="mb-4 rounded-2xl border border-slate-100 bg-[#fafaf8] px-4 py-3.5 text-[14px] leading-6 text-slate-600 sm:text-sm sm:leading-7">
                  ストレスはSOXAIなどの測定データを参考に分析します。ご自身の体感を補足したい場合のみ入力してください。
                </p>
                <Field label="主観的なストレス" optional>
                  <RadioOptions
                    name="stress"
                    value={stressLevel}
                    onChange={setStressLevel}
                    options={STRESS_LEVEL_OPTIONS}
                  />
                </Field>
              </FormGroup>

              <FormGroup
                title="自由記述"
                description="本人の自覚や、睡眠に関する気づき"
              >
                <Field label="補足メモ" optional>
                  <textarea
                    name="notes"
                    rows={4}
                    className={textareaClass}
                    placeholder="本人の自覚、睡眠に関する気づきなど"
                  />
                </Field>
              </FormGroup>
            </div>
          </section>

          {/* CTA */}
          <section className="relative overflow-hidden rounded-[28px] bg-[#071426] px-4 py-8 text-center shadow-[0_30px_90px_-40px_rgba(7,20,38,0.55)] sm:px-10 sm:py-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(49,95,104,0.35),transparent_55%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(216,179,106,0.2),transparent_45%)]" />

            <div className="relative z-10">
              {error && (
                <p className="mb-5 text-[14px] font-medium text-rose-300 sm:text-sm">
                  {error}
                </p>
              )}

              <p className="text-[11px] font-semibold tracking-[0.28em] text-[#d8b36a]">
                {inputMethod === "manual"
                  ? "MANUAL INPUT"
                  : "SOXAI AUTO READ"}
              </p>
              <h2 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-white sm:text-2xl">
                {inputMethod === "manual"
                  ? "手入力データを確認する"
                  : ocrStatus === "ready"
                    ? "データ取得済み — 確認へ進む"
                    : "画像を読み取り、結果を確認する"}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-[14px] leading-6 text-white/60 sm:text-sm sm:leading-7">
                {inputMethod === "manual"
                  ? "SOXAI画像なしで、手入力データを確認画面に渡します。"
                  : ocrStatus === "ready"
                    ? "選択したSOXAI画像の解析は完了しています。必須項目を入力して確認画面へ進んでください。"
                    : ocrStatus === "running"
                      ? "画像選択後、入力中にバックグラウンドでOCR解析を進めています。"
                      : "必須：SOXAI画像（1枚以上）・対象者名・測定日・年齢・性別。未選択の画面項目は確認画面で未取得と表示されます。"}
              </p>

              <button
                type="submit"
                disabled={
                  isSubmitting || (inputMethod === "soxai" && files.length === 0)
                }
                className="group mt-7 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-white px-8 py-4 text-base font-semibold text-[#071426] shadow-[0_18px_50px_-20px_rgba(255,255,255,0.55)] transition duration-500 active:bg-[#f4f4f4] disabled:cursor-not-allowed disabled:opacity-60 sm:mt-8 sm:w-auto sm:px-12 sm:py-5 sm:text-lg sm:hover:-translate-y-1 sm:hover:bg-[#f4f4f4] sm:active:translate-y-0 disabled:sm:hover:translate-y-0"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#071426]/20 border-t-[#071426]" />
                    {inputMethod === "manual"
                      ? "確認画面へ移動中..."
                      : ocrStatus === "ready"
                        ? "確認画面へ移動中..."
                        : "SOXAIデータ取得を完了中..."}
                  </>
                ) : (
                  <>
                    {inputMethod === "manual"
                      ? "手入力の確認へ進む"
                      : "OCR解析へ進む"}
                    <span className="transition-transform duration-500 group-hover:translate-x-1">
                      →
                    </span>
                  </>
                )}
              </button>

              <p className="mx-auto mt-6 max-w-lg text-xs leading-6 text-white/40 sm:text-sm sm:leading-7">
                本システムは睡眠ウェルネス支援を目的としており、
                医療診断・治療を行うものではありません。
              </p>
            </div>
          </section>
        </form>
          </>
        )}
      </div>
    </main>
  );
}

function FormGroup({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-4 space-y-1 border-b border-slate-100 pb-3">
        <h3 className="text-base font-semibold tracking-[-0.02em] text-[#071426]">
          {title}
        </h3>
        <p className="text-[13px] leading-6 text-slate-400 sm:text-xs sm:leading-5">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}

function RadioOptions({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: string;
  onChange: (next: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <div className="mt-2.5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <label
            key={option.value}
            className={`inline-flex min-h-12 cursor-pointer items-center gap-2.5 rounded-2xl border px-4 py-3 text-[15px] transition sm:min-h-0 sm:text-sm ${
              selected
                ? "border-[#315f68] bg-white text-[#071426] ring-4 ring-[#315f68]/10"
                : "border-slate-200 bg-[#fafaf8] text-[#071426]"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selected}
              onChange={() => onChange(option.value)}
              className="h-4 w-4 accent-[#315f68]"
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}

function Field({
  label,
  required,
  optional,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="block">
      <span className="text-[15px] font-semibold text-[#071426] sm:text-sm">
        {label}
        {required && (
          <span className="ml-1.5 text-[11px] font-medium text-[#8a6a2d]">
            必須
          </span>
        )}
        {optional && (
          <span className="ml-1.5 text-[11px] font-medium text-slate-400">
            任意
          </span>
        )}
      </span>
      {children}
    </div>
  );
}
