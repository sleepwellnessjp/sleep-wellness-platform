"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FormEvent,
  Suspense,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import InstructorNav from "@/components/InstructorNav";
import SectionCard from "@/components/ui/SectionCard";
import { GOLD, NAVY, SURFACE, SURFACE_WARM, TEAL } from "@/components/ui/tokens";
import { CLIENT_GENDER_OPTIONS, formatGenderLabel } from "@/lib/client-profile";
import {
  commitWorkspaceToAnalysisResult,
  createDummyWorkspace,
  dummyAiPreview,
  LIFESTYLE_FIELDS,
  SOXAI_WORKSPACE_FIELDS,
  type AnalysisClientInfo,
  type AnalysisLifestyleInput,
  type AiAnalysisPreview,
  type RecommendationCard,
  type SleepAnalysisWorkspace,
  type SoxaiWorkspaceMetrics,
} from "@/lib/analysis-workspace";
import {
  DEMO_CLIENTS,
  getDemoClientById,
} from "@/lib/demo-clients";
import {
  getClientById,
  getClientListItems,
  type ClientListItem,
} from "@/lib/repositories/client-repository";
import { ANALYSIS_ROUTES } from "@/modules/analysis/routes";

const inputClass =
  "mt-2.5 w-full rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3.5 text-[15px] text-[#071426] outline-none transition duration-300 placeholder:text-slate-400 focus:border-[#315f68] focus:bg-white focus:ring-4 focus:ring-[#315f68]/10 sm:px-5 sm:py-4 sm:text-base";

const textareaClass =
  "mt-2.5 w-full resize-none rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3.5 text-[15px] leading-7 text-[#071426] outline-none transition duration-300 placeholder:text-slate-400 focus:border-[#315f68] focus:bg-white focus:ring-4 focus:ring-[#315f68]/10 sm:px-5 sm:py-4 sm:text-base";

export default function SleepAnalysisPage() {
  return (
    <Suspense
      fallback={
        <main
          className="flex min-h-screen items-center justify-center"
          style={{ backgroundColor: SURFACE }}
        >
          <p className="text-sm text-slate-500">読み込み中...</p>
        </main>
      }
    >
      <SleepAnalysisPageInner />
    </Suspense>
  );
}

function SleepAnalysisPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClientId = searchParams.get("clientId")?.trim() || "";

  const [workspace, setWorkspace] = useState<SleepAnalysisWorkspace>(() =>
    createDummyWorkspace(),
  );
  const [clientOptions, setClientOptions] = useState<ClientListItem[]>([]);
  const [clientsReady, setClientsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const list = await getClientListItems();
        const demoOptions: ClientListItem[] = DEMO_CLIENTS.map((client) => ({
          id: client.id,
          name: client.name,
          registeredAt: client.lastAnalysisDate ?? "2026-07-01",
          latestSleepScore: client.sleepScore,
          latestAnalysisDate: client.lastAnalysisDate,
          tags: [],
          searchText: client.name,
        }));
        const merged =
          list.length > 0
            ? list
            : demoOptions;
        if (!cancelled) setClientOptions(merged);

        if (queryClientId) {
          const stored = await getClientById(queryClientId);
          const demo = getDemoClientById(queryClientId);
          const client = stored
            ? {
                id: stored.id,
                name: stored.name,
                age: typeof stored.age === "number" ? String(stored.age) : "",
                gender: stored.gender ?? "",
              }
            : demo
              ? {
                  id: demo.id,
                  name: demo.name,
                  age: String(demo.age),
                  gender: demo.gender,
                }
              : null;
          if (cancelled || !client) return;
          setWorkspace((current) => {
            const nextClient: AnalysisClientInfo = {
              ...current.client,
              clientId: client.id,
              name: client.name,
              age: client.age,
              gender: client.gender,
            };
            return {
              ...current,
              client: nextClient,
              preview: dummyAiPreview(
                nextClient.name,
                current.preview.score,
              ),
            };
          });
        }
      } catch (loadError) {
        console.error("[analysis] failed to load clients:", loadError);
        if (!cancelled) {
          setClientOptions(
            DEMO_CLIENTS.map((client) => ({
              id: client.id,
              name: client.name,
              registeredAt: client.lastAnalysisDate ?? "2026-07-01",
              latestSleepScore: client.sleepScore,
              latestAnalysisDate: client.lastAnalysisDate,
              tags: [],
              searchText: client.name,
            })),
          );
        }
      } finally {
        if (!cancelled) setClientsReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [queryClientId]);

  const updateClient = <K extends keyof AnalysisClientInfo>(
    key: K,
    value: AnalysisClientInfo[K],
  ) => {
    setWorkspace((current) => {
      const client = { ...current.client, [key]: value };
      const preview =
        key === "name"
          ? dummyAiPreview(String(value), current.preview.score)
          : current.preview;
      return { ...current, client, preview };
    });
  };

  const updateSoxai = (key: keyof SoxaiWorkspaceMetrics, value: string) => {
    setWorkspace((current) => ({
      ...current,
      soxai: { ...current.soxai, [key]: value },
    }));
  };

  const updateLifestyle = (
    key: keyof AnalysisLifestyleInput,
    value: string,
  ) => {
    setWorkspace((current) => ({
      ...current,
      lifestyle: { ...current.lifestyle, [key]: value },
    }));
  };

  const handleClientSelect = async (value: string) => {
    if (!value) {
      updateClient("clientId", undefined);
      return;
    }
    const selected = clientOptions.find((item) => item.id === value);
    if (!selected) return;

    try {
      const full = await getClientById(selected.id);
      const demo = getDemoClientById(selected.id);
      setWorkspace((current) => {
        const client: AnalysisClientInfo = {
          ...current.client,
          clientId: selected.id,
          name: full?.name ?? demo?.name ?? selected.name,
          age:
            typeof full?.age === "number"
              ? String(full.age)
              : demo
                ? String(demo.age)
                : current.client.age,
          gender: full?.gender ?? demo?.gender ?? current.client.gender,
        };
        return {
          ...current,
          client,
          preview: dummyAiPreview(client.name, current.preview.score),
          soxai:
            demo?.sleepScore != null && !full
              ? {
                  ...current.soxai,
                  sleepScore: String(demo.sleepScore),
                }
              : current.soxai,
        };
      });
    } catch (loadError) {
      console.error("[analysis] failed to load client:", loadError);
      const demo = getDemoClientById(selected.id);
      setWorkspace((current) => ({
        ...current,
        client: {
          ...current.client,
          clientId: selected.id,
          name: demo?.name ?? selected.name,
          age: demo ? String(demo.age) : current.client.age,
          gender: demo?.gender ?? current.client.gender,
        },
        preview: dummyAiPreview(
          demo?.name ?? selected.name,
          current.preview.score,
        ),
      }));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!workspace.client.name.trim()) {
      setError("氏名を入力してください。");
      return;
    }
    if (!workspace.client.analysisDate) {
      setError("分析日を入力してください。");
      return;
    }

    setIsSubmitting(true);
    try {
      // 体感として短い分析待機 → Analysis Result へ
      await new Promise((resolve) => setTimeout(resolve, 700));
      commitWorkspaceToAnalysisResult(workspace);
      router.push(ANALYSIS_ROUTES.result);
    } catch (submitError) {
      console.error("[analysis] failed to commit workspace:", submitError);
      setError("分析結果の準備に失敗しました。もう一度お試しください。");
      setIsSubmitting(false);
    }
  };

  const genderLabel = useMemo(
    () => formatGenderLabel(workspace.client.gender) || "—",
    [workspace.client.gender],
  );

  return (
    <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
      <InstructorNav eyebrow="ANALYSIS" />

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12 lg:py-14">
        <header className="max-w-2xl">
          <p
            className="text-[11px] font-semibold tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            SLEEP ANALYSIS
          </p>
          <h1
            className="mt-3 text-[1.85rem] font-semibold tracking-[-0.05em] sm:text-4xl"
            style={{ color: NAVY }}
          >
            睡眠分析
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-7 text-slate-600">
            クライアント情報と SOXAI
            データを確認し、生活習慣を整えたうえで AI 分析を実行します。
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={ANALYSIS_ROUTES.new}
              className="inline-flex min-h-10 items-center rounded-full border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-600 transition hover:border-[#315f68]/40 hover:text-[#071426]"
            >
              SOXAI画像から開始
            </Link>
          </div>
        </header>

        <form
          onSubmit={handleSubmit}
          className="mt-10 space-y-8 sm:mt-12 sm:space-y-10"
          noValidate
        >
          {/* ① Client Information */}
          <SectionCard eyebrow="01 · CLIENT" title="Client Information">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
              <Field label="登録クライアント" optional>
                <select
                  className={inputClass}
                  value={workspace.client.clientId ?? ""}
                  onChange={(event) => {
                    void handleClientSelect(event.target.value);
                  }}
                  disabled={!clientsReady}
                >
                  <option value="">
                    {clientsReady
                      ? clientOptions.length > 0
                        ? "選択（任意）"
                        : "登録クライアントなし"
                      : "読み込み中..."}
                  </option>
                  {clientOptions.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="氏名" required>
                <input
                  type="text"
                  className={inputClass}
                  value={workspace.client.name}
                  onChange={(event) => updateClient("name", event.target.value)}
                  placeholder="例：山田 花子"
                  autoComplete="name"
                  required
                />
              </Field>

              <Field label="年齢" optional>
                <input
                  type="number"
                  min={0}
                  max={130}
                  inputMode="numeric"
                  className={inputClass}
                  value={workspace.client.age}
                  onChange={(event) => updateClient("age", event.target.value)}
                  placeholder="例：42"
                />
              </Field>

              <Field label="性別" optional>
                <select
                  className={inputClass}
                  value={workspace.client.gender}
                  onChange={(event) =>
                    updateClient("gender", event.target.value)
                  }
                >
                  <option value="">選択してください</option>
                  {CLIENT_GENDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="分析日" required>
                <input
                  type="date"
                  className={inputClass}
                  value={workspace.client.analysisDate}
                  onChange={(event) =>
                    updateClient("analysisDate", event.target.value)
                  }
                  required
                />
              </Field>

              <Field label="担当講師" optional>
                <input
                  type="text"
                  className={inputClass}
                  value={workspace.client.instructorName}
                  onChange={(event) =>
                    updateClient("instructorName", event.target.value)
                  }
                  placeholder="認定講師"
                />
              </Field>
            </div>

            <div
              className="mt-6 grid grid-cols-2 gap-3 rounded-[22px] border border-slate-100 px-4 py-4 sm:grid-cols-4 sm:px-5"
              style={{ backgroundColor: SURFACE_WARM }}
            >
              <MetaChip label="氏名" value={workspace.client.name || "—"} />
              <MetaChip
                label="年齢"
                value={workspace.client.age ? `${workspace.client.age}歳` : "—"}
              />
              <MetaChip label="性別" value={genderLabel} />
              <MetaChip
                label="講師"
                value={workspace.client.instructorName || "—"}
              />
            </div>
          </SectionCard>

          {/* ② SOXAI */}
          <SectionCard eyebrow="02 · SOXAI" title="SOXAIデータ">
            <p className="mb-5 text-[14px] leading-6 text-slate-500">
              カードの値は手入力・確認用です。後から Supabase
              連携や画像抽出結果で置き換えできます。
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4">
              {SOXAI_WORKSPACE_FIELDS.map((field) => (
                <label
                  key={field.key}
                  className="group rounded-[22px] border border-slate-100 bg-[#fafaf8] px-3.5 py-4 transition duration-300 hover:border-[#315f68]/25 hover:bg-white sm:px-4 sm:py-5"
                >
                  <span className="text-[11px] font-semibold tracking-[0.14em] text-slate-400">
                    {field.label}
                  </span>
                  <input
                    type="text"
                    className="mt-2.5 w-full bg-transparent text-lg font-semibold tracking-[-0.03em] text-[#071426] outline-none placeholder:text-slate-300 sm:text-xl"
                    value={workspace.soxai[field.key]}
                    onChange={(event) =>
                      updateSoxai(field.key, event.target.value)
                    }
                    placeholder={field.placeholder}
                  />
                </label>
              ))}
            </div>
          </SectionCard>

          {/* ③ Lifestyle */}
          <SectionCard eyebrow="03 · LIFESTYLE" title="Lifestyle">
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
              {LIFESTYLE_FIELDS.map((field) => (
                <div
                  key={field.key}
                  className={field.rows ? "sm:col-span-2" : undefined}
                >
                  <Field label={field.label} optional>
                    {field.rows ? (
                      <textarea
                        rows={field.rows}
                        className={textareaClass}
                        value={workspace.lifestyle[field.key]}
                        onChange={(event) =>
                          updateLifestyle(field.key, event.target.value)
                        }
                        placeholder={field.placeholder}
                      />
                    ) : (
                      <input
                        type="text"
                        className={inputClass}
                        value={workspace.lifestyle[field.key]}
                        onChange={(event) =>
                          updateLifestyle(field.key, event.target.value)
                        }
                        placeholder={field.placeholder}
                      />
                    )}
                  </Field>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* ④ AI Analysis Preview */}
          <AiPreviewCard preview={workspace.preview} />

          {/* ⑤ Recommendation */}
          <SectionCard eyebrow="05 · RECOMMENDATION" title="Recommendation">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
              {workspace.recommendations.map((item) => (
                <RecommendationItem key={item.category} item={item} />
              ))}
            </div>
          </SectionCard>

          {/* ⑥ Bottom CTA */}
          <section className="relative overflow-hidden rounded-[28px] bg-[#071426] px-5 py-9 text-center shadow-[0_30px_90px_-40px_rgba(7,20,38,0.55)] sm:px-10 sm:py-11">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(49,95,104,0.35),transparent_55%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(216,179,106,0.2),transparent_45%)]" />

            <div className="relative z-10">
              {error && (
                <p className="mb-5 text-[15px] font-medium text-rose-300 sm:text-sm">
                  {error}
                </p>
              )}

              <p
                className="text-[11px] font-semibold tracking-[0.28em]"
                style={{ color: "#d8b36a" }}
              >
                AI ANALYSIS
              </p>
              <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-white sm:text-2xl">
                入力内容をもとに AI 分析を実行
              </h2>
              <p className="mx-auto mt-3 max-w-md text-[15px] leading-7 text-white/60 sm:text-sm">
                分析後は Analysis Result
                画面へ進み、レポートと改善提案を確認できます。
              </p>

              <button
                type="submit"
                disabled={isSubmitting}
                className="group mt-8 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-white px-10 py-4 text-base font-semibold text-[#071426] shadow-[0_18px_50px_-20px_rgba(255,255,255,0.55)] transition duration-500 hover:-translate-y-1 hover:bg-[#f4f4f4] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:w-auto sm:min-w-[280px] sm:px-14 sm:py-5 sm:text-lg"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#071426]/20 border-t-[#071426]" />
                    AI分析を実行中...
                  </>
                ) : (
                  <>
                    AI分析を実行
                    <span className="transition-transform duration-500 group-hover:translate-x-1">
                      →
                    </span>
                  </>
                )}
              </button>

              <p className="mx-auto mt-6 max-w-lg text-xs leading-6 text-white/40 sm:text-sm sm:leading-7">
                本システムは睡眠ウェルネス支援を目的としており、
                医療診断・治療を行うものではありません。
              </p>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}

function AiPreviewCard({ preview }: { preview: AiAnalysisPreview }) {
  return (
    <SectionCard eyebrow="04 · AI PREVIEW" title="AI Analysis Preview">
      <div className="overflow-hidden rounded-[24px] border border-slate-100 bg-gradient-to-br from-[#f4f7f7] via-white to-[#fbf7ef]">
        <div className="flex flex-col gap-6 px-5 py-6 sm:flex-row sm:items-start sm:justify-between sm:px-7 sm:py-7">
          <div className="min-w-0 flex-1">
            <p
              className="text-[11px] font-semibold tracking-[0.22em]"
              style={{ color: TEAL }}
            >
              PREVIEW
            </p>
            <h3
              className="mt-2 text-lg font-semibold tracking-[-0.03em] sm:text-xl"
              style={{ color: NAVY }}
            >
              {preview.headline}
            </h3>
            <p className="mt-3 text-[15px] leading-7 text-slate-600">
              {preview.summary}
            </p>
          </div>

          <div className="shrink-0 self-start rounded-[22px] border border-[#315f68]/15 bg-white px-6 py-5 text-center shadow-[0_16px_40px_-28px_rgba(49,95,104,0.45)]">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-slate-400">
              SCORE
            </p>
            <p
              className="mt-1 text-4xl font-semibold tracking-[-0.05em]"
              style={{ color: NAVY }}
            >
              {preview.score}
            </p>
          </div>
        </div>

        <div className="grid gap-4 border-t border-slate-100 px-5 py-5 sm:grid-cols-2 sm:px-7 sm:py-6">
          <PreviewList title="良かった点" items={preview.goodPoints} />
          <PreviewList title="注目ポイント" items={preview.focusPoints} />
        </div>
      </div>
    </SectionCard>
  );
}

function PreviewList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p
        className="text-[13px] font-semibold tracking-[-0.02em]"
        style={{ color: NAVY }}
      >
        {title}
      </p>
      <ul className="mt-3 space-y-2.5">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-2.5 text-[14px] leading-6 text-slate-600"
          >
            <span
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: TEAL }}
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RecommendationItem({ item }: { item: RecommendationCard }) {
  return (
    <article className="rounded-[22px] border border-slate-100 bg-[#fafaf8] px-4 py-5 transition duration-300 hover:border-[#315f68]/20 hover:bg-white sm:px-5">
      <p
        className="text-[10px] font-semibold tracking-[0.2em]"
        style={{ color: GOLD }}
      >
        {item.label}
      </p>
      <h3
        className="mt-2 text-[15px] font-semibold tracking-[-0.02em] sm:text-base"
        style={{ color: NAVY }}
      >
        {item.title}
      </h3>
      <p className="mt-2 text-[13px] leading-6 text-slate-500">{item.body}</p>
    </article>
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p
        className="mt-1 truncate text-[14px] font-semibold tracking-[-0.02em]"
        style={{ color: NAVY }}
      >
        {value}
      </p>
    </div>
  );
}

function Field({
  label,
  required,
  optional,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[15px] font-semibold text-[#071426] sm:text-sm">
        {label}
        {required && (
          <span className="ml-1.5 text-[11px] font-medium text-[#8a6a2d]">
            必須
          </span>
        )}
        {optional && (
          <span className="ml-1.5 text-[11px] font-medium text-slate-400">
            任意
          </span>
        )}
      </span>
      {children}
    </label>
  );
}
