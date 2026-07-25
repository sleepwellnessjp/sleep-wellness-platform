"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import OsShell from "@/components/os/OsShell";
import SectionCard from "@/components/ui/SectionCard";
import { useToast } from "@/components/ui/Toast";
import { GOLD, NAVY } from "@/components/ui/tokens";
import { useAuth } from "@/lib/auth/use-auth";
import { createBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { usePlatformMe } from "@/lib/platform/use-platform-me";
import { normalizeOsRole, OS_ROLE_LABELS, type OsRole } from "@/lib/os/roles";

const inputClass =
  "mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[16px] text-[#071426] outline-none transition focus:border-[#315f68] focus:ring-4 focus:ring-[#315f68]/10 sm:min-h-0 sm:text-[15px]";

const NOTIFY_PREFS_KEY = "swij-notify-prefs";

type NotifyPrefs = {
  homework: boolean;
  analysis: boolean;
  renewal: boolean;
  event: boolean;
  message: boolean;
};

function loadNotifyPrefs(): NotifyPrefs {
  if (typeof window === "undefined") {
    return {
      homework: true,
      analysis: true,
      renewal: true,
      event: true,
      message: true,
    };
  }
  try {
    const raw = window.localStorage.getItem(NOTIFY_PREFS_KEY);
    if (!raw) {
      return {
        homework: true,
        analysis: true,
        renewal: true,
        event: true,
        message: true,
      };
    }
    const parsed = JSON.parse(raw) as Partial<NotifyPrefs>;
    return {
      homework: parsed.homework !== false,
      analysis: parsed.analysis !== false,
      renewal: parsed.renewal !== false,
      event: parsed.event !== false,
      message: parsed.message !== false,
    };
  } catch {
    return {
      homework: true,
      analysis: true,
      renewal: true,
      event: true,
      message: true,
    };
  }
}

export default function SettingsPage() {
  const { toast } = useToast();
  const { email, isDemoMode, signOut } = useAuth();
  const { data, loading } = usePlatformMe();
  const role: OsRole = normalizeOsRole(data?.profile.role ?? "instructor");

  const [displayName, setDisplayName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [notifyHomework, setNotifyHomework] = useState(true);
  const [notifyAnalysis, setNotifyAnalysis] = useState(true);
  const [notifyRenewal, setNotifyRenewal] = useState(true);
  const [notifyEvent, setNotifyEvent] = useState(true);
  const [notifyMessage, setNotifyMessage] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (data?.profile.displayName) {
      setDisplayName(data.profile.displayName);
    }
  }, [data?.profile.displayName]);

  useEffect(() => {
    const prefs = loadNotifyPrefs();
    setNotifyHomework(prefs.homework);
    setNotifyAnalysis(prefs.analysis);
    setNotifyRenewal(prefs.renewal);
    setNotifyEvent(prefs.event);
    setNotifyMessage(prefs.message);
  }, []);

  const onSaveProfile = async (event: FormEvent) => {
    event.preventDefault();
    const nextName = displayName.trim();
    if (!nextName) {
      toast("表示名を入力してください", "error");
      return;
    }

    if (!isSupabaseConfigured() || isDemoMode) {
      toast("デモモードではプロフィールはブラウザにのみ保持されます", "info");
      return;
    }

    setSavingProfile(true);
    try {
      const supabase = createBrowserClient();
      if (!supabase) throw new Error("Supabase の設定を確認してください。");
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("ログインが必要です。");

      const { error } = await supabase
        .from("profiles")
        .update({ display_name: nextName })
        .eq("id", user.id);
      if (error) throw error;

      await supabase.auth.updateUser({
        data: { display_name: nextName },
      });

      toast("プロフィールを保存しました", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "プロフィールの保存に失敗しました",
        "error",
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const onSaveNotifications = (event: FormEvent) => {
    event.preventDefault();
    const prefs: NotifyPrefs = {
      homework: notifyHomework,
      analysis: notifyAnalysis,
      renewal: notifyRenewal,
      event: notifyEvent,
      message: notifyMessage,
    };
    window.localStorage.setItem(NOTIFY_PREFS_KEY, JSON.stringify(prefs));
    toast("通知設定を保存しました", "success");
  };

  const onUpdatePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 8) {
      toast("パスワードは8文字以上で入力してください", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast("確認用パスワードが一致しません", "error");
      return;
    }
    if (!isSupabaseConfigured() || isDemoMode) {
      toast("デモモードではパスワード変更はできません", "error");
      return;
    }

    setSavingPassword(true);
    try {
      const supabase = createBrowserClient();
      if (!supabase) throw new Error("Supabase の設定を確認してください。");
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      toast("パスワードを更新しました", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "パスワードの更新に失敗しました",
        "error",
      );
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <OsShell
      role={role}
      contentClassName="mx-auto max-w-3xl px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-10 md:px-8 md:py-12 lg:py-14"
    >
      <header className="mb-8 sm:mb-10">
        <p
          className="text-[11px] font-semibold tracking-[0.28em]"
          style={{ color: GOLD }}
        >
          SETTINGS
        </p>
        <h1
          className="mt-3 break-words text-[1.65rem] font-semibold tracking-[-0.05em] sm:text-4xl"
          style={{ color: NAVY }}
        >
          設定
        </h1>
        <p className="mt-3 max-w-xl text-[14px] leading-7 text-slate-600 sm:text-[15px]">
          プロフィール・通知・セキュリティを管理します。
        </p>
      </header>

      <div className="w-full space-y-5 sm:space-y-6">
        <SectionCard id="profile" eyebrow="PROFILE" title="プロフィール">
          {loading ? (
            <p className="text-sm text-slate-400">読み込み中…</p>
          ) : (
            <form onSubmit={onSaveProfile} className="grid grid-cols-1 gap-4">
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
                  value={isDemoMode ? "demo@swij.local" : (email ?? "")}
                  disabled
                />
              </label>
              <p className="text-[13px] text-slate-500">
                ロール: {OS_ROLE_LABELS[role]}
              </p>
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-5 text-[14px] font-semibold text-white transition active:opacity-90 disabled:opacity-50 sm:min-h-11 sm:w-auto sm:hover:opacity-90 sm:active:opacity-100"
                style={{ backgroundColor: NAVY }}
              >
                {savingProfile ? "保存中…" : "保存"}
              </button>
            </form>
          )}
        </SectionCard>

        <SectionCard id="notifications" eyebrow="NOTIFICATIONS" title="通知">
          <form
            onSubmit={onSaveNotifications}
            className="grid grid-cols-1 gap-3"
          >
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
                className="flex min-h-12 items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-[#fafaf8] px-4 py-3.5"
              >
                <span
                  className="min-w-0 break-words text-[14px] font-medium"
                  style={{ color: NAVY }}
                >
                  {item.label}
                </span>
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(event) => item.set(event.target.checked)}
                  className="h-5 w-5 shrink-0 accent-[#071426]"
                />
              </label>
            ))}
            <button
              type="submit"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-5 text-[14px] font-semibold text-white transition active:opacity-90 sm:min-h-11 sm:w-auto sm:hover:opacity-90 sm:active:opacity-100"
              style={{ backgroundColor: NAVY }}
            >
              保存
            </button>
          </form>
        </SectionCard>

        <SectionCard id="security" eyebrow="SECURITY" title="セキュリティ">
          <form onSubmit={onUpdatePassword} className="grid grid-cols-1 gap-4">
            <label className="block text-[13px] font-semibold text-slate-600">
              新しいパスワード
              <input
                type="password"
                className={inputClass}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                placeholder="8文字以上"
              />
            </label>
            <label className="block text-[13px] font-semibold text-slate-600">
              パスワード確認
              <input
                type="password"
                className={inputClass}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                placeholder="もう一度入力"
              />
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={savingPassword}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-5 text-[14px] font-semibold text-white transition active:opacity-90 disabled:opacity-50 sm:min-h-11 sm:w-auto"
                style={{ backgroundColor: NAVY }}
              >
                {savingPassword ? "更新中…" : "パスワードを更新"}
              </button>
              <button
                type="button"
                onClick={() => void signOut()}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-[14px] font-semibold transition hover:bg-slate-50 sm:min-h-11 sm:w-auto"
                style={{ color: NAVY }}
              >
                ログアウト
              </button>
            </div>
            <p className="text-[12px] leading-6 text-slate-400">
              二要素認証は今後のリリースで追加予定です。
            </p>
          </form>
        </SectionCard>

        <div className="pt-2">
          <Link
            href="/dashboard"
            className="text-[13px] font-medium text-slate-500 underline-offset-2 hover:underline"
          >
            Dashboard へ戻る
          </Link>
        </div>
      </div>
    </OsShell>
  );
}
