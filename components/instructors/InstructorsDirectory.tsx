"use client";

import { useMemo, useState } from "react";
import InstructorCard from "@/components/instructors/InstructorCard";
import { matchesDirectoryFilters } from "@/lib/instructors/mappers";
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

  const areas = useMemo(() => {
    const set = new Set<string>();
    for (const item of initialInstructors) {
      if (item.activityArea) set.add(item.activityArea);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ja"));
  }, [initialInstructors]);

  const instructors = useMemo(
    () =>
      initialInstructors.filter((card) =>
        matchesDirectoryFilters(card, {
          query,
          activityArea: area,
          onlineOnly: flags.online,
          yoga: flags.yoga,
          matPilates: flags.matPilates,
          machinePilates: flags.machinePilates,
          melatoninYoga: flags.melatoninYoga,
          sleepWellnessCert: flags.sleepWellnessCert,
        }),
      ),
    [initialInstructors, query, area, flags],
  );

  const toggle = (key: FilterKey) => {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div>
      <div className="rounded-[28px] border border-[#071426]/08 bg-white p-4 shadow-[0_1px_2px_rgba(7,20,38,0.04),0_20px_50px_-36px_rgba(7,20,38,0.22)] sm:p-6">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold tracking-[0.14em] text-[#8a6a2d]">
            認定講師を探す
          </span>
          <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="名前で検索（例：若林、しのぶ）"
              className="min-h-12 rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 text-[15px] outline-none transition focus:border-[#8a6a2d] focus:ring-4 focus:ring-[#8a6a2d]/15"
              aria-label="認定講師を探す"
            />
            <select
              value={area}
              onChange={(event) => setArea(event.target.value)}
              className="min-h-12 rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 text-[15px] outline-none focus:border-[#8a6a2d] focus:ring-4 focus:ring-[#8a6a2d]/15"
              aria-label="活動地域"
            >
              <option value="">活動地域（すべて）</option>
              {areas.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </label>

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
          {instructors.length} 名の認定講師
        </p>
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
