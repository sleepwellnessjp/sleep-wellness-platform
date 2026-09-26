"use client";

import {
  MELATONIN_YOGA_EVENT_TYPES,
  MELATONIN_YOGA_EVENT_TYPE_LABELS,
  MELATONIN_YOGA_SESSION_FORMATS,
  MELATONIN_YOGA_SESSION_FORMAT_LABELS,
  type MelatoninYogaSessionDayFormState,
  type MelatoninYogaSessionFormState,
} from "@/lib/melatonin-yoga/types";
import { emptySessionDayFormState } from "@/lib/melatonin-yoga/format";
import { NAVY } from "@/components/ui/tokens";

const labelClass = "block text-[12px] font-semibold text-slate-600";
const inputClass =
  "mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[15px] text-[#071426] outline-none focus:border-[#8a6a2d]";

type Props = {
  value: MelatoninYogaSessionFormState;
  onChange: (next: MelatoninYogaSessionFormState) => void;
  saving?: boolean;
  submitLabel: string;
  onSubmit: () => void;
};

function DayFields({
  day,
  index,
  canRemove,
  onChange,
  onRemove,
}: {
  day: MelatoninYogaSessionDayFormState;
  index: number;
  canRemove: boolean;
  onChange: (next: MelatoninYogaSessionDayFormState) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold" style={{ color: NAVY }}>
          開催日 {index + 1}
        </p>
        {canRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex min-h-11 items-center rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700"
          >
            削除
          </button>
        ) : null}
      </div>
      <div className="space-y-3">
        <label className="block">
          <span className={labelClass}>日付（必須・日本時間）</span>
          <input
            type="date"
            className={inputClass}
            value={day.dateLocal}
            onChange={(event) =>
              onChange({ ...day, dateLocal: event.target.value })
            }
          />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>開始時刻（必須）</span>
            <input
              type="time"
              className={inputClass}
              value={day.startTimeLocal}
              onChange={(event) =>
                onChange({ ...day, startTimeLocal: event.target.value })
              }
            />
          </label>
          <label className="block">
            <span className={labelClass}>終了時刻（必須）</span>
            <input
              type="time"
              className={inputClass}
              value={day.endTimeLocal}
              onChange={(event) =>
                onChange({ ...day, endTimeLocal: event.target.value })
              }
            />
          </label>
        </div>
      </div>
    </div>
  );
}

export default function MelatoninYogaSessionForm({
  value,
  onChange,
  saving = false,
  submitLabel,
  onSubmit,
}: Props) {
  const patch = (partial: Partial<MelatoninYogaSessionFormState>) => {
    onChange({ ...value, ...partial });
  };

  const updateDay = (
    clientKey: string,
    nextDay: MelatoninYogaSessionDayFormState,
  ) => {
    patch({
      days: value.days.map((day) =>
        day.clientKey === clientKey ? nextDay : day,
      ),
    });
  };

  const addDay = () => {
    patch({ days: [...value.days, emptySessionDayFormState()] });
  };

  const removeDay = (clientKey: string) => {
    if (value.days.length <= 1) return;
    patch({ days: value.days.filter((day) => day.clientKey !== clientKey) });
  };

  return (
    <div className="max-w-2xl space-y-4">
      <label className="block">
        <span className={labelClass}>種類（必須）</span>
        <select
          className={inputClass}
          value={value.eventType}
          onChange={(event) =>
            patch({
              eventType:
                event.target.value as MelatoninYogaSessionFormState["eventType"],
            })
          }
        >
          {MELATONIN_YOGA_EVENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {MELATONIN_YOGA_EVENT_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </label>

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className={labelClass}>開催日（必須・日本時間）</span>
          <button
            type="button"
            onClick={addDay}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-slate-200 px-4 text-[13px] font-semibold sm:w-auto"
            style={{ color: NAVY }}
          >
            ＋ 開催日を追加
          </button>
        </div>
        {value.days.map((day, index) => (
          <DayFields
            key={day.clientKey}
            day={day}
            index={index}
            canRemove={value.days.length > 1}
            onChange={(nextDay) => updateDay(day.clientKey, nextDay)}
            onRemove={() => removeDay(day.clientKey)}
          />
        ))}
      </div>

      <label className="block">
        <span className={labelClass}>日程の補足</span>
        <input
          type="text"
          className={inputClass}
          placeholder="例：各日お昼休憩あり"
          value={value.scheduleNote}
          onChange={(event) => patch({ scheduleNote: event.target.value })}
        />
        <p className="mt-1.5 text-[12px] text-slate-500">
          開催日一覧の下に表示する補足の一言（任意）
        </p>
      </label>

      <label className="block">
        <span className={labelClass}>形式（必須）</span>
        <select
          className={inputClass}
          value={value.format}
          onChange={(event) =>
            patch({
              format: event.target.value as MelatoninYogaSessionFormState["format"],
            })
          }
        >
          {MELATONIN_YOGA_SESSION_FORMATS.map((format) => (
            <option key={format} value={format}>
              {MELATONIN_YOGA_SESSION_FORMAT_LABELS[format]}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className={labelClass}>場所</span>
        <input
          type="text"
          className={inputClass}
          placeholder="例：オンライン（Zoom）／東京都内スタジオ"
          value={value.location}
          onChange={(event) => patch({ location: event.target.value })}
        />
        <p className="mt-1.5 text-[12px] text-slate-500">
          ZoomのURLはここに入れず、受付後のメールでお送りください
        </p>
      </label>

      <label className="block">
        <span className={labelClass}>
          {value.eventType === "training_course" ? "受講料" : "参加費"}
        </span>
        <input
          type="text"
          className={inputClass}
          placeholder="例：無料、3,000円（税込）"
          value={value.feeNote}
          onChange={(event) => patch({ feeNote: event.target.value })}
        />
        <p className="mt-1.5 text-[12px] text-slate-500">
          申込フォームと受付メールに表示されます（任意）
        </p>
      </label>

      <label className="block">
        <span className={labelClass}>定員（必須）</span>
        <input
          type="number"
          min={1}
          inputMode="numeric"
          className={inputClass}
          value={value.capacity}
          onChange={(event) =>
            patch({ capacity: Number.parseInt(event.target.value, 10) || 0 })
          }
        />
      </label>

      <label
        className="flex min-h-11 items-center gap-2 text-sm"
        style={{ color: NAVY }}
      >
        <input
          type="checkbox"
          checked={value.published}
          onChange={(event) => patch({ published: event.target.checked })}
        />
        公開する（申込フォームに表示）
      </label>

      <label
        className="flex min-h-11 items-center gap-2 text-sm"
        style={{ color: NAVY }}
      >
        <input
          type="checkbox"
          checked={value.registrationClosed}
          onChange={(event) =>
            patch({ registrationClosed: event.target.checked })
          }
        />
        受付終了（フォームから選択不可）
      </label>

      {value.eventType === "training_course" ? (
        <label
          className="flex min-h-11 items-center gap-2 text-sm"
          style={{ color: NAVY }}
        >
          <input
            type="checkbox"
            checked={value.archiveAvailable}
            onChange={(event) =>
              patch({ archiveAvailable: event.target.checked })
            }
          />
          アーカイブ受講可（申込時にアーカイブを選択可能）
        </label>
      ) : null}

      <label className="block">
        <span className={labelClass}>管理メモ</span>
        <textarea
          rows={3}
          className={`${inputClass} py-2.5`}
          value={value.adminNote}
          onChange={(event) => patch({ adminNote: event.target.value })}
        />
      </label>

      <button
        type="button"
        disabled={saving}
        onClick={onSubmit}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-5 text-[15px] font-semibold text-white disabled:opacity-60 sm:w-auto"
        style={{ background: NAVY }}
      >
        {saving ? "保存中…" : submitLabel}
      </button>
    </div>
  );
}
