"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import ClientNav from "@/components/ClientNav";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { SoftSkeleton } from "@/components/ui/Skeleton";
import { CARD_CLASS, FOCUS_RING, GOLD, NAVY } from "@/components/ui/tokens";
import { useAuth } from "@/lib/auth/use-auth";
import { CLIENT_PORTAL_ROUTES } from "@/lib/client-portal/constants";
import {
  getMyClientMypage,
  type ClientMypageData,
} from "@/lib/repositories/client-mypage-repository";
import {
  listClientHomeworks,
  type ClientHomework,
} from "@/lib/repositories/client-homeworks-repository";

export type ClientPortalBundle = {
  data: ClientMypageData;
  homeworks: ClientHomework[];
};

const SUB_LINKS: { href: string; label: string }[] = [
  { href: CLIENT_PORTAL_ROUTES.home, label: "Home" },
  { href: CLIENT_PORTAL_ROUTES.morning, label: "翌朝" },
  { href: CLIENT_PORTAL_ROUTES.sleep, label: "Sleep" },
  { href: CLIENT_PORTAL_ROUTES.advice, label: "Advice" },
  { href: CLIENT_PORTAL_ROUTES.homework, label: "Homework" },
  { href: CLIENT_PORTAL_ROUTES.journey, label: "Journey" },
  { href: CLIENT_PORTAL_ROUTES.coach, label: "Coach" },
  { href: CLIENT_PORTAL_ROUTES.reports, label: "Report" },
  { href: CLIENT_PORTAL_ROUTES.chat, label: "Chat" },
  { href: CLIENT_PORTAL_ROUTES.goals, label: "Goals" },
];

function SubNav() {
  const pathname = usePathname();
  return (
    <nav
      className="sw-h-scroll -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1"
      aria-label="Client Portal"
    >
      {SUB_LINKS.map((item) => {
        const active =
          item.href === "/client"
            ? pathname === "/client"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`sw-nav-link inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-3.5 text-[12px] font-semibold tracking-[0.02em] transition duration-200 ${FOCUS_RING}`}
            style={
              active
                ? { backgroundColor: NAVY, color: "#fff" }
                : {
                    backgroundColor: "rgba(7,20,38,0.04)",
                    color: NAVY,
                  }
            }
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function useClientPortalBundle(): {
  loading: boolean;
  needsLogin: boolean;
  error: string | null;
  bundle: ClientPortalBundle | null;
  reload: () => void;
} {
  const { loading: authLoading, isAuthenticated, isDemoMode, supabaseEnabled } =
    useAuth();
  const [bundle, setBundle] = useState<ClientPortalBundle | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const next = await getMyClientMypage();
      if (!next) {
        setBundle(null);
        return;
      }
      const hw = await listClientHomeworks(next.client.id).catch(() => []);
      setBundle({ data: next, homeworks: hw });
    } catch (err) {
      console.error("[client portal]", err);
      setError(
        err instanceof Error
          ? err.message
          : "Client Portal の読み込みに失敗しました。",
      );
      setBundle(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (supabaseEnabled && !isAuthenticated && !isDemoMode) {
      setReady(true);
      return;
    }
    setReady(false);
    void refresh();

    const onUpdate = () => {
      void refresh();
    };
    window.addEventListener("storage", onUpdate);
    window.addEventListener("swij-clients-updated", onUpdate);
    return () => {
      window.removeEventListener("storage", onUpdate);
      window.removeEventListener("swij-clients-updated", onUpdate);
    };
  }, [
    authLoading,
    isAuthenticated,
    isDemoMode,
    supabaseEnabled,
    refresh,
    reloadKey,
  ]);

  return {
    loading: authLoading || !ready,
    needsLogin: Boolean(supabaseEnabled && !isAuthenticated && !isDemoMode),
    error,
    bundle,
    reload: () => {
      setReady(false);
      setReloadKey((k) => k + 1);
    },
  };
}

export default function ClientPortalShell({
  eyebrow,
  title,
  children,
  trailing,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[color:var(--sw-surface)]">
      <ClientNav eyebrow={eyebrow} />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-3xl space-y-5 px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:space-y-6 sm:px-6 sm:py-10 md:px-8 md:py-12"
      >
        <div className="px-1">
          <p
            className="text-[10px] font-semibold tracking-[0.22em] sm:text-[11px] sm:tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            SLEEP WELLNESS OS · CLIENT PORTAL
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <h1
              className="text-[1.55rem] font-semibold tracking-[-0.04em] sm:text-[1.65rem] md:text-3xl"
              style={{ color: NAVY }}
            >
              {title}
            </h1>
            {trailing}
          </div>
        </div>
        <SubNav />
        {children}
      </main>
    </div>
  );
}

export function ClientPortalLoading() {
  return (
    <div className="min-h-screen bg-[color:var(--sw-surface)]">
      <ClientNav />
      <SoftSkeleton variant="page" />
    </div>
  );
}

export function ClientPortalLoginGate() {
  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center bg-[color:var(--sw-surface)] px-4 sm:px-5"
    >
      <div className={`${CARD_CLASS} w-full max-w-md p-8 text-center sm:p-10`}>
        <p
          className="text-[11px] font-semibold tracking-[0.28em]"
          style={{ color: GOLD }}
        >
          CLIENT PORTAL
        </p>
        <h1
          className="mt-4 text-2xl font-semibold tracking-[-0.04em]"
          style={{ color: NAVY }}
        >
          ログインが必要です
        </h1>
        <p className="mt-3 text-[14px] leading-7 text-[color:var(--sw-muted)]">
          クライアント専用画面は、ご本人のアカウントでのみご覧いただけます。
        </p>
        <Button href="/login?redirect=/client" size="lg" className="mt-8 w-full sm:w-auto">
          ログイン
        </Button>
      </div>
    </main>
  );
}

export function ClientPortalError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="min-h-screen bg-[color:var(--sw-surface)]">
      <ClientNav />
      <main
        id="main-content"
        className="mx-auto max-w-md px-4 py-16 sm:px-5"
      >
        <ErrorState message={message} onRetry={onRetry} />
      </main>
    </div>
  );
}

export function ClientPortalUnlinked() {
  return (
    <div className="min-h-screen bg-[color:var(--sw-surface)]">
      <ClientNav />
      <main
        id="main-content"
        className="mx-auto max-w-md px-4 py-16 sm:px-5"
      >
        <EmptyState
          illustration="generic"
          eyebrow="WAITING"
          title="まだ連携されていません"
          description="担当の認定講師が、あなたのメールアドレスで Client Portal 連携を設定すると、分析結果や宿題が表示されます。"
        />
      </main>
    </div>
  );
}
