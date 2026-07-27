import type { Metadata } from "next";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import InstructorPublicShell from "@/components/instructors/InstructorPublicShell";

export const metadata: Metadata = {
  title: "お問い合わせ | Sleep Wellness Institute Japan",
  description:
    "認定講師養成講座、睡眠分析、企業導入など、Sleep Wellness Institute Japan へのお問い合わせ。",
};

export default function ContactPage() {
  return (
    <InstructorPublicShell title="お問い合わせ">
      <main>
        <Contact />
      </main>
      <Footer />
    </InstructorPublicShell>
  );
}
