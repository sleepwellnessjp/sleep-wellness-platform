"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { NAVY } from "@/components/ui/tokens";
import type { SleepContent } from "@/lib/sleep-content/types";

type Props = {
  title: string;
  items: SleepContent[];
  emptyMessage: string;
  defaultLoop: boolean;
};

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "再生時間: 未設定";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `再生時間: ${m}:${String(s).padStart(2, "0")}`;
}

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `容量: ${mb.toFixed(2)}MB`;
  const kb = bytes / 1024;
  return `容量: ${kb.toFixed(0)}KB`;
}

type SizeState =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ok"; bytes: number }
  | { state: "error" };

export default function SleepAudioSection({
  title,
  items,
  emptyMessage,
  defaultLoop,
}: Props) {
  const [loopById, setLoopById] = useState<Record<string, boolean>>({});
  const [sizeById, setSizeById] = useState<Record<string, SizeState>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const item of items) next[item.id] = defaultLoop;
    setLoopById(next);
  }, [items, defaultLoop]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      for (const item of items) {
        if (!item.audioUrl) continue;
        setSizeById((prev) => ({ ...prev, [item.id]: { state: "loading" } }));
        try {
          const response = await fetch(item.audioUrl, {
            method: "HEAD",
            signal: controller.signal,
          });
          const raw = response.headers.get("content-length");
          const bytes = raw ? Number(raw) : NaN;
          if (!cancelled && Number.isFinite(bytes) && bytes > 0) {
            setSizeById((prev) => ({ ...prev, [item.id]: { state: "ok", bytes } }));
          } else if (!cancelled) {
            setSizeById((prev) => ({ ...prev, [item.id]: { state: "error" } }));
          }
        } catch {
          if (!cancelled) {
            setSizeById((prev) => ({ ...prev, [item.id]: { state: "error" } }));
          }
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [items]);

  useEffect(() => {
    const stopAll = () => {
      Object.values(audioRefs.current).forEach((audio) => {
        if (!audio) return;
        if (!audio.paused) {
          audio.pause();
          audio.currentTime = 0;
        }
      });
    };
    window.addEventListener("pagehide", stopAll);
    window.addEventListener("beforeunload", stopAll);
    return () => {
      window.removeEventListener("pagehide", stopAll);
      window.removeEventListener("beforeunload", stopAll);
    };
  }, []);

  const empty = items.length === 0;
  const titleStyle = useMemo(() => ({ color: NAVY }), []);

  if (empty) {
    return (
      <section>
        <h2 className="text-xl font-semibold tracking-[-0.03em] sm:text-2xl" style={titleStyle}>
          {title}
        </h2>
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <p className="text-sm leading-6 text-slate-500">{emptyMessage}</p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-xl font-semibold tracking-[-0.03em] sm:text-2xl" style={titleStyle}>
        {title}
      </h2>
      <p className="mt-2 text-xs text-slate-500">再生は手動開始です。画面を閉じる/非表示にすると停止します。</p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const loop = loopById[item.id] ?? defaultLoop;
          const size = sizeById[item.id] ?? { state: "idle" };
          return (
            <li
              key={item.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              {item.coverImageUrl ? (
                <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.coverImageUrl} alt="" className="h-full w-full object-cover" />
                </div>
              ) : null}
              <div className="space-y-3 p-4">
                <h3 className="font-semibold leading-snug" style={titleStyle}>
                  {item.title}
                </h3>
                {item.summary ? (
                  <p className="text-sm leading-relaxed text-slate-600">{item.summary}</p>
                ) : null}
                <div className="text-xs text-slate-500">
                  <p>{formatDuration(item.durationSeconds)}</p>
                  <p>
                    {size.state === "ok"
                      ? formatBytes(size.bytes)
                      : size.state === "loading"
                        ? "容量: 取得中"
                        : "容量: 不明"}
                  </p>
                </div>
                {item.audioUrl ? (
                  <>
                    <label className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                      <span className="text-slate-600">ループ再生</span>
                      <input
                        type="checkbox"
                        checked={loop}
                        onChange={(e) =>
                          setLoopById((prev) => ({ ...prev, [item.id]: e.target.checked }))
                        }
                        className="h-4 w-4 accent-[#071426]"
                      />
                    </label>
                    <audio
                      ref={(el) => {
                        audioRefs.current[item.id] = el;
                      }}
                      controls
                      preload="none"
                      loop={loop}
                      className="w-full"
                      src={item.audioUrl}
                    />
                  </>
                ) : (
                  <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    音声を準備中です。
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
