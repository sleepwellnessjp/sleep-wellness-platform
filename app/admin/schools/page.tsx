"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import Button from "@/components/ui/Button";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY, SURFACE_WARM } from "@/components/ui/tokens";
import { SWIJ_EYEBROW_OPS } from "@/lib/brand/swij-brand";
import { formatPercent, SCHOOL_STATUS_LABELS } from "@/lib/ops/constants";
import type { CertifiedSchoolRecord } from "@/lib/ops/types";

export default function AdminSchoolsPage() {
  const [schools, setSchools] = useState<CertifiedSchoolRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    region: "",
    prefecture: "",
    representativeName: "",
    contactEmail: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/ops?resource=schools&q=${encodeURIComponent(query)}`,
        { cache: "no-store" },
      );
      const json = (await response.json()) as {
        schools?: CertifiedSchoolRecord[];
        error?: string;
      };
      if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
      setSchools(json.schools ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  const createSchool = async () => {
    setMessage(null);
    const response = await fetch("/api/admin/ops?resource=schools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(json.error ?? "登録に失敗しました");
      return;
    }
    setShowForm(false);
    setForm({
      code: "",
      name: "",
      region: "",
      prefecture: "",
      representativeName: "",
      contactEmail: "",
    });
    setMessage("認定校を登録しました");
    await load();
  };

  return (
    <AdminShell
      eyebrow={SWIJ_EYEBROW_OPS}
      title="認定校管理"
      description="認定校ごとの所属講師・受講生・開催講座・修了率・活動状況を確認します。"
      actions={
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "閉じる" : "認定校を追加"}
        </Button>
      }
    >
      {message ? (
        <p className="mb-4 text-sm" style={{ color: GOLD }}>
          {message}
        </p>
      ) : null}

      {showForm ? (
        <SectionCard title="新規認定校" eyebrow="NEW" className="mb-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["code", "認定校コード"],
                ["name", "名称"],
                ["region", "地域"],
                ["prefecture", "都道府県"],
                ["representativeName", "代表者"],
                ["contactEmail", "連絡先メール"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-[12px] text-slate-500">
                {label}
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[14px]"
                  value={form[key]}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                />
              </label>
            ))}
          </div>
          <div className="mt-4">
            <Button size="sm" onClick={() => void createSchool()}>
              登録する
            </Button>
          </div>
        </SectionCard>
      ) : null}

      <div className="mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="校名・コード・地域で検索"
          className="w-full max-w-md rounded-full border border-slate-200 px-4 py-2 text-[13px]"
        />
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full rounded-[28px]" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {schools.map((school) => (
            <Link
              key={school.id}
              href={`/admin/schools/${school.id}`}
              className="rounded-[28px] border border-[rgba(7,20,38,0.1)] bg-white px-5 py-5 shadow-[0_1px_2px_rgba(7,20,38,0.04),0_12px_40px_-24px_rgba(7,20,38,0.18)] transition hover:opacity-95"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p
                    className="text-[10px] font-semibold tracking-[0.18em]"
                    style={{ color: GOLD }}
                  >
                    {school.code}
                  </p>
                  <h2
                    className="mt-2 text-[17px] font-semibold tracking-[-0.03em]"
                    style={{ color: NAVY }}
                  >
                    {school.name}
                  </h2>
                  <p className="mt-1 text-[13px] text-slate-500">
                    {school.region} · {school.prefecture}
                  </p>
                </div>
                <span
                  className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{ backgroundColor: SURFACE_WARM, color: NAVY }}
                >
                  {SCHOOL_STATUS_LABELS[school.status]}
                </span>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-3 text-[12px]">
                <div>
                  <dt className="text-slate-400">所属講師</dt>
                  <dd className="mt-0.5 font-semibold" style={{ color: NAVY }}>
                    {school.instructorCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">受講生</dt>
                  <dd className="mt-0.5 font-semibold" style={{ color: NAVY }}>
                    {school.studentCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">開催講座</dt>
                  <dd className="mt-0.5 font-semibold" style={{ color: NAVY }}>
                    {school.courseCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">修了率</dt>
                  <dd className="mt-0.5 font-semibold" style={{ color: NAVY }}>
                    {formatPercent(school.completionRate, 0)}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-[12px] font-semibold" style={{ color: GOLD }}>
                活動状況 · {school.activityLabel}
              </p>
            </Link>
          ))}
          {schools.length === 0 ? (
            <SectionCard title="認定校がありません">
              <p className="text-sm text-slate-500">
                右上から認定校を追加してください。
              </p>
            </SectionCard>
          ) : null}
        </div>
      )}
    </AdminShell>
  );
}
