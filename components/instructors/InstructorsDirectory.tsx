"use client";

import { useEffect, useMemo, useState } from "react";
import InstructorCard from "@/components/instructors/InstructorCard";
import type { InstructorPublicCard } from "@/lib/instructors/types";

type FilterKey =
  | "online"
  | "yoga"
  | "matPilates"
  | "machinePilates"
  | "melatoninYoga"
  | "sleepWellnessCert";

const FILTER_CHIPS: { key: FilterKey; label: string }[] = [
  { key: "online", label: "オンライン対応" },
  { key: "yoga", label: "ヨガ講師" },
  { key: "matPilates", label: "マットピラティス講師" },
  { key: "machinePilates", label: "マシンピラティス講師" },
  { key: "melatoninYoga", label: "メラトニンヨガ™" },
  { key: "sleepWellnessCert", label: "Sleep Wellness関連資格" },
];

export default function InstructorsDirectory({
  initialInstructors,
}: {
  initialInstructors: InstructorPublicCard[];
}) {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("");
  const [flags, setFlags] = useState<Record<FilterKey, boolean>>({
    online: false,
    yoga: false,
    matPilates: false,
    machinePilates: false,
    melatoninYoga: false,
    sleepWellnessCert: false,
  });
  const [instructors, setInstructors] =
    useState<InstructorPublicCard[]>(initialInstructors);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const areas = useMemo(() => {
    const set = new Set<string>();
    for (const item of initialInstructors) {
      if (item.activityArea) set.add(item.activityArea);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ja"));
  }, [initialInstructors]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (area.trim()) params.set("area", area.trim());
      if (flags.online) params.set("online", "1");
      if (flags.yoga) params.set("yoga", "1");
      if (flags.matPilates) params.set("mat_pilates", "1");
      if (flags.machinePilates) params.set("machine_pilates", "1");
      if (flags.melatoninYoga) params.set("melatonin_yoga", "1");
      if (flags.sleepWellnessCert) params.set("sw_cert", "1");

      const hasFilter =
        params.toString().length > 0 ||
        Object.values(flags).some(Boolean) ||
        query.trim() ||
        area.trim();

      if (!hasFilter) {
        setInstructors(initialInstructors);
        setError(null);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/instructors?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const json = (await response.json()) as {
          instructors?: InstructorPublicCard[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(json.error ?? "検索に失敗しました");
        }
        setInstructors(json.instructors ?? []);
        setError(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "検索に失敗しました");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, area, flags, initialInstructors]);

  const toggle = (key: FilterKey) => {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div>
      <div className="rounded-[28px] border border-[#071426]/08 bg-white p-4 shadow-[0_1px_2px_rgba(7,20,38,0.04),0_20px_50px_-36px_rgba(7,20,38,0.22)] sm:p-6">
        <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="名前・活動名で検索"
            className="min-h-12 rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 text-[15px] outline-none transition focus:border-[#8a6a2d] focus:ring-4 focus:ring-[#8a6a2d]/15"
          />
          <select
            value={area}
            onChange={(event) => setArea(event.target.value)}
            className="min-h-12 rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 text-[15px] outline-none focus:border-[#8a6a2d] focus:ring-4 focus:ring-[#8a6a2d]/15"
          >
            <option value="">活動地域（すべて）</option>
            {areas.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {FILTER_CHIPS.map((chip) => {
            const active = flags[chip.key];
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => toggle(chip.key)}
                className={`inline-flex min-h-10 items-center rounded-full border px-3.5 text-xs font-semibold transition sm:text-sm ${
                  active
                    ? "border-[#071426] bg-[#071426] text-white"
                    : "border-[#071426]/12 bg-white text-[#071426]/75 hover:border-[#8a6a2d]/40 hover:text-[#071426]"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {loading ? "検索中…" : `${instructors.length} 名の認定講師`}
        </p>
        {error ? <p className="text-sm text-[#a33a3a]">{error}</p> : null}
      </div>

      {instructors.length === 0 ? (
        <div className="mt-8 rounded-[28px] border border-dashed border-[#071426]/15 bg-white/70 px-6 py-16 text-center">
          <p className="text-lg font-semibold text-[#071426]">
            条件に合う認定講師が見つかりません
          </p>
          <p className="mt-2 text-sm text-slate-500">
            検索条件を変更するか、しばらくしてから再度ご確認ください。
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {instructors.map((instructor) => (
            <InstructorCard key={instructor.id} instructor={instructor} />
          ))}
        </div>
      )}
    </div>
  );
}
