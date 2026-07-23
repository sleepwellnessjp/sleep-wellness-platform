import type { Metadata } from "next";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import InstructorNav from "@/components/InstructorNav";
import VisionStory from "@/components/VisionStory";
import { SURFACE } from "@/components/ui/tokens";

export const metadata: Metadata = {
  title: "Vision | Sleep Wellness Institute Japan",
  description:
    "睡眠を、日本の新しい文化へ。Sleep Wellness Institute Japan が描くビジョン。",
};

export default function VisionPage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: SURFACE, color: "#071426" }}>
      <InstructorNav eyebrow="VISION" />
      <VisionStory />
      <Contact />
      <Footer />
    </main>
  );
}
