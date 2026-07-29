import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sleep Wellness Platform",
    short_name: "SWIJ",
    description:
      "睡眠科学・ヨガ・呼吸・瞑想・日本文化・テクノロジーを融合した Sleep Wellness Platform",
    start_url: "/",
    display: "standalone",
    background_color: "#071426",
    theme_color: "#071426",
    lang: "ja",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
