import Image from "next/image";
import Link from "next/link";
import {
  formatEventSchedule,
  locationLabelOf,
} from "@/lib/instructor-activities/format";
import type { InstructorActivity } from "@/lib/instructor-activities/types";
import { GOLD, NAVY } from "@/components/ui/tokens";

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-[#071426]/08 pt-5">
      <h2
        className="text-[11px] font-semibold tracking-[0.18em]"
        style={{ color: GOLD }}
      >
        {title}
      </h2>
      <div className="mt-2 text-[15px] leading-7 text-slate-700">{children}</div>
    </section>
  );
}

export default function ActivityDetailView({
  activity,
  showBack = true,
}: {
  activity: InstructorActivity;
  showBack?: boolean;
}) {
  const location = locationLabelOf(activity);
  const schedule = formatEventSchedule(activity);
  const paragraphs = activity.description
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <article className="mx-auto max-w-3xl">
      {showBack ? (
        <Link
          href="/instructor-activities"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#315f68] hover:text-[#8a6a2d]"
        >
          ← 一覧へ戻る
        </Link>
      ) : null}

      <div className="relative mt-5 aspect-[4/3] overflow-hidden rounded-[28px] bg-[#071426]/08">
        {activity.imageUrl ? (
          activity.imageUrl.startsWith("blob:") ||
          activity.imageUrl.startsWith("data:") ? (
            <img
              src={activity.imageUrl}
              alt={activity.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <Image
              src={activity.imageUrl}
              alt={activity.title}
              fill
              className="object-cover"
              sizes="(min-width:768px) 720px, 100vw"
              priority
            />
          )
        ) : null}
      </div>

      <p
        className="mt-6 text-[11px] font-semibold tracking-[0.22em]"
        style={{ color: GOLD }}
      >
        INSTRUCTOR ACTIVITY
      </p>
      <h1
        className="mt-2 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl"
        style={{ color: NAVY }}
      >
        {activity.title}
      </h1>
      {activity.instructorName ? (
        <p className="mt-3 text-[15px] text-slate-600">{activity.instructorName}</p>
      ) : null}

      <div className="mt-8 space-y-6">
        {schedule ? <Block title="開催日時">{schedule}</Block> : null}
        {location ? <Block title="開催場所">{location}</Block> : null}
        {activity.summary ? (
          <Block title="概要">
            <p className="whitespace-pre-wrap">{activity.summary}</p>
          </Block>
        ) : null}
        {paragraphs.length > 0 ? (
          <Block title="詳細">
            {paragraphs.map((item) => (
              <p key={item.slice(0, 24)} className="mb-3 last:mb-0">
                {item}
              </p>
            ))}
          </Block>
        ) : null}
        {activity.target ? <Block title="対象者">{activity.target}</Block> : null}
        {activity.capacity ? <Block title="定員">{activity.capacity}</Block> : null}
        {activity.price ? <Block title="参加料金">{activity.price}</Block> : null}
        {activity.applicationMethod ? (
          <Block title="申込方法">{activity.applicationMethod}</Block>
        ) : null}
        {activity.notes ? <Block title="補足">{activity.notes}</Block> : null}
      </div>

      {activity.applicationUrl ? (
        <a
          href={activity.applicationUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-full px-6 text-sm font-semibold text-white sm:w-auto"
          style={{ background: NAVY }}
        >
          申し込む
        </a>
      ) : null}

      {activity.instructorName ? (
        <section className="mt-10 rounded-2xl border border-[#071426]/08 bg-[#fafaf8] px-5 py-5">
          <p
            className="text-[11px] font-semibold tracking-[0.18em]"
            style={{ color: GOLD }}
          >
            担当インストラクター
          </p>
          <div className="mt-3 flex gap-4">
            {activity.instructorProfileImageUrl ? (
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-[#071426]/08">
                <Image
                  src={activity.instructorProfileImageUrl}
                  alt={activity.instructorName}
                  fill
                  className="object-cover"
                />
              </div>
            ) : null}
            <div className="min-w-0">
              <p className="font-semibold" style={{ color: NAVY }}>
                {activity.instructorName}
              </p>
              {activity.instructorHeadline ? (
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {activity.instructorHeadline}
                </p>
              ) : null}
              {activity.instructorBio ? (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                  {activity.instructorBio}
                </p>
              ) : null}
              {activity.instructorPublicId ? (
                <Link
                  href={`/instructors/${activity.instructorPublicId}`}
                  className="mt-2 inline-block text-sm font-semibold text-[#315f68]"
                >
                  プロフィールを見る
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </article>
  );
}
