"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { GOLD, NAVY, SUCCESS } from "@/components/ui/tokens";
import type { InvitationRecord } from "@/lib/invitations/types";

type BetaInvitePreview = {
  code: string;
  instructorName: string;
  startDate: string;
  status: string;
  termsRequired: boolean;
};

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const codeFromPath =
    typeof params.code === "string" ? decodeURIComponent(params.code) : "";
  const isBetaCode = codeFromPath.toUpperCase().startsWith("BETA-");

  const [code, setCode] = useState(codeFromPath);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationRecord | null>(null);
  const [betaPreview, setBetaPreview] = useState<BetaInvitePreview | null>(
    null,
  );
  const [betaAccepted, setBetaAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    if (!isBetaCode || !codeFromPath) return;
    let cancelled = false;
    void fetch(
      `/api/beta-invitations?code=${encodeURIComponent(codeFromPath)}`,
      { cache: "no-store" },
    )
      .then(async (response) => {
        const json = (await response.json()) as {
          invitation?: BetaInvitePreview;
          error?: string;
        };
        if (!response.ok || !json.invitation) return;
        if (!cancelled) setBetaPreview(json.invitation);
      })
      .catch(() => {
        /* keep null */
      });
    return () => {
      cancelled = true;
    };
  }, [codeFromPath, isBetaCode]);

  const acceptClient = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept", code }),
      });
      const json = (await response.json()) as {
        ok?: boolean;
        invitation?: InvitationRecord | null;
        error?: string;
      };
      if (!response.ok || !json.ok) {
        throw new Error(json.error ?? "招待の受諾に失敗しました");
      }
      setInvitation(json.invitation ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "受諾に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const acceptBeta = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/beta-invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, termsAccepted }),
      });
      const json = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };
      if (!response.ok || !json.ok) {
        throw new Error(json.error ?? "招待の受諾に失敗しました");
      }
      setBetaAccepted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "受諾に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  if (isBetaCode || betaPreview) {
    return (
      <main className="flex min-h-screen items-center justify-center overflow-x-hidden bg-[#f7f7f5] px-4 py-16 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-20">
        <div className="w-full max-w-md rounded-[28px] border border-slate-200/90 bg-white px-5 py-10 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.22)] sm:px-8 sm:py-12">
          <p
            className="text-[10px] font-semibold tracking-[0.22em]"
            style={{ color: GOLD }}
          >
            CLOSED BETA INVITE
          </p>
          <h1
            className="mt-3 text-[1.55rem] font-semibold tracking-[-0.04em]"
            style={{ color: NAVY }}
          >
            認定講師招待
          </h1>
          <p className="mt-3 text-[14px] leading-7 text-slate-500">
            Sleep Wellness Platform Closed Beta への参加招待です。利用開始日と利用規約を確認のうえ受諾してください。
          </p>

          {betaAccepted ? (
            <div className="mt-8">
              <p className="text-[14px] font-semibold" style={{ color: SUCCESS }}>
                招待を受諾しました
              </p>
              <p className="mt-2 text-[13px] text-slate-500">
                {betaPreview?.instructorName ?? "認定講師"} 様 — コード {code}
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <Button href="/login?redirect=/dashboard">
                  ログインして始める
                </Button>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => router.push("/dashboard")}
                >
                  講師ホームへ
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={acceptBeta} className="mt-8 space-y-4">
              <label className="block">
                <span className="text-[12px] font-semibold text-slate-500">
                  招待コード
                </span>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  required
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-[#fafaf8] px-3.5 py-3 text-[16px] tracking-wide outline-none focus:border-[#315f68]/40"
                  placeholder="BETA-XXXX-XXXX"
                />
              </label>
              {betaPreview ? (
                <div className="rounded-2xl border border-slate-100 bg-[#fafaf8] px-4 py-3 text-[13px] text-slate-600">
                  <p>講師名: {betaPreview.instructorName}</p>
                  <p className="mt-1">利用開始日: {betaPreview.startDate}</p>
                </div>
              ) : null}
              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 size-4 rounded border-slate-300"
                  required={betaPreview?.termsRequired !== false}
                />
                <span className="text-[13px] leading-6 text-slate-600">
                  Closed Beta 利用規約・守秘義務・フィードバック協力に同意します
                </span>
              </label>
              {error ? (
                <p className="text-[13px] text-red-600">{error}</p>
              ) : null}
              <Button type="submit" disabled={busy} className="w-full">
                招待を受諾する
              </Button>
              <p className="text-center text-[12px] text-slate-400">
                <Link
                  href="/login"
                  className="underline-offset-2 hover:underline"
                >
                  ログイン画面へ
                </Link>
              </p>
            </form>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center overflow-x-hidden bg-[#f7f7f5] px-4 py-16 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-20">
      <div className="w-full max-w-md rounded-[28px] border border-slate-200/90 bg-white px-5 py-10 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.22)] sm:px-8 sm:py-12">
        <p
          className="text-[10px] font-semibold tracking-[0.22em]"
          style={{ color: GOLD }}
        >
          CLIENT INVITE
        </p>
        <h1
          className="mt-3 text-[1.55rem] font-semibold tracking-[-0.04em]"
          style={{ color: NAVY }}
        >
          クライアント招待
        </h1>
        <p className="mt-3 text-[14px] leading-7 text-slate-500">
          認定講師から受け取った招待コードでポータル連携を開始します。
        </p>

        {invitation ? (
          <div className="mt-8">
            <p className="text-[14px] font-semibold" style={{ color: SUCCESS }}>
              招待を受諾しました
            </p>
            <p className="mt-2 text-[13px] text-slate-500">
              {invitation.clientName} 様 — コード {invitation.code}
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Button href="/login?redirect=/client">ログインして続ける</Button>
              <Button
                variant="secondary"
                type="button"
                onClick={() => router.push("/client")}
              >
                クライアントホームへ
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={acceptClient} className="mt-8 space-y-4">
            <label className="block">
              <span className="text-[12px] font-semibold text-slate-500">
                招待コード
              </span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-[#fafaf8] px-3.5 py-3 text-[16px] tracking-wide outline-none focus:border-[#315f68]/40"
                placeholder="SWIJ-XXXX-XXXX"
              />
            </label>
            {error ? (
              <p className="text-[13px] text-red-600">{error}</p>
            ) : null}
            <Button type="submit" disabled={busy} className="w-full">
              招待を受諾する
            </Button>
            <p className="text-center text-[12px] text-slate-400">
              <Link href="/login" className="underline-offset-2 hover:underline">
                ログイン画面へ
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
