"use client";

import { useCallback, useEffect, useState } from "react";
import ClosedBetaOperationDashboard, {
  ClosedBetaOperationDashboardLoading,
} from "@/components/admin/ClosedBetaOperationDashboard";
import ClosedBetaOpsDashboard, {
  ClosedBetaOpsDashboardLoading,
} from "@/components/admin/ClosedBetaOpsDashboard";
import AdminShell from "@/components/AdminShell";
import SectionCard from "@/components/ui/SectionCard";
import { GOLD, NAVY } from "@/components/ui/tokens";
import {
  CLOSED_BETA_OPERATION_PHASE_LABEL,
  type ClosedBetaOperationBundle,
  type ClosedBetaOpsBundle,
} from "@/lib/closed-beta";
import { SWIJ_EYEBROW_HQ } from "@/lib/brand/swij-brand";

export default function AdminClosedBetaPage() {
  const [operation, setOperation] = useState<ClosedBetaOperationBundle | null>(
    null,
  );
  const [legacy, setLegacy] = useState<ClosedBetaOpsBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [showLegacy, setShowLegacy] = useState(false);

  const loadOperation = useCallback(async () => {
    const response = await fetch("/api/admin/closed-beta-operation", {
      cache: "no-store",
    });
    const json = (await response.json()) as {
      bundle?: ClosedBetaOperationBundle;
      error?: string;
    };
    if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
    setOperation(json.bundle ?? null);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      await loadOperation();
      const response = await fetch("/api/admin/closed-beta", {
        cache: "no-store",
      });
      const json = (await response.json()) as {
        bundle?: ClosedBetaOpsBundle;
        error?: string;
      };
      if (response.ok) setLegacy(json.bundle ?? null);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "取得に失敗しました",
      );
      setOperation(null);
    } finally {
      setLoading(false);
    }
  }, [loadOperation]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminShell
      eyebrow={`${SWIJ_EYEBROW_HQ} · CLOSED BETA OPERATION`}
      title="Closed Beta 運営"
      description="SWIJ本部がベータ版の状況を把握し、改善サイクル（PDCA）を回すための運営コンソールです。"
    >
      <div
        className="mb-8 rounded-[1.75rem] border border-[#071426]/08 px-5 py-5 sm:px-6"
        style={{
          background:
            "linear-gradient(135deg, rgba(7,20,38,0.03) 0%, rgba(138,106,45,0.08) 100%)",
        }}
      >
        <p
          className="text-[10px] font-semibold tracking-[0.24em]"
          style={{ color: GOLD }}
        >
          SLEEP WELLNESS INSTITUTE JAPAN
        </p>
        <p className="mt-2 text-[15px] font-semibold tracking-[-0.02em] text-[#071426]">
          {CLOSED_BETA_OPERATION_PHASE_LABEL}
        </p>
        <p className="mt-1 text-[13px] text-slate-500">
          Version {operation?.appVersion ?? "1.0.0"} · 本部専用 · 運営準備率{" "}
          {operation ? `${operation.readinessPercent}%` : "—"}
        </p>
      </div>

      {message ? (
        <SectionCard title="読み込みエラー">
          <p className="text-sm text-[#a33a3a]" role="alert">
            {message}
          </p>
        </SectionCard>
      ) : null}

      {loading ? (
        <ClosedBetaOperationDashboardLoading />
      ) : operation ? (
        <ClosedBetaOperationDashboard
          data={operation}
          onRefresh={loadOperation}
        />
      ) : null}

      <div className="mt-10 border-t border-slate-100 pt-8">
        <button
          type="button"
          onClick={() => setShowLegacy((prev) => !prev)}
          className="text-[13px] font-semibold"
          style={{ color: NAVY }}
        >
          {showLegacy
            ? "健全性・リリース・利用状況を閉じる"
            : "健全性・リリース・利用状況を表示"}
        </button>
        {showLegacy ? (
          <div className="mt-6">
            {legacy ? (
              <ClosedBetaOpsDashboard data={legacy} />
            ) : (
              <ClosedBetaOpsDashboardLoading />
            )}
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}
