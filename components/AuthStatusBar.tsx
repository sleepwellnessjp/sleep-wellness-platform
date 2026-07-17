"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/use-auth";

const NAVY = "#071426";
const GOLD = "#8a6a2d";

export default function AuthStatusBar() {
  const router = useRouter();
  const { loading, supabaseEnabled, isAuthenticated, isDemoMode, email, signOut } =
    useAuth();

  if (loading) return null;

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="mb-6 rounded-2xl border border-slate-200/90 bg-white px-4 py-3.5 shadow-[0_12px_40px_-32px_rgba(15,23,42,0.18)] sm:flex sm:items-center sm:justify-between sm:px-5">
      {supabaseEnabled && isAuthenticated ? (
        <>
          <div className="min-w-0">
            <p
              className="text-[10px] font-semibold tracking-[0.18em]"
              style={{ color: GOLD }}
            >
              LOGGED IN
            </p>
            <p className="mt-1 truncate text-sm font-medium" style={{ color: NAVY }}>
              {email}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 px-5 py-2 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50 sm:mt-0"
          >
            ログアウト
          </button>
        </>
      ) : isDemoMode ? (
        <>
          <div>
            <p
              className="text-[10px] font-semibold tracking-[0.18em]"
              style={{ color: GOLD }}
            >
              DEMO MODE
            </p>
            <p className="mt-1 text-sm font-medium" style={{ color: NAVY }}>
              デモモード
            </p>
            <p className="mt-0.5 text-[12px] text-slate-500">
              データはこのブラウザ内に保存されています
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 px-5 py-2 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50 sm:mt-0"
          >
            ログアウト
          </button>
        </>
      ) : null}
    </div>
  );
}
