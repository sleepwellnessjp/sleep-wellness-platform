import type {
  MelatoninYogaSessionFormat,
  MelatoninYogaTrainingFormat,
} from "@/lib/melatonin-yoga/types";

/** Phase 3 公開フォーム: 養成コースの受講形式選択肢を出し分け */
export function allowedTrainingFormats(options: {
  isFlexible: boolean;
  sessionFormat?: MelatoninYogaSessionFormat;
  archiveAvailable?: boolean;
}): MelatoninYogaTrainingFormat[] {
  if (options.isFlexible) {
    return ["online", "in_person", "archive"];
  }

  const formats: MelatoninYogaTrainingFormat[] = [];

  switch (options.sessionFormat) {
    case "online":
      formats.push("online");
      break;
    case "in_person":
      formats.push("in_person");
      break;
    case "hybrid":
      formats.push("online", "in_person");
      break;
    default:
      break;
  }

  if (options.archiveAvailable) {
    formats.push("archive");
  }

  return formats;
}
