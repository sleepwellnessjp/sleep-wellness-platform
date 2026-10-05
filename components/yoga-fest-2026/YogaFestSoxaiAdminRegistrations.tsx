"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { NAVY } from "@/components/ui/tokens";
import { isMinorAgeBand } from "@/lib/yoga-fest-2026-soxai/age-band-csv";
import {
  formatYogaFestSoxaiClassSummary,
  formatYogaFestSoxaiSubmittedAt,
} from "@/lib/yoga-fest-2026-soxai/admin-format";
import {
  YOGA_FEST_2026_SOXAI_CLASSES,
  type YogaFest2026SoxaiClassId,
} from "@/lib/yoga-fest-2026-soxai/classes";
import type { YogaFest2026SoxaiRegistrationRecord } from "@/lib/yoga-fest-2026-soxai/types";

const ALL_FILTER = "all";

function FilterChip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition ${
        active ? "text-white" : "border border-slate-200 text-slate-600"
      }`}
      style={active ? { backgroundColor: NAVY } : undefined}
    >
      <span>{label}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-[11px] ${
          active ? "bg-white/20" : "bg-slate-100 text-slate-600"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

export default function YogaFestSoxaiAdminRegistrations() {
  const [registrations, setRegistrations] = useState<
    YogaFest2026SoxaiRegistrationRecord[]
  >([]);
  const [classFilter, setClassFilter] = useState<string>(ALL_FILTER);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/yoga-fest-2026/soxai/registrations", {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await response.json()) as {
        registrations?: YogaFest2026SoxaiRegistrationRecord[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(json.error ?? "取得に失敗しました");
      }
      setRegistrations(json.registrations ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const countsByClass = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of registrations) {
      map.set(row.classId, (map.get(row.classId) ?? 0) + 1);
    }
    return map;
  }, [registrations]);

  const filtered = useMemo(() => {
    if (classFilter === ALL_FILTER) return registrations;
    return registrations.filter((row) => row.classId === classFilter);
  }, [classFilter, registrations]);

  const remove = async (id: string, name: string) => {
    if (
      !window.confirm(
        `${name} さんの登録を削除しますか？この操作は取り消せません。`,
      )
    ) {
      return;
    }
    setDeletingId(id);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/yoga-fest-2026/soxai/registrations", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? "削除に失敗しました");
      }
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "削除に失敗しました");
    } finally {
      setDeletingId(null);
    }
  };

  const exportHref =
    classFilter === ALL_FILTER
      ? "/api/admin/yoga-fest-2026/soxai/registrations/export?classId=all"
      : `/api/admin/yoga-fest-2026/soxai/registrations/export?classId=${encodeURIComponent(classFilter)}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <a
          href="/api/admin/yoga-fest-2026/soxai/registrations/export?classId=all"
          className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-[#071426]"
        >
          全クラス CSV
        </a>
        <a
          href={exportHref}
          className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#8a6a2d]/40 bg-[#faf8f3] px-4 text-sm font-semibold text-[#071426]"
        >
          {classFilter === ALL_FILTER
            ? "絞り込み中（全クラス）CSV"
            : "表示中のクラス CSV"}
        </a>
      </div>

      <div className="sw-h-scroll -mx-1 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-2 sm:flex-wrap sm:overflow-visible">
        <FilterChip
          active={classFilter === ALL_FILTER}
          label="すべて"
          count={registrations.length}
          onClick={() => setClassFilter(ALL_FILTER)}
        />
        {YOGA_FEST_2026_SOXAI_CLASSES.map((session) => {
          const summary = formatYogaFestSoxaiClassSummary(session.id);
          return (
            <FilterChip
              key={session.id}
              active={classFilter === session.id}
              label={summary.heading}
              count={countsByClass.get(session.id) ?? 0}
              onClick={() => setClassFilter(session.id)}
            />
          );
        })}
      </div>

      {message ? (
        <p className="text-sm font-medium text-red-700" role="alert">
          {message}
        </p>
      ) : null}

      {loading ? (
        <SectionCard>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-4 h-24 w-full" />
        </SectionCard>
      ) : filtered.length === 0 ? (
        <SectionCard>
          <p className="text-sm text-slate-500">登録はまだありません。</p>
        </SectionCard>
      ) : (
        <ul className="space-y-3">
          {filtered.map((row) => {
            const classSummary = formatYogaFestSoxaiClassSummary(
              row.classId as YogaFest2026SoxaiClassId,
            );
            const showGuardian = isMinorAgeBand(row.ageBand);
            return (
              <li key={row.id}>
                <SectionCard className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs text-slate-500">
                        登録日時：{formatYogaFestSoxaiSubmittedAt(row.submittedAt)}
                      </p>
                      <p className="font-semibold text-[#071426]">{row.name}</p>
                      <p className="text-sm text-slate-600">{row.email}</p>
                      <p className="text-sm text-slate-600">年代：{row.ageBand}</p>
                      {showGuardian ? (
                        <p className="text-sm text-slate-600">
                          保護者：{row.guardianName ?? "—"}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={deletingId === row.id}
                      className="shrink-0 border-red-200 text-red-700 hover:bg-red-50"
                      onClick={() => void remove(row.id, row.name)}
                    >
                      {deletingId === row.id ? "削除中…" : "削除"}
                    </Button>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-[#fafaf8] px-4 py-3">
                    <p className="text-sm font-semibold text-[#071426]">
                      {classSummary.heading}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {classSummary.detail}
                    </p>
                  </div>
                </SectionCard>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
