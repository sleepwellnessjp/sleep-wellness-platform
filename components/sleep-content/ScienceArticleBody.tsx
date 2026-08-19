import type { ReactNode } from "react";
import { GOLD, NAVY } from "@/components/ui/tokens";
import type { SleepContentBlock } from "@/lib/sleep-content/types";

const SUBHEADING_COLOR = "#5a6b80";
const BODY_TEXT = "text-[16px] leading-[1.75] text-[#071426]";

/**
 * 段落間: モバイル 20px / sm 24px。
 * 小見出しの下 8px は subheading 自身の mb で確保する。
 */
function blockTopSpacing(
  index: number,
  blocks: SleepContentBlock[],
): string {
  if (index === 0) return "";
  const prev = blocks[index - 1];
  if (prev?.type === "subheading") return "";
  if (prev?.type === "heading") return "mt-3 sm:mt-6";
  return "mt-5 sm:mt-6";
}

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
  className = "my-6 sm:my-8",
}: {
  children: ReactNode;
  quiet?: boolean;
  className?: string;
}) {
  return (
    <aside
      className={`rounded-2xl px-4 py-4 sm:px-5 sm:py-5 ${className} ${
        quiet
          ? "border border-slate-200 bg-slate-50 text-sm leading-[1.75] text-slate-500 sm:leading-7"
          : "border border-[#8a6a2d]/25 bg-[#fbf9f4] text-[15px] leading-[1.8] text-[#071426]"
      }`}
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
    <div className="max-w-2xl -mx-1.5 sm:mx-0">
      {blocks.map((block, index) => {
        const topSpacing = blockTopSpacing(index, blocks);

        if (block.type === "heading") {
          return (
            <h2
              key={index}
              className={`${index === 0 ? "" : "mt-8 sm:mt-12"} text-[1.35rem] font-semibold leading-snug tracking-[-0.03em] sm:text-2xl`}
              style={{ color: NAVY }}
            >
              {block.text}
            </h2>
          );
        }
        if (block.type === "subheading") {
          return (
            <h3
              key={index}
              className={`${index === 0 ? "" : "mt-[28px]"} mb-2 text-[16px] font-semibold leading-snug tracking-[-0.01em]`}
              style={{ color: SUBHEADING_COLOR }}
            >
              {block.text}
            </h3>
          );
        }
        if (block.type === "paragraph") {
          return (
            <p key={index} className={`${topSpacing} ${BODY_TEXT}`}>
              {renderEmphasis(block.text)}
            </p>
          );
        }
        if (block.type === "figure") {
          if (!block.image_url) return null;
          return (
            <figure key={index} className={`${topSpacing} mb-6 sm:mb-10`}>
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
              className={`${topSpacing} list-disc space-y-1.5 pl-5 text-[16px] leading-[1.6] text-[#071426]`}
            >
              {items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderEmphasis(item)}</li>
              ))}
            </ul>
          );
        }
        if (block.type === "callout") {
          return (
            <Callout key={index} className={`${topSpacing} mb-6 sm:mb-8`}>
              {renderEmphasis(block.text)}
            </Callout>
          );
        }
        return null;
      })}
    </div>
  );
}
