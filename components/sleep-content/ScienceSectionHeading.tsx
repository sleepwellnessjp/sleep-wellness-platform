import Image from "next/image";
import {
  SLEEP_CHECK_IMAGES,
  SCIENCE_SECTION_NEKO,
} from "@/lib/sleep-check/content";
import type { SleepContentSubcategory } from "@/lib/sleep-content/types";

const NEKO_SIZE = 72;
const OUEN_INTRINSIC = { width: 526, height: 594 };

function nekoDisplaySize(src: string): { width: number; height: number } {
  if (src === SLEEP_CHECK_IMAGES.ouen) {
    // 縦長 canvas でも頭の見え方が他ポーズと揃うよう高さを少し伸ばす
    const height = Math.round((NEKO_SIZE * OUEN_INTRINSIC.height) / 480);
    const width = Math.round((height * OUEN_INTRINSIC.width) / OUEN_INTRINSIC.height);
    return { width, height };
  }
  return { width: NEKO_SIZE, height: NEKO_SIZE };
}

export default function ScienceSectionHeading({
  subcategory,
  label,
  tone = "light",
}: {
  subcategory: SleepContentSubcategory;
  label: string;
  /** onDark: 睡眠学一覧（夜明け前）。light: 既定（明るいページ向け） */
  tone?: "light" | "onDark";
}) {
  const src = SCIENCE_SECTION_NEKO[subcategory];
  const { width, height } = nekoDisplaySize(src);
  const onDark = tone === "onDark";

  return (
    <h2
      className={`mb-4 flex items-center gap-3 text-2xl font-semibold tracking-[-0.02em] ${
        onDark ? "text-[#F5F2EA]" : "text-[#071426]"
      }`}
      style={onDark ? { textShadow: "0 2px 16px rgba(0,0,0,0.45)" } : undefined}
    >
      <span
        className="inline-flex shrink-0"
        style={
          onDark
            ? {
                width,
                height,
                filter:
                  "drop-shadow(0 0 10px rgba(255,255,255,0.45)) drop-shadow(0 0 20px rgba(255,255,255,0.22))",
              }
            : { width, height }
        }
      >
        <Image
          src={src}
          alt=""
          width={width}
          height={height}
          priority
          className="shrink-0 object-contain"
          style={{ width, height }}
        />
      </span>
      <span className="min-w-0">{label}</span>
    </h2>
  );
}
