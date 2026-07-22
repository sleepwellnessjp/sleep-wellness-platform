"use client";

import ErrorState from "@/components/ui/ErrorState";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-5">
      <div className="w-full max-w-md">
        <ErrorState
          title="予期しないエラーが発生しました"
          message={error.message || "しばらくしてから再度お試しください。"}
          onRetry={reset}
        />
      </div>
    </main>
  );
}
