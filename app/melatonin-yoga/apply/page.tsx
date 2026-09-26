import type { Metadata } from "next";
import Footer from "@/components/Footer";
import MelatoninYogaRegistrationForm from "@/components/melatonin-yoga/MelatoninYogaRegistrationForm";
import InstructorPublicShell from "@/components/instructors/InstructorPublicShell";
import { parseMelatoninYogaApplyType } from "@/lib/melatonin-yoga/apply-url";

export const metadata: Metadata = {
  title: "メラトニンヨガ™ お申し込み | Sleep Wellness Institute Japan",
  description:
    "メラトニンヨガ™ の相談会・ワークショップ・養成コースのお申し込みフォームです。",
};

export default async function MelatoninYogaApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const initialEventType = parseMelatoninYogaApplyType(params.type);

  return (
    <InstructorPublicShell title="メラトニンヨガ™ 申込" titleHref="/melatonin-yoga/apply">
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs font-semibold tracking-[0.22em] text-[#8a6a2d]">
          MELATONIN YOGA
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#071426] sm:text-4xl">
          メラトニンヨガ™ お申し込み
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          相談会・ワークショップ・養成コースへの参加をお申し込みいただけます。ログインは不要です。
        </p>
        <div className="mt-8">
          <MelatoninYogaRegistrationForm initialEventType={initialEventType} />
        </div>
      </main>
      <Footer />
    </InstructorPublicShell>
  );
}
