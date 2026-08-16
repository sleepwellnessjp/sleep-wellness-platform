import Image from "next/image";
import Link from "next/link";
import { formatEventDateLabel } from "@/lib/instructor-activities/format";
import type { PublicActivityCard } from "@/lib/instructor-activities/types";

export default function ActivityCard({
  activity,
  tone = "light",
}: {
  activity: PublicActivityCard;
  tone?: "light" | "dark";
}) {
  const href = `/instructor-activities/${activity.slug}`;
  const dark = tone === "dark";

  return (
    <article className="min-w-0">
      <Link
        href={href}
        className="group block overflow-hidden rounded-2xl border border-[#071426]/10 bg-white shadow-[0_18px_50px_-36px_rgba(7,20,38,0.45)] transition hover:-translate-y-0.5"
        style={
          dark
            ? {
                background: "rgba(255,255,255,0.04)",
                borderColor: "rgba(216,179,106,0.22)",
              }
            : undefined
        }
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-[#071426]/08">
          {activity.imageUrl ? (
            <Image
              src={activity.imageUrl}
              alt={activity.title}
              fill
              className="object-cover transition duration-500 group-hover:scale-[1.03]"
              sizes="(min-width:1024px) 25vw, 50vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#071426] to-[#8a6a2d]/50 text-white/80">
              {activity.title.slice(0, 1)}
            </div>
          )}
        </div>
        <div className="px-3.5 py-3 sm:px-4 sm:py-3.5">
          <p
            className={`text-[11px] font-semibold tracking-[0.04em] ${
              dark ? "text-[#d8b36a]" : "text-[#8a6a2d]"
            }`}
          >
            {formatEventDateLabel(activity.eventDate)}
          </p>
          <h3
            className={`mt-1 line-clamp-2 text-[14px] font-semibold leading-snug tracking-[-0.02em] ${
              dark ? "text-white" : "text-[#071426]"
            }`}
          >
            {activity.title}
          </h3>
          <p
            className={`mt-1.5 truncate text-[12px] ${
              dark ? "text-white/65" : "text-slate-500"
            }`}
          >
            {activity.instructorName}
            {activity.locationLabel ? ` ・ ${activity.locationLabel}` : ""}
          </p>
          <p
            className={`mt-2 text-[12px] font-semibold ${
              dark ? "text-[#d8b36a]" : "text-[#315f68]"
            }`}
          >
            詳細を見る
          </p>
        </div>
      </Link>
    </article>
  );
}
