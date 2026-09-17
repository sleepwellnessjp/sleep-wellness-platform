import type { Metadata } from "next";
import MethodAnalysisPage from "@/components/programs/MethodAnalysisPage";

export const metadata: Metadata = {
  title: "二つの計測で、眠りの精度を上げる｜Sleep Wellness Institute Japan",
  description:
    "スマートリングによる睡眠計測と、持続血糖測定による夜間の血糖推移。二つのデータを重ねて分析する Sleep Wellness Method™ の考え方。",
  openGraph: {
    title: "二つの計測で、眠りの精度を上げる｜Sleep Wellness Institute Japan",
    description:
      "スマートリングによる睡眠計測と、持続血糖測定による夜間の血糖推移。二つのデータを重ねて分析する Sleep Wellness Method™ の考え方。",
  },
};

/**
 * 分析説明の固定ページ。sleep_contents とは独立。
 */
export default function MethodAnalysisRoutePage() {
  return <MethodAnalysisPage />;
}
