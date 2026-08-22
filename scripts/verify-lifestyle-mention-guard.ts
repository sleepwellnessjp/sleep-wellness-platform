/**
 * 未入力生活習慣ガードの検証。
 * Usage: node --env-file=.env.local --import tsx scripts/verify-lifestyle-mention-guard.ts
 */
import OpenAI from "openai";
import {
  applyLifestyleRewritePayload,
  buildLifestyleMentionRewriteInstructions,
  categoriesMentionedInText,
  collectUnfilledLifestyleCategories,
  detectLifestyleMentionHits,
  formatUnfilledCategoriesForPrompt,
  lifestyleMentionHasIssues,
  sanitizeLifestyleMentionsInRecord,
  snapshotLifestyleGuardedFields,
  type LifestyleRewritePayload,
} from "../lib/analysis-lifestyle-mention-guard";

const EMPTY_LIFESTYLE = {};

const BAD_SAMPLE = {
  summary:
    "睡眠効率は良好です。一方で多めの飲酒と不規則な勤務がリズムに影響している可能性があります。",
  scoreComment:
    "今回のスコアは身体と生活のバランスです。夕食を摂らないことが生活点に影響しています。",
  profileRelation:
    "今回は、固定プロフィールに多くの飲酒量が影響する可能性があります。",
  categoryScoreRationales: {
    body: "身体70点は睡眠時間が支えです。",
    mind: "心65点はHRVを反映しています。",
    lifestyle:
      "生活48点は、夕食を摂らないことや不規則な勤務が影響しています。",
    environment: "環境60点は体内時計のずれを反映しています。",
  },
};

async function rewriteOnce(
  client: OpenAI,
  record: Record<string, unknown>,
  unfilled: ReturnType<typeof collectUnfilledLifestyleCategories>,
) {
  const hits = detectLifestyleMentionHits(record, unfilled);
  const snapshot = snapshotLifestyleGuardedFields(record, hits);
  const requiredKeys = Object.keys(snapshot) as Array<
    keyof LifestyleRewritePayload
  >;
  const properties: Record<string, unknown> = {};
  for (const key of requiredKeys) {
    if (key === "categoryScoreRationales") {
      const rationale = snapshot.categoryScoreRationales ?? {};
      const rationaleKeys = Object.keys(rationale);
      properties.categoryScoreRationales = {
        type: "object",
        additionalProperties: false,
        required: rationaleKeys,
        properties: Object.fromEntries(
          rationaleKeys.map((k) => [k, { type: "string" }]),
        ),
      };
    } else {
      properties[key] = { type: "string" };
    }
  }

  const rewrite = await client.responses.create({
    model: "gpt-4o",
    instructions: buildLifestyleMentionRewriteInstructions(unfilled),
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `次のフィールドを書き直してください。記録のない項目（${formatUnfilledCategoriesForPrompt(unfilled)}）には一切言及しないこと。\n\n【現行】\n${JSON.stringify(snapshot, null, 2)}\n\n測定: 睡眠効率92%、総睡眠5時間22分、HRV55ms。生活習慣フォームは全て未入力。`,
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "swij_lifestyle_mention_rewrite",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: requiredKeys,
          properties,
        },
      },
    },
  });
  const text = rewrite.output_text?.trim();
  if (!text) throw new Error("empty rewrite");
  applyLifestyleRewritePayload(
    record,
    JSON.parse(text) as LifestyleRewritePayload,
  );
}

async function generateFromScratch(client: OpenAI) {
  const response = await client.responses.create({
    model: "gpt-4o",
    instructions: `あなたは Sleep Wellness Institute Japan の分析ライターです。
生活習慣フォームは全て未入力。飲酒・食事・勤務・カフェイン・運動・入浴・服薬には一切言及しないこと。
未入力を「していない」「多い」と断定しない。測定データ中心で書く。
出力は JSON のみ。`,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `次の JSON を埋めてください。生活習慣は全て未入力です。
測定: 睡眠効率92%、総睡眠5時間22分、HRV55ms、SpO₂91%。score=72。categoryScores body70 mind65 lifestyle48 environment60。

{
  "summary": "",
  "scoreComment": "",
  "profileRelation": "",
  "categoryScoreRationales": {
    "body": "",
    "mind": "",
    "lifestyle": "",
    "environment": ""
  }
}`,
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "swij_lifestyle_guard_sample",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: [
            "summary",
            "scoreComment",
            "profileRelation",
            "categoryScoreRationales",
          ],
          properties: {
            summary: { type: "string" },
            scoreComment: { type: "string" },
            profileRelation: { type: "string" },
            categoryScoreRationales: {
              type: "object",
              additionalProperties: false,
              required: ["body", "mind", "lifestyle", "environment"],
              properties: {
                body: { type: "string" },
                mind: { type: "string" },
                lifestyle: { type: "string" },
                environment: { type: "string" },
              },
            },
          },
        },
      },
    },
  });
  const text = response.output_text?.trim();
  if (!text) throw new Error("empty generate");
  return JSON.parse(text) as Record<string, unknown>;
}

function assertClean(label: string, record: Record<string, unknown>) {
  const unfilled = collectUnfilledLifestyleCategories(EMPTY_LIFESTYLE);
  const hits = detectLifestyleMentionHits(record, unfilled);
  if (hits.length > 0) {
    console.error("FAIL", label, hits);
    console.error(JSON.stringify(record, null, 2));
    process.exit(1);
  }
  console.log("OK", label);
}

async function main() {
  const unfilled = collectUnfilledLifestyleCategories(EMPTY_LIFESTYLE);
  console.log("unfilled (all empty):", formatUnfilledCategoriesForPrompt(unfilled));

  const badHits = detectLifestyleMentionHits(BAD_SAMPLE, unfilled);
  console.log("detector(bad sample) hits:", badHits.length, badHits);
  if (badHits.length < 3) {
    console.error("FAIL: expected multiple hits on bad sample");
    process.exit(1);
  }

  // 入力ありの飲酒は unfilled に入れない
  const withAlcohol = collectUnfilledLifestyleCategories({
    alcoholDrank: "none",
  });
  if (withAlcohol.includes("alcohol")) {
    console.error("FAIL: alcoholDrank=none should count as filled");
    process.exit(1);
  }
  if (
    categoriesMentionedInText("飲酒なしで眠れています", ["alcohol"]).length ===
    0
  ) {
    console.error("FAIL: keyword alcohol should match 飲酒");
    process.exit(1);
  }
  console.log("OK detector unit checks");

  // sanitize fallback
  const sanitized = structuredClone(BAD_SAMPLE) as Record<string, unknown>;
  sanitizeLifestyleMentionsInRecord(sanitized, unfilled);
  assertClean("sanitize fallback", sanitized);

  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    console.warn("OPENAI_API_KEY missing — skipping 3x live generation");
    process.exit(0);
  }

  const client = new OpenAI({ apiKey: key });

  for (let n = 1; n <= 3; n++) {
    const record = await generateFromScratch(client);
    let neededRewrite = lifestyleMentionHasIssues(record, unfilled);
    if (neededRewrite) {
      console.warn(`run ${n}: mentions detected — rewriting`);
      await rewriteOnce(client, record, unfilled);
      if (lifestyleMentionHasIssues(record, unfilled)) {
        console.warn(`run ${n}: still dirty — sanitizing`);
        sanitizeLifestyleMentionsInRecord(record, unfilled);
      }
    }
    assertClean(`live generate #${n}`, record);
    console.log(`--- run ${n} final ---`);
    console.log("summary:", record.summary);
    console.log("profileRelation:", record.profileRelation);
    console.log(
      "lifestyle rationale:",
      (record.categoryScoreRationales as { lifestyle?: string }).lifestyle,
    );
    console.log("neededRewrite:", neededRewrite);
  }

  console.log("ALL PASSED");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
