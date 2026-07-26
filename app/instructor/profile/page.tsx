"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import InstructorNav from "@/components/InstructorNav";
import Button from "@/components/ui/Button";
import SectionCard from "@/components/ui/SectionCard";
import { useToast } from "@/components/ui/Toast";
import { GOLD, NAVY, SURFACE } from "@/components/ui/tokens";
import { prepareProfileImage } from "@/lib/instructors/profile-image";
import type { InstructorProfileEditable } from "@/lib/instructors/types";
import {
  PILATES_SPECIALTY_OPTIONS,
  PROGRAM_OPTIONS,
  YOGA_SPECIALTY_OPTIONS,
} from "@/lib/instructors/types";

const inputClass =
  "mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[16px] text-[#071426] outline-none transition focus:border-[#8a6a2d] focus:ring-4 focus:ring-[#8a6a2d]/15 sm:min-h-0 sm:text-[15px]";

const labelClass = "text-sm font-semibold text-[#071426]";

function toggleInList(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function ChipMultiSelect({
  options,
  values,
  onChange,
}: {
  options: readonly string[];
  values: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {options.map((option) => {
        const active = values.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(toggleInList(values, option))}
            className={`inline-flex min-h-10 items-center rounded-full border px-3.5 text-xs font-semibold transition sm:text-sm ${
              active
                ? "border-[#071426] bg-[#071426] text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-[#8a6a2d]/40"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export default function InstructorProfileEditPage() {
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<InstructorProfileEditable | null>(
    null,
  );

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/instructor/profile", {
        cache: "no-store",
      });
      const json = (await response.json()) as {
        profile?: InstructorProfileEditable;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(json.error ?? "プロフィールを取得できません");
      }
      setProfile(json.profile ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得に失敗しました");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updateField = <K extends keyof InstructorProfileEditable>(
    key: K,
    value: InstructorProfileEditable[K],
  ) => {
    setProfile((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const onSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/instructor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicDisplayName: profile.publicDisplayName,
          legalName: profile.legalName,
          showLegalName: profile.showLegalName,
          headline: profile.headline,
          bio: profile.bio,
          career: profile.career,
          activityArea: profile.activityArea,
          serviceArea: profile.serviceArea,
          onlineAvailable: profile.onlineAvailable,
          yogaSpecialties: profile.yogaSpecialties,
          pilatesSpecialties: profile.pilatesSpecialties,
          specialties: profile.specialties,
          availablePrograms: profile.availablePrograms,
          instagramUrl: profile.instagramUrl,
          websiteUrl: profile.websiteUrl,
          contactEmail: profile.contactEmail,
          isPublic: profile.isPublic,
          recommendationNote: profile.recommendationNote,
        }),
      });
      const json = (await response.json()) as {
        profile?: InstructorProfileEditable;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(json.error ?? "保存に失敗しました");
      }
      setProfile(json.profile ?? profile);
      success(
        json.profile?.isPublic
          ? "保存しました。公開ページに反映されます。"
          : "非公開のまま保存しました。公開する場合は「公開する」をONにしてください。",
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "保存に失敗しました";
      setError(message);
      toastError(message);
    } finally {
      setSaving(false);
    }
  };

  const onPhotoChange = async (file: File | null) => {
    if (!file || !profile) return;
    setUploading(true);
    setError(null);
    try {
      const prepared = await prepareProfileImage(file);
      const form = new FormData();
      form.append(
        "file",
        new File([prepared.blob], prepared.fileName, {
          type: prepared.mimeType,
        }),
      );
      const response = await fetch("/api/instructor/profile/photo", {
        method: "POST",
        body: form,
      });
      const json = (await response.json()) as {
        profile?: InstructorProfileEditable;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(json.error ?? "アップロードに失敗しました");
      }
      setProfile(json.profile ?? profile);
      success("写真を更新しました");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "アップロードに失敗しました";
      setError(message);
      toastError(message);
    } finally {
      setUploading(false);
    }
  };

  const onPhotoDelete = async () => {
    if (!profile?.profileImageUrl) return;
    if (!window.confirm("プロフィール写真を削除しますか？")) return;
    setUploading(true);
    try {
      const response = await fetch("/api/instructor/profile/photo", {
        method: "DELETE",
      });
      const json = (await response.json()) as {
        profile?: InstructorProfileEditable;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(json.error ?? "削除に失敗しました");
      }
      setProfile(json.profile ?? profile);
      success("写真を削除しました");
    } catch (err) {
      toastError(
        err instanceof Error ? err.message : "削除に失敗しました",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
      <InstructorNav eyebrow="PROFILE" />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 md:px-8">
        <div className="mb-6">
          <p
            className="text-[11px] font-semibold tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            CERTIFIED INSTRUCTOR
          </p>
          <h1
            className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl"
            style={{ color: NAVY }}
          >
            公開プロフィール編集
          </h1>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            自分のプロフィールのみ編集できます。保存しても「公開する」がOFFの間は公開ページに表示されません。
          </p>
        </div>

        {loading ? (
          <SectionCard title="読み込み中">
            <p className="text-sm text-slate-500">プロフィールを取得しています…</p>
          </SectionCard>
        ) : !profile ? (
          <SectionCard title="プロフィール未作成">
            <p className="text-sm leading-7 text-slate-600">
              {error ??
                "認定講師レコードが見つかりません。本部にお問い合わせください。"}
            </p>
            <Link
              href="/dashboard"
              className="mt-4 inline-flex text-sm font-semibold text-[#315f68]"
            >
              ダッシュボードへ戻る
            </Link>
          </SectionCard>
        ) : (
          <form onSubmit={onSave} className="space-y-5">
            {error ? (
              <div className="rounded-2xl border border-[#a33a3a]/20 bg-white px-4 py-3 text-sm text-[#a33a3a]">
                {error}
              </div>
            ) : null}

            <SectionCard title="公開設定">
              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-4">
                <input
                  type="checkbox"
                  checked={profile.isPublic}
                  onChange={(event) =>
                    updateField("isPublic", event.target.checked)
                  }
                  className="mt-1 h-5 w-5 rounded border-slate-300"
                />
                <span>
                  <span className="block text-sm font-semibold text-[#071426]">
                    公開する
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-slate-500">
                    ONにしたときのみ /instructors
                    に表示されます。最初はOFFのまま下書き保存できます。
                  </span>
                </span>
              </label>
              <p className="mt-3 text-xs text-slate-500">
                資格表示: {profile.certificationLabel}
                {profile.profileUpdatedAt
                  ? ` · 最終更新 ${new Date(profile.profileUpdatedAt).toLocaleString("ja-JP")}`
                  : ""}
              </p>
            </SectionCard>

            <SectionCard title="プロフィール写真">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <div className="relative h-28 w-28 overflow-hidden rounded-full border border-[#8a6a2d]/25 bg-[#071426]/05">
                  {profile.profileImageUrl ? (
                    <Image
                      src={profile.profileImageUrl}
                      alt="プロフィール写真"
                      fill
                      className="object-cover"
                      sizes="112px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-[#071426]/40">
                      {profile.publicDisplayName.slice(0, 1) || "?"}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="inline-flex cursor-pointer">
                    <span className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#8a6a2d]/35 bg-white px-4 text-sm font-semibold text-[#8a6a2d]">
                      {uploading ? "処理中…" : "写真をアップロード"}
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
                  {profile.profileImageUrl ? (
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => void onPhotoDelete()}
                      className="block text-sm font-semibold text-[#a33a3a]"
                    >
                      写真を削除
                    </button>
                  ) : null}
                  <p className="text-xs leading-5 text-slate-500">
                    JPG / PNG / WebP · 最大8MB · 自動で正方形にトリミング・圧縮
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="基本情報">
              <div className="grid gap-4">
                <label>
                  <span className={labelClass}>活動名</span>
                  <input
                    className={inputClass}
                    value={profile.publicDisplayName}
                    onChange={(event) =>
                      updateField("publicDisplayName", event.target.value)
                    }
                    required
                    maxLength={80}
                  />
                </label>
                <label>
                  <span className={labelClass}>本名</span>
                  <input
                    className={inputClass}
                    value={profile.legalName}
                    onChange={(event) =>
                      updateField("legalName", event.target.value)
                    }
                    maxLength={80}
                  />
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={profile.showLegalName}
                    onChange={(event) =>
                      updateField("showLegalName", event.target.checked)
                    }
                    className="h-5 w-5 rounded border-slate-300"
                  />
                  <span className="text-sm text-[#071426]">
                    本名を公開する
                  </span>
                </label>
                <label>
                  <span className={labelClass}>肩書</span>
                  <input
                    className={inputClass}
                    value={profile.headline}
                    onChange={(event) =>
                      updateField("headline", event.target.value)
                    }
                    maxLength={120}
                    placeholder="例: 睡眠と呼吸を整えるヨガ指導"
                  />
                </label>
              </div>
            </SectionCard>

            <SectionCard title="自己紹介・経歴">
              <label>
                <span className={labelClass}>自己紹介文</span>
                <textarea
                  className={`${inputClass} min-h-36`}
                  value={profile.bio}
                  onChange={(event) => updateField("bio", event.target.value)}
                  maxLength={4000}
                />
              </label>
              <label className="mt-4 block">
                <span className={labelClass}>経歴</span>
                <textarea
                  className={`${inputClass} min-h-36`}
                  value={profile.career}
                  onChange={(event) =>
                    updateField("career", event.target.value)
                  }
                  maxLength={4000}
                />
              </label>
            </SectionCard>

            <SectionCard title="活動エリア">
              <div className="grid gap-4">
                <label>
                  <span className={labelClass}>活動地域</span>
                  <input
                    className={inputClass}
                    value={profile.activityArea}
                    onChange={(event) =>
                      updateField("activityArea", event.target.value)
                    }
                    placeholder="例: 東京都 / オンライン"
                    maxLength={120}
                  />
                </label>
                <label>
                  <span className={labelClass}>対応可能エリア</span>
                  <input
                    className={inputClass}
                    value={profile.serviceArea}
                    onChange={(event) =>
                      updateField("serviceArea", event.target.value)
                    }
                    placeholder="例: 首都圏・関西・オンライン全国"
                    maxLength={240}
                  />
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={profile.onlineAvailable}
                    onChange={(event) =>
                      updateField("onlineAvailable", event.target.checked)
                    }
                    className="h-5 w-5 rounded border-slate-300"
                  />
                  <span className="text-sm text-[#071426]">
                    オンライン対応可
                  </span>
                </label>
              </div>
            </SectionCard>

            <SectionCard title="指導分野">
              <p className={labelClass}>ヨガ指導分野</p>
              <ChipMultiSelect
                options={YOGA_SPECIALTY_OPTIONS}
                values={profile.yogaSpecialties}
                onChange={(next) => updateField("yogaSpecialties", next)}
              />
              <p className={`${labelClass} mt-5`}>ピラティス指導分野</p>
              <ChipMultiSelect
                options={PILATES_SPECIALTY_OPTIONS}
                values={profile.pilatesSpecialties}
                onChange={(next) => updateField("pilatesSpecialties", next)}
              />
              <label className="mt-5 block">
                <span className={labelClass}>得意分野（カンマ区切り可）</span>
                <input
                  className={inputClass}
                  value={profile.specialties.join("、")}
                  onChange={(event) =>
                    updateField(
                      "specialties",
                      event.target.value
                        .split(/[,、]/)
                        .map((item) => item.trim())
                        .filter(Boolean),
                    )
                  }
                  placeholder="例: 入眠サポート、呼吸法"
                />
              </label>
              <p className={`${labelClass} mt-5`}>担当可能プログラム</p>
              <ChipMultiSelect
                options={PROGRAM_OPTIONS}
                values={profile.availablePrograms}
                onChange={(next) => updateField("availablePrograms", next)}
              />
            </SectionCard>

            <SectionCard title="連絡先・Web">
              <div className="grid gap-4">
                <label>
                  <span className={labelClass}>Instagram URL</span>
                  <input
                    className={inputClass}
                    value={profile.instagramUrl}
                    onChange={(event) =>
                      updateField("instagramUrl", event.target.value)
                    }
                    placeholder="https://instagram.com/..."
                  />
                </label>
                <label>
                  <span className={labelClass}>公式サイト URL</span>
                  <input
                    className={inputClass}
                    value={profile.websiteUrl}
                    onChange={(event) =>
                      updateField("websiteUrl", event.target.value)
                    }
                    placeholder="https://..."
                  />
                </label>
                <label>
                  <span className={labelClass}>問い合わせ先（メール）</span>
                  <input
                    type="email"
                    className={inputClass}
                    value={profile.contactEmail}
                    onChange={(event) =>
                      updateField("contactEmail", event.target.value)
                    }
                    placeholder="contact@example.com"
                  />
                </label>
                <label>
                  <span className={labelClass}>
                    推薦情報（表示順の参考・任意）
                  </span>
                  <textarea
                    className={`${inputClass} min-h-24`}
                    value={profile.recommendationNote}
                    onChange={(event) =>
                      updateField("recommendationNote", event.target.value)
                    }
                    maxLength={500}
                    placeholder="本部が表示順の参考にする任意の情報"
                  />
                </label>
              </div>
            </SectionCard>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href={
                  profile.isPublic ? `/instructors/${profile.id}` : "/instructors"
                }
                className="text-sm font-semibold text-[#315f68]"
              >
                公開ページを確認 →
              </Link>
              <Button type="submit" disabled={saving || uploading}>
                {saving ? "保存中…" : "保存する"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
