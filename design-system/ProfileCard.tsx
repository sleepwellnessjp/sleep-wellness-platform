import type { ReactNode } from "react";
import { GOLD, NAVY } from "./tokens";

type Props = {
  name: string;
  subtitle?: string;
  avatarUrl?: string | null;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

/**
 * ProfileCard — compact person / org identity block.
 */
export default function ProfileCard({
  name,
  subtitle,
  avatarUrl,
  badge,
  actions,
  className = "",
}: Props) {
  const initial = name.trim().slice(0, 1) || "?";

  return (
    <div
      className={`flex items-center gap-4 rounded-[24px] border border-slate-200/90 bg-white px-4 py-4 sm:px-5 ${className}`}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          className="h-14 w-14 rounded-full object-cover"
        />
      ) : (
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold text-white"
          style={{ backgroundColor: NAVY }}
          aria-hidden
        >
          {initial}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold tracking-[-0.02em]" style={{ color: NAVY }}>
            {name}
          </p>
          {badge}
        </div>
        {subtitle ? (
          <p className="mt-0.5 truncate text-sm text-slate-500">{subtitle}</p>
        ) : null}
        {actions ? <div className="mt-2">{actions}</div> : null}
      </div>
      {!badge && !actions ? (
        <span
          className="hidden text-[10px] font-semibold tracking-[0.18em] sm:inline"
          style={{ color: GOLD }}
        >
          PROFILE
        </span>
      ) : null}
    </div>
  );
}
