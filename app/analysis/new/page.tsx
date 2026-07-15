"use client";

import Image from "next/image";
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
  "mt-3 w-full rounded-2xl border border-slate-200 bg-[#fafaf8] px-5 py-4 text-base text-[#071426] outline-none transition duration-300 placeholder:text-slate-400 focus:border-[#315f68] focus:bg-white focus:ring-4 focus:ring-[#315f68]/10";

const textareaClass =
  "mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-[#fafaf8] px-5 py-4 text-base leading-7 text-[#071426] outline-none transition duration-300 placeholder:text-slate-400 focus:border-[#315f68] focus:bg-white focus:ring-4 focus:ring-[#315f68]/10";

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
    <main className="min-h-screen bg-[#fafaf8] py-16 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <header className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold tracking-[0.32em] text-[#8a6a2d]">
            SLEEP WELLNESS ANALYSIS
          </p>

          <h1 className="mt-6 text-4xl font-semibold tracking-[-0.05em] text-[#071426] sm:text-5xl lg:text-6xl">
            新しい睡眠分析
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            SOXAI画像と生活習慣を入力し、
            睡眠ウェルネスのAI分析を開始します。
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="mt-16 space-y-10 lg:mt-20"
        >
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-[36px] border border-slate-200 bg-white p-7 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.2)] sm:p-10">
              <p className="text-xs font-semibold tracking-[0.26em] text-[#8a6a2d]">
                SOXAI DATA
              </p>

              <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-[#071426]">
                SOXAI画像アップロード
              </h2>

              <label
                onDragEnter={() => setIsDragging(true)}
                onDragLeave={() => setIsDragging(false)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                className={`mt-8 flex min-h-[340px] cursor-pointer flex-col items-center justify-center rounded-[28px] border-2 border-dashed px-6 text-center transition duration-300 ${
                  isDragging
                    ? "border-[#315f68] bg-[#315f68]/5"
                    : "border-slate-300 bg-[#fafaf8] hover:border-[#315f68] hover:bg-white"
                }`}
              >
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#315f68]/20 bg-white text-3xl font-light text-[#315f68] shadow-sm">
                  ↑
                </div>

                <p className="mt-7 text-xl font-semibold text-[#071426]">
                  画像を選択
                </p>

                <p className="mt-3 text-sm leading-7 text-slate-500">
                  ドラッグ＆ドロップ、またはクリック
                  <br />
                  JPG・JPEG・PNG／複数枚対応
                </p>
              </label>

              {previewUrls.length > 0 && (
                <div className="mt-8 grid grid-cols-2 gap-4">
                  {previewUrls.map((url, index) => (
                    <div
                      key={`${files[index]?.name}-${index}`}
                      className="group relative aspect-[9/16] overflow-hidden rounded-[20px] border border-slate-200 bg-slate-100"
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
                        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#071426]/80 text-sm text-white backdrop-blur transition hover:bg-[#071426]"
                        aria-label={`画像${index + 1}を削除`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[36px] border border-slate-200 bg-white p-7 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.2)] sm:p-10 lg:p-12">
              <p className="text-xs font-semibold tracking-[0.26em] text-[#8a6a2d]">
                LIFESTYLE DATA
              </p>

              <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-[#071426]">
                基本情報・生活習慣
              </h2>

              <div className="mt-9 grid gap-6 md:grid-cols-2">
                <Field label="対象者名">
                  <input
                    name="clientName"
                    type="text"
                    required
                    className={inputClass}
                    placeholder="例：山田 太郎"
                  />
                </Field>

                <Field label="測定日">
                  <input
                    name="measurementDate"
                    type="date"
                    required
                    className={inputClass}
                  />
                </Field>

                <Field label="就寝時間">
                  <input
                    name="bedtime"
                    type="time"
                    className={inputClass}
                  />
                </Field>

                <Field label="起床時間">
                  <input
                    name="wakeTime"
                    type="time"
                    className={inputClass}
                  />
                </Field>

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

                <Field label="ストレス">
                  <select name="stress" className={inputClass}>
                    <option value="">1〜10で選択</option>
                    {Array.from({ length: 10 }, (_, index) => (
                      <option key={index + 1} value={index + 1}>
                        {index + 1}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="md:col-span-2">
                  <Field label="食事">
                    <textarea
                      name="meals"
                      rows={3}
                      className={textareaClass}
                      placeholder="食事内容や時間など"
                    />
                  </Field>
                </div>

                <div className="md:col-span-2">
                  <Field label="仕事">
                    <textarea
                      name="work"
                      rows={3}
                      className={textareaClass}
                      placeholder="勤務時間、仕事内容、帰宅時間など"
                    />
                  </Field>
                </div>

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

                <div className="md:col-span-2">
                  <Field label="自由記述">
                    <textarea
                      name="notes"
                      rows={6}
                      className={textareaClass}
                      placeholder="本人の自覚、睡眠に関する気づき、生活上の制約など"
                    />
                  </Field>
                </div>
              </div>
            </section>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white p-7 text-center shadow-[0_25px_80px_-45px_rgba(15,23,42,0.18)] sm:p-10">
            {error && (
              <p className="mb-6 text-sm font-medium text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-[#071426] px-10 py-5 text-base font-semibold text-white transition duration-300 hover:-translate-y-1 hover:bg-[#10233c] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:w-auto"
            >
              {isSubmitting ? "準備中..." : "AI分析を開始する"}
            </button>

            <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-slate-500">
              本システムは睡眠ウェルネス支援を目的としており、
              医療診断・治療を行うものではありません。
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#071426]">{label}</span>
      {children}
    </label>
  );
}
