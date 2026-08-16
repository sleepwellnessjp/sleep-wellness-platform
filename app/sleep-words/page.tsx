import type { Metadata } from "next";
import SleepWordsExperience from "@/components/sleep-words/SleepWordsExperience";

export const metadata: Metadata = {
  title: "睡眠のための言葉 | Sleep Wellness Institute Japan",
  description:
    "心を整える、間のヨガの格言。間の書より、眠りと余白のための言葉をひとつずつ。",
};

export default function SleepWordsPage() {
  return <SleepWordsExperience />;
}
