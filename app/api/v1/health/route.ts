import { NextResponse } from "next/server";

/** Public health — no auth required. */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    version: "v1",
    platform: "4.0.0",
    name: "Sleep Wellness API Platform",
  });
}
