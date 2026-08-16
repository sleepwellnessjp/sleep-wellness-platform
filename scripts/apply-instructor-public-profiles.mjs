#!/usr/bin/env node
/**
 * 公開プロフィール列を idempotent に追加する。
 * 必要: SUPABASE_DB_URL（postgres 接続）または psql が使える DATABASE_URL
 *
 *   SUPABASE_DB_URL='postgresql://...' node scripts/apply-instructor-public-profiles.mjs
 *
 * service_role だけでは DDL 不可のため、DB 接続文字列が必要です。
 * 無い場合は Supabase SQL Editor で supabase/instructor-public-profiles.sql を実行してください。
 */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const sqlPath = path.join(
  process.cwd(),
  "supabase",
  "instructor-public-profiles.sql",
);
const dbUrl =
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  "";

if (!dbUrl) {
  console.error(
    [
      "DB URL がありません。次のいずれかで適用してください:",
      "1) SUPABASE_DB_URL を設定してこのスクリプトを再実行",
      "2) Supabase Dashboard → SQL Editor で supabase/instructor-public-profiles.sql を実行",
    ].join("\n"),
  );
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, "utf8");
const result = spawnSync("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", "-c", sql], {
  encoding: "utf8",
});

if (result.status !== 0) {
  console.error(result.stderr || result.stdout || "psql failed");
  process.exit(result.status || 1);
}

console.log("Applied supabase/instructor-public-profiles.sql");
