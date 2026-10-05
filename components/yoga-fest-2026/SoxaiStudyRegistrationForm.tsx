"use client";

import { FormEvent, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { YOGA_FEST_2026_SOXAI_CLASSES } from "@/lib/yoga-fest-2026-soxai/classes";
import {
  formatYogaFestClassTimeRange,
  groupYogaFestClassesByDate,
} from "@/lib/yoga-fest-2026-soxai/format";
import {
  YOGA_FEST_SOXAI_AGE_BANDS,
  YOGA_FEST_SOXAI_MINOR_AGE_BAND,
  type YogaFestSoxaiAgeBand,
} from "@/lib/yoga-fest-2026-soxai/types";

const inputClass =
  "mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-[#071426] outline-none transition focus:border-[#315f68] focus:ring-4 focus:ring-[#315f68]/10";

const labelClass = "block text-sm font-semibold text-[#071426]";

const SUCCESS_MESSAGE =
  "ご登録ありがとうございます。あなたの参加が、ヨガの価値を伝える一歩になります。";

export default function SoxaiStudyRegistrationForm() {
  const classGroups = useMemo(
    () => groupYogaFestClassesByDate(YOGA_FEST_2026_SOXAI_CLASSES),
    [],
  );

  const [classId, setClassId] = useState("");
  const [name, setName] = useState("");
  const [ageBand, setAgeBand] = useState<"" | YogaFestSoxaiAgeBand>("");
  const [email, setEmail] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianConsent, setGuardianConsent] = useState(false);
  const [infoConsent, setInfoConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [received, setReceived] = useState(false);

  const showMinorFields = ageBand === YOGA_FEST_SOXAI_MINOR_AGE_BAND;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/yoga-fest-2026/soxai/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          name,
          ageBand,
          email,
          guardianName: showMinorFields ? guardianName : "",
          guardianConsent: showMinorFields ? guardianConsent : false,
          infoConsent,
        }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(json.error ?? "送信できませんでした");
        return;
      }
      setReceived(true);
    } catch {
      setError("送信できませんでした。通信環境をご確認ください。");
    } finally {
      setSubmitting(false);
    }
  };

  if (received) {
    return (
      <div
        id="register"
        className="scroll-mt-[calc(env(safe-area-inset-top,0px)+5.5rem)] rounded-[2rem] border border-[#8a6a2d]/25 bg-[#faf8f3] px-6 py-12 text-center shadow-sm sm:px-10"
      >
        <p className="text-xs font-semibold tracking-[0.22em] text-[#8a6a2d]">
          REGISTERED
        </p>
        <p className="mx-auto mt-4 max-w-md text-base leading-8 text-[#071426]">
          {SUCCESS_MESSAGE}
        </p>
      </div>
    );
  }

  return (
    <form
      id="register"
      onSubmit={(event) => void onSubmit(event)}
      className="scroll-mt-[calc(env(safe-area-inset-top,0px)+5.5rem)] space-y-6 rounded-[2rem] border border-slate-200 bg-white px-5 py-6 shadow-sm sm:px-8 sm:py-8"
    >
      <h2 className="text-lg font-semibold text-[#071426]">参加登録</h2>

      <fieldset className="space-y-4">
        <legend className={`${labelClass} mb-2`}>
          参加したクラス<span className="ml-1 text-red-600">*</span>
        </legend>
        {classGroups.map((group) => (
          <div key={group.dateKey} className="space-y-2">
            <p className="text-[13px] font-semibold text-[#8a6a2d]">
              {group.heading}
            </p>
            {group.classes.map((session) => {
              const checked = classId === session.id;
              return (
                <label
                  key={session.id}
                  className={`flex min-h-11 cursor-pointer flex-col gap-1 rounded-2xl border px-4 py-3 transition ${
                    checked
                      ? "border-[#315f68] bg-[#315f68]/5"
                      : "border-slate-200 bg-[#fafaf8]"
                  }`}
                >
                  <span className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="classId"
                      value={session.id}
                      checked={checked}
                      onChange={() => setClassId(session.id)}
                      className="mt-1 shrink-0"
                      required={!classId}
                    />
                    <span className="min-w-0 text-sm leading-6 text-slate-700">
                      <span className="block font-semibold text-[#071426]">
                        {session.teacherName}「{session.classTitle}」
                      </span>
                      <span className="mt-0.5 block text-slate-600">
                        {formatYogaFestClassTimeRange(
                          session.startsAt,
                          session.endsAt,
                        )}{" "}
                        ／ {session.room}
                      </span>
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        ))}
      </fieldset>

      <label className="block">
        <span className={labelClass}>
          お名前<span className="ml-1 text-red-600">*</span>
        </span>
        <input
          className={inputClass}
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          autoComplete="name"
        />
      </label>

      <label className="block">
        <span className={labelClass}>
          年代<span className="ml-1 text-red-600">*</span>
        </span>
        <select
          className={inputClass}
          value={ageBand}
          onChange={(event) => {
            const next = event.target.value as "" | YogaFestSoxaiAgeBand;
            setAgeBand(next);
            if (next !== YOGA_FEST_SOXAI_MINOR_AGE_BAND) {
              setGuardianName("");
              setGuardianConsent(false);
            }
          }}
          required
        >
          <option value="" disabled>
            選択してください
          </option>
          {YOGA_FEST_SOXAI_AGE_BANDS.map((band) => (
            <option key={band} value={band}>
              {band}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className={labelClass}>
          SOXAIアプリに登録したメールアドレス
          <span className="ml-1 text-red-600">*</span>
        </span>
        <span className="mt-1 block text-[12px] leading-5 text-slate-500">
          データの抽出に使うため、アプリと同じアドレスを入力してください
        </span>
        <input
          type="email"
          className={inputClass}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="email"
        />
      </label>

      {showMinorFields ? (
        <div className="space-y-4 rounded-2xl border border-[#8a6a2d]/20 bg-[#faf8f3] px-4 py-4">
          <label className="block">
            <span className={labelClass}>
              保護者のお名前<span className="ml-1 text-red-600">*</span>
            </span>
            <input
              className={inputClass}
              value={guardianName}
              onChange={(event) => setGuardianName(event.target.value)}
              required
            />
          </label>
          <label className="flex min-h-11 items-start gap-3">
            <input
              type="checkbox"
              checked={guardianConsent}
              onChange={(event) => setGuardianConsent(event.target.checked)}
              required
              className="mt-1 shrink-0"
            />
            <span className="text-sm leading-6 text-slate-700">
              保護者が参加に同意しています
              <span className="text-red-600"> *</span>
            </span>
          </label>
        </div>
      ) : null}

      <label className="flex min-h-11 items-start gap-3">
        <input
          type="checkbox"
          checked={infoConsent}
          onChange={(event) => setInfoConsent(event.target.checked)}
          required
          className="mt-1 shrink-0"
        />
        <span className="text-sm leading-6 text-slate-700">
          上記の説明を読み、検証実験への参加とデータの取り扱いに同意します
          <span className="text-red-600"> *</span>
        </span>
      </label>

      {error ? (
        <p className="text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
        {submitting ? "送信中…" : "参加登録する"}
      </Button>
    </form>
  );
}
