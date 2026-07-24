type SkeletonProps = {
  className?: string;
};

/** Soft shimmer placeholder — prefers CSS animation over harsh pulse. */
export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`sw-skeleton rounded-xl ${className}`}
      aria-hidden
    />
  );
}

export function SkeletonLine({ className = "" }: SkeletonProps) {
  return <Skeleton className={`h-3.5 ${className}`} />;
}

/** Soft card skeleton for coach / journey / homework / page blocks. */
export function SoftSkeleton({
  variant = "card",
}: {
  variant?: "card" | "coach" | "journey" | "homework" | "page" | "dashboard";
}) {
  if (variant === "page") {
    return (
      <div
        className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:space-y-6 sm:px-6 sm:py-10 md:space-y-8 md:px-8 md:py-12"
        aria-busy="true"
        aria-label="読み込み中"
        role="status"
      >
        <div className="space-y-3 px-1">
          <SkeletonLine className="w-28" />
          <Skeleton className="h-8 w-48 rounded-lg" />
        </div>
        <Skeleton className="h-56 w-full rounded-[var(--sw-card-radius)]" />
        <Skeleton className="h-48 w-full rounded-[var(--sw-card-radius)]" />
        <Skeleton className="h-40 w-full rounded-[var(--sw-card-radius)]" />
        <Skeleton className="h-36 w-full rounded-[var(--sw-card-radius)]" />
      </div>
    );
  }

  if (variant === "dashboard") {
    return (
      <div
        className="space-y-5 sm:space-y-6"
        aria-busy="true"
        aria-label="読み込み中"
        role="status"
      >
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 md:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-28 w-full rounded-[var(--sw-card-radius)]"
            />
          ))}
        </div>
        <Skeleton className="h-56 w-full rounded-[var(--sw-card-radius)]" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48 w-full rounded-[var(--sw-card-radius)]" />
          <Skeleton className="h-48 w-full rounded-[var(--sw-card-radius)]" />
        </div>
      </div>
    );
  }

  if (variant === "coach") {
    return (
      <div
        className="sw-skeleton-block rounded-[var(--sw-card-radius)] px-5 py-10 sm:px-7"
        aria-busy="true"
        aria-label="読み込み中"
        role="status"
      >
        <div className="mx-auto h-4 w-40 rounded bg-[color:var(--sw-skeleton-block)]" />
        <div className="mx-auto mt-6 h-24 w-full max-w-md rounded-2xl bg-[color:var(--sw-skeleton-block)]" />
        <div className="mx-auto mt-4 h-20 w-full max-w-md rounded-2xl bg-[color:var(--sw-skeleton-block)] opacity-80" />
      </div>
    );
  }

  if (variant === "journey") {
    return (
      <div
        className="sw-skeleton-block rounded-[var(--sw-card-radius)] px-5 py-10 sm:px-7"
        aria-busy="true"
        aria-label="読み込み中"
        role="status"
      >
        <div className="mx-auto h-4 w-52 rounded bg-[color:var(--sw-skeleton-block)]" />
        <div className="mx-auto mt-8 h-40 w-full max-w-sm rounded-2xl bg-[color:var(--sw-skeleton-block)]" />
        <div className="mx-auto mt-6 h-24 w-full max-w-md rounded-2xl bg-[color:var(--sw-skeleton-block)] opacity-80" />
      </div>
    );
  }

  if (variant === "homework") {
    return (
      <div
        className="space-y-3"
        aria-busy="true"
        aria-label="宿題を読み込み中"
        role="status"
      >
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div
      className="sw-skeleton-block rounded-[var(--sw-card-radius)] px-5 py-8 sm:px-7"
      aria-busy="true"
      aria-label="読み込み中"
      role="status"
    >
      <div className="h-4 w-36 rounded bg-[color:var(--sw-skeleton-block)]" />
      <div className="mt-5 h-28 w-full rounded-2xl bg-[color:var(--sw-skeleton-block)]" />
      <div className="mt-4 h-4 w-[75%] rounded bg-[color:var(--sw-skeleton-block)] opacity-80" />
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div
      className="space-y-3 py-4"
      aria-busy="true"
      aria-label="一覧を読み込み中"
      role="status"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-2xl" />
      ))}
    </div>
  );
}
