"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import InstructorNav from "@/components/InstructorNav";
import { GOLD, NAVY } from "@/components/client-profile/form-ui";
import { formatGenderLabel } from "@/lib/client-profile";
import {
  NUMBER_RULES,
  PROFILE_LABELS,
  PROFILE_SECTION_TITLES,
  attributeLabel,
  displayProfileValue,
  type ClientProfileRecord,
} from "@/lib/client-profiles";
import { getClientProfile } from "@/lib/repositories/client-profile-repository";
import { getClientById } from "@/lib/repositories/client-repository";

function Row({
  label,
  value,
  numberRule,
}: {
  label: string;
  value: unknown;
  numberRule?: (typeof NUMBER_RULES)[keyof typeof NUMBER_RULES];
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 last:border-b-0">
      <dt className="shrink-0 text-[13px] text-slate-400">{label}</dt>
      <dd
        className="text-right text-[14px] font-medium tracking-[-0.02em]"
        style={{ color: NAVY }}
      >
        {displayProfileValue(value, { numberRule })}
      </dd>
    </div>
  );
}

function Block({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-slate-200/90 bg-white px-5 py-5 sm:px-6">
      <h2
        className="mb-3 text-base font-semibold tracking-[-0.02em]"
        style={{ color: NAVY }}
      >
        {title}
      </h2>
      <dl>{children}</dl>
    </section>
  );
}

export default function ClientProfileConfirmView({
  clientId,
}: {
  clientId: string;
}) {
  const [profile, setProfile] = useState<ClientProfileRecord | null>(null);
  const [name, setName] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      <div className="mx-auto max-w-3xl space-y-5 px-5 py-8 sm:px-8 sm:py-12">
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
        </header>

        <Block title={PROFILE_SECTION_TITLES.basic}>
          <Row label={PROFILE_LABELS.fullName} value={profile.basic.fullName || name} />
          <Row label={PROFILE_LABELS.birthDate} value={profile.basic.birthDate} />
          <Row
            label={PROFILE_LABELS.ageYears}
            value={profile.basic.ageYears}
            numberRule={NUMBER_RULES.age}
          />
          <Row
            label={PROFILE_LABELS.gender}
            value={formatGenderLabel(profile.basic.gender) || profile.basic.gender}
          />
          <Row
            label={PROFILE_LABELS.heightCm}
            value={profile.basic.heightCm}
            numberRule={NUMBER_RULES.positive}
          />
          <Row
            label={PROFILE_LABELS.weightKg}
            value={profile.basic.weightKg}
            numberRule={NUMBER_RULES.positive}
          />
          <Row
            label={PROFILE_LABELS.bmi}
            value={profile.basic.bmi}
            numberRule={NUMBER_RULES.positive}
          />
          <Row label={PROFILE_LABELS.residenceRegion} value={profile.basic.residenceRegion} />
          <Row label={PROFILE_LABELS.workplaceRegion} value={profile.basic.workplaceRegion} />
        </Block>

        <Block title={PROFILE_SECTION_TITLES.work}>
          <Row
            label={PROFILE_LABELS.occupation}
            value={
              profile.work.occupationCustom || profile.work.occupationPreset
            }
          />
          <Row label={PROFILE_LABELS.workStyle} value={profile.work.workStyle} />
          <Row label={PROFILE_LABELS.workStartTime} value={profile.work.workStartTime} />
          <Row label={PROFILE_LABELS.workEndTime} value={profile.work.workEndTime} />
          <Row label={PROFILE_LABELS.workDaysPerWeek} value={profile.work.workDaysPerWeek} />
          <Row
            label={PROFILE_LABELS.nightShiftsPerMonth}
            value={profile.work.nightShiftsPerMonth}
          />
          <Row label={PROFILE_LABELS.workStressSelf} value={profile.work.workStressSelf} />
        </Block>

        <Block title={PROFILE_SECTION_TITLES.environment}>
          <Row label={PROFILE_LABELS.environmentAttributes} value={attrLabels} />
          <Row label={PROFILE_LABELS.environmentTraitsOther} value={profile.work.traitsOther} />
        </Block>

        <Block title={PROFILE_SECTION_TITLES.heat}>
          <Row label={PROFILE_LABELS.worksInHeat} value={profile.heatExposure.worksInHeat} />
          <Row
            label={PROFILE_LABELS.heatEnvironmentTypes}
            value={profile.heatExposure.heatEnvironmentTypes}
          />
          <Row
            label={PROFILE_LABELS.heatEnvironmentOther}
            value={profile.heatExposure.heatEnvironmentOther}
          />
          <Row
            label={PROFILE_LABELS.heatRoomTemperatureC}
            value={profile.heatExposure.roomTemperatureC}
            numberRule={temp}
          />
          <Row
            label={PROFILE_LABELS.heatHumidityPercent}
            value={profile.heatExposure.humidityPercent}
            numberRule={humidity}
          />
          <Row
            label={PROFILE_LABELS.exposureDurationMinutes}
            value={profile.heatExposure.exposureDurationMinutes}
          />
          <Row label={PROFILE_LABELS.sweatAmount} value={profile.heatExposure.sweatAmount} />
          <Row
            label={PROFILE_LABELS.waterIntakeDuringWorkMl}
            value={profile.heatExposure.waterIntakeDuringWorkMl}
          />
          <Row label={PROFILE_LABELS.breakCount} value={profile.heatExposure.breakCount} />
          <Row
            label={PROFILE_LABELS.changesClothesAfterWork}
            value={profile.heatExposure.changesClothesAfterWork}
          />
          <Row
            label={PROFILE_LABELS.showerAfterWork}
            value={profile.heatExposure.showerAfterWork}
          />
          <Row
            label={PROFILE_LABELS.cooldownDurationMinutes}
            value={profile.heatExposure.cooldownDurationMinutes}
          />
          <Row
            label={PROFILE_LABELS.movesImmediatelyAfterWork}
            value={profile.heatExposure.movesImmediatelyAfterWork}
          />
        </Block>

        <Block title={PROFILE_SECTION_TITLES.commute}>
          <Row label={PROFILE_LABELS.walkOneWayMinutes} value={profile.commute.walkOneWayMinutes} />
          <Row
            label={PROFILE_LABELS.bicycleOneWayMinutes}
            value={profile.commute.bicycleOneWayMinutes}
          />
          <Row label={PROFILE_LABELS.trainOneWayMinutes} value={profile.commute.trainOneWayMinutes} />
          <Row label={PROFILE_LABELS.busOneWayMinutes} value={profile.commute.busOneWayMinutes} />
          <Row label={PROFILE_LABELS.carOneWayMinutes} value={profile.commute.carOneWayMinutes} />
          <Row
            label={PROFILE_LABELS.motorcycleOneWayMinutes}
            value={profile.commute.motorcycleOneWayMinutes}
          />
          <Row label={PROFILE_LABELS.transferCount} value={profile.commute.transferCount} />
          <Row
            label={PROFILE_LABELS.commuteDaysPerWeek}
            value={profile.commute.commuteDaysPerWeek}
          />
          <Row label={PROFILE_LABELS.crowdingLevel} value={profile.commute.crowdingLevel} />
          <Row
            label={PROFILE_LABELS.commuteStressSelf}
            value={profile.commute.commuteStressSelf}
          />
        </Block>

        <Block title={PROFILE_SECTION_TITLES.lifestyle}>
          <Row
            label={PROFILE_LABELS.drinkingFrequency}
            value={profile.lifestyle.drinkingFrequency}
          />
          <Row
            label={PROFILE_LABELS.drinkingAmountPerOccasion}
            value={profile.lifestyle.drinkingAmountPerOccasion}
          />
          <Row label={PROFILE_LABELS.smokingType} value={profile.lifestyle.smokingType} />
          <Row
            label={PROFILE_LABELS.caffeineType}
            value={profile.caffeine.entries?.[0]?.type}
          />
          <Row
            label={PROFILE_LABELS.caffeineAmount}
            value={profile.caffeine.entries?.[0]?.amountNote}
          />
          <Row
            label={PROFILE_LABELS.caffeineLastIntakeTime}
            value={profile.caffeine.entries?.[0]?.lastIntakeTimeTypical}
          />
          <Row
            label={PROFILE_LABELS.caffeineDecaf}
            value={profile.caffeine.entries?.[0]?.isDecaf}
          />
        </Block>

        <Block title={PROFILE_SECTION_TITLES.hydration}>
          <Row label={PROFILE_LABELS.hydrationWaterMl} value={profile.hydration.waterMl} />
          <Row label={PROFILE_LABELS.hydrationTeaMl} value={profile.hydration.teaMl} />
          <Row label={PROFILE_LABELS.hydrationCoffeeTeaMl} value={profile.hydration.coffeeTeaMl} />
          <Row
            label={PROFILE_LABELS.hydrationSportsDrinkMl}
            value={profile.hydration.sportsDrinkMl}
          />
          <Row label={PROFILE_LABELS.hydrationAlcoholMl} value={profile.hydration.alcoholMl} />
          <Row label={PROFILE_LABELS.hydrationOtherMl} value={profile.hydration.otherBeverageMl} />
          <Row label={PROFILE_LABELS.hydrationTotalMl} value={profile.hydration.totalFluidMl} />
          <Row
            label={PROFILE_LABELS.preSleep2hFluidMl}
            value={profile.hydration.preSleep2hFluidMl}
          />
          <Row label={PROFILE_LABELS.nocturia} value={profile.hydration.nocturia} />
          <Row
            label={PROFILE_LABELS.nighttimeUrinationCount}
            value={profile.hydration.nighttimeUrinationCount}
          />
        </Block>

        <Block title={PROFILE_SECTION_TITLES.exercise}>
          <Row label={PROFILE_LABELS.exerciseFrequency} value={profile.exercise.frequency} />
          <Row label={PROFILE_LABELS.exerciseTypes} value={profile.exercise.types} />
          <Row label={PROFILE_LABELS.exerciseTypeOther} value={profile.exercise.typeOther} />
          <Row
            label={PROFILE_LABELS.exerciseDurationMinutes}
            value={profile.exercise.durationMinutes}
          />
          <Row label={PROFILE_LABELS.exerciseIntensity} value={profile.exercise.intensity} />
          <Row label={PROFILE_LABELS.exerciseEndTime} value={profile.exercise.endTimeTypical} />
          <Row label={PROFILE_LABELS.exerciseInHeat} value={profile.exercise.inHeatEnvironment} />
          <Row label={PROFILE_LABELS.exerciseSweatAmount} value={profile.exercise.sweatAmount} />
          <Row
            label={PROFILE_LABELS.fluidAfterExercise}
            value={profile.exercise.fluidAfterExercise}
          />
          <Row
            label={PROFILE_LABELS.changesClothesAfterExercise}
            value={profile.exercise.changesClothesAfter}
          />
          <Row
            label={PROFILE_LABELS.showerAfterExercise}
            value={profile.exercise.showerAfter}
          />
          <Row
            label={PROFILE_LABELS.exerciseCooldownMinutes}
            value={profile.exercise.cooldownDurationMinutes}
          />
          <Row
            label={PROFILE_LABELS.movesImmediatelyAfterExercise}
            value={profile.exercise.movesImmediatelyAfter}
          />
        </Block>

        <Block title={PROFILE_SECTION_TITLES.health}>
          <Row label={PROFILE_LABELS.menopause} value={profile.health.menopause} />
          <Row label={PROFILE_LABELS.medicationsNote} value={profile.health.medicationsNote} />
          <Row
            label={PROFILE_LABELS.sleepMedicationUse}
            value={profile.health.sleepMedicationUse}
          />
          <Row
            label={PROFILE_LABELS.nasalCongestionHabitual}
            value={profile.health.nasalCongestionHabitual}
          />
          <Row label={PROFILE_LABELS.pollenAllergy} value={profile.health.pollenAllergy} />
          <Row label={PROFILE_LABELS.allergies} value={profile.health.allergies} />
          <Row label={PROFILE_LABELS.snoring} value={profile.health.snoring} />
          <Row
            label={PROFILE_LABELS.sleepApneaDiagnosed}
            value={profile.health.sleepApneaDiagnosed}
          />
          <Row label={PROFILE_LABELS.hypertension} value={profile.health.hypertension} />
          <Row label={PROFILE_LABELS.diabetes} value={profile.health.diabetes} />
          <Row label={PROFILE_LABELS.dyslipidemia} value={profile.health.dyslipidemia} />
          <Row label={PROFILE_LABELS.heartDisease} value={profile.health.heartDisease} />
          <Row
            label={PROFILE_LABELS.respiratoryDisease}
            value={profile.health.respiratoryDisease}
          />
          <Row label={PROFILE_LABELS.chronicPain} value={profile.health.chronicPain} />
          <Row label={PROFILE_LABELS.otherConditions} value={profile.health.otherConditions} />
        </Block>

        <Block title={PROFILE_SECTION_TITLES.sleep}>
          <Row
            label={PROFILE_LABELS.typicalBedtime}
            value={profile.sleepEnvironment.typicalBedtime}
          />
          <Row
            label={PROFILE_LABELS.typicalWakeTime}
            value={profile.sleepEnvironment.typicalWakeTime}
          />
          <Row label={PROFILE_LABELS.napHabit} value={profile.sleepEnvironment.napHabit} />
          <Row
            label={PROFILE_LABELS.daytimeSleepiness}
            value={profile.sleepEnvironment.daytimeSleepiness}
          />
          <Row
            label={PROFILE_LABELS.sleepSatisfaction}
            value={profile.sleepEnvironment.sleepSatisfaction}
          />
          <Row label={PROFILE_LABELS.cohabitants} value={profile.sleepEnvironment.cohabitants} />
          <Row
            label={PROFILE_LABELS.youngChildren}
            value={profile.sleepEnvironment.youngChildren}
          />
          <Row label={PROFILE_LABELS.caregiving} value={profile.sleepEnvironment.caregiving} />
          <Row label={PROFILE_LABELS.pets} value={profile.sleepEnvironment.pets} />
          <Row
            label={PROFILE_LABELS.homeTemperatureC}
            value={profile.sleepEnvironment.homeTemperatureC}
            numberRule={temp}
          />
          <Row
            label={PROFILE_LABELS.homeHumidityPercent}
            value={profile.sleepEnvironment.homeHumidityPercent}
            numberRule={humidity}
          />
          <Row
            label={PROFILE_LABELS.bedroomBedtimeTemperatureC}
            value={profile.sleepEnvironment.bedroomBedtimeTemperatureC}
            numberRule={temp}
          />
          <Row
            label={PROFILE_LABELS.bedroomBedtimeHumidityPercent}
            value={profile.sleepEnvironment.bedroomBedtimeHumidityPercent}
            numberRule={humidity}
          />
          <Row
            label={PROFILE_LABELS.workplaceTemperatureC}
            value={profile.sleepEnvironment.workplaceTemperatureC}
            numberRule={temp}
          />
          <Row
            label={PROFILE_LABELS.workplaceHumidityPercent}
            value={profile.sleepEnvironment.workplaceHumidityPercent}
            numberRule={humidity}
          />
          <Row
            label={PROFILE_LABELS.airConditioning}
            value={profile.sleepEnvironment.bedroomControls?.airConditioning}
          />
          <Row
            label={PROFILE_LABELS.heating}
            value={profile.sleepEnvironment.bedroomControls?.heating}
          />
          <Row
            label={PROFILE_LABELS.dehumidifier}
            value={profile.sleepEnvironment.bedroomControls?.dehumidifier}
          />
          <Row
            label={PROFILE_LABELS.humidifier}
            value={profile.sleepEnvironment.bedroomControls?.humidifier}
          />
          <Row
            label={PROFILE_LABELS.fan}
            value={profile.sleepEnvironment.bedroomControls?.fan}
          />
          <Row
            label={PROFILE_LABELS.windowOpen}
            value={profile.sleepEnvironment.bedroomControls?.windowOpen}
          />
          <Row
            label={PROFILE_LABELS.blackoutCurtain}
            value={profile.sleepEnvironment.bedroomControls?.blackoutCurtain}
          />
        </Block>

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
