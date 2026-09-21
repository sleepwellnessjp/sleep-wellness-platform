/**
 * SOXAI 画像の File[] と sections[] を同一順序で組み立てる。
 * プレビュー・提出で同じ順序を使い、/api/vision-soxai に空 sections を送らない。
 */

import type { SoxaiExtractSection } from "@/lib/soxai-ocr-runner";
import type {
  WearableImageCategory,
  WearableRequiredImageSpec,
  WearableUploadedImage,
} from "@/lib/wearable-analysis";

export type SoxaiCategoryImageMap = Partial<
  Record<WearableImageCategory, WearableUploadedImage[]>
>;

export type SoxaiFilesAndSections = {
  files: File[];
  sections: Array<SoxaiExtractSection | "">;
  images: WearableUploadedImage[];
};

/**
 * specs のカテゴリ順 → unknown。各画像に対応する soxaiSection を付ける。
 * unknown / 未割当は ""（サーバー側のラベル探索フォールバック対象）。
 */
export function buildSoxaiFilesAndSections(
  specs: readonly WearableRequiredImageSpec[],
  map: SoxaiCategoryImageMap,
): SoxaiFilesAndSections {
  const files: File[] = [];
  const sections: Array<SoxaiExtractSection | ""> = [];
  const images: WearableUploadedImage[] = [];

  for (const spec of specs) {
    if (!spec.soxaiSection) continue;
    const list = map[spec.category] ?? [];
    for (const image of list) {
      files.push(image.file);
      sections.push(spec.soxaiSection);
      images.push(image);
    }
  }

  for (const image of map.unknown ?? []) {
    files.push(image.file);
    sections.push("");
    images.push(image);
  }

  return { files, sections, images };
}

/** sections がすべて空（または長さ 0）なら true */
export function areSoxaiSectionsBlank(
  sections: Array<SoxaiExtractSection | ""> | undefined | null,
): boolean {
  if (!sections || sections.length === 0) return true;
  return sections.every((section) => !section);
}
