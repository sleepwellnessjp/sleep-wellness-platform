import Link from "next/link";
import { GOLD, NAVY } from "@/components/ui/tokens";
import { HOME_TOP_HREF } from "@/lib/home-intro";

type Props = {
  title?: string;
  message?: string;
  digest?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

/**
 * 重大エラー向けの分かりやすい安全画面（技術詳細は出さない）
 */
export default function CriticalErrorView({
  title = "問題が発生しました",
  message = "ご不便をおかけしています。ページを再読み込みするか、トップから再度お進みください。解決しない場合はフィードバックからご連絡ください。",
  digest,
  onRetry,
  retryLabel = "もう一度試す",
}: Props) {
  return (
    <div className="w-full max-w-md rounded-[28px] border border-slate-200/90 bg-white px-5 py-10 text-center shadow-[0_20px_60px_-48px_rgba(15,23,42,0.22)] sm:px-8 sm:py-12">
      <p
        className="text-[10px] font-semibold tracking-[0.22em]"
        style={{ color: GOLD }}
      >
        SAFETY
      </p>
      <h1
        className="mt-3 break-words text-[1.45rem] font-semibold tracking-[-0.04em] sm:text-2xl"
        style={{ color: NAVY }}
      >
        {title}
      </h1>
      <p className="mx-auto mt-3 max-w-sm text-[14px] leading-7 text-slate-500">
        {message}
      </p>
      {digest ? (
        <p className="mx-auto mt-3 max-w-sm break-all text-[11px] leading-5 text-slate-400">
          参照コード: {digest}
        </p>
      ) : null}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full px-6 text-[14px] font-semibold text-white transition active:opacity-90 sm:w-auto sm:min-h-11 sm:hover:opacity-90"
            style={{ backgroundColor: NAVY }}
          >
            {retryLabel}
          </button>
        ) : null}
        <Link
          href={HOME_TOP_HREF}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[#8a6a2d]/30 bg-white px-6 text-[14px] font-semibold transition active:bg-[#faf7f1] sm:w-auto sm:min-h-11 sm:hover:bg-[#faf7f1]"
          style={{ color: GOLD }}
        >
          トップへ戻る
        </Link>
        <Link
          href="/feedback"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-[14px] font-semibold text-slate-600 transition active:bg-slate-50 sm:w-auto sm:min-h-11 sm:hover:bg-slate-50"
        >
          フィードバックを送る
        </Link>
      </div>
    </div>
  );
}
