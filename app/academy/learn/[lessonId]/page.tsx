"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import InstructorNav from "@/components/InstructorNav";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import SectionCard from "@/components/ui/SectionCard";
import { SoftSkeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY } from "@/components/ui/tokens";
import {
  ACADEMY_CATEGORY_LABELS,
  ACADEMY_CONTENT_TYPE_LABELS,
  getLesson,
  getQualification,
} from "@/lib/academy/catalog";
import type { AcademyLessonStatus } from "@/lib/academy/types";
import {
  loadAcademyDashboard,
  resolveLessonStatus,
  upsertLessonStatus,
} from "@/lib/repositories/academy-repository";

export default function AcademyLessonPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = String(params.lessonId ?? "");
  const lesson = getLesson(lessonId);

  const [status, setStatus] = useState<AcademyLessonStatus>("not_started");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadAcademyDashboard();
      setStatus(resolveLessonStatus(data.progress, lessonId));
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const updateStatus = async (next: AcademyLessonStatus) => {
    setSaving(true);
    try {
      const row = await upsertLessonStatus(lessonId, next);
      setStatus(row.status);
    } finally {
      setSaving(false);
    }
  };

  if (!lesson) {
    return (
      <main className="min-h-screen bg-[#f7f7f5]">
        <InstructorNav eyebrow="ACADEMY" />
        <div className="mx-auto max-w-3xl px-5 py-14">
          <EmptyState
            title="講義が見つかりません"
            description="学習コンテンツ一覧から選び直してください。"
            primaryAction={{
              label: "一覧へ戻る",
              href: "/academy?tab=learn",
            }}
          />
        </div>
      </main>
    );
  }

  const qualification = getQualification(lesson.qualificationId);

  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <InstructorNav eyebrow="ACADEMY" />
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <button
          type="button"
          onClick={() => router.push("/academy?tab=learn")}
          className="text-[13px] font-semibold text-slate-500 transition hover:text-[#071426]"
        >
          ← 学習コンテンツ
        </button>

        <header className="mt-6 animate-fade-up">
          <p
            className="text-[11px] font-semibold tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            {ACADEMY_CATEGORY_LABELS[lesson.category]}
          </p>
          <h1
            className="mt-3 text-[1.65rem] font-semibold tracking-[-0.04em] sm:text-3xl"
            style={{ color: NAVY }}
          >
            {lesson.title}
          </h1>
          <p className="mt-3 text-[15px] leading-7 text-slate-600">
            {lesson.summary}
          </p>
        </header>

        {loading ? (
          <div className="mt-8">
            <SoftSkeleton variant="card" />
          </div>
        ) : (
          <div className="mt-8 space-y-5 animate-fade-up [animation-delay:80ms]">
            <SectionCard title="教材" eyebrow="MATERIAL">
              <div className="rounded-2xl border border-dashed border-[#d8b36a]/50 bg-gradient-to-br from-[#faf7f1] to-white px-5 py-10 text-center">
                <p
                  className="text-[11px] font-semibold tracking-[0.22em]"
                  style={{ color: GOLD }}
                >
                  {ACADEMY_CONTENT_TYPE_LABELS[lesson.contentType]}
                </p>
                <p
                  className="mt-3 text-lg font-semibold tracking-[-0.03em]"
                  style={{ color: NAVY }}
                >
                  {lesson.contentType === "video"
                    ? "動画プレイヤー（プレースホルダ）"
                    : lesson.contentType === "pdf"
                      ? "PDF資料（プレースホルダ）"
                      : "配布資料（プレースホルダ）"}
                </p>
                <p className="mt-2 text-[13px] text-slate-500">
                  {lesson.durationLabel} · 対象資格 {qualification?.name}
                </p>
              </div>
            </SectionCard>

            <SectionCard title="受講ステータス" eyebrow="STATUS">
              <p className="text-[14px] text-slate-600">
                現在:{" "}
                <span className="font-semibold" style={{ color: NAVY }}>
                  {status === "not_started"
                    ? "未受講"
                    : status === "in_progress"
                      ? "受講中"
                      : "修了"}
                </span>
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {status === "not_started" && (
                  <Button
                    size="sm"
                    disabled={saving}
                    onClick={() => void updateStatus("in_progress")}
                  >
                    受講を開始
                  </Button>
                )}
                {status === "in_progress" && (
                  <Button
                    size="sm"
                    disabled={saving}
                    onClick={() => void updateStatus("completed")}
                  >
                    修了にする
                  </Button>
                )}
                {status === "completed" && (
                  <Button href="/academy?tab=progress" variant="secondary" size="sm">
                    修了状況を見る
                  </Button>
                )}
                {status !== "not_started" && status !== "completed" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={saving}
                    onClick={() => void updateStatus("not_started")}
                  >
                    未受講に戻す
                  </Button>
                )}
              </div>
            </SectionCard>
          </div>
        )}
      </div>
    </main>
  );
}
