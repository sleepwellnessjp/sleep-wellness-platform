"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/AdminShell";
import InstructorLicenseCertificateSheet from "@/components/InstructorLicenseCertificateSheet";
import Button from "@/components/ui/Button";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY, SURFACE_WARM, TEAL } from "@/components/ui/tokens";
import {
  educationProgressPercent,
  formatJaDate,
  formatLegalNameDisplay,
  INSTRUCTOR_LICENSE_STATUS_LABELS,
  INSTRUCTOR_LICENSE_STATUSES,
  INSTRUCTOR_RENEWAL_STATUS_LABELS,
  resolveCertificationName,
  resolveDisplayStatus,
  SLEEP_WELLNESS_INSTRUCTOR_CERT_NAME,
  todayIso,
  daysUntil,
} from "@/lib/instructor-license/constants";
import type {
  AdminCertifiedInstructorListItem,
  InstructorLicenseStatus,
} from "@/lib/instructor-license/types";

const inputClass =
  "mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[16px] text-[#071426] outline-none transition focus:border-[#315f68] focus:ring-4 focus:ring-[#315f68]/10 sm:min-h-0 sm:text-[15px]";

const selectClass = inputClass;

type SaveState = "idle" | "saving" | "success" | "error";

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

function EducationBar({
  required,
  completed,
}: {
  required: number;
  completed: number;
}) {
  const percent = educationProgressPercent(required, completed);
  const filled = Math.round(percent / 10);
  return (
    <div>
      <p className="text-[12px] text-slate-600">
        {completed} / {required}時間（{percent}%）
      </p>
      <p
        className="mt-1 font-mono text-[12px] tracking-tight"
        style={{ color: TEAL }}
        aria-hidden
      >
        {"■".repeat(filled)}
        {"□".repeat(Math.max(0, 10 - filled))}
      </p>
    </div>
  );
}

export default function AdminCertifiedInstructorsPage() {
  const [instructors, setInstructors] = useState<
    AdminCertifiedInstructorListItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCertificate, setShowCertificate] = useState(false);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expiringSoonOnly, setExpiringSoonOnly] = useState(false);
  const [unlinkedOnly, setUnlinkedOnly] = useState(false);

  const [editPublicName, setEditPublicName] = useState("");
  const [editLegalName, setEditLegalName] = useState("");
  const [editCertifiedAt, setEditCertifiedAt] = useState(todayIso());
  const [editExpiresAt, setEditExpiresAt] = useState(todayIso());
  const [editLicenseStatus, setEditLicenseStatus] =
    useState<InstructorLicenseStatus>("active");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch("/api/admin/certified-instructors", {
        cache: "no-store",
      });
      const json = (await response.json()) as {
        instructors?: AdminCertifiedInstructorListItem[];
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
      if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
      const list = json.instructors ?? [];
      setInstructors(list);
      setSelectedId((prev) => {
        if (prev && list.some((item) => item.instructorId === prev)) return prev;
        return list[0]?.instructorId ?? null;
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
        const expires =
          item.license?.expiresAt || item.renewsAt || "";
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
      setEditCertifiedAt(todayIso());
      setEditExpiresAt(todayIso());
      setEditLicenseStatus("active");
      setShowCertificate(false);
      return;
    }
    setEditPublicName(
      selected.activityName === "—" ? "" : selected.activityName,
    );
    setEditLegalName(selected.legalName);
    setEditCertifiedAt(
      selected.license?.issuedAt || selected.certifiedAt || todayIso(),
    );
    setEditExpiresAt(
      selected.license?.expiresAt || selected.renewsAt || todayIso(),
    );
    setEditLicenseStatus(selected.license?.status ?? "active");
    setShowCertificate(false);
    setSaveState("idle");
    setSaveMessage(null);
  }, [selected]);

  const selectInstructor = (id: string) => {
    setSelectedId(id);
  };

  const onSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || saveState === "saving") return;

    if (!editPublicName.trim()) {
      setSaveState("error");
      setSaveMessage("活動名を入力してください");
      return;
    }
    if (editExpiresAt < editCertifiedAt) {
      setSaveState("error");
      setSaveMessage("有効期限は認定日以降の日付を指定してください");
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
            email: selected.email,
            publicName: editPublicName.trim(),
            legalName: editLegalName.trim(),
            levelId: selected.levelId || "instructor",
            instructorNumber:
              selected.license?.licenseNumber ||
              selected.instructorNumber ||
              "",
            certifiedAt: editCertifiedAt,
            renewsAt: editExpiresAt,
            adminMemo: selected.adminMemo,
            issueLicense: Boolean(selected.license),
            licenseStatus: editLicenseStatus,
            requiredEducationHours:
              selected.license?.requiredEducationHours ?? 12,
            completedEducationHours:
              selected.license?.completedEducationHours ?? 0,
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
        throw new Error(json.error ?? "保存に失敗しました");
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
      setSaveMessage("保存しました。/license・認定証・認証ページへ反映されます。");
    } catch (error) {
      setSaveState("error");
      setSaveMessage(
        error instanceof Error ? error.message : "保存に失敗しました",
      );
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

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
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
                {/* Desktop table */}
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
                        <th className="py-2 pr-3 font-semibold">状態</th>
                        <th className="py-2 pr-3 font-semibold">継続教育</th>
                        <th className="py-2 font-semibold">更新申請</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((item) => {
                        const license = item.license;
                        const active = item.instructorId === selectedId;
                        return (
                          <tr
                            key={item.instructorId}
                            className="cursor-pointer border-b border-slate-100"
                            style={
                              active
                                ? { backgroundColor: SURFACE_WARM }
                                : undefined
                            }
                            onClick={() => selectInstructor(item.instructorId)}
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
                              {formatJaDate(
                                license?.issuedAt || item.certifiedAt,
                              )}
                            </td>
                            <td className="py-3 pr-3">
                              {formatJaDate(
                                license?.expiresAt || item.renewsAt,
                              )}
                            </td>
                            <td className="py-3 pr-3">
                              {statusLabelForItem(item)}
                            </td>
                            <td className="py-3 pr-3">
                              {license ? (
                                <EducationBar
                                  required={license.requiredEducationHours}
                                  completed={license.completedEducationHours}
                                />
                              ) : (
                                "—"
                              )}
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

                {/* Mobile cards */}
                <ul className="mt-4 space-y-3 md:hidden">
                  {filtered.map((item) => {
                    const license = item.license;
                    const active = item.instructorId === selectedId;
                    return (
                      <li key={item.instructorId}>
                        <button
                          type="button"
                          onClick={() => selectInstructor(item.instructorId)}
                          className="w-full rounded-3xl border px-4 py-4 text-left transition"
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
                              紐づけ：{accountLinkLabel(item.userId)}
                            </div>
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
                              認定日：
                              {formatJaDate(
                                license?.issuedAt || item.certifiedAt,
                              )}
                            </div>
                            <div>
                              有効期限：
                              {formatJaDate(
                                license?.expiresAt || item.renewsAt,
                              )}
                            </div>
                            <div>
                              更新申請：
                              {license
                                ? INSTRUCTOR_RENEWAL_STATUS_LABELS[
                                    license.renewalStatus
                                  ]
                                : "—"}
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
                          <p
                            className="mt-3 text-[13px] font-semibold"
                            style={{ color: GOLD }}
                          >
                            編集 →
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </SectionCard>

          <div className="space-y-6">
            <SectionCard
              title={selected ? "講師を編集" : "講師編集"}
              eyebrow="EDIT"
            >
              {!selected ? (
                <p className="text-[14px] text-slate-600">
                  左側（または上）の一覧から講師を選択してください。
                </p>
              ) : (
                <form className="space-y-4" onSubmit={(e) => void onSave(e)}>
                  <dl className="grid gap-2 rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3 text-[13px] text-slate-600">
                    <div>
                      メール：
                      <span className="font-semibold text-slate-800">
                        {selected.email || "—"}
                      </span>
                    </div>
                    <div>
                      紐づけ：
                      <span className="font-semibold text-slate-800">
                        {accountLinkLabel(selected.userId)}
                      </span>
                    </div>
                    <div>
                      認定資格名：
                      <span className="font-semibold text-slate-800">
                        {resolveCertificationName(
                          selected.license?.certificationName,
                        ) || SLEEP_WELLNESS_INSTRUCTOR_CERT_NAME}
                      </span>
                    </div>
                    <div>
                      認定番号：
                      <span className="font-mono font-semibold text-slate-800">
                        {selected.license?.licenseNumber ||
                          selected.instructorNumber ||
                          "—"}
                      </span>
                    </div>
                    {selected.license ? (
                      <div className="pt-1">
                        <EducationBar
                          required={selected.license.requiredEducationHours}
                          completed={selected.license.completedEducationHours}
                        />
                      </div>
                    ) : null}
                  </dl>

                  <label className="block text-[13px] font-semibold text-slate-600">
                    活動名（public_name）
                    <input
                      className={inputClass}
                      value={editPublicName}
                      onChange={(event) =>
                        setEditPublicName(event.target.value)
                      }
                      required
                      disabled={saveState === "saving"}
                    />
                  </label>
                  <label className="block text-[13px] font-semibold text-slate-600">
                    本名（legal_name）
                    <input
                      className={inputClass}
                      value={editLegalName}
                      onChange={(event) => setEditLegalName(event.target.value)}
                      placeholder="未登録可"
                      disabled={saveState === "saving"}
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-[13px] font-semibold text-slate-600">
                      認定日
                      <input
                        className={inputClass}
                        type="date"
                        value={editCertifiedAt}
                        onChange={(event) =>
                          setEditCertifiedAt(event.target.value)
                        }
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
                        onChange={(event) =>
                          setEditExpiresAt(event.target.value)
                        }
                        required
                        disabled={saveState === "saving"}
                      />
                    </label>
                  </div>
                  <label className="block text-[13px] font-semibold text-slate-600">
                    ライセンス状態
                    <select
                      className={selectClass}
                      value={editLicenseStatus}
                      onChange={(event) =>
                        setEditLicenseStatus(
                          event.target.value as InstructorLicenseStatus,
                        )
                      }
                      disabled={saveState === "saving" || !selected.license}
                    >
                      {INSTRUCTOR_LICENSE_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {INSTRUCTOR_LICENSE_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </label>
                  {!selected.license ? (
                    <p className="text-[13px] text-amber-800">
                      ライセンス未発行のため状態変更はできません（第2段階で発行予定）。
                    </p>
                  ) : (
                    <p className="text-[12px] text-slate-500">
                      有効期限を過ぎている場合、DB が active でも一覧では「期限切れ」と表示します。
                    </p>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <Button
                      type="submit"
                      disabled={saveState === "saving"}
                      className="min-h-12 w-full sm:w-auto"
                    >
                      {saveState === "saving" ? "保存中…" : "保存する"}
                    </Button>
                    {selected.license ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-12 w-full sm:w-auto"
                        onClick={() =>
                          setShowCertificate((value) => !value)
                        }
                      >
                        {showCertificate
                          ? "認定証を閉じる"
                          : "デジタル認定証を確認"}
                      </Button>
                    ) : null}
                  </div>
                </form>
              )}

              {selected?.license && showCertificate ? (
                <div className="mt-6 border-t border-slate-200 pt-6">
                  <p className="mb-3 text-[12px] text-slate-500">
                    認定証の氏名は本名「
                    {formatLegalNameDisplay(selected.legalName)}」を表示します。
                  </p>
                  <InstructorLicenseCertificateSheet
                    legalName={selected.legalName}
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

            <SectionCard title="近日実装予定" eyebrow="ROADMAP">
              <ul className="space-y-2 text-[14px] leading-6 text-slate-600">
                <li>・新規認定講師の登録と認定番号の自動生成</li>
                <li>・本人アカウントとの安全な紐づけ</li>
                <li>・ライセンス発行・停止・取消・再有効化・期限延長</li>
                <li>・継続教育時間の編集</li>
                <li>・操作履歴・認定証再発行・認定番号再生成</li>
                <li>・より高度な検索と絞り込み</li>
              </ul>
            </SectionCard>
          </div>
        </div>

        <p className="text-[12px] text-slate-500">
          一般ユーザー・認定講師本人はこのページにアクセスできません。API
          でも requireAdminProfile により管理者のみ操作できます。
        </p>
      </div>
    </AdminShell>
  );
}
