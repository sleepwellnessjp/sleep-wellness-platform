"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import OsShell from "@/components/os/OsShell";
import SectionCard from "@/components/ui/SectionCard";
import { useToast } from "@/components/ui/Toast";
import { GOLD, NAVY } from "@/components/ui/tokens";
import { useAuth } from "@/lib/auth/use-auth";
import { usePlatformMe } from "@/lib/platform/use-platform-me";
import { normalizeOsRole, OS_ROLE_LABELS, type OsRole } from "@/lib/os/roles";

const inputClass =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[15px] text-[#071426] outline-none transition focus:border-[#315f68] focus:ring-4 focus:ring-[#315f68]/10";

export default function SettingsPage() {
  const { toast } = useToast();
  const { email, isDemoMode } = useAuth();
  const { data, loading } = usePlatformMe();
  const role: OsRole = normalizeOsRole(data?.profile.role ?? "instructor");

  const [displayName, setDisplayName] = useState("");
  const [notifyHomework, setNotifyHomework] = useState(true);
  const [notifyAnalysis, setNotifyAnalysis] = useState(true);
  const [notifyRenewal, setNotifyRenewal] = useState(true);
  const [notifyEvent, setNotifyEvent] = useState(true);
  const [notifyMessage, setNotifyMessage] = useState(true);

  useEffect(() => {
    if (data?.profile.displayName) {
      setDisplayName(data.profile.displayName);
    }
  }, [data?.profile.displayName]);

  const onSaveProfile = (event: FormEvent) => {
    event.preventDefault();
    toast("プロフィールを保存しました", "success");
  };

  const onSaveNotifications = (event: FormEvent) => {
    event.preventDefault();
    toast("通知設定を保存しました", "success");
  };

  return (
    <OsShell role={role} contentClassName="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <header className="mb-10">
        <p
          className="text-[11px] font-semibold tracking-[0.28em]"
          style={{ color: GOLD }}
        >
          SETTINGS
        </p>
        <h1
          className="mt-3 text-[1.85rem] font-semibold tracking-[-0.05em] sm:text-4xl"
          style={{ color: NAVY }}
        >
          設定
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-7 text-slate-600">
          プロフィール・通知・セキュリティを管理します。
        </p>
      </header>

      <div className="space-y-6">
        <SectionCard id="profile" eyebrow="PROFILE" title="プロフィール">
          {loading ? (
            <p className="text-sm text-slate-400">読み込み中…</p>
          ) : (
            <form onSubmit={onSaveProfile} className="space-y-4">
              <label className="block text-[13px] font-semibold text-slate-600">
                表示名
                <input
                  className={inputClass}
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="表示名"
                />
              </label>
              <label className="block text-[13px] font-semibold text-slate-600">
                メール
                <input
                  className={inputClass}
                  value={isDemoMode ? "demo@swij.local" : email ?? ""}
                  disabled
                />
              </label>
              <p className="text-[13px] text-slate-500">
                ロール: {OS_ROLE_LABELS[role]}
              </p>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold text-white"
                style={{ backgroundColor: NAVY }}
              >
                保存
              </button>
            </form>
          )}
        </SectionCard>

        <SectionCard
          id="notifications"
          eyebrow="NOTIFICATIONS"
          title="通知"
        >
          <form onSubmit={onSaveNotifications} className="space-y-3">
            {[
              {
                id: "homework",
                label: "宿題期限",
                checked: notifyHomework,
                set: setNotifyHomework,
              },
              {
                id: "analysis",
                label: "分析予定",
                checked: notifyAnalysis,
                set: setNotifyAnalysis,
              },
              {
                id: "renewal",
                label: "認定更新",
                checked: notifyRenewal,
                set: setNotifyRenewal,
              },
              {
                id: "event",
                label: "イベント",
                checked: notifyEvent,
                set: setNotifyEvent,
              },
              {
                id: "message",
                label: "メッセージ",
                checked: notifyMessage,
                set: setNotifyMessage,
              },
            ].map((item) => (
              <label
                key={item.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-[#fafaf8] px-4 py-3.5"
              >
                <span className="text-[14px] font-medium" style={{ color: NAVY }}>
                  {item.label}
                </span>
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(event) => item.set(event.target.checked)}
                  className="h-4 w-4 accent-[#071426]"
                />
              </label>
            ))}
            <button
              type="submit"
              className="mt-2 inline-flex min-h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold text-white"
              style={{ backgroundColor: NAVY }}
            >
              通知設定を保存
            </button>
          </form>
        </SectionCard>

        <SectionCard eyebrow="SECURITY" title="セキュリティ">
          <div className="space-y-4">
            <div>
              <p className="text-[14px] font-semibold" style={{ color: NAVY }}>
                パスワード
              </p>
              <p className="mt-1 text-[13px] leading-6 text-slate-500">
                ログイン画面の「パスワードを忘れた方」から再設定できます。
              </p>
              <Link
                href="/login"
                className="mt-3 inline-flex text-[13px] font-semibold"
                style={{ color: NAVY }}
              >
                ログイン画面へ →
              </Link>
            </div>
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4">
              <p className="text-[14px] font-semibold" style={{ color: NAVY }}>
                2段階認証
              </p>
              <p className="mt-1 text-[13px] text-slate-500">
                将来対応予定（Version 3.x）
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard eyebrow="LANGUAGE" title="言語設定">
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4">
            <p className="text-[14px] font-semibold" style={{ color: NAVY }}>
              日本語（固定）
            </p>
            <p className="mt-1 text-[13px] text-slate-500">
              多言語対応は将来実装予定です。
            </p>
          </div>
        </SectionCard>
      </div>
    </OsShell>
  );
}
