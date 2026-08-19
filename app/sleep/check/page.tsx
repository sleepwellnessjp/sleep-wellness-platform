import type { Metadata } from "next";
import SleepCheckExperience from "@/components/sleep-check/SleepCheckExperience";

export const metadata: Metadata = {
  title: "睡眠セルフチェック | Sleep Wellness",
  description:
    "8つの質問に答えると、いまの眠りの状態が見えてきます。医学的な診断ではありません。",
  robots: { index: true, follow: true },
};

export default function SleepCheckPage() {
  return <SleepCheckExperience />;
}
