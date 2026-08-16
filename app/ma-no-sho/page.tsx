import type { Metadata } from "next";
import MaNoShoReader from "@/components/ma-no-sho/MaNoShoReader";

export const metadata: Metadata = {
  title: "間の書 要約版 ― 和が拓くウェルネスの哲学 | Sleep Wellness Institute Japan",
  description:
    "『間の書 ― 和が拓くウェルネスの哲学』指導者養成講座 公式テキストの要約版。日本の「間」の思想から、睡眠とウェルネスを捉え直す。",
};

export default function MaNoShoPage() {
  return <MaNoShoReader />;
}
