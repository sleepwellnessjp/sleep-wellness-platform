"use client";

import type { WearableDevice } from "@/lib/wearable-analysis";
import { WEARABLE_DEVICES } from "@/lib/wearable-devices";

type DeviceSelectorProps = {
  value: WearableDevice | "manual" | null;
  onChange: (value: WearableDevice | "manual") => void;
  onContinue: () => void;
  error?: string | null;
};

export default function DeviceSelector({
  value,
  onChange,
  onContinue,
  error,
}: DeviceSelectorProps) {
  const selectedConfig = WEARABLE_DEVICES.find((d) => d.id === value);
  const canContinue =
    value === "manual" || Boolean(selectedConfig?.available);

  return (
    <div className="mx-auto max-w-3xl">
      <header className="text-center">
        <p className="text-[11px] font-semibold tracking-[0.28em] text-[#8a6a2d]">
          STEP 1 · DEVICE
        </p>
        <h1 className="mt-3 break-words text-[1.65rem] font-semibold leading-tight tracking-[-0.05em] text-[#071426] sm:mt-5 sm:text-4xl sm:leading-normal">
          使用しているデバイスを選択
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[14px] leading-6 text-slate-600 sm:mt-5 sm:text-base sm:leading-8">
          現在対応しているのは SOXAI RING と Oura Ring です。その他の機種は近日対応予定です。
        </p>
      </header>

      <section className="mt-8 sm:mt-10">
        <div className="grid gap-3 sm:grid-cols-2">
          {WEARABLE_DEVICES.map((device) => {
            const selected = value === device.id;
            const disabled = !device.available;
            return (
              <button
                key={device.id}
                type="button"
                disabled={disabled && !selected}
                onClick={() => {
                  if (!device.available) return;
                  onChange(device.id);
                }}
                aria-pressed={selected}
                className={`relative rounded-[24px] border px-5 py-5 text-left transition sm:px-6 sm:py-6 ${
                  selected
                    ? "border-[#071426] bg-[#071426] text-white shadow-[0_24px_60px_-40px_rgba(7,20,38,0.55)]"
                    : disabled
                      ? "cursor-not-allowed border-slate-200 bg-[#fafaf8] opacity-70"
                      : "border-slate-200 bg-white hover:border-[#315f68]/35 hover:bg-[#f4f7f7]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      className={`text-[10px] font-semibold tracking-[0.2em] ${
                        selected ? "text-[#d8b36a]" : "text-[#8a6a2d]"
                      }`}
                    >
                      {device.iconName.toUpperCase()}
                    </p>
                    <p
                      className={`mt-2 text-[16px] font-semibold tracking-[-0.02em] sm:text-lg ${
                        selected ? "text-white" : "text-[#071426]"
                      }`}
                    >
                      {device.displayName}
                    </p>
                    <p
                      className={`mt-2 text-[13px] leading-6 ${
                        selected ? "text-white/70" : "text-slate-500"
                      }`}
                    >
                      {device.shortDescription}
                    </p>
                  </div>
                  {device.available ? (
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        selected
                          ? "bg-white/15 text-white"
                          : "bg-[#315f68]/12 text-[#315f68]"
                      }`}
                    >
                      利用可
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-slate-200/70 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                      {device.comingSoonLabel ?? "近日対応"}
                    </span>
                  )}
                </div>
                {selected && device.available ? (
                  <p className="mt-4 text-[12px] font-medium text-[#d8b36a]">
                    推奨 {device.recommendedImageCount} 枚 · 選択中
                  </p>
                ) : null}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onChange("manual")}
          className={`mt-4 w-full rounded-[20px] border px-5 py-4 text-left transition ${
            value === "manual"
              ? "border-[#8a6a2d]/40 bg-[#faf7f1]"
              : "border-dashed border-slate-300 bg-white hover:border-[#8a6a2d]/35"
          }`}
        >
          <p className="text-[14px] font-semibold text-[#071426]">
            手入力で続ける
          </p>
          <p className="mt-1 text-[13px] text-slate-500">
            画像なしで生活習慣と睡眠データを入力します（既存機能）
          </p>
        </button>

        {value && !canContinue ? (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-[#fffbeb] px-4 py-3 text-[13px] text-amber-900">
            この機種は現在開発中です。今後のアップデートで対応予定です。
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-medium text-rose-700">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onContinue}
          disabled={!value || !canContinue}
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#071426] px-8 py-3.5 text-base font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {value === "manual"
            ? "手入力へ進む"
            : selectedConfig?.available
              ? "必要な画像のアップロードへ進む"
              : "デバイスを選択してください"}
        </button>
      </section>
    </div>
  );
}
