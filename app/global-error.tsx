"use client";

import CriticalErrorView from "@/components/beta/CriticalErrorView";

/**
 * Root layout 自体が落ちたときの最終セーフティネット
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ja">
      <body className="flex min-h-screen items-center justify-center overflow-x-hidden bg-[#f7f7f5] px-4 py-16 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-20">
        <CriticalErrorView
          title="システムエラーが発生しました"
          message="予期しない問題により画面を表示できませんでした。再試行するか、トップからやり直してください。Closed Beta 期間中はフィードバックでもご連絡いただけます。"
          digest={error.digest}
          onRetry={reset}
        />
      </body>
    </html>
  );
}
