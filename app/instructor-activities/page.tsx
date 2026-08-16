import type { Metadata } from "next";
import Link from "next/link";
import ActivityCard from "@/components/instructor-activities/ActivityCard";
import PublicIntroLayout from "@/components/site/PublicIntroLayout";
import { isUpcomingEventDate } from "@/lib/instructor-activities/format";
import {
  listPublishedActivities,
  toPublicCard,
} from "@/lib/instructor-activities/service";

export const metadata: Metadata = {
  title: "認定インストラクターの活動 | Sleep Wellness Institute Japan",
  description:
    "Sleep Wellness Institute Japan 認定インストラクターのワークショップやイベントをご紹介します。",
};

export const dynamic = "force-dynamic";

type Search = { searchParams: Promise<{ sort?: string }> };

export default async function InstructorActivitiesPage({ searchParams }: Search) {
  const params = await searchParams;
  const sort = params.sort === "new" ? "new" : "date";
  const activities = await listPublishedActivities({ sort });
  const upcoming = activities.filter((item) => isUpcomingEventDate(item.eventDate));
  const past = activities.filter((item) => !isUpcomingEventDate(item.eventDate));

  return (
    <PublicIntroLayout
      eyebrow="INSTRUCTOR ACTIVITIES"
      title="認定インストラクターの活動"
      lead="Sleep Wellness Institute Japan 認定インストラクターのワークショップやイベントをご紹介します。"
    >
      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/instructor-activities"
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            sort === "date"
              ? "bg-[#071426] text-white"
              : "border border-slate-200 text-[#071426]"
          }`}
        >
          開催日順
        </Link>
        <Link
          href="/instructor-activities?sort=new"
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            sort === "new"
              ? "bg-[#071426] text-white"
              : "border border-slate-200 text-[#071426]"
          }`}
        >
          新着順
        </Link>
      </div>

      {upcoming.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
          {upcoming.map((activity) => (
            <ActivityCard key={activity.id} activity={toPublicCard(activity)} />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-[#071426]/08 bg-white px-5 py-8 text-center text-sm text-slate-500">
          現在、公開中の開催予定イベントはありません。
        </p>
      )}

      {past.length > 0 ? (
        <div className="mt-12">
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#071426]">
            過去の活動
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
            {past.map((activity) => (
              <ActivityCard key={activity.id} activity={toPublicCard(activity)} />
            ))}
          </div>
        </div>
      ) : null}
    </PublicIntroLayout>
  );
}
