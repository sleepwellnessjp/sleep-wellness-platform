import { NextResponse } from "next/server";
import { appendFileSync } from "node:fs";

const LOG_PATH = "/tmp/user-ocr-button-console.log";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const line = `${new Date().toISOString()} ${JSON.stringify(body)}\n`;
    appendFileSync(LOG_PATH, line, "utf8");
    // npm run dev のターミナルでも確認できるようにする
    console.log("[debug-client-log]", body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 },
    );
  }
}
