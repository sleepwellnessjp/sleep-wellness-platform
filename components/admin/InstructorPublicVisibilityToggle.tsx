"use client";

import { useCallback, useEffect, useState } from "react";
import { GOLD, NAVY } from "@/components/ui/tokens";

type Props = {
  instructorId: string;
};

type SaveFlash = "idle" | "saving" | "success" | "error";

export default function InstructorPublicVisibilityToggle({
  instructorId,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [isPublic, setIsPublic] = useState(false);
  const [saveState, setSaveState] = useState<SaveFlash>("idle");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSaveState("idle");
    try {
      const response = await fetch(
        `/api/admin/certified-instructors/${encodeURIComponent(instructorId)}/visibility`,
        { cache: "no-store" },
      );
      const json = (await response.json()) as {
        isPublic?: boolean;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(json.error ?? "公開設定を取得できません");
      }
      setIsPublic(Boolean(json.isPublic));
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [instructorId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onToggle = async () => {
    if (loading || saveState === "saving") return;
    const next = !isPublic;
    setSaveState("saving");
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/certified-instructors/${encodeURIComponent(instructorId)}/visibility`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPublic: next }),
        },
      );
      const json = (await response.json()) as {
        isPublic?: boolean;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(json.error ?? "公開設定の保存に失敗しました");
      }
      setIsPublic(Boolean(json.isPublic));
      setSaveState("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
      setSaveState("error");
    }
  };

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-[#faf9f7] p-4 sm:p-5"
      aria-labelledby="admin-instructor-visibility-title"
    >
      <h3
        id="admin-instructor-visibility-title"
        className="text-[13px] font-semibold tracking-[-0.02em]"
        style={{ color: NAVY }}
      >
        公開設定
      </h3>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        公開にすると、認定講師紹介ページ（/instructors）に表示されます。
      </p>

      {loading ? (
        <p className="mt-4 text-[13px] text-slate-500">読み込み中…</p>
      ) : (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={isPublic}
              aria-label="講師プロフィールを公開する"
              disabled={saveState === "saving"}
              onClick={() => void onToggle()}
              className="relative h-8 w-14 shrink-0 rounded-full transition disabled:opacity-60"
              style={{
                backgroundColor: isPublic ? NAVY : "#cbd5e1",
              }}
            >
              <span
                className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
                  isPublic ? "left-7" : "left-1"
                }`}
              />
            </button>
            <div>
              <p
                className="text-sm font-semibold"
                style={{ color: isPublic ? NAVY : "#64748b" }}
              >
                {isPublic ? "公開中" : "非公開"}
              </p>
              <p className="text-xs text-slate-500">
                {saveState === "saving"
                  ? "保存中…"
                  : saveState === "success"
                    ? isPublic
                      ? "公開にしました"
                      : "非公開にしました"
                    : "タップで切り替え・即時保存"}
              </p>
            </div>
          </div>
          {isPublic ? (
            <a
              href={`/instructors/${encodeURIComponent(instructorId)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] font-semibold hover:opacity-80"
              style={{ color: GOLD }}
            >
              公開ページを開く
            </a>
          ) : null}
        </div>
      )}

      {error || saveState === "error" ? (
        <p className="mt-3 text-[13px] font-medium text-[#a33a3a]" role="alert">
          {error ?? "保存に失敗しました"}
        </p>
      ) : null}
      {saveState === "success" && !error ? (
        <p className="mt-3 text-[13px] font-medium text-[#315f68]" role="status">
          保存しました
        </p>
      ) : null}
    </section>
  );
}
