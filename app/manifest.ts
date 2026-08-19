import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sleep Wellness Platform",
    short_name: "SWIJ",
    description:
      "睡眠科学・ヨガ・呼吸・瞑想・日本文化・テクノロジーを融合した Sleep Wellness Platform",
    start_url: "/",
    display: "standalone",
    background_color: "#020b1a",
    theme_color: "#020b1a",
    lang: "ja",
    icons: [
      {
        src: "/icon-192.png?v=5",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png?v=5",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png?v=5",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-touch-icon.png?v=5",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
