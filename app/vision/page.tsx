import type { Metadata } from "next";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import VisionStory from "@/components/VisionStory";

export const metadata: Metadata = {
  title: "Vision | Sleep Wellness Institute Japan",
  description:
    "睡眠を、日本の新しい文化へ。Sleep Wellness Institute Japan が描くビジョン。",
};

export default function VisionPage() {
  return (
    <main className="min-h-screen bg-white text-[#0F172A]">
      <VisionStory />
      <Contact />
      <Footer />
    </main>
  );
}
