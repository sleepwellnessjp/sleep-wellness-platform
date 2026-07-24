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
  other: {
    "application-version": APP_VERSION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f7f5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col overflow-x-hidden bg-[color:var(--sw-surface)] text-[color:var(--foreground)]">
        <SkipLink />
        <ToastProvider>
          {children}
          <BetaChrome />
        </ToastProvider>
      </body>
    </html>
  );
}
