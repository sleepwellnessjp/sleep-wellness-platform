"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import Button from "@/components/ui/Button";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY, SURFACE_WARM } from "@/components/ui/tokens";
import { SWIJ_EYEBROW_OPS } from "@/lib/brand/swij-brand";
import {
  INSTRUCTOR_OPS_STATUS_LABELS,
} from "@/lib/ops/constants";
import type {
  CertificationLevelRecord,
  CertifiedInstructorRecord,
  CertifiedSchoolRecord,
  InstructorOpsAction,
} from "@/lib/ops/types";

type Tab = "instructors" | "levels";

export default function AdminCertificationPage() {
  const [tab, setTab] = useState<Tab>("instructors");
  const [instructors, setInstructors] = useState<CertifiedInstructorRecord[]>([]);
  const [levels, setLevels] = useState<CertificationLevelRecord[]>([]);
  const [schools, setSchools] = useState<CertifiedSchoolRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [insRes, levelRes, schoolRes] = await Promise.all([
        fetch("/api/admin/ops?resource=instructors", { cache: "no-store" }),
        fetch("/api/admin/ops?resource=levels", { cache: "no-store" }),
        fetch("/api/admin/ops?resource=schools", { cache: "no-store" }),
      ]);
      const insJson = (await insRes.json()) as {
        instructors?: CertifiedInstructorRecord[];
        error?: string;
      };
      const levelJson = (await levelRes.json()) as {
        levels?: CertificationLevelRecord[];
        error?: string;
      };
      const schoolJson = (await schoolRes.json()) as {
        schools?: CertifiedSchoolRecord[];
        error?: string;
      };
      if (!insRes.ok) throw new Error(insJson.error ?? "取得に失敗しました");
      if (!levelRes.ok) throw new Error(levelJson.error ?? "取得に失敗しました");
      setInstructors(insJson.instructors ?? []);
      setLevels(levelJson.levels ?? []);
      setSchools(schoolJson.schools ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return instructors.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!needle) return true;
      return [row.displayName, row.email, row.instructorNumber, row.schoolName ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [instructors, query, statusFilter]);

  const selected =
    filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;

  const act = async (action: InstructorOpsAction, extra?: Record<string, unknown>) => {
    if (!selected) return;
    setMessage(null);
    const response = await fetch("/api/admin/ops?resource=instructors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selected.id, action, ...extra }),
    });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(json.error ?? "操作に失敗しました");
      return;
    }
    setMessage("更新しました");
    await load();
  };

  const saveLevel = async (level: CertificationLevelRecord) => {
    setMessage(null);
    const response = await fetch("/api/admin/ops?resource=levels", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: level.id,
        renewalMonths: level.renewalMonths,
        ceHoursRequired: level.ceHoursRequired,
        isActive: level.isActive,
        description: level.description,
      }),
    });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(json.error ?? "保存に失敗しました");
      return;
    }
    setMessage("認定レベルを保存しました");
    await load();
  };

  return (
    <AdminShell
      eyebrow={SWIJ_EYEBROW_OPS}
      title="認定講師管理"
      description="認定校・認定レベル・更新・停止・退会を本部から運営します。"
      actions={
        <Button href="/admin/schools" variant="secondary" size="sm">
          認定校一覧
        </Button>
      }
    >
      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ["instructors", "認定講師"],
            ["levels", "認定レベル"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-4 py-2 text-[13px] font-semibold transition ${
              tab === id ? "text-white" : "bg-white text-slate-500 hover:bg-slate-50"
            }`}
            style={tab === id ? { backgroundColor: NAVY } : { border: "1px solid rgba(7,20,38,0.1)" }}
          >
            {label}
          </button>
        ))}
      </div>

      {message ? (
        <p className="mb-4 text-sm" style={{ color: GOLD }}>
          {message}
        </p>
      ) : null}

      {loading ? (
        <Skeleton className="h-64 w-full rounded-[28px]" />
      ) : tab === "levels" ? (
        <SectionCard title="認定レベル管理" eyebrow="LEVELS">
          <div className="space-y-4">
            {levels.map((level) => (
              <div
                key={level.id}
                className="rounded-2xl border border-slate-200/90 px-4 py-4"
                style={{ backgroundColor: SURFACE_WARM }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-semibold" style={{ color: NAVY }}>
                      {level.label}
                    </p>
                    <p className="mt-1 text-[13px] text-slate-500">{level.description}</p>
                    <p className="mt-2 text-[12px] text-slate-400">
                      所属講師 {level.instructorCount} 名
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-[12px] text-slate-600">
                    <input
                      type="checkbox"
                      checked={level.isActive}
                      onChange={(e) =>
                        setLevels((prev) =>
                          prev.map((l) =>
                            l.id === level.id
                              ? { ...l, isActive: e.target.checked }
                              : l,
                          ),
                        )
                      }
                    />
                    有効
                  </label>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <label className="text-[12px] text-slate-500">
                    更新周期（月）
                    <input
                      type="number"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[14px]"
                      value={level.renewalMonths}
                      onChange={(e) =>
                        setLevels((prev) =>
                          prev.map((l) =>
                            l.id === level.id
                              ? { ...l, renewalMonths: Number(e.target.value) }
                              : l,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="text-[12px] text-slate-500">
                    CE 必要時間
                    <input
                      type="number"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[14px]"
                      value={level.ceHoursRequired}
                      onChange={(e) =>
                        setLevels((prev) =>
                          prev.map((l) =>
                            l.id === level.id
                              ? {
                                  ...l,
                                  ceHoursRequired: Number(e.target.value),
                                }
                              : l,
                          ),
                        )
                      }
                    />
                  </label>
                  <div className="flex items-end">
                    <Button size="sm" onClick={() => void saveLevel(level)}>
                      保存
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <SectionCard title="認定講師一覧" eyebrow="INSTRUCTORS">
            <div className="mb-4 flex flex-wrap gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="氏名・番号・認定校"
                className="min-w-[12rem] flex-1 rounded-full border border-slate-200 px-4 py-2 text-[13px]"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-[13px]"
              >
                <option value="all">すべての状態</option>
                {Object.entries(INSTRUCTOR_OPS_STATUS_LABELS).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <ul className="divide-y divide-slate-100">
              {filtered.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(row.id)}
                    className={`flex w-full items-start justify-between gap-3 px-1 py-3 text-left transition ${
                      selected?.id === row.id ? "bg-[#faf7f1]" : "hover:bg-slate-50"
                    }`}
                  >
                    <div>
                      <p className="text-[14px] font-semibold" style={{ color: NAVY }}>
                        {row.displayName}
                      </p>
                      <p className="mt-0.5 text-[12px] text-slate-500">
                        {row.levelLabel} · {row.schoolName ?? "未所属"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {row.instructorNumber}
                      </p>
                    </div>
                    <span
                      className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      style={{
                        color: NAVY,
                        backgroundColor: "rgba(7,20,38,0.06)",
                      }}
                    >
                      {INSTRUCTOR_OPS_STATUS_LABELS[row.status]}
                    </span>
                  </button>
                </li>
              ))}
              {filtered.length === 0 ? (
                <li className="py-8 text-center text-sm text-slate-400">
                  該当する認定講師がいません
                </li>
              ) : null}
            </ul>
          </SectionCard>

          <SectionCard title="運営アクション" eyebrow="LIFECYCLE">
            {selected ? (
              <div className="space-y-4">
                <div>
                  <p className="text-[16px] font-semibold" style={{ color: NAVY }}>
                    {selected.displayName}
                  </p>
                  <p className="mt-1 text-[13px] text-slate-500">{selected.email}</p>
                  <p className="mt-2 text-[12px] text-slate-400">
                    更新期限 {selected.renewsAt}
                    {selected.daysUntilRenewal != null
                      ? `（残り ${selected.daysUntilRenewal} 日）`
                      : ""}
                  </p>
                </div>

                <label className="block text-[12px] text-slate-500">
                  利用開始日（Closed Beta）
                  <input
                    type="date"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[14px]"
                    defaultValue={selected.usageStartDate ?? ""}
                    key={`usage-${selected.id}-${selected.usageStartDate ?? ""}`}
                    onBlur={(e) => {
                      const value = e.target.value;
                      if (value === (selected.usageStartDate ?? "")) return;
                      void act("change_level", {
                        levelId: selected.levelId,
                        usageStartDate: value || null,
                      });
                    }}
                  />
                </label>

                <label className="block text-[12px] text-slate-500">
                  認定レベル変更
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[14px]"
                    defaultValue={selected.levelId}
                    onChange={(e) =>
                      void act("change_level", { levelId: e.target.value })
                    }
                  >
                    {levels.map((level) => (
                      <option key={level.id} value={level.id}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-[12px] text-slate-500">
                  所属認定校
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[14px]"
                    defaultValue={selected.schoolId ?? ""}
                    onChange={(e) =>
                      void act("assign_school", {
                        schoolId: e.target.value || null,
                      })
                    }
                  >
                    <option value="">未所属</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button size="sm" onClick={() => void act("renew")}>
                    認定更新
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void act("suspend")}
                  >
                    無効にする
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => void act("withdraw")}
                  >
                    退会
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void act("reactivate")}
                  >
                    有効にする
                  </Button>
                </div>

                {selected.schoolId ? (
                  <Link
                    href={`/admin/schools/${selected.schoolId}`}
                    className="inline-block text-[12px] font-semibold"
                    style={{ color: GOLD }}
                  >
                    所属認定校の詳細 →
                  </Link>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-slate-500">講師を選択してください</p>
            )}
          </SectionCard>
        </div>
      )}
    </AdminShell>
  );
}
