import type { ReactNode } from "react";
import { GOLD, NAVY } from "@/components/ui/tokens";
import type { SleepContentBlock } from "@/lib/sleep-content/types";

function renderEmphasis(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part ? <span key={index}>{part}</span> : null;
  });
}

function Callout({
  children,
  quiet = false,
}: {
  children: ReactNode;
  quiet?: boolean;
}) {
  return (
    <aside
      className={
        quiet
          ? "my-8 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-500 sm:px-5 sm:py-5"
          : "my-8 rounded-2xl border border-[#8a6a2d]/25 bg-[#fbf9f4] px-4 py-4 text-[15px] leading-8 text-[#071426] sm:px-5 sm:py-5"
      }
    >
      {children}
    </aside>
  );
}

export function ScienceMedicalNote() {
  return (
    <Callout quiet>
      この記事は医療的な診断・治療を目的としたものではありません。睡眠に関する不調が続く場合は、医療機関にご相談ください。
    </Callout>
  );
}

export default function ScienceArticleBody({
  blocks,
}: {
  blocks: SleepContentBlock[];
}) {
  return (
    <div className="max-w-2xl">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <h2
              key={index}
              className="mt-10 text-[1.35rem] font-semibold leading-snug tracking-[-0.03em] first:mt-0 sm:mt-12 sm:text-2xl"
              style={{ color: NAVY }}
            >
              {block.text}
            </h2>
          );
        }
        if (block.type === "paragraph") {
          return (
            <p
              key={index}
              className="mt-5 text-[16px] leading-8 text-[#071426] sm:mt-6 sm:leading-9"
            >
              {renderEmphasis(block.text)}
            </p>
          );
        }
        if (block.type === "figure") {
          if (!block.image_url) return null;
          return (
            <figure key={index} className="my-8 sm:my-10">
              <img
                src={block.image_url}
                alt={block.alt || block.caption || ""}
                className="w-full rounded-2xl bg-slate-50 object-contain"
              />
              {block.caption ? (
                <figcaption
                  className="mt-3 text-center text-[13px] leading-6 text-slate-500"
                  style={{ color: GOLD }}
                >
                  {block.caption}
                </figcaption>
              ) : null}
            </figure>
          );
        }
        if (block.type === "list") {
          const items = block.items.filter((item) => item.trim() !== "");
          if (items.length === 0) return null;
          return (
            <ul
              key={index}
              className="mt-5 list-disc space-y-2 pl-5 text-[16px] leading-8 text-[#071426] sm:mt-6 sm:leading-9"
            >
              {items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderEmphasis(item)}</li>
              ))}
            </ul>
          );
        }
        if (block.type === "callout") {
          return (
            <Callout key={index}>{renderEmphasis(block.text)}</Callout>
          );
        }
        return null;
      })}
    </div>
  );
}
