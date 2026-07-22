"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY, TEAL } from "@/components/ui/tokens";
import type { AdminAcademyOverview } from "@/lib/admin/types";

export default function AdminAcademyPage() {
  const [academy, setAcademy] = useState<AdminAcademyOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/admin/academy", { cache: "no-store" })
      .then(async (response) => {
        const json = (await response.json()) as {
          academy?: AdminAcademyOverview;
          error?: string;
        };
        if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
        setAcademy(json.academy ?? null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "取得に失敗しました");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminShell
      title="Academy管理"
      description="資格の発行数、更新期限、更新予定者を一覧で確認します。"
    >
      {loading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-[28px]" />
          ))}
        </div>
      ) : error ? (
        <SectionCard title="読み込みエラー">
          <p className="text-sm text-slate-600">{error}</p>
        </SectionCard>
      ) : academy ? (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            {academy.byQualification.map((item) => (
              <article
                key={item.qualificationId}
                className="rounded-[28px] border border-slate-200/90 bg-white px-5 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.18)]"
              >
                <p
                  className="text-[10px] font-semibold tracking-[0.18em]"
                  style={{ color: GOLD }}
                >
                  QUALIFICATION
                </p>
                <h2
                  className="mt-3 text-lg font-semibold tracking-[-0.03em]"
                  style={{ color: NAVY }}
                >
                  {item.label}
                </h2>
                <dl className="mt-5 grid grid-cols-3 gap-2 text-center text-sm">
                  <div>
                    <dt className="text-[11px] text-slate-400">発行数</dt>
                    <dd className="mt-1 text-xl font-semibold" style={{ color: NAVY }}>
                      {item.issuedCount}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-slate-400">更新予定</dt>
                    <dd className="mt-1 text-xl font-semibold" style={{ color: TEAL }}>
                      {item.renewingSoonCount}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-slate-400">失効</dt>
                    <dd className="mt-1 text-xl font-semibold text-slate-500">
                      {item.expiredCount}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <SectionCard eyebrow="RENEWAL" title="更新予定者（90日以内）">
              <ul className="space-y-3">
                {academy.renewingSoon.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-2xl border border-slate-100 bg-[#fafaf8] px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold" style={{ color: NAVY }}>
                          {item.userName}
                        </p>
                        <p className="mt-1 text-[12px] text-slate-500">
                          {item.qualificationLabel} · {item.certificateNumber}
                        </p>
                      </div>
                      <p className="text-[12px] font-semibold" style={{ color: TEAL }}>
                        残{item.daysUntilExpiry ?? "—"}日
                      </p>
                    </div>
                    <p className="mt-2 text-[12px] text-slate-500">
                      期限 {item.expiresAt}
                    </p>
                  </li>
                ))}
                {academy.renewingSoon.length === 0 ? (
                  <li className="py-8 text-center text-sm text-slate-400">
                    更新予定者はいません。
                  </li>
                ) : null}
              </ul>
            </SectionCard>

            <SectionCard eyebrow="EXPIRY" title="更新期限一覧">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] uppercase tracking-[0.14em] text-slate-400">
                      <th className="py-3 pr-3 font-semibold">氏名</th>
                      <th className="py-3 pr-3 font-semibold">資格</th>
                      <th className="py-3 font-semibold">期限</th>
                    </tr>
                  </thead>
                  <tbody>
                    {academy.expiryCalendar.map((item) => (
                      <tr key={item.id} className="border-b border-slate-50">
                        <td className="py-3 pr-3 font-medium" style={{ color: NAVY }}>
                          {item.userName}
                        </td>
                        <td className="py-3 pr-3 text-slate-600">
                          {item.qualificationLabel}
                        </td>
                        <td className="py-3 text-slate-500">{item.expiresAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {academy.expiryCalendar.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">
                    資格データがありません。
                  </p>
                ) : null}
              </div>
            </SectionCard>
          </div>
        </>
      ) : null}
    </AdminShell>
  );
}
