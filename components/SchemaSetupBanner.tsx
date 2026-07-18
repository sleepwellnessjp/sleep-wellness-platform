"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { checkSupabaseHealth } from "@/lib/supabase/health";

export default function SchemaSetupBanner() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    checkSupabaseHealth()
      .then((health) => {
        if (cancelled) return;
        if (!health.configured) return;
        if (health.clientsTableReady) {
          setMessage(null);
          return;
        }
        console.error("[SchemaSetupBanner] health:", health);
        setMessage(
          health.errorMessage ??
            "Supabase の clients テーブルが未作成です。",
        );
      })
      .catch((error) => {
        console.error("[SchemaSetupBanner] check failed:", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!message) return null;

  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-left text-[14px] leading-6 text-amber-950 sm:px-5">
      <p className="font-semibold tracking-wide text-amber-900">
        データベース未初期化
      </p>
      <p className="mt-1">{message}</p>
      <p className="mt-2 text-[13px] text-amber-800">
        ログインは成功していますが、テーブルがないためクライアント登録できません。
      </p>
      <Link
        href="/setup"
        className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full bg-amber-900 px-5 text-sm font-semibold text-white transition hover:bg-amber-800"
      >
        初期設定へ（schema.sql）
      </Link>
    </div>
  );
}
