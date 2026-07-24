"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DANGER, NAVY, SUCCESS } from "./tokens";

export type ToastTone = "success" | "error" | "info";

type ToastItem = {
  id: string;
  message: string;
  tone: ToastTone;
};

type ToastApi = {
  toast: (message: string, tone?: ToastTone) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const TONE_STYLE: Record<
  ToastTone,
  { bg: string; border: string; color: string; label: string }
> = {
  success: {
    bg: "rgba(15, 107, 92, 0.08)",
    border: "rgba(15, 107, 92, 0.22)",
    color: SUCCESS,
    label: "SUCCESS",
  },
  error: {
    bg: "rgba(163, 58, 58, 0.08)",
    border: "rgba(163, 58, 58, 0.22)",
    color: DANGER,
    label: "ERROR",
  },
  info: {
    bg: "rgba(7, 20, 38, 0.05)",
    border: "rgba(7, 20, 38, 0.12)",
    color: NAVY,
    label: "INFO",
  },
};

const AUTO_DISMISS_MS = 3200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = "info") => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setItems((current) => [...current.slice(-3), { id, message, tone }]);
      const timer = window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const timer of map.values()) window.clearTimeout(timer);
      map.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      toast,
      success: (message) => toast(message, "success"),
      error: (message) => toast(message, "error"),
      info: (message) => toast(message, "info"),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:items-end sm:px-6 sm:pb-8"
        aria-live="polite"
      >
        {items.map((item) => {
          const style = TONE_STYLE[item.tone];
          return (
            <div
              key={item.id}
              className="pointer-events-auto animate-fade-up w-full max-w-sm rounded-2xl border bg-white/95 px-4 py-3 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.45)] backdrop-blur-sm"
              style={{ borderColor: style.border, backgroundColor: style.bg }}
              role="status"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p
                    className="text-[9px] font-semibold tracking-[0.18em]"
                    style={{ color: style.color }}
                  >
                    {style.label}
                  </p>
                  <p
                    className="mt-1 break-words text-[13px] leading-5 font-medium sm:text-[14px]"
                    style={{ color: NAVY }}
                  >
                    {item.message}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-slate-400 transition active:bg-white/70 active:text-slate-600 sm:h-8 sm:w-8 sm:hover:bg-white/70 sm:hover:text-slate-600 sm:active:bg-transparent"
                  aria-label="閉じる"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toast: () => undefined,
      success: () => undefined,
      error: () => undefined,
      info: () => undefined,
    };
  }
  return ctx;
}
