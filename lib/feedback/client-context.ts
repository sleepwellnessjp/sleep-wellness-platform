import { APP_VERSION } from "@/lib/app-version";
import type { FeedbackDeviceType, FeedbackTargetScreen } from "./types";
import { FEEDBACK_TARGET_SCREEN_LABELS } from "./constants";

export type FeedbackClientContext = {
  currentUrl: string;
  screenName: string;
  suggestedTargetScreen: FeedbackTargetScreen;
  deviceType: FeedbackDeviceType;
  deviceLabel: string;
  browserName: string;
  browserInfo: string;
  appVersion: string;
};

function detectDeviceType(ua: string): FeedbackDeviceType {
  const lower = ua.toLowerCase();
  if (/ipad|tablet|kindle|playbook|silk|(android(?!.*mobile))/.test(lower)) {
    return "tablet";
  }
  if (
    /iphone|ipod|android.*mobile|windows phone|blackberry|bb10|opera mini|mobile/.test(
      lower,
    )
  ) {
    return "mobile";
  }
  return "pc";
}

function deviceTypeLabel(type: FeedbackDeviceType): string {
  switch (type) {
    case "mobile":
      return "スマホ";
    case "tablet":
      return "タブレット";
    case "pc":
      return "PC";
    default:
      return "";
  }
}

function detectBrowserName(ua: string): string {
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return "Opera";
  if (/firefox\//i.test(ua)) return "Firefox";
  if (/crios\//i.test(ua)) return "Chrome (iOS)";
  if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) return "Chrome";
  if (/safari\//i.test(ua) && !/chrome\//i.test(ua) && !/crios\//i.test(ua)) {
    return "Safari";
  }
  return "その他";
}

function pathToTargetScreen(pathname: string): FeedbackTargetScreen {
  if (pathname.startsWith("/demo")) return "demo_mode";
  if (pathname.startsWith("/dashboard")) return "dashboard";
  if (pathname.startsWith("/clients")) return "clients";
  if (pathname.startsWith("/analysis")) return "analysis";
  if (pathname.startsWith("/reports") || pathname.startsWith("/report")) {
    return "report";
  }
  if (pathname.startsWith("/journey")) return "journey";
  if (pathname.startsWith("/homework")) return "homework";
  if (pathname.includes("follow")) return "follow_up";
  if (pathname.includes("ai") || pathname.includes("assistant")) {
    return "ai_assistant";
  }
  return "other";
}

function pathToScreenName(
  pathname: string,
  target: FeedbackTargetScreen,
): string {
  if (pathname.startsWith("/feedback")) return "βテスト フィードバック";
  if (pathname.startsWith("/settings")) return "設定";
  if (pathname.startsWith("/notifications")) return "通知";
  if (pathname.startsWith("/admin")) return "管理者画面";
  return FEEDBACK_TARGET_SCREEN_LABELS[target];
}

/** ブラウザ上で取得可能な送信コンテキストを組み立てる */
export function collectFeedbackClientContext(
  searchParams?: URLSearchParams | null,
): FeedbackClientContext {
  if (typeof window === "undefined") {
    return {
      currentUrl: "",
      screenName: "",
      suggestedTargetScreen: "other",
      deviceType: "",
      deviceLabel: "",
      browserName: "",
      browserInfo: "",
      appVersion: APP_VERSION,
    };
  }

  const ua = navigator.userAgent || "";
  const pathname = window.location.pathname || "/";
  const fromPath = searchParams?.get("from")?.trim() || "";
  const contextPath =
    fromPath.startsWith("/") && !fromPath.startsWith("//") ? fromPath : pathname;
  const fromParam = searchParams?.get("screen")?.trim() ?? "";
  const suggested =
    fromParam &&
    (Object.keys(FEEDBACK_TARGET_SCREEN_LABELS) as FeedbackTargetScreen[]).includes(
      fromParam as FeedbackTargetScreen,
    )
      ? (fromParam as FeedbackTargetScreen)
      : pathToTargetScreen(contextPath);

  const deviceType = detectDeviceType(ua);
  const browserName = detectBrowserName(ua);

  return {
    currentUrl: fromPath
      ? `${window.location.origin}${fromPath}`
      : window.location.href,
    screenName: pathToScreenName(contextPath, suggested),
    suggestedTargetScreen: suggested,
    deviceType,
    deviceLabel: deviceTypeLabel(deviceType),
    browserName,
    browserInfo: ua.slice(0, 500),
    appVersion: APP_VERSION,
  };
}
