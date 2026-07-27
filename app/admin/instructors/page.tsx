"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/AdminShell";
import Button from "@/components/ui/Button";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY, SURFACE_WARM, TEAL } from "@/components/ui/tokens";
import {
  addYearsIso,
  daysUntil,
  daysUntilExpiryColor,
  educationProgressPercent,
  formatJaDate,
  formatLegalNameDisplay,
  INSTRUCTOR_LICENSE_STATUS_LABELS,
  INSTRUCTOR_LICENSE_STATUSES,
  INSTRUCTOR_RENEWAL_STATUS_LABELS,
  INSTRUCTOR_RENEWAL_STATUSES,
  isInstructorRenewalStatus,
  licenseVerificationUrl,
  resolveCertificationName,
  resolveDisplayStatus,
  SLEEP_WELLNESS_INSTRUCTOR_CERT_NAME,
  todayIso,
} from "@/lib/instructor-license/constants";
import type {
  AdminCertifiedInstructorListItem,
  InstructorLicenseStatus,
  InstructorRenewalStatus,
} from "@/lib/instructor-license/types";
import type { CertificationLevelRecord } from "@/lib/ops/types";

const inputClass =
  "mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[16px] text-[#071426] outline-none transition focus:border-[#315f68] focus:ring-4 focus:ring-[#315f68]/10 sm:min-h-0 sm:text-[15px]";

const selectClass = inputClass;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SaveState = "idle" | "saving" | "success" | "error";

type LicenseActionKind = "issue" | "suspend" | "resume" | "renew";

type ConfirmDialogState = {
  kind: LicenseActionKind;
  title: string;
  message: string;
} | null;

function accountLinkLabel(userId: string): string {
  return userId.trim() ? "紐づけ済み" : "未紐づけ";
}

function effectiveStatus(
  item: AdminCertifiedInstructorListItem,
): InstructorLicenseStatus | null {
  const license = item.license;
  if (!license) return null;
  return resolveDisplayStatus(license.status, license.expiresAt);
}

function statusLabelForItem(item: AdminCertifiedInstructorListItem): string {
  const status = effectiveStatus(item);
  if (!status) return "未発行";
  return INSTRUCTOR_LICENSE_STATUS_LABELS[status];
}

function expiresAtForItem(item: AdminCertifiedInstructorListItem): string {
  return item.license?.expiresAt || item.renewsAt || "";
}

function certifiedAtForItem(item: AdminCertifiedInstructorListItem): string {
  return item.license?.issuedAt || item.certifiedAt || "";
}

function remainingDaysForItem(
  item: AdminCertifiedInstructorListItem,
): number | null {
  const expires = expiresAtForItem(item);
  if (!expires) return null;
  return daysUntil(expires);
}

function formatRemainingDays(days: number | null): string {
  if (days == null) return "—";
  if (days >= 0) return `${days} 日`;
  return `${Math.abs(days)} 日超過`;
}

function RemainingDaysCell({
  item,
}: {
  item: AdminCertifiedInstructorListItem;
}) {
  const days = remainingDaysForItem(item);
  const color = daysUntilExpiryColor(days) ?? NAVY;
  return (
    <span className="font-semibold" style={{ color }}>
      {formatRemainingDays(days)}
    </span>
  );
}

function EducationBar({
  required,
  completed,
}: {
  required: number;
  completed: number;
}) {
  const percent = educationProgressPercent(required, completed);
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-[12px] text-slate-600">
        <span>
          {completed} / {required}時間
        </span>
        <span className="font-semibold" style={{ color: TEAL }}>
          {percent}%
        </span>
      </div>
      <div
        className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="継続教育の進捗"
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${percent}%`,
            backgroundColor: TEAL,
          }}
        />
      </div>
    </div>
  );
}

function ReadonlyRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3">
      <dt className="text-[11px] font-semibold tracking-[0.14em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-1.5 text-[14px] font-semibold text-[#071426]">
        {children}
      </dd>
    </div>
  );
}

function AdminLinkButton({
  href,
  label,
  disabled,
  reason,
}: {
  href: string;
  label: string;
  disabled: boolean;
  reason: string;
}) {
  if (disabled) {
    return (
      <div>
        <button
          type="button"
          disabled
          className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-4 text-[13px] font-semibold text-slate-400 sm:w-auto"
        >
          {label}
        </button>
        <p className="mt-1.5 text-[12px] text-slate-500">{reason}</p>
      </div>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[#8a6a2d]/35 bg-white px-4 text-[13px] font-semibold text-[#8a6a2d] transition hover:border-[#8a6a2d]/55 hover:bg-[#fafaf8] sm:w-auto"
    >
      {label}
    </a>
  );
}

type InstructorEditFormProps = {
  selected: AdminCertifiedInstructorListItem;
  editPublicName: string;
  setEditPublicName: (value: string) => void;
  editLegalName: string;
  setEditLegalName: (value: string) => void;
  editEmail: string;
  setEditEmail: (value: string) => void;
  editLevelId: string;
  setEditLevelId: (value: string) => void;
  editCertifiedAt: string;
  setEditCertifiedAt: (value: string) => void;
  editExpiresAt: string;
  setEditExpiresAt: (value: string) => void;
  editRequiredHours: string;
  setEditRequiredHours: (value: string) => void;
  editCompletedHours: string;
  setEditCompletedHours: (value: string) => void;
  editRenewalStatus: InstructorRenewalStatus;
  setEditRenewalStatus: (value: InstructorRenewalStatus) => void;
  saveState: SaveState;
  fieldErrors: string[];
  verificationCode: string;
  verifyHref: string;
  certificateHref: string;
  hasLicense: boolean;
  liveProgressPercent: number;
  levels: CertificationLevelRecord[];
  levelLabel: (levelId: string) => string;
  onSave: (event: FormEvent) => void;
  onClose: () => void;
};

function InstructorEditForm({
  selected,
  editPublicName,
  setEditPublicName,
  editLegalName,
  setEditLegalName,
  editEmail,
  setEditEmail,
  editLevelId,
  setEditLevelId,
  editCertifiedAt,
  setEditCertifiedAt,
  editExpiresAt,
  setEditExpiresAt,
  editRequiredHours,
  setEditRequiredHours,
  editCompletedHours,
  setEditCompletedHours,
  editRenewalStatus,
  setEditRenewalStatus,
  saveState,
  fieldErrors,
  verificationCode,
  verifyHref,
  certificateHref,
  hasLicense,
  liveProgressPercent,
  levels,
  levelLabel,
  onSave,
  onClose,
}: InstructorEditFormProps) {
  return (
    <form className="space-y-5" onSubmit={(event) => void onSave(event)}>
      <dl className="grid gap-3 sm:grid-cols-2">
        <ReadonlyRow label="認定資格名">
          {SLEEP_WELLNESS_INSTRUCTOR_CERT_NAME}
        </ReadonlyRow>
        <ReadonlyRow label="認定番号">
          <span className="font-mono">
            {selected.license?.licenseNumber ||
              selected.instructorNumber ||
              "—"}
          </span>
        </ReadonlyRow>
        <ReadonlyRow label="確認コード">
          <span className="break-all font-mono text-[13px]">
            {verificationCode || "—"}
          </span>
        </ReadonlyRow>
        <ReadonlyRow label="ライセンス状態">
          {statusLabelForItem(selected)}
        </ReadonlyRow>
        <ReadonlyRow label="残り日数">
          <RemainingDaysCell item={selected} />
        </ReadonlyRow>
        <ReadonlyRow label="認証ページURL">
          {verifyHref ? (
            <a
              href={verifyHref}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-[13px] font-semibold text-[#315f68] hover:text-[#8a6a2d]"
            >
              {verifyHref}
            </a>
          ) : (
            "—"
          )}
        </ReadonlyRow>
      </dl>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-[13px] font-semibold text-slate-600">
          活動名
          <input
            className={inputClass}
            value={editPublicName}
            onChange={(event) => setEditPublicName(event.target.value)}
            required
            disabled={saveState === "saving"}
          />
        </label>
        <label className="block text-[13px] font-semibold text-slate-600">
          本名
          <input
            className={inputClass}
            value={editLegalName}
            onChange={(event) => setEditLegalName(event.target.value)}
            required
            disabled={saveState === "saving"}
          />
        </label>
      </div>

      <label className="block text-[13px] font-semibold text-slate-600">
        メールアドレス
        <input
          className={inputClass}
          type="email"
          value={editEmail}
          onChange={(event) => setEditEmail(event.target.value)}
          required
          disabled={saveState === "saving"}
          autoComplete="off"
        />
        <p className="mt-2 text-[12px] leading-5 text-slate-500">
          ※ログイン用メールアドレスの変更は別途アカウント設定が必要です。
        </p>
      </label>

      <label className="block text-[13px] font-semibold text-slate-600">
        認定レベル
        <select
          className={selectClass}
          value={editLevelId}
          onChange={(event) => setEditLevelId(event.target.value)}
          disabled={saveState === "saving"}
        >
          {levels.length === 0 ? (
            <option value={editLevelId}>{levelLabel(editLevelId)}</option>
          ) : (
            levels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.label}
              </option>
            ))
          )}
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-[13px] font-semibold text-slate-600">
          認定日
          <input
            className={inputClass}
            type="date"
            value={editCertifiedAt}
            onChange={(event) => setEditCertifiedAt(event.target.value)}
            required
            disabled={saveState === "saving"}
          />
        </label>
        <label className="block text-[13px] font-semibold text-slate-600">
          有効期限
          <input
            className={inputClass}
            type="date"
            value={editExpiresAt}
            onChange={(event) => setEditExpiresAt(event.target.value)}
            required
            disabled={saveState === "saving"}
          />
        </label>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
        <p
          className="text-[11px] font-semibold tracking-[0.16em]"
          style={{ color: GOLD }}
        >
          CONTINUING EDUCATION
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="block text-[13px] font-semibold text-slate-600">
            継続教育の必要時間
            <input
              className={inputClass}
              type="number"
              min={0}
              step={1}
              value={editRequiredHours}
              onChange={(event) => setEditRequiredHours(event.target.value)}
              disabled={saveState === "saving" || !hasLicense}
            />
          </label>
          <label className="block text-[13px] font-semibold text-slate-600">
            継続教育の修了時間
            <input
              className={inputClass}
              type="number"
              min={0}
              step={1}
              value={editCompletedHours}
              onChange={(event) => setEditCompletedHours(event.target.value)}
              disabled={saveState === "saving" || !hasLicense}
            />
          </label>
        </div>
        <div className="mt-4">
          <EducationBar
            required={Number(editRequiredHours) || 0}
            completed={Number(editCompletedHours) || 0}
          />
          <p className="mt-2 text-[12px] text-slate-500">
            表示上の進捗は {liveProgressPercent}%
            （必要時間以上でも100%が上限）
          </p>
        </div>
        {!hasLicense ? (
          <p className="mt-3 text-[12px] text-amber-800">
            ライセンス未発行のため継続教育は編集できません。
          </p>
        ) : null}
      </div>

      <label className="block text-[13px] font-semibold text-slate-600">
        更新申請状況
        <select
          className={selectClass}
          value={editRenewalStatus}
          onChange={(event) => {
            const value = event.target.value;
            if (isInstructorRenewalStatus(value)) {
              setEditRenewalStatus(value);
            }
          }}
          disabled={saveState === "saving" || !hasLicense}
        >
          {INSTRUCTOR_RENEWAL_STATUSES.map((status) => (
            <option key={status} value={status}>
              {INSTRUCTOR_RENEWAL_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </label>

      {fieldErrors.length > 0 ? (
        <ul className="space-y-1 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-900">
          {fieldErrors.map((error) => (
            <li key={error}>・{error}</li>
          ))}
        </ul>
      ) : null}

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-4">
        <p className="text-[13px] font-semibold text-slate-700">管理用リンク</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <AdminLinkButton
            href="/license"
            label="My Licenseを開く"
            disabled={!hasLicense}
            reason="ライセンスが未発行のため開けません"
          />
          <AdminLinkButton
            href={verifyHref || "#"}
            label="公開認証ページを開く"
            disabled={!verificationCode}
            reason="確認コードがないため開けません"
          />
          <AdminLinkButton
            href={certificateHref || "#"}
            label="デジタル認定証を開く"
            disabled={!hasLicense}
            reason="ライセンスが未発行のため開けません"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button
          type="submit"
          disabled={saveState === "saving"}
          className="min-h-12 w-full sm:w-auto"
        >
          {saveState === "saving" ? "保存中…" : "保存する"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="min-h-12 w-full sm:w-auto"
          onClick={onClose}
          disabled={saveState === "saving"}
        >
          閉じる
        </Button>
      </div>
    </form>
  );
}

function LicenseManagementCard({
  selected,
  verificationCode,
  busy,
  onRequestAction,
}: {
  selected: AdminCertifiedInstructorListItem;
  verificationCode: string;
  busy: boolean;
  onRequestAction: (kind: LicenseActionKind) => void;
}) {
  const license = selected.license;
  const storedStatus = license?.status ?? null;
  const displayStatus = effectiveStatus(selected);
  const remaining = remainingDaysForItem(selected);

  const isUnissued = !license;
  const isSuspended = Boolean(license && storedStatus === "suspended");
  const isExpired = Boolean(
    license &&
      !isSuspended &&
      (storedStatus === "expired" || displayStatus === "expired"),
  );
  const isActive = Boolean(
    license &&
      !isSuspended &&
      !isExpired &&
      storedStatus !== "withdrawn" &&
      (storedStatus === "active" ||
        storedStatus === "expiring" ||
        displayStatus === "active" ||
        displayStatus === "expiring"),
  );

  return (
    <SectionCard title="ライセンス管理" eyebrow="LICENSE" className="mt-6">
      <dl className="grid gap-3 sm:grid-cols-2">
        <ReadonlyRow label="認定番号">
          <span className="font-mono">
            {license?.licenseNumber || selected.instructorNumber || "—"}
          </span>
        </ReadonlyRow>
        <ReadonlyRow label="確認コード">
          <span className="break-all font-mono text-[13px]">
            {verificationCode || "—"}
          </span>
        </ReadonlyRow>
        <ReadonlyRow label="認定日">
          {formatJaDate(certifiedAtForItem(selected))}
        </ReadonlyRow>
        <ReadonlyRow label="有効期限">
          {formatJaDate(expiresAtForItem(selected))}
        </ReadonlyRow>
        <ReadonlyRow label="現在の状態">
          {statusLabelForItem(selected)}
        </ReadonlyRow>
        <ReadonlyRow label="残り日数">
          <RemainingDaysCell item={selected} />
        </ReadonlyRow>
      </dl>

      {isSuspended && remaining != null && remaining < 0 ? (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] leading-6 text-amber-900">
          有効期限が切れています。再開前に有効期限を更新してください。
        </p>
      ) : null}

      <div className="mt-5 flex flex-col gap-3">
        {isUnissued ? (
          <Button
            type="button"
            className="min-h-12 w-full"
            disabled={busy}
            onClick={() => onRequestAction("issue")}
          >
            ライセンス発行
          </Button>
        ) : null}
        {isActive ? (
          <>
            <Button
              type="button"
              className="min-h-12 w-full"
              disabled={busy}
              onClick={() => onRequestAction("suspend")}
            >
              停止する
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="min-h-12 w-full"
              disabled={busy}
              onClick={() => onRequestAction("renew")}
            >
              1年間更新
            </Button>
          </>
        ) : null}
        {isSuspended ? (
          <>
            <Button
              type="button"
              className="min-h-12 w-full"
              disabled={busy || (remaining != null && remaining < 0)}
              onClick={() => onRequestAction("resume")}
            >
              再開する
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="min-h-12 w-full"
              disabled={busy}
              onClick={() => onRequestAction("renew")}
            >
              1年間更新
            </Button>
          </>
        ) : null}
        {isExpired ? (
          <Button
            type="button"
            variant="secondary"
            className="min-h-12 w-full"
            disabled={busy}
            onClick={() => onRequestAction("renew")}
          >
            1年間更新
          </Button>
        ) : null}
      </div>
    </SectionCard>
  );
}

export default function AdminCertifiedInstructorsPage() {
  const [instructors, setInstructors] = useState<
    AdminCertifiedInstructorListItem[]
  >([]);
  const [levels, setLevels] = useState<CertificationLevelRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const [licenseBusy, setLicenseBusy] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expiringSoonOnly, setExpiringSoonOnly] = useState(false);
  const [unlinkedOnly, setUnlinkedOnly] = useState(false);

  const [editPublicName, setEditPublicName] = useState("");
  const [editLegalName, setEditLegalName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editLevelId, setEditLevelId] = useState("instructor");
  const [editCertifiedAt, setEditCertifiedAt] = useState(todayIso());
  const [editExpiresAt, setEditExpiresAt] = useState(todayIso());
  const [editRequiredHours, setEditRequiredHours] = useState("12");
  const [editCompletedHours, setEditCompletedHours] = useState("0");
  const [editRenewalStatus, setEditRenewalStatus] =
    useState<InstructorRenewalStatus>("not_requested");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [instructorRes, levelRes] = await Promise.all([
        fetch("/api/admin/certified-instructors", { cache: "no-store" }),
        fetch("/api/admin/ops?resource=levels", { cache: "no-store" }),
      ]);
      const json = (await instructorRes.json()) as {
        instructors?: AdminCertifiedInstructorListItem[];
        error?: string;
      };
      const levelJson = (await levelRes.json()) as {
        levels?: CertificationLevelRecord[];
      };
      if (instructorRes.status === 401) {
        window.location.href = `/login?redirect=${encodeURIComponent("/admin/instructors")}`;
        return;
      }
      if (instructorRes.status === 403) {
        window.location.href = "/forbidden";
        return;
      }
      if (!instructorRes.ok) throw new Error(json.error ?? "取得に失敗しました");
      const list = json.instructors ?? [];
      setInstructors(list);
      setLevels(levelJson.levels ?? []);
      setSelectedId((prev) => {
        if (prev && list.some((item) => item.instructorId === prev)) return prev;
        return null;
      });
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "取得に失敗しました",
      );
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
    return instructors.filter((item) => {
      if (q) {
        const hay = [
          item.activityName,
          item.legalName,
          item.email,
          item.instructorNumber,
          item.license?.licenseNumber ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      const status = effectiveStatus(item);
      if (statusFilter !== "all") {
        if (statusFilter === "unissued") {
          if (item.license) return false;
        } else if (status !== statusFilter) {
          return false;
        }
      }

      if (unlinkedOnly && item.userId.trim()) return false;

      if (expiringSoonOnly) {
        const expires = item.license?.expiresAt || item.renewsAt || "";
        if (!expires) return false;
        const days = daysUntil(expires);
        if (days < 0 || days > 30) return false;
        if (status === "suspended" || status === "withdrawn") return false;
      }

      return true;
    });
  }, [
    instructors,
    query,
    statusFilter,
    expiringSoonOnly,
    unlinkedOnly,
  ]);

  const selected = useMemo(
    () =>
      instructors.find((item) => item.instructorId === selectedId) ?? null,
    [instructors, selectedId],
  );

  useEffect(() => {
    if (!selected) {
      setEditPublicName("");
      setEditLegalName("");
      setEditEmail("");
      setEditLevelId("instructor");
      setEditCertifiedAt(todayIso());
      setEditExpiresAt(todayIso());
      setEditRequiredHours("12");
      setEditCompletedHours("0");
      setEditRenewalStatus("not_requested");
      setFieldErrors([]);
      return;
    }
    setEditPublicName(
      selected.activityName === "—" ? "" : selected.activityName,
    );
    setEditLegalName(selected.legalName);
    setEditEmail(selected.email);
    setEditLevelId(
      selected.license?.certificationLevelId ||
        selected.levelId ||
        "instructor",
    );
    setEditCertifiedAt(
      selected.license?.issuedAt || selected.certifiedAt || todayIso(),
    );
    setEditExpiresAt(
      selected.license?.expiresAt || selected.renewsAt || todayIso(),
    );
    setEditRequiredHours(
      String(selected.license?.requiredEducationHours ?? 12),
    );
    setEditCompletedHours(
      String(selected.license?.completedEducationHours ?? 0),
    );
    setEditRenewalStatus(selected.license?.renewalStatus ?? "not_requested");
    setSaveState("idle");
    setSaveMessage(null);
    setFieldErrors([]);
  }, [selected]);

  const liveProgressPercent = educationProgressPercent(
    Number(editRequiredHours) || 0,
    Number(editCompletedHours) || 0,
  );

  const selectInstructor = (id: string) => {
    setSelectedId(id);
    setSaveState("idle");
    setSaveMessage(null);
    setFieldErrors([]);
  };

  const closeDetail = () => {
    if (saveState === "saving" || licenseBusy) return;
    setSelectedId(null);
    setSaveState("idle");
    setSaveMessage(null);
    setFieldErrors([]);
    setConfirmDialog(null);
  };

  const requestLicenseAction = (kind: LicenseActionKind) => {
    if (!selected || licenseBusy || saveState === "saving") return;
    if (kind === "issue") {
      setConfirmDialog({
        kind,
        title: "ライセンス発行の確認",
        message:
          "この講師にSleep Wellness Instructorライセンスを発行しますか？",
      });
      return;
    }
    if (kind === "suspend") {
      setConfirmDialog({
        kind,
        title: "ライセンス停止の確認",
        message:
          "このライセンスを停止しますか？\n停止中は公開認証ページで「無効」と表示されます。",
      });
      return;
    }
    if (kind === "resume") {
      setConfirmDialog({
        kind,
        title: "ライセンス再開の確認",
        message: "このライセンスを再開しますか？",
      });
      return;
    }
    setConfirmDialog({
      kind: "renew",
      title: "1年間更新の確認",
      message: "このライセンスを1年間更新しますか？",
    });
  };

  const runLicenseAction = async (kind: LicenseActionKind) => {
    if (!selected) return;
    setConfirmDialog(null);
    setLicenseBusy(true);
    setSaveMessage(null);
    setSaveState("idle");

    try {
      if (kind === "issue") {
        const response = await fetch("/api/admin/certified-instructors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "issue_license",
            instructorId: selected.instructorId,
            levelId: editLevelId || selected.levelId || "instructor",
            licenseNumber:
              selected.instructorNumber ||
              selected.license?.licenseNumber ||
              "",
            issuedAt: editCertifiedAt,
            expiresAt: editExpiresAt,
            requiredEducationHours: 12,
            completedEducationHours: 0,
          }),
        });
        const json = (await response.json()) as { error?: string };
        if (response.status === 401) {
          window.location.href = `/login?redirect=${encodeURIComponent("/admin/instructors")}`;
          return;
        }
        if (response.status === 403) {
          window.location.href = "/forbidden";
          return;
        }
        if (!response.ok) {
          throw new Error(json.error ?? "ライセンスの発行に失敗しました");
        }
        await load();
        setSaveState("success");
        setSaveMessage("ライセンスを発行しました");
        return;
      }

      if (!selected.license?.id) {
        throw new Error("ライセンスがありません");
      }

      if (kind === "suspend" || kind === "resume") {
        if (kind === "resume" && remainingDaysForItem(selected) != null && remainingDaysForItem(selected)! < 0) {
          throw new Error(
            "有効期限が切れています。再開前に有効期限を更新してください。",
          );
        }
        const response = await fetch("/api/admin/certified-instructors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "set_license_status",
            licenseId: selected.license.id,
            status: kind === "suspend" ? "suspended" : "active",
          }),
        });
        const json = (await response.json()) as { error?: string };
        if (response.status === 401) {
          window.location.href = `/login?redirect=${encodeURIComponent("/admin/instructors")}`;
          return;
        }
        if (response.status === 403) {
          window.location.href = "/forbidden";
          return;
        }
        if (!response.ok) {
          throw new Error(json.error ?? "操作に失敗しました");
        }
        await load();
        setSaveState("success");
        setSaveMessage(
          kind === "suspend"
            ? "ライセンスを停止しました"
            : "ライセンスを再開しました",
        );
        return;
      }

      const license = selected.license;
      const remaining = daysUntil(license.expiresAt);
      const nextExpires = addYearsIso(
        remaining >= 0 ? license.expiresAt : todayIso(),
        1,
      );
      const response = await fetch("/api/admin/licenses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: license.id,
          action: "save",
          instructorId: selected.instructorId,
          certificationLevelId: license.certificationLevelId,
          certificationName: license.certificationName,
          licenseNumber: license.licenseNumber,
          issuedAt: license.issuedAt,
          expiresAt: nextExpires,
          status: "active",
          requiredEducationHours: license.requiredEducationHours,
          completedEducationHours: license.completedEducationHours,
          renewalStatus: license.renewalStatus,
          adminNote: license.adminNote,
        }),
      });
      const json = (await response.json()) as { error?: string };
      if (response.status === 401) {
        window.location.href = `/login?redirect=${encodeURIComponent("/admin/instructors")}`;
        return;
      }
      if (response.status === 403) {
        window.location.href = "/forbidden";
        return;
      }
      if (!response.ok) {
        throw new Error(json.error ?? "更新に失敗しました");
      }
      await load();
      setSaveState("success");
      setSaveMessage("ライセンスを1年間更新しました");
    } catch (error) {
      setSaveState("error");
      setSaveMessage(
        error instanceof Error ? error.message : "操作に失敗しました",
      );
    } finally {
      setLicenseBusy(false);
    }
  };

  useEffect(() => {
    if (!selectedId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDetail();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId, saveState]);

  const validate = (): string[] => {
    const errors: string[] = [];
    if (!editPublicName.trim()) errors.push("活動名は必須です");
    if (!editLegalName.trim()) errors.push("本名は必須です");
    if (!editEmail.trim()) {
      errors.push("メールアドレスは必須です");
    } else if (!EMAIL_RE.test(editEmail.trim())) {
      errors.push("メールアドレスの形式が正しくありません");
    }
    if (editExpiresAt < editCertifiedAt) {
      errors.push("有効期限が認定日より前にならないようにしてください");
    }
    const required = Number(editRequiredHours);
    const completed = Number(editCompletedHours);
    if (!Number.isFinite(required) || required < 0) {
      errors.push("継続教育の必要時間は0以上で入力してください");
    }
    if (!Number.isFinite(completed) || completed < 0) {
      errors.push("継続教育の修了時間は0以上で入力してください");
    }
    return errors;
  };

  const onSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || saveState === "saving") return;

    const errors = validate();
    setFieldErrors(errors);
    if (errors.length > 0) {
      setSaveState("error");
      setSaveMessage("更新に失敗しました。入力内容と権限を確認してください");
      return;
    }

    setSaveState("saving");
    setSaveMessage("保存中…");
    try {
      const response = await fetch("/api/admin/certified-instructors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert_instructor",
          instructor: {
            id: selected.instructorId,
            email: editEmail.trim(),
            publicName: editPublicName.trim(),
            legalName: editLegalName.trim(),
            levelId: editLevelId || "instructor",
            instructorNumber:
              selected.license?.licenseNumber ||
              selected.instructorNumber ||
              "",
            certifiedAt: editCertifiedAt,
            renewsAt: editExpiresAt,
            adminMemo: selected.adminMemo,
            issueLicense: Boolean(selected.license),
            licenseStatus: selected.license?.status ?? "active",
            requiredEducationHours: Number(editRequiredHours),
            completedEducationHours: Number(editCompletedHours),
            renewalStatus: editRenewalStatus,
          },
        }),
      });
      const json = (await response.json()) as {
        instructor?: AdminCertifiedInstructorListItem;
        error?: string;
      };
      if (response.status === 401) {
        window.location.href = `/login?redirect=${encodeURIComponent("/admin/instructors")}`;
        return;
      }
      if (response.status === 403) {
        window.location.href = "/forbidden";
        return;
      }
      if (!response.ok) {
        throw new Error(json.error ?? "更新に失敗しました");
      }

      const updated = json.instructor;
      if (updated) {
        setInstructors((prev) =>
          prev.map((item) =>
            item.instructorId === updated.instructorId ? updated : item,
          ),
        );
      } else {
        await load();
      }
      setSaveState("success");
      setSaveMessage("認定講師情報を更新しました");
      setFieldErrors([]);
    } catch {
      setSaveState("error");
      setSaveMessage("更新に失敗しました。入力内容と権限を確認してください");
    }
  };

  const saveBannerClass =
    saveState === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : saveState === "error"
        ? "border-rose-200 bg-rose-50 text-rose-900"
        : saveState === "saving"
          ? "border-slate-200 bg-white text-slate-700"
          : "border-slate-200 bg-white text-slate-700";

  const verificationCode =
    selected?.license?.verificationCode?.trim() ?? "";
  const verifyHref = verificationCode
    ? licenseVerificationUrl(verificationCode)
    : "";
  const certificateHref = selected
    ? `/admin/instructors/certificate?id=${encodeURIComponent(selected.instructorId)}`
    : "";
  const hasLicense = Boolean(selected?.license);

  const levelLabel = (levelId: string) => {
    const found = levels.find((level) => level.id === levelId);
    return found?.label || levelId || "—";
  };

  return (
    <AdminShell
      title="認定講師一覧"
      description="活動名・本名・ライセンス状態を管理します（admin / super_admin 限定）。"
    >
      <div className="mb-4 space-y-3 pb-[calc(var(--sw-beta-chrome-offset)+1rem)]">
        {loadError ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[14px] text-rose-900">
            {loadError}
          </p>
        ) : null}
        {saveMessage ? (
          <p
            className={`rounded-2xl border px-4 py-3 text-[14px] ${saveBannerClass}`}
            role="status"
          >
            {saveMessage}
          </p>
        ) : null}

        <SectionCard title="認定講師一覧" eyebrow="LIST">
            <div className="space-y-3">
              <label className="block text-[13px] font-semibold text-slate-600">
                検索（活動名・本名・メール・認定番号）
                <input
                  className={inputClass}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="例: TAKA / 若林 / @email"
                  autoComplete="off"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-[13px] font-semibold text-slate-600">
                  ライセンス状態
                  <select
                    className={selectClass}
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  >
                    <option value="all">すべて</option>
                    <option value="unissued">未発行</option>
                    {INSTRUCTOR_LICENSE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {INSTRUCTOR_LICENSE_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-col justify-end gap-2 pb-1">
                  <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-[14px] text-slate-700">
                    <input
                      type="checkbox"
                      className="h-5 w-5"
                      checked={expiringSoonOnly}
                      onChange={(event) =>
                        setExpiringSoonOnly(event.target.checked)
                      }
                    />
                    有効期限30日以内
                  </label>
                  <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-[14px] text-slate-700">
                    <input
                      type="checkbox"
                      className="h-5 w-5"
                      checked={unlinkedOnly}
                      onChange={(event) =>
                        setUnlinkedOnly(event.target.checked)
                      }
                    />
                    アカウント未紐づけ
                  </label>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="mt-4 space-y-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="mt-4 text-[14px] text-slate-500">
                条件に一致する認定講師がいません。
              </p>
            ) : (
              <>
                <div className="mt-4 hidden overflow-x-auto md:block">
                  <table className="min-w-full text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2 pr-3 font-semibold">活動名</th>
                        <th className="py-2 pr-3 font-semibold">本名</th>
                        <th className="py-2 pr-3 font-semibold">メール</th>
                        <th className="py-2 pr-3 font-semibold">紐づけ</th>
                        <th className="py-2 pr-3 font-semibold">資格</th>
                        <th className="py-2 pr-3 font-semibold">番号</th>
                        <th className="py-2 pr-3 font-semibold">認定日</th>
                        <th className="py-2 pr-3 font-semibold">有効期限</th>
                        <th className="py-2 pr-3 font-semibold">残り日数</th>
                        <th className="py-2 pr-3 font-semibold">状態</th>
                        <th className="py-2 pr-3 font-semibold">継続教育</th>
                        <th className="py-2 pr-3 font-semibold">更新申請</th>
                        <th className="sticky right-0 z-10 bg-[#fafaf8] py-2 pl-3 font-semibold shadow-[-8px_0_12px_-10px_rgba(7,20,38,0.18)]">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((item) => {
                        const license = item.license;
                        const active = item.instructorId === selectedId;
                        return (
                          <tr
                            key={item.instructorId}
                            className="border-b border-slate-100"
                            style={
                              active
                                ? { backgroundColor: SURFACE_WARM }
                                : undefined
                            }
                          >
                            <td
                              className="py-3 pr-3 font-semibold"
                              style={{ color: NAVY }}
                            >
                              {item.activityName}
                            </td>
                            <td className="py-3 pr-3">
                              {formatLegalNameDisplay(item.legalName)}
                            </td>
                            <td className="py-3 pr-3">{item.email || "—"}</td>
                            <td className="py-3 pr-3">
                              {accountLinkLabel(item.userId)}
                            </td>
                            <td className="py-3 pr-3">
                              {resolveCertificationName(
                                license?.certificationName,
                              )}
                            </td>
                            <td className="py-3 pr-3 font-mono text-[12px]">
                              {license?.licenseNumber ||
                                item.instructorNumber ||
                                "—"}
                            </td>
                            <td className="py-3 pr-3">
                              {formatJaDate(certifiedAtForItem(item))}
                            </td>
                            <td className="py-3 pr-3">
                              {formatJaDate(expiresAtForItem(item))}
                            </td>
                            <td className="py-3 pr-3">
                              <RemainingDaysCell item={item} />
                            </td>
                            <td className="py-3 pr-3">
                              {statusLabelForItem(item)}
                            </td>
                            <td className="py-3 pr-3 min-w-[140px]">
                              {license ? (
                                <EducationBar
                                  required={license.requiredEducationHours}
                                  completed={license.completedEducationHours}
                                />
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="py-3 pr-3">
                              {license
                                ? INSTRUCTOR_RENEWAL_STATUS_LABELS[
                                    license.renewalStatus
                                  ]
                                : "—"}
                            </td>
                            <td
                              className="sticky right-0 z-10 py-3 pl-3 shadow-[-8px_0_12px_-10px_rgba(7,20,38,0.12)]"
                              style={{
                                backgroundColor: active ? SURFACE_WARM : "white",
                              }}
                            >
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="whitespace-nowrap"
                                onClick={() =>
                                  selectInstructor(item.instructorId)
                                }
                              >
                                詳細・編集
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <ul className="mt-4 space-y-3 md:hidden">
                  {filtered.map((item) => {
                    const license = item.license;
                    const active = item.instructorId === selectedId;
                    return (
                      <li key={item.instructorId}>
                        <article
                          className="rounded-3xl border px-4 py-4 transition"
                          style={{
                            borderColor: active
                              ? NAVY
                              : "rgba(15, 23, 42, 0.1)",
                            backgroundColor: active ? SURFACE_WARM : "white",
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p
                                className="text-[15px] font-semibold"
                                style={{ color: NAVY }}
                              >
                                活動名：{item.activityName}
                              </p>
                              <p className="mt-1 text-[13px] text-slate-600">
                                本名：{formatLegalNameDisplay(item.legalName)}
                              </p>
                            </div>
                            <span
                              className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
                              style={{ backgroundColor: NAVY }}
                            >
                              {statusLabelForItem(item)}
                            </span>
                          </div>
                          <dl className="mt-3 grid grid-cols-1 gap-1.5 text-[12px] text-slate-600">
                            <div>メール：{item.email || "—"}</div>
                            <div>
                              資格：
                              {resolveCertificationName(
                                license?.certificationName,
                              )}
                            </div>
                            <div>
                              番号：
                              {license?.licenseNumber ||
                                item.instructorNumber ||
                                "—"}
                            </div>
                            <div>
                              有効期限：
                              {formatJaDate(expiresAtForItem(item))}
                            </div>
                            <div>
                              残り日数：
                              <RemainingDaysCell item={item} />
                            </div>
                          </dl>
                          {license ? (
                            <div className="mt-3">
                              <EducationBar
                                required={license.requiredEducationHours}
                                completed={license.completedEducationHours}
                              />
                            </div>
                          ) : null}
                          <div className="mt-4 flex justify-end">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="min-h-11"
                              onClick={() =>
                                selectInstructor(item.instructorId)
                              }
                            >
                              詳細・編集
                            </Button>
                          </div>
                        </article>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </SectionCard>

        {selected ? (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-[#071426]/45 p-0 sm:items-center sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="instructor-edit-title"
            onClick={closeDetail}
          >
            <div
              className="max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] border border-slate-200 bg-white shadow-[0_30px_80px_-40px_rgba(7,20,38,0.55)] sm:max-w-3xl sm:rounded-[28px]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
                <div>
                  <p
                    className="text-[11px] font-semibold tracking-[0.16em]"
                    style={{ color: GOLD }}
                  >
                    DETAIL
                  </p>
                  <h2
                    id="instructor-edit-title"
                    className="mt-1 text-lg font-semibold tracking-[-0.03em]"
                    style={{ color: NAVY }}
                  >
                    講師詳細・編集
                  </h2>
                  <p className="mt-1 text-[13px] text-slate-600">
                    {selected.activityName} /{" "}
                    {formatLegalNameDisplay(selected.legalName)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={closeDetail}
                  disabled={saveState === "saving"}
                  aria-label="閉じる"
                >
                  閉じる
                </Button>
              </div>
              <div className="px-5 py-5 sm:px-6 sm:py-6">
                <InstructorEditForm
                  selected={selected}
                  editPublicName={editPublicName}
                  setEditPublicName={setEditPublicName}
                  editLegalName={editLegalName}
                  setEditLegalName={setEditLegalName}
                  editEmail={editEmail}
                  setEditEmail={setEditEmail}
                  editLevelId={editLevelId}
                  setEditLevelId={setEditLevelId}
                  editCertifiedAt={editCertifiedAt}
                  setEditCertifiedAt={setEditCertifiedAt}
                  editExpiresAt={editExpiresAt}
                  setEditExpiresAt={setEditExpiresAt}
                  editRequiredHours={editRequiredHours}
                  setEditRequiredHours={setEditRequiredHours}
                  editCompletedHours={editCompletedHours}
                  setEditCompletedHours={setEditCompletedHours}
                  editRenewalStatus={editRenewalStatus}
                  setEditRenewalStatus={setEditRenewalStatus}
                  saveState={saveState}
                  fieldErrors={fieldErrors}
                  verificationCode={verificationCode}
                  verifyHref={verifyHref}
                  certificateHref={certificateHref}
                  hasLicense={hasLicense}
                  liveProgressPercent={liveProgressPercent}
                  levels={levels}
                  levelLabel={levelLabel}
                  onSave={onSave}
                  onClose={closeDetail}
                />
                <LicenseManagementCard
                  selected={selected}
                  verificationCode={verificationCode}
                  busy={licenseBusy || saveState === "saving"}
                  onRequestAction={requestLicenseAction}
                />
              </div>
            </div>
          </div>
        ) : null}

        {confirmDialog ? (
          <div
            className="fixed inset-0 z-[60] flex items-end justify-center bg-[#071426]/50 p-0 sm:items-center sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="license-confirm-title"
            onClick={() => {
              if (!licenseBusy) setConfirmDialog(null);
            }}
          >
            <div
              className="w-full max-w-md rounded-t-[28px] border border-slate-200 bg-white p-5 shadow-[0_30px_80px_-40px_rgba(7,20,38,0.55)] sm:rounded-[28px] sm:p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <h3
                id="license-confirm-title"
                className="text-lg font-semibold tracking-[-0.03em]"
                style={{ color: NAVY }}
              >
                {confirmDialog.title}
              </h3>
              <p className="mt-3 whitespace-pre-line text-[14px] leading-7 text-slate-700">
                {confirmDialog.message}
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
                <Button
                  type="button"
                  className="min-h-12 w-full sm:w-auto"
                  disabled={licenseBusy}
                  onClick={() => void runLicenseAction(confirmDialog.kind)}
                >
                  {licenseBusy ? "処理中…" : "実行する"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-12 w-full sm:w-auto"
                  disabled={licenseBusy}
                  onClick={() => setConfirmDialog(null)}
                >
                  キャンセル
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <p className="text-[12px] text-slate-500">
          一般ユーザー・認定講師本人はこのページにアクセスできません。API
          でも requireAdminProfile により管理者のみ操作できます。
        </p>
      </div>
    </AdminShell>
  );
}
