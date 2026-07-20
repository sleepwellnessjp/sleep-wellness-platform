"use client";

import {
  CERTIFICATION_LABELS,
  MEMBERSHIP_STATUS_LABELS,
  ROLE_LABELS,
} from "@/lib/platform/constants";
import type { PlatformMeResponse } from "@/lib/platform/types";

const NAVY = "#071426";
const GOLD = "#8a6a2d";

function statusColor(status: string | null | undefined): string {
  if (status === "active") return "#0f6b5c";
  if (status === "renewal_pending") return "#9a7b12";
  if (status === "suspended") return "#b45a1a";
  return "#a33a3a";
}

export default function PlatformStatusCard({
  data,
  compact = false,
}: {
  data: PlatformMeResponse;
  compact?: boolean;
}) {
  const membership = data.membership;
  const certLabel = membership
    ? CERTIFICATION_LABELS[membership.certificationType]
    : "未登録";
  const statusLabel = membership
    ? MEMBERSHIP_STATUS_LABELS[membership.status]
    : "—";

  return (
    <section
      className={`rounded-[28px] border border-slate-200/90 bg-white shadow-[0_20px_60px_-48px_rgba(15,23,42,0.22)] ${
        compact ? "px-4 py-4 sm:px-5 sm:py-5" : "px-5 py-6 sm:px-7 sm:py-8"
      }`}
    >
      <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-slate-100 pb-3">
        <h2
          className="text-base font-semibold tracking-[-0.02em] sm:text-lg"
          style={{ color: NAVY }}
        >
          プラットフォームステータス
        </h2>
        <p
          className="text-[10px] font-semibold tracking-[0.22em]"
          style={{ color: GOLD }}
        >
          {ROLE_LABELS[data.profile.role].toUpperCase()}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="認定資格" value={certLabel} />
        <Stat
          label="資格状態"
          value={statusLabel}
          valueColor={statusColor(membership?.status)}
        />
        <Stat
          label="残クレジット"
          value={String(data.remainingCredits)}
          hint="今月"
        />
        <Stat
          label="今月利用数"
          value={String(data.analysesThisMonth)}
          hint="分析"
        />
      </div>

      {!compact && membership && (
        <dl className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
          <div className="flex justify-between gap-3 rounded-xl bg-[#fafaf8] px-3 py-2.5">
            <dt>認定日</dt>
            <dd className="font-semibold" style={{ color: NAVY }}>
              {membership.certifiedAt ?? "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-3 rounded-xl bg-[#fafaf8] px-3 py-2.5">
            <dt>有効期限</dt>
            <dd className="font-semibold" style={{ color: NAVY }}>
              {membership.expiresAt ?? "—"}
            </dd>
          </div>
        </dl>
      )}

      {!data.access.allowed && (
        <p className="mt-4 rounded-2xl border border-[#a33a3a]/20 bg-[#a33a3a]/06 px-4 py-3 text-sm leading-6 text-[#a33a3a]">
          {data.access.message}
        </p>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  hint,
  valueColor = NAVY,
}: {
  label: string;
  value: string;
  hint?: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-[#fafaf8] px-3 py-3.5 sm:px-4">
      <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p
        className="mt-1 text-lg font-semibold tracking-[-0.03em] sm:text-xl"
        style={{ color: valueColor }}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}
