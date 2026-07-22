"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import Button from "@/components/ui/Button";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { DANGER, GOLD, NAVY, SUCCESS, TEAL } from "@/components/ui/tokens";
import type {
  ApiAuditLog,
  ApiKeyDashboardRow,
  DeveloperDashboardStats,
  IssuedApiKey,
  RateLimitConfig,
  WebhookDelivery,
  WebhookEndpoint,
  WebhookEventType,
} from "@/lib/api-platform/types";
import { ALL_API_SCOPES, WEBHOOK_EVENTS } from "@/lib/api-platform/types";

type DashboardPayload = {
  stats: DeveloperDashboardStats;
  keys: ApiKeyDashboardRow[];
  webhooks: WebhookEndpoint[];
  rateLimit: RateLimitConfig;
  recentAudit: ApiAuditLog[];
  recentDeliveries: WebhookDelivery[];
  error?: string;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusColor(status: string) {
  if (status === "active" || status === "delivered") return SUCCESS;
  if (status === "revoked" || status === "failed" || status === "expired")
    return DANGER;
  return TEAL;
}

export default function DeveloperDashboardPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [appName, setAppName] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [scopes, setScopes] = useState<string[]>(["*"]);

  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<WebhookEventType[]>([
    "AnalysisCompleted",
  ]);
  const [webhookDescription, setWebhookDescription] = useState("");

  const [rateLimit, setRateLimit] = useState<RateLimitConfig | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/developer/keys", { cache: "no-store" });
      const json = (await response.json()) as DashboardPayload;
      if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
      setData(json);
      setRateLimit(json.rateLimit);
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const issueKey = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setIssuedKey(null);
    try {
      const response = await fetch("/api/developer/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          appName,
          scopes,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      });
      const json = (await response.json()) as {
        key?: IssuedApiKey;
        error?: string;
      };
      if (!response.ok) throw new Error(json.error ?? "発行に失敗しました");
      setIssuedKey(json.key?.apiKey ?? null);
      setMessage("API Key を発行しました。この値は一度だけ表示されます。");
      setName("");
      setAppName("");
      setExpiresAt("");
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "発行に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const revokeKey = async (id: string) => {
    if (!window.confirm("この API Key を無効化しますか？")) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/developer/keys/${id}`, {
        method: "DELETE",
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "無効化に失敗しました");
      setMessage("API Key を無効化しました");
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "無効化に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const createWebhook = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/developer/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          events: webhookEvents,
          description: webhookDescription,
        }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "登録に失敗しました");
      setMessage("Webhook を登録しました");
      setWebhookUrl("");
      setWebhookDescription("");
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const toggleWebhook = async (webhook: WebhookEndpoint) => {
    setBusy(true);
    try {
      const response = await fetch(`/api/developer/webhooks/${webhook.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !webhook.active }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "更新に失敗しました");
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const saveRateLimit = async () => {
    if (!rateLimit) return;
    setBusy(true);
    try {
      const response = await fetch("/api/developer/rate-limit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rateLimit),
      });
      const json = (await response.json()) as {
        rateLimit?: RateLimitConfig;
        error?: string;
      };
      if (!response.ok) throw new Error(json.error ?? "保存に失敗しました");
      setRateLimit(json.rateLimit ?? rateLimit);
      setMessage("Rate Limit を保存しました");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const toggleScope = (scope: string) => {
    if (scope === "*") {
      setScopes(["*"]);
      return;
    }
    setScopes((prev) => {
      const withoutStar = prev.filter((s) => s !== "*");
      if (withoutStar.includes(scope)) {
        const next = withoutStar.filter((s) => s !== scope);
        return next.length > 0 ? next : ["*"];
      }
      return [...withoutStar, scope];
    });
  };

  const toggleWebhookEvent = (event: WebhookEventType) => {
    setWebhookEvents((prev) =>
      prev.includes(event)
        ? prev.filter((e) => e !== event)
        : [...prev, event],
    );
  };

  return (
    <AdminShell
      eyebrow="DEVELOPER"
      title="Developer Dashboard"
      description="Sleep Wellness API Platform — API Key・Webhook・Rate Limit・監査ログを管理します。"
      actions={
        <div className="flex flex-wrap gap-2">
          <Button href="/developer/docs" variant="secondary" size="sm">
            API Docs
          </Button>
          <Button href="/api/v1/openapi" variant="ghost" size="sm">
            OpenAPI JSON
          </Button>
        </div>
      }
    >
      {message ? (
        <p
          className="mb-6 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          style={{ color: NAVY }}
        >
          {message}
        </p>
      ) : null}

      {issuedKey ? (
        <SectionCard
          className="mb-6"
          eyebrow="NEW KEY"
          title="発行された API Key"
        >
          <p className="text-sm text-slate-600">
            このキーは再表示できません。安全な場所に保存してください。
          </p>
          <code
            className="mt-4 block overflow-x-auto rounded-2xl px-4 py-3 font-mono text-[13px] text-white"
            style={{ backgroundColor: NAVY }}
          >
            {issuedKey}
          </code>
        </SectionCard>
      ) : null}

      {loading || !data ? (
        <div className="space-y-4">
          <Skeleton className="h-28 rounded-[28px]" />
          <Skeleton className="h-64 rounded-[28px]" />
        </div>
      ) : error ? (
        <SectionCard title="読み込みエラー">
          <p className="text-sm text-slate-600">{error}</p>
          <Button className="mt-4" size="sm" onClick={() => void load()}>
            再読み込み
          </Button>
        </SectionCard>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "Active Keys", value: data.stats.activeKeys },
              { label: "Total Requests", value: data.stats.totalRequests },
              { label: "Webhooks", value: data.stats.webhookEndpoints },
              {
                label: "Requests (24h)",
                value: data.stats.requestsLast24h,
              },
              {
                label: "Audit (24h)",
                value: data.stats.auditEventsLast24h,
              },
              { label: "Total Keys", value: data.stats.totalKeys },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-[24px] border border-slate-200/90 bg-white px-5 py-5 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.22)]"
              >
                <p
                  className="text-[10px] font-semibold tracking-[0.2em]"
                  style={{ color: GOLD }}
                >
                  {stat.label.toUpperCase()}
                </p>
                <p
                  className="mt-3 text-3xl font-semibold tracking-[-0.04em]"
                  style={{ color: NAVY }}
                >
                  {stat.value.toLocaleString("ja-JP")}
                </p>
              </div>
            ))}
          </div>

          <SectionCard eyebrow="API KEYS" title="API Key 一覧">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-[11px] font-semibold tracking-[0.12em] text-slate-400">
                  <tr>
                    <th className="pb-3 pr-4">API Key</th>
                    <th className="pb-3 pr-4">利用回数</th>
                    <th className="pb-3 pr-4">最終利用</th>
                    <th className="pb-3 pr-4">利用アプリ</th>
                    <th className="pb-3 pr-4">発行日</th>
                    <th className="pb-3 pr-4">状態</th>
                    <th className="pb-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {data.keys.map((key) => (
                    <tr key={key.id} className="border-t border-slate-100">
                      <td className="py-4 pr-4">
                        <p className="font-semibold" style={{ color: NAVY }}>
                          {key.name}
                        </p>
                        <p className="mt-1 font-mono text-[12px] text-slate-400">
                          {key.maskedKey}
                        </p>
                      </td>
                      <td className="py-4 pr-4 tabular-nums text-slate-600">
                        {key.usageCount.toLocaleString("ja-JP")}
                      </td>
                      <td className="py-4 pr-4 text-slate-600">
                        {formatDate(key.lastUsedAt)}
                      </td>
                      <td className="py-4 pr-4 text-slate-600">{key.appName}</td>
                      <td className="py-4 pr-4 text-slate-600">
                        {formatDate(key.createdAt)}
                      </td>
                      <td className="py-4 pr-4">
                        <span
                          className="text-[12px] font-semibold"
                          style={{ color: statusColor(key.status) }}
                        >
                          {key.status}
                        </span>
                        {key.expiresAt ? (
                          <p className="mt-1 text-[11px] text-slate-400">
                            期限 {formatDate(key.expiresAt)}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-4">
                        {key.status === "active" ? (
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={busy}
                            onClick={() => void revokeKey(key.id)}
                          >
                            無効化
                          </Button>
                        ) : (
                          <span className="text-[12px] text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard eyebrow="ISSUE" title="API Key 発行">
            <p className="mb-5 text-sm text-slate-600">
              管理者のみ発行できます。有効期限を設定し、不要になったら無効化してください。
            </p>
            <form onSubmit={(e) => void issueKey(e)} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="font-semibold text-slate-600">名前</span>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 px-4"
                    placeholder="Partner Production"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-semibold text-slate-600">利用アプリ</span>
                  <input
                    required
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 px-4"
                    placeholder="CRM Sync"
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="font-semibold text-slate-600">有効期限</span>
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 px-4 sm:max-w-sm"
                  />
                </label>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600">Scopes</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ALL_API_SCOPES.map((scope) => {
                    const active = scopes.includes(scope);
                    return (
                      <button
                        key={scope}
                        type="button"
                        onClick={() => toggleScope(scope)}
                        className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
                          active
                            ? "text-white"
                            : "border border-slate-200 bg-white text-slate-500"
                        }`}
                        style={active ? { backgroundColor: NAVY } : undefined}
                      >
                        {scope}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Button type="submit" disabled={busy}>
                API Key を発行
              </Button>
            </form>
          </SectionCard>

          <SectionCard eyebrow="WEBHOOKS" title="Webhook">
            <div className="space-y-4">
              {data.webhooks.map((webhook) => (
                <div
                  key={webhook.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold" style={{ color: NAVY }}>
                        {webhook.url}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {webhook.description || "No description"}
                      </p>
                      <p className="mt-2 text-[12px] text-slate-400">
                        {webhook.events.join(" · ")}
                      </p>
                      <p className="mt-1 text-[12px] text-slate-400">
                        最終配信 {formatDate(webhook.lastDeliveryAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[12px] font-semibold"
                        style={{
                          color: statusColor(
                            webhook.active ? "active" : "revoked",
                          ),
                        }}
                      >
                        {webhook.active ? "active" : "disabled"}
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => void toggleWebhook(webhook)}
                      >
                        {webhook.active ? "無効化" : "有効化"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <form
              onSubmit={(e) => void createWebhook(e)}
              className="mt-6 space-y-4 border-t border-slate-100 pt-6"
            >
              <label className="block text-sm">
                <span className="font-semibold text-slate-600">Endpoint URL</span>
                <input
                  required
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 px-4"
                  placeholder="https://hooks.example.com/swij"
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold text-slate-600">説明</span>
                <input
                  value={webhookDescription}
                  onChange={(e) => setWebhookDescription(e.target.value)}
                  className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 px-4"
                  placeholder="Partner CRM"
                />
              </label>
              <div>
                <p className="text-sm font-semibold text-slate-600">Events</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {WEBHOOK_EVENTS.map((event) => {
                    const active = webhookEvents.includes(event);
                    return (
                      <button
                        key={event}
                        type="button"
                        onClick={() => toggleWebhookEvent(event)}
                        className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
                          active
                            ? "text-white"
                            : "border border-slate-200 bg-white text-slate-500"
                        }`}
                        style={active ? { backgroundColor: TEAL } : undefined}
                      >
                        {event}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Button type="submit" disabled={busy || webhookEvents.length === 0}>
                Webhook を追加
              </Button>
            </form>
          </SectionCard>

          <SectionCard eyebrow="RATE LIMIT" title="Rate Limit">
            {rateLimit ? (
              <div className="grid gap-4 sm:grid-cols-3">
                {(
                  [
                    ["defaultPerMinute", "匿名 / 既定"],
                    ["burstPerMinute", "バースト"],
                    ["authenticatedPerMinute", "認証済み"],
                  ] as const
                ).map(([field, label]) => (
                  <label key={field} className="block text-sm">
                    <span className="font-semibold text-slate-600">{label}</span>
                    <input
                      type="number"
                      min={1}
                      value={rateLimit[field]}
                      onChange={(e) =>
                        setRateLimit({
                          ...rateLimit,
                          [field]: Number(e.target.value),
                        })
                      }
                      className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 px-4"
                    />
                  </label>
                ))}
              </div>
            ) : null}
            <Button className="mt-5" size="sm" disabled={busy} onClick={() => void saveRateLimit()}>
              保存
            </Button>
          </SectionCard>

          <SectionCard eyebrow="AUDIT" title="監査ログ">
            <ul className="space-y-3">
              {data.recentAudit.length === 0 ? (
                <li className="text-sm text-slate-500">
                  まだ監査ログがありません。API を呼び出すとここに記録されます。
                </li>
              ) : (
                data.recentAudit.map((log) => (
                  <li
                    key={log.id}
                    className="rounded-2xl border border-slate-100 px-4 py-3"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-mono text-[13px]" style={{ color: NAVY }}>
                        <span className="font-semibold">{log.method}</span>{" "}
                        {log.path}
                      </p>
                      <p className="text-[12px] text-slate-400">
                        {formatDate(log.createdAt)}
                      </p>
                    </div>
                    <p className="mt-1 text-[12px] text-slate-500">
                      {log.statusCode} · {log.authMethod}
                      {log.appName ? ` · ${log.appName}` : ""} · {log.durationMs}ms
                    </p>
                  </li>
                ))
              )}
            </ul>
            <p className="mt-4 text-sm text-slate-500">
              詳細は{" "}
              <Link href="/developer/audit" className="underline" style={{ color: TEAL }}>
                監査ログ一覧
              </Link>
              へ。
            </p>
          </SectionCard>
        </div>
      )}
    </AdminShell>
  );
}
