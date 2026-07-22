"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import AiFollowAlerts from "@/components/AiFollowAlerts";
import AnalysisInsightCards from "@/components/AnalysisInsightCards";
import ClientAiKarteTimeline from "@/components/ClientAiKarteTimeline";
import ClientGuidanceNotes from "@/components/ClientGuidanceNotes";
import ClientNextAppointmentCard from "@/components/ClientNextAppointmentCard";
import ClientPdfReportHistory from "@/components/ClientPdfReportHistory";
import ClientTagsEditor, {
  ClientTagChips,
} from "@/components/ClientTagsEditor";
import InstructorNav from "@/components/InstructorNav";
import SleepScoreChart from "@/components/SleepScoreChart";
import { buildAiFollowAlerts } from "@/lib/ai-follow-alerts";
import { formatGenderLabel } from "@/lib/client-profile";
import {
  calculateProfileCompletion,
  displayProfileValue,
  EMPTY_DISPLAY,
  EMPTY_DISPLAY_STYLE,
  NUMBER_RULES,
  type ClientProfileRecord,
} from "@/lib/client-profiles";
import { normalizeClientTags } from "@/lib/client-tags";
import { findPreviousAnalysis } from "@/lib/previous-comparison";
import { getClientProfile } from "@/lib/repositories/client-profile-repository";
import {
  formatDisplayDate,
  getClientById,
  updateClientProfile,
  type StoredAnalysis,
  type StoredClient,
} from "@/lib/repositories/client-repository";

const NAVY = "#071426";
const GOLD = "#8a6a2d";
const GOLD_LIGHT = "#d8b36a";

function Section({
  eyebrow,
  title,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200/90 bg-white px-5 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.22)] sm:px-8 sm:py-8">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3 border-b border-slate-100 pb-4">
        <h2
          className="text-lg font-semibold tracking-[-0.03em] sm:text-xl"
          style={{ color: NAVY }}
        >
          {title}
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          {action}
          <p
            className="text-[10px] font-semibold tracking-[0.22em]"
            style={{ color: GOLD }}
          >
            {eyebrow}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

function wellnessScoreOf(analysis: StoredAnalysis | null | undefined): number | null {
  if (!analysis) return null;
  if (typeof analysis.wellnessScore === "number" && Number.isFinite(analysis.wellnessScore)) {
    return analysis.wellnessScore;
  }
  return null;
}

function formatScoreDelta(delta: number | null): {
  label: string;
  color: string;
} {
  if (delta == null) {
    return { label: "—", color: GOLD };
  }
  const rounded = Math.round(delta);
  if (rounded === 0) {
    return { label: "±0", color: GOLD };
  }
  if (rounded > 0) {
    return { label: `+${rounded}`, color: "#0f6b5c" };
  }
  return { label: String(rounded), color: "#a33a3a" };
}

function ProfileValue({ value }: { value: string }) {
  if (value === EMPTY_DISPLAY) {
    return (
      <span
        className="inline-block rounded-lg px-2 py-0.5 text-[12px] font-semibold"
        style={{
          backgroundColor: EMPTY_DISPLAY_STYLE.background,
          color: EMPTY_DISPLAY_STYLE.color,
        }}
      >
        {EMPTY_DISPLAY}
      </span>
    );
  }
  return (
    <span className="font-semibold" style={{ color: NAVY }}>
      {value}
    </span>
  );
}

export default function ClientDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [client, setClient] = useState<StoredClient | null>(null);
  const [profile, setProfile] = useState<ClientProfileRecord | null>(null);
  const [ready, setReady] = useState(false);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(
    null,
  );
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [tagsSaving, setTagsSaving] = useState(false);
  const [tagsError, setTagsError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setClient(null);
      setProfile(null);
      setSelectedAnalysisId(null);
      setReady(true);
      return;
    }

    const refresh = async () => {
      const [nextClient, nextProfile] = await Promise.all([
        getClientById(id),
        getClientProfile(id).catch(() => null),
      ]);
      setClient(nextClient);
      setProfile(nextProfile);
      setDraftTags(normalizeClientTags(nextClient?.tags));
      setSelectedAnalysisId((current) => {
        if (!nextClient?.analyses.length) return null;
        if (current && nextClient.analyses.some((a) => a.id === current)) {
          return current;
        }
        return nextClient.analyses[0]?.id ?? null;
      });
    };
    void refresh();
    setReady(true);

    const onUpdate = () => {
      void refresh();
    };
    window.addEventListener("storage", onUpdate);
    window.addEventListener("swij-clients-updated", onUpdate);
    return () => {
      window.removeEventListener("storage", onUpdate);
      window.removeEventListener("swij-clients-updated", onUpdate);
    };
  }, [id]);

  const profileCompletion = useMemo(() => {
    if (!profile) return null;
    return calculateProfileCompletion(profile, {
      ageYears: profile.basic.ageYears,
    });
  }, [profile]);

  const scoreTrendPoints = useMemo(() => {
    if (!client) return [];
    // analyses are newest-first; take latest 10 with scores, then chronological
    return [...client.analyses]
      .flatMap((a) => {
        const score = wellnessScoreOf(a);
        return score == null ? [] : [{ date: a.analysisDate, score }];
      })
      .slice(0, 10)
      .reverse();
  }, [client]);

  const followAlerts = useMemo(() => {
    if (!client) return [];
    return buildAiFollowAlerts({
      analyses: client.analyses,
      profile,
      tags: client.tags,
    });
  }, [client, profile]);

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5]">
        <p className="text-sm text-slate-400">読み込み中...</p>
      </main>
    );
  }

  if (!client) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-5">
        <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-8 text-center sm:p-10">
          <p
            className="text-[11px] font-semibold tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            CLIENT
          </p>
          <h1
            className="mt-4 text-2xl font-semibold tracking-[-0.04em]"
            style={{ color: NAVY }}
          >
            クライアントが見つかりません
          </h1>
          <Link
            href="/clients"
            className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full px-8 py-3.5 text-base font-semibold text-white"
            style={{ backgroundColor: NAVY }}
          >
            一覧へ戻る
          </Link>
        </div>
      </main>
    );
  }

  const latest = client.analyses[0] ?? null;
  const previous = findPreviousAnalysis(client.analyses, latest?.id);
  const latestScore = wellnessScoreOf(latest);
  const previousScore = wellnessScoreOf(previous);
  const scoreDelta =
    latestScore != null && previousScore != null
      ? latestScore - previousScore
      : null;
  const deltaDisplay = formatScoreDelta(scoreDelta);

  const selectedAnalysis =
    client.analyses.find((a) => a.id === selectedAnalysisId) ?? latest;

  const genderLabel =
    formatGenderLabel(profile?.basic.gender || client.gender) ||
    displayProfileValue(profile?.basic.gender || client.gender);
  const ageLabel = displayProfileValue(
    profile?.basic.ageYears ?? client.age,
    { numberRule: NUMBER_RULES.age },
  );
  const heightLabel = displayProfileValue(
    profile?.basic.heightCm ?? client.heightCm,
    { numberRule: NUMBER_RULES.positive },
  );
  const weightLabel = displayProfileValue(
    profile?.basic.weightKg ?? client.weightKg,
    { numberRule: NUMBER_RULES.positive },
  );
  const occupationLabel = displayProfileValue(
    profile?.work.occupationCustom || profile?.work.occupationPreset,
  );

  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <InstructorNav eyebrow="CLIENT KARTE" />

      <div className="mx-auto max-w-6xl space-y-6 px-5 py-10 sm:space-y-8 sm:px-8 sm:py-14">
        {/* ① ゴールドアクセント・カルテヘッダー */}
        <header className="relative overflow-hidden rounded-[28px] border border-[#8a6a2d]/30 bg-gradient-to-br from-[#faf7f1] via-white to-[#f5efe4] px-5 py-7 shadow-[0_24px_70px_-48px_rgba(138,106,45,0.45)] sm:px-8 sm:py-9">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(216,179,106,0.85), transparent)",
            }}
          />
          <div
            className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-40"
            style={{
              background:
                "radial-gradient(circle, rgba(216,179,106,0.35), transparent 70%)",
            }}
          />

          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p
                  className="text-[11px] font-semibold tracking-[0.28em]"
                  style={{ color: GOLD }}
                >
                  SLEEP WELLNESS KARTE
                </p>
                <h1
                  className="mt-3 text-[1.85rem] font-semibold tracking-[-0.05em] sm:text-4xl"
                  style={{ color: NAVY }}
                >
                  {client.name}
                </h1>
                <p className="mt-2 text-[13px] text-slate-500 sm:text-sm">
                  登録日 {formatDisplayDate(client.registeredAt)}
                  <span className="mx-2 text-slate-300">·</span>
                  分析 {client.analyses.length} 回
                </p>
                <ClientTagChips tags={client.tags ?? []} className="mt-3" />
              </div>

              {latest && (
                <Link
                  href={`/analysis/result?analysisId=${encodeURIComponent(latest.id)}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#8a6a2d]/35 bg-white/80 px-5 py-2.5 text-[13px] font-semibold backdrop-blur transition hover:bg-[#faf7f1] sm:text-sm"
                  style={{ color: GOLD }}
                >
                  最新レポートを開く
                </Link>
              )}
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3 sm:gap-4">
              <div className="rounded-2xl border border-[#8a6a2d]/20 bg-white/70 px-5 py-5 backdrop-blur-sm sm:col-span-1">
                <p
                  className="text-[10px] font-semibold tracking-[0.16em]"
                  style={{ color: GOLD }}
                >
                  Sleep Wellness Score
                </p>
                <p
                  className="mt-2 text-[2.75rem] leading-none font-semibold tracking-[-0.06em] sm:text-[3.25rem]"
                  style={{ color: NAVY }}
                >
                  {latestScore ?? "—"}
                </p>
                <p className="mt-2 text-[11px] tracking-[0.08em] text-slate-400">
                  / 100 · Platform 独自指標
                </p>
              </div>

              <div className="rounded-2xl border border-[#8a6a2d]/15 bg-white/60 px-5 py-5 backdrop-blur-sm">
                <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-400">
                  前回との差分
                </p>
                <p
                  className="mt-3 text-[2rem] font-semibold tracking-[-0.05em] sm:text-[2.35rem]"
                  style={{ color: deltaDisplay.color }}
                >
                  {deltaDisplay.label}
                </p>
                <p className="mt-2 text-[12px] leading-5 text-slate-500">
                  {previous
                    ? `前回 ${formatDisplayDate(previous.analysisDate)}`
                    : "比較できる前回分析がありません"}
                </p>
              </div>

              <div className="rounded-2xl border border-[#8a6a2d]/15 bg-white/60 px-5 py-5 backdrop-blur-sm">
                <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-400">
                  最終分析日
                </p>
                <p
                  className="mt-3 text-[1.35rem] font-semibold tracking-[-0.04em] sm:text-[1.6rem]"
                  style={{ color: NAVY }}
                >
                  {formatDisplayDate(latest?.analysisDate)}
                </p>
                <p className="mt-2 text-[12px] leading-5 text-slate-500">
                  {latest
                    ? "最新の Sleep Wellness 分析"
                    : "まだ分析がありません"}
                </p>
              </div>
            </div>
          </div>
        </header>

        {followAlerts.length > 0 ? (
          <AiFollowAlerts alerts={followAlerts} />
        ) : null}

        {/* ② Sleep Wellness Score推移 */}
        <Section eyebrow="TREND" title="Sleep Wellness Score推移">
          <SleepScoreChart
            points={scoreTrendPoints}
            xAxisLabel="分析日"
            yAxisLabel="Sleep Wellness Score"
            emptyMessage="分析データがありません"
          />
        </Section>

        {/* ③ AI改善点・課題（分析履歴の選択に連動） */}
        <Section eyebrow="INSIGHTS" title="改善点と課題">
          {client.analyses.length === 0 ? (
            <p className="text-sm text-slate-400">まだ分析がありません</p>
          ) : (
            <AnalysisInsightCards
              result={selectedAnalysis?.result}
              analysisDateLabel={
                selectedAnalysis
                  ? formatDisplayDate(selectedAnalysis.analysisDate)
                  : undefined
              }
            />
          )}
        </Section>

        {/* ④ 分析履歴 */}
        <Section eyebrow="HISTORY" title="分析履歴">
          {client.analyses.length === 0 ? (
            <p className="text-sm text-slate-400">まだ分析がありません</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {client.analyses.map((analysis, index) => {
                const score = wellnessScoreOf(analysis);
                const isLatest = index === 0;
                const isSelected = analysis.id === selectedAnalysis?.id;
                return (
                  <li
                    key={analysis.id}
                    className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedAnalysisId(analysis.id)}
                      className="min-w-0 flex-1 rounded-2xl px-3 py-2 text-left transition hover:bg-[#fafaf8]"
                      style={{
                        backgroundColor: isSelected
                          ? "rgba(138, 106, 45, 0.08)"
                          : undefined,
                        outline: isSelected
                          ? "1px solid rgba(138, 106, 45, 0.28)"
                          : undefined,
                      }}
                      aria-pressed={isSelected}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className="text-sm font-semibold sm:text-base"
                          style={{ color: NAVY }}
                        >
                          {formatDisplayDate(analysis.analysisDate)}
                        </p>
                        {isLatest && (
                          <span
                            className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.12em]"
                            style={{
                              backgroundColor: "rgba(216,179,106,0.22)",
                              color: GOLD,
                            }}
                          >
                            LATEST
                          </span>
                        )}
                        {isSelected && (
                          <span
                            className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.12em]"
                            style={{
                              backgroundColor: "rgba(15, 107, 92, 0.12)",
                              color: "#0f6b5c",
                            }}
                          >
                            表示中
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-[13px] text-slate-500 sm:hidden">
                        Sleep Wellness Score{" "}
                        <span className="font-semibold" style={{ color: NAVY }}>
                          {score ?? "—"}
                        </span>
                      </p>
                      <p className="mt-1 hidden text-[12px] text-slate-400 sm:block">
                        選択して改善点・課題を表示
                      </p>
                    </button>

                    <div className="flex shrink-0 items-center gap-4 sm:gap-6">
                      <div className="hidden text-right sm:block">
                        <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">
                          Sleep Wellness Score
                        </p>
                        <p
                          className="mt-0.5 text-2xl font-semibold tracking-[-0.04em]"
                          style={{ color: NAVY }}
                        >
                          {score ?? "—"}
                        </p>
                      </div>
                      <Link
                        href={`/analysis/result?analysisId=${encodeURIComponent(analysis.id)}`}
                        className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-[#fafaf8] px-5 py-2.5 text-[13px] font-semibold transition hover:bg-white"
                        style={{ color: NAVY }}
                      >
                        詳細を見る
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        {/* ⑤ AIカルテ（時系列） */}
        <Section eyebrow="AI KARTE" title="AIカルテ">
          <ClientAiKarteTimeline analyses={client.analyses} />
        </Section>

        {/* ⑥ タグ */}
        <Section eyebrow="TAGS" title="タグ">
          <p className="mb-4 max-w-xl text-[13px] leading-6 text-slate-500 sm:text-[14px] sm:leading-7">
            一覧の検索・絞り込みに使えます。プリセットのほか自由入力も可能です。
          </p>
          <ClientTagsEditor
            value={draftTags}
            disabled={tagsSaving}
            onChange={(nextTags) => {
              setDraftTags(nextTags);
              setTagsError(null);
              setTagsSaving(true);
              void updateClientProfile(client.id, { tags: nextTags })
                .then((updated) => {
                  if (updated) {
                    setClient((current) =>
                      current
                        ? { ...current, tags: updated.tags }
                        : current,
                    );
                    setDraftTags(normalizeClientTags(updated.tags));
                  } else {
                    setTagsError("タグの保存に失敗しました。");
                  }
                })
                .catch((error) => {
                  console.error("[ClientDetail] tags save failed:", error);
                  setTagsError(
                    error instanceof Error
                      ? error.message
                      : "タグの保存に失敗しました。",
                  );
                })
                .finally(() => {
                  setTagsSaving(false);
                });
            }}
          />
          {tagsSaving ? (
            <p className="mt-3 text-[12px] text-slate-400">保存中...</p>
          ) : null}
          {tagsError ? (
            <p className="mt-3 text-sm font-medium text-rose-600">{tagsError}</p>
          ) : null}
        </Section>

        {/* ⑦ 次回予定 */}
        <Section eyebrow="NEXT" title="次回予定">
          <ClientNextAppointmentCard clientId={client.id} />
        </Section>

        {/* ⑧ 指導メモ */}
        <Section eyebrow="NOTES" title="指導メモ">
          <ClientGuidanceNotes clientId={client.id} />
        </Section>

        {/* ⑨ 固定プロフィールカード */}
        <Section
          eyebrow="PROFILE"
          title="固定プロフィール"
          action={
            <Link
              href={`/clients/${client.id}/profile`}
              className="inline-flex min-h-9 items-center justify-center rounded-full border border-[#8a6a2d]/35 bg-[#faf7f1] px-4 py-1.5 text-[12px] font-semibold transition hover:bg-[#f5efe4] sm:text-[13px]"
              style={{ color: GOLD }}
            >
              編集
            </Link>
          }
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <p className="max-w-xl text-[13px] leading-6 text-slate-500 sm:text-[14px] sm:leading-7">
              分析の土台となる固定情報です。更新すると以降の分析精度に反映されます。
            </p>
            {profileCompletion && (
              <p className="text-[13px] text-slate-500">
                完成率{" "}
                <span className="text-base font-semibold" style={{ color: NAVY }}>
                  {profileCompletion.percent}%
                </span>
              </p>
            )}
          </div>

          <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["年齢", ageLabel === EMPTY_DISPLAY ? ageLabel : `${ageLabel}歳`],
              ["性別", genderLabel],
              ["身長", heightLabel === EMPTY_DISPLAY ? heightLabel : `${heightLabel} cm`],
              ["体重", weightLabel === EMPTY_DISPLAY ? weightLabel : `${weightLabel} kg`],
              ["職業", occupationLabel],
              [
                "服薬",
                displayProfileValue(
                  profile?.health.medicationsNote ?? client.medications,
                ),
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-100 bg-[#fafaf8] px-4 py-3.5"
              >
                <dt className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">
                  {label}
                </dt>
                <dd className="mt-1.5 text-sm">
                  <ProfileValue value={value} />
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={`/clients/${client.id}/profile/confirm`}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-[13px] font-semibold transition hover:bg-slate-50 sm:text-sm"
              style={{ color: NAVY }}
            >
              プロフィール確認
            </Link>
          </div>
        </Section>

        {/* ⑨ 新規分析ボタン */}
        <section className="relative overflow-hidden rounded-[28px] bg-[#071426] px-5 py-8 text-center shadow-[0_30px_90px_-40px_rgba(7,20,38,0.55)] sm:px-10 sm:py-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(138,106,45,0.28),transparent_55%)]" />
          <div className="relative z-10">
            <p
              className="text-[11px] font-semibold tracking-[0.28em]"
              style={{ color: GOLD_LIGHT }}
            >
              NEW ANALYSIS
            </p>
            <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-white sm:text-2xl">
              新規分析を開始
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[15px] leading-7 text-white/60 sm:text-sm">
              SOXAIデータと固定プロフィールを統合し、Sleep Wellness Score
              を算出します。
            </p>
            <Link
              href={`/analysis/new?clientId=${encodeURIComponent(client.id)}`}
              className="group mt-7 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-full bg-white px-10 py-4 text-base font-semibold text-[#071426] shadow-[0_18px_50px_-20px_rgba(255,255,255,0.55)] transition duration-500 hover:-translate-y-1 hover:bg-[#f4f4f4] sm:mt-8 sm:w-auto sm:px-12 sm:text-lg"
            >
              新しい分析を作成
              <span className="transition-transform duration-500 group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
        </section>

        {/* ⑩ PDFレポート履歴（共有機能追加予定） */}
        <Section eyebrow="PDF" title="PDFレポート履歴">
          <ClientPdfReportHistory analyses={client.analyses} />
        </Section>

        <div className="flex flex-col gap-3 pb-6 sm:flex-row sm:justify-center">
          {client.analyses.length >= 2 && (
            <Link
              href={`/clients/${client.id}/compare`}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#315f68]/25 bg-[#f4f7f7] px-8 py-3.5 text-base font-semibold transition hover:bg-[#eef3f3]"
              style={{ color: NAVY }}
            >
              分析を比較する
            </Link>
          )}
          <Link
            href="/clients"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-8 py-3.5 text-base font-semibold transition hover:bg-slate-50"
            style={{ color: NAVY }}
          >
            一覧へ戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
