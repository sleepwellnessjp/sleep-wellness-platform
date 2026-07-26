import Image from "next/image";
import Link from "next/link";
import type { InstructorPublicCard } from "@/lib/instructors/types";

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#8a6a2d]/25 bg-[#fafaf8] px-2.5 py-1 text-[11px] font-medium text-[#071426]/80">
      {children}
    </span>
  );
}

export default function InstructorCard({
  instructor,
}: {
  instructor: InstructorPublicCard;
}) {
  const teaching = [
    ...instructor.yogaSpecialties,
    ...instructor.pilatesSpecialties,
  ].slice(0, 4);

  const contactHref = instructor.contactEmail
    ? `mailto:${instructor.contactEmail}?subject=${encodeURIComponent("メラトニンヨガ™認定講師へのお問い合わせ")}`
    : null;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-[#071426]/08 bg-white shadow-[0_1px_2px_rgba(7,20,38,0.04),0_24px_60px_-36px_rgba(7,20,38,0.28)] transition duration-300 hover:-translate-y-1 hover:border-[#8a6a2d]/30 hover:shadow-[0_1px_2px_rgba(7,20,38,0.04),0_32px_70px_-32px_rgba(7,20,38,0.32)]">
      <div className="relative aspect-square overflow-hidden bg-[#071426]/04">
        {instructor.profileImageUrl ? (
          <Image
            src={instructor.profileImageUrl}
            alt={instructor.activityName}
            fill
            className="object-cover transition duration-700 group-hover:scale-[1.03]"
            sizes="(min-width:1024px) 30vw, (min-width:640px) 45vw, 100vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#071426] via-[#0d2238] to-[#8a6a2d]/40">
            <span className="text-4xl font-semibold tracking-[-0.04em] text-white/80">
              {instructor.activityName.slice(0, 1)}
            </span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#071426]/75 to-transparent p-4 pt-16">
          <p className="text-[10px] font-semibold tracking-[0.22em] text-[#d8b36a]">
            メラトニンヨガ™認定講師
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#071426]">
          {instructor.activityName}
        </h2>
        {instructor.legalName ? (
          <p className="mt-1 text-sm text-slate-500">{instructor.legalName}</p>
        ) : null}

        <p className="mt-3 text-xs font-semibold tracking-[0.04em] text-[#8a6a2d]">
          {instructor.certificationLabel}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {instructor.activityArea ? (
            <Tag>活動地域: {instructor.activityArea}</Tag>
          ) : null}
          <Tag>
            {instructor.onlineAvailable ? "オンライン対応可" : "対面中心"}
          </Tag>
        </div>

        {teaching.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {teaching.map((item) => (
              <Tag key={item}>{item}</Tag>
            ))}
          </div>
        ) : null}

        {instructor.bio ? (
          <p className="mt-4 line-clamp-4 text-sm leading-7 text-slate-600">
            {instructor.bio}
          </p>
        ) : (
          <p className="mt-4 text-sm leading-7 text-slate-400">
            自己紹介は準備中です。
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
          {instructor.instagramUrl ? (
            <a
              href={instructor.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-[#315f68] hover:text-[#8a6a2d]"
            >
              Instagram
            </a>
          ) : null}
          {instructor.websiteUrl ? (
            <a
              href={instructor.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-[#315f68] hover:text-[#8a6a2d]"
            >
              公式サイト
            </a>
          ) : null}
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {contactHref ? (
            <a
              href={contactHref}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#071426] px-4 text-sm font-semibold text-white transition hover:bg-[#0d2238]"
            >
              問い合わせ
            </a>
          ) : (
            <span className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 px-4 text-sm text-slate-400">
              問い合わせ準備中
            </span>
          )}
          <Link
            href={`/instructors/${instructor.id}`}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#8a6a2d]/35 bg-white px-4 text-sm font-semibold text-[#8a6a2d] transition hover:border-[#8a6a2d]/55 hover:bg-[#fafaf8]"
          >
            詳細を見る
          </Link>
        </div>
      </div>
    </article>
  );
}
