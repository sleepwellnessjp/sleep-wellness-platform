"use client";

import { useEffect, useState } from "react";
import { shouldSkipHomeIntro } from "@/lib/home-intro";

const INTRO_SEEN_KEY = "swij-home-intro-seen";

/** HomeIntro 6s + fade 0.9s + Bridge 3s + fade 0.8s + buffer 0.3s */
const INTRO_FALLBACK_MS = 10900;

function introElementsGone(): boolean {
  if (typeof document === "undefined") return false;
  return (
    !document.querySelector("[data-swij-intro]") &&
    !document.querySelector("[data-swij-intro-bridge]") &&
    !document.documentElement.classList.contains("swij-intro-active")
  );
}

function shouldRevealImmediately(): boolean {
  if (shouldSkipHomeIntro()) return true;
  try {
    if (sessionStorage.getItem(INTRO_SEEN_KEY) === "1") return true;
  } catch {
    // ignore
  }
  return false;
}

/**
 * トップのイントロ演出完了後に true になる（初回マウント時のみ評価）。
 * prefers-reduced-motion は呼び出し側で扱う。
 */
export function useHomeIntroReady(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (shouldRevealImmediately()) {
      const id = requestAnimationFrame(() => setReady(true));
      return () => cancelAnimationFrame(id);
    }

    let cancelled = false;
    let fallbackId = 0;
    let pollId = 0;

    const finish = () => {
      if (cancelled) return;
      setReady(true);
    };

    const onIntroDone = () => finish();
    window.addEventListener("swij-home-intro-done", onIntroDone);

    const poll = () => {
      if (cancelled) return;
      if (introElementsGone()) {
        finish();
        return;
      }
      pollId = requestAnimationFrame(poll);
    };
    pollId = requestAnimationFrame(poll);

    fallbackId = window.setTimeout(finish, INTRO_FALLBACK_MS);

    return () => {
      cancelled = true;
      window.removeEventListener("swij-home-intro-done", onIntroDone);
      cancelAnimationFrame(pollId);
      window.clearTimeout(fallbackId);
    };
  }, []);

  return ready;
}
