"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { GOLD, NAVY } from "@/components/ui/tokens";
import {
  computeHomeworkAchievement,
  hydrateAnalysisSession,
  normalizeRecommendationsUntilNext,
  type AnalysisResult,
  type HomeworkAchievement,
  type NextActionGoal,
} from "@/lib/analysis-session";
import { updateAnalysisRecommendationsUntilNext } from "@/lib/repositories/client-repository";

function createGoalId(): string {
  try {
    return `goal-${crypto.randomUUID()}`;
  } catch {
    return `goal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

function SectionLabel({
  title,
  eyebrow,
}: {
  title: string;
  eyebrow: string;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2
        className="text-base font-semibold tracking-[-0.02em] sm:text-[1.05rem]"
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
  );
}

function AchievementRateBar({
  achievement,
}: {
  achievement: HomeworkAchievement;
}) {
  if (achievement.total === 0) return null;

  return (
    <div className="mb-4 rounded-xl border border-[#071426]/08 bg-[#f7f6f3] px-3.5 py-3 sm:px-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[12px] font-semibold tracking-[0.08em] text-slate-500">
          達成率
        </p>
        <p className="text-[13px] font-semibold tabular-nums" style={{ color: NAVY }}>
          {achievement.checked}/{achievement.total}
          <span className="ml-2 text-[15px]" style={{ color: GOLD }}>
            {achievement.rate}%
          </span>
        </p>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200/80"
        role="progressbar"
        aria-valuenow={achievement.rate}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`AI宿題の達成率 ${achievement.rate}パーセント`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${achievement.rate}%`,
            backgroundColor: achievement.rate >= 100 ? "#0f6b5c" : GOLD,
          }}
        />
      </div>
    </div>
  );
}

type Props = {
  result: AnalysisResult;
  onUpdated?: (
    goals: NextActionGoal[],
    achievement: HomeworkAchievement,
  ) => void;
  /** 省略時は分析レポート向けの「⑧ AI宿題」 */
  title?: string;
  eyebrow?: string;
  /** true のとき外側 Section 内に埋め込む（枠・見出しを控えめに） */
  embedded?: boolean;
  description?: string;
  /** false のときテキスト編集 UI を隠す（クライアントマイページ向け） */
  allowEdit?: boolean;
};

/**
 * ⑧ AI宿題（次回までの行動目標）
 * AI生成 3〜5件 / チェックボックス / 達成率保存 / 認定講師が編集
 */
export default function RecommendationsUntilNextCard({
  result,
  onUpdated,
  title = "⑧ AI宿題",
  eyebrow = "HOMEWORK",
  embedded = false,
  description = "AI分析から自動生成した、次回までの行動目標です。達成したらチェックを入れてください。達成率はカルテに保存され、次回分析で比較表示されます。",
  allowEdit = true,
}: Props) {
  const { success, error: toastError } = useToast();
  const [goals, setGoals] = useState<NextActionGoal[]>(() =>
    normalizeRecommendationsUntilNext(result.recommendationsUntilNext),
  );
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<NextActionGoal[]>(goals);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const next = normalizeRecommendationsUntilNext(
      result.recommendationsUntilNext,
    );
    setGoals(next);
    if (!editing) setDraft(next);
  }, [result.recommendationsUntilNext, result.analysisId, editing]);

  const displayItems = editing ? draft : goals;
  const achievement = computeHomeworkAchievement(displayItems);
  const canAdd = draft.length < 5;
  const canRemove = draft.length > 3;

  const persist = async (nextGoals: NextActionGoal[]) => {
    const analysisId = result.analysisId?.trim();
    const normalized = normalizeRecommendationsUntilNext(nextGoals);
    const homeworkAchievement = computeHomeworkAchievement(normalized);

    if (!analysisId) {
      // 未保存セッションでも画面・sessionStorage には反映
      const nextResult = {
        ...result,
        recommendationsUntilNext: normalized,
        homeworkAchievement,
      };
      hydrateAnalysisSession(nextResult);
      setGoals(normalized);
      onUpdated?.(normalized, homeworkAchievement);
      return true;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const ok = await updateAnalysisRecommendationsUntilNext(
        analysisId,
        normalized,
      );
      if (!ok) {
        setError("保存に失敗しました。もう一度お試しください。");
        toastError("分析の保存に失敗しました");
        return false;
      }
      const nextResult = {
        ...result,
        recommendationsUntilNext: normalized,
        homeworkAchievement,
        analysisId,
      };
      hydrateAnalysisSession(nextResult);
      setGoals(normalized);
      onUpdated?.(normalized, homeworkAchievement);
      setMessage("カルテに保存しました");
      success("分析を保存しました");
      return true;
    } catch (err) {
      console.error("Failed to save recommendationsUntilNext:", err);
      setError("保存に失敗しました。もう一度お試しください。");
      toastError("分析の保存に失敗しました");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const toggleChecked = async (id: string) => {
    if (editing) {
      setDraft((current) =>
        current.map((item) =>
          item.id === id ? { ...item, checked: !item.checked } : item,
        ),
      );
      return;
    }
    const next = goals.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item,
    );
    setGoals(next);
    await persist(next);
  };

  const startEdit = () => {
    const base =
      goals.length > 0
        ? goals.map((item) => ({ ...item }))
        : [
            { id: createGoalId(), text: "", checked: false },
            { id: createGoalId(), text: "", checked: false },
            { id: createGoalId(), text: "", checked: false },
          ];
    setDraft(base);
    setEditing(true);
    setMessage(null);
    setError(null);
  };

  const cancelEdit = () => {
    setDraft(goals.map((item) => ({ ...item })));
    setEditing(false);
    setError(null);
  };

  const saveEdit = async () => {
    const trimmed = draft
      .map((item) => ({ ...item, text: item.text.trim() }))
      .filter((item) => item.text.length > 0);

    if (trimmed.length < 3 || trimmed.length > 5) {
      setError("AI宿題は3〜5件にしてください。");
      return;
    }

    const ok = await persist(trimmed);
    if (ok) {
      setEditing(false);
      setDraft(trimmed);
    }
  };

  const updateText = (id: string, text: string) => {
    setDraft((current) =>
      current.map((item) => (item.id === id ? { ...item, text } : item)),
    );
  };

  const addGoal = () => {
    if (!canAdd) return;
    setDraft((current) => [
      ...current,
      { id: createGoalId(), text: "", checked: false },
    ]);
  };

  const removeGoal = (id: string) => {
    if (!canRemove) return;
    setDraft((current) => current.filter((item) => item.id !== id));
  };

  const body = (
    <>
      {embedded ? null : <SectionLabel title={title} eyebrow={eyebrow} />}
      {description ? (
        <p
          className={`mb-3 text-[13px] leading-6 text-slate-500 ${
            embedded ? "mt-0" : ""
          }`}
        >
          {description}
        </p>
      ) : null}

      <AchievementRateBar achievement={achievement} />

      {displayItems.length === 0 ? (
        <p className="text-[15px] leading-7 text-slate-400">—</p>
      ) : (
        <ul className="space-y-2.5">
          {displayItems.map((item, index) => (
            <li
              key={item.id}
              className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 transition sm:px-4 ${
                item.checked
                  ? "border-[#315f68]/25 bg-[#f4f7f7]"
                  : "border-[#071426]/08 bg-[#fafaf8]"
              }`}
            >
              <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => void toggleChecked(item.id)}
                  disabled={saving}
                  className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-[#315f68] focus:ring-[#315f68]/20"
                  aria-label={`AI宿題${index + 1}を達成済みにする`}
                />
                {editing ? (
                  <input
                    type="text"
                    value={item.text}
                    onChange={(event) =>
                      updateText(item.id, event.target.value)
                    }
                    maxLength={60}
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[15px] leading-6 text-slate-700 outline-none focus:border-[#315f68]/40 focus:ring-2 focus:ring-[#315f68]/15"
                    placeholder="行動目標を入力"
                  />
                ) : (
                  <span
                    className={`min-w-0 flex-1 text-[15px] leading-7 sm:text-[0.95rem] ${
                      item.checked
                        ? "text-slate-500 line-through"
                        : "text-slate-700"
                    }`}
                    style={item.checked ? undefined : { color: NAVY }}
                  >
                    {item.text}
                  </span>
                )}
              </label>
              {editing && canRemove ? (
                <button
                  type="button"
                  onClick={() => removeGoal(item.id)}
                  className="no-print shrink-0 pt-1 text-[12px] font-medium text-slate-400 transition hover:text-rose-600"
                  aria-label={`${item.text || "項目"}を削除`}
                >
                  削除
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <div className="no-print mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {allowEdit ? (
          editing ? (
            <>
              {canAdd ? (
                <button
                  type="button"
                  onClick={addGoal}
                  className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-[13px] font-semibold transition hover:bg-slate-50"
                  style={{ color: NAVY }}
                >
                  ＋ 目標を追加
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void saveEdit()}
                disabled={saving}
                className="inline-flex min-h-10 items-center justify-center rounded-full px-5 text-[13px] font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: NAVY }}
              >
                {saving ? "保存中…" : "保存する"}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                キャンセル
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={startEdit}
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-[13px] font-semibold transition hover:bg-slate-50"
              style={{ color: NAVY }}
            >
              編集する
            </button>
          )
        ) : null}
        {message ? (
          <p className="text-[13px] font-medium text-[#315f68]">{message}</p>
        ) : null}
        {error ? (
          <p className="text-[13px] font-medium text-rose-600">{error}</p>
        ) : null}
        {!allowEdit && saving ? (
          <p className="text-[13px] font-medium text-slate-400">保存中…</p>
        ) : null}
      </div>
    </>
  );

  if (embedded) {
    return <div>{body}</div>;
  }

  return (
    <section className="report-panel mt-5 rounded-xl border border-[#071426]/10 px-4 py-4 sm:mt-6 sm:px-5">
      {body}
    </section>
  );
}
