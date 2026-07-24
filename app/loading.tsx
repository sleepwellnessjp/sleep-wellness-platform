import Loading from "@/design-system/Loading";

/** Route-level loading — calm SWIJ spinner (v2.3). */
export default function RootLoading() {
  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-[color:var(--sw-surface)] px-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loading label="読み込み中" size="lg" />
    </div>
  );
}
