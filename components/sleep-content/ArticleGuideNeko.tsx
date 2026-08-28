import Image from "next/image";
import {
  SCIENCE_ARTICLE_GUIDE,
  SLEEP_CHECK_IMAGES,
} from "@/lib/sleep-check/content";
import type { SleepContentSubcategory } from "@/lib/sleep-content/types";

const NEKO_SIZE = 108;
const OUEN_INTRINSIC = { width: 506, height: 588 };

function nekoDisplaySize(src: string): { width: number; height: number } {
  if (src === SLEEP_CHECK_IMAGES.ouen) {
    const height = Math.round((NEKO_SIZE * OUEN_INTRINSIC.height) / 480);
    const width = Math.round((height * OUEN_INTRINSIC.width) / OUEN_INTRINSIC.height);
    return { width, height };
  }
  return { width: NEKO_SIZE, height: NEKO_SIZE };
}

export default function ArticleGuideNeko({
  subcategory,
}: {
  subcategory: SleepContentSubcategory | null;
}) {
  if (!subcategory) return null;

  const { nekoSrc, message } = SCIENCE_ARTICLE_GUIDE[subcategory];
  const { width, height } = nekoDisplaySize(nekoSrc);

  return (
    <div className="flex w-full items-end gap-3">
      <Image
        src={nekoSrc}
        alt=""
        width={width}
        height={height}
        className="shrink-0 object-contain"
        style={{ width, height }}
      />
      <div
        className="min-w-0 w-fit max-w-[calc(100%-8rem)] border px-4 py-[10px] text-sm leading-relaxed text-[#071426] sm:max-w-[24rem]"
        style={{
          background: "#F7F1E8",
          borderColor: "rgba(7, 20, 38, 0.08)",
          borderRadius: "16px 16px 16px 4px",
        }}
      >
        <p>{message}</p>
      </div>
    </div>
  );
}
