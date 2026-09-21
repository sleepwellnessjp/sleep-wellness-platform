/**
 * FreeStyle Libre（日本語）CSV パーサ。
 * メタ行 + ヘッダ行のあとデータ行。列は見出し名で特定する。
 * 記録タイプ 0（履歴）と 1（スキャン）のみ取り込み。時刻は Asia/Tokyo。
 */

export type GlucoseReadingSource =
  | "historic"
  | "scan"
  | "strip"
  | "note"
  | "other";

export type ParsedGlucoseReading = {
  recordedAtIso: string;
  recordType: number;
  source: GlucoseReadingSource;
  glucoseMgDl: number | null;
  deviceName: string | null;
  serialNumber: string | null;
  note: string | null;
};

const REQUIRED_HEADERS = [
  "タイムスタンプ測定器",
  "記録タイプ",
  "過去のグルコース値 mg/dL",
  "血糖値をスキャンする mg/dL",
] as const;

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function splitCsvRows(text: string): string[] {
  return text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
}

function normalizeHeader(raw: string): string {
  return raw.normalize("NFKC").trim().replace(/\s+/g, " ");
}

function parseIntOrNull(raw: string | undefined): number | null {
  const t = (raw ?? "").trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

/**
 * Libre データ行の時刻はタイムゾーン無し。アプリ慣例どおり Asia/Tokyo として解釈。
 */
export function parseLibreDeviceTimestamp(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  // 2026-09-15 21:34 or 2026-09-15 21:34:00
  const m = t.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/,
  );
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const isoLocal = `${y}-${mo}-${d}T${h}:${mi}:${s ?? "00"}+09:00`;
  const ms = Date.parse(isoLocal);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

function sourceForRecordType(recordType: number): GlucoseReadingSource {
  if (recordType === 0) return "historic";
  if (recordType === 1) return "scan";
  return "other";
}

function resolveHeaderIndexes(headerCells: string[]): {
  timestamp: number;
  recordType: number;
  historicGlucose: number;
  scanGlucose: number;
  device: number | null;
  serial: number | null;
  note: number | null;
} {
  const indexByName = new Map<string, number>();
  headerCells.forEach((cell, i) => {
    const key = normalizeHeader(cell);
    if (key && !indexByName.has(key)) indexByName.set(key, i);
  });

  const missing = REQUIRED_HEADERS.filter((name) => !indexByName.has(name));
  if (missing.length > 0) {
    throw new Error(
      `LibreView CSV の見出しが見つかりません: ${missing.join(" / ")}。` +
        `1行目がメタ情報、2行目が見出し（タイムスタンプ測定器・記録タイプ・過去のグルコース値 mg/dL・血糖値をスキャンする mg/dL）であることを確認してください。`,
    );
  }

  return {
    timestamp: indexByName.get("タイムスタンプ測定器")!,
    recordType: indexByName.get("記録タイプ")!,
    historicGlucose: indexByName.get("過去のグルコース値 mg/dL")!,
    scanGlucose: indexByName.get("血糖値をスキャンする mg/dL")!,
    device: indexByName.get("測定器") ?? null,
    serial: indexByName.get("シリアル番号") ?? null,
    note: indexByName.get("メモ") ?? null,
  };
}

export function parseLibreGlucoseCsv(text: string): ParsedGlucoseReading[] {
  const lines = splitCsvRows(text);
  if (lines.length < 2) {
    throw new Error("CSVの行が足りません（メタ行・ヘッダ行が必要です）");
  }

  // 1行目がメタ、2行目がヘッダ。ヘッダ検出に失敗したら分かりやすいエラー。
  let headerLineIndex = 1;
  const headerCells = parseCsvLine(lines[1] ?? "");
  const looksLikeHeader =
    headerCells.some((c) => normalizeHeader(c).includes("タイムスタンプ")) ||
    headerCells.some((c) => normalizeHeader(c).includes("記録タイプ"));
  if (!looksLikeHeader) {
    // 先頭行が見出しのケースも許容
    const firstCells = parseCsvLine(lines[0] ?? "");
    const firstLooksLikeHeader =
      firstCells.some((c) => normalizeHeader(c).includes("タイムスタンプ")) ||
      firstCells.some((c) => normalizeHeader(c).includes("記録タイプ"));
    if (!firstLooksLikeHeader) {
      throw new Error(
        "LibreView CSV の見出し行を特定できません。2行目に「タイムスタンプ測定器」「記録タイプ」などの見出しがあるか確認してください。",
      );
    }
    headerLineIndex = 0;
  }

  const cols = resolveHeaderIndexes(parseCsvLine(lines[headerLineIndex] ?? ""));
  const dataStart = headerLineIndex + 1;
  const parsed: ParsedGlucoseReading[] = [];

  for (let i = dataStart; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i] ?? "");
    if (cells.length < 4) continue;

    const recordedAtIso = parseLibreDeviceTimestamp(cells[cols.timestamp] ?? "");
    if (!recordedAtIso) continue;

    const recordType = parseIntOrNull(cells[cols.recordType]);
    if (recordType == null) continue;
    // 記録タイプ 0・1 のみ。それ以外は無視。
    if (recordType !== 0 && recordType !== 1) continue;

    const historic = parseIntOrNull(cells[cols.historicGlucose]);
    const scan = parseIntOrNull(cells[cols.scanGlucose]);
    const note =
      cols.note != null ? (cells[cols.note] ?? "").trim() || null : null;

    let glucoseMgDl: number | null = null;
    if (recordType === 0 && historic != null) glucoseMgDl = historic;
    else if (recordType === 1 && scan != null) glucoseMgDl = scan;
    else if (historic != null) glucoseMgDl = historic;
    else if (scan != null) glucoseMgDl = scan;

    if (glucoseMgDl == null && !note) continue;

    parsed.push({
      recordedAtIso,
      recordType,
      source: sourceForRecordType(recordType),
      glucoseMgDl,
      deviceName:
        cols.device != null
          ? (cells[cols.device] ?? "").trim() || null
          : null,
      serialNumber:
        cols.serial != null
          ? (cells[cols.serial] ?? "").trim() || null
          : null,
      note,
    });
  }

  parsed.sort((a, b) => {
    const t = a.recordedAtIso.localeCompare(b.recordedAtIso);
    if (t !== 0) return t;
    return a.recordType - b.recordType;
  });

  // 同一時刻は1件にまとめる（履歴=0 を優先）
  const deduped = new Map<string, ParsedGlucoseReading>();
  for (const row of parsed) {
    const existing = deduped.get(row.recordedAtIso);
    if (!existing) {
      deduped.set(row.recordedAtIso, row);
      continue;
    }
    if (existing.recordType !== 0 && row.recordType === 0) {
      deduped.set(row.recordedAtIso, row);
    }
  }

  return [...deduped.values()].sort((a, b) =>
    a.recordedAtIso.localeCompare(b.recordedAtIso),
  );
}
