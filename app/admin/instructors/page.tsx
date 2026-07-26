"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import InstructorLicenseCertificateSheet from "@/components/InstructorLicenseCertificateSheet";
import Button from "@/components/ui/Button";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY, SURFACE_WARM } from "@/components/ui/tokens";
import {
  educationProgressPercent,
  formatJaDate,
  formatLegalNameDisplay,
  INSTRUCTOR_LICENSE_STATUS_LABELS,
  INSTRUCTOR_LICENSE_STATUSES,
  INSTRUCTOR_RENEWAL_STATUS_LABELS,
  resolveCertificationName,
  SLEEP_WELLNESS_INSTRUCTOR_CERT_NAME,
  todayIso,
  addYearsIso,
} from "@/lib/instructor-license/constants";
import type {
  AdminCertifiedInstructorListItem,
  InstructorLicenseStatus,
} from "@/lib/instructor-license/types";

const inputClass =
  "mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[16px] text-[#071426] outline-none transition focus:border-[#315f68] focus:ring-4 focus:ring-[#315f68]/10 sm:min-h-0 sm:text-[15px]";

export default function AdminCertifiedInstructorsPage() {
  const [instructors, setInstructors] = useState<
    AdminCertifiedInstructorListItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showCertificate, setShowCertificate] = useState(false);

  const [editPublicName, setEditPublicName] = useState("");
  const [editLegalName, setEditLegalName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editUserId, setEditUserId] = useState("");
  const [editNumber, setEditNumber] = useState("");
  const [editCertifiedAt, setEditCertifiedAt] = useState(todayIso());
  const [editRenewsAt, setEditRenewsAt] = useState(addYearsIso(todayIso(), 1));
  const [editMemo, setEditMemo] = useState("");
  const [editLicenseStatus, setEditLicenseStatus] =
    useState<InstructorLicenseStatus>("active");
  const [editRequiredHours, setEditRequiredHours] = useState("12");
  const [editCompletedHours, setEditCompletedHours] = useState("0");
  const [issueLicense, setIssueLicense] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/certified-instructors", {
        cache: "no-store",
      });
      const json = (await response.json()) as {
        instructors?: AdminCertifiedInstructorListItem[];
        error?: string;
      };
      if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
      const list = json.instructors ?? [];
      setInstructors(list);
      setSelectedId((prev) => {
        if (prev && list.some((item) => item.instructorId === prev)) return prev;
        return list[0]?.instructorId ?? null;
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "取得に失敗しました");
      setInstructors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return instructors;
    return instructors.filter((item) =>
      [item.activityName, item.legalName, item.email, item.instructorNumber]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [instructors, query]);

  const selected = useMemo(
    () =>
      instructors.find((item) => item.instructorId === selectedId) ?? null,
    [instructors, selectedId],
  );

  useEffect(() => {
    if (!selected) {
      if (creating) return;
      setEditPublicName("");
      setEditLegalName("");
      setEditEmail("");
      setEditUserId("");
      setEditNumber("");
      setEditCertifiedAt(todayIso());
      setEditRenewsAt(addYearsIso(todayIso(), 1));
      setEditMemo("");
      setEditLicenseStatus("active");
      setEditRequiredHours("12");
      setEditCompletedHours("0");
      setIssueLicense(true);
      return;
    }
    setCreating(false);
    setEditPublicName(selected.activityName === "—" ? "" : selected.activityName);
    setEditLegalName(selected.legalName);
    setEditEmail(selected.email);
    setEditUserId(selected.userId);
    setEditNumber(selected.instructorNumber);
    setEditCertifiedAt(selected.certifiedAt || todayIso());
    setEditRenewsAt(
      selected.license?.expiresAt || selected.renewsAt || addYearsIso(todayIso(), 1),
    );
    setEditMemo(selected.adminMemo);
    setEditLicenseStatus(selected.license?.status ?? "active");
    setEditRequiredHours(
      String(selected.license?.requiredEducationHours ?? 12),
    );
    setEditCompletedHours(
      String(selected.license?.completedEducationHours ?? 0),
    );
    setIssueLicense(!selected.license);
    setShowCertificate(false);
  }, [selected, creating]);

  const startCreate = () => {
    setCreating(true);
    setSelectedId(null);
    setEditPublicName("");
    setEditLegalName("");
    setEditEmail("");
    setEditUserId("");
    setEditNumber("");
    setEditCertifiedAt(todayIso());
    setEditRenewsAt(addYearsIso(todayIso(), 1));
    setEditMemo("");
    setEditLicenseStatus("active");
    setEditRequiredHours("12");
    setEditCompletedHours("0");
    setIssueLicense(true);
    setShowCertificate(false);
  };

  const onSave = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/certified-instructors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert_instructor",
          instructor: {
            id: creating ? undefined : selected?.instructorId,
            email: editEmail,
            publicName: editPublicName,
            legalName: editLegalName,
            displayName: editPublicName,
            levelId: "instructor",
            instructorNumber: editNumber,
            certifiedAt: editCertifiedAt,
            renewsAt: editRenewsAt,
            userId: editUserId || undefined,
            adminMemo: editMemo,
            issueLicense,
            licenseStatus: editLicenseStatus,
            requiredEducationHours: Number(editRequiredHours) || 0,
            completedEducationHours: Number(editCompletedHours) || 0,
          },
        }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "保存に失敗しました");
      setMessage("保存しました");
      setCreating(false);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const onSetStatus = async (status: InstructorLicenseStatus) => {
    if (!selected?.license?.id) {
      setMessage("先にライセンスを発行してください");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/certified-instructors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_license_status",
          licenseId: selected.license.id,
          status,
        }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "更新に失敗しました");
      setMessage(`状態を「${INSTRUCTOR_LICENSE_STATUS_LABELS[status]}」に更新しました`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const onRenewal = async (decision: "approve_renewal" | "reject_renewal") => {
    if (!selected?.license?.id) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/certified-instructors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: decision,
          licenseId: selected.license.id,
          adminNote: editMemo,
        }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "更新処理に失敗しました");
      setMessage(
        decision === "approve_renewal" ? "更新を承認しました" : "更新を却下しました",
      );
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "更新処理に失敗しました",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell
      title="認定講師一覧"
      description="活動名・本名・ライセンス・継続教育を管理します（管理者限定）。"
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button type="button" onClick={startCreate}>
          新規講師登録
        </Button>
        <Link
          href="/admin/instructor-accounts"
          className="text-[13px] font-semibold underline-offset-2 hover:underline"
          style={{ color: NAVY }}
        >
          会員・クレジット管理へ
        </Link>
        <Link
          href="/admin/licenses"
          className="text-[13px] font-semibold underline-offset-2 hover:underline"
          style={{ color: NAVY }}
        >
          ライセンス詳細へ
        </Link>
      </div>

      {message ? (
        <p className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] text-slate-700">
          {message}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <SectionCard title="認定講師">
          <input
            className={inputClass}
            placeholder="活動名・本名・メール・認定番号で検索"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {loading ? (
            <div className="mt-4 space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="mt-4 text-[14px] text-slate-500">
              認定講師が登録されていません。
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-3 font-semibold">活動名</th>
                    <th className="py-2 pr-3 font-semibold">本名</th>
                    <th className="py-2 pr-3 font-semibold">資格</th>
                    <th className="py-2 pr-3 font-semibold">番号</th>
                    <th className="py-2 pr-3 font-semibold">状態</th>
                    <th className="py-2 pr-3 font-semibold">継続教育</th>
                    <th className="py-2 font-semibold">更新申請</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
                    const license = item.license;
                    const certName = resolveCertificationName(
                      license?.certificationName,
                    );
                    const statusLabel = license
                      ? INSTRUCTOR_LICENSE_STATUS_LABELS[license.status]
                      : "未発行";
                    const progress = license
                      ? educationProgressPercent(
                          license.requiredEducationHours,
                          license.completedEducationHours,
                        )
                      : null;
                    const active = item.instructorId === selectedId && !creating;
                    return (
                      <tr
                        key={item.instructorId}
                        className="cursor-pointer border-b border-slate-100"
                        style={
                          active ? { backgroundColor: SURFACE_WARM } : undefined
                        }
                        onClick={() => {
                          setCreating(false);
                          setSelectedId(item.instructorId);
                        }}
                      >
                        <td className="py-3 pr-3 font-semibold" style={{ color: NAVY }}>
                          {item.activityName}
                        </td>
                        <td className="py-3 pr-3">
                          {formatLegalNameDisplay(item.legalName)}
                        </td>
                        <td className="py-3 pr-3">{certName}</td>
                        <td className="py-3 pr-3 font-mono text-[12px]">
                          {license?.licenseNumber || item.instructorNumber || "—"}
                        </td>
                        <td className="py-3 pr-3">{statusLabel}</td>
                        <td className="py-3 pr-3">
                          {progress == null ? "—" : `${progress}%`}
                        </td>
                        <td className="py-3">
                          {license
                            ? INSTRUCTOR_RENEWAL_STATUS_LABELS[
                                license.renewalStatus
                              ]
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard title={creating ? "新規講師登録" : "講師・ライセンス編集"}>
          <form className="space-y-4" onSubmit={onSave}>
            <label className="block text-[13px] font-semibold text-slate-600">
              活動名（public_name）
              <input
                className={inputClass}
                value={editPublicName}
                onChange={(event) => setEditPublicName(event.target.value)}
                required
              />
            </label>
            <label className="block text-[13px] font-semibold text-slate-600">
              本名（legal_name）
              <input
                className={inputClass}
                value={editLegalName}
                onChange={(event) => setEditLegalName(event.target.value)}
                placeholder="未登録可"
              />
            </label>
            <label className="block text-[13px] font-semibold text-slate-600">
              メール
              <input
                className={inputClass}
                type="email"
                value={editEmail}
                onChange={(event) => setEditEmail(event.target.value)}
                required
              />
            </label>
            <label className="block text-[13px] font-semibold text-slate-600">
              連携ユーザー ID（profiles.id）
              <input
                className={inputClass}
                value={editUserId}
                onChange={(event) => setEditUserId(event.target.value)}
                required={creating}
                placeholder="auth / profiles の UUID"
              />
            </label>
            <label className="block text-[13px] font-semibold text-slate-600">
              認定番号
              <input
                className={inputClass}
                value={editNumber}
                onChange={(event) => setEditNumber(event.target.value)}
                required
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-[13px] font-semibold text-slate-600">
                認定日
                <input
                  className={inputClass}
                  type="date"
                  value={editCertifiedAt}
                  onChange={(event) => setEditCertifiedAt(event.target.value)}
                  required
                />
              </label>
              <label className="block text-[13px] font-semibold text-slate-600">
                有効期限
                <input
                  className={inputClass}
                  type="date"
                  value={editRenewsAt}
                  onChange={(event) => setEditRenewsAt(event.target.value)}
                  required
                />
              </label>
            </div>
            <p className="text-[13px] text-slate-600">
              認定資格名:{" "}
              <strong style={{ color: NAVY }}>
                {SLEEP_WELLNESS_INSTRUCTOR_CERT_NAME}
              </strong>
              （level_id は instructor のまま）
            </p>
            <label className="flex items-center gap-2 text-[13px] font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={issueLicense}
                onChange={(event) => setIssueLicense(event.target.checked)}
              />
              ライセンスを発行 / 同期する
            </label>
            {issueLicense ? (
              <>
                <label className="block text-[13px] font-semibold text-slate-600">
                  ライセンス状態
                  <select
                    className={inputClass}
                    value={editLicenseStatus}
                    onChange={(event) =>
                      setEditLicenseStatus(
                        event.target.value as InstructorLicenseStatus,
                      )
                    }
                  >
                    {INSTRUCTOR_LICENSE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {INSTRUCTOR_LICENSE_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-[13px] font-semibold text-slate-600">
                    継続教育 必要時間
                    <input
                      className={inputClass}
                      type="number"
                      min={0}
                      step={0.5}
                      value={editRequiredHours}
                      onChange={(event) =>
                        setEditRequiredHours(event.target.value)
                      }
                    />
                  </label>
                  <label className="block text-[13px] font-semibold text-slate-600">
                    継続教育 修了時間
                    <input
                      className={inputClass}
                      type="number"
                      min={0}
                      step={0.5}
                      value={editCompletedHours}
                      onChange={(event) =>
                        setEditCompletedHours(event.target.value)
                      }
                    />
                  </label>
                </div>
              </>
            ) : null}
            <label className="block text-[13px] font-semibold text-slate-600">
              管理メモ（非公開）
              <textarea
                className={`${inputClass} min-h-24`}
                value={editMemo}
                onChange={(event) => setEditMemo(event.target.value)}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "保存中…" : creating ? "登録する" : "保存する"}
              </Button>
              {!creating && selected?.license ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={saving}
                    onClick={() => void onSetStatus("active")}
                  >
                    有効
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={saving}
                    onClick={() => void onSetStatus("suspended")}
                  >
                    停止
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={saving}
                    onClick={() => void onSetStatus("withdrawn")}
                  >
                    取消
                  </Button>
                  {selected.license.renewalStatus === "requested" ? (
                    <>
                      <Button
                        type="button"
                        disabled={saving}
                        onClick={() => void onRenewal("approve_renewal")}
                      >
                        更新承認
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={saving}
                        onClick={() => void onRenewal("reject_renewal")}
                      >
                        更新却下
                      </Button>
                    </>
                  ) : null}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowCertificate((value) => !value)}
                  >
                    デジタル認定証を確認
                  </Button>
                </>
              ) : null}
            </div>
          </form>

          {!creating && selected?.license && showCertificate ? (
            <div className="mt-6 border-t border-slate-200 pt-6">
              <p className="mb-3 text-[12px] text-slate-500">
                認定日 {formatJaDate(selected.license.issuedAt)} ／ 有効期限{" "}
                {formatJaDate(selected.license.expiresAt)}
              </p>
              <InstructorLicenseCertificateSheet
                activityName={selected.activityName}
                license={selected.license}
                verificationUrl={
                  selected.license.verificationCode
                    ? `/license/verify?code=${encodeURIComponent(selected.license.verificationCode)}`
                    : "/license/verify"
                }
              />
            </div>
          ) : null}
        </SectionCard>
      </div>

      <p className="mt-4 text-[12px] text-slate-500">
        一般ユーザー・認定講師本人はこのページにアクセスできません（/admin は管理者のみ）。
      </p>
    </AdminShell>
  );
}
