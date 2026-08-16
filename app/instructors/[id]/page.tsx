import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import InstructorPublicShell from "@/components/instructors/InstructorPublicShell";
import ActivityCard from "@/components/instructor-activities/ActivityCard";
import { listPublishedActivities, toPublicCard } from "@/lib/instructor-activities/service";
import { getPublicInstructor } from "@/lib/instructors/instructor-profile-service";
import { CERTIFIED_INSTRUCTOR_TITLE } from "@/lib/instructors/types";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  try {
    const instructor = await getPublicInstructor(id);
    if (!instructor) return { title: CERTIFIED_INSTRUCTOR_TITLE };
    return {
      title: `${instructor.activityName} | ${CERTIFIED_INSTRUCTOR_TITLE}`,
      description:
        instructor.bio.slice(0, 140) ||
        `${instructor.activityName} — メラトニンヨガ™認定講師のプロフィール`,
    };
  } catch {
    return { title: CERTIFIED_INSTRUCTOR_TITLE };
  }
}

export const dynamic = "force-dynamic";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-[#071426]/08 pt-6">
      <h2 className="text-xs font-semibold tracking-[0.22em] text-[#8a6a2d]">
        {title}
      </h2>
      <div className="mt-3 text-[15px] leading-8 text-slate-700">{children}</div>
    </section>
  );
}

function photoObjectPosition(name: string): string {
  switch (name) {
    case "若林貴久":
      return "object-top";
    case "加地史佳":
      return "object-top";
    case "矢田朝美":
      return "object-[center_12%]";
    case "若林香織":
      return "object-[center_22%]";
    default:
      return "object-[center_18%]";
  }
}

export default async function InstructorDetailPage({ params }: Params) {
  const { id } = await params;

  let instructor = null;
  try {
    instructor = await getPublicInstructor(id);
  } catch (error) {
    console.error("[instructors/[id]]", error);
    notFound();
  }
  if (!instructor) notFound();

  const instructorEvents = await listPublishedActivities({
    instructorId: instructor.id,
  });

  const teaching = [
    ...instructor.yogaSpecialties,
    ...instructor.pilatesSpecialties,
  ];

  const headlineLines = instructor.headline
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <InstructorPublicShell title="認定講師詳細">
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <Link
          href="/instructors"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#315f68] hover:text-[#8a6a2d]"
        >
          ← 認定講師一覧へ
        </Link>

        <div className="mt-8 grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-12">
          <div>
            <div className="relative aspect-square overflow-hidden rounded-[32px] border border-[#071426]/08 bg-[#071426]/04 shadow-[0_24px_70px_-40px_rgba(7,20,38,0.35)]">
              {instructor.profileImageUrl ? (
                <Image
                  src={instructor.profileImageUrl}
                  alt={instructor.activityName}
                  fill
                  priority
                  className={`object-cover ${photoObjectPosition(instructor.activityName)}`}
                  sizes="(min-width:1024px) 40vw, 100vw"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#071426] via-[#0d2238] to-[#8a6a2d]/45">
                  <span className="text-6xl font-semibold text-white/80">
                    {instructor.activityName.slice(0, 1)}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-[#071426] px-5 text-sm font-semibold text-white transition hover:bg-[#0d2238] sm:flex-none"
              >
                問い合わせ
              </Link>
              {instructor.instagramUrl ? (
                <a
                  href={instructor.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#8a6a2d]/35 px-5 text-sm font-semibold text-[#8a6a2d] hover:bg-[#fafaf8]"
                >
                  Instagram
                </a>
              ) : null}
              {instructor.websiteUrl ? (
                <a
                  href={instructor.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#071426]/15 px-5 text-sm font-semibold text-[#071426] hover:bg-white"
                >
                  公式サイト
                </a>
              ) : null}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold tracking-[0.28em] text-[#8a6a2d]">
              {CERTIFIED_INSTRUCTOR_TITLE}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#071426] sm:text-4xl">
              {instructor.activityName}
            </h1>
            {instructor.legalName ? (
              <p className="mt-2 text-base text-slate-500">
                {instructor.legalName}
              </p>
            ) : null}
            {headlineLines.length > 0 ? (
              <div className="mt-4 space-y-1">
                {headlineLines.map((line) => (
                  <p
                    key={line}
                    className="text-lg leading-8 text-[#071426]/85"
                  >
                    {line}
                  </p>
                ))}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full border border-[#8a6a2d]/25 bg-[#fafaf8] px-3 py-1.5 text-xs font-medium text-[#071426]">
                {instructor.certificationLabel}
              </span>
              {instructor.activityArea ? (
                <span className="rounded-full border border-[#071426]/10 bg-white px-3 py-1.5 text-xs font-medium text-[#071426]/80">
                  活動地域: {instructor.activityArea}
                </span>
              ) : null}
              {instructor.onlineAvailable ? (
                <span className="rounded-full border border-[#071426]/10 bg-white px-3 py-1.5 text-xs font-medium text-[#071426]/80">
                  オンライン対応可
                </span>
              ) : null}
            </div>

            <div className="mt-8 space-y-6">
              {instructor.serviceArea ? (
                <Section title="対応可能エリア">
                  <p>{instructor.serviceArea}</p>
                </Section>
              ) : null}
              {instructor.career ? (
                <Section title="経歴">
                  <p className="whitespace-pre-wrap">{instructor.career}</p>
                </Section>
              ) : null}
              {instructor.bio ? (
                <Section title="プロフィール">
                  <div className="space-y-4 whitespace-pre-wrap">
                    {instructor.bio
                      .split(/\n+/)
                      .map((p) => p.trim())
                      .filter(Boolean)
                      .map((p) => (
                        <p key={p.slice(0, 32)}>{p}</p>
                      ))}
                  </div>
                </Section>
              ) : null}
              {instructor.specialties.length > 0 ? (
                <Section title="得意分野">
                  <ul className="flex flex-wrap gap-2">
                    {instructor.specialties.map((item) => (
                      <li
                        key={item}
                        className="rounded-full border border-[#8a6a2d]/20 bg-[#fafaf8] px-3 py-1 text-sm"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : null}
              {teaching.length > 0 ? (
                <Section title="ヨガ／ピラティス指導分野">
                  <ul className="flex flex-wrap gap-2">
                    {teaching.map((item) => (
                      <li
                        key={item}
                        className="rounded-full border border-[#071426]/10 bg-white px-3 py-1 text-sm"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : null}
              {instructor.availablePrograms.length > 0 ? (
                <Section title="担当可能なプログラム">
                  <ul className="list-disc space-y-1 pl-5">
                    {instructor.availablePrograms.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </Section>
              ) : null}
            </div>
          </div>
        </div>

        {instructorEvents.length > 0 ? (
          <section className="mt-12 border-t border-[#071426]/08 pt-8">
            <h2 className="text-xs font-semibold tracking-[0.22em] text-[#8a6a2d]">
              このインストラクターのイベント
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
              {instructorEvents.map((activity) => (
                <ActivityCard key={activity.id} activity={toPublicCard(activity)} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <Footer />
    </InstructorPublicShell>
  );
}
