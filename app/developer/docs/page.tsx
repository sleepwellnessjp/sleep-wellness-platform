"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import Button from "@/components/ui/Button";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY, TEAL } from "@/components/ui/tokens";

type OpenApiDoc = {
  info: { title: string; version: string; description: string };
  paths: Record<string, Record<string, { summary?: string; tags?: string[] }>>;
  components?: {
    securitySchemes?: Record<string, { type: string; description?: string }>;
  };
};

export default function DeveloperDocsPage() {
  const [doc, setDoc] = useState<OpenApiDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/v1/openapi", { cache: "no-store" })
      .then(async (response) => {
        const json = (await response.json()) as OpenApiDoc & { error?: string };
        if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
        setDoc(json);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "取得に失敗しました");
      })
      .finally(() => setLoading(false));
  }, []);

  const endpoints = doc
    ? Object.entries(doc.paths).flatMap(([path, methods]) =>
        Object.entries(methods).map(([method, meta]) => ({
          path,
          method: method.toUpperCase(),
          summary: meta.summary ?? "",
          tags: meta.tags ?? [],
        })),
      )
    : [];

  return (
    <AdminShell
      eyebrow="DEVELOPER"
      title="API Reference"
      description="Swagger / OpenAPI 3.1 から自動生成された Sleep Wellness API v1 リファレンス。"
      actions={
        <div className="flex flex-wrap gap-2">
          <Button href="/developer" variant="secondary" size="sm">
            Dashboard
          </Button>
          <Button href="/api/v1/openapi" variant="ghost" size="sm">
            OpenAPI JSON
          </Button>
        </div>
      }
    >
      {loading ? (
        <Skeleton className="h-96 rounded-[28px]" />
      ) : error || !doc ? (
        <SectionCard title="読み込みエラー">
          <p className="text-sm text-slate-600">{error}</p>
        </SectionCard>
      ) : (
        <div className="space-y-8">
          <SectionCard eyebrow="OPENAPI" title={doc.info.title}>
            <p className="text-sm leading-7 text-slate-600">
              {doc.info.description}
            </p>
            <p className="mt-3 text-[12px] font-semibold tracking-[0.16em]" style={{ color: GOLD }}>
              VERSION {doc.info.version}
            </p>
          </SectionCard>

          <SectionCard eyebrow="AUTH" title="認証方式">
            <ul className="space-y-3">
              {Object.entries(doc.components?.securitySchemes ?? {}).map(
                ([name, scheme]) => (
                  <li
                    key={name}
                    className="rounded-2xl border border-slate-100 px-4 py-3"
                  >
                    <p className="font-semibold" style={{ color: NAVY }}>
                      {name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {scheme.type}
                      {scheme.description ? ` — ${scheme.description}` : ""}
                    </p>
                  </li>
                ),
              )}
            </ul>
          </SectionCard>

          <SectionCard eyebrow="ENDPOINTS" title="エンドポイント">
            <ul className="space-y-2">
              {endpoints.map((item) => (
                <li
                  key={`${item.method}-${item.path}`}
                  className="flex flex-col gap-1 rounded-2xl border border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-flex min-w-[3.5rem] justify-center rounded-full px-2 py-1 text-[11px] font-semibold text-white"
                      style={{ backgroundColor: TEAL }}
                    >
                      {item.method}
                    </span>
                    <code className="font-mono text-[13px]" style={{ color: NAVY }}>
                      /api/v1{item.path}
                    </code>
                  </div>
                  <p className="text-sm text-slate-500">{item.summary}</p>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard eyebrow="TRY" title="クイックコール">
            <pre className="overflow-x-auto rounded-2xl bg-[#071426] px-4 py-4 text-[12px] leading-6 text-slate-100">
{`curl -s \\
  -H "X-API-Key: swij_live_demo_platform_key_v4" \\
  https://your-host/api/v1/clients`}
            </pre>
          </SectionCard>
        </div>
      )}
    </AdminShell>
  );
}
