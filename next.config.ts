import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // AI分析（画像＋構造化出力）は30秒を超えることがあるため、
  // Next.js 開発プロキシのデフォルト30秒制限を延長する。
  // SOXAI画像は最大10枚（base64）のため、プロキシのボディ上限も引き上げる。
  experimental: {
    proxyTimeout: 300_000,
    proxyClientMaxBodySize: "25mb",
  },
};

export default nextConfig;
