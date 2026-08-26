/**
 * sleep-content-images カバー SVG の viewBox を、本体ディスクにフィットする正方形へ直す。
 *
 * 基準:
 *   fill="url(#...)" の circle のうち半径 r が最大のものを本体ディスクとする。
 *   R = r × 囲む g の scale（なければ 1）
 *   viewBox = "cx-R cy-R 2R 2R" / width・height = 2R
 *
 * 使い方:
 *   npx tsx scripts/fix-cover-viewbox.ts           # dry-run（既定）+ 未保存バックアップ
 *   npx tsx scripts/fix-cover-viewbox.ts --apply  # Storage へ上書きアップロード
 *
 * 必要環境変数（--apply 時）:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

const BUCKET = "sleep-content-images";
const BACKUP_DIR = "backups/covers-original";

/** ラベル（記事タイトル）と Storage オブジェクトパス */
const TARGETS: { title: string; objectPath: string }[] = [
  // cover-* 系
  { title: "かんたんお風呂ヨガと睡眠", objectPath: "cover-bath-yoga-and-sleep.svg" },
  { title: "ノンレム睡眠とレム睡眠", objectPath: "cover-nrem-and-rem.svg" },
  { title: "メラトニンの役割と分泌のリズム", objectPath: "cover-melatonin.svg" },
  { title: "体内時計（概日リズム）とは？", objectPath: "cover-circadian-rhythm.svg" },
  {
    title: "深部体温と眠気 — 体温が下がると眠くなる理由",
    objectPath: "cover-core-body-temperature.svg",
  },
  {
    title: "睡眠が人生の土台を作るとは？",
    objectPath: "cover-sleep-as-life-foundation.svg",
  },
  {
    title: "睡眠圧（アデノシン）と2プロセスモデル",
    objectPath: "cover-sleep-pressure.svg",
  },
  // 大ディスク系
  { title: "ストレスとは？", objectPath: "stress-cover.svg" },
  { title: "中途覚醒と睡眠", objectPath: "waking-cover.svg" },
  { title: "睡眠と呼吸法の関係", objectPath: "breathing-cover.svg" },
  { title: "睡眠系ホルモンとは？", objectPath: "hormones-cover.svg" },
  // その他未修正 / 検証
  { title: "瞑想の種類", objectPath: "types-cover.svg" },
  { title: "美容と睡眠", objectPath: "beauty-cover.svg" },
  {
    title: "自律神経とは？",
    objectPath:
      "a1d5eb68-ac38-40c9-874f-4b593faa7861/edcfcba5-d065-4a75-968e-af442011a9dd.svg",
  },
  // 既修正分（新ルールで再計算・検証）
  { title: "心拍変動と心拍数の関係", objectPath: "hrv-cover.svg" },
  { title: "室温と湿度と睡眠", objectPath: "room-cover.svg" },
  { title: "飲酒と睡眠", objectPath: "alcohol-cover.svg" },
  { title: "大人と睡眠", objectPath: "adults-cover.svg" },
  { title: "子どもと睡眠", objectPath: "children-cover.svg" },
  { title: "高齢者と睡眠", objectPath: "older-cover.svg" },
  { title: "更年期と睡眠", objectPath: "menopause-cover.svg" },
  { title: "月経と睡眠", objectPath: "menstruation-cover.svg" },
  { title: "薄毛と睡眠", objectPath: "hair-cover.svg" },
  { title: "筋トレと睡眠", objectPath: "strength-cover.svg" },
  { title: "記憶力と睡眠", objectPath: "memory-cover.svg" },
  { title: "ヨガと睡眠", objectPath: "yoga-cover.svg" },
  { title: "睡眠と瞑想の関係", objectPath: "meditation-cover.svg" },
  { title: "仕事の効率と睡眠", objectPath: "work-cover.svg" },
];

type CoverPlan = {
  title: string;
  objectPath: string;
  publicUrl: string;
  oldViewBox: string;
  newViewBox: string;
  oldWidth: string | null;
  oldHeight: string | null;
  newSize: string;
  cx: number;
  cy: number;
  r: number;
  scale: number;
  effectiveR: number;
  unchanged: boolean;
  nextSvg: string;
};

function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function fmt(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(4).replace(/\.?0+$/, "");
}

function publicUrlFor(objectPath: string): string {
  const base =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ??
    "https://cqfclbyzdmxfgktkbbsz.supabase.co";
  return `${base}/storage/v1/object/public/${BUCKET}/${objectPath}`;
}

function objectPathFromCoverUrl(url: string): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx >= 0) {
    return decodeURIComponent(url.slice(idx + marker.length).split("?")[0]);
  }
  const alt = `/object/sign/${BUCKET}/`;
  const idx2 = url.indexOf(alt);
  if (idx2 >= 0) {
    return decodeURIComponent(url.slice(idx2 + alt.length).split("?")[0]);
  }
  return null;
}

/**
 * 本体ディスク = fill="url(#...)" かつ r 最大の circle。
 * scale = その直前にある translate(... ) scale(S) translate(... ) の S（なければ 1）。
 */
function parseSvgGeometry(svg: string): {
  cx: number;
  cy: number;
  r: number;
  scale: number;
  oldViewBox: string;
  oldWidth: string | null;
  oldHeight: string | null;
} {
  const viewBoxMatch = svg.match(/viewBox\s*=\s*"([^"]+)"/i);
  if (!viewBoxMatch) throw new Error("viewBox が見つかりません");
  const oldViewBox = viewBoxMatch[1];
  const widthMatch = svg.match(/\bwidth\s*=\s*"([^"]+)"/i);
  const heightMatch = svg.match(/\bheight\s*=\s*"([^"]+)"/i);

  type GradCircle = { cx: number; cy: number; r: number; index: number };
  const gradientCircles: GradCircle[] = [];
  const circleRe = /<circle\b([^>]*)\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = circleRe.exec(svg)) !== null) {
    const attrs = m[1];
    const fill = /(?:^|\s)fill\s*=\s*"([^"]*)"/i.exec(attrs)?.[1] ?? "";
    if (!/^url\s*\(/i.test(fill)) continue;
    const cx = Number(/(?:^|\s)cx\s*=\s*"([^"]*)"/i.exec(attrs)?.[1]);
    const cy = Number(/(?:^|\s)cy\s*=\s*"([^"]*)"/i.exec(attrs)?.[1]);
    const r = Number(/(?:^|\s)r\s*=\s*"([^"]*)"/i.exec(attrs)?.[1]);
    if (![cx, cy, r].every(Number.isFinite)) continue;
    gradientCircles.push({ cx, cy, r, index: m.index });
  }
  if (gradientCircles.length === 0) {
    throw new Error('fill="url(#...)" の circle が見つかりません');
  }

  let body = gradientCircles[0];
  for (const c of gradientCircles) {
    if (c.r > body.r) body = c;
  }

  // 本体 circle より前のテキストから、最後の translate-scale-translate を拾う
  const before = svg.slice(0, body.index);
  const scaleRe =
    /transform\s*=\s*"translate\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)\s*scale\(\s*([-\d.]+)\s*\)\s*translate\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)"/gi;
  let scale = 1;
  let sm: RegExpExecArray | null;
  while ((sm = scaleRe.exec(before)) !== null) {
    const s = Number(sm[3]);
    if (Number.isFinite(s) && s !== 0) scale = s;
  }

  return {
    cx: body.cx,
    cy: body.cy,
    r: body.r,
    scale,
    oldViewBox,
    oldWidth: widthMatch?.[1] ?? null,
    oldHeight: heightMatch?.[1] ?? null,
  };
}

function rewriteViewBox(svg: string, viewBox: string, size: string): string {
  let next = svg.replace(/viewBox\s*=\s*"[^"]*"/i, `viewBox="${viewBox}"`);
  if (/\bwidth\s*=\s*"[^"]*"/i.test(next)) {
    next = next.replace(/\bwidth\s*=\s*"[^"]*"/i, `width="${size}"`);
  } else {
    next = next.replace(/<svg\b/i, `<svg width="${size}"`);
  }
  if (/\bheight\s*=\s*"[^"]*"/i.test(next)) {
    next = next.replace(/\bheight\s*=\s*"[^"]*"/i, `height="${size}"`);
  } else {
    next = next.replace(/<svg\b/i, `<svg height="${size}"`);
  }
  return next;
}

async function resolveTargets(
  supabase: SupabaseClient | null,
): Promise<{ title: string; objectPath: string; publicUrl: string }[]> {
  const byTitle = new Map<string, string>();
  if (supabase) {
    const titles = TARGETS.map((t) => t.title);
    const { data, error } = await supabase
      .from("sleep_contents")
      .select("title, cover_image_url")
      .in("title", titles);
    if (error) {
      console.warn("[warn] sleep_contents 照会に失敗:", error.message);
    } else {
      for (const row of data ?? []) {
        const path = objectPathFromCoverUrl(String(row.cover_image_url ?? ""));
        if (path) byTitle.set(String(row.title), path);
      }
    }
  }

  return TARGETS.map((t) => {
    const objectPath = byTitle.get(t.title) ?? t.objectPath;
    return {
      title: t.title,
      objectPath,
      publicUrl: publicUrlFor(objectPath),
    };
  });
}

async function fetchSvg(publicUrl: string): Promise<string> {
  const res = await fetch(`${publicUrl}?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`ダウンロード失敗 ${res.status}: ${publicUrl}`);
  return res.text();
}

async function backupMissing(targets: { objectPath: string; publicUrl: string }[]) {
  mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(`[backup] dir=${BACKUP_DIR}`);
  for (const t of targets) {
    const dest = resolve(BACKUP_DIR, t.objectPath);
    if (existsSync(dest)) {
      console.log(`  skip (exists): ${t.objectPath}`);
      continue;
    }
    mkdirSync(dirname(dest), { recursive: true });
    const svg = await fetchSvg(t.publicUrl);
    writeFileSync(dest, svg, "utf8");
    const vb = /viewBox\s*=\s*"([^"]+)"/i.exec(svg)?.[1] ?? "?";
    console.log(`  saved: ${t.objectPath} (viewBox="${vb}")`);
  }
  console.log("");
}

async function buildPlan(
  title: string,
  objectPath: string,
  publicUrl: string,
): Promise<CoverPlan> {
  const svg = await fetchSvg(publicUrl);
  const geo = parseSvgGeometry(svg);
  const effectiveR = geo.r * geo.scale;
  const minX = geo.cx - effectiveR;
  const minY = geo.cy - effectiveR;
  const size = effectiveR * 2;
  const newViewBox = `${fmt(minX)} ${fmt(minY)} ${fmt(size)} ${fmt(size)}`;
  const newSize = fmt(size);
  const nextSvg = rewriteViewBox(svg, newViewBox, newSize);
  const unchanged = geo.oldViewBox === newViewBox;

  return {
    title,
    objectPath,
    publicUrl,
    oldViewBox: geo.oldViewBox,
    newViewBox,
    oldWidth: geo.oldWidth,
    oldHeight: geo.oldHeight,
    newSize,
    cx: geo.cx,
    cy: geo.cy,
    r: geo.r,
    scale: geo.scale,
    effectiveR,
    unchanged,
    nextSvg,
  };
}

async function uploadSvg(
  supabase: SupabaseClient,
  objectPath: string,
  svg: string,
): Promise<void> {
  const body = Buffer.from(svg, "utf8");
  const contentType = "image/svg+xml";

  const attempt = async () =>
    supabase.storage.from(BUCKET).upload(objectPath, body, {
      upsert: true,
      contentType,
      cacheControl: "3600",
    });

  let { error } = await attempt();
  if (!error) return;

  console.warn(
    `[warn] upsert 失敗 (${objectPath}): ${error.message} → remove して再 upload`,
  );
  const { error: removeError } = await supabase.storage
    .from(BUCKET)
    .remove([objectPath]);
  if (removeError) {
    throw new Error(
      `remove 失敗 (${objectPath}): ${removeError.message} / 元: ${error.message}`,
    );
  }
  ({ error } = await attempt());
  if (error) {
    throw new Error(`再 upload 失敗 (${objectPath}): ${error.message}`);
  }
}

async function main(): Promise<void> {
  loadEnvFile(resolve(process.cwd(), ".env.local"));
  loadEnvFile(resolve(process.cwd(), ".env"));

  const apply = process.argv.includes("--apply");
  const mode = apply ? "APPLY" : "DRY-RUN";
  console.log(`\n[fix-cover-viewbox] mode=${mode}`);
  console.log(
    `rule: body = max-r circle with fill=url(#...); R = r * scale\n`,
  );

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const publishable =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  const readClient =
    url && (serviceKey || publishable)
      ? createClient(url, serviceKey || publishable!)
      : null;
  const writeClient =
    apply && url && serviceKey ? createClient(url, serviceKey) : null;

  if (apply && !writeClient) {
    throw new Error(
      "--apply には NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が必要です",
    );
  }

  const targets = await resolveTargets(readClient);
  if (targets.length !== TARGETS.length) {
    throw new Error(
      `対象件数が一致しません: got ${targets.length}, want ${TARGETS.length}`,
    );
  }

  await backupMissing(targets);

  const plans: CoverPlan[] = [];
  let changeCount = 0;
  for (const target of targets) {
    const plan = await buildPlan(
      target.title,
      target.objectPath,
      target.publicUrl,
    );
    plans.push(plan);
    if (!plan.unchanged) changeCount += 1;
    const mark = plan.unchanged ? "unchanged" : "CHANGE";
    console.log(`— ${plan.title} [${mark}]`);
    console.log(`  file: ${plan.objectPath}`);
    console.log(
      `  body: cx=${plan.cx} cy=${plan.cy} r=${plan.r} scale=${plan.scale} → R=${fmt(plan.effectiveR)}`,
    );
    console.log(`  viewBox: "${plan.oldViewBox}" → "${plan.newViewBox}"`);
    console.log(
      `  size: ${plan.oldWidth ?? "?"}×${plan.oldHeight ?? "?"} → ${plan.newSize}×${plan.newSize}`,
    );
    console.log("");
  }

  console.log(
    `summary: ${plans.length} files, ${changeCount} would change, ${plans.length - changeCount} unchanged\n`,
  );

  if (!apply) {
    console.log(
      "dry-run 完了。問題なければ次を実行してください:\n  npx tsx scripts/fix-cover-viewbox.ts --apply\n",
    );
    return;
  }

  for (const plan of plans) {
    if (plan.unchanged) {
      console.log(`skip (unchanged): ${plan.objectPath}`);
      continue;
    }
    await uploadSvg(writeClient!, plan.objectPath, plan.nextSvg);
    console.log(`uploaded: ${plan.objectPath}`);
  }
  console.log(`\n完了: ${changeCount} 件を更新しました。\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
