/**
 * OpenAPI 3.1 document for Sleep Wellness API Platform v1.
 * Served from /api/v1/openapi and rendered in Developer docs UI.
 */

export type OpenApiDocument = {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
    contact?: { name: string; email?: string };
  };
  servers: Array<{ url: string; description: string }>;
  tags: Array<{ name: string; description: string }>;
  paths: Record<string, unknown>;
  components: {
    securitySchemes: Record<string, unknown>;
    schemas: Record<string, unknown>;
  };
  security: Array<Record<string, string[]>>;
};

const jsonResponse = (schemaRef: string, description = "OK") => ({
  "200": {
    description,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            data: { $ref: `#/components/schemas/${schemaRef}` },
          },
        },
      },
    },
  },
  "401": { description: "Unauthorized" },
  "403": { description: "Forbidden / missing scope" },
  "429": { description: "Rate limit exceeded" },
});

const listResponse = (schemaRef: string) => ({
  "200": {
    description: "OK",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: { $ref: `#/components/schemas/${schemaRef}` },
            },
          },
        },
      },
    },
  },
  "401": { description: "Unauthorized" },
  "403": { description: "Forbidden / missing scope" },
  "429": { description: "Rate limit exceeded" },
});

export function buildOpenApiDocument(baseUrl = ""): OpenApiDocument {
  return {
    openapi: "3.1.0",
    info: {
      title: "Sleep Wellness API Platform",
      version: "4.0.0",
      description:
        "Open Platform REST API for Sleep Wellness Platform. Authenticate with API Key, JWT, or Role.",
      contact: { name: "SWIJ Platform", email: "api@sleepwellness.jp" },
    },
    servers: [
      {
        url: `${baseUrl}/api/v1`,
        description: "Version 1",
      },
    ],
    tags: [
      { name: "Clients", description: "クライアント" },
      { name: "Analysis", description: "睡眠分析" },
      { name: "Journey", description: "Sleep Wellness Journey™" },
      { name: "Homework", description: "宿題" },
      { name: "Sleep Coach", description: "日次コーチ" },
      { name: "Academy", description: "認定・学習" },
      { name: "Events", description: "イベント" },
      { name: "Reports", description: "レポート" },
      { name: "Meta", description: "API メタ情報" },
    ],
    paths: {
      "/health": {
        get: {
          tags: ["Meta"],
          summary: "Health check",
          security: [],
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Health" },
                },
              },
            },
          },
        },
      },
      "/clients": {
        get: {
          tags: ["Clients"],
          summary: "List clients",
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
          responses: listResponse("Client"),
        },
      },
      "/clients/{id}": {
        get: {
          tags: ["Clients"],
          summary: "Get client",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            ...jsonResponse("Client"),
            "404": { description: "Not found" },
          },
        },
      },
      "/analyses": {
        get: {
          tags: ["Analysis"],
          summary: "List analyses",
          parameters: [
            {
              name: "clientId",
              in: "query",
              schema: { type: "string" },
            },
          ],
          responses: listResponse("Analysis"),
        },
      },
      "/analyses/{id}": {
        get: {
          tags: ["Analysis"],
          summary: "Get analysis",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            ...jsonResponse("Analysis"),
            "404": { description: "Not found" },
          },
        },
      },
      "/clients/{id}/journey": {
        get: {
          tags: ["Journey"],
          summary: "Get journey for client",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            ...jsonResponse("Journey"),
            "404": { description: "Not found" },
          },
        },
      },
      "/homework": {
        get: {
          tags: ["Homework"],
          summary: "List homework",
          parameters: [
            {
              name: "clientId",
              in: "query",
              schema: { type: "string" },
            },
          ],
          responses: listResponse("Homework"),
        },
      },
      "/clients/{id}/sleep-coach": {
        get: {
          tags: ["Sleep Coach"],
          summary: "Get sleep coach plan",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            ...jsonResponse("SleepCoach"),
            "404": { description: "Not found" },
          },
        },
      },
      "/academy": {
        get: {
          tags: ["Academy"],
          summary: "List academy items",
          responses: listResponse("AcademyItem"),
        },
      },
      "/events": {
        get: {
          tags: ["Events"],
          summary: "List events",
          responses: listResponse("Event"),
        },
      },
      "/reports": {
        get: {
          tags: ["Reports"],
          summary: "List reports",
          parameters: [
            {
              name: "clientId",
              in: "query",
              schema: { type: "string" },
            },
          ],
          responses: listResponse("Report"),
        },
      },
      "/reports/{id}": {
        get: {
          tags: ["Reports"],
          summary: "Get report metadata",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            ...jsonResponse("Report"),
            "404": { description: "Not found" },
          },
        },
      },
      "/openapi": {
        get: {
          tags: ["Meta"],
          summary: "OpenAPI document",
          security: [],
          responses: {
            "200": {
              description: "OpenAPI 3.1 JSON",
              content: {
                "application/json": {
                  schema: { type: "object" },
                },
              },
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "X-API-Key",
          description: "Sleep Wellness API Key (swij_live_…)",
        },
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Supabase session JWT or API Key as Bearer token",
        },
        RoleAuth: {
          type: "apiKey",
          in: "header",
          name: "X-SWIJ-Role",
          description: "Demo / internal role header (admin, instructor, client)",
        },
      },
      schemas: {
        Health: {
          type: "object",
          properties: {
            status: { type: "string", example: "ok" },
            version: { type: "string", example: "v1" },
            platform: { type: "string", example: "4.0.0" },
          },
        },
        Client: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            instructorId: { type: "string" },
            sleepWellnessScore: { type: "number", nullable: true },
            lastAnalysisAt: { type: "string", format: "date-time", nullable: true },
            status: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Analysis: {
          type: "object",
          properties: {
            id: { type: "string" },
            clientId: { type: "string" },
            sleepWellnessScore: { type: "number" },
            analyzedAt: { type: "string", format: "date-time" },
            summary: { type: "string" },
            metrics: { type: "object", additionalProperties: true },
          },
        },
        Journey: {
          type: "object",
          properties: {
            clientId: { type: "string" },
            stage: { type: "string" },
            title: { type: "string" },
            narrative: { type: "string" },
            scoreTrend: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string" },
                  score: { type: "number" },
                },
              },
            },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Homework: {
          type: "object",
          properties: {
            id: { type: "string" },
            clientId: { type: "string" },
            title: { type: "string" },
            status: {
              type: "string",
              enum: ["pending", "in_progress", "completed"],
            },
            dueAt: { type: "string", format: "date-time", nullable: true },
            completedAt: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
          },
        },
        SleepCoach: {
          type: "object",
          properties: {
            clientId: { type: "string" },
            focus: { type: "string" },
            actions: { type: "array", items: { type: "string" } },
            generatedAt: { type: "string", format: "date-time" },
          },
        },
        AcademyItem: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            type: { type: "string", enum: ["lesson", "test", "certificate"] },
            progress: { type: "number" },
            status: { type: "string" },
          },
        },
        Event: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            startsAt: { type: "string", format: "date-time" },
            endsAt: { type: "string", format: "date-time" },
            location: { type: "string" },
            capacity: { type: "number" },
            registered: { type: "number" },
          },
        },
        Report: {
          type: "object",
          properties: {
            id: { type: "string" },
            clientId: { type: "string" },
            title: { type: "string" },
            format: { type: "string", enum: ["pdf", "json"] },
            createdAt: { type: "string", format: "date-time" },
            downloadUrl: { type: "string" },
          },
        },
      },
    },
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
  };
}
