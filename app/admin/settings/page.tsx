"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import Button from "@/components/ui/Button";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { GOLD } from "@/components/ui/tokens";
import type { PlatformSettingsRecord } from "@/lib/admin/types";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettingsRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/admin/settings", { cache: "no-store" })
      .then(async (response) => {
        const json = (await response.json()) as {
          settings?: PlatformSettingsRecord;
          error?: string;
        };
        if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
        setSettings(json.settings ?? null);
      })
      .catch((err: unknown) => {
        setMessage(err instanceof Error ? err.message : "取得に失敗しました");
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandPrimary: settings.brandPrimary,
          brandAccent: settings.brandAccent,
          logoUrl: settings.logoUrl,
          termsOfService: settings.termsOfService,
          privacyPolicy: settings.privacyPolicy,
          contactEmail: settings.contactEmail,
          contactPhone: settings.contactPhone,
          contactNote: settings.contactNote,
        }),
      });
      const json = (await response.json()) as {
        settings?: PlatformSettingsRecord;
        error?: string;
      };
      if (!response.ok) throw new Error(json.error ?? "保存に失敗しました");
      setSettings(json.settings ?? settings);
      setMessage("設定を保存しました");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell
      title="システム設定"
      description="ブランドカラー・ロゴ・利用規約・プライバシーポリシー・問い合わせ先を管理します。"
    >
      {loading || !settings ? (
        <Skeleton className="h-96 rounded-[28px]" />
      ) : (
        <div className="space-y-6">
          <SectionCard eyebrow="BRAND" title="ブランド">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-semibold text-slate-600">プライマリカラー</span>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.brandPrimary}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        brandPrimary: event.target.value,
                      })
                    }
                    className="h-11 w-14 cursor-pointer rounded-xl border border-slate-200 bg-white"
                  />
                  <input
                    type="text"
                    value={settings.brandPrimary}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        brandPrimary: event.target.value,
                      })
                    }
                    className="min-h-11 flex-1 rounded-2xl border border-slate-200 px-4"
                  />
                </div>
              </label>
              <label className="block text-sm">
                <span className="font-semibold text-slate-600">アクセントカラー</span>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.brandAccent}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        brandAccent: event.target.value,
                      })
                    }
                    className="h-11 w-14 cursor-pointer rounded-xl border border-slate-200 bg-white"
                  />
                  <input
                    type="text"
                    value={settings.brandAccent}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        brandAccent: event.target.value,
                      })
                    }
                    className="min-h-11 flex-1 rounded-2xl border border-slate-200 px-4"
                  />
                </div>
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="font-semibold text-slate-600">ロゴ URL</span>
                <input
                  type="text"
                  value={settings.logoUrl}
                  onChange={(event) =>
                    setSettings({ ...settings, logoUrl: event.target.value })
                  }
                  className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 px-4"
                />
              </label>
            </div>
            <div
              className="mt-5 rounded-2xl border border-slate-100 px-4 py-5"
              style={{
                background: `linear-gradient(135deg, ${settings.brandPrimary} 0%, ${settings.brandAccent} 100%)`,
              }}
            >
              <p className="text-[11px] font-semibold tracking-[0.22em] text-white/80">
                PREVIEW
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                Sleep Wellness Institute Japan
              </p>
            </div>
          </SectionCard>

          <SectionCard eyebrow="LEGAL" title="規約・ポリシー">
            <label className="block text-sm">
              <span className="font-semibold text-slate-600">利用規約</span>
              <textarea
                value={settings.termsOfService}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    termsOfService: event.target.value,
                  })
                }
                rows={6}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3"
              />
            </label>
            <label className="mt-4 block text-sm">
              <span className="font-semibold text-slate-600">
                プライバシーポリシー
              </span>
              <textarea
                value={settings.privacyPolicy}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    privacyPolicy: event.target.value,
                  })
                }
                rows={6}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3"
              />
            </label>
          </SectionCard>

          <SectionCard eyebrow="CONTACT" title="問い合わせ先">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-semibold text-slate-600">メール</span>
                <input
                  type="email"
                  value={settings.contactEmail}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      contactEmail: event.target.value,
                    })
                  }
                  className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 px-4"
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold text-slate-600">電話</span>
                <input
                  type="text"
                  value={settings.contactPhone}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      contactPhone: event.target.value,
                    })
                  }
                  className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 px-4"
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="font-semibold text-slate-600">補足</span>
                <input
                  type="text"
                  value={settings.contactNote}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      contactNote: event.target.value,
                    })
                  }
                  className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 px-4"
                />
              </label>
            </div>
          </SectionCard>

          {message ? (
            <p
              className="rounded-2xl border px-4 py-3 text-sm"
              style={{
                borderColor: "rgba(49,95,104,0.2)",
                backgroundColor: "#f4f7f7",
                color: "#315f68",
              }}
            >
              {message}
            </p>
          ) : null}

          <Button
            onClick={() => void save()}
            disabled={saving}
            style={{ backgroundColor: GOLD }}
          >
            {saving ? "保存中..." : "設定を保存"}
          </Button>
          <p className="text-[12px] text-slate-400">
            最終更新:{" "}
            {new Date(settings.updatedAt).toLocaleString("ja-JP")}
          </p>
        </div>
      )}
    </AdminShell>
  );
}
