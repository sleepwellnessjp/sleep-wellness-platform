import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import BetaChrome from "@/components/beta/BetaChrome";
import SkipLink from "@/components/ui/SkipLink";
import { ToastProvider } from "@/components/ui/Toast";
import { APP_VERSION } from "@/lib/app-version";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sleep Wellness Institute Japan",
  description:
    "睡眠科学・ヨガ・呼吸・瞑想・日本文化・テクノロジーを融合した、日本初のSleep Wellness Platform。",
  applicationName: "Sleep Wellness Platform",
  // Safari が電話番号・日付などを自動リンク化すると Hydration mismatch になる
  other: {
    "format-detection": "telephone=no, date=no, email=no, address=no",
    "application-version": APP_VERSION,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
  appleWebApp: {
    capable: true,
    title: "Sleep Wellness Platform",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#071426",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="flex min-h-full flex-col overflow-x-hidden bg-[color:var(--sw-surface)] text-[color:var(--foreground)]"
        suppressHydrationWarning
      >
        <SkipLink />
        <ToastProvider>
          {children}
          <BetaChrome />
        </ToastProvider>
      </body>
    </html>
  );
}
