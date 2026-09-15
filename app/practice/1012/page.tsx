import type { Metadata } from "next";
import ThirdDayPracticeTeaserPage from "@/components/programs/ThirdDayPracticeTeaserPage";
import { THIRD_DAY_PRACTICE_REVEALED } from "@/lib/practice/third-day-practice";

export const metadata: Metadata = {
  title: "Coming 10.12 | Sleep Wellness Institute Japan",
  description:
    "swij に、3つ目の実践が加わります。2026年10月12日、ヨガフェスタ横浜で最初のクラスを行います。",
  openGraph: {
    title: "Coming 10.12 | Sleep Wellness Institute Japan",
    description:
      "swij に、3つ目の実践が加わります。2026年10月12日、ヨガフェスタ横浜で最初のクラスを行います。",
  },
};

/**
 * 第3の昼実践ティザー。
 * フェーズ2: THIRD_DAY_PRACTICE_REVEALED を有効化し、正式ページへ差し替え。
 */
export default function PracticeTeaserRoutePage() {
  if (THIRD_DAY_PRACTICE_REVEALED) {
    // 10/12: ThirdDayPracticeRevealedPage を追加してここに返す。
    // フェーズ1では正式名称をソースに置かないため、未設定時はティザーを維持する。
  }
  return <ThirdDayPracticeTeaserPage />;
}
