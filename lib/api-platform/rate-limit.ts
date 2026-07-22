import {
  checkDemoRateLimit,
  getDemoRateLimitConfig,
} from "./demo-store";
import type { ApiPrincipal, RateLimitState } from "./types";

export function resolveRateLimitForPrincipal(
  principal: ApiPrincipal | null,
): number {
  const config = getDemoRateLimitConfig();
  if (!principal) return config.defaultPerMinute;
  if (principal.apiKey?.rateLimitPerMinute) {
    return principal.apiKey.rateLimitPerMinute;
  }
  return config.authenticatedPerMinute;
}

export function enforceRateLimit(
  request: Request,
  principal: ApiPrincipal | null,
): RateLimitState {
  const limit = resolveRateLimitForPrincipal(principal);
  const keyPart =
    principal?.apiKey?.id ??
    principal?.userId ??
    request.headers.get("x-forwarded-for") ??
    "anonymous";
  const bucketKey = `rl:${keyPart}`;
  const result = checkDemoRateLimit(bucketKey, limit);
  if (!result.allowed) {
    throw new Error("Rate limit exceeded");
  }
  return {
    limit: result.limit,
    remaining: result.remaining,
    resetAt: result.resetAt,
    allowed: result.allowed,
  };
}

export function rateLimitHeaders(state: RateLimitState): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(state.limit),
    "X-RateLimit-Remaining": String(state.remaining),
    "X-RateLimit-Reset": String(Math.ceil(state.resetAt / 1000)),
  };
}
