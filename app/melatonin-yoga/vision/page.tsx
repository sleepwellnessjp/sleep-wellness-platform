import type { Metadata } from "next";
import MelatoninYogaVisionPage from "@/components/melatonin-yoga/MelatoninYogaVisionPage";

export const metadata: Metadata = {
  title: "メラトニンヨガ™が目指すところ | Sleep Wellness Institute Japan",
  description:
    "メラトニンヨガ™は、ひとつのヨガメソッドから始まりました。創始者が築いたのは、土台です。ここから先の主役は、これから各地で活動していく一人ひとりのインストラクターです。",
  openGraph: {
    title: "メラトニンヨガ™が目指すところ | Sleep Wellness Institute Japan",
    description:
      "メラトニンヨガ™は、ひとつのヨガメソッドから始まりました。創始者が築いたのは、土台です。ここから先の主役は、これから各地で活動していく一人ひとりのインストラクターです。",
    images: [{ url: "/melatonin-yoga.jpg" }],
  },
};

export default function MelatoninYogaVisionRoute() {
  return <MelatoninYogaVisionPage />;
}
