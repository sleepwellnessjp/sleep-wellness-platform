import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ActivityDetailView from "@/components/instructor-activities/ActivityDetailView";
import Footer from "@/components/Footer";
import InstructorPublicShell from "@/components/instructors/InstructorPublicShell";
import { getPublishedActivityBySlug } from "@/lib/instructor-activities/service";

type Params = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const activity = await getPublishedActivityBySlug(slug);
  if (!activity) {
    return { title: "認定インストラクターの活動" };
  }
  return {
    title: `${activity.title} | 認定インストラクターの活動`,
    description: activity.summary.slice(0, 140) || activity.title,
  };
}

export default async function InstructorActivityDetailPage({ params }: Params) {
  const { slug } = await params;
  const activity = await getPublishedActivityBySlug(slug);
  if (!activity) notFound();

  return (
    <InstructorPublicShell
      title="認定インストラクターの活動"
      titleHref="/instructor-activities"
    >
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <ActivityDetailView activity={activity} />
      </main>
      <Footer />
    </InstructorPublicShell>
  );
}
