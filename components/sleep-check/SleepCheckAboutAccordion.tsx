"use client";

import { useId, useState } from "react";
import { FOCUS_RING } from "@/components/ui/tokens";
import {
  SLEEP_CHECK_ABOUT_REFERENCES,
  SLEEP_CHECK_ABOUT_SECTIONS,
} from "@/lib/sleep-check/about";

const TEXT = "#0A1426";
const MUTED = "#5A6B7D";
const GOLD = "#B8945F";
const CARD_BG = "#FFFFFF";
const CARD_BORDER = "#E0D8C6";

export default function SleepCheckAboutAccordion() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="mt-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={`flex w-full min-h-11 items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-[13px] font-semibold transition ${FOCUS_RING}`}
        style={{
          color: GOLD,
          borderColor: CARD_BORDER,
          background: CARD_BG,
        }}
      >
        <span>この質問について</span>
        <span
          aria-hidden
          className="text-[11px] transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          ▼
        </span>
      </button>

      {open ? (
        <div
          id={panelId}
          className="mt-3 space-y-8 rounded-2xl border px-4 py-5 sm:px-5"
          style={{
            borderColor: CARD_BORDER,
            background: CARD_BG,
          }}
        >
          {SLEEP_CHECK_ABOUT_SECTIONS.map((section) => (
            <section key={section.heading} className="space-y-3">
              <h2
                className="text-[15px] font-semibold tracking-[-0.02em]"
                style={{ color: TEXT }}
              >
                {section.heading}
              </h2>
              {section.paragraphs.map((paragraph) => (
                <p
                  key={paragraph}
                  className="text-[13px] leading-7"
                  style={{ color: MUTED }}
                >
                  {paragraph}
                </p>
              ))}
              {"scales" in section && section.scales
                ? section.scales.map((scale) => (
                    <div key={scale.name} className="space-y-1">
                      <p
                        className="text-[13px] font-semibold"
                        style={{ color: TEXT }}
                      >
                        {scale.name}
                      </p>
                      <p
                        className="text-[13px] leading-7"
                        style={{ color: MUTED }}
                      >
                        {scale.body}
                      </p>
                    </div>
                  ))
                : null}
              {"bullets" in section && section.bullets ? (
                <ul
                  className="list-disc space-y-1.5 pl-5 text-[13px] leading-7"
                  style={{ color: MUTED }}
                >
                  {section.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
              {"paragraphsAfterBullets" in section &&
              section.paragraphsAfterBullets
                ? section.paragraphsAfterBullets.map((paragraph) => (
                    <p
                      key={paragraph}
                      className="text-[13px] leading-7"
                      style={{ color: MUTED }}
                    >
                      {paragraph}
                    </p>
                  ))
                : null}
            </section>
          ))}

          <section
            className="space-y-3 border-t pt-5"
            style={{ borderColor: CARD_BORDER }}
          >
            <h2
              className="text-[15px] font-semibold tracking-[-0.02em]"
              style={{ color: TEXT }}
            >
              出典
            </h2>
            <ul className="space-y-3">
              {SLEEP_CHECK_ABOUT_REFERENCES.map((reference) => (
                <li
                  key={reference}
                  className="text-[11px] leading-6"
                  style={{ color: MUTED }}
                >
                  {reference}
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </div>
  );
}
