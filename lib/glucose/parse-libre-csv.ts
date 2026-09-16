/**
 * FreeStyle Libre（日本語）CSV パーサ。
 * メタ行 + ヘッダ行のあとデータ行。パース後は必ず recorded_at 昇順にソートする。
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

const COL = {
  device: 0,
  serial: 1,
  timestamp: 2,
  recordType: 3,
  historicGlucose: 4,
  scanGlucose: 5,
  note: 13,
  stripGlucose: 14,
} as const;

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

function sourceForRecordType(
  recordType: number,
  hasHistoric: boolean,
  hasScan: boolean,
  hasStrip: boolean,
): GlucoseReadingSource {
  if (recordType === 0 || hasHistoric) return "historic";
  if (recordType === 1 || hasScan) return "scan";
  if (hasStrip) return "strip";
  if (recordType === 6) return "note";
  return "other";
}

export function parseLibreGlucoseCsv(text: string): ParsedGlucoseReading[] {
  const lines = splitCsvRows(text);
  if (lines.length < 2) {
    throw new Error("CSVの行が足りません（メタ行・ヘッダ行が必要です）");
  }

  // 1行目がメタ、2行目がヘッダ。ヘッダ検出に失敗したら先頭をヘッダ扱い。
  let dataStart = 2;
  const headerCells = parseCsvLine(lines[1] ?? "");
  const looksLikeHeader =
    headerCells.some((c) => c.includes("タイムスタンプ")) ||
    headerCells.some((c) => c.includes("記録タイプ"));
  if (!looksLikeHeader) {
    dataStart = 1;
  }

  const parsed: ParsedGlucoseReading[] = [];

  for (let i = dataStart; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i] ?? "");
    if (cols.length < 4) continue;

    const recordedAtIso = parseLibreDeviceTimestamp(cols[COL.timestamp] ?? "");
    if (!recordedAtIso) continue;

    const recordType = parseIntOrNull(cols[COL.recordType]);
    if (recordType == null) continue;

    const historic = parseIntOrNull(cols[COL.historicGlucose]);
    const scan = parseIntOrNull(cols[COL.scanGlucose]);
    const strip = parseIntOrNull(cols[COL.stripGlucose]);
    const note = (cols[COL.note] ?? "").trim() || null;

    let glucoseMgDl: number | null = null;
    if (historic != null) glucoseMgDl = historic;
    else if (scan != null) glucoseMgDl = scan;
    else if (strip != null) glucoseMgDl = strip;

    // 血糖もメモも無い行はスキップ
    if (glucoseMgDl == null && !note) continue;

    const source = sourceForRecordType(
      recordType,
      historic != null,
      scan != null,
      strip != null,
    );

    parsed.push({
      recordedAtIso,
      recordType,
      source,
      glucoseMgDl,
      deviceName: (cols[COL.device] ?? "").trim() || null,
      serialNumber: (cols[COL.serial] ?? "").trim() || null,
      note,
    });
  }

  parsed.sort((a, b) => {
    const t = a.recordedAtIso.localeCompare(b.recordedAtIso);
    if (t !== 0) return t;
    return a.recordType - b.recordType;
  });

  // 同一キーの行が CSV 内に重複している場合は後ろを採用
  const deduped = new Map<string, ParsedGlucoseReading>();
  for (const row of parsed) {
    deduped.set(`${row.recordedAtIso}|${row.recordType}`, row);
  }

  return [...deduped.values()].sort((a, b) => {
    const t = a.recordedAtIso.localeCompare(b.recordedAtIso);
    if (t !== 0) return t;
    return a.recordType - b.recordType;
  });
}
