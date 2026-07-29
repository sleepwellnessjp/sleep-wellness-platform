/**
 * SOXAI OCR 用画像ハッシュ（SHA-256）と結果キャッシュ。
 * 同一画像の再解析・再課金を防ぐ。
 */

import type { SoxaiGraphBundle } from "@/lib/soxai-graphs";
import type { MetricConfidenceMap, MergedMetricConflict } from "@/lib/soxai-merge";
import type { AnalysisMetrics } from "@/lib/soxai-metrics";
import type { VisibleReading } from "@/lib/soxai-reading-map";
import type { SoxaiScreenType } from "@/lib/soxai-screen";

export type CachedOcrImageStatus = {
  index: number;
  section: string;
  label: string;
  status: "success" | "failed" | "timeout" | "cancelled";
  error?: string;
  durationMs?: number;
};

export const SOXAI_OCR_CACHE_VERSION = "v5";
const PER_IMAGE_STORAGE_KEY = "swij-soxai-ocr-image-cache-v5";
const SET_STORAGE_KEY = "swij-soxai-ocr-set-cache-v5";
const DEBUG_FLAG_KEY = "swij-ocr-debug-v1";
const MAX_PER_IMAGE = 24;
const MAX_SETS = 8;

export type CachedOcrImageResult = {
  hash: string;
  screenType: SoxaiScreenType;
  visibleReadings: VisibleReading[];
  metrics: AnalysisMetrics;
  graphs: SoxaiGraphBundle;
  confidence: MetricConfidenceMap;
  conflicts: MergedMetricConflict[];
  error: string | null;
  cachedAt: number;
};

export type CachedOcrSetResult = {
  fingerprint: string;
  imageHashes: string[];
  metrics: AnalysisMetrics;
  conflicts: MergedMetricConflict[];
  graphs: SoxaiGraphBundle;
  confidence: MetricConfidenceMap;
  imageStatuses: CachedOcrImageStatus[];
  cachedAt: number;
};

const memoryPerImage = new Map<string, CachedOcrImageResult>();
const memorySets = new Map<string, CachedOcrSetResult>();

function bytesToHex(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes);
  let out = "";
  for (let i = 0; i < view.length; i += 1) {
    out += view[i]!.toString(16).padStart(2, "0");
  }
  return out;
}

/** data URL / 任意文字列の SHA-256 hex */
export async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  if (typeof crypto !== "undefined" && crypto.subtle?.digest) {
    const digest = await crypto.subtle.digest("SHA-256", data);
    return bytesToHex(digest);
  }
  // Node fallback
  const { createHash } = await import("crypto");
  return createHash("sha256").update(value).digest("hex");
}

/** 画像 data URL の内容ハッシュ（MIME 正規化後） */
export async function hashImageDataUrl(dataUrl: string): Promise<string> {
  const normalized = dataUrl.replace(/^data:image\/jpg;base64,/i, "data:image/jpeg;base64,");
  const comma = normalized.indexOf(",");
  const payload = comma >= 0 ? normalized.slice(comma + 1) : normalized;
  return sha256Hex(payload);
}

export async function hashImageDataUrls(images: string[]): Promise<string[]> {
  return Promise.all(images.map((image) => hashImageDataUrl(image)));
}

/**
 * セット指紋。ハッシュをソートして結合するため、画像のアップロード順が
 * 前後しても同一セットなら同一 fingerprint になる（キャッシュミスを防ぐ）。
 */
export function setFingerprintFromHashes(hashes: string[]): string {
  const sorted = [...hashes].sort((a, b) => a.localeCompare(b));
  return `${SOXAI_OCR_CACHE_VERSION}|${sorted.join("|")}`;
}

export function isSoxaiOcrDebugMode(): boolean {
  if (typeof process !== "undefined" && process.env) {
    if (
      process.env.SOXAI_OCR_DEBUG === "1" ||
      process.env.NEXT_PUBLIC_SOXAI_OCR_DEBUG === "1"
    ) {
      return true;
    }
  }
  if (typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(DEBUG_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSoxaiOcrDebugMode(enabled: boolean) {
  if (typeof localStorage === "undefined") return;
  try {
    if (enabled) localStorage.setItem(DEBUG_FLAG_KEY, "1");
    else localStorage.removeItem(DEBUG_FLAG_KEY);
  } catch {
    // ignore
  }
}

function readMapFromStorage<T>(key: string): Record<string, T> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Record<string, T>;
  } catch {
    return {};
  }
}

function writeMapToStorage(key: string, value: Record<string, unknown>, max: number) {
  if (typeof localStorage === "undefined") return;
  try {
    const keys = Object.keys(value);
    if (keys.length > max) {
      const sorted = keys
        .map((k) => {
          const entry = value[k] as { cachedAt?: number };
          return { k, at: typeof entry?.cachedAt === "number" ? entry.cachedAt : 0 };
        })
        .sort((a, b) => a.at - b.at);
      for (const item of sorted.slice(0, keys.length - max)) {
        delete value[item.k];
      }
    }
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota — メモリのみ
  }
}

export function getCachedOcrImage(hash: string): CachedOcrImageResult | null {
  const memory = memoryPerImage.get(hash);
  if (memory) return memory;
  const stored = readMapFromStorage<CachedOcrImageResult>(PER_IMAGE_STORAGE_KEY)[hash];
  if (!stored || stored.hash !== hash) return null;
  memoryPerImage.set(hash, stored);
  return stored;
}

export function setCachedOcrImage(entry: CachedOcrImageResult) {
  memoryPerImage.set(entry.hash, entry);
  const all = readMapFromStorage<CachedOcrImageResult>(PER_IMAGE_STORAGE_KEY);
  all[entry.hash] = entry;
  writeMapToStorage(PER_IMAGE_STORAGE_KEY, all, MAX_PER_IMAGE);
}

export function getCachedOcrSet(fingerprint: string): CachedOcrSetResult | null {
  const memory = memorySets.get(fingerprint);
  if (memory) return memory;
  const stored = readMapFromStorage<CachedOcrSetResult>(SET_STORAGE_KEY)[fingerprint];
  if (!stored || stored.fingerprint !== fingerprint) return null;
  memorySets.set(fingerprint, stored);
  return stored;
}

export function setCachedOcrSet(entry: CachedOcrSetResult) {
  memorySets.set(entry.fingerprint, entry);
  const all = readMapFromStorage<CachedOcrSetResult>(SET_STORAGE_KEY);
  all[entry.fingerprint] = entry;
  writeMapToStorage(SET_STORAGE_KEY, all, MAX_SETS);
}

/** デバッグ用: 直近のセットキャッシュを1件返す */
export function getLatestCachedOcrSet(): CachedOcrSetResult | null {
  let latest: CachedOcrSetResult | null = null;
  for (const entry of memorySets.values()) {
    if (!latest || entry.cachedAt > latest.cachedAt) latest = entry;
  }
  const stored = readMapFromStorage<CachedOcrSetResult>(SET_STORAGE_KEY);
  for (const entry of Object.values(stored)) {
    if (!latest || entry.cachedAt > latest.cachedAt) latest = entry;
  }
  return latest;
}
