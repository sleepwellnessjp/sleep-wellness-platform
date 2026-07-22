"use client";

import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import InstructorNav from "@/components/InstructorNav";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import SectionCard from "@/components/ui/SectionCard";
import { GOLD, NAVY, SUCCESS } from "@/components/ui/tokens";
import { getQualification, getTest } from "@/lib/academy/catalog";
import { submitAcademyTest } from "@/lib/repositories/academy-repository";
import type { AcademyTestAttempt } from "@/lib/academy/types";

export default function AcademyTestPage() {
  const params = useParams();
  const router = useRouter();
  const testId = String(params.testId ?? "");
  const test = getTest(testId);

  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    attempt: AcademyTestAttempt;
    credentialId: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allAnswered = useMemo(() => {
    if (!test) return false;
    return test.questions.every((q) => {
      const a = answers[q.id];
      if (q.kind === "multiple_choice") return typeof a === "number";
      return typeof a === "string" && a.trim().length > 0;
    });
  }, [answers, test]);

  if (!test) {
    return (
      <main className="min-h-screen bg-[#f7f7f5]">
        <InstructorNav eyebrow="ACADEMY" />
        <div className="mx-auto max-w-3xl px-5 py-14">
          <EmptyState
            title="テストが見つかりません"
            primaryAction={{
              label: "一覧へ戻る",
              href: "/academy?tab=tests",
            }}
          />
        </div>
      </main>
    );
  }

  const qualification = getQualification(test.qualificationId);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const { attempt, credential } = await submitAcademyTest(testId, answers);
      setResult({
        attempt,
        credentialId: credential?.id ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "提出に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <InstructorNav eyebrow="ACADEMY" />
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <button
          type="button"
          onClick={() => router.push("/academy?tab=tests")}
          className="text-[13px] font-semibold text-slate-500 transition hover:text-[#071426]"
        >
          ← テスト一覧
        </button>

        <header className="mt-6 animate-fade-up">
          <p
            className="text-[11px] font-semibold tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            EXAM · 合格点 {test.passingScore}
          </p>
          <h1
            className="mt-3 text-[1.65rem] font-semibold tracking-[-0.04em] sm:text-3xl"
            style={{ color: NAVY }}
          >
            {test.title}
          </h1>
          <p className="mt-3 text-[15px] leading-7 text-slate-600">
            {test.description}
            {qualification ? `（${qualification.name}）` : ""}
          </p>
        </header>

        {result ? (
          <div className="mt-8 animate-fade-up">
            <SectionCard title="結果" eyebrow="RESULT">
              <p
                className="text-5xl font-semibold tracking-[-0.06em]"
                style={{ color: result.attempt.passed ? SUCCESS : "#a33a3a" }}
              >
                {result.attempt.score}
                <span className="ml-1 text-2xl text-slate-400">点</span>
              </p>
              <p className="mt-3 text-[15px] font-semibold" style={{ color: NAVY }}>
                {result.attempt.passed ? "合格しました" : "合格点に達していません"}
              </p>
              <p className="mt-2 text-[13px] text-slate-500">
                合格点 {test.passingScore}点 · 選択式・記述式の合計スコアです。
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {result.attempt.passed && result.credentialId && (
                  <Button href={`/academy/certificates/${result.credentialId}`} size="sm">
                    認定証を開く
                  </Button>
                )}
                <Button href="/academy?tab=credentials" variant="secondary" size="sm">
                  マイ資格へ
                </Button>
                {!result.attempt.passed && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setResult(null);
                      setAnswers({});
                    }}
                  >
                    再受験
                  </Button>
                )}
              </div>
            </SectionCard>
          </div>
        ) : (
          <div className="mt-8 space-y-4 animate-fade-up [animation-delay:80ms]">
            {test.questions.map((question, index) => (
              <SectionCard
                key={question.id}
                title={`問${index + 1}`}
                eyebrow={
                  question.kind === "multiple_choice" ? "選択式" : "記述式"
                }
              >
                <p className="text-[15px] leading-7" style={{ color: NAVY }}>
                  {question.prompt}
                </p>
                <p className="mt-1 text-[12px] text-slate-500">
                  {question.points}点
                </p>

                {question.kind === "multiple_choice" && question.choices && (
                  <ul className="mt-4 space-y-2">
                    {question.choices.map((choice, choiceIndex) => {
                      const selected = answers[question.id] === choiceIndex;
                      return (
                        <li key={choice}>
                          <button
                            type="button"
                            onClick={() =>
                              setAnswers((prev) => ({
                                ...prev,
                                [question.id]: choiceIndex,
                              }))
                            }
                            className={`w-full rounded-2xl border px-4 py-3 text-left text-[14px] transition ${
                              selected
                                ? "border-[#071426] bg-[#071426] text-white"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {choice}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {question.kind === "written" && (
                  <textarea
                    className="mt-4 min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] leading-6 text-slate-700 outline-none transition focus:border-[#8a6a2d]/50"
                    placeholder="回答を入力（ダミー採点）"
                    value={
                      typeof answers[question.id] === "string"
                        ? String(answers[question.id])
                        : ""
                    }
                    onChange={(e) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [question.id]: e.target.value,
                      }))
                    }
                  />
                )}
              </SectionCard>
            ))}

            {error && (
              <p className="text-[13px] font-semibold text-[#a33a3a]">{error}</p>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                size="md"
                disabled={!allAnswered || submitting}
                onClick={() => void handleSubmit()}
              >
                {submitting ? "採点中…" : "提出して採点"}
              </Button>
              <Button href="/academy?tab=tests" variant="ghost" size="md">
                キャンセル
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
