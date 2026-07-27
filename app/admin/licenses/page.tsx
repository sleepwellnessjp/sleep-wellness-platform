"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/AdminShell";
import Button from "@/components/ui/Button";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY, SURFACE_WARM } from "@/components/ui/tokens";
import {
  adminLicenseStatusColor,
  adminLicenseStatusLabel,
  daysUntil,
  formatJaDate,
  INSTRUCTOR_LICENSE_STATUSES,
  INSTRUCTOR_LICENSE_STATUS_LABELS,
  INSTRUCTOR_RENEWAL_STATUSES,
  INSTRUCTOR_RENEWAL_STATUS_LABELS,
  resolveCertificationName,
  SLEEP_WELLNESS_INSTRUCTOR_CERT_NAME,
  todayIso,
} from "@/lib/instructor-license/constants";
import type {
  AdminInstructorLicenseListItem,
  InstructorLicenseStatus,
  InstructorRenewalStatus,
} from "@/lib/instructor-license/types";
import type { CertificationLevelRecord } from "@/lib/ops/types";

const inputClass =
  "mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[16px] text-[#071426] outline-none transition focus:border-[#315f68] focus:ring-4 focus:ring-[#315f68]/10 sm:min-h-0 sm:text-[15px]";

type Candidate = {
  id: string;
  activityName: string;
  legalName: string;
  email: string;
  levelId: string;
  instructorNumber: string;
  certifiedAt: string;
  renewsAt: string;
};

export default function AdminLicensesPage() {
  const [licenses, setLicenses] = useState<AdminInstructorLicenseListItem[]>(
    [],
  );
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [levels, setLevels] = useState<CertificationLevelRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [nameQ, setNameQ] = useState("");
  const [emailQ, setEmailQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [expiryFilter, setExpiryFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [editLevelId, setEditLevelId] = useState("");
  const [editCertName, setEditCertName] = useState("");
  const [editNumber, setEditNumber] = useState("");
  const [editIssued, setEditIssued] = useState("");
  const [editExpires, setEditExpires] = useState("");
  const [editStatus, setEditStatus] =
    useState<InstructorLicenseStatus>("active");
  const [editRequiredHours, setEditRequiredHours] = useState("0");
  const [editCompletedHours, setEditCompletedHours] = useState("0");
  const [editRenewal, setEditRenewal] =
    useState<InstructorRenewalStatus>("not_requested");
  const [editNote, setEditNote] = useState("");

  const [newInstructorId, setNewInstructorId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams({
        nameQ,
        emailQ,
        status: statusFilter,
        level: levelFilter,
        expiry: expiryFilter,
        candidates: "1",
      });
      const [licenseRes, levelRes] = await Promise.all([
        fetch(`/api/admin/licenses?${params}`, { cache: "no-store" }),
        fetch("/api/admin/ops?resource=levels", { cache: "no-store" }),
      ]);
      const licenseJson = (await licenseRes.json()) as {
        licenses?: AdminInstructorLicenseListItem[];
        candidates?: Candidate[];
        error?: string;
      };
      const levelJson = (await levelRes.json()) as {
        levels?: CertificationLevelRecord[];
        error?: string;
      };
      if (!licenseRes.ok) {
        throw new Error(licenseJson.error ?? "取得に失敗しました");
      }
      const list = licenseJson.licenses ?? [];
      setLicenses(list);
      setCandidates(licenseJson.candidates ?? []);
      setLevels(levelJson.levels ?? []);
      setSelectedId((prev) => {
        if (prev && list.some((item) => item.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "取得に失敗しました");
      setLicenses([]);
    } finally {
      setLoading(false);
    }
  }, [nameQ, emailQ, statusFilter, levelFilter, expiryFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => licenses.find((item) => item.id === selectedId) ?? null,
    [licenses, selectedId],
  );

  useEffect(() => {
    if (!selected) return;
    setEditLevelId(selected.certificationLevelId);
    setEditCertName(resolveCertificationName(selected.certificationName));
    setEditNumber(selected.licenseNumber);
    setEditIssued(selected.issuedAt);
    setEditExpires(selected.expiresAt);
    setEditStatus(selected.status);
    setEditRequiredHours(String(selected.requiredEducationHours));
    setEditCompletedHours(String(selected.completedEducationHours));
    setEditRenewal(selected.renewalStatus);
    setEditNote(selected.adminNote);
  }, [selected]);

  const saveSelected = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/licenses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          action: "save",
          instructorId: selected.instructorId,
          certificationLevelId: editLevelId,
          certificationName: editCertName,
          licenseNumber: editNumber,
          issuedAt: editIssued,
          expiresAt: editExpires,
          status: editStatus,
          requiredEducationHours: Number(editRequiredHours) || 0,
          completedEducationHours: Number(editCompletedHours) || 0,
          renewalStatus: editRenewal,
          adminNote: editNote,
        }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "保存に失敗しました");
      setMessage("保存しました");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const decideRenewal = async (action: "approve_renewal" | "reject_renewal") => {
    if (!selected) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/licenses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          action,
          adminNote: editNote,
        }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "処理に失敗しました");
      setMessage(
        action === "approve_renewal"
          ? "更新申請を承認しました"
          : "更新申請を却下しました",
      );
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "処理に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const createFromCandidate = async () => {
    const candidate = candidates.find((item) => item.id === newInstructorId);
    if (!candidate) {
      setMessage("認定講師を選択してください");
      return;
    }
    if (
      !window.confirm(
        "この講師にSleep Wellness Instructorライセンスを発行しますか？",
      )
    ) {
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/certified-instructors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "issue_license",
          instructorId: candidate.id,
          levelId: candidate.levelId,
          issuedAt: candidate.certifiedAt || todayIso(),
          expiresAt: candidate.renewsAt || todayIso(),
        }),
      });
      const json = (await response.json()) as {
        license?: AdminInstructorLicenseListItem;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(json.error ?? "ライセンスの発行に失敗しました");
      }
      setMessage("ライセンスを発行しました");
      setNewInstructorId("");
      await load();
      if (json.license?.id) setSelectedId(json.license.id);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "ライセンスの発行に失敗しました",
      );
    } finally {
      setSaving(false);
    }
  };

  const runQuickAction = async (
    action: "suspend" | "resume" | "renew",
  ) => {
    if (!selected) return;
    const confirmMessage =
      action === "suspend"
        ? "このライセンスを停止しますか？\n停止中は公開認証ページで「無効」と表示されます。"
        : action === "resume"
          ? "このライセンスを再開しますか？"
          : "このライセンスを1年間更新しますか？";
    if (!window.confirm(confirmMessage)) return;

    setSaving(true);
    setMessage(null);
    try {
      const body =
        action === "renew"
          ? { action: "renew_one_year", licenseId: selected.id }
          : {
              action: "set_license_status",
              licenseId: selected.id,
              status: action === "suspend" ? "suspended" : "active",
            };
      const response = await fetch("/api/admin/certified-instructors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "操作に失敗しました");
      setMessage(
        action === "suspend"
          ? "ライセンスを停止しました"
          : action === "resume"
            ? "ライセンスを再開しました"
            : "ライセンスを1年間更新しました",
      );
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell
      eyebrow="LICENSE"
      title="ライセンス管理"
      description="認定講師のライセンス・継続教育・更新申請を本部から管理します。"
    >
      {message ? (
        <p className="mb-4 text-sm" style={{ color: GOLD }}>
          {message}
        </p>
      ) : null}

      <SectionCard className="mb-6" title="検索・絞り込み" eyebrow="FILTER">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-[12px] font-semibold text-slate-500">
            氏名検索
            <input
              className={inputClass}
              value={nameQ}
              onChange={(e) => setNameQ(e.target.value)}
              placeholder="活動名 / 本名"
            />
          </label>
          <label className="text-[12px] font-semibold text-slate-500">
            メール検索
            <input
              className={inputClass}
              value={emailQ}
              onChange={(e) => setEmailQ(e.target.value)}
              placeholder="email@"
            />
          </label>
          <label className="text-[12px] font-semibold text-slate-500">
            認定レベル
            <select
              className={inputClass}
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
            >
              <option value="all">すべて</option>
              {levels.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[12px] font-semibold text-slate-500">
            状態
            <select
              className={inputClass}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">すべて</option>
              {INSTRUCTOR_LICENSE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {INSTRUCTOR_LICENSE_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[12px] font-semibold text-slate-500">
            更新期限
            <select
              className={inputClass}
              value={expiryFilter}
              onChange={(e) => setExpiryFilter(e.target.value)}
            >
              <option value="all">すべて</option>
              <option value="within_90">90日以内</option>
              <option value="over_90">90日超</option>
              <option value="expired">期限切れ</option>
            </select>
          </label>
        </div>
      </SectionCard>

      {loading ? (
        <Skeleton className="h-64 w-full rounded-[28px]" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <SectionCard title="認定講師一覧" eyebrow="LIST">
            {licenses.length === 0 ? (
              <p className="text-[14px] text-slate-600">
                該当するライセンスがありません。下の新規登録から作成してください。
              </p>
            ) : (
              <ul className="max-h-[34rem] space-y-2 overflow-y-auto">
                {licenses.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className="w-full rounded-2xl border px-4 py-3 text-left transition"
                      style={{
                        borderColor:
                          selectedId === item.id
                            ? NAVY
                            : "rgba(15, 23, 42, 0.08)",
                        backgroundColor:
                          selectedId === item.id ? SURFACE_WARM : "white",
                      }}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div>
                          <p
                            className="text-[14px] font-semibold"
                            style={{ color: NAVY }}
                          >
                            活動名：{item.activityName || "—"}
                          </p>
                          <p className="mt-0.5 text-[12px] text-slate-600">
                            本名：{item.legalName || "未登録"}
                          </p>
                        </div>
                        <span
                          className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                          style={{
                            backgroundColor: adminLicenseStatusColor(
                              item.status,
                              item.expiresAt,
                              daysUntil(item.expiresAt),
                            ),
                          }}
                        >
                          {adminLicenseStatusLabel(item.status, item.expiresAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-[12px] text-slate-500">
                        {item.email || "—"} · {item.licenseNumber}
                      </p>
                      <p className="mt-0.5 text-[12px] text-slate-400">
                        {item.certificationLevelLabel} · 期限{" "}
                        {formatJaDate(item.expiresAt)} · 更新申請{" "}
                        {INSTRUCTOR_RENEWAL_STATUS_LABELS[item.renewalStatus]}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div
              className="mt-6 rounded-2xl border border-slate-200 px-4 py-4"
              style={{ backgroundColor: SURFACE_WARM }}
            >
              <p className="text-[13px] font-semibold" style={{ color: NAVY }}>
                ライセンス未登録の認定講師から作成
              </p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <select
                  className={inputClass}
                  value={newInstructorId}
                  onChange={(e) => setNewInstructorId(e.target.value)}
                >
                  <option value="">選択してください</option>
                  {candidates.map((item) => (
                    <option key={item.id} value={item.id}>
                      活動名：{item.activityName || "—"} / 本名：
                      {item.legalName || "未登録"}（{item.email}）
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  onClick={() => void createFromCandidate()}
                  disabled={saving || !newInstructorId}
                >
                  登録
                </Button>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="ライセンス編集" eyebrow="EDIT">
            {!selected ? (
              <p className="text-[14px] text-slate-600">
                左側の一覧から講師を選択してください。
              </p>
            ) : (
              <form onSubmit={saveSelected} className="space-y-4">
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-[11px] font-semibold tracking-[0.14em] text-slate-500">
                      活動名
                    </dt>
                    <dd className="mt-1 text-[14px] font-semibold" style={{ color: NAVY }}>
                      {selected.activityName || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold tracking-[0.14em] text-slate-500">
                      本名
                    </dt>
                    <dd className="mt-1 text-[14px] font-semibold" style={{ color: NAVY }}>
                      {selected.legalName || "未登録"}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-[11px] font-semibold tracking-[0.14em] text-slate-500">
                      メールアドレス
                    </dt>
                    <dd className="mt-1 text-[14px] font-semibold" style={{ color: NAVY }}>
                      {selected.email || "—"}
                    </dd>
                  </div>
                </dl>

                <label className="block text-[12px] font-semibold text-slate-500">
                  認定レベル
                  <select
                    className={inputClass}
                    value={editLevelId}
                    onChange={(e) => {
                      setEditLevelId(e.target.value);
                      const level = levels.find((item) => item.id === e.target.value);
                      if (level) {
                        setEditCertName(resolveCertificationName(level.label));
                        setEditRequiredHours(String(level.ceHoursRequired));
                      }
                    }}
                  >
                    {levels.map((level) => (
                      <option key={level.id} value={level.id}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-[12px] font-semibold text-slate-500">
                  認定資格名
                  <input
                    className={inputClass}
                    value={editCertName}
                    onChange={(e) => setEditCertName(e.target.value)}
                  />
                </label>

                <label className="block text-[12px] font-semibold text-slate-500">
                  認定番号
                  <input
                    className={inputClass}
                    value={editNumber}
                    onChange={(e) => setEditNumber(e.target.value)}
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-[12px] font-semibold text-slate-500">
                    認定日
                    <input
                      type="date"
                      className={inputClass}
                      value={editIssued}
                      onChange={(e) => setEditIssued(e.target.value)}
                    />
                  </label>
                  <label className="text-[12px] font-semibold text-slate-500">
                    有効期限
                    <input
                      type="date"
                      className={inputClass}
                      value={editExpires}
                      onChange={(e) => setEditExpires(e.target.value)}
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-[12px] font-semibold text-slate-500">
                    状態
                    <select
                      className={inputClass}
                      value={editStatus}
                      onChange={(e) =>
                        setEditStatus(e.target.value as InstructorLicenseStatus)
                      }
                    >
                      {INSTRUCTOR_LICENSE_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {INSTRUCTOR_LICENSE_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-[12px] font-semibold text-slate-500">
                    更新申請状況
                    <select
                      className={inputClass}
                      value={editRenewal}
                      onChange={(e) =>
                        setEditRenewal(
                          e.target.value as InstructorRenewalStatus,
                        )
                      }
                    >
                      {INSTRUCTOR_RENEWAL_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {INSTRUCTOR_RENEWAL_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-[12px] font-semibold text-slate-500">
                    継続教育の必要時間
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      className={inputClass}
                      value={editRequiredHours}
                      onChange={(e) => setEditRequiredHours(e.target.value)}
                    />
                  </label>
                  <label className="text-[12px] font-semibold text-slate-500">
                    継続教育の修了時間
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      className={inputClass}
                      value={editCompletedHours}
                      onChange={(e) => setEditCompletedHours(e.target.value)}
                    />
                  </label>
                </div>

                <label className="block text-[12px] font-semibold text-slate-500">
                  管理者メモ
                  <textarea
                    className={`${inputClass} min-h-24`}
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                  />
                </label>

                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button type="submit" disabled={saving} className="min-h-12 w-full sm:w-auto">
                    {saving ? "保存中…" : "保存"}
                  </Button>
                  {selected.status === "active" ? (
                    <Button
                      type="button"
                      variant="danger"
                      className="min-h-12 w-full sm:w-auto"
                      disabled={saving}
                      onClick={() => void runQuickAction("suspend")}
                    >
                      停止する
                    </Button>
                  ) : null}
                  {selected.status === "suspended" ? (
                    <Button
                      type="button"
                      className="min-h-12 w-full sm:w-auto"
                      disabled={
                        saving ||
                        daysUntil(selected.expiresAt) < 0
                      }
                      onClick={() => void runQuickAction("resume")}
                    >
                      再開する
                    </Button>
                  ) : null}
                  {selected.status !== "withdrawn" ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-12 w-full sm:w-auto"
                      disabled={saving}
                      onClick={() => void runQuickAction("renew")}
                    >
                      1年間更新
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-12 w-full sm:w-auto"
                    disabled={saving || selected.renewalStatus !== "requested"}
                    onClick={() => void decideRenewal("approve_renewal")}
                  >
                    更新申請を承認
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-12 w-full sm:w-auto"
                    disabled={saving || selected.renewalStatus !== "requested"}
                    onClick={() => void decideRenewal("reject_renewal")}
                  >
                    更新申請を却下
                  </Button>
                </div>
                {selected.status === "suspended" &&
                daysUntil(selected.expiresAt) < 0 ? (
                  <p className="text-[12px] leading-5 text-amber-800">
                    有効期限が切れています。再開前に有効期限を更新してください。
                  </p>
                ) : null}
              </form>
            )}
          </SectionCard>
        </div>
      )}
    </AdminShell>
  );
}
