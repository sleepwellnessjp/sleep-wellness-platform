"use client";

import { GOLD, NAVY, TEAL } from "@/components/ui/tokens";
import type { PrescriptionSlot } from "@/lib/sleep-analysis/prescription-slots";

const ACCENT: Record<string, string> = {
  morning: GOLD,
  day: TEAL,
  evening: "#5a6b7a",
  night: NAVY,
  homework: GOLD,
};

export default function DemoPagePrescription({
  slots,
  clientName,
}: {
  slots: PrescriptionSlot[];
  clientName?: string | null;
}) {
  return (
    <section className="swr-print-page swr-print-page-2 space-y-4">
      <header className="swr-print-avoid rounded-[24px] border border-[rgba(138,106,45,0.25)] bg-white px-5 py-4 sm:px-6">
        <p
          className="text-[10px] font-semibold tracking-[0.2em]"
          style={{ color: GOLD }}
        >
          PAGE 2 · PRESCRIPTION
        </p>
        <h1
          className="mt-1 text-[1.4rem] font-semibold tracking-[-0.03em]"
          style={{ color: NAVY }}
        >
          Sleep Wellness Prescription™
        </h1>
        <p className="mt-1.5 text-[13px] text-slate-500">
          {clientName ? `${clientName} 様の` : ""}1日の処方
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {slots.map((slot) => (
          <article
            key={slot.id}
            className={`swr-print-avoid rounded-[20px] border border-[rgba(7,20,38,0.06)] bg-white px-4 py-4 ${
              slot.id === "homework" ? "sm:col-span-2" : ""
            }`}
          >
            <p
              className="text-[10px] font-semibold tracking-[0.16em]"
              style={{ color: ACCENT[slot.id] ?? GOLD }}
            >
              {slot.title}
            </p>
            <h2
              className="mt-1 text-[1.05rem] font-semibold tracking-[-0.02em]"
              style={{ color: NAVY }}
            >
              {slot.subtitle}
            </h2>
            <ul className="mt-3 space-y-2">
              {slot.items.map((item) => (
                <li
                  key={item}
                  className="flex gap-2.5 text-[13px] leading-6"
                  style={{ color: NAVY }}
                >
                  <span className="text-slate-400">□</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
