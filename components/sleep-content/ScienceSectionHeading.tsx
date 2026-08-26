import Image from "next/image";
import {
  SLEEP_CHECK_IMAGES,
  SCIENCE_SECTION_NEKO,
} from "@/lib/sleep-check/content";
import type { SleepContentSubcategory } from "@/lib/sleep-content/types";

const NEKO_SIZE = 48;
const OUEN_INTRINSIC = { width: 506, height: 588 };

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
}: {
  subcategory: SleepContentSubcategory;
  label: string;
}) {
  const src = SCIENCE_SECTION_NEKO[subcategory];
  const { width, height } = nekoDisplaySize(src);

  return (
    <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold tracking-[-0.02em] text-[#071426]">
      <Image
        src={src}
        alt=""
        width={width}
        height={height}
        className="shrink-0 object-contain"
        style={{ width, height }}
      />
      {label}
    </h2>
  );
}
