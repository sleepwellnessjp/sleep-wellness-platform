"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  ReactNode,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import AnalysisFlow from "@/components/AnalysisFlow";
import {
  AnalysisError,
  extractSoxaiMetricsDetailed,
  formatExtractErrorMessage,
  setExtractionDraft,
} from "@/lib/analysis-session";
import {
  CLIENT_GENDER_OPTIONS,
  emptyClientProfileBasics,
  parseOptionalAge,
  type ClientProfileBasics,
} from "@/lib/client-profile";
import {
  getClientById,
  getClientListItems,
  type ClientListItem,
  type StoredClient,
} from "@/lib/repositories/client-repository";
import {
  collectedMetricKeys,
  SOXAI_METRIC_FIELDS,
} from "@/lib/soxai-metrics";

const MAX_FILES = 10;
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const inputClass =
  "mt-2.5 w-full rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3.5 text-[15px] text-[#071426] outline-none transition duration-300 placeholder:text-slate-400 focus:border-[#315f68] focus:bg-white focus:ring-4 focus:ring-[#315f68]/10 sm:px-5 sm:py-4 sm:text-base";

const textareaClass =
  "mt-2.5 w-full resize-none rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3.5 text-[15px] leading-7 text-[#071426] outline-none transition duration-300 placeholder:text-slate-400 focus:border-[#315f68] focus:bg-white focus:ring-4 focus:ring-[#315f68]/10 sm:px-5 sm:py-4 sm:text-base";

const soxaiMetrics = SOXAI_METRIC_FIELDS.slice(0, 6).map((field) => ({
  label: field.label,
  hint: field.hint,
}));

const caffeineTypeOptions = [
  { value: "coffee", label: "コーヒー" },
  { value: "green_tea", label: "緑茶" },
  { value: "black_tea", label: "紅茶" },
  { value: "energy_drink", label: "エナジードリンク" },
  { value: "other", label: "その他" },
] as const;

type OtherExerciseEntry = {
  id: string;
  name: string;
  duration: string;
  time: string;
  notes: string;
};

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

function composePracticeSummary(practice: {
  done: string;
  duration: string;
  time: string;
  notes: string;
}): string {
  if (practice.done === "none") return "なし";
  if (practice.done !== "yes") return "";

  const parts: string[] = ["実施"];
  if (practice.duration) parts.push(`${practice.duration}分`);
  if (practice.time) parts.push(`時刻:${practice.time}`);
  if (practice.notes) parts.push(`補足:${practice.notes}`);
  return parts.join(" / ");
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

function composeCaffeineSummary(caffeine: {
  done: string;
  type: string;
  amount: string;
  time: string;
  notes: string;
}): string {
  if (caffeine.done === "none") return "なし";
  if (caffeine.done !== "yes") return "";

  const typeLabel =
    caffeineTypeOptions.find((option) => option.value === caffeine.type)
      ?.label ?? caffeine.type;

  const parts: string[] = ["あり"];
  if (typeLabel) parts.push(`種類:${typeLabel}`);
  if (caffeine.amount) parts.push(`量:${caffeine.amount}`);
  if (caffeine.time) parts.push(`時刻:${caffeine.time}`);
  if (caffeine.notes) parts.push(`補足:${caffeine.notes}`);
  return parts.join(" / ");
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
    if (eaten === "none") {
      lines.push(`${label}: 食べていない`);
      return;
    }
    if (eaten === "yes") {
      const detail = [time, content].filter(Boolean).join(" / ");
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
  endTime: string;
  notes: string;
}): string {
  if (alcohol.drank === "none") return "なし";
  if (alcohol.drank !== "yes") return "";

  const parts: string[] = ["あり"];
  if (alcohol.type) parts.push(`種類:${alcohol.type}`);
  if (alcohol.amount) parts.push(`量:${alcohol.amount}`);
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

  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alcoholDrank, setAlcoholDrank] = useState("");
  const [yogaDone, setYogaDone] = useState("");
  const [pilatesDone, setPilatesDone] = useState("");
  const [otherExerciseDone, setOtherExerciseDone] = useState("");
  const [otherExercises, setOtherExercises] = useState<OtherExerciseEntry[]>([
    createOtherExerciseEntry(),
  ]);
  const [caffeineDone, setCaffeineDone] = useState("");
  const [breakfastEaten, setBreakfastEaten] = useState("");
  const [lunchEaten, setLunchEaten] = useState("");
  const [dinnerEaten, setDinnerEaten] = useState("");
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

  const previewUrls = useMemo(
    () => files.map((file) => URL.createObjectURL(file)),
    [files],
  );

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

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

  const addFiles = (selectedFiles: File[]) => {
    const validFiles = selectedFiles.filter((file) =>
      (ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type),
    );

    if (validFiles.length === 0 && selectedFiles.length > 0) {
      setError("JPG / JPEG / PNG / WEBP 形式の画像のみアップロードできます。");
      return;
    }

    setFiles((currentFiles) => {
      const existing = new Set(currentFiles.map(fileFingerprint));
      const uniqueNew = validFiles.filter((file) => {
        const key = fileFingerprint(file);
        if (existing.has(key)) return false;
        existing.add(key);
        return true;
      });

      if (uniqueNew.length < validFiles.length) {
        setError("同じ画像は重複して追加できません。");
      } else {
        setError(null);
      }

      const merged = [...currentFiles, ...uniqueNew];
      if (merged.length > MAX_FILES) {
        setError(`画像は最大${MAX_FILES}枚までです。`);
        return merged.slice(0, MAX_FILES);
      }
      return merged;
    });
    setTouchedUpload(true);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  };

  const removeFile = (index: number) => {
    setFiles((currentFiles) =>
      currentFiles.filter((_, fileIndex) => fileIndex !== index),
    );
  };

  const clearAllFiles = () => {
    setFiles([]);
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setTouchedUpload(true);

    if (files.length === 0) {
      setError("SOXAI画像を1枚以上アップロードしてください。");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    if (files.length > MAX_FILES) {
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

    setIsSubmitting(true);

    try {
      const images = await Promise.all(files.map(fileToDataUrl));

      const yogaDoneValue = String(formData.get("yogaDone") ?? "");
      const yogaDuration = String(formData.get("yogaDuration") ?? "");
      const yogaTime = String(formData.get("yogaTime") ?? "");
      const yogaNotes = String(formData.get("yogaNotes") ?? "");

      const pilatesDoneValue = String(formData.get("pilatesDone") ?? "");
      const pilatesDuration = String(formData.get("pilatesDuration") ?? "");
      const pilatesTime = String(formData.get("pilatesTime") ?? "");
      const pilatesNotes = String(formData.get("pilatesNotes") ?? "");

      const otherExerciseDoneValue = String(
        formData.get("otherExerciseDone") ?? "",
      );
      const activeOtherExercises =
        otherExerciseDoneValue === "yes" ? otherExercises : [];
      const primaryOther = activeOtherExercises[0];
      const otherExerciseName = primaryOther?.name ?? "";
      const otherExerciseDuration = primaryOther?.duration ?? "";
      const otherExerciseTime = primaryOther?.time ?? "";
      const otherExerciseNotes =
        activeOtherExercises.length > 1
          ? [
              primaryOther?.notes,
              ...activeOtherExercises.slice(1).map((entry) => {
                const parts = [
                  entry.name,
                  entry.duration ? `${entry.duration}分` : "",
                  entry.time ? `時刻:${entry.time}` : "",
                  entry.notes,
                ].filter(Boolean);
                return parts.join(" / ");
              }),
            ]
              .filter(Boolean)
              .join("；")
          : (primaryOther?.notes ?? "");

      const caffeineDoneValue = String(formData.get("caffeineDone") ?? "");
      const caffeineType = String(formData.get("caffeineType") ?? "");
      const caffeineAmount = String(formData.get("caffeineAmount") ?? "");
      const caffeineTime = String(formData.get("caffeineTime") ?? "");
      const caffeineNotes = String(formData.get("caffeineNotes") ?? "");

      const breakfastEatenValue = String(formData.get("breakfastEaten") ?? "");
      const breakfastTime =
        breakfastEatenValue === "yes"
          ? String(formData.get("breakfastTime") ?? "")
          : "";
      const breakfastContent =
        breakfastEatenValue === "yes"
          ? String(formData.get("breakfastContent") ?? "")
          : "";
      const lunchEatenValue = String(formData.get("lunchEaten") ?? "");
      const lunchTime =
        lunchEatenValue === "yes"
          ? String(formData.get("lunchTime") ?? "")
          : "";
      const lunchContent =
        lunchEatenValue === "yes"
          ? String(formData.get("lunchContent") ?? "")
          : "";
      const dinnerEatenValue = String(formData.get("dinnerEaten") ?? "");
      const dinnerTime =
        dinnerEatenValue === "yes"
          ? String(formData.get("dinnerTime") ?? "")
          : "";
      const dinnerContent =
        dinnerEatenValue === "yes"
          ? String(formData.get("dinnerContent") ?? "")
          : "";

      const alcoholDrankValue = String(formData.get("alcoholDrank") ?? "");
      const alcoholType = String(formData.get("alcoholType") ?? "");
      const alcoholAmount = String(formData.get("alcoholAmount") ?? "");
      const alcoholEndTime = String(formData.get("alcoholEndTime") ?? "");
      const alcoholNotes = String(formData.get("alcoholNotes") ?? "");

      const yogaSummary = composePracticeSummary({
        done: yogaDoneValue,
        duration: yogaDuration,
        time: yogaTime,
        notes: yogaNotes,
      });
      const pilatesSummary = composePracticeSummary({
        done: pilatesDoneValue,
        duration: pilatesDuration,
        time: pilatesTime,
        notes: pilatesNotes,
      });
      const otherExerciseSummary =
        otherExerciseDoneValue === "none"
          ? "なし"
          : composeOtherExerciseSummary(activeOtherExercises);
      const caffeineSummary = composeCaffeineSummary({
        done: caffeineDoneValue,
        type: caffeineType,
        amount: caffeineAmount,
        time: caffeineTime,
        notes: caffeineNotes,
      });

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
        bedtime: "",
        wakeTime: "",
        exercise: otherExerciseSummary,
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
        bathing: String(formData.get("bathing") ?? ""),
        alcohol: composeAlcoholSummary({
          drank: alcoholDrankValue,
          type: alcoholType,
          amount: alcoholAmount,
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
        nasalCongestion: String(formData.get("nasalCongestion") ?? ""),
        notes: String(formData.get("notes") ?? ""),
      };

      const { metrics: extractedMetrics, conflicts, graphs, confidence } =
        await extractSoxaiMetricsDetailed(images);
      const imageKeys = collectedMetricKeys(extractedMetrics);

      if (imageKeys.length === 0) {
        throw new AnalysisError(
          "画像から睡眠データを読み取れませんでした。SOXAIのスクリーンショットが鮮明か、対応形式（JPG / JPEG / PNG / WEBP）かを確認してください。",
          { errorType: "Empty Extraction" },
        );
      }

      setExtractionDraft({
        lifestyle,
        images,
        extractedMetrics,
        imageKeys,
        conflicts,
        ocrConfidence: confidence,
        graphs,
      });
      router.push("/analysis/confirm");
    } catch (err) {
      console.error("SOXAI extract failed:", err);
      setError(formatExtractErrorMessage(err));
      setIsSubmitting(false);
    }
  };

  const uploadMissing = touchedUpload && files.length === 0;

  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <div className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/swij-logo-horizontal.png"
              alt="Sleep Wellness Institute Japan"
              width={160}
              height={40}
              className="h-auto w-[120px] sm:w-[140px]"
            />
          </Link>
          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/clients"
              className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 transition hover:text-[#071426] sm:text-xs"
            >
              CLIENTS
            </Link>
            <p className="text-[10px] font-semibold tracking-[0.22em] text-[#8a6a2d] sm:text-xs sm:tracking-[0.28em]">
              AI ANALYSIS
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12 lg:py-14">
        <div className="mb-8 sm:mb-10">
          <AnalysisFlow current={1} />
        </div>

        <header className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold tracking-[0.28em] text-[#8a6a2d]">
            SLEEP WELLNESS ANALYSIS
          </p>

          <h1 className="mt-4 text-[1.85rem] font-semibold tracking-[-0.05em] text-[#071426] sm:mt-5 sm:text-4xl lg:text-5xl">
            新しい睡眠分析
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-slate-600 sm:mt-5 sm:text-base sm:leading-8">
            SOXAIのスクリーンショットをアップロードするだけで、
            睡眠データを自動抽出し Sleep Wellness Report を作成します。
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="mt-10 space-y-8 sm:mt-12 sm:space-y-10"
          noValidate
        >
          {/* 00 CLIENT */}
          <section className="overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.28)]">
            <div className="border-b border-slate-100 px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
              <p className="text-[11px] font-semibold tracking-[0.26em] text-[#8a6a2d]">
                00 · CLIENT
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#071426] sm:text-2xl">
                {clientLocked ? "対象クライアント" : "クライアントを選択"}
              </h2>
              <p className="mt-2 max-w-xl text-[15px] leading-7 text-slate-500 sm:text-sm">
                {clientLocked
                  ? "クライアント詳細から引き継いだ対象です。氏名の再入力は不要です。"
                  : "ダッシュボードなどから開始した場合は、先に対象クライアントを選んでください。"}
              </p>
            </div>
            <div className="px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
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
                <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
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
            <div className="border-b border-slate-100 px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
              <p className="text-[11px] font-semibold tracking-[0.26em] text-[#8a6a2d]">
                00 · PROFILE
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#071426] sm:text-2xl">
                クライアント基本情報
              </h2>
              <p className="mt-2 max-w-xl text-[15px] leading-7 text-slate-500 sm:text-sm">
                年齢・性別は分析精度のため必須です。身長・体重は推奨、その他は任意です。
              </p>
            </div>
            <div className="space-y-8 px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
              <FormGroup
                title="必須"
                description="Medical Report の評価で年齢・性別を考慮します"
              >
                <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
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
                <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
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
                description="日常の習慣・既往。当日の飲酒・運動・鼻づまりとは別に扱います"
              >
                <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
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

          {/* 01 SOXAI */}
          <section className="overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.28)]">
            <div className="border-b border-slate-100 px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.26em] text-[#8a6a2d]">
                    01 · SOXAI DATA
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#071426] sm:text-2xl">
                    SOXAIデータをアップロード
                  </h2>
                  <p className="mt-2 max-w-xl text-[15px] leading-7 text-slate-500 sm:text-sm sm:leading-7">
                    睡眠サマリー、心拍・HRV、ストレス、SpO₂などの画面を
                    そのまま撮影・保存してアップロードしてください。最大{MAX_FILES}
                    枚まで同時に送れます。各画像を個別に読み取り、結果を1つに統合します。
                  </p>
                </div>
                <p className="shrink-0 text-xs font-medium text-slate-400">
                  JPG / JPEG / PNG / WEBP · 最大{MAX_FILES}枚 · 必須
                </p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6 lg:gap-3">
                {soxaiMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-2xl border border-slate-100 bg-[#fafaf8] px-3 py-3.5 text-center sm:px-4 sm:py-4"
                  >
                    <p className="text-[13px] font-semibold tracking-[-0.02em] text-[#071426] sm:text-sm">
                      {metric.label}
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-slate-400">
                      {metric.hint}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-center text-[12px] text-slate-400 sm:text-left">
                順番は問いません。同じ項目が複数画像にある場合は最も信頼できる値を採用し、不足項目は他画像から補完します。
              </p>
            </div>

            <div className="px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-9">
              <label
                onDragEnter={() => setIsDragging(true)}
                onDragLeave={() => setIsDragging(false)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                className={`flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed px-5 text-center transition duration-300 sm:min-h-[260px] ${
                  uploadMissing
                    ? "border-rose-300 bg-rose-50/40"
                    : isDragging
                      ? "border-[#315f68] bg-[#315f68]/5"
                      : "border-slate-200 bg-[#fafaf8] hover:border-[#315f68]/60 hover:bg-white"
                }`}
              >
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#315f68]/15 bg-white text-[#315f68] shadow-[0_12px_30px_-18px_rgba(49,95,104,0.5)] sm:h-16 sm:w-16">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="h-6 w-6"
                    aria-hidden
                  >
                    <path d="M12 16V5M7.5 9.5 12 5l4.5 4.5" />
                    <path d="M5 19h14" />
                  </svg>
                </div>

                <p className="mt-5 text-lg font-semibold tracking-[-0.02em] text-[#071426] sm:text-xl">
                  画像を選択またはドロップ
                </p>
                <p className="mt-2 text-[15px] leading-6 text-slate-500 sm:text-sm">
                  各画面を個別に読み取り、結果を自動で統合します
                </p>
              </label>

              {uploadMissing && (
                <p className="mt-3 text-sm font-medium text-rose-600">
                  画像のアップロードは必須です
                </p>
              )}

              {previewUrls.length > 0 && (
                <div className="mt-6">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[15px] font-semibold text-[#071426] sm:text-sm">
                      アップロード済み
                    </p>
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-slate-400">
                        {previewUrls.length} / {MAX_FILES} 枚
                      </p>
                      <button
                        type="button"
                        onClick={clearAllFiles}
                        className="text-[12px] font-semibold text-slate-500 transition hover:text-rose-600"
                      >
                        すべて削除
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {previewUrls.map((url, index) => (
                      <div
                        key={`${files[index]?.name}-${index}`}
                        className="group relative aspect-[9/16] overflow-hidden rounded-[18px] border border-slate-200 bg-slate-100"
                      >
                        <Image
                          src={url}
                          alt={`SOXAI画像 ${index + 1}`}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#071426]/80 text-base text-white backdrop-blur transition hover:bg-[#071426]"
                          aria-label={`画像${index + 1}を削除`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 02 Lifestyle */}
          <section className="overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.28)]">
            <div className="border-b border-slate-100 px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
              <p className="text-[11px] font-semibold tracking-[0.26em] text-[#8a6a2d]">
                02 · LIFESTYLE
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#071426] sm:text-2xl">
                生活習慣を入力
              </h2>
              <p className="mt-2 max-w-xl text-[15px] leading-7 text-slate-500 sm:text-sm">
                上から順に入力してください。必須項目以外は分かる範囲で構いません。
              </p>
            </div>

            <div className="space-y-9 px-5 py-6 sm:space-y-10 sm:px-8 sm:py-8 lg:px-10 lg:py-9">
              <FormGroup
                title="測定日"
                description="レポートに表示される測定日です。対象者は上のクライアント欄で設定済みです"
              >
                <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
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
                <p className="rounded-2xl border border-[#315f68]/15 bg-[#f4f7f7] px-4 py-3.5 text-[15px] leading-7 text-slate-600 sm:text-sm">
                  次の画面で抽出結果を確認できます。画像から取れなかった項目だけ、そこで手入力してください。画像にある値は手入力より優先されます。
                </p>
              </FormGroup>

              <FormGroup
                title="ヨガ"
                description="実施時間と時刻・時間帯が分かると睡眠との関係を見やすくなります"
              >
                <div className="rounded-2xl border border-slate-100 bg-[#fafaf8] px-4 py-4 sm:px-5">
                  <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                    <Field label="実施したか" optional>
                      <select
                        name="yogaDone"
                        className={inputClass}
                        value={yogaDone}
                        onChange={(event) => setYogaDone(event.target.value)}
                      >
                        <option value="">選択してください</option>
                        <option value="none">していない</option>
                        <option value="yes">実施した</option>
                      </select>
                    </Field>
                    {yogaDone === "yes" && (
                      <>
                        <Field label="実施時間（分）" optional>
                          <input
                            name="yogaDuration"
                            type="number"
                            min={1}
                            inputMode="numeric"
                            className={inputClass}
                            placeholder="例：30"
                          />
                        </Field>
                        <Field label="実施した時刻または時間帯" optional>
                          <input
                            name="yogaTime"
                            type="text"
                            className={inputClass}
                            placeholder="例：7:30〜8:00 / 朝"
                          />
                        </Field>
                        <div className="sm:col-span-2">
                          <Field label="補足" optional>
                            <textarea
                              name="yogaNotes"
                              rows={2}
                              className={textareaClass}
                              placeholder="例：穏やかな呼吸中心、就寝前のストレッチなど"
                            />
                          </Field>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </FormGroup>

              <FormGroup
                title="ピラティス"
                description="実施時間と時刻・時間帯を区別して入力できます"
              >
                <div className="rounded-2xl border border-slate-100 bg-[#fafaf8] px-4 py-4 sm:px-5">
                  <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                    <Field label="実施したか" optional>
                      <select
                        name="pilatesDone"
                        className={inputClass}
                        value={pilatesDone}
                        onChange={(event) => setPilatesDone(event.target.value)}
                      >
                        <option value="">選択してください</option>
                        <option value="none">していない</option>
                        <option value="yes">実施した</option>
                      </select>
                    </Field>
                    {pilatesDone === "yes" && (
                      <>
                        <Field label="実施時間（分）" optional>
                          <input
                            name="pilatesDuration"
                            type="number"
                            min={1}
                            inputMode="numeric"
                            className={inputClass}
                            placeholder="例：55"
                          />
                        </Field>
                        <Field label="実施した時刻または時間帯" optional>
                          <input
                            name="pilatesTime"
                            type="text"
                            className={inputClass}
                            placeholder="例：13:05〜14:00 / 日中"
                          />
                        </Field>
                        <div className="sm:col-span-2">
                          <Field label="補足" optional>
                            <textarea
                              name="pilatesNotes"
                              rows={2}
                              className={textareaClass}
                              placeholder="例：マシンピラティス、強度など"
                            />
                          </Field>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </FormGroup>

              <FormGroup
                title="その他の運動"
                description="ヨガ・ピラティス以外の運動（ウォーキング、筋力トレーニングなど）"
              >
                <div className="space-y-4">
                  <Field label="運動したか" optional>
                    <select
                      name="otherExerciseDone"
                      className={inputClass}
                      value={otherExerciseDone}
                      onChange={(event) =>
                        setOtherExerciseDone(event.target.value)
                      }
                    >
                      <option value="">選択してください</option>
                      <option value="none">していない</option>
                      <option value="yes">した</option>
                    </select>
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
                                className="text-[13px] font-medium text-slate-400 transition hover:text-rose-600"
                              >
                                削除
                              </button>
                            )}
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
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
                            <Field label="実施時間（分）" optional>
                              <input
                                type="number"
                                min={1}
                                inputMode="numeric"
                                value={entry.duration}
                                onChange={(event) =>
                                  updateOtherExercise(
                                    entry.id,
                                    "duration",
                                    event.target.value,
                                  )
                                }
                                className={inputClass}
                                placeholder="例：40"
                              />
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
                        className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-[15px] font-semibold text-[#071426] transition hover:bg-slate-50 sm:text-sm"
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
                <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                  <Field label="入浴" optional>
                    <select name="bathing" className={inputClass} defaultValue="">
                      <option value="">選択してください</option>
                      <option value="none">なし</option>
                      <option value="shower">シャワー</option>
                      <option value="bath">湯船</option>
                    </select>
                  </Field>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-100 bg-[#fafaf8] px-4 py-4 sm:px-5">
                  <p className="text-[15px] font-semibold text-[#071426] sm:text-sm">
                    カフェイン
                  </p>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2 sm:gap-5">
                    <Field label="摂取したか" optional>
                      <select
                        name="caffeineDone"
                        className={inputClass}
                        value={caffeineDone}
                        onChange={(event) =>
                          setCaffeineDone(event.target.value)
                        }
                      >
                        <option value="">選択してください</option>
                        <option value="none">していない</option>
                        <option value="yes">摂取した</option>
                      </select>
                    </Field>
                    {caffeineDone === "yes" && (
                      <>
                        <Field label="種類" optional>
                          <select
                            name="caffeineType"
                            className={inputClass}
                            defaultValue=""
                          >
                            <option value="">選択してください</option>
                            {caffeineTypeOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="量" optional>
                          <input
                            name="caffeineAmount"
                            type="text"
                            className={inputClass}
                            placeholder="例：コーヒー2杯 / 緑茶500ml"
                          />
                        </Field>
                        <Field label="飲んだ時刻" optional>
                          <input
                            name="caffeineTime"
                            type="text"
                            className={inputClass}
                            placeholder="例：15:30 / 午後"
                          />
                        </Field>
                        <div className="sm:col-span-2">
                          <Field label="補足" optional>
                            <textarea
                              name="caffeineNotes"
                              rows={2}
                              className={textareaClass}
                              placeholder="例：午後に追加で緑茶1杯、など複数回の場合"
                            />
                          </Field>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </FormGroup>

              <FormGroup
                title="食事"
                description="食べた／食べていないを選び、食べた場合のみ時間と内容を入力"
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
                        <p className="text-[15px] font-semibold text-[#071426] sm:text-sm">
                          {label}
                        </p>
                        <div className="mt-3 grid gap-4 sm:grid-cols-2 sm:gap-5">
                          <Field label={`${label}を食べたか`} optional>
                            <select
                              name={eatenName}
                              className={inputClass}
                              value={eatenValue}
                              onChange={(event) => setEaten(event.target.value)}
                            >
                              <option value="">選択してください</option>
                              <option value="yes">食べた</option>
                              <option value="none">食べていない</option>
                            </select>
                          </Field>
                          {eatenValue === "yes" && (
                            <>
                              <Field label={`${label}時間`} optional>
                                <input
                                  name={timeName}
                                  type="time"
                                  className={inputClass}
                                />
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
                            </>
                          )}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </FormGroup>

              <FormGroup
                title="飲酒"
                description="有無に加えて、種類・量・終了時刻があると精度が上がります"
              >
                <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                  <Field label="飲酒したか" optional>
                    <select
                      name="alcoholDrank"
                      className={inputClass}
                      value={alcoholDrank}
                      onChange={(event) => setAlcoholDrank(event.target.value)}
                    >
                      <option value="">選択してください</option>
                      <option value="none">なし</option>
                      <option value="yes">あり</option>
                    </select>
                  </Field>
                  {alcoholDrank === "yes" && (
                    <>
                      <Field label="種類" optional>
                        <input
                          name="alcoholType"
                          type="text"
                          className={inputClass}
                          placeholder="例：ビール"
                        />
                      </Field>
                      <Field label="量" optional>
                        <input
                          name="alcoholAmount"
                          type="text"
                          className={inputClass}
                          placeholder="例：500ml"
                        />
                      </Field>
                      <Field label="飲み終わった時間" optional>
                        <input
                          name="alcoholEndTime"
                          type="time"
                          className={inputClass}
                        />
                      </Field>
                      <div className="sm:col-span-2">
                        <Field label="複数種類の補足" optional>
                          <textarea
                            name="alcoholNotes"
                            rows={2}
                            className={textareaClass}
                            placeholder="例：ビール500ml、缶チューハイ350ml"
                          />
                        </Field>
                      </div>
                    </>
                  )}
                </div>
              </FormGroup>

              <FormGroup
                title="コンディション"
                description="体調と生活背景。鼻づまりは呼吸・睡眠の連続性に影響します"
              >
                <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                  <Field label="体調" optional>
                    <input
                      name="condition"
                      type="text"
                      className={inputClass}
                      placeholder="疲労感、風邪症状など"
                    />
                  </Field>
                  <Field label="鼻づまり" optional>
                    <select
                      name="nasalCongestion"
                      className={inputClass}
                      defaultValue=""
                    >
                      <option value="">選択してください</option>
                      <option value="none">なし</option>
                      <option value="slight">少し</option>
                      <option value="severe">かなり</option>
                    </select>
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
                <p className="mb-4 rounded-2xl border border-slate-100 bg-[#fafaf8] px-4 py-3.5 text-[15px] leading-7 text-slate-600 sm:text-sm">
                  ストレスはSOXAIなどの測定データを参考に分析します。ご自身の体感を補足したい場合のみ入力してください。
                </p>
                <Field label="主観的なストレス・気分" optional>
                  <textarea
                    name="stress"
                    rows={3}
                    className={textareaClass}
                    placeholder="例：仕事の締切で少し張りつめていた、全体的に穏やかだった、など"
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
          <section className="relative overflow-hidden rounded-[28px] bg-[#071426] px-5 py-8 text-center shadow-[0_30px_90px_-40px_rgba(7,20,38,0.55)] sm:px-10 sm:py-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(49,95,104,0.35),transparent_55%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(216,179,106,0.2),transparent_45%)]" />

            <div className="relative z-10">
              {error && (
                <p className="mb-5 text-[15px] font-medium text-rose-300 sm:text-sm">
                  {error}
                </p>
              )}

              <p className="text-[11px] font-semibold tracking-[0.28em] text-[#d8b36a]">
                SOXAI AUTO READ
              </p>
              <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-white sm:text-2xl">
                画像を読み取り、結果を確認する
              </h2>
              <p className="mx-auto mt-3 max-w-md text-[15px] leading-7 text-white/60 sm:text-sm">
                必須：SOXAI画像（最大{MAX_FILES}枚）・対象者名・測定日・年齢・性別。各画像を個別解析して統合後、確認画面へ進みます。
              </p>

              <button
                type="submit"
                disabled={isSubmitting}
                className="group mt-7 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-full bg-white px-10 py-4 text-base font-semibold text-[#071426] shadow-[0_18px_50px_-20px_rgba(255,255,255,0.55)] transition duration-500 hover:-translate-y-1 hover:bg-[#f4f4f4] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:mt-8 sm:w-auto sm:px-12 sm:py-5 sm:text-lg"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#071426]/20 border-t-[#071426]" />
                    SOXAI画像を解析中...
                  </>
                ) : (
                  <>
                    画像を解析して確認へ
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
    <label className="block">
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
    </label>
  );
}
