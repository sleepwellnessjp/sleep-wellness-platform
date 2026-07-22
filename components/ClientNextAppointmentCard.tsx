"use client";

import { useEffect, useState } from "react";
import {
  APPOINTMENT_LOCATION_OPTIONS,
  appointmentDisplayTitle,
  createClientAppointment,
  defaultAppointmentDate,
  defaultAppointmentTime,
  deleteClientAppointment,
  findNextAppointment,
  formatAppointmentDayNumber,
  formatAppointmentMonthLabel,
  formatAppointmentWeekday,
  formatLocationTypeLabel,
  getNextClientAppointment,
  listClientAppointments,
  updateClientAppointment,
  type AppointmentLocationType,
  type ClientAppointment,
  type ClientAppointmentInput,
} from "@/lib/repositories/client-appointments-repository";

const NAVY = "#071426";
const GOLD = "#8a6a2d";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3 text-[15px] text-[#071426] outline-none transition duration-300 placeholder:text-slate-400 focus:border-[#315f68] focus:bg-white focus:ring-4 focus:ring-[#315f68]/10";

const selectClass =
  "w-full appearance-none rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3 text-[15px] text-[#071426] outline-none transition duration-300 focus:border-[#315f68] focus:bg-white focus:ring-4 focus:ring-[#315f68]/10";

const textareaClass =
  "w-full resize-none rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3 text-[15px] leading-7 text-[#071426] outline-none transition duration-300 placeholder:text-slate-400 focus:border-[#315f68] focus:bg-white focus:ring-4 focus:ring-[#315f68]/10";

type Props = {
  clientId: string;
};

type FormState = {
  title: string;
  startDate: string;
  startTime: string;
  locationType: AppointmentLocationType;
  location: string;
  description: string;
};

function emptyForm(): FormState {
  return {
    title: "",
    startDate: defaultAppointmentDate(),
    startTime: defaultAppointmentTime(),
    locationType: "online",
    location: "",
    description: "",
  };
}

function formFromAppointment(appointment: ClientAppointment): FormState {
  return {
    title: appointment.title,
    startDate: appointment.startDate,
    startTime: appointment.startTime ?? defaultAppointmentTime(),
    locationType: appointment.locationType,
    location: appointment.location,
    description: appointment.description,
  };
}

function toInput(form: FormState): ClientAppointmentInput {
  return {
    title: form.title.trim() || form.description.trim() || "次回予定",
    startDate: form.startDate,
    startTime: form.startTime || null,
    locationType: form.locationType,
    location: form.location,
    description: form.description,
  };
}

export default function ClientNextAppointmentCard({ clientId }: Props) {
  const [appointment, setAppointment] = useState<ClientAppointment | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      setLoading(true);
      setError(null);
      try {
        const next = await getNextClientAppointment(clientId);
        if (!cancelled) {
          setAppointment(next);
          setEditing(false);
        }
      } catch (err) {
        console.error("[ClientNextAppointmentCard] load failed:", err);
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "次回予定の取得に失敗しました。",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void refresh();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const startCreate = () => {
    setForm(emptyForm());
    setEditing(true);
    setError(null);
  };

  const startEdit = () => {
    if (!appointment) return;
    setForm(formFromAppointment(appointment));
    setEditing(true);
    setError(null);
  };

  const cancelEdit = () => {
    setEditing(false);
    setError(null);
  };

  const handleSave = async () => {
    if (saving || !form.startDate) return;

    setSaving(true);
    setError(null);
    try {
      const input = toInput(form);
      if (appointment) {
        const updated = await updateClientAppointment(
          clientId,
          appointment.id,
          input,
        );
        setAppointment(updated);
      } else {
        const created = await createClientAppointment(clientId, input);
        setAppointment(created);
      }
      setEditing(false);
    } catch (err) {
      console.error("[ClientNextAppointmentCard] save failed:", err);
      setError(
        err instanceof Error ? err.message : "次回予定の保存に失敗しました。",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!appointment || saving) return;
    if (!window.confirm("この次回予定を削除しますか？")) return;

    setSaving(true);
    setError(null);
    try {
      await deleteClientAppointment(clientId, appointment.id);
      const remaining = await listClientAppointments(clientId);
      setAppointment(findNextAppointment(remaining));
      setEditing(false);
    } catch (err) {
      console.error("[ClientNextAppointmentCard] delete failed:", err);
      setError(
        err instanceof Error ? err.message : "次回予定の削除に失敗しました。",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-400">読み込み中...</p>;
  }

  if (editing) {
    return (
      <div>
        <p className="mb-5 max-w-xl text-[13px] leading-6 text-slate-500 sm:text-[14px] sm:leading-7">
          日時・場所・メモを登録します。Google Calendar
          連携時は同じ構造で同期できるよう設計しています。
        </p>

        <div className="grid gap-4 lg:grid-cols-[11rem_1fr]">
          <CalendarPreview
            startDate={form.startDate}
            startTime={form.startTime}
            locationType={form.locationType}
          />

          <div className="rounded-[22px] border border-slate-100 bg-[#fafaf8] p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-[12px] font-semibold text-slate-500">
                  タイトル
                </span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  disabled={saving}
                  className={`${inputClass} mt-1.5`}
                  placeholder="例：次回SOXAI測定"
                />
              </label>

              <label className="block">
                <span className="text-[12px] font-semibold text-slate-500">
                  日付
                </span>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      startDate: event.target.value,
                    }))
                  }
                  disabled={saving}
                  className={`${inputClass} mt-1.5`}
                />
              </label>

              <label className="block">
                <span className="text-[12px] font-semibold text-slate-500">
                  時刻
                </span>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      startTime: event.target.value,
                    }))
                  }
                  disabled={saving}
                  className={`${inputClass} mt-1.5`}
                />
              </label>

              <label className="block">
                <span className="text-[12px] font-semibold text-slate-500">
                  形式
                </span>
                <select
                  value={form.locationType}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      locationType: event.target
                        .value as AppointmentLocationType,
                    }))
                  }
                  disabled={saving}
                  className={`${selectClass} mt-1.5`}
                >
                  {APPOINTMENT_LOCATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-[12px] font-semibold text-slate-500">
                  場所 / URL
                </span>
                <input
                  type="text"
                  value={form.location}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      location: event.target.value,
                    }))
                  }
                  disabled={saving}
                  className={`${inputClass} mt-1.5`}
                  placeholder="Zoom URL・会場名など"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-[12px] font-semibold text-slate-500">
                  メモ
                </span>
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  disabled={saving}
                  rows={3}
                  className={`${textareaClass} mt-1.5`}
                  placeholder="例：次回SOXAI測定"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || !form.startDate}
                className="inline-flex min-h-10 items-center justify-center rounded-full px-5 py-2 text-[13px] font-semibold text-white transition disabled:opacity-50"
                style={{ backgroundColor: NAVY }}
              >
                {saving ? "保存中..." : "保存"}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                キャンセル
              </button>
              {appointment ? (
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={saving}
                  className="inline-flex min-h-10 items-center justify-center rounded-full border border-rose-200 bg-white px-5 py-2 text-[13px] font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                >
                  削除
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {error ? (
          <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>
        ) : null}
      </div>
    );
  }

  if (!appointment) {
    return (
      <div>
        <p className="mb-5 max-w-xl text-[13px] leading-6 text-slate-500 sm:text-[14px] sm:leading-7">
          次回の測定・フォロー予定をカレンダー形式で残せます。
        </p>
        <div className="flex flex-col items-center justify-center rounded-[22px] border border-dashed border-[#8a6a2d]/30 bg-[#faf7f1]/60 px-6 py-10 text-center">
          <div
            className="flex h-16 w-14 flex-col overflow-hidden rounded-xl border border-[#8a6a2d]/25 bg-white shadow-[0_12px_30px_-18px_rgba(7,20,38,0.35)]"
            aria-hidden
          >
            <div
              className="py-1 text-center text-[10px] font-semibold tracking-[0.14em] text-white"
              style={{ backgroundColor: GOLD }}
            >
              NEXT
            </div>
            <div className="flex flex-1 items-center justify-center text-xl font-semibold text-slate-300">
              —
            </div>
          </div>
          <p className="mt-4 text-sm font-semibold" style={{ color: NAVY }}>
            次回予定はまだありません
          </p>
          <p className="mt-2 max-w-sm text-[13px] leading-6 text-slate-500">
            日付・時刻・オンライン／対面・メモを登録できます。
          </p>
          <button
            type="button"
            onClick={startCreate}
            className="mt-5 inline-flex min-h-10 items-center justify-center rounded-full px-5 py-2 text-[13px] font-semibold text-white transition"
            style={{ backgroundColor: NAVY }}
          >
            予定を追加
          </button>
        </div>
        {error ? (
          <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>
        ) : null}
      </div>
    );
  }

  const title = appointmentDisplayTitle(appointment);

  return (
    <div>
      <p className="mb-5 max-w-xl text-[13px] leading-6 text-slate-500 sm:text-[14px] sm:leading-7">
        次回の測定・フォロー予定です。編集内容は Google Calendar
        連携用の構造で保持されます。
      </p>

      <div className="overflow-hidden rounded-[24px] border border-[#8a6a2d]/20 bg-gradient-to-br from-[#faf7f1] via-white to-[#f5efe4] shadow-[0_20px_50px_-40px_rgba(138,106,45,0.45)]">
        <div className="grid sm:grid-cols-[10.5rem_1fr]">
          <div className="relative flex flex-col items-center justify-center border-b border-[#8a6a2d]/15 px-5 py-6 sm:border-b-0 sm:border-r sm:px-6 sm:py-8">
            <div
              className="pointer-events-none absolute inset-0 opacity-50"
              style={{
                background:
                  "radial-gradient(circle at 50% 20%, rgba(216,179,106,0.28), transparent 70%)",
              }}
              aria-hidden
            />
            <div className="relative w-full max-w-[7.5rem] overflow-hidden rounded-2xl border border-[#8a6a2d]/25 bg-white shadow-[0_16px_40px_-24px_rgba(7,20,38,0.45)]">
              <div
                className="py-2 text-center text-[11px] font-semibold tracking-[0.2em] text-white"
                style={{ backgroundColor: GOLD }}
              >
                {formatAppointmentMonthLabel(appointment.startDate)}
              </div>
              <div className="px-3 py-4 text-center">
                <p
                  className="text-[2.75rem] font-semibold leading-none tracking-[-0.06em]"
                  style={{ color: NAVY }}
                >
                  {formatAppointmentDayNumber(appointment.startDate)}
                </p>
                <p className="mt-2 text-[12px] font-semibold text-slate-400">
                  {formatAppointmentWeekday(appointment.startDate)}
                </p>
              </div>
            </div>
          </div>

          <div className="relative flex flex-col justify-center px-5 py-6 sm:px-8 sm:py-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p
                  className="text-[10px] font-semibold tracking-[0.2em]"
                  style={{ color: GOLD }}
                >
                  NEXT SESSION
                </p>
                <h3
                  className="mt-2 text-lg font-semibold tracking-[-0.03em] sm:text-xl"
                  style={{ color: NAVY }}
                >
                  {title}
                </h3>
              </div>
              <button
                type="button"
                onClick={startEdit}
                className="inline-flex min-h-9 items-center justify-center rounded-full border border-[#8a6a2d]/35 bg-white/80 px-4 py-1.5 text-[12px] font-semibold transition hover:bg-white"
                style={{ color: GOLD }}
              >
                編集
              </button>
            </div>

            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/80 bg-white/70 px-4 py-3">
                <dt className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">
                  時刻
                </dt>
                <dd
                  className="mt-1 text-[1.35rem] font-semibold tracking-[-0.04em]"
                  style={{ color: NAVY }}
                >
                  {appointment.startTime ?? "終日"}
                </dd>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/70 px-4 py-3">
                <dt className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">
                  形式
                </dt>
                <dd
                  className="mt-1 text-[1.05rem] font-semibold tracking-[-0.02em]"
                  style={{ color: NAVY }}
                >
                  {formatLocationTypeLabel(appointment.locationType)}
                </dd>
              </div>
            </dl>

            {appointment.location.trim() ? (
              <p className="mt-4 text-[13px] leading-6 text-slate-600">
                <span className="font-semibold text-slate-400">場所 </span>
                {appointment.location}
              </p>
            ) : null}

            {appointment.description.trim() ? (
              <div className="mt-4 rounded-2xl border border-white/80 bg-white/70 px-4 py-3">
                <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">
                  メモ
                </p>
                <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-7 text-slate-700">
                  {appointment.description}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>
      ) : null}
    </div>
  );
}

function CalendarPreview({
  startDate,
  startTime,
  locationType,
}: {
  startDate: string;
  startTime: string;
  locationType: AppointmentLocationType;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[22px] border border-[#8a6a2d]/20 bg-gradient-to-b from-[#faf7f1] to-white px-4 py-6">
      <div className="w-full max-w-[7.5rem] overflow-hidden rounded-2xl border border-[#8a6a2d]/25 bg-white shadow-[0_16px_40px_-24px_rgba(7,20,38,0.45)]">
        <div
          className="py-2 text-center text-[11px] font-semibold tracking-[0.2em] text-white"
          style={{ backgroundColor: GOLD }}
        >
          {formatAppointmentMonthLabel(startDate) || "—"}
        </div>
        <div className="px-3 py-4 text-center">
          <p
            className="text-[2.75rem] font-semibold leading-none tracking-[-0.06em]"
            style={{ color: NAVY }}
          >
            {formatAppointmentDayNumber(startDate)}
          </p>
          <p className="mt-2 text-[12px] font-semibold text-slate-400">
            {formatAppointmentWeekday(startDate) || "—"}
          </p>
        </div>
      </div>
      <p className="mt-4 text-[1.15rem] font-semibold" style={{ color: NAVY }}>
        {startTime || "終日"}
      </p>
      <p className="mt-1 text-[12px] font-medium text-slate-500">
        {formatLocationTypeLabel(locationType)}
      </p>
    </div>
  );
}
