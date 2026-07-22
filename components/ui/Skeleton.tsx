type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-slate-200/70 ${className}`}
      aria-hidden
    />
  );
}

export function SkeletonLine({ className = "" }: SkeletonProps) {
  return <Skeleton className={`h-3.5 ${className}`} />;
}

/** Soft card skeleton for coach / journey / homework blocks. */
export function SoftSkeleton({
  variant = "card",
}: {
  variant?: "card" | "coach" | "journey" | "homework" | "page";
}) {
  if (variant === "page") {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-5 py-8 sm:space-y-8 sm:px-8 sm:py-12" aria-busy>
        <div className="space-y-3 px-1">
          <SkeletonLine className="w-28" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-56 w-full rounded-[28px]" />
        <Skeleton className="h-48 w-full rounded-[28px]" />
        <Skeleton className="h-40 w-full rounded-[28px]" />
        <Skeleton className="h-36 w-full rounded-[28px]" />
      </div>
    );
  }

  if (variant === "coach") {
    return (
      <div
        className="animate-pulse rounded-[28px] bg-slate-100/80 px-5 py-10 sm:px-7"
        aria-hidden
      >
        <div className="mx-auto h-4 w-40 rounded bg-slate-200/80" />
        <div className="mx-auto mt-6 h-24 w-full max-w-md rounded-2xl bg-slate-200/60" />
        <div className="mx-auto mt-4 h-20 w-full max-w-md rounded-2xl bg-slate-200/50" />
      </div>
    );
  }

  if (variant === "journey") {
    return (
      <div
        className="animate-pulse rounded-[28px] bg-slate-100/80 px-5 py-10 sm:px-7"
        aria-hidden
      >
        <div className="mx-auto h-4 w-52 rounded bg-slate-200/80" />
        <div className="mx-auto mt-8 h-40 w-full max-w-sm rounded-2xl bg-slate-200/60" />
        <div className="mx-auto mt-6 h-24 w-full max-w-md rounded-2xl bg-slate-200/50" />
      </div>
    );
  }

  if (variant === "homework") {
    return (
      <div className="space-y-3" aria-busy aria-label="宿題を読み込み中">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div
      className="animate-pulse rounded-[28px] bg-slate-100/80 px-5 py-8 sm:px-7"
      aria-hidden
    >
      <div className="h-4 w-36 rounded bg-slate-200/80" />
      <div className="mt-5 h-28 w-full rounded-2xl bg-slate-200/60" />
      <div className="mt-4 h-4 w-[75%] rounded bg-slate-200/50" />
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 py-4" aria-busy>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-2xl" />
      ))}
    </div>
  );
}
