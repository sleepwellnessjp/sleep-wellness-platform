"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import InstructorNav from "@/components/InstructorNav";
import {
  BoolSelect,
  Field,
  GOLD,
  NAVY,
  NUMBER_RULES,
  SectionCard,
  ToggleChip,
  htmlMaxForRule,
  htmlMinForRule,
  inputClass,
  inputEmptyReadonlyClass,
  numberToInput,
  parseOptionalNumber,
  textareaClass,
} from "@/components/client-profile/form-ui";
import ProfileCompletionCard from "@/components/client-profile/ProfileCompletionCard";
import { CLIENT_GENDER_OPTIONS } from "@/lib/client-profile";
import {
  CAFFEINE_TYPE_OPTIONS,
  CLIENT_PROFILE_SCHEMA_VERSION,
  DRINKING_FREQUENCY_OPTIONS,
  EXERCISE_TYPE_OPTIONS,
  HEAT_ENVIRONMENT_TYPES,
  OCCUPATION_PRESETS,
  PROFILE_HINTS,
  PROFILE_LABELS,
  PROFILE_STEP_LABELS,
  SMOKING_TYPE_OPTIONS,
  WORK_STYLE_OPTIONS,
  calculateBmi,
  emptyClientProfileSections,
  mergeAttributesFromOccupationPreset,
  normalizeClientProfileSections,
  resolveAgeYears,
  type ClientProfileSections,
  WORK_ENVIRONMENT_ATTRIBUTES,
} from "@/lib/client-profiles";
import {
  getClientProfile,
  upsertClientProfile,
} from "@/lib/repositories/client-profile-repository";
import { getClientById } from "@/lib/repositories/client-repository";

export const PROFILE_STEPS = [
  { id: "basic", label: PROFILE_STEP_LABELS.basic },
  { id: "work", label: PROFILE_STEP_LABELS.work },
  { id: "environment", label: PROFILE_STEP_LABELS.environment },
  { id: "heat", label: PROFILE_STEP_LABELS.heat },
  { id: "commute", label: PROFILE_STEP_LABELS.commute },
  { id: "lifestyle", label: PROFILE_STEP_LABELS.lifestyle },
  { id: "hydration", label: PROFILE_STEP_LABELS.hydration },
  { id: "exercise", label: PROFILE_STEP_LABELS.exercise },
  { id: "health", label: PROFILE_STEP_LABELS.health },
  { id: "sleep", label: PROFILE_STEP_LABELS.sleep },
] as const;

type Props = {
  clientId: string;
  initialStep?: number;
};

export default function ClientProfileWizard({ clientId, initialStep = 0 }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(initialStep);
  const [sections, setSections] = useState<ClientProfileSections>(
    emptyClientProfileSections(),
  );
  const [clientName, setClientName] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [client, profile] = await Promise.all([
          getClientById(clientId),
          getClientProfile(clientId),
        ]);
        if (cancelled) return;
        if (!client) {
          setError("クライアントが見つかりません。");
          setReady(true);
          return;
        }
        setClientName(client.name);
        const next = normalizeClientProfileSections(profile);
        if (!next.basic.fullName?.trim()) {
          next.basic.fullName = client.name;
        }
        if (!next.basic.birthDate && client.birthDate) {
          next.basic.birthDate = client.birthDate;
        }
        if (next.basic.ageYears == null && client.age != null) {
          next.basic.ageYears = client.age;
        }
        if (!next.basic.gender && client.gender) {
          next.basic.gender = client.gender;
        }
        if (next.basic.heightCm == null && client.heightCm != null) {
          next.basic.heightCm = client.heightCm;
        }
        if (next.basic.weightKg == null && client.weightKg != null) {
          next.basic.weightKg = client.weightKg;
        }
        setSections(next);
      } catch (err) {
        console.error("[ClientProfileWizard] load failed:", err);
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "プロフィールの読み込みに失敗しました。",
          );
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const derivedAge = useMemo(
    () =>
      resolveAgeYears({
        birthDate: sections.basic.birthDate,
        ageYears: sections.basic.ageYears,
      }),
    [sections.basic.birthDate, sections.basic.ageYears],
  );

  const derivedBmi = useMemo(
    () => calculateBmi(sections.basic.heightCm, sections.basic.weightKg),
    [sections.basic.heightCm, sections.basic.weightKg],
  );

  const saveDraft = async (opts?: { advance?: boolean; finish?: boolean }) => {
    setError(null);
    setSaveMessage(null);

    const fullName = sections.basic.fullName?.trim() || clientName.trim();
    if (!fullName) {
      setError("氏名は必須です。");
      setStep(0);
      return false;
    }

    setSaving(true);
    try {
      const toSave = normalizeClientProfileSections({
        ...sections,
        basic: {
          ...sections.basic,
          fullName,
          ageYears: derivedAge,
          bmi: derivedBmi,
        },
        work: {
          ...sections.work,
          // 環境属性を正規の保存先に（職業名より優先）
          environmentAttributeIds: sections.work.environmentAttributeIds ?? [],
          traits: (sections.work.environmentAttributeIds ?? []).map((id) => {
            const found = WORK_ENVIRONMENT_ATTRIBUTES.find((a) => a.id === id);
            return found?.label ?? id;
          }),
        },
      });

      await upsertClientProfile(clientId, toSave);
      setSections(toSave);
      setClientName(fullName);
      setSaveMessage("途中保存しました");

      if (opts?.finish) {
        router.push(`/clients/${clientId}/profile/confirm`);
        return true;
      }
      if (opts?.advance && step < PROFILE_STEPS.length - 1) {
        setStep((current) => current + 1);
      }
      return true;
    } catch (err) {
      console.error("[ClientProfileWizard] save failed:", err);
      setError(
        err instanceof Error ? err.message : "保存に失敗しました。",
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5]">
        <p className="text-sm text-slate-400">読み込み中...</p>
      </main>
    );
  }

  if (error && !sections.basic.fullName && !clientName) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-5">
        <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-rose-600">{error}</p>
          <Link
            href="/clients"
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full px-8 py-3 text-white"
            style={{ backgroundColor: NAVY }}
          >
            一覧へ戻る
          </Link>
        </div>
      </main>
    );
  }

  const current = PROFILE_STEPS[step];

  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <InstructorNav eyebrow="CLIENT PROFILE" />

      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
        <header className="mb-8 text-center">
          <p
            className="text-[11px] font-semibold tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            FIXED PROFILE · v{CLIENT_PROFILE_SCHEMA_VERSION}
          </p>
          <h1
            className="mt-3 text-[1.75rem] font-semibold tracking-[-0.04em] sm:text-3xl"
            style={{ color: NAVY }}
          >
            {clientName || "クライアントプロフィール"}
          </h1>
          <p className="mt-3 text-[15px] leading-7 text-slate-500">
            固定情報のみ入力します。当日情報は含めません。必須は氏名のみです。
          </p>
          <p className="mx-auto mt-3 max-w-md text-[12px] leading-6 text-slate-400 sm:text-[13px]">
            <span
              className="font-serif tracking-[0.14em]"
              style={{ color: GOLD }}
            >
              ★★★☆☆
            </span>
            <span className="ml-2">
              はAI分析への重要度です。わかる範囲で入力いただくと、分析の精度が高まります。
            </span>
          </p>
        </header>

        <div className="mb-8">
          <ProfileCompletionCard
            sections={sections}
            derivedAgeYears={derivedAge}
            onSelectMissing={(field) => {
              const index = PROFILE_STEPS.findIndex(
                (item) => item.id === field.stepId,
              );
              if (index >= 0) setStep(index);
            }}
          />
        </div>

        <nav
          aria-label="プロフィール入力ステップ"
          className="mb-8 flex flex-wrap justify-center gap-2"
        >
          {PROFILE_STEPS.map((item, index) => {
            const active = index === step;
            const done = index < step;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setStep(index)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-wide transition ${
                  active
                    ? "bg-[#071426] text-white"
                    : done
                      ? "bg-[#8a6a2d]/15 text-[#8a6a2d]"
                      : "bg-white text-slate-400 border border-slate-200"
                }`}
              >
                {index + 1}. {item.label}
              </button>
            );
          })}
        </nav>

        {current?.id === "basic" && (
          <SectionCard title="1. 基本情報" description="氏名のみ必須です。">
            <Field label="氏名" required>
              <input
                className={inputClass}
                value={sections.basic.fullName ?? ""}
                onChange={(event) =>
                  setSections((s) => ({
                    ...s,
                    basic: { ...s.basic, fullName: event.target.value },
                  }))
                }
                placeholder="例：山田 太郎"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="生年月日">
                <input
                  type="date"
                  className={inputClass}
                  value={sections.basic.birthDate ?? ""}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      basic: { ...s.basic, birthDate: event.target.value },
                    }))
                  }
                />
              </Field>
              <Field label="年齢" unit="歳" hint="生年月日があれば自動計算">
                <input
                  type="number"
                  min={0}
                  max={130}
                  className={inputClass}
                  value={numberToInput(
                    derivedAge ?? sections.basic.ageYears,
                    NUMBER_RULES.age,
                  )}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      basic: {
                        ...s.basic,
                        ageYears: parseOptionalNumber(
                          event.target.value,
                          NUMBER_RULES.age,
                        ),
                      },
                    }))
                  }
                  placeholder="例：42"
                />
              </Field>
            </div>
            <Field label="性別">
              <select
                className={inputClass}
                value={sections.basic.gender ?? ""}
                onChange={(event) =>
                  setSections((s) => ({
                    ...s,
                    basic: { ...s.basic, gender: event.target.value },
                  }))
                }
              >
                <option value="">選択してください</option>
                {CLIENT_GENDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
                <option value="__custom">その他（自由入力）</option>
              </select>
            </Field>
            {sections.basic.gender &&
              !CLIENT_GENDER_OPTIONS.some(
                (o) => o.value === sections.basic.gender,
              ) &&
              sections.basic.gender !== "__custom" && (
                <Field label="性別（自由入力）">
                  <input
                    className={inputClass}
                    value={sections.basic.gender}
                    onChange={(event) =>
                      setSections((s) => ({
                        ...s,
                        basic: { ...s.basic, gender: event.target.value },
                      }))
                    }
                  />
                </Field>
              )}
            {sections.basic.gender === "__custom" && (
              <Field label="性別（自由入力）">
                <input
                  className={inputClass}
                  value=""
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      basic: { ...s.basic, gender: event.target.value },
                    }))
                  }
                  placeholder="自由に入力"
                />
              </Field>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="身長" unit="cm">
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  className={inputClass}
                  value={numberToInput(
                    sections.basic.heightCm,
                    NUMBER_RULES.positive,
                  )}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      basic: {
                        ...s.basic,
                        heightCm: parseOptionalNumber(
                          event.target.value,
                          NUMBER_RULES.positive,
                        ),
                      },
                    }))
                  }
                />
              </Field>
              <Field label="体重" unit="kg">
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  className={inputClass}
                  value={numberToInput(
                    sections.basic.weightKg,
                    NUMBER_RULES.positive,
                  )}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      basic: {
                        ...s.basic,
                        weightKg: parseOptionalNumber(
                          event.target.value,
                          NUMBER_RULES.positive,
                        ),
                      },
                    }))
                  }
                />
              </Field>
              <Field label="BMI" hint="自動計算">
                <input
                  readOnly
                  className={
                    derivedBmi != null ? inputClass : inputEmptyReadonlyClass
                  }
                  value={derivedBmi != null ? String(derivedBmi) : "未入力"}
                  tabIndex={-1}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="居住地域">
                <input
                  className={inputClass}
                  value={sections.basic.residenceRegion ?? ""}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      basic: {
                        ...s.basic,
                        residenceRegion: event.target.value,
                      },
                    }))
                  }
                  placeholder="例：東京都世田谷区"
                />
              </Field>
              <Field label="勤務先地域">
                <input
                  className={inputClass}
                  value={sections.basic.workplaceRegion ?? ""}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      basic: {
                        ...s.basic,
                        workplaceRegion: event.target.value,
                      },
                    }))
                  }
                  placeholder="例：東京都千代田区"
                />
              </Field>
            </div>
          </SectionCard>
        )}

        {current?.id === "work" && (
          <SectionCard
            title="2. 職業・勤務形態"
            description="職業名は表示用です。分析用には次の環境属性を優先します。"
          >
            <Field label="職業">
              <select
                className={inputClass}
                value={
                  sections.work.occupationPreset &&
                  (OCCUPATION_PRESETS as readonly string[]).includes(
                    sections.work.occupationPreset,
                  )
                    ? sections.work.occupationPreset
                    : sections.work.occupationCustom
                      ? "その他"
                      : sections.work.occupationPreset ?? ""
                }
                onChange={(event) => {
                  const preset = event.target.value;
                  setSections((s) => ({
                    ...s,
                    work: {
                      ...s.work,
                      occupationPreset: preset === "その他" ? "その他" : preset,
                      occupationCustom:
                        preset === "その他" ? s.work.occupationCustom ?? "" : "",
                      environmentAttributeIds: mergeAttributesFromOccupationPreset(
                        preset,
                        s.work.environmentAttributeIds,
                      ),
                    },
                  }));
                }}
              >
                <option value="">選択してください</option>
                {OCCUPATION_PRESETS.map((preset) => (
                  <option key={preset} value={preset}>
                    {preset}
                  </option>
                ))}
              </select>
            </Field>
            {(sections.work.occupationPreset === "その他" ||
              sections.work.occupationCustom) && (
              <Field label="職業（自由入力）">
                <input
                  className={inputClass}
                  value={sections.work.occupationCustom ?? ""}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      work: {
                        ...s.work,
                        occupationCustom: event.target.value,
                        occupationPreset: "その他",
                      },
                    }))
                  }
                  placeholder="自由に入力"
                />
              </Field>
            )}
            <Field labelKey="workStyle">
              <select
                className={inputClass}
                value={sections.work.workStyle ?? ""}
                onChange={(event) =>
                  setSections((s) => ({
                    ...s,
                    work: { ...s.work, workStyle: event.target.value },
                  }))
                }
              >
                <option value="">選択してください</option>
                {WORK_STYLE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field labelKey="workStartTime">
                <input
                  type="time"
                  className={inputClass}
                  value={sections.work.workStartTime ?? ""}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      work: { ...s.work, workStartTime: event.target.value },
                    }))
                  }
                />
              </Field>
              <Field labelKey="workEndTime">
                <input
                  type="time"
                  className={inputClass}
                  value={sections.work.workEndTime ?? ""}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      work: { ...s.work, workEndTime: event.target.value },
                    }))
                  }
                />
              </Field>
              <Field labelKey="workDaysPerWeek" unit="日">
                <input
                  type="number"
                  min={0}
                  max={7}
                  className={inputClass}
                  value={numberToInput(sections.work.workDaysPerWeek)}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      work: {
                        ...s.work,
                        workDaysPerWeek: parseOptionalNumber(event.target.value),
                      },
                    }))
                  }
                />
              </Field>
              <Field labelKey="nightShiftsPerMonth" unit="回/月">
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={numberToInput(sections.work.nightShiftsPerMonth)}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      work: {
                        ...s.work,
                        nightShiftsPerMonth: parseOptionalNumber(
                          event.target.value,
                        ),
                      },
                    }))
                  }
                />
              </Field>
            </div>
            <Field
              labelKey="workStressSelf"
              hint={PROFILE_HINTS.workStressSelf}
            >
              <textarea
                rows={3}
                className={textareaClass}
                value={sections.work.workStressSelf ?? ""}
                onChange={(event) =>
                  setSections((s) => ({
                    ...s,
                    work: { ...s.work, workStressSelf: event.target.value },
                  }))
                }
                placeholder="例：締切前は高め、普段は穏やか"
              />
            </Field>
          </SectionCard>
        )}

        {current?.id === "environment" && (
          <SectionCard
            title={`3. ${PROFILE_LABELS.environmentAttributes}`}
            description={PROFILE_HINTS.environmentAttributes}
          >
            <div className="flex flex-wrap gap-2">
              {WORK_ENVIRONMENT_ATTRIBUTES.map((attr) => {
                const ids = sections.work.environmentAttributeIds ?? [];
                const active = ids.includes(attr.id);
                return (
                  <ToggleChip
                    key={attr.id}
                    label={attr.label}
                    active={active}
                    onClick={() =>
                      setSections((s) => {
                        const currentIds = s.work.environmentAttributeIds ?? [];
                        const next = active
                          ? currentIds.filter((id) => id !== attr.id)
                          : [...currentIds, attr.id];
                        return {
                          ...s,
                          work: { ...s.work, environmentAttributeIds: next },
                        };
                      })
                    }
                  />
                );
              })}
            </div>
            <Field labelKey="environmentTraitsOther">
              <input
                className={inputClass}
                value={sections.work.traitsOther ?? ""}
                onChange={(event) =>
                  setSections((s) => ({
                    ...s,
                    work: { ...s.work, traitsOther: event.target.value },
                  }))
                }
                placeholder="選択肢にない場合は自由入力"
              />
            </Field>
          </SectionCard>
        )}

        {current?.id === "heat" && (
          <SectionCard
            title={`4. ${PROFILE_STEP_LABELS.heat}`}
            description="普段の傾向を入力します。その日ごとの状態は分析時に別途扱います。"
          >
            <Field
              labelKey="worksInHeat"
              hint={PROFILE_HINTS.worksInHeat}
            >
              <BoolSelect
                value={sections.heatExposure.worksInHeat}
                onChange={(next) =>
                  setSections((s) => ({
                    ...s,
                    heatExposure: { ...s.heatExposure, worksInHeat: next },
                  }))
                }
              />
            </Field>
            <Field
              labelKey="heatEnvironmentTypes"
              hint={PROFILE_HINTS.heatEnvironmentTypes}
            >
              <div className="mt-2 flex flex-wrap gap-2">
                {HEAT_ENVIRONMENT_TYPES.map((type) => {
                  const selected =
                    sections.heatExposure.heatEnvironmentTypes?.includes(type) ??
                    false;
                  return (
                    <ToggleChip
                      key={type}
                      label={type}
                      active={selected}
                      onClick={() =>
                        setSections((s) => {
                          const list = s.heatExposure.heatEnvironmentTypes ?? [];
                          return {
                            ...s,
                            heatExposure: {
                              ...s.heatExposure,
                              heatEnvironmentTypes: selected
                                ? list.filter((item) => item !== type)
                                : [...list, type],
                            },
                          };
                        })
                      }
                    />
                  );
                })}
              </div>
            </Field>
            <Field labelKey="heatEnvironmentOther">
              <input
                className={inputClass}
                value={sections.heatExposure.heatEnvironmentOther ?? ""}
                onChange={(event) =>
                  setSections((s) => ({
                    ...s,
                    heatExposure: {
                      ...s.heatExposure,
                      heatEnvironmentOther: event.target.value,
                    },
                  }))
                }
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                labelKey="heatRoomTemperatureC"
                hint={PROFILE_HINTS.heatRoomTemperatureC}
              >
                <input
                  type="number"
                  step="0.1"
                  min={htmlMinForRule(NUMBER_RULES.temperatureC)}
                  max={htmlMaxForRule(NUMBER_RULES.temperatureC)}
                  className={inputClass}
                  value={numberToInput(
                    sections.heatExposure.roomTemperatureC,
                    NUMBER_RULES.temperatureC,
                  )}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      heatExposure: {
                        ...s.heatExposure,
                        roomTemperatureC: parseOptionalNumber(
                          event.target.value,
                          NUMBER_RULES.temperatureC,
                        ),
                      },
                    }))
                  }
                />
              </Field>
              <Field
                labelKey="heatHumidityPercent"
                hint={PROFILE_HINTS.heatHumidityPercent}
              >
                <input
                  type="number"
                  min={htmlMinForRule(NUMBER_RULES.humidity)}
                  max={htmlMaxForRule(NUMBER_RULES.humidity)}
                  className={inputClass}
                  value={numberToInput(
                    sections.heatExposure.humidityPercent,
                    NUMBER_RULES.humidity,
                  )}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      heatExposure: {
                        ...s.heatExposure,
                        humidityPercent: parseOptionalNumber(
                          event.target.value,
                          NUMBER_RULES.humidity,
                        ),
                      },
                    }))
                  }
                />
              </Field>
              <Field
                labelKey="exposureDurationMinutes"
                hint={PROFILE_HINTS.exposureDurationMinutes}
              >
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={numberToInput(
                    sections.heatExposure.exposureDurationMinutes,
                  )}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      heatExposure: {
                        ...s.heatExposure,
                        exposureDurationMinutes: parseOptionalNumber(
                          event.target.value,
                        ),
                      },
                    }))
                  }
                />
              </Field>
              <Field
                labelKey="sweatAmount"
                hint={PROFILE_HINTS.sweatAmount}
              >
                <input
                  className={inputClass}
                  value={sections.heatExposure.sweatAmount ?? ""}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      heatExposure: {
                        ...s.heatExposure,
                        sweatAmount: event.target.value,
                      },
                    }))
                  }
                  placeholder="例：多い / 中程度"
                />
              </Field>
              <Field
                labelKey="waterIntakeDuringWorkMl"
                hint={PROFILE_HINTS.waterIntakeDuringWorkMl}
              >
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={numberToInput(
                    sections.heatExposure.waterIntakeDuringWorkMl,
                  )}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      heatExposure: {
                        ...s.heatExposure,
                        waterIntakeDuringWorkMl: parseOptionalNumber(
                          event.target.value,
                        ),
                      },
                    }))
                  }
                />
              </Field>
              <Field labelKey="breakCount">
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={numberToInput(sections.heatExposure.breakCount)}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      heatExposure: {
                        ...s.heatExposure,
                        breakCount: parseOptionalNumber(event.target.value),
                      },
                    }))
                  }
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                labelKey="changesClothesAfterWork"
                hint={PROFILE_HINTS.changesClothesAfterWork}
              >
                <BoolSelect
                  value={sections.heatExposure.changesClothesAfterWork}
                  onChange={(next) =>
                    setSections((s) => ({
                      ...s,
                      heatExposure: {
                        ...s.heatExposure,
                        changesClothesAfterWork: next,
                      },
                    }))
                  }
                />
              </Field>
              <Field
                labelKey="showerAfterWork"
                hint={PROFILE_HINTS.showerAfterWork}
              >
                <BoolSelect
                  value={sections.heatExposure.showerAfterWork}
                  onChange={(next) =>
                    setSections((s) => ({
                      ...s,
                      heatExposure: { ...s.heatExposure, showerAfterWork: next },
                    }))
                  }
                />
              </Field>
              <Field
                labelKey="cooldownDurationMinutes"
                hint={PROFILE_HINTS.cooldownDurationMinutes}
              >
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={numberToInput(
                    sections.heatExposure.cooldownDurationMinutes,
                  )}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      heatExposure: {
                        ...s.heatExposure,
                        cooldownDurationMinutes: parseOptionalNumber(
                          event.target.value,
                        ),
                      },
                    }))
                  }
                />
              </Field>
              <Field
                labelKey="movesImmediatelyAfterWork"
                hint={PROFILE_HINTS.movesImmediatelyAfterWork}
              >
                <BoolSelect
                  value={sections.heatExposure.movesImmediatelyAfterWork}
                  onChange={(next) =>
                    setSections((s) => ({
                      ...s,
                      heatExposure: {
                        ...s.heatExposure,
                        movesImmediatelyAfterWork: next,
                      },
                    }))
                  }
                />
              </Field>
            </div>
          </SectionCard>
        )}

        {current?.id === "commute" && (
          <SectionCard title="5. 通勤" description="片道の目安時間を入力します。">
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["徒歩時間", "walkOneWayMinutes"],
                  ["自転車時間", "bicycleOneWayMinutes"],
                  ["電車時間", "trainOneWayMinutes"],
                  ["バス時間", "busOneWayMinutes"],
                  ["車時間", "carOneWayMinutes"],
                  ["バイク時間", "motorcycleOneWayMinutes"],
                ] as const
              ).map(([label, key]) => (
                <Field key={key} label={label} unit="分">
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={numberToInput(sections.commute[key])}
                    onChange={(event) =>
                      setSections((s) => ({
                        ...s,
                        commute: {
                          ...s.commute,
                          [key]: parseOptionalNumber(event.target.value),
                        },
                      }))
                    }
                  />
                </Field>
              ))}
              <Field label="乗り換え回数" unit="回">
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={numberToInput(sections.commute.transferCount)}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      commute: {
                        ...s.commute,
                        transferCount: parseOptionalNumber(event.target.value),
                      },
                    }))
                  }
                />
              </Field>
              <Field label="通勤日数" unit="日/週">
                <input
                  type="number"
                  min={0}
                  max={7}
                  className={inputClass}
                  value={numberToInput(sections.commute.commuteDaysPerWeek)}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      commute: {
                        ...s.commute,
                        commuteDaysPerWeek: parseOptionalNumber(
                          event.target.value,
                        ),
                      },
                    }))
                  }
                />
              </Field>
            </div>
            <Field labelKey="crowdingLevel">
              <input
                className={inputClass}
                value={sections.commute.crowdingLevel ?? ""}
                onChange={(event) =>
                  setSections((s) => ({
                    ...s,
                    commute: { ...s.commute, crowdingLevel: event.target.value },
                  }))
                }
                placeholder="例：満員 / 空いている"
              />
            </Field>
            <Field
              labelKey="commuteStressSelf"
              hint={PROFILE_HINTS.commuteStressSelf}
            >
              <textarea
                rows={2}
                className={textareaClass}
                value={sections.commute.commuteStressSelf ?? ""}
                onChange={(event) =>
                  setSections((s) => ({
                    ...s,
                    commute: {
                      ...s.commute,
                      commuteStressSelf: event.target.value,
                    },
                  }))
                }
              />
            </Field>
          </SectionCard>
        )}

        {current?.id === "lifestyle" && (
          <SectionCard title="6. 生活習慣" description="固定の習慣です。当日分は別フォームです。">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                labelKey="drinkingFrequency"
                hint={PROFILE_HINTS.drinkingFrequency}
              >
                <select
                  className={inputClass}
                  value={sections.lifestyle.drinkingFrequency ?? ""}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      lifestyle: {
                        ...s.lifestyle,
                        drinkingFrequency: event.target.value,
                      },
                    }))
                  }
                >
                  <option value="">選択してください</option>
                  {DRINKING_FREQUENCY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
              <Field labelKey="drinkingAmountPerOccasion">
                <input
                  className={inputClass}
                  value={sections.lifestyle.drinkingAmountPerOccasion ?? ""}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      lifestyle: {
                        ...s.lifestyle,
                        drinkingAmountPerOccasion: event.target.value,
                      },
                    }))
                  }
                  placeholder="例：ビール500ml"
                />
              </Field>
              <Field labelKey="smokingType">
                <select
                  className={inputClass}
                  value={sections.lifestyle.smokingType ?? ""}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      lifestyle: {
                        ...s.lifestyle,
                        smokingType: event.target.value,
                      },
                    }))
                  }
                >
                  <option value="">選択してください</option>
                  {SMOKING_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-[#fafaf8] px-4 py-4">
              <p className="text-sm font-semibold text-[#071426]">カフェイン</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Field labelKey="caffeineType">
                  <select
                    className={inputClass}
                    value={sections.caffeine.entries?.[0]?.type ?? ""}
                    onChange={(event) =>
                      setSections((s) => {
                        const entry = {
                          ...(s.caffeine.entries?.[0] ?? { type: "" }),
                          type: event.target.value,
                        };
                        return {
                          ...s,
                          caffeine: { ...s.caffeine, entries: [entry] },
                        };
                      })
                    }
                  >
                    <option value="">選択してください</option>
                    {CAFFEINE_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field labelKey="caffeineAmount">
                  <input
                    className={inputClass}
                    value={sections.caffeine.entries?.[0]?.amountNote ?? ""}
                    onChange={(event) =>
                      setSections((s) => {
                        const entry = {
                          ...(s.caffeine.entries?.[0] ?? { type: "" }),
                          amountNote: event.target.value,
                        };
                        return {
                          ...s,
                          caffeine: { ...s.caffeine, entries: [entry] },
                        };
                      })
                    }
                    placeholder="例：1日2杯"
                  />
                </Field>
                <Field labelKey="caffeineLastIntakeTime">
                  <input
                    type="time"
                    className={inputClass}
                    value={
                      sections.caffeine.entries?.[0]?.lastIntakeTimeTypical ?? ""
                    }
                    onChange={(event) =>
                      setSections((s) => {
                        const entry = {
                          ...(s.caffeine.entries?.[0] ?? { type: "" }),
                          lastIntakeTimeTypical: event.target.value,
                        };
                        return {
                          ...s,
                          caffeine: { ...s.caffeine, entries: [entry] },
                        };
                      })
                    }
                  />
                </Field>
                <Field labelKey="caffeineDecaf">
                  <BoolSelect
                    value={sections.caffeine.entries?.[0]?.isDecaf}
                    onChange={(next) =>
                      setSections((s) => {
                        const entry = {
                          ...(s.caffeine.entries?.[0] ?? { type: "" }),
                          isDecaf: next,
                        };
                        return {
                          ...s,
                          caffeine: { ...s.caffeine, entries: [entry] },
                        };
                      })
                    }
                  />
                </Field>
              </div>
            </div>
          </SectionCard>
        )}

        {current?.id === "hydration" && (
          <SectionCard title="7. 水分" description="1日あたりの目安（mL）">
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["水、ミネラルウォーター", "waterMl", "hydrationWaterMl"],
                  ["お茶類", "teaMl", "hydrationTeaMl"],
                  ["コーヒー、紅茶", "coffeeTeaMl", "hydrationCoffeeTeaMl"],
                  ["スポーツドリンク", "sportsDrinkMl", "hydrationSportsDrinkMl"],
                  ["アルコール", "alcoholMl", "hydrationAlcoholMl"],
                  ["その他", "otherBeverageMl", "hydrationOtherMl"],
                ] as const
              ).map(([label, key, labelKey]) => (
                <Field key={key} label={label} labelKey={labelKey} unit="mL">
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={numberToInput(sections.hydration[key])}
                    onChange={(event) =>
                      setSections((s) => ({
                        ...s,
                        hydration: {
                          ...s.hydration,
                          [key]: parseOptionalNumber(event.target.value),
                        },
                      }))
                    }
                  />
                </Field>
              ))}
            </div>
            <Field labelKey="hydrationTotalMl" hint="保存時に自動合計">
              <input
                readOnly
                className={
                  sections.hydration.totalFluidMl != null &&
                  Number.isFinite(sections.hydration.totalFluidMl) &&
                  sections.hydration.totalFluidMl >= 0
                    ? inputClass
                    : inputEmptyReadonlyClass
                }
                value={
                  sections.hydration.totalFluidMl != null &&
                  Number.isFinite(sections.hydration.totalFluidMl) &&
                  sections.hydration.totalFluidMl >= 0
                    ? String(sections.hydration.totalFluidMl)
                    : "未入力"
                }
                tabIndex={-1}
              />
            </Field>
            <Field labelKey="preSleep2hFluidMl">
              <input
                type="number"
                min={0}
                className={inputClass}
                value={numberToInput(sections.hydration.preSleep2hFluidMl)}
                onChange={(event) =>
                  setSections((s) => ({
                    ...s,
                    hydration: {
                      ...s.hydration,
                      preSleep2hFluidMl: parseOptionalNumber(event.target.value),
                    },
                  }))
                }
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field labelKey="nocturia">
                <BoolSelect
                  value={sections.hydration.nocturia}
                  onChange={(next) =>
                    setSections((s) => ({
                      ...s,
                      hydration: { ...s.hydration, nocturia: next },
                    }))
                  }
                />
              </Field>
              <Field
                labelKey="nighttimeUrinationCount"
                hint={PROFILE_HINTS.nighttimeUrinationCount}
              >
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={numberToInput(sections.hydration.nighttimeUrinationCount)}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      hydration: {
                        ...s.hydration,
                        nighttimeUrinationCount: parseOptionalNumber(
                          event.target.value,
                        ),
                      },
                    }))
                  }
                />
              </Field>
            </div>
          </SectionCard>
        )}

        {current?.id === "exercise" && (
          <SectionCard title="8. 運動" description="固定の運動習慣です。">
            <Field labelKey="exerciseFrequency">
              <input
                className={inputClass}
                value={sections.exercise.frequency ?? ""}
                onChange={(event) =>
                  setSections((s) => ({
                    ...s,
                    exercise: { ...s.exercise, frequency: event.target.value },
                  }))
                }
                placeholder="例：週3回"
              />
            </Field>
            <Field label="種類">
              <div className="mt-2 flex flex-wrap gap-2">
                {EXERCISE_TYPE_OPTIONS.map((type) => {
                  const selected =
                    sections.exercise.types?.includes(type) ?? false;
                  return (
                    <ToggleChip
                      key={type}
                      label={type}
                      active={selected}
                      onClick={() =>
                        setSections((s) => {
                          const list = s.exercise.types ?? [];
                          return {
                            ...s,
                            exercise: {
                              ...s.exercise,
                              types: selected
                                ? list.filter((item) => item !== type)
                                : [...list, type],
                            },
                          };
                        })
                      }
                    />
                  );
                })}
              </div>
            </Field>
            <Field labelKey="exerciseTypeOther">
              <input
                className={inputClass}
                value={sections.exercise.typeOther ?? ""}
                onChange={(event) =>
                  setSections((s) => ({
                    ...s,
                    exercise: { ...s.exercise, typeOther: event.target.value },
                  }))
                }
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field labelKey="exerciseDurationMinutes">
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={numberToInput(sections.exercise.durationMinutes)}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      exercise: {
                        ...s.exercise,
                        durationMinutes: parseOptionalNumber(event.target.value),
                      },
                    }))
                  }
                />
              </Field>
              <Field labelKey="exerciseIntensity">
                <input
                  className={inputClass}
                  value={sections.exercise.intensity ?? ""}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      exercise: { ...s.exercise, intensity: event.target.value },
                    }))
                  }
                  placeholder="例：低め / 中程度 / 高め"
                />
              </Field>
              <Field labelKey="exerciseEndTime">
                <input
                  type="time"
                  className={inputClass}
                  value={sections.exercise.endTimeTypical ?? ""}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      exercise: {
                        ...s.exercise,
                        endTimeTypical: event.target.value,
                      },
                    }))
                  }
                />
              </Field>
              <Field
                labelKey="exerciseInHeat"
                hint={PROFILE_HINTS.exerciseInHeat}
              >
                <BoolSelect
                  value={sections.exercise.inHeatEnvironment}
                  onChange={(next) =>
                    setSections((s) => ({
                      ...s,
                      exercise: { ...s.exercise, inHeatEnvironment: next },
                    }))
                  }
                />
              </Field>
              <Field
                labelKey="exerciseSweatAmount"
                hint={PROFILE_HINTS.exerciseSweatAmount}
              >
                <input
                  className={inputClass}
                  value={sections.exercise.sweatAmount ?? ""}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      exercise: { ...s.exercise, sweatAmount: event.target.value },
                    }))
                  }
                />
              </Field>
              <Field labelKey="fluidAfterExercise">
                <input
                  className={inputClass}
                  value={sections.exercise.fluidAfterExercise ?? ""}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      exercise: {
                        ...s.exercise,
                        fluidAfterExercise: event.target.value,
                      },
                    }))
                  }
                />
              </Field>
              <Field labelKey="changesClothesAfterExercise">
                <BoolSelect
                  value={sections.exercise.changesClothesAfter}
                  onChange={(next) =>
                    setSections((s) => ({
                      ...s,
                      exercise: { ...s.exercise, changesClothesAfter: next },
                    }))
                  }
                />
              </Field>
              <Field labelKey="showerAfterExercise">
                <BoolSelect
                  value={sections.exercise.showerAfter}
                  onChange={(next) =>
                    setSections((s) => ({
                      ...s,
                      exercise: { ...s.exercise, showerAfter: next },
                    }))
                  }
                />
              </Field>
              <Field
                labelKey="exerciseCooldownMinutes"
                hint={PROFILE_HINTS.exerciseCooldownMinutes}
              >
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={numberToInput(sections.exercise.cooldownDurationMinutes)}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      exercise: {
                        ...s.exercise,
                        cooldownDurationMinutes: parseOptionalNumber(
                          event.target.value,
                        ),
                      },
                    }))
                  }
                />
              </Field>
              <Field
                labelKey="movesImmediatelyAfterExercise"
                hint={PROFILE_HINTS.movesImmediatelyAfterExercise}
              >
                <BoolSelect
                  value={sections.exercise.movesImmediatelyAfter}
                  onChange={(next) =>
                    setSections((s) => ({
                      ...s,
                      exercise: { ...s.exercise, movesImmediatelyAfter: next },
                    }))
                  }
                />
              </Field>
            </div>
          </SectionCard>
        )}

        {current?.id === "health" && (
          <SectionCard title="9. 健康情報" description="機微情報です。分かる範囲で構いません。">
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["更年期", "menopause"],
                  ["服薬", "medicationsNote"],
                  ["睡眠薬", "sleepMedicationUse"],
                  ["鼻づまり", "nasalCongestionHabitual"],
                  ["花粉症", "pollenAllergy"],
                  ["アレルギー", "allergies"],
                  ["いびき", "snoring"],
                  ["睡眠時無呼吸症候群の診断有無", "sleepApneaDiagnosed"],
                  ["高血圧", "hypertension"],
                  ["糖尿病", "diabetes"],
                  ["脂質異常症", "dyslipidemia"],
                  ["心疾患", "heartDisease"],
                  ["呼吸器疾患", "respiratoryDisease"],
                  ["慢性疼痛", "chronicPain"],
                ] as const
              ).map(([label, key]) => (
                <Field key={key} labelKey={key} label={label}>
                  <input
                    className={inputClass}
                    value={sections.health[key] ?? ""}
                    onChange={(event) =>
                      setSections((s) => ({
                        ...s,
                        health: { ...s.health, [key]: event.target.value },
                      }))
                    }
                    placeholder="例：なし / あり"
                  />
                </Field>
              ))}
            </div>
            <Field label="その他持病">
              <textarea
                rows={3}
                className={textareaClass}
                value={sections.health.otherConditions ?? ""}
                onChange={(event) =>
                  setSections((s) => ({
                    ...s,
                    health: { ...s.health, otherConditions: event.target.value },
                  }))
                }
              />
            </Field>
          </SectionCard>
        )}

        {current?.id === "sleep" && (
          <SectionCard title="10. 睡眠・生活環境" description="普段の環境です。当日実測は含めません。">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field labelKey="typicalBedtime">
                <input
                  type="time"
                  className={inputClass}
                  value={sections.sleepEnvironment.typicalBedtime ?? ""}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      sleepEnvironment: {
                        ...s.sleepEnvironment,
                        typicalBedtime: event.target.value,
                      },
                    }))
                  }
                />
              </Field>
              <Field labelKey="typicalWakeTime">
                <input
                  type="time"
                  className={inputClass}
                  value={sections.sleepEnvironment.typicalWakeTime ?? ""}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      sleepEnvironment: {
                        ...s.sleepEnvironment,
                        typicalWakeTime: event.target.value,
                      },
                    }))
                  }
                />
              </Field>
              <Field labelKey="napHabit">
                <input
                  className={inputClass}
                  value={sections.sleepEnvironment.napHabit ?? ""}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      sleepEnvironment: {
                        ...s.sleepEnvironment,
                        napHabit: event.target.value,
                      },
                    }))
                  }
                />
              </Field>
              <Field labelKey="daytimeSleepiness">
                <input
                  className={inputClass}
                  value={sections.sleepEnvironment.daytimeSleepiness ?? ""}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      sleepEnvironment: {
                        ...s.sleepEnvironment,
                        daytimeSleepiness: event.target.value,
                      },
                    }))
                  }
                />
              </Field>
              <Field labelKey="sleepSatisfaction">
                <input
                  className={inputClass}
                  value={sections.sleepEnvironment.sleepSatisfaction ?? ""}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      sleepEnvironment: {
                        ...s.sleepEnvironment,
                        sleepSatisfaction: event.target.value,
                      },
                    }))
                  }
                />
              </Field>
              <Field labelKey="cohabitants">
                <input
                  className={inputClass}
                  value={sections.sleepEnvironment.cohabitants ?? ""}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      sleepEnvironment: {
                        ...s.sleepEnvironment,
                        cohabitants: event.target.value,
                      },
                    }))
                  }
                />
              </Field>
              <Field labelKey="youngChildren">
                <input
                  className={inputClass}
                  value={sections.sleepEnvironment.youngChildren ?? ""}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      sleepEnvironment: {
                        ...s.sleepEnvironment,
                        youngChildren: event.target.value,
                      },
                    }))
                  }
                />
              </Field>
              <Field labelKey="caregiving">
                <input
                  className={inputClass}
                  value={sections.sleepEnvironment.caregiving ?? ""}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      sleepEnvironment: {
                        ...s.sleepEnvironment,
                        caregiving: event.target.value,
                      },
                    }))
                  }
                />
              </Field>
              <Field labelKey="pets">
                <input
                  className={inputClass}
                  value={sections.sleepEnvironment.pets ?? ""}
                  onChange={(event) =>
                    setSections((s) => ({
                      ...s,
                      sleepEnvironment: {
                        ...s.sleepEnvironment,
                        pets: event.target.value,
                      },
                    }))
                  }
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  [
                    PROFILE_LABELS.homeTemperatureC,
                    "homeTemperatureC",
                    NUMBER_RULES.temperatureC,
                  ],
                  [
                    PROFILE_LABELS.homeHumidityPercent,
                    "homeHumidityPercent",
                    NUMBER_RULES.humidity,
                  ],
                  [
                    PROFILE_LABELS.bedroomBedtimeTemperatureC,
                    "bedroomBedtimeTemperatureC",
                    NUMBER_RULES.temperatureC,
                  ],
                  [
                    PROFILE_LABELS.bedroomBedtimeHumidityPercent,
                    "bedroomBedtimeHumidityPercent",
                    NUMBER_RULES.humidity,
                  ],
                  [
                    PROFILE_LABELS.workplaceTemperatureC,
                    "workplaceTemperatureC",
                    NUMBER_RULES.temperatureC,
                  ],
                  [
                    PROFILE_LABELS.workplaceHumidityPercent,
                    "workplaceHumidityPercent",
                    NUMBER_RULES.humidity,
                  ],
                ] as const
              ).map(([, key, rule]) => (
                <Field key={key} labelKey={key}>
                  <input
                    type="number"
                    step="0.1"
                    min={htmlMinForRule(rule)}
                    max={htmlMaxForRule(rule)}
                    className={inputClass}
                    value={numberToInput(sections.sleepEnvironment[key], rule)}
                    onChange={(event) =>
                      setSections((s) => ({
                        ...s,
                        sleepEnvironment: {
                          ...s.sleepEnvironment,
                          [key]: parseOptionalNumber(event.target.value, rule),
                        },
                      }))
                    }
                  />
                </Field>
              ))}
            </div>

            <p className="pt-2 text-sm font-semibold text-[#071426]">寝室の設備</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["冷房", "airConditioning"],
                  ["暖房", "heating"],
                  ["除湿", "dehumidifier"],
                  ["加湿器", "humidifier"],
                  ["扇風機", "fan"],
                  ["窓を開けて寝る", "windowOpen"],
                  ["遮光カーテン", "blackoutCurtain"],
                ] as const
              ).map(([label, key]) => (
                <Field key={key} labelKey={key} label={label}>
                  <BoolSelect
                    value={sections.sleepEnvironment.bedroomControls?.[key]}
                    onChange={(next) =>
                      setSections((s) => ({
                        ...s,
                        sleepEnvironment: {
                          ...s.sleepEnvironment,
                          bedroomControls: {
                            ...(s.sleepEnvironment.bedroomControls ?? {}),
                            [key]: next,
                          },
                        },
                      }))
                    }
                  />
                </Field>
              ))}
            </div>
          </SectionCard>
        )}

        <div className="mt-8 space-y-3">
          {error && (
            <p className="text-center text-sm font-medium text-rose-600">{error}</p>
          )}
          {saveMessage && (
            <p className="text-center text-sm font-medium text-[#315f68]">
              {saveMessage}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button
              type="button"
              disabled={step === 0 || saving}
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-[15px] font-semibold text-slate-600 disabled:opacity-40"
            >
              前へ
            </button>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveDraft()}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#8a6a2d]/35 bg-[#faf7f1] px-6 py-3 text-[15px] font-semibold text-[#8a6a2d] disabled:opacity-60"
              >
                {saving ? "保存中..." : "途中保存"}
              </button>

              {step < PROFILE_STEPS.length - 1 ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveDraft({ advance: true })}
                  className="inline-flex min-h-12 items-center justify-center rounded-full px-7 py-3 text-[15px] font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: NAVY }}
                >
                  保存して次へ
                </button>
              ) : (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveDraft({ finish: true })}
                  className="inline-flex min-h-12 items-center justify-center rounded-full px-7 py-3 text-[15px] font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: NAVY }}
                >
                  保存して確認へ
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-center gap-4 pt-2">
            <Link
              href={`/clients/${clientId}`}
              className="text-sm font-medium text-slate-400 hover:text-slate-600"
            >
              詳細へ戻る
            </Link>
            <Link
              href={`/clients/${clientId}/profile/confirm`}
              className="text-sm font-medium text-slate-400 hover:text-slate-600"
            >
              確認画面へ
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
