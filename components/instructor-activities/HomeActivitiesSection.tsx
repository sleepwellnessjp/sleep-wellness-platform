import ActivityCard from "@/components/instructor-activities/ActivityCard";
import type { PublicActivityCard } from "@/lib/instructor-activities/types";
import Link from "next/link";

export default function HomeActivitiesSection({
  activities,
}: {
  activities: PublicActivityCard[];
}) {
  return (
    <section className="relative overflow-hidden bg-[#071426] py-16 sm:py-20">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d8b36a]/40 to-transparent" />
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <p className="text-[11px] font-semibold tracking-[0.28em] text-[#d8b36a]">
          INSTRUCTOR ACTIVITIES
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
          認定インストラクター関連情報
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
          Sleep Wellness Institute Japan
          認定インストラクターが開催するワークショップやイベントをご紹介します。
        </p>
        {activities.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
            {activities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} tone="dark" />
            ))}
          </div>
        ) : (
          <p className="mt-8 text-sm text-white/55">
            現在、公開中の開催予定イベントはありません。
          </p>
        )}
        <div className="mt-8 flex justify-center">
          <Link
            href="/instructor-activities"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#d8b36a]/40 bg-white/[0.03] px-7 text-sm font-semibold text-[#d8b36a] transition hover:-translate-y-0.5 hover:border-[#d8b36a]/70 hover:bg-white/[0.07]"
          >
            認定インストラクターの活動をもっと見る
          </Link>
        </div>
      </div>
    </section>
  );
}
