"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import InstructorNav from "@/components/InstructorNav";
import { GOLD, NAVY, AiImportanceMark } from "@/components/client-profile/form-ui";
import ProfileAiSummaryCard from "@/components/client-profile/ProfileAiSummaryCard";
import ProfileCompletionCard from "@/components/client-profile/ProfileCompletionCard";
import ProfileSleepRelationCard from "@/components/client-profile/ProfileSleepRelationCard";
import { formatGenderLabel } from "@/lib/client-profile";
import {
  AI_IMPORTANCE_HINT,
  EMPTY_DISPLAY,
  EMPTY_DISPLAY_STYLE,
  getProfileAiImportance,
  NUMBER_RULES,
  PROFILE_LABELS,
  PROFILE_SECTION_TITLES,
  attributeLabel,
  displayProfileValue,
  type ClientProfileRecord,
  type ProfileLabelKey,
} from "@/lib/client-profiles";
import { getClientProfile } from "@/lib/repositories/client-profile-repository";
import { getClientById } from "@/lib/repositories/client-repository";

type SectionKey = keyof typeof PROFILE_SECTION_TITLES;

function Row({
  label,
  labelKey,
  value,
  numberRule,
}: {
  label: string;
  labelKey?: ProfileLabelKey;
  value: unknown;
  numberRule?: (typeof NUMBER_RULES)[keyof typeof NUMBER_RULES];
}) {
  const display = displayProfileValue(value, { numberRule });
  const isEmpty = display === EMPTY_DISPLAY;
  const importance = labelKey ? getProfileAiImportance(labelKey) : undefined;

  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 last:border-b-0">
      <dt className="flex min-w-0 shrink-0 flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="text-[13px] text-slate-400">{label}</span>
        <AiImportanceMark stars={importance} />
      </dt>
      <dd className="text-right text-[14px] font-medium tracking-[-0.02em]">
        {isEmpty ? (
          <span
            className="inline-block rounded-lg px-2.5 py-1 text-[13px] font-semibold"
            style={{
              backgroundColor: EMPTY_DISPLAY_STYLE.background,
              color: EMPTY_DISPLAY_STYLE.color,
            }}
          >
            {EMPTY_DISPLAY}
          </span>
        ) : (
          <span style={{ color: NAVY }}>{display}</span>
        )}
      </dd>
    </div>
  );
}

function AccordionBlock({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200/90 bg-white">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition-colors duration-200 hover:bg-slate-50/80 sm:px-6"
      >
        <h2
          className="text-base font-semibold tracking-[-0.02em]"
          style={{ color: NAVY }}
        >
          {title}
        </h2>
        <span
          className="shrink-0 text-[12px] leading-none text-slate-400"
          aria-hidden
        >
          {open ? "▲" : "▼"}
        </span>
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <dl className="border-t border-slate-100 px-5 pb-5 pt-3 sm:px-6">
            {children}
          </dl>
        </div>
      </div>
    </section>
  );
}

export default function ClientProfileConfirmView({
  clientId,
}: {
  clientId: string;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<ClientProfileRecord | null>(null);
  const [name, setName] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<
    Record<SectionKey, boolean>
  >({
    basic: true,
    work: false,
    environment: false,
    heat: false,
    commute: false,
    lifestyle: false,
    hydration: false,
    exercise: false,
    health: false,
    sleep: false,
  });

  const toggleSection = (key: SectionKey) => {
    setOpenSections((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [client, loaded] = await Promise.all([
          getClientById(clientId),
          getClientProfile(clientId),
        ]);
        if (cancelled) return;
        if (!client) {
          setError("クライアントが見つかりません。");
          setReady(true);
          return;
        }
        setName(client.name);
        setProfile(loaded);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "プロフィールの取得に失敗しました。",
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

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5]">
        <p className="text-sm text-slate-400">読み込み中...</p>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-5">
        <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-rose-600">
            {error ?? "プロフィールがありません"}
          </p>
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

  const attrLabels = (profile.work.environmentAttributeIds ?? []).map(
    attributeLabel,
  );
  const temp = NUMBER_RULES.temperatureC;
  const humidity = NUMBER_RULES.humidity;

  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <InstructorNav eyebrow="PROFILE CONFIRM" />

      <div className="mx-auto max-w-3xl space-y-5 px-5 py-8 sm:px-8 sm:py-12 lg:max-w-5xl">
        <header className="text-center">
          <p
            className="text-[11px] font-semibold tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            PROFILE CONFIRM
          </p>
          <h1
            className="mt-3 text-[1.75rem] font-semibold tracking-[-0.04em] sm:text-3xl"
            style={{ color: NAVY }}
          >
            {profile.basic.fullName || name}
          </h1>
          <p className="mt-3 text-[15px] leading-7 text-slate-500">
            入力済みの固定プロフィールです。内容を確認し、必要なら編集してください。
          </p>
          <p className="mx-auto mt-3 max-w-md text-[12px] leading-6 text-slate-400 sm:text-[13px]">
            {AI_IMPORTANCE_HINT}
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.95fr)] lg:items-start">
          <ProfileCompletionCard
            sections={profile}
            derivedAgeYears={profile.basic.ageYears}
            onSelectMissing={(field) => {
              router.push(
                `/clients/${clientId}/profile?step=${encodeURIComponent(field.stepId)}`,
              );
            }}
          />
          <div className="hidden lg:block">
            <ProfileAiSummaryCard sections={profile} />
          </div>
        </div>

        <ProfileSleepRelationCard sections={profile} />

        <AccordionBlock
          title={PROFILE_SECTION_TITLES.basic}
          open={openSections.basic}
          onToggle={() => toggleSection("basic")}
        >
          <Row label={PROFILE_LABELS.fullName} labelKey="fullName" value={profile.basic.fullName || name} />
          <Row label={PROFILE_LABELS.birthDate} labelKey="birthDate" value={profile.basic.birthDate} />
          <Row label={PROFILE_LABELS.ageYears} labelKey="ageYears"
            value={profile.basic.ageYears}
            numberRule={NUMBER_RULES.age}
          />
          <Row label={PROFILE_LABELS.gender} labelKey="gender"
            value={formatGenderLabel(profile.basic.gender) || profile.basic.gender}
          />
          <Row label={PROFILE_LABELS.heightCm} labelKey="heightCm"
            value={profile.basic.heightCm}
            numberRule={NUMBER_RULES.positive}
          />
          <Row label={PROFILE_LABELS.weightKg} labelKey="weightKg"
            value={profile.basic.weightKg}
            numberRule={NUMBER_RULES.positive}
          />
          <Row label={PROFILE_LABELS.bmi} labelKey="bmi"
            value={profile.basic.bmi}
            numberRule={NUMBER_RULES.positive}
          />
          <Row label={PROFILE_LABELS.residenceRegion} labelKey="residenceRegion" value={profile.basic.residenceRegion} />
          <Row label={PROFILE_LABELS.workplaceRegion} labelKey="workplaceRegion" value={profile.basic.workplaceRegion} />
        </AccordionBlock>

        <AccordionBlock
          title={PROFILE_SECTION_TITLES.work}
          open={openSections.work}
          onToggle={() => toggleSection("work")}
        >
          <Row label={PROFILE_LABELS.occupation} labelKey="occupation"
            value={
              profile.work.occupationCustom || profile.work.occupationPreset
            }
          />
          <Row label={PROFILE_LABELS.workStyle} labelKey="workStyle" value={profile.work.workStyle} />
          <Row label={PROFILE_LABELS.workStartTime} labelKey="workStartTime" value={profile.work.workStartTime} />
          <Row label={PROFILE_LABELS.workEndTime} labelKey="workEndTime" value={profile.work.workEndTime} />
          <Row label={PROFILE_LABELS.workDaysPerWeek} labelKey="workDaysPerWeek" value={profile.work.workDaysPerWeek} />
          <Row label={PROFILE_LABELS.nightShiftsPerMonth} labelKey="nightShiftsPerMonth"
            value={profile.work.nightShiftsPerMonth}
          />
          <Row label={PROFILE_LABELS.workStressSelf} labelKey="workStressSelf" value={profile.work.workStressSelf} />
        </AccordionBlock>

        <AccordionBlock
          title={PROFILE_SECTION_TITLES.environment}
          open={openSections.environment}
          onToggle={() => toggleSection("environment")}
        >
          <Row label={PROFILE_LABELS.environmentAttributes} labelKey="environmentAttributes" value={attrLabels} />
          <Row label={PROFILE_LABELS.environmentTraitsOther} labelKey="environmentTraitsOther" value={profile.work.traitsOther} />
        </AccordionBlock>

        <AccordionBlock
          title={PROFILE_SECTION_TITLES.heat}
          open={openSections.heat}
          onToggle={() => toggleSection("heat")}
        >
          <Row label={PROFILE_LABELS.worksInHeat} labelKey="worksInHeat" value={profile.heatExposure.worksInHeat} />
          <Row label={PROFILE_LABELS.heatEnvironmentTypes} labelKey="heatEnvironmentTypes"
            value={profile.heatExposure.heatEnvironmentTypes}
          />
          <Row label={PROFILE_LABELS.heatEnvironmentOther} labelKey="heatEnvironmentOther"
            value={profile.heatExposure.heatEnvironmentOther}
          />
          <Row label={PROFILE_LABELS.heatRoomTemperatureC} labelKey="heatRoomTemperatureC"
            value={profile.heatExposure.roomTemperatureC}
            numberRule={temp}
          />
          <Row label={PROFILE_LABELS.heatHumidityPercent} labelKey="heatHumidityPercent"
            value={profile.heatExposure.humidityPercent}
            numberRule={humidity}
          />
          <Row label={PROFILE_LABELS.exposureDurationMinutes} labelKey="exposureDurationMinutes"
            value={profile.heatExposure.exposureDurationMinutes}
          />
          <Row label={PROFILE_LABELS.sweatAmount} labelKey="sweatAmount" value={profile.heatExposure.sweatAmount} />
          <Row label={PROFILE_LABELS.waterIntakeDuringWorkMl} labelKey="waterIntakeDuringWorkMl"
            value={profile.heatExposure.waterIntakeDuringWorkMl}
          />
          <Row label={PROFILE_LABELS.breakCount} labelKey="breakCount" value={profile.heatExposure.breakCount} />
          <Row label={PROFILE_LABELS.changesClothesAfterWork} labelKey="changesClothesAfterWork"
            value={profile.heatExposure.changesClothesAfterWork}
          />
          <Row label={PROFILE_LABELS.showerAfterWork} labelKey="showerAfterWork"
            value={profile.heatExposure.showerAfterWork}
          />
          <Row label={PROFILE_LABELS.cooldownDurationMinutes} labelKey="cooldownDurationMinutes"
            value={profile.heatExposure.cooldownDurationMinutes}
          />
          <Row label={PROFILE_LABELS.movesImmediatelyAfterWork} labelKey="movesImmediatelyAfterWork"
            value={profile.heatExposure.movesImmediatelyAfterWork}
          />
        </AccordionBlock>

        <AccordionBlock
          title={PROFILE_SECTION_TITLES.commute}
          open={openSections.commute}
          onToggle={() => toggleSection("commute")}
        >
          <Row label={PROFILE_LABELS.walkOneWayMinutes} labelKey="walkOneWayMinutes" value={profile.commute.walkOneWayMinutes} />
          <Row label={PROFILE_LABELS.bicycleOneWayMinutes} labelKey="bicycleOneWayMinutes"
            value={profile.commute.bicycleOneWayMinutes}
          />
          <Row label={PROFILE_LABELS.trainOneWayMinutes} labelKey="trainOneWayMinutes" value={profile.commute.trainOneWayMinutes} />
          <Row label={PROFILE_LABELS.busOneWayMinutes} labelKey="busOneWayMinutes" value={profile.commute.busOneWayMinutes} />
          <Row label={PROFILE_LABELS.carOneWayMinutes} labelKey="carOneWayMinutes" value={profile.commute.carOneWayMinutes} />
          <Row label={PROFILE_LABELS.motorcycleOneWayMinutes} labelKey="motorcycleOneWayMinutes"
            value={profile.commute.motorcycleOneWayMinutes}
          />
          <Row label={PROFILE_LABELS.transferCount} labelKey="transferCount" value={profile.commute.transferCount} />
          <Row label={PROFILE_LABELS.commuteDaysPerWeek} labelKey="commuteDaysPerWeek"
            value={profile.commute.commuteDaysPerWeek}
          />
          <Row label={PROFILE_LABELS.crowdingLevel} labelKey="crowdingLevel" value={profile.commute.crowdingLevel} />
          <Row label={PROFILE_LABELS.commuteStressSelf} labelKey="commuteStressSelf"
            value={profile.commute.commuteStressSelf}
          />
        </AccordionBlock>

        <AccordionBlock
          title={PROFILE_SECTION_TITLES.lifestyle}
          open={openSections.lifestyle}
          onToggle={() => toggleSection("lifestyle")}
        >
          <Row label={PROFILE_LABELS.drinkingFrequency} labelKey="drinkingFrequency"
            value={profile.lifestyle.drinkingFrequency}
          />
          <Row label={PROFILE_LABELS.drinkingAmountPerOccasion} labelKey="drinkingAmountPerOccasion"
            value={profile.lifestyle.drinkingAmountPerOccasion}
          />
          <Row label={PROFILE_LABELS.smokingType} labelKey="smokingType" value={profile.lifestyle.smokingType} />
          <Row label={PROFILE_LABELS.caffeineType} labelKey="caffeineType"
            value={profile.caffeine.entries?.[0]?.type}
          />
          <Row label={PROFILE_LABELS.caffeineAmount} labelKey="caffeineAmount"
            value={profile.caffeine.entries?.[0]?.amountNote}
          />
          <Row label={PROFILE_LABELS.caffeineLastIntakeTime} labelKey="caffeineLastIntakeTime"
            value={profile.caffeine.entries?.[0]?.lastIntakeTimeTypical}
          />
          <Row label={PROFILE_LABELS.caffeineDecaf} labelKey="caffeineDecaf"
            value={profile.caffeine.entries?.[0]?.isDecaf}
          />
        </AccordionBlock>

        <AccordionBlock
          title={PROFILE_SECTION_TITLES.hydration}
          open={openSections.hydration}
          onToggle={() => toggleSection("hydration")}
        >
          <Row label={PROFILE_LABELS.hydrationWaterMl} labelKey="hydrationWaterMl" value={profile.hydration.waterMl} />
          <Row label={PROFILE_LABELS.hydrationTeaMl} labelKey="hydrationTeaMl" value={profile.hydration.teaMl} />
          <Row label={PROFILE_LABELS.hydrationCoffeeTeaMl} labelKey="hydrationCoffeeTeaMl" value={profile.hydration.coffeeTeaMl} />
          <Row label={PROFILE_LABELS.hydrationSportsDrinkMl} labelKey="hydrationSportsDrinkMl"
            value={profile.hydration.sportsDrinkMl}
          />
          <Row label={PROFILE_LABELS.hydrationAlcoholMl} labelKey="hydrationAlcoholMl" value={profile.hydration.alcoholMl} />
          <Row label={PROFILE_LABELS.hydrationOtherMl} labelKey="hydrationOtherMl" value={profile.hydration.otherBeverageMl} />
          <Row label={PROFILE_LABELS.hydrationTotalMl} labelKey="hydrationTotalMl" value={profile.hydration.totalFluidMl} />
          <Row label={PROFILE_LABELS.preSleep2hFluidMl} labelKey="preSleep2hFluidMl"
            value={profile.hydration.preSleep2hFluidMl}
          />
          <Row label={PROFILE_LABELS.nocturia} labelKey="nocturia" value={profile.hydration.nocturia} />
          <Row label={PROFILE_LABELS.nighttimeUrinationCount} labelKey="nighttimeUrinationCount"
            value={profile.hydration.nighttimeUrinationCount}
          />
        </AccordionBlock>

        <AccordionBlock
          title={PROFILE_SECTION_TITLES.exercise}
          open={openSections.exercise}
          onToggle={() => toggleSection("exercise")}
        >
          <Row label={PROFILE_LABELS.exerciseFrequency} labelKey="exerciseFrequency" value={profile.exercise.frequency} />
          <Row label={PROFILE_LABELS.exerciseTypes} labelKey="exerciseTypes" value={profile.exercise.types} />
          <Row label={PROFILE_LABELS.exerciseTypeOther} labelKey="exerciseTypeOther" value={profile.exercise.typeOther} />
          <Row label={PROFILE_LABELS.exerciseDurationMinutes} labelKey="exerciseDurationMinutes"
            value={profile.exercise.durationMinutes}
          />
          <Row label={PROFILE_LABELS.exerciseIntensity} labelKey="exerciseIntensity" value={profile.exercise.intensity} />
          <Row label={PROFILE_LABELS.exerciseEndTime} labelKey="exerciseEndTime" value={profile.exercise.endTimeTypical} />
          <Row label={PROFILE_LABELS.exerciseInHeat} labelKey="exerciseInHeat" value={profile.exercise.inHeatEnvironment} />
          <Row label={PROFILE_LABELS.exerciseSweatAmount} labelKey="exerciseSweatAmount" value={profile.exercise.sweatAmount} />
          <Row label={PROFILE_LABELS.fluidAfterExercise} labelKey="fluidAfterExercise"
            value={profile.exercise.fluidAfterExercise}
          />
          <Row label={PROFILE_LABELS.changesClothesAfterExercise} labelKey="changesClothesAfterExercise"
            value={profile.exercise.changesClothesAfter}
          />
          <Row label={PROFILE_LABELS.showerAfterExercise} labelKey="showerAfterExercise"
            value={profile.exercise.showerAfter}
          />
          <Row label={PROFILE_LABELS.exerciseCooldownMinutes} labelKey="exerciseCooldownMinutes"
            value={profile.exercise.cooldownDurationMinutes}
          />
          <Row label={PROFILE_LABELS.movesImmediatelyAfterExercise} labelKey="movesImmediatelyAfterExercise"
            value={profile.exercise.movesImmediatelyAfter}
          />
        </AccordionBlock>

        <AccordionBlock
          title={PROFILE_SECTION_TITLES.health}
          open={openSections.health}
          onToggle={() => toggleSection("health")}
        >
          <Row label={PROFILE_LABELS.menopause} labelKey="menopause" value={profile.health.menopause} />
          <Row label={PROFILE_LABELS.medicationsNote} labelKey="medicationsNote" value={profile.health.medicationsNote} />
          <Row label={PROFILE_LABELS.sleepMedicationUse} labelKey="sleepMedicationUse"
            value={profile.health.sleepMedicationUse}
          />
          <Row label={PROFILE_LABELS.nasalCongestionHabitual} labelKey="nasalCongestionHabitual"
            value={profile.health.nasalCongestionHabitual}
          />
          <Row label={PROFILE_LABELS.pollenAllergy} labelKey="pollenAllergy" value={profile.health.pollenAllergy} />
          <Row label={PROFILE_LABELS.allergies} labelKey="allergies" value={profile.health.allergies} />
          <Row label={PROFILE_LABELS.snoring} labelKey="snoring" value={profile.health.snoring} />
          <Row label={PROFILE_LABELS.sleepApneaDiagnosed} labelKey="sleepApneaDiagnosed"
            value={profile.health.sleepApneaDiagnosed}
          />
          <Row label={PROFILE_LABELS.hypertension} labelKey="hypertension" value={profile.health.hypertension} />
          <Row label={PROFILE_LABELS.diabetes} labelKey="diabetes" value={profile.health.diabetes} />
          <Row label={PROFILE_LABELS.dyslipidemia} labelKey="dyslipidemia" value={profile.health.dyslipidemia} />
          <Row label={PROFILE_LABELS.heartDisease} labelKey="heartDisease" value={profile.health.heartDisease} />
          <Row label={PROFILE_LABELS.respiratoryDisease} labelKey="respiratoryDisease"
            value={profile.health.respiratoryDisease}
          />
          <Row label={PROFILE_LABELS.chronicPain} labelKey="chronicPain" value={profile.health.chronicPain} />
          <Row label={PROFILE_LABELS.otherConditions} labelKey="otherConditions" value={profile.health.otherConditions} />
        </AccordionBlock>

        <AccordionBlock
          title={PROFILE_SECTION_TITLES.sleep}
          open={openSections.sleep}
          onToggle={() => toggleSection("sleep")}
        >
          <Row label={PROFILE_LABELS.typicalBedtime} labelKey="typicalBedtime"
            value={profile.sleepEnvironment.typicalBedtime}
          />
          <Row label={PROFILE_LABELS.typicalWakeTime} labelKey="typicalWakeTime"
            value={profile.sleepEnvironment.typicalWakeTime}
          />
          <Row label={PROFILE_LABELS.napHabit} labelKey="napHabit" value={profile.sleepEnvironment.napHabit} />
          <Row label={PROFILE_LABELS.daytimeSleepiness} labelKey="daytimeSleepiness"
            value={profile.sleepEnvironment.daytimeSleepiness}
          />
          <Row label={PROFILE_LABELS.sleepSatisfaction} labelKey="sleepSatisfaction"
            value={profile.sleepEnvironment.sleepSatisfaction}
          />
          <Row label={PROFILE_LABELS.cohabitants} labelKey="cohabitants" value={profile.sleepEnvironment.cohabitants} />
          <Row label={PROFILE_LABELS.youngChildren} labelKey="youngChildren"
            value={profile.sleepEnvironment.youngChildren}
          />
          <Row label={PROFILE_LABELS.caregiving} labelKey="caregiving" value={profile.sleepEnvironment.caregiving} />
          <Row label={PROFILE_LABELS.pets} labelKey="pets" value={profile.sleepEnvironment.pets} />
          <Row label={PROFILE_LABELS.homeTemperatureC} labelKey="homeTemperatureC"
            value={profile.sleepEnvironment.homeTemperatureC}
            numberRule={temp}
          />
          <Row label={PROFILE_LABELS.homeHumidityPercent} labelKey="homeHumidityPercent"
            value={profile.sleepEnvironment.homeHumidityPercent}
            numberRule={humidity}
          />
          <Row label={PROFILE_LABELS.bedroomBedtimeTemperatureC} labelKey="bedroomBedtimeTemperatureC"
            value={profile.sleepEnvironment.bedroomBedtimeTemperatureC}
            numberRule={temp}
          />
          <Row label={PROFILE_LABELS.bedroomBedtimeHumidityPercent} labelKey="bedroomBedtimeHumidityPercent"
            value={profile.sleepEnvironment.bedroomBedtimeHumidityPercent}
            numberRule={humidity}
          />
          <Row label={PROFILE_LABELS.workplaceTemperatureC} labelKey="workplaceTemperatureC"
            value={profile.sleepEnvironment.workplaceTemperatureC}
            numberRule={temp}
          />
          <Row label={PROFILE_LABELS.workplaceHumidityPercent} labelKey="workplaceHumidityPercent"
            value={profile.sleepEnvironment.workplaceHumidityPercent}
            numberRule={humidity}
          />
          <Row label={PROFILE_LABELS.airConditioning} labelKey="airConditioning"
            value={profile.sleepEnvironment.bedroomControls?.airConditioning}
          />
          <Row label={PROFILE_LABELS.heating} labelKey="heating"
            value={profile.sleepEnvironment.bedroomControls?.heating}
          />
          <Row label={PROFILE_LABELS.dehumidifier} labelKey="dehumidifier"
            value={profile.sleepEnvironment.bedroomControls?.dehumidifier}
          />
          <Row label={PROFILE_LABELS.humidifier} labelKey="humidifier"
            value={profile.sleepEnvironment.bedroomControls?.humidifier}
          />
          <Row label={PROFILE_LABELS.fan} labelKey="fan"
            value={profile.sleepEnvironment.bedroomControls?.fan}
          />
          <Row label={PROFILE_LABELS.windowOpen} labelKey="windowOpen"
            value={profile.sleepEnvironment.bedroomControls?.windowOpen}
          />
          <Row label={PROFILE_LABELS.blackoutCurtain} labelKey="blackoutCurtain"
            value={profile.sleepEnvironment.bedroomControls?.blackoutCurtain}
          />
        </AccordionBlock>

        <div className="lg:hidden">
          <ProfileAiSummaryCard sections={profile} />
        </div>

        <div className="flex flex-col gap-3 pb-8 sm:flex-row sm:justify-center">
          <Link
            href={`/clients/${clientId}/profile`}
            className="inline-flex min-h-12 items-center justify-center rounded-full px-8 py-3.5 text-base font-semibold text-white"
            style={{ backgroundColor: NAVY }}
          >
            プロフィールを編集
          </Link>
          <Link
            href={`/clients/${clientId}`}
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-8 py-3.5 text-base font-semibold"
            style={{ color: NAVY }}
          >
            クライアント詳細へ
          </Link>
        </div>
      </div>
    </main>
  );
}
