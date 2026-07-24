"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import OsShell from "@/components/os/OsShell";
import Button from "@/components/ui/Button";
import SectionCard from "@/components/ui/SectionCard";
import { GOLD, NAVY } from "@/components/ui/tokens";
import { useAuth } from "@/lib/auth/use-auth";
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_SEVERITIES,
  FEEDBACK_SEVERITY_LABELS,
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_TARGET_SCREENS,
  FEEDBACK_TARGET_SCREEN_LABELS,
} from "@/lib/feedback/constants";
import { collectFeedbackClientContext } from "@/lib/feedback/client-context";
import type {
  FeedbackCategory,
  FeedbackRecord,
  FeedbackSeverity,
  FeedbackTargetScreen,
} from "@/lib/feedback/types";
import { usePlatformMe } from "@/lib/platform/use-platform-me";
import { normalizeOsRole, type OsRole } from "@/lib/os/roles";

const inputClass =
  "mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[16px] text-[#071426] outline-none transition focus:border-[#315f68] focus:ring-4 focus:ring-[#315f68]/10 sm:min-h-0 sm:text-[15px]";

const selectClass = `${inputClass} appearance-none`;

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FeedbackPage() {
  const { email, isDemoMode } = useAuth();
  const { data, loading: profileLoading } = usePlatformMe();
  const role: OsRole = normalizeOsRole(data?.profile.role ?? "instructor");

  const [category, setCategory] = useState<FeedbackCategory>("improvement");
  const [targetScreen, setTargetScreen] =
    useState<FeedbackTargetScreen>("dashboard");
  const [severity, setSeverity] = useState<FeedbackSeverity>("medium");
  const [usabilityRating, setUsabilityRating] = useState<number>(4);
  const [content, setContent] = useState("");
  const [reproductionSteps, setReproductionSteps] = useState("");
  const [device, setDevice] = useState("");
  const [browser, setBrowser] = useState("");

  const [currentUrl, setCurrentUrl] = useState("");
  const [screenName, setScreenName] = useState("");
  const [deviceType, setDeviceType] = useState("");
  const [browserInfo, setBrowserInfo] = useState("");
  const [appVersion, setAppVersion] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [history, setHistory] = useState<FeedbackRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const submittingRef = useRef(false);

  useEffect(() => {
    const ctx = collectFeedbackClientContext(
      new URLSearchParams(window.location.search),
    );
    setCurrentUrl(ctx.currentUrl);
    setScreenName(ctx.screenName);
    setDeviceType(ctx.deviceType);
    setBrowserInfo(ctx.browserInfo);
    setAppVersion(ctx.appVersion);
    setTargetScreen(ctx.suggestedTargetScreen);
    if (ctx.deviceLabel) setDevice(ctx.deviceLabel);
    if (ctx.browserName) setBrowser(ctx.browserName);
  }, []);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch("/api/feedback", { cache: "no-store" });
      const json = (await response.json()) as {
        feedback?: FeedbackRecord[];
        error?: string;
      };
      if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
      setHistory(json.feedback ?? []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          targetScreen,
          severity,
          usabilityRating,
          content,
          reproductionSteps,
          device,
          browser,
          currentUrl,
          screenName,
          deviceType,
          browserInfo,
          appVersion,
        }),
      });
      const json = (await response.json()) as {
        feedback?: FeedbackRecord;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(json.error ?? "送信に失敗しました");
      }
      setSuccess(true);
      setContent("");
      setReproductionSteps("");
      await loadHistory();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "送信に失敗しました");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const displayName =
    data?.profile.displayName ??
    (isDemoMode ? "デモ インストラクター" : null);
  const displayEmail = isDemoMode ? "demo@swij.local" : email;
  const submittedAtPreview = formatDateTime(new Date().toISOString());

  return (
    <OsShell
      role={role}
      contentClassName="mx-auto max-w-3xl px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-10 md:px-8 md:py-12 lg:py-14"
    >
      <header className="mb-8 sm:mb-10">
        <p
          className="text-[11px] font-semibold tracking-[0.28em]"
          style={{ color: GOLD }}
        >
          CLOSED BETA · FEEDBACK
        </p>
        <h1
          className="mt-3 break-words text-[1.65rem] font-semibold tracking-[-0.05em] sm:text-4xl"
          style={{ color: NAVY }}
        >
          Beta フィードバック
        </h1>
        <p className="mt-3 max-w-xl text-[14px] leading-7 text-slate-600 sm:text-[15px]">
          改善要望・不具合報告・新機能提案・使いやすさ評価（5段階）を送信できます。Closed Beta 運営に反映します。
        </p>
      </header>

      {success ? (
        <div
          className="mb-6 rounded-2xl border px-4 py-4 text-sm"
          style={{
            borderColor: "rgba(49,95,104,0.25)",
            backgroundColor: "#f4f7f7",
            color: "#315f68",
          }}
          role="status"
        >
          フィードバックを送信しました。ご協力ありがとうございます。
        </div>
      ) : null}

      {error ? (
        <div
          className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-5 sm:space-y-6">
        <SectionCard eyebrow="REPORT" title="フィードバック内容">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-[13px] font-semibold text-slate-600">
              カテゴリー
              <select
                className={selectClass}
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as FeedbackCategory)
                }
                required
              >
                {FEEDBACK_CATEGORIES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-[13px] font-semibold text-slate-600">
              対象画面
              <select
                className={selectClass}
                value={targetScreen}
                onChange={(event) =>
                  setTargetScreen(event.target.value as FeedbackTargetScreen)
                }
                required
              >
                {FEEDBACK_TARGET_SCREENS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-[13px] font-semibold text-slate-600 sm:col-span-2">
              重要度
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {FEEDBACK_SEVERITIES.map((item) => {
                  const active = severity === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setSeverity(item.value)}
                      className={`min-h-11 rounded-2xl border px-3 text-[14px] font-semibold transition ${
                        active
                          ? "border-transparent text-white"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                      style={
                        active ? { backgroundColor: NAVY } : undefined
                      }
                      aria-pressed={active}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </label>

            <fieldset className="sm:col-span-2">
              <legend className="text-[13px] font-semibold text-slate-600">
                使いやすさ評価（5段階）
              </legend>
              <div className="mt-2 grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((rating) => {
                  const active = usabilityRating === rating;
                  return (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setUsabilityRating(rating)}
                      className={`min-h-11 rounded-2xl border text-[14px] font-semibold tabular-nums transition ${
                        active
                          ? "border-transparent text-white"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                      style={active ? { backgroundColor: GOLD } : undefined}
                      aria-pressed={active}
                      aria-label={`${rating}点`}
                    >
                      {rating}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[12px] text-slate-400">
                1 = 使いにくい · 5 = とても使いやすい
              </p>
            </fieldset>

            <label className="block text-[13px] font-semibold text-slate-600 sm:col-span-2">
              内容
              <textarea
                className={`${inputClass} min-h-32 resize-y`}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="気づいた点を具体的に書いてください"
                required
                maxLength={5000}
              />
            </label>

            <label className="block text-[13px] font-semibold text-slate-600 sm:col-span-2">
              再現手順
              <textarea
                className={`${inputClass} min-h-28 resize-y`}
                value={reproductionSteps}
                onChange={(event) => setReproductionSteps(event.target.value)}
                placeholder="任意：どのように操作すると起きるか"
                maxLength={5000}
              />
            </label>

            <label className="block text-[13px] font-semibold text-slate-600">
              利用端末
              <input
                className={inputClass}
                value={device}
                onChange={(event) => setDevice(event.target.value)}
                placeholder="例: iPhone / PC"
                maxLength={120}
              />
            </label>

            <label className="block text-[13px] font-semibold text-slate-600">
              ブラウザ
              <input
                className={inputClass}
                value={browser}
                onChange={(event) => setBrowser(event.target.value)}
                placeholder="例: Safari"
                maxLength={120}
              />
            </label>
          </div>
        </SectionCard>

        <SectionCard eyebrow="AUTO" title="自動取得情報">
          <dl className="grid grid-cols-1 gap-3 text-[13px] sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-slate-500">送信日時（予定）</dt>
              <dd className="mt-1 text-slate-800">{submittedAtPreview}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">アプリ版</dt>
              <dd className="mt-1 text-slate-800">{appVersion || "—"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">送信者</dt>
              <dd className="mt-1 break-words text-slate-800">
                {profileLoading
                  ? "読み込み中…"
                  : `${displayName ?? "—"} / ${displayEmail ?? "—"}`}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">端末種別</dt>
              <dd className="mt-1 text-slate-800">
                {device || deviceType || "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-semibold text-slate-500">現在のURL</dt>
              <dd className="mt-1 break-all text-slate-800">
                {currentUrl || "—"}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">画面名</dt>
              <dd className="mt-1 text-slate-800">{screenName || "—"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">ブラウザ情報</dt>
              <dd className="mt-1 line-clamp-2 break-all text-slate-800">
                {browserInfo || "—"}
              </dd>
            </div>
          </dl>
        </SectionCard>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto"
          >
            {submitting ? "送信中…" : "フィードバックを送信"}
          </Button>
          <p className="text-[12px] text-slate-500">
            送信後は完了メッセージが表示されます。二重送信は防止されます。
          </p>
        </div>
      </form>

      <section className="mt-10 sm:mt-12">
        <SectionCard eyebrow="HISTORY" title="自分の送信履歴">
          {historyLoading ? (
            <p className="text-sm text-slate-400">読み込み中…</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-slate-500">まだ送信はありません。</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {history.map((item) => (
                <li key={item.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
                    <span>{formatDateTime(item.createdAt)}</span>
                    <span>·</span>
                    <span>{FEEDBACK_CATEGORY_LABELS[item.category]}</span>
                    <span>·</span>
                    <span>
                      {FEEDBACK_TARGET_SCREEN_LABELS[item.targetScreen]}
                    </span>
                    <span>·</span>
                    <span>
                      重要度 {FEEDBACK_SEVERITY_LABELS[item.severity]}
                    </span>
                    {item.usabilityRating != null ? (
                      <>
                        <span>·</span>
                        <span>使いやすさ {item.usabilityRating}/5</span>
                      </>
                    ) : null}
                    <span
                      className="rounded-full px-2 py-0.5 font-semibold"
                      style={{
                        backgroundColor: "rgba(7,20,38,0.06)",
                        color: NAVY,
                      }}
                    >
                      {FEEDBACK_STATUS_LABELS[item.status]}
                    </span>
                  </div>
                  <p className="mt-2 text-[14px] leading-6 text-slate-800">
                    {item.content}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </section>
    </OsShell>
  );
}
