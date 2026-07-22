"use client";

import OsNav from "@/components/os/OsNav";
import OsTopBar from "@/components/os/OsTopBar";

/**
 * Sleep Wellness OS chrome for the client mypage.
 */
export default function ClientNav({
  eyebrow = "MY PAGE",
}: {
  eyebrow?: string;
}) {
  return (
    <header className="border-b border-[#071426]/08 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-4 sm:px-8">
        <OsTopBar role="client" homeHref="/client" />
        <p className="sr-only">{eyebrow}</p>
        <OsNav role="client" />
      </div>
    </header>
  );
}
