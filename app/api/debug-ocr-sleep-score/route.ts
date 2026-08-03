import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  isImageDataUrl,
  normalizeImageDataUrl,
} from "@/lib/openai-helpers";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * 切り分け専用: 画像1枚・睡眠スコア1項目・OpenAI 1リクエストのみ。
 * 本番 OCR パイプラインは使わない。
 */
export async function POST(request: Request) {
  const log = (msg: string) => {
    console.info(msg);
  };

  log("START");

  try {
    if (!process.env.OPENAI_API_KEY?.trim()) {
      log("ERROR OPENAI_API_KEY missing");
      return NextResponse.json({ error: "OPENAI_API_KEY missing" }, { status: 500 });
    }

    const body = (await request.json()) as { image?: unknown };
    if (!isImageDataUrl(body.image)) {
      log("ERROR invalid image");
      return NextResponse.json({ error: "image required" }, { status: 400 });
    }

    const imageUrl = normalizeImageDataUrl(body.image);
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 180_000,
      maxRetries: 0,
    });

    log("OpenAIへ送信");
    const response = await client.responses.create({
      model: "gpt-4o-mini",
      instructions:
        "SOXAI画面の睡眠スコア（Sleep Score）だけを読む。他の項目は返さない。",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "この画像から睡眠スコア（数値）だけを抽出してください。見つからなければ null。",
            },
            {
              type: "input_image" as const,
              image_url: imageUrl,
              detail: "low",
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "sleep_score_only",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              sleepScore: { type: ["number", "null"] },
            },
            required: ["sleepScore"],
          },
        },
      },
    });

    // SDK成功時は HTTP 200
    log("HTTP Status 200");
    log("レスポンス受信");

    const outputText = response.output_text?.trim() ?? "";
    const parsed = JSON.parse(outputText) as { sleepScore: number | null };
    log("parse完了");
    log("終了");

    return NextResponse.json({
      ok: true,
      sleepScore: parsed.sleepScore,
    });
  } catch (error) {
    const status =
      error && typeof error === "object" && "status" in error
        ? Number((error as { status?: unknown }).status)
        : null;
    if (status) log(`HTTP Status ${status}`);
    log(
      `ERROR ${error instanceof Error ? error.message : String(error)}`.slice(
        0,
        200,
      ),
    );
    log("終了");
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
