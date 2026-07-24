"use client";

import CriticalErrorView from "@/components/beta/CriticalErrorView";

export default function GlobalSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center overflow-x-hidden bg-[#f7f7f5] px-4 py-16 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-20 sm:pb-20">
      <CriticalErrorView
        title="予期しないエラーが発生しました"
        message="しばらくしてから再度お試しください。問題が続く場合は、参照コードを添えてフィードバックをお送りください。"
        digest={error.digest}
        onRetry={reset}
      />
    </main>
  );
}
