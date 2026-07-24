"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { GOLD, NAVY } from "@/components/ui/tokens";
import {
  persistBetaAgreementAccepted,
  resolveBetaAgreementAccepted,
} from "@/lib/first-visit";

const CHECKPOINTS = [
  {
    title: "β版であること",
    body: "本サービスは Closed Beta です。機能・表示・データは改善のため変更される場合があります。",
  },
  {
    title: "データ改善への協力",
    body: "利用状況やフィードバックは、製品品質の向上と認定講師支援のために活用されます。",
  },
  {
    title: "バグ報告",
    body: "不具合を発見した際は、右下のフィードバックからご報告ください。再現手順があると対応が早くなります。",
  },
  {
    title: "守秘義務",
    body: "クライアント情報・分析結果・社内資料を、許可なく外部へ開示・転載しないことに同意します。",
  },
] as const;

type Props = {
  enabled?: boolean;
  onAccepted?: () => void;
};

/**
 * Version 2.7 Module3 — 利用開始前の Beta Agreement
 * オンボーディングより先に表示し、同意まで主要操作をブロックする。
 * 同意は初回ログイン時のみ（profiles.beta_terms_accepted_at + localStorage）。
 */
export default function BetaAgreementGate({
  enabled = true,
  onAccepted,
}: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState<Record<number, boolean>>({
    0: false,
    1: false,
    2: false,
    3: false,
  });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void (async () => {
      const accepted = await resolveBetaAgreementAccepted();
      if (!cancelled && !accepted) setOpen(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  if (!open) return null;

  const allChecked = CHECKPOINTS.every((_, i) => checked[i]);

  const accept = async () => {
    if (!allChecked || busy) return;
    setBusy(true);
    try {
      await persistBetaAgreementAccepted();
      setOpen(false);
      onAccepted?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center overflow-x-hidden bg-[#071426]/55 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-16 backdrop-blur-[3px] sm:items-center sm:pb-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="beta-agreement-title"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-[28px] border border-[#8a6a2d]/25 bg-white shadow-[0_30px_80px_-40px_rgba(7,20,38,0.55)] animate-fade-up">
        <div className="relative px-5 pb-6 pt-7 sm:px-8 sm:pt-8">
          <p
            className="text-[10px] font-semibold tracking-[0.22em]"
            style={{ color: GOLD }}
          >
            BETA AGREEMENT
          </p>
          <h2
            id="beta-agreement-title"
            className="mt-3 text-[1.35rem] font-semibold tracking-[-0.04em] sm:text-[1.5rem]"
            style={{ color: NAVY }}
          >
            利用開始前の確認事項
          </h2>
          <p className="mt-2 text-[14px] leading-7 text-slate-600">
            Closed Beta を安心して使うために、以下にご同意ください。初回ログイン時のみ表示されます。
          </p>

          <ul className="mt-6 space-y-3">
            {CHECKPOINTS.map((item, index) => (
              <li key={item.title}>
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3.5">
                  <input
                    type="checkbox"
                    checked={Boolean(checked[index])}
                    onChange={(e) =>
                      setChecked((prev) => ({
                        ...prev,
                        [index]: e.target.checked,
                      }))
                    }
                    className="mt-1 size-4 shrink-0 rounded border-slate-300"
                  />
                  <span>
                    <span
                      className="block text-[14px] font-semibold"
                      style={{ color: NAVY }}
                    >
                      {item.title}
                    </span>
                    <span className="mt-1 block text-[13px] leading-6 text-slate-500">
                      {item.body}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <div className="mt-7">
            <Button
              className="w-full"
              disabled={!allChecked || busy}
              onClick={() => void accept()}
            >
              同意して利用を開始
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
