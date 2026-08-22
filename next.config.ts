import os from "node:os";
import type { NextConfig } from "next";

/**
 * 認定講師向け画面に Next.js の「N Issues」開発インジケーターを出さない。
 * 明示オプトイン時のみ表示（開発者用）。本番ビルドでは元々表示されない。
 */
const showDevIndicators =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_SHOW_DEV_INDICATORS === "1";

/** Wi-Fi 変更で IP が変わっても再起動するだけで実機アクセスできるよう、LAN IPv4 を自動列挙する */
function lanDevOrigins(): string[] {
  const origins = new Set<string>();
  for (const infos of Object.values(os.networkInterfaces())) {
    for (const info of infos ?? []) {
      const family = info.family;
      const isV4 = family === "IPv4" || family === 4;
      if (!isV4 || info.internal) continue;
      origins.add(info.address);
    }
  }
  return [...origins];
}

const nextConfig: NextConfig = {
  // LAN 上の実機（iPhone 等）から dev サーバーへアクセスするとき用
  allowedDevOrigins: lanDevOrigins(),
  // AI分析（画像＋構造化出力）は30秒を超えることがあるため、
  // Next.js 開発プロキシのデフォルト30秒制限を延長する。
  // SOXAI画像は最大10枚（base64）のため、プロキシのボディ上限も引き上げる。
  experimental: {
    proxyTimeout: 300_000,
    proxyClientMaxBodySize: "25mb",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // 既定オフ。開発でバッジを見る場合は NEXT_PUBLIC_SHOW_DEV_INDICATORS=1
  devIndicators: showDevIndicators ? { position: "bottom-left" } : false,
};

export default nextConfig;
