"use client";

import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import {
  melatoninYogaApplySectionId,
  scrollToMelatoninYogaApplySection,
} from "@/lib/melatonin-yoga/apply-url";
import { formatSessionDayLineJst } from "@/lib/melatonin-yoga/format";
import type { PublicMelatoninYogaSession } from "@/lib/melatonin-yoga/registration-types";
import { allowedTrainingFormats } from "@/lib/melatonin-yoga/training-format";
import { MELATONIN_YOGA_TRAINING_COURSE_INFO } from "@/lib/melatonin-yoga/home-banner-copy";
import {
  MELATONIN_YOGA_EVENT_TYPES,
  MELATONIN_YOGA_EVENT_TYPE_LABELS,
  MELATONIN_YOGA_SESSION_FORMAT_LABELS,
  MELATONIN_YOGA_TRAINING_FORMAT_LABELS,
  melatoninYogaFeeLabel,
  type MelatoninYogaEventType,
  type MelatoninYogaTrainingFormat,
} from "@/lib/melatonin-yoga/types";

const inputClass =
  "mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-[#071426] outline-none transition focus:border-[#315f68] focus:ring-4 focus:ring-[#315f68]/10";

const labelClass = "block text-sm font-semibold text-[#071426]";

const FLEXIBLE_VALUE = "__flexible__";

type ChoiceValue = string;

type ChoiceMap = Partial<Record<MelatoninYogaEventType, ChoiceValue>>;

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className={labelClass}>
        {label}
        {required ? <span className="ml-1 text-red-600">*</span> : null}
      </span>
      {hint ? <span className="mt-1 block text-[12px] text-slate-500">{hint}</span> : null}
      {children}
    </label>
  );
}

function TrainingCourseInfo() {
  const info = MELATONIN_YOGA_TRAINING_COURSE_INFO;

  return (
    <div className="rounded-2xl border border-[#8a6a2d]/25 bg-[#faf8f3] px-4 py-4 text-sm leading-7 text-slate-700">
      <p className="font-semibold text-[#071426]">{info.title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {info.bullets.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

function SessionOption({
  name,
  value,
  checked,
  disabled,
  onChange,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label
      className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 ${
        checked
          ? "border-[#315f68] bg-[#315f68]/5"
          : "border-slate-200 bg-white"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="mt-1 shrink-0"
      />
      <span className="min-w-0 text-sm leading-6 text-slate-700">{children}</span>
    </label>
  );
}

type MelatoninYogaRegistrationFormProps = {
  initialEventType?: MelatoninYogaEventType | null;
};

export default function MelatoninYogaRegistrationForm({
  initialEventType = null,
}: MelatoninYogaRegistrationFormProps) {
  const [sessions, setSessions] = useState<PublicMelatoninYogaSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [enabledTypes, setEnabledTypes] = useState<
    Partial<Record<MelatoninYogaEventType, boolean>>
  >(() =>
    initialEventType ? { [initialEventType]: true } : {},
  );
  const [choices, setChoices] = useState<ChoiceMap>({});
  const [trainingFormat, setTrainingFormat] = useState<MelatoninYogaTrainingFormat | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [received, setReceived] = useState(false);

  useEffect(() => {
    if (!initialEventType || loadingSessions) return;

    let cancelled = false;
    const sectionId = melatoninYogaApplySectionId(initialEventType);

    const scrollToSection = () => {
      if (cancelled) return;
      scrollToMelatoninYogaApplySection(initialEventType);
    };

    scrollToSection();
    const rafId = window.requestAnimationFrame(scrollToSection);
    const retryId = window.setTimeout(scrollToSection, 120);

    const section = document.getElementById(sectionId);
    let resizeTimer: number | undefined;
    const observer =
      section && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(scrollToSection, 80);
          })
        : null;
    observer?.observe(section!);

    const stopObserverId = window.setTimeout(() => observer?.disconnect(), 2500);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(retryId);
      window.clearTimeout(resizeTimer);
      window.clearTimeout(stopObserverId);
      observer?.disconnect();
    };
  }, [initialEventType, loadingSessions, sessions]);

  useEffect(() => {
    void fetch("/api/melatonin-yoga/sessions", { cache: "no-store" })
      .then(async (response) => {
        const json = (await response.json()) as {
          sessions?: PublicMelatoninYogaSession[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(json.error ?? "日程の取得に失敗しました");
        }
        setSessions(json.sessions ?? []);
      })
      .catch((err: unknown) => {
        setSessionError(
          err instanceof Error ? err.message : "日程の取得に失敗しました",
        );
      })
      .finally(() => setLoadingSessions(false));
  }, []);

  const sessionsByType = useMemo(() => {
    const grouped: Record<MelatoninYogaEventType, PublicMelatoninYogaSession[]> = {
      consultation: [],
      workshop: [],
      training_course: [],
    };
    for (const session of sessions) {
      grouped[session.eventType].push(session);
    }
    return grouped;
  }, [sessions]);

  const trainingCourseSelected = enabledTypes.training_course === true;
  const trainingChoice = choices.training_course;
  const trainingSession =
    trainingChoice && trainingChoice !== FLEXIBLE_VALUE
      ? sessions.find((item) => item.id === trainingChoice)
      : undefined;

  const trainingFormatOptions = useMemo(() => {
    if (!trainingCourseSelected) return [];
    if (!trainingChoice) return [];
    if (trainingChoice === FLEXIBLE_VALUE) {
      return allowedTrainingFormats({ isFlexible: true });
    }
    if (!trainingSession) return [];
    return allowedTrainingFormats({
      isFlexible: false,
      sessionFormat: trainingSession.format,
      archiveAvailable: trainingSession.archiveAvailable,
    });
  }, [trainingCourseSelected, trainingChoice, trainingSession]);

  useEffect(() => {
    if (
      trainingFormat &&
      trainingFormatOptions.length > 0 &&
      !trainingFormatOptions.includes(trainingFormat)
    ) {
      setTrainingFormat("");
    }
  }, [trainingFormat, trainingFormatOptions]);

  const toggleType = (eventType: MelatoninYogaEventType, enabled: boolean) => {
    setEnabledTypes((current) => ({ ...current, [eventType]: enabled }));
    if (!enabled) {
      setChoices((current) => {
        const next = { ...current };
        delete next[eventType];
        return next;
      });
      if (eventType === "training_course") {
        setTrainingFormat("");
      }
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const selectedTypes = MELATONIN_YOGA_EVENT_TYPES.filter(
      (type) => enabledTypes[type],
    );
    if (selectedTypes.length === 0) {
      setError("参加希望の種類を1つ以上選択してください");
      return;
    }

    const selections = [];
    for (const eventType of selectedTypes) {
      const choice = choices[eventType];
      if (!choice) {
        setError(`${MELATONIN_YOGA_EVENT_TYPE_LABELS[eventType]}の日程を選択してください`);
        return;
      }
      if (choice === FLEXIBLE_VALUE) {
        selections.push({ eventType, sessionId: null, isFlexible: true });
      } else {
        selections.push({ eventType, sessionId: choice, isFlexible: false });
      }
    }

    if (trainingCourseSelected && !trainingFormat) {
      setError("養成コースの受講形式を選択してください");
      return;
    }

    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    try {
      const response = await fetch("/api/melatonin-yoga/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameKanji: form.get("nameKanji"),
          nameKana: form.get("nameKana"),
          email: form.get("email"),
          phone: form.get("phone"),
          hasYogaExperience: form.get("hasYogaExperience") === "yes",
          message: form.get("message"),
          referralSource: form.get("referralSource"),
          trainingFormat: trainingCourseSelected ? trainingFormat : null,
          selections,
        }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? "送信できませんでした");
      }
      setReceived(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "送信できませんでした",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (received) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white px-6 py-16 text-center shadow-sm sm:px-10">
        <p className="text-xs font-semibold tracking-[0.22em] text-[#8a6a2d]">
          RECEIVED
        </p>
        <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-[#071426]">
          お申し込みを受け付けました
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-slate-600">
          内容を確認のうえ、ご連絡いたします。受付確認のメールをお送りする予定です。
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className="space-y-6 rounded-[2rem] border border-slate-200 bg-white px-5 py-6 shadow-sm sm:px-8 sm:py-8"
    >
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[#071426]">参加希望の種類</h2>
        {sessionError ? (
          <p className="text-sm text-red-700">{sessionError}</p>
        ) : null}
        {loadingSessions ? (
          <p className="text-sm text-slate-500">開催日程を読み込み中…</p>
        ) : (
          MELATONIN_YOGA_EVENT_TYPES.map((eventType) => {
            const typeSessions = sessionsByType[eventType];
            const enabled = enabledTypes[eventType] === true;
            const choice = choices[eventType] ?? "";

            return (
              <div
                key={eventType}
                id={melatoninYogaApplySectionId(eventType)}
                className="scroll-mt-[calc(env(safe-area-inset-top,0px)+5.5rem)] rounded-2xl border border-slate-100 bg-[#fafaf8] p-4"
              >
                <label className="flex min-h-11 items-center gap-3">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(event) =>
                      toggleType(eventType, event.target.checked)
                    }
                    className="shrink-0"
                  />
                  <span className="text-sm font-semibold text-[#071426]">
                    {MELATONIN_YOGA_EVENT_TYPE_LABELS[eventType]}に申し込む
                  </span>
                </label>

                {eventType === "training_course" && enabled ? (
                  <div className="mt-4">
                    <TrainingCourseInfo />
                  </div>
                ) : null}

                {enabled ? (
                  <div className="mt-4 space-y-2">
                    {typeSessions.map((session) => (
                      <SessionOption
                        key={session.id}
                        name={`choice-${eventType}`}
                        value={session.id}
                        checked={choice === session.id}
                        disabled={session.isFull}
                        onChange={() =>
                          setChoices((current) => ({
                            ...current,
                            [eventType]: session.id,
                          }))
                        }
                      >
                        <span className="block font-semibold text-[#071426]">
                          {session.days.map((day, index) => (
                            <span key={`${session.id}-${index}`} className="block">
                              {formatSessionDayLineJst(day.startsAt, day.endsAt)}
                            </span>
                          ))}
                        </span>
                        {session.scheduleNote ? (
                          <span className="mt-1 block text-slate-500">
                            {session.scheduleNote}
                          </span>
                        ) : null}
                        <span className="mt-1 block text-slate-600">
                          {MELATONIN_YOGA_SESSION_FORMAT_LABELS[session.format]}
                          {session.location ? ` ／ ${session.location}` : ""}
                        </span>
                        {session.feeNote ? (
                          <span className="mt-1 block text-slate-600">
                            {melatoninYogaFeeLabel(eventType)}：{session.feeNote}
                          </span>
                        ) : null}
                        {session.isFull ? (
                          <span className="mt-1 block font-semibold text-amber-700">
                            満席
                          </span>
                        ) : null}
                      </SessionOption>
                    ))}
                    <SessionOption
                      name={`choice-${eventType}`}
                      value={FLEXIBLE_VALUE}
                      checked={choice === FLEXIBLE_VALUE}
                      onChange={() =>
                        setChoices((current) => ({
                          ...current,
                          [eventType]: FLEXIBLE_VALUE,
                        }))
                      }
                    >
                      日程が合わない・個別に相談したい（日程はメールで案内希望）
                    </SessionOption>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </section>

      {trainingCourseSelected && trainingFormatOptions.length > 0 ? (
        <Field label="養成コースの受講形式" required>
          <select
            className={inputClass}
            value={trainingFormat}
            onChange={(event) =>
              setTrainingFormat(event.target.value as MelatoninYogaTrainingFormat)
            }
            required
          >
            <option value="">選択してください</option>
            {trainingFormatOptions.map((format) => (
              <option key={format} value={format}>
                {MELATONIN_YOGA_TRAINING_FORMAT_LABELS[format]}
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      <section className="space-y-4 border-t border-slate-100 pt-6">
        <h2 className="text-lg font-semibold text-[#071426]">お申込者情報</h2>
        <Field label="氏名（漢字）" required>
          <input
            name="nameKanji"
            required
            maxLength={80}
            className={inputClass}
            autoComplete="name"
          />
        </Field>
        <Field label="氏名（かな）" required>
          <input
            name="nameKana"
            required
            maxLength={80}
            className={inputClass}
            autoComplete="off"
          />
        </Field>
        <Field label="メールアドレス" required>
          <input
            name="email"
            type="email"
            required
            maxLength={254}
            className={inputClass}
            autoComplete="email"
          />
        </Field>
        <Field label="電話番号" required>
          <input
            name="phone"
            type="tel"
            required
            maxLength={40}
            className={inputClass}
            autoComplete="tel"
          />
        </Field>
        <Field label="ヨガ指導経験" required>
          <select
            name="hasYogaExperience"
            required
            defaultValue=""
            className={inputClass}
          >
            <option value="" disabled>
              選択してください
            </option>
            <option value="yes">ある</option>
            <option value="no">ない</option>
          </select>
        </Field>
        <Field label="質問・相談">
          <textarea
            name="message"
            rows={4}
            maxLength={2000}
            className={`${inputClass} py-3`}
          />
        </Field>
        <Field label="何で知ったか（任意）">
          <input name="referralSource" maxLength={200} className={inputClass} />
        </Field>
      </section>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <Button
        type="submit"
        disabled={submitting || loadingSessions}
        className="min-h-12 w-full rounded-2xl text-[15px] font-semibold sm:w-auto"
      >
        {submitting ? "送信中…" : "申し込む"}
      </Button>
    </form>
  );
}
