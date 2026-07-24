"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import Button from "@/components/ui/Button";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY, SURFACE_WARM } from "@/components/ui/tokens";
import { SWIJ_EYEBROW_OPS } from "@/lib/brand/swij-brand";
import {
  formatPercent,
  INSTRUCTOR_OPS_STATUS_LABELS,
  SCHOOL_STATUS_LABELS,
} from "@/lib/ops/constants";
import type { SchoolDetailBundle } from "@/lib/ops/types";

export default function AdminSchoolDetailPage() {
  const params = useParams();
  const id = String(params.id ?? "");
  const [detail, setDetail] = useState<SchoolDetailBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/ops?resource=school&id=${encodeURIComponent(id)}`,
        { cache: "no-store" },
      );
      const json = (await response.json()) as {
        detail?: SchoolDetailBundle;
        error?: string;
      };
      if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
      setDetail(json.detail ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminShell
      eyebrow={SWIJ_EYEBROW_OPS}
      title={detail?.school.name ?? "認定校詳細"}
      description="所属講師・受講生・開催講座・修了率・活動状況"
      actions={
        <Button href="/admin/schools" variant="secondary" size="sm">
          一覧へ戻る
        </Button>
      }
    >
      {loading ? (
        <Skeleton className="h-72 w-full rounded-[28px]" />
      ) : error ? (
        <SectionCard title="読み込みエラー">
          <p className="text-sm text-slate-600">{error}</p>
        </SectionCard>
      ) : detail ? (
        <div className="space-y-6">
          <section className="rounded-[28px] border border-[rgba(7,20,38,0.1)] bg-white px-5 py-5 shadow-[0_1px_2px_rgba(7,20,38,0.04),0_12px_40px_-24px_rgba(7,20,38,0.18)] sm:px-7">
            <p className="text-[10px] font-semibold tracking-[0.2em]" style={{ color: GOLD }}>
              {detail.school.code}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold" style={{ color: NAVY }}>
                {detail.school.name}
              </h2>
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{ backgroundColor: SURFACE_WARM, color: NAVY }}
              >
                {SCHOOL_STATUS_LABELS[detail.school.status]}
              </span>
            </div>
            <p className="mt-2 text-[13px] text-slate-500">
              {detail.school.region} · {detail.school.prefecture} · 代表{" "}
              {detail.school.representativeName || "—"}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {(
                [
                  ["所属講師", String(detail.instructors.length)],
                  ["受講生", String(detail.students.length)],
                  ["開催講座", String(detail.courses.length)],
                  ["修了率", formatPercent(detail.completionRate, 0)],
                  ["活動状況", detail.activity.label],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl px-3 py-3"
                  style={{ backgroundColor: SURFACE_WARM }}
                >
                  <p className="text-[10px] tracking-[0.12em] text-slate-400">{label}</p>
                  <p className="mt-1 text-[15px] font-semibold" style={{ color: NAVY }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="所属講師" eyebrow="INSTRUCTORS">
              <ul className="divide-y divide-slate-100">
                {detail.instructors.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-[14px] font-semibold" style={{ color: NAVY }}>
                        {row.displayName}
                      </p>
                      <p className="text-[12px] text-slate-500">{row.levelLabel}</p>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {INSTRUCTOR_OPS_STATUS_LABELS[row.status]}
                    </span>
                  </li>
                ))}
                {detail.instructors.length === 0 ? (
                  <li className="py-6 text-sm text-slate-400">所属講師はいません</li>
                ) : null}
              </ul>
              <Link
                href="/admin/certification"
                className="mt-3 inline-block text-[12px] font-semibold"
                style={{ color: GOLD }}
              >
                認定講師管理へ →
              </Link>
            </SectionCard>

            <SectionCard title="受講生" eyebrow="STUDENTS">
              <ul className="divide-y divide-slate-100">
                {detail.students.map((row) => (
                  <li key={row.id} className="py-3">
                    <p className="text-[14px] font-semibold" style={{ color: NAVY }}>
                      {row.displayName}
                    </p>
                    <p className="text-[12px] text-slate-500">
                      {row.courseTitle ?? "講座未割当"} · {row.status}
                    </p>
                  </li>
                ))}
                {detail.students.length === 0 ? (
                  <li className="py-6 text-sm text-slate-400">受講生はいません</li>
                ) : null}
              </ul>
            </SectionCard>
          </div>

          <SectionCard title="開催講座" eyebrow="COURSES">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400">
                    <th className="py-2 pr-4 font-medium">講座名</th>
                    <th className="py-2 pr-4 font-medium">期間</th>
                    <th className="py-2 pr-4 font-medium">受講 / 定員</th>
                    <th className="py-2 font-medium">状態</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.courses.map((course) => (
                    <tr key={course.id} className="border-b border-slate-50">
                      <td className="py-3 pr-4 font-semibold" style={{ color: NAVY }}>
                        {course.title}
                        <p className="text-[11px] font-normal text-slate-400">
                          {course.instructorName ?? "担当未設定"}
                        </p>
                      </td>
                      <td className="py-3 pr-4 text-slate-500">
                        {course.startsOn ?? "—"} 〜 {course.endsOn ?? "—"}
                      </td>
                      <td className="py-3 pr-4 tabular-nums text-slate-600">
                        {course.enrolledCount} / {course.capacity || "—"}
                      </td>
                      <td className="py-3 text-slate-500">{course.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {detail.courses.length === 0 ? (
                <p className="py-6 text-sm text-slate-400">開催講座はありません</p>
              ) : null}
            </div>
          </SectionCard>
        </div>
      ) : null}
    </AdminShell>
  );
}
