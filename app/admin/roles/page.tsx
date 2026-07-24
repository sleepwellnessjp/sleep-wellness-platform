"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY, SUCCESS, MUTED } from "@/components/ui/tokens";
import type { AccessLevel } from "@/lib/rbac/types";

type AuthorityRow = {
  key: string;
  label: string;
  description: string;
  permissions: Record<string, AccessLevel>;
};

type ResourceRow = { key: string; label: string };

const LEVEL_LABEL: Record<AccessLevel, string> = {
  none: "—",
  view: "閲覧",
  edit: "編集",
};

function levelStyle(level: AccessLevel): { color: string; bg: string } {
  if (level === "edit") return { color: SUCCESS, bg: "rgba(22,163,74,0.08)" };
  if (level === "view") return { color: NAVY, bg: "rgba(7,20,38,0.06)" };
  return { color: MUTED, bg: "transparent" };
}

export default function AdminRolesPage() {
  const [authorities, setAuthorities] = useState<AuthorityRow[]>([]);
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/admin/rbac", { cache: "no-store" })
      .then(async (response) => {
        const json = (await response.json()) as {
          authorities?: AuthorityRow[];
          resources?: ResourceRow[];
          error?: string;
        };
        if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
        setAuthorities(json.authorities ?? []);
        setResources(json.resources ?? []);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "取得に失敗しました");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminShell
      title="権限管理"
      description="SWIJ本部・認定校・認定講師・クライアントの閲覧／編集権限を確認します。"
    >
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {authorities.map((auth) => (
              <SectionCard
                key={auth.key}
                eyebrow={auth.key.toUpperCase()}
                title={auth.label}
              >
                <p className="text-[14px] leading-7 text-slate-600">
                  {auth.description}
                </p>
              </SectionCard>
            ))}
          </div>

          <SectionCard
            className="mt-6"
            eyebrow="MATRIX"
            title="画面アクセス権限"
          >
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="py-3 pr-4 font-semibold" style={{ color: NAVY }}>
                      画面
                    </th>
                    {authorities.map((auth) => (
                      <th
                        key={auth.key}
                        className="px-2 py-3 text-center font-semibold"
                        style={{ color: GOLD }}
                      >
                        {auth.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resources.map((resource) => (
                    <tr
                      key={resource.key}
                      className="border-b border-slate-50 last:border-0"
                    >
                      <td className="py-2.5 pr-4 text-slate-700">
                        {resource.label}
                      </td>
                      {authorities.map((auth) => {
                        const level =
                          auth.permissions[resource.key] ?? "none";
                        const style = levelStyle(level);
                        return (
                          <td key={auth.key} className="px-2 py-2.5 text-center">
                            <span
                              className="inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold"
                              style={{
                                color: style.color,
                                backgroundColor: style.bg,
                              }}
                            >
                              {LEVEL_LABEL[level]}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      )}
    </AdminShell>
  );
}
