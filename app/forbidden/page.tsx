import Link from "next/link";
import { GOLD, NAVY } from "@/components/ui/tokens";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center overflow-x-hidden bg-[#f7f7f5] px-4 py-16 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-20 sm:pb-20">
      <div className="w-full max-w-md rounded-[28px] border border-slate-200/90 bg-white px-5 py-10 text-center shadow-[0_20px_60px_-48px_rgba(15,23,42,0.22)] sm:px-8 sm:py-12">
        <p
          className="text-[10px] font-semibold tracking-[0.22em]"
          style={{ color: GOLD }}
        >
          FORBIDDEN
        </p>
        <h1
          className="mt-3 break-words text-[1.55rem] font-semibold tracking-[-0.04em] sm:text-2xl"
          style={{ color: NAVY }}
        >
          アクセス権限がありません
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-[14px] leading-7 text-slate-500">
          この画面は現在の権限では閲覧・編集できません。SWIJ本部・認定校・認定講師・クライアントの権限をご確認ください。
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full px-6 text-[14px] font-semibold text-white transition active:opacity-90 sm:w-auto sm:min-h-11 sm:hover:opacity-90 sm:active:opacity-100"
            style={{ backgroundColor: NAVY }}
          >
            トップへ戻る
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[#8a6a2d]/30 bg-white px-6 text-[14px] font-semibold transition active:bg-[#faf7f1] sm:w-auto sm:min-h-11 sm:hover:bg-[#faf7f1] sm:active:bg-white"
            style={{ color: GOLD }}
          >
            ログイン
          </Link>
        </div>
      </div>
    </main>
  );
}
