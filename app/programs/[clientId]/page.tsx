"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState, type ReactNode } from "react";
import ImprovementSuggestionCards from "@/components/ImprovementSuggestionCards";
import InstructorNav from "@/components/InstructorNav";
import type { StoredAnalysis } from "@/lib/client-store";
import { getClientById } from "@/lib/repositories/client-repository";
import {
  createCustomMenuItem,
  createProgramGoal,
  formatProgramDate,
  getProgramDetail,
  PROGRAM_STATUS_LABELS,
  saveProgramDetail,
  statusBadgeStyle,
  type ProgramDetailView,
  type ProgramGoal,
  type ProgramMenuItem,
} from "@/lib/repositories/program-repository";

const NAVY = "#071426";
const GOLD = "#8a6a2d";

const inputClass =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3.5 text-[15px] text-[#071426] outline-none transition placeholder:text-slate-400 focus:border-[#315f68] focus:bg-white focus:ring-4 focus:ring-[#315f68]/10 sm:text-base";

const textareaClass =
  "mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3.5 text-[15px] leading-7 text-[#071426] outline-none transition placeholder:text-slate-400 focus:border-[#315f68] focus:bg-white focus:ring-4 focus:ring-[#315f68]/10 sm:text-base";

function Section({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200/90 bg-white px-5 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.22)] sm:px-8 sm:py-8">
      <div className="mb-5 border-b border-slate-100 pb-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2
            className="text-lg font-semibold tracking-[-0.03em] sm:text-xl"
            style={{ color: NAVY }}
          >
            {title}
          </h2>
          <p
            className="text-[10px] font-semibold tracking-[0.22em]"
            style={{ color: GOLD }}
          >
            {eyebrow}
          </p>
        </div>
        {description && (
          <p className="mt-2 text-[14px] leading-6 text-slate-500 sm:text-sm">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function MetricCell({
  label,
  value,
  large,
}: {
  label: string;
  value: string;
  large?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-[#fafaf8] px-4 py-3.5">
      <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400 sm:tracking-[0.16em]">
        {label}
      </p>
      <p
        className={`mt-1 font-semibold tracking-[-0.03em] ${
          large ? "text-2xl tracking-[-0.04em]" : "text-[15px] sm:text-base"
        }`}
        style={{ color: NAVY }}
      >
        {value}
      </p>
    </div>
  );
}

export default function ProgramDetailPage() {
  const params = useParams();
  const clientId = typeof params.clientId === "string" ? params.clientId : "";

  const [detail, setDetail] = useState<ProgramDetailView | null>(null);
  const [goals, setGoals] = useState<ProgramGoal[]>([]);
  const [menuItems, setMenuItems] = useState<ProgramMenuItem[]>([]);
  const [instructorMemo, setInstructorMemo] = useState("");
  const [customMenuLabel, setCustomMenuLabel] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [latestAnalysis, setLatestAnalysis] = useState<StoredAnalysis | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    if (!clientId) {
      setDetail(null);
      setLatestAnalysis(null);
      setReady(true);
      return;
    }

    setReady(false);

    const refresh = async () => {
      try {
        const [next, client] = await Promise.all([
          getProgramDetail(clientId),
          getClientById(clientId),
        ]);
        if (cancelled) return;
        setDetail(next);
        setLatestAnalysis(client?.analyses[0] ?? null);
        if (next) {
          setGoals(next.goals);
          setMenuItems(next.menuItems);
          setInstructorMemo(next.instructorMemo);
        }
      } catch (error) {
        console.error("[programs/detail] refresh failed:", error);
        if (!cancelled) {
          setDetail(null);
          setLatestAnalysis(null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    void refresh();

    const onUpdate = () => {
      void refresh();
    };
    window.addEventListener("storage", onUpdate);
    window.addEventListener("swij-clients-updated", onUpdate);
    window.addEventListener("swij-programs-updated", onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", onUpdate);
      window.removeEventListener("swij-clients-updated", onUpdate);
      window.removeEventListener("swij-programs-updated", onUpdate);
    };
  }, [clientId]);

  const addGoal = () => {
    setGoals((current) => [...current, createProgramGoal()]);
  };

  const updateGoal = (
    id: string,
    field: keyof Omit<ProgramGoal, "id">,
    value: string,
  ) => {
    setGoals((current) =>
      current.map((goal) =>
        goal.id === id ? { ...goal, [field]: value } : goal,
      ),
    );
  };

  const removeGoal = (id: string) => {
    setGoals((current) => current.filter((goal) => goal.id !== id));
  };

  const toggleMenuItem = (id: string) => {
    setMenuItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item,
      ),
    );
  };

  const removeCustomMenuItem = (id: string) => {
    setMenuItems((current) =>
      current.filter((item) => item.id !== id || !item.isCustom),
    );
  };

  const addCustomMenuItem = () => {
    const label = customMenuLabel.trim();
    if (!label) return;
    if (menuItems.some((item) => item.label === label)) {
      setError("同じメニュー名が既にあります。");
      return;
    }
    setMenuItems((current) => [...current, createCustomMenuItem(label)]);
    setCustomMenuLabel("");
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!clientId) return;

    setSaving(true);
    setError(null);
    setSavedMessage(null);

    try {
      const saved = await saveProgramDetail({
        clientId,
        goals: goals.filter((goal) => goal.goalName.trim()),
        menuItems,
        instructorMemo,
      });
      setDetail(saved);
      setGoals(saved.goals);
      setMenuItems(saved.menuItems);
      setInstructorMemo(saved.instructorMemo);
      setSavedMessage("保存しました");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "保存に失敗しました。",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5]">
        <p className="text-sm text-slate-400">読み込み中...</p>
      </main>
    );
  }

  if (!detail) {
    return (
      <main className="min-h-screen bg-[#f7f7f5]">
        <InstructorNav eyebrow="PROGRAMS" />
        <div className="mx-auto max-w-2xl px-5 py-20 text-center">
          <h1
            className="text-2xl font-semibold tracking-[-0.04em]"
            style={{ color: NAVY }}
          >
            プログラムが見つかりません
          </h1>
          <p className="mt-4 text-[15px] leading-7 text-slate-500">
            クライアントが存在しないか、URLが正しくありません。
          </p>
          <Link
            href="/programs"
            className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full px-8 py-3.5 text-base font-semibold text-white"
            style={{ backgroundColor: NAVY }}
          >
            一覧に戻る
          </Link>
        </div>
      </main>
    );
  }

  const badge = statusBadgeStyle(detail.status);

  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <InstructorNav eyebrow="PROGRAMS" />

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14 lg:py-16">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/programs"
              className="text-[13px] font-semibold text-slate-400 transition hover:text-[#071426]"
            >
              ← 改善プログラム一覧
            </Link>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <h1
                className="text-[1.85rem] font-semibold tracking-[-0.05em] sm:text-4xl"
                style={{ color: NAVY }}
              >
                {detail.clientName}
              </h1>
              <span
                className="rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                style={{
                  color: badge.color,
                  backgroundColor: badge.bg,
                  borderColor: badge.border,
                }}
              >
                {PROGRAM_STATUS_LABELS[detail.status]}
              </span>
            </div>
            <p className="mt-2 text-[15px] leading-7 text-slate-500 sm:text-base">
              改善目標・メニュー・インストラクターメモを管理します。
            </p>
          </div>
        </div>

        <section className="rounded-[28px] border border-slate-200/90 bg-white px-5 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.22)] sm:px-8 sm:py-8">
          <div className="mb-5 flex items-baseline justify-between gap-3 border-b border-slate-100 pb-4">
            <h2
              className="text-lg font-semibold tracking-[-0.03em] sm:text-xl"
              style={{ color: NAVY }}
            >
              プログラム概要
            </h2>
            <p
              className="text-[10px] font-semibold tracking-[0.22em]"
              style={{ color: GOLD }}
            >
              OVERVIEW
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <MetricCell
              label="最新睡眠スコア"
              value={
                detail.latestSleepScore != null
                  ? String(detail.latestSleepScore)
                  : "—"
              }
              large
            />
            <MetricCell
              label="分析日"
              value={formatProgramDate(detail.latestAnalysisDate)}
            />
            <MetricCell
              label="開始日"
              value={formatProgramDate(detail.startDate)}
            />
            <MetricCell label="現在のフェーズ" value={detail.currentPhase} />
            <MetricCell
              label="次回フォロー日"
              value={formatProgramDate(detail.nextFollowUpDate)}
            />
            <MetricCell label="進捗状況" value={detail.progressLabel} />
          </div>
        </section>

        <div className="mt-8">
          <ImprovementSuggestionCards
            analysis={latestAnalysis}
            analysisDate={detail.latestAnalysisDate}
            menuItems={menuItems}
            onMenuItemsChange={setMenuItems}
          />
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          <Section
            eyebrow="GOALS"
            title="改善目標"
            description="目標名・現在値・目標値・期限を設定できます。"
          >
            {goals.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-[#fafaf8] px-5 py-8 text-center text-sm text-slate-500">
                改善目標がまだありません。下のボタンから追加してください。
              </p>
            ) : (
              <div className="space-y-4">
                {goals.map((goal, index) => (
                  <div
                    key={goal.id}
                    className="rounded-[22px] border border-slate-100 bg-[#fafaf8] px-4 py-4 sm:px-5 sm:py-5"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p
                        className="text-[15px] font-semibold sm:text-sm"
                        style={{ color: NAVY }}
                      >
                        目標 {index + 1}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeGoal(goal.id)}
                        className="text-[13px] font-medium text-slate-400 transition hover:text-rose-600"
                      >
                        削除
                      </button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block sm:col-span-2">
                        <span className="text-[13px] font-semibold text-slate-600">
                          目標名
                        </span>
                        <input
                          type="text"
                          value={goal.goalName}
                          onChange={(event) =>
                            updateGoal(goal.id, "goalName", event.target.value)
                          }
                          className={inputClass}
                          placeholder="例：睡眠スコア"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[13px] font-semibold text-slate-600">
                          現在値
                        </span>
                        <input
                          type="text"
                          value={goal.currentValue}
                          onChange={(event) =>
                            updateGoal(
                              goal.id,
                              "currentValue",
                              event.target.value,
                            )
                          }
                          className={inputClass}
                          placeholder="例：82"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[13px] font-semibold text-slate-600">
                          目標値
                        </span>
                        <input
                          type="text"
                          value={goal.targetValue}
                          onChange={(event) =>
                            updateGoal(
                              goal.id,
                              "targetValue",
                              event.target.value,
                            )
                          }
                          className={inputClass}
                          placeholder="例：88"
                        />
                      </label>
                      <label className="block sm:col-span-2">
                        <span className="text-[13px] font-semibold text-slate-600">
                          期限
                        </span>
                        <input
                          type="date"
                          value={goal.deadline}
                          onChange={(event) =>
                            updateGoal(goal.id, "deadline", event.target.value)
                          }
                          className={inputClass}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={addGoal}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-[15px] font-semibold transition hover:bg-slate-50 sm:text-sm"
              style={{ color: NAVY }}
            >
              ＋ 改善目標を追加
            </button>
          </Section>

          <Section
            eyebrow="MENU"
            title="改善メニュー"
            description="実施する改善メニューにチェックを入れてください。自由追加も可能です。"
          >
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {menuItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition ${
                    item.checked
                      ? "border-[#315f68]/25 bg-[#f4f7f7]"
                      : "border-slate-100 bg-[#fafaf8]"
                  }`}
                >
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleMenuItem(item.id)}
                      className="h-5 w-5 shrink-0 rounded border-slate-300 text-[#315f68] focus:ring-[#315f68]/20"
                    />
                    <span
                      className="text-[15px] font-medium tracking-[-0.02em] sm:text-sm"
                      style={{ color: NAVY }}
                    >
                      {item.label}
                    </span>
                  </label>
                  {item.isCustom && (
                    <button
                      type="button"
                      onClick={() => removeCustomMenuItem(item.id)}
                      className="shrink-0 text-[12px] font-medium text-slate-400 transition hover:text-rose-600"
                      aria-label={`${item.label}を削除`}
                    >
                      削除
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={customMenuLabel}
                onChange={(event) => setCustomMenuLabel(event.target.value)}
                placeholder="カスタムメニュー名を入力"
                className={`${inputClass} mt-0 sm:flex-1`}
              />
              <button
                type="button"
                onClick={addCustomMenuItem}
                className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-[15px] font-semibold transition hover:bg-slate-50 sm:text-sm"
                style={{ color: NAVY }}
              >
                ＋ メニューを追加
              </button>
            </div>
          </Section>

          <Section
            eyebrow="MEMO"
            title="インストラクターメモ"
            description="フォロー内容や注意点などを自由に記録できます。"
          >
            <textarea
              value={instructorMemo}
              onChange={(event) => setInstructorMemo(event.target.value)}
              rows={6}
              className={textareaClass}
              placeholder="例：就寝前のスマホ使用が多いため、スマホ制限を重点的にフォロー。"
            />
          </Section>

          <section className="relative overflow-hidden rounded-[28px] bg-[#071426] px-5 py-8 text-center shadow-[0_30px_90px_-40px_rgba(7,20,38,0.55)] sm:px-10 sm:py-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(49,95,104,0.35),transparent_55%)]" />
            <div className="relative z-10">
              {error && (
                <p className="mb-4 text-[15px] font-medium text-rose-300 sm:text-sm">
                  {error}
                </p>
              )}
              {savedMessage && (
                <p className="mb-4 text-[15px] font-medium text-[#d8b36a] sm:text-sm">
                  {savedMessage}
                </p>
              )}

              <p className="text-[11px] font-semibold tracking-[0.28em] text-[#d8b36a]">
                SAVE PROGRAM
              </p>
              <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-white sm:text-2xl">
                プログラム内容を保存
              </h2>
              <p className="mx-auto mt-3 max-w-md text-[15px] leading-7 text-white/60 sm:text-sm">
                改善目標・メニュー・メモの変更を保存します。
              </p>

              <button
                type="submit"
                disabled={saving}
                className="group mt-7 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-full bg-white px-10 py-4 text-base font-semibold text-[#071426] shadow-[0_18px_50px_-20px_rgba(255,255,255,0.55)] transition duration-500 hover:-translate-y-1 hover:bg-[#f4f4f4] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:mt-8 sm:w-auto sm:px-12 sm:text-lg"
              >
                {saving ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#071426]/20 border-t-[#071426]" />
                    保存中...
                  </>
                ) : (
                  <>
                    保存する
                    <span className="transition-transform duration-500 group-hover:translate-x-1">
                      →
                    </span>
                  </>
                )}
              </button>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}
