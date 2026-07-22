import { NextResponse } from "next/server";
import { buildOpenApiDocument } from "@/lib/api-platform/openapi";

/** Auto-generated OpenAPI 3.1 document. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const doc = buildOpenApiDocument(baseUrl);
  return NextResponse.json(doc, {
    headers: {
      "Cache-Control": "public, max-age=60",
      "X-SWIJ-API-Version": "v1",
    },
  });
}
