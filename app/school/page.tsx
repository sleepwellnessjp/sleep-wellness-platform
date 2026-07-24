"use client";

import Link from "next/link";
import OsShell from "@/components/os/OsShell";
import SectionCard from "@/components/ui/SectionCard";
import { GOLD, NAVY } from "@/components/ui/tokens";

export default function SchoolDashboardPage() {
  return (
    <OsShell
      role="school"
      eyebrow="SCHOOL"
      contentClassName="mx-auto max-w-3xl px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-10 md:px-8 md:py-12 lg:py-14"
    >
      <header className="mb-8 sm:mb-10">
        <p
          className="text-[11px] font-semibold tracking-[0.28em]"
          style={{ color: GOLD }}
        >
          CERTIFIED SCHOOL
        </p>
        <h1
          className="mt-3 text-[1.65rem] font-semibold tracking-[-0.04em] sm:text-[1.85rem]"
          style={{ color: NAVY }}
        >
          認定校ダッシュボード
        </h1>
        <p className="mt-2 max-w-xl text-[14px] leading-7 text-slate-500">
          所属認定講師・受講状況・プランを確認できます（閲覧中心）。
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <SectionCard eyebrow="ROSTER" title="所属講師">
          <p className="text-[14px] leading-7 text-slate-600">
            認定校に紐づく講師一覧は本部の認定校管理から確認できます。
          </p>
          <Link
            href="/admin/schools"
            className="mt-4 inline-flex text-[13px] font-semibold underline-offset-2 hover:underline"
            style={{ color: NAVY }}
          >
            校情報を開く
          </Link>
        </SectionCard>
        <SectionCard eyebrow="PLAN" title="プラン">
          <p className="text-[14px] leading-7 text-slate-600">
            Enterprise プランのモック画面で契約内容を確認できます。
          </p>
          <Link
            href="/billing"
            className="mt-4 inline-flex text-[13px] font-semibold underline-offset-2 hover:underline"
            style={{ color: NAVY }}
          >
            プランを見る
          </Link>
        </SectionCard>
        <SectionCard eyebrow="PERMISSION" title="権限">
          <p className="text-[14px] leading-7 text-slate-600">
            認定校は校内データの閲覧が中心です。分析実行・クライアント招待は認定講師権限が必要です。
          </p>
        </SectionCard>
        <SectionCard eyebrow="NOTIFY" title="通知">
          <p className="text-[14px] leading-7 text-slate-600">
            本部からのお知らせ・更新案内を確認します。
          </p>
          <Link
            href="/notifications"
            className="mt-4 inline-flex text-[13px] font-semibold underline-offset-2 hover:underline"
            style={{ color: NAVY }}
          >
            通知センター
          </Link>
        </SectionCard>
      </div>
    </OsShell>
  );
}
