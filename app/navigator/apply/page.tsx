import type { Metadata } from "next";
import Footer from "@/components/Footer";
import NavigatorApplyForm from "@/components/navigator/NavigatorApplyForm";
import InstructorPublicShell from "@/components/instructors/InstructorPublicShell";

export const metadata: Metadata = {
  title: "睡眠ウェルネスナビゲーター申請 | Sleep Wellness Institute Japan",
  description:
    "メラトニンヨガ認定インストラクター向け、睡眠ウェルネスナビゲーターの申請フォームです。",
};

export default function NavigatorApplyPage() {
  return (
    <InstructorPublicShell title="ナビゲーター申請" titleHref="/navigator/apply">
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs font-semibold tracking-[0.22em] text-[#8a6a2d]">
          NAVIGATOR
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#071426] sm:text-4xl">
          睡眠ウェルネスナビゲーター申請
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          メラトニンヨガ認定インストラクターの方向けです。ログインは不要です。年額12,000円の登録料に同意のうえ、送信してください。
        </p>
        <div className="mt-8">
          <NavigatorApplyForm />
        </div>
      </main>
      <Footer />
    </InstructorPublicShell>
  );
}
