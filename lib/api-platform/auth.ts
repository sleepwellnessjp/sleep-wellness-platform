import { NextResponse } from "next/server";
import {
  getCurrentProfile,
  requireAdminProfile,
} from "@/lib/platform/platform-service";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  findDemoApiKeyByPlain,
  touchDemoApiKeyUsage,
} from "./demo-store";
import type { ApiKeyScope, ApiPrincipal } from "./types";

const BEARER_RE = /^Bearer\s+(.+)$/i;

export function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = BEARER_RE.exec(header.trim());
  return match?.[1]?.trim() || null;
}

export function extractApiKeyHeader(request: Request): string | null {
  const direct =
    request.headers.get("x-api-key") ??
    request.headers.get("x-swij-api-key");
  if (direct?.trim()) return direct.trim();
  const bearer = extractBearerToken(request);
  if (bearer?.startsWith("swij_")) return bearer;
  return null;
}

function hasScope(scopes: ApiKeyScope[], required: ApiKeyScope): boolean {
  if (scopes.includes("*")) return true;
  return scopes.includes(required);
}

export function assertScope(
  principal: ApiPrincipal,
  required: ApiKeyScope,
): void {
  if (principal.authMethod === "jwt" || principal.authMethod === "role") {
    // Session JWT / role auth: full platform access for authenticated users
    // with role-gated routes handled separately.
    return;
  }
  if (!hasScope(principal.scopes, required)) {
    throw new Error(`Missing scope: ${required}`);
  }
}

/**
 * Resolve caller identity via API Key, JWT session, or role.
 * Priority: X-API-Key → Bearer swij_* → Supabase JWT session.
 */
export async function authenticateRequest(
  request: Request,
): Promise<ApiPrincipal> {
  const apiKeyPlain = extractApiKeyHeader(request);
  if (apiKeyPlain) {
    const record = findDemoApiKeyByPlain(apiKeyPlain);
    if (!record) {
      throw new Error("Invalid API key");
    }
    touchDemoApiKeyUsage(record.id);
    return {
      authMethod: "api_key",
      userId: record.createdBy,
      role: null,
      apiKey: record,
      scopes: record.scopes,
    };
  }

  if (isSupabaseConfigured()) {
    try {
      const profile = await getCurrentProfile();
      if (profile) {
        return {
          authMethod: "jwt",
          userId: profile.id,
          role: profile.role,
          apiKey: null,
          scopes: ["*"],
        };
      }
    } catch {
      // fall through
    }
  }

  // Demo mode: allow role header for local JWT simulation
  const roleHeader = request.headers.get("x-swij-role");
  const userHeader = request.headers.get("x-swij-user-id");
  if (roleHeader) {
    return {
      authMethod: "role",
      userId: userHeader ?? "demo-user",
      role: roleHeader,
      apiKey: null,
      scopes: ["*"],
    };
  }

  throw new Error("Unauthorized");
}

export async function requireDeveloperAdmin() {
  if (!isSupabaseConfigured()) {
    return {
      id: "demo-admin",
      role: "admin" as const,
      displayName: "Demo Admin",
    };
  }
  return requireAdminProfile();
}

export function authErrorResponse(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : "Unauthorized";
  if (message === "Unauthorized" || message === "Invalid API key") {
    return NextResponse.json({ error: message }, { status: 401 });
  }
  if (message === "Forbidden" || message.startsWith("Missing scope:")) {
    return NextResponse.json({ error: message }, { status: 403 });
  }
  if (message === "Rate limit exceeded") {
    return NextResponse.json({ error: message }, { status: 429 });
  }
  return NextResponse.json({ error: message }, { status: 400 });
}
