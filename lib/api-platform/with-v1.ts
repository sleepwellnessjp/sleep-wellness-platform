import { NextResponse } from "next/server";
import { authErrorResponse, authenticateRequest, assertScope } from "./auth";
import { recordApiAudit } from "./audit";
import type { ApiKeyScope, ApiPrincipal } from "./types";
import { enforceRateLimit, rateLimitHeaders } from "./rate-limit";

type HandlerContext = {
  request: Request;
  principal: ApiPrincipal;
  params: Record<string, string>;
};

type V1Handler = (ctx: HandlerContext) => Promise<unknown> | unknown;

export function withV1Api(
  options: {
    scope?: ApiKeyScope;
  },
  handler: V1Handler,
) {
  return async (
    request: Request,
    routeContext?: { params?: Promise<Record<string, string>> },
  ) => {
    const started = Date.now();
    const url = new URL(request.url);
    let principal: ApiPrincipal | null = null;
    let statusCode = 200;
    let errorMessage: string | null = null;

    try {
      principal = await authenticateRequest(request);
      if (options.scope) {
        assertScope(principal, options.scope);
      }
      const rate = enforceRateLimit(request, principal);
      const params = routeContext?.params ? await routeContext.params : {};
      const data = await handler({ request, principal, params });
      const body =
        data && typeof data === "object" && "data" in (data as object)
          ? data
          : { data };

      const response = NextResponse.json(body, { status: 200 });
      for (const [key, value] of Object.entries(rateLimitHeaders(rate))) {
        response.headers.set(key, value);
      }
      response.headers.set("X-SWIJ-API-Version", "v1");
      statusCode = 200;
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error";
      errorMessage = message;
      if (message === "Not found") {
        statusCode = 404;
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const response = authErrorResponse(error);
      statusCode = response.status;
      return response;
    } finally {
      recordApiAudit({
        method: request.method,
        path: url.pathname,
        statusCode,
        authMethod: principal?.authMethod ?? "none",
        apiKeyId: principal?.apiKey?.id ?? null,
        userId: principal?.userId ?? null,
        role: principal?.role ?? null,
        appName: principal?.apiKey?.appName ?? null,
        ip: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent"),
        durationMs: Date.now() - started,
        error: errorMessage,
      });
    }
  };
}
