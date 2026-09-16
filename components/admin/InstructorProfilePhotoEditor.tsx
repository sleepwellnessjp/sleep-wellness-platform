"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { INSTRUCTOR_PHOTO_ACCOUNT_UNLINKED_ERROR } from "@/lib/instructors/profile-photo-storage";
import { prepareProfileImage } from "@/lib/instructors/profile-image";
import { GOLD, NAVY } from "@/components/ui/tokens";

type Props = {
  instructorId: string;
  /** 一覧の userId（空なら未連携として即表示） */
  listUserId: string;
  activityName: string;
};

export default function InstructorProfilePhotoEditor({
  instructorId,
  listUserId,
  activityName,
}: Props) {
  const linkedFromList = Boolean(listUserId.trim());
  const [loading, setLoading] = useState(linkedFromList);
  const [uploading, setUploading] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [accountLinked, setAccountLinked] = useState(linkedFromList);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!listUserId.trim()) {
      setAccountLinked(false);
      setProfileImageUrl(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/certified-instructors/${encodeURIComponent(instructorId)}/photo`,
        { cache: "no-store" },
      );
      const json = (await response.json()) as {
        profileImageUrl?: string | null;
        accountLinked?: boolean;
        userId?: string | null;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(json.error ?? "写真情報を取得できません");
      }
      setAccountLinked(Boolean(json.accountLinked ?? json.userId));
      setProfileImageUrl(json.profileImageUrl ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得に失敗しました");
      setProfileImageUrl(null);
    } finally {
      setLoading(false);
    }
  }, [instructorId, listUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onPhotoChange = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const prepared = await prepareProfileImage(file);
      const form = new FormData();
      form.append(
        "file",
        new File([prepared.blob], prepared.fileName, {
          type: prepared.mimeType,
        }),
      );
      const response = await fetch(
        `/api/admin/certified-instructors/${encodeURIComponent(instructorId)}/photo`,
        { method: "POST", body: form },
      );
      const json = (await response.json()) as {
        url?: string;
        profile?: { profileImageUrl?: string | null };
        error?: string;
      };
      if (!response.ok) {
        throw new Error(json.error ?? "アップロードに失敗しました");
      }
      setProfileImageUrl(
        json.url ?? json.profile?.profileImageUrl ?? profileImageUrl,
      );
      setMessage("写真を更新しました");
    } catch (err) {
      setError(err instanceof Error ? err.message : "アップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  };

  const onPhotoDelete = async () => {
    if (!profileImageUrl) return;
    if (!window.confirm("プロフィール写真を削除しますか？")) return;
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/admin/certified-instructors/${encodeURIComponent(instructorId)}/photo`,
        { method: "DELETE" },
      );
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? "削除に失敗しました");
      }
      setProfileImageUrl(null);
      setMessage("写真を削除しました");
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました");
    } finally {
      setUploading(false);
    }
  };

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-[#faf9f7] p-4 sm:p-5"
      aria-labelledby="admin-instructor-photo-title"
    >
      <h3
        id="admin-instructor-photo-title"
        className="text-[13px] font-semibold tracking-[-0.02em]"
        style={{ color: NAVY }}
      >
        プロフィール写真
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        認定講師紹介ページに表示される写真です
      </p>

      {!accountLinked ? (
        <p
          className="mt-4 rounded-xl border border-[#d8b36a]/40 bg-white px-3.5 py-3 text-[13px] leading-5 text-slate-700"
          role="status"
        >
          {INSTRUCTOR_PHOTO_ACCOUNT_UNLINKED_ERROR}
        </p>
      ) : loading ? (
        <p className="mt-4 text-[13px] text-slate-500">読み込み中…</p>
      ) : (
        <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="relative h-28 w-28 overflow-hidden rounded-full border border-[#8a6a2d]/25 bg-[#071426]/05">
            {profileImageUrl ? (
              <Image
                src={profileImageUrl}
                alt={`${activityName}のプロフィール写真`}
                fill
                className="object-cover"
                sizes="112px"
                unoptimized
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-2xl font-semibold"
                style={{ color: `${NAVY}66` }}
              >
                {(activityName.trim().slice(0, 1) || "?").toUpperCase()}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <label className="inline-flex cursor-pointer">
              <span
                className="inline-flex min-h-11 items-center justify-center rounded-full border bg-white px-4 text-sm font-semibold disabled:opacity-60"
                style={{ borderColor: `${GOLD}59`, color: GOLD }}
              >
                {uploading
                  ? "処理中…"
                  : profileImageUrl
                    ? "写真を差し替え"
                    : "写真をアップロード"}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  void onPhotoChange(file);
                  event.target.value = "";
                }}
              />
            </label>
            {profileImageUrl ? (
              <button
                type="button"
                disabled={uploading}
                onClick={() => void onPhotoDelete()}
                className="block text-sm font-semibold text-[#a33a3a] disabled:opacity-60"
              >
                写真を削除
              </button>
            ) : null}
            <p className="text-xs leading-5 text-slate-500">
              JPG / PNG / WebP · 最大8MB · 自動で正方形にトリミング・圧縮
            </p>
          </div>
        </div>
      )}

      {error ? (
        <p className="mt-3 text-[13px] font-medium text-[#a33a3a]" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-3 text-[13px] font-medium text-[#315f68]" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
