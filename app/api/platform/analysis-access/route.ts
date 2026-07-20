import { NextResponse } from "next/server";
import { checkAnalysisAccess } from "@/lib/platform/analysis-gate";

export async function GET() {
  const access = await checkAnalysisAccess();
  return NextResponse.json(access);
}
