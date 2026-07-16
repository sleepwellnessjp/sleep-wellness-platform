import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // AI分析（画像＋構造化出力）は30秒を超えることがあるため、
  // Next.js 開発プロキシのデフォルト30秒制限を延長する。
  experimental: {
    proxyTimeout: 300_000,
  },
};

export default nextConfig;
