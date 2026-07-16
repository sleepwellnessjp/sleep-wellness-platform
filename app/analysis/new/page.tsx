"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";
import { setPendingAnalysisRequest } from "@/lib/analysis-session";

const inputClass =
  "mt-2.5 w-full rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3.5 text-[15px] text-[#071426] outline-none transition duration-300 placeholder:text-slate-400 focus:border-[#315f68] focus:bg-white focus:ring-4 focus:ring-[#315f68]/10 sm:px-5 sm:py-4 sm:text-base";

const textareaClass =
  "mt-2.5 w-full resize-none rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3.5 text-[15px] leading-7 text-[#071426] outline-none transition duration-300 placeholder:text-slate-400 focus:border-[#315f68] focus:bg-white focus:ring-4 focus:ring-[#315f68]/10 sm:px-5 sm:py-4 sm:text-base";

const soxaiMetrics = [
  { label: "入眠・起床", hint: "画像から自動読取" },
  { label: "睡眠時間", hint: "総睡眠・在床時間" },
  { label: "深い睡眠", hint: "Deep Sleep" },
  { label: "睡眠効率", hint: "効率・連続性" },
  { label: "HRV", hint: "心拍変動" },
  { label: "ストレス", hint: "日中・夜間" },
];

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

export default function NewAnalysisPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  const addFiles = (selectedFiles: File[]) => {
    const validFiles = selectedFiles.filter((file) =>
      ["image/jpeg", "image/png"].includes(file.type),
    );

    setFiles((currentFiles) => [...currentFiles, ...validFiles]);
    setError(null);
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (files.length === 0) {
      setError("SOXAI画像を1枚以上アップロードしてください。");
      return;
    }

    const formData = new FormData(event.currentTarget);

    setIsSubmitting(true);

    try {
      const images = await Promise.all(files.map(fileToDataUrl));

      const lifestyle = {
        clientName: String(formData.get("clientName") ?? ""),
        measurementDate: String(formData.get("measurementDate") ?? ""),
        bedtime: String(formData.get("bedtime") ?? ""),
        wakeTime: String(formData.get("wakeTime") ?? ""),
        exercise: String(formData.get("exercise") ?? ""),
        yoga: String(formData.get("yoga") ?? ""),
        bathing: String(formData.get("bathing") ?? ""),
        alcohol: String(formData.get("alcohol") ?? ""),
        caffeine: String(formData.get("caffeine") ?? ""),
        stress: String(formData.get("stress") ?? ""),
        meals: String(formData.get("meals") ?? ""),
        work: String(formData.get("work") ?? ""),
        condition: String(formData.get("condition") ?? ""),
        nasalCongestion: String(formData.get("nasalCongestion") ?? ""),
        notes: String(formData.get("notes") ?? ""),
      };

      setPendingAnalysisRequest({ lifestyle, images });
      router.push("/analysis/loading");
    } catch {
      setError("画像の準備に失敗しました。もう一度お試しください。");
      setIsSubmitting(false);
    }
  };

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
          <p className="text-[10px] font-semibold tracking-[0.22em] text-[#8a6a2d] sm:text-xs sm:tracking-[0.28em]">
            AI ANALYSIS
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14 lg:py-16">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold tracking-[0.32em] text-[#8a6a2d]">
            SLEEP WELLNESS ANALYSIS
          </p>

          <h1 className="mt-4 text-[2rem] font-semibold tracking-[-0.05em] text-[#071426] sm:mt-5 sm:text-4xl lg:text-5xl">
            新しい睡眠分析
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:mt-5 sm:text-base sm:leading-8">
            SOXAIの画面と生活習慣を入力すると、
            Sleep Wellness Report を作成します。
          </p>
        </header>

        <form onSubmit={handleSubmit} className="mt-10 space-y-8 sm:mt-12 sm:space-y-10">
          {/* SOXAI Data */}
          <section className="overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.28)] sm:rounded-[32px]">
            <div className="border-b border-slate-100 px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.26em] text-[#8a6a2d]">
                    01 · SOXAI DATA
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#071426] sm:text-2xl">
                    SOXAIデータをアップロード
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-7 text-slate-500">
                    睡眠サマリー、心拍・HRV、ストレス、SpO₂などの画面を
                    そのまま撮影・保存してアップロードしてください。
                  </p>
                </div>
                <p className="shrink-0 text-xs font-medium text-slate-400">
                  JPG / PNG · 複数枚可
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
                    <p className="mt-1 text-[10px] leading-4 text-slate-400 sm:text-[11px]">
                      {metric.hint}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-9">
              <label
                onDragEnter={() => setIsDragging(true)}
                onDragLeave={() => setIsDragging(false)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                className={`flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed px-5 text-center transition duration-300 sm:min-h-[280px] sm:rounded-[28px] ${
                  isDragging
                    ? "border-[#315f68] bg-[#315f68]/5"
                    : "border-slate-200 bg-[#fafaf8] hover:border-[#315f68]/60 hover:bg-white"
                }`}
              >
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
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
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  睡眠・心拍・ストレス画面をまとめて追加できます
                </p>
              </label>

              {previewUrls.length > 0 && (
                <div className="mt-6">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#071426]">
                      アップロード済み
                    </p>
                    <p className="text-xs text-slate-400">
                      {previewUrls.length} 枚
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {previewUrls.map((url, index) => (
                      <div
                        key={`${files[index]?.name}-${index}`}
                        className="group relative aspect-[9/16] overflow-hidden rounded-[18px] border border-slate-200 bg-slate-100 sm:rounded-[20px]"
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
                          className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-[#071426]/80 text-sm text-white backdrop-blur transition hover:bg-[#071426]"
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

          {/* Lifestyle */}
          <section className="overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.28)] sm:rounded-[32px]">
            <div className="border-b border-slate-100 px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
              <p className="text-[11px] font-semibold tracking-[0.26em] text-[#8a6a2d]">
                02 · LIFESTYLE
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#071426] sm:text-2xl">
                生活習慣を入力
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-7 text-slate-500">
                数値だけでは分からない背景を、できるだけ具体的に記入してください。
              </p>
            </div>

            <div className="space-y-8 px-5 py-6 sm:space-y-10 sm:px-8 sm:py-8 lg:px-10 lg:py-9">
              <FormGroup title="基本情報" description="対象者と測定日">
                <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                  <Field label="対象者名" required>
                    <input
                      name="clientName"
                      type="text"
                      required
                      className={inputClass}
                      placeholder="例：山田 太郎"
                    />
                  </Field>
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
                title="睡眠リズム"
                description="入眠・起床は任意入力"
              >
                <p className="mb-4 rounded-2xl border border-[#315f68]/15 bg-[#f4f7f7] px-4 py-3.5 text-sm leading-7 text-slate-600">
                  画像から自動で読み取ります。読み取れない場合のみ入力してください。
                </p>
                <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                  <Field label="入眠時間" optional>
                    <input name="bedtime" type="time" className={inputClass} />
                  </Field>
                  <Field label="起床時間" optional>
                    <input name="wakeTime" type="time" className={inputClass} />
                  </Field>
                </div>
              </FormGroup>

              <FormGroup title="日常習慣" description="運動・入浴・刺激物など">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
                  <Field label="運動">
                    <select name="exercise" className={inputClass}>
                      <option value="">選択してください</option>
                      <option value="none">なし</option>
                      <option value="light">軽い</option>
                      <option value="moderate">普通</option>
                      <option value="intense">激しい</option>
                    </select>
                  </Field>
                  <Field label="ヨガ">
                    <select name="yoga" className={inputClass}>
                      <option value="">選択してください</option>
                      <option value="none">なし</option>
                      <option value="10">10分</option>
                      <option value="20">20分</option>
                      <option value="30plus">30分以上</option>
                    </select>
                  </Field>
                  <Field label="入浴">
                    <select name="bathing" className={inputClass}>
                      <option value="">選択してください</option>
                      <option value="none">なし</option>
                      <option value="shower">シャワー</option>
                      <option value="bath">湯船</option>
                    </select>
                  </Field>
                  <Field label="飲酒">
                    <select name="alcohol" className={inputClass}>
                      <option value="">選択してください</option>
                      <option value="none">なし</option>
                      <option value="small">少量</option>
                      <option value="moderate">普通</option>
                      <option value="high">多い</option>
                    </select>
                  </Field>
                  <Field label="カフェイン">
                    <select name="caffeine" className={inputClass}>
                      <option value="">選択してください</option>
                      <option value="none">なし</option>
                      <option value="morning">午前のみ</option>
                      <option value="afternoon">午後あり</option>
                      <option value="night">夜あり</option>
                    </select>
                  </Field>
                </div>
              </FormGroup>

              <FormGroup
                title="主観的なストレス・気分"
                description="測定データとは別に扱う任意の補足"
              >
                <p className="mb-4 rounded-2xl border border-slate-100 bg-[#fafaf8] px-4 py-3.5 text-sm leading-7 text-slate-600">
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

              <FormGroup title="コンディション" description="体調と生活背景">
                <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                  <Field label="体調">
                    <input
                      name="condition"
                      type="text"
                      className={inputClass}
                      placeholder="疲労感、風邪症状など"
                    />
                  </Field>
                  <Field label="鼻づまり">
                    <select name="nasalCongestion" className={inputClass}>
                      <option value="">選択してください</option>
                      <option value="none">なし</option>
                      <option value="slight">少し</option>
                      <option value="severe">かなり</option>
                    </select>
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="食事">
                      <textarea
                        name="meals"
                        rows={3}
                        className={textareaClass}
                        placeholder="食事内容や時間帯など"
                      />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="仕事・生活リズム">
                      <textarea
                        name="work"
                        rows={3}
                        className={textareaClass}
                        placeholder="勤務時間、帰宅時間、生活上の制約など"
                      />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="自由記述">
                      <textarea
                        name="notes"
                        rows={5}
                        className={textareaClass}
                        placeholder="本人の自覚、睡眠に関する気づきなど"
                      />
                    </Field>
                  </div>
                </div>
              </FormGroup>
            </div>
          </section>

          {/* CTA */}
          <section className="relative overflow-hidden rounded-[28px] bg-[#071426] px-5 py-8 text-center shadow-[0_30px_90px_-40px_rgba(7,20,38,0.55)] sm:rounded-[32px] sm:px-10 sm:py-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(49,95,104,0.35),transparent_55%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(216,179,106,0.2),transparent_45%)]" />

            <div className="relative z-10">
              {error && (
                <p className="mb-5 text-sm font-medium text-rose-300">{error}</p>
              )}

              <p className="text-[11px] font-semibold tracking-[0.28em] text-[#d8b36a]">
                READY TO ANALYZE
              </p>
              <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-white sm:text-2xl">
                AI分析を開始する
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-white/60">
                SOXAIデータと生活習慣から、Sleep Wellness Report を生成します。
              </p>

              <button
                type="submit"
                disabled={isSubmitting}
                className="group mt-7 inline-flex w-full items-center justify-center gap-3 rounded-full bg-white px-10 py-4 text-base font-semibold text-[#071426] shadow-[0_18px_50px_-20px_rgba(255,255,255,0.55)] transition duration-500 hover:-translate-y-1 hover:bg-[#f4f4f4] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:mt-8 sm:w-auto sm:px-12 sm:py-5 sm:text-lg"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#071426]/20 border-t-[#071426]" />
                    準備中...
                  </>
                ) : (
                  <>
                    AI分析を開始する
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
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-4 flex items-baseline gap-3 border-b border-slate-100 pb-3">
        <h3 className="text-base font-semibold tracking-[-0.02em] text-[#071426]">
          {title}
        </h3>
        <p className="text-xs text-slate-400">{description}</p>
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
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#071426]">
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
