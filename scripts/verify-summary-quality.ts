/**
 * Day 4: summary 品質を同一メトリクスで3回生成して検証する。
 * Usage: node --env-file=.env.local --import tsx scripts/verify-summary-quality.ts
 */
import OpenAI from "openai";
import {
  detectSummaryQualityIssues,
  SUMMARY_REWRITE_INSTRUCTIONS,
  summaryHasQualityIssues,
  type SummaryQualityIssue,
} from "../lib/analysis-summary-guard";

const METRICS_CONTEXT = `
睡眠効率 92%、HRV 55ms、総睡眠時間 5時間22分、平均SpO₂ 91%、安静時心拍 58bpm。
良かった点候補: 睡眠効率・HRV。整え余地候補: 睡眠時間・SpO₂（因果で結ばない）。
`;

const GENERATE_INSTRUCTIONS = `あなたは Sleep Wellness Institute Japan の総評（summary）ライターです。
120〜220文字の日本語 summary を1つ書いてください。
必ず良かった点（指標＋数値）から始める。
複数指標は「一方で」「また」で並列に述べ、因果断定しない。
特に睡眠時間不足が SpO₂／酸素低下の原因という趣旨は禁止。
「年齢と性別を考慮」「意識が大切」「心がけましょう」で締めない。
出力は JSON のみ: { "summary": "..." }`;

async function generateOnce(client: OpenAI, instructions: string, prompt: string) {
  const response = await client.responses.create({
    model: "gpt-4o",
    instructions,
    input: [
      {
        role: "user",
        content: [{ type: "input_text", text: prompt }],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "swij_summary_only",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["summary"],
          properties: { summary: { type: "string" } },
        },
      },
    },
  });
  const text = response.output_text?.trim();
  if (!text) throw new Error("empty output");
  const parsed = JSON.parse(text) as { summary?: string };
  return (parsed.summary ?? "").trim();
}

async function main() {
  const bad =
    "今回のデータでは、睡眠効率が92%と非常に高く、HRVも55msで適切な心拍のゆらぎが示されています。一方で、総睡眠時間が5時間22分と短く、酸素供給が不十分なことが指摘されます。今後、睡眠時間の延長が課題です。年齢と性別を考慮し、改善に向けた意識が大切です。";
  const badIssues = detectSummaryQualityIssues(bad);
  console.log("detector(bad sample):", badIssues);
  if (!badIssues.includes("causal_sleep_duration_spo2") || !badIssues.includes("empty_boilerplate_ending")) {
    console.error("FAIL: expected causal + boilerplate detection");
    process.exit(1);
  }

  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    console.warn("OPENAI_API_KEY missing — skipping 3x live generation");
    process.exit(0);
  }

  const client = new OpenAI({ apiKey: key });
  const results: {
    n: number;
    summary: string;
    issues: SummaryQualityIssue[];
    neededRewrite: boolean;
  }[] = [];

  for (let n = 1; n <= 3; n++) {
    let summary = await generateOnce(
      client,
      GENERATE_INSTRUCTIONS,
      `次の測定データから summary を作成してください。\n${METRICS_CONTEXT}`,
    );
    let issues = detectSummaryQualityIssues(summary);
    let neededRewrite = false;

    if (summaryHasQualityIssues(summary)) {
      neededRewrite = true;
      summary = await generateOnce(
        client,
        SUMMARY_REWRITE_INSTRUCTIONS,
        `次の summary を制約どおりに書き直してください。\n\n【現行】\n${summary}\n\n【参考】\n${METRICS_CONTEXT}`,
      );
      issues = detectSummaryQualityIssues(summary);
    }

    results.push({ n, summary, issues, neededRewrite });
    console.log(`\n=== run ${n} ===`);
    console.log(summary);
    console.log("neededRewrite:", neededRewrite);
    console.log("issues:", issues.length ? issues : "none");
  }

  const failed = results.filter((r) => r.issues.length > 0);
  console.log("\n=== summary ===");
  console.log(
    failed.length === 0
      ? "PASS: 3/3 runs had no causal/boilerplate issues (after optional 1 rewrite)"
      : `FAIL: ${failed.length}/3 still have issues`,
  );
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
