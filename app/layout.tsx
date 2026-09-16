import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import BetaChrome from "@/components/beta/BetaChrome";
import HomeIntroBootRelease from "@/components/home/HomeIntroBootRelease";
import MobileSleepTabBar from "@/components/sleep-content/MobileSleepTabBar";
import SkipLink from "@/components/ui/SkipLink";
import { ToastProvider } from "@/components/ui/Toast";
import { APP_VERSION } from "@/lib/app-version";
import "./globals.css";

/** HomeIntro と同じ地色。PWA 起動スプラッシュ用 */
const INTRO_BG = "#020b1a";

const APPLE_STARTUP_IMAGES: { url: string; media: string }[] = [
  {
    url: "/splash/apple-splash-640-1136.png",
    media:
      "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
  },
  {
    url: "/splash/apple-splash-750-1334.png",
    media:
      "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
  },
  {
    url: "/splash/apple-splash-1242-2208.png",
    media:
      "(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  {
    url: "/splash/apple-splash-1125-2436.png",
    media:
      "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  {
    url: "/splash/apple-splash-828-1792.png",
    media:
      "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
  },
  {
    url: "/splash/apple-splash-1242-2688.png",
    media:
      "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  {
    url: "/splash/apple-splash-1170-2532.png",
    media:
      "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  {
    url: "/splash/apple-splash-1284-2778.png",
    media:
      "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  {
    url: "/splash/apple-splash-1179-2556.png",
    media:
      "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  {
    url: "/splash/apple-splash-1290-2796.png",
    media:
      "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  {
    url: "/splash/apple-splash-1206-2622.png",
    media:
      "(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
  {
    url: "/splash/apple-splash-1320-2868.png",
    media:
      "(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  },
];

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
      { url: "/icon-192.png?v=5", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png?v=5", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png?v=5", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
  appleWebApp: {
    capable: true,
    title: "Sleep Wellness Platform",
    statusBarStyle: "black-translucent",
    startupImage: APPLE_STARTUP_IMAGES,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: INTRO_BG,
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
      <head>
        {/*
          トップ `/` のみ: 初回ペイントを HomeIntro と同じ濃紺にする。
          :root トークンは触らず、data-swij-boot がある間だけ上書き。
          イントロ / main 出現後、次のペイントを挟んでから解除する。
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=location.pathname;if(p!=="/"&&p!=="")return;var BG="${INTRO_BG}";var r=document.documentElement;r.setAttribute("data-swij-boot","intro");r.style.backgroundColor=BG;r.style.colorScheme="dark";var s=document.getElementById("swij-boot-bg-style");if(!s){s=document.createElement("style");s.id="swij-boot-bg-style";(document.head||r).insertBefore(s,(document.head||r).firstChild);}s.textContent='html[data-swij-boot="intro"],html[data-swij-boot="intro"] body{background-color:'+BG+'!important;color-scheme:dark}';var paintBody=function(){if(document.body&&r.getAttribute("data-swij-boot")==="intro")document.body.style.backgroundColor=BG;};paintBody();if(!document.body)document.addEventListener("DOMContentLoaded",paintBody);var cleared=false;var mo=null;var clear=function(){if(cleared)return;cleared=true;try{r.removeAttribute("data-swij-boot");r.style.removeProperty("background-color");r.style.removeProperty("color-scheme");var st=document.getElementById("swij-boot-bg-style");if(st)st.remove();if(document.body)document.body.style.removeProperty("background-color");}catch(e){}if(mo)mo.disconnect();};var scheduleClear=function(){if(cleared)return;requestAnimationFrame(function(){requestAnimationFrame(clear);});};var ready=function(){return!!(document.querySelector("[data-swij-intro]")||document.querySelector("main#top"));};if(ready()){scheduleClear();}else{mo=new MutationObserver(function(){if(ready())scheduleClear();});mo.observe(r,{childList:true,subtree:true});document.addEventListener("DOMContentLoaded",function(){if(ready())scheduleClear();});}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className="flex min-h-full flex-col overflow-x-hidden bg-[color:var(--sw-surface)] text-[color:var(--foreground)]"
        suppressHydrationWarning
      >
        <SkipLink />
        <ToastProvider>
          {children}
          <MobileSleepTabBar />
          <BetaChrome />
          <HomeIntroBootRelease />
        </ToastProvider>
        <Analytics />
      </body>
    </html>
  );
}
