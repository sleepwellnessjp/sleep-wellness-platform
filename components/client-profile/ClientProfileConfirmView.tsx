"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import InstructorNav from "@/components/InstructorNav";
import { GOLD, NAVY } from "@/components/client-profile/form-ui";
import { formatGenderLabel } from "@/lib/client-profile";
import {
  attributeLabel,
  type ClientProfileRecord,
} from "@/lib/client-profiles";
import { getClientProfile } from "@/lib/repositories/client-profile-repository";
import { getClientById } from "@/lib/repositories/client-repository";

function display(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "はい" : "いいえ";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string") return value.trim() || "—";
  if (Array.isArray(value)) {
    const items = value
      .map((item) => (typeof item === "string" ? item : ""))
      .filter(Boolean);
    return items.length ? items.join("、") : "—";
  }
  return "—";
}

function Row({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 last:border-b-0">
      <dt className="shrink-0 text-[13px] text-slate-400">{label}</dt>
      <dd
        className="text-right text-[14px] font-medium tracking-[-0.02em]"
        style={{ color: NAVY }}
      >
        {display(value)}
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

        <Block title="基本情報">
          <Row label="氏名" value={profile.basic.fullName || name} />
          <Row label="生年月日" value={profile.basic.birthDate} />
          <Row label="年齢" value={profile.basic.ageYears} />
          <Row
            label="性別"
            value={formatGenderLabel(profile.basic.gender) || profile.basic.gender}
          />
          <Row label="身長 (cm)" value={profile.basic.heightCm} />
          <Row label="体重 (kg)" value={profile.basic.weightKg} />
          <Row label="BMI" value={profile.basic.bmi} />
          <Row label="居住地域" value={profile.basic.residenceRegion} />
          <Row label="勤務先地域" value={profile.basic.workplaceRegion} />
        </Block>

        <Block title="職業・勤務形態">
          <Row
            label="職業"
            value={
              profile.work.occupationCustom ||
              profile.work.occupationPreset
            }
          />
          <Row label="勤務形態" value={profile.work.workStyle} />
          <Row label="勤務開始" value={profile.work.workStartTime} />
          <Row label="勤務終了" value={profile.work.workEndTime} />
          <Row label="週の勤務日数" value={profile.work.workDaysPerWeek} />
          <Row label="夜勤回数" value={profile.work.nightShiftsPerMonth} />
          <Row label="自覚ストレス" value={profile.work.workStressSelf} />
        </Block>

        <Block title="勤務環境属性">
          <Row label="属性" value={attrLabels} />
          <Row label="その他" value={profile.work.traitsOther} />
        </Block>

        <Block title="高温環境への曝露">
          <Row label="高温環境" value={profile.heatExposure.worksInHeat} />
          <Row label="種類" value={profile.heatExposure.heatEnvironmentTypes} />
          <Row label="種類（自由）" value={profile.heatExposure.heatEnvironmentOther} />
          <Row label="室温 (℃)" value={profile.heatExposure.roomTemperatureC} />
          <Row label="湿度 (%)" value={profile.heatExposure.humidityPercent} />
          <Row
            label="曝露時間 (分)"
            value={profile.heatExposure.exposureDurationMinutes}
          />
          <Row label="発汗量" value={profile.heatExposure.sweatAmount} />
          <Row
            label="水分摂取 (mL)"
            value={profile.heatExposure.waterIntakeDuringWorkMl}
          />
          <Row label="休憩回数" value={profile.heatExposure.breakCount} />
          <Row
            label="着替え"
            value={profile.heatExposure.changesClothesAfterWork}
          />
          <Row label="シャワー" value={profile.heatExposure.showerAfterWork} />
          <Row
            label="クールダウン (分)"
            value={profile.heatExposure.cooldownDurationMinutes}
          />
          <Row
            label="すぐ移動"
            value={profile.heatExposure.movesImmediatelyAfterWork}
          />
        </Block>

        <Block title="通勤">
          <Row label="徒歩 (分)" value={profile.commute.walkOneWayMinutes} />
          <Row label="自転車 (分)" value={profile.commute.bicycleOneWayMinutes} />
          <Row label="電車 (分)" value={profile.commute.trainOneWayMinutes} />
          <Row label="バス (分)" value={profile.commute.busOneWayMinutes} />
          <Row label="車 (分)" value={profile.commute.carOneWayMinutes} />
          <Row
            label="バイク (分)"
            value={profile.commute.motorcycleOneWayMinutes}
          />
          <Row label="乗り換え" value={profile.commute.transferCount} />
          <Row label="通勤日数" value={profile.commute.commuteDaysPerWeek} />
          <Row label="混雑" value={profile.commute.crowdingLevel} />
          <Row label="通勤ストレス" value={profile.commute.commuteStressSelf} />
        </Block>

        <Block title="生活習慣">
          <Row label="飲酒頻度" value={profile.lifestyle.drinkingFrequency} />
          <Row
            label="飲酒量"
            value={profile.lifestyle.drinkingAmountPerOccasion}
          />
          <Row label="喫煙" value={profile.lifestyle.smokingType} />
          <Row
            label="カフェイン種類"
            value={profile.caffeine.entries?.[0]?.type}
          />
          <Row
            label="カフェイン量"
            value={profile.caffeine.entries?.[0]?.amountNote}
          />
          <Row
            label="最後の摂取時刻"
            value={profile.caffeine.entries?.[0]?.lastIntakeTimeTypical}
          />
          <Row
            label="デカフェ"
            value={profile.caffeine.entries?.[0]?.isDecaf}
          />
        </Block>

        <Block title="水分">
          <Row label="水 (mL)" value={profile.hydration.waterMl} />
          <Row label="お茶 (mL)" value={profile.hydration.teaMl} />
          <Row label="コーヒー・紅茶 (mL)" value={profile.hydration.coffeeTeaMl} />
          <Row label="スポーツドリンク (mL)" value={profile.hydration.sportsDrinkMl} />
          <Row label="アルコール (mL)" value={profile.hydration.alcoholMl} />
          <Row label="その他 (mL)" value={profile.hydration.otherBeverageMl} />
          <Row label="総水分量 (mL)" value={profile.hydration.totalFluidMl} />
          <Row
            label="就寝前2時間 (mL)"
            value={profile.hydration.preSleep2hFluidMl}
          />
          <Row label="夜間頻尿" value={profile.hydration.nocturia} />
          <Row
            label="夜間排尿回数"
            value={profile.hydration.nighttimeUrinationCount}
          />
        </Block>

        <Block title="運動">
          <Row label="頻度" value={profile.exercise.frequency} />
          <Row label="種類" value={profile.exercise.types} />
          <Row label="種類（自由）" value={profile.exercise.typeOther} />
          <Row label="時間 (分)" value={profile.exercise.durationMinutes} />
          <Row label="強度" value={profile.exercise.intensity} />
          <Row label="終了時刻" value={profile.exercise.endTimeTypical} />
          <Row label="高温環境" value={profile.exercise.inHeatEnvironment} />
          <Row label="発汗量" value={profile.exercise.sweatAmount} />
          <Row label="水分補給" value={profile.exercise.fluidAfterExercise} />
          <Row label="着替え" value={profile.exercise.changesClothesAfter} />
          <Row label="シャワー" value={profile.exercise.showerAfter} />
          <Row
            label="クールダウン (分)"
            value={profile.exercise.cooldownDurationMinutes}
          />
          <Row
            label="すぐ移動"
            value={profile.exercise.movesImmediatelyAfter}
          />
        </Block>

        <Block title="健康情報">
          <Row label="更年期" value={profile.health.menopause} />
          <Row label="服薬" value={profile.health.medicationsNote} />
          <Row label="睡眠薬" value={profile.health.sleepMedicationUse} />
          <Row label="鼻づまり" value={profile.health.nasalCongestionHabitual} />
          <Row label="花粉症" value={profile.health.pollenAllergy} />
          <Row label="アレルギー" value={profile.health.allergies} />
          <Row label="いびき" value={profile.health.snoring} />
          <Row
            label="睡眠時無呼吸"
            value={profile.health.sleepApneaDiagnosed}
          />
          <Row label="高血圧" value={profile.health.hypertension} />
          <Row label="糖尿病" value={profile.health.diabetes} />
          <Row label="脂質異常症" value={profile.health.dyslipidemia} />
          <Row label="心疾患" value={profile.health.heartDisease} />
          <Row label="呼吸器疾患" value={profile.health.respiratoryDisease} />
          <Row label="慢性疼痛" value={profile.health.chronicPain} />
          <Row label="その他持病" value={profile.health.otherConditions} />
        </Block>

        <Block title="睡眠・生活環境">
          <Row label="就寝" value={profile.sleepEnvironment.typicalBedtime} />
          <Row label="起床" value={profile.sleepEnvironment.typicalWakeTime} />
          <Row label="昼寝" value={profile.sleepEnvironment.napHabit} />
          <Row
            label="日中の眠気"
            value={profile.sleepEnvironment.daytimeSleepiness}
          />
          <Row
            label="睡眠満足度"
            value={profile.sleepEnvironment.sleepSatisfaction}
          />
          <Row label="同居家族" value={profile.sleepEnvironment.cohabitants} />
          <Row
            label="小さな子ども"
            value={profile.sleepEnvironment.youngChildren}
          />
          <Row label="介護" value={profile.sleepEnvironment.caregiving} />
          <Row label="ペット" value={profile.sleepEnvironment.pets} />
          <Row
            label="自宅室温 (℃)"
            value={profile.sleepEnvironment.homeTemperatureC}
          />
          <Row
            label="自宅湿度 (%)"
            value={profile.sleepEnvironment.homeHumidityPercent}
          />
          <Row
            label="寝室室温 (℃)"
            value={profile.sleepEnvironment.bedroomBedtimeTemperatureC}
          />
          <Row
            label="寝室湿度 (%)"
            value={profile.sleepEnvironment.bedroomBedtimeHumidityPercent}
          />
          <Row
            label="仕事場室温 (℃)"
            value={profile.sleepEnvironment.workplaceTemperatureC}
          />
          <Row
            label="仕事場湿度 (%)"
            value={profile.sleepEnvironment.workplaceHumidityPercent}
          />
          <Row
            label="冷房"
            value={profile.sleepEnvironment.bedroomControls?.airConditioning}
          />
          <Row
            label="暖房"
            value={profile.sleepEnvironment.bedroomControls?.heating}
          />
          <Row
            label="除湿"
            value={profile.sleepEnvironment.bedroomControls?.dehumidifier}
          />
          <Row
            label="加湿器"
            value={profile.sleepEnvironment.bedroomControls?.humidifier}
          />
          <Row
            label="扇風機"
            value={profile.sleepEnvironment.bedroomControls?.fan}
          />
          <Row
            label="窓を開けて寝る"
            value={profile.sleepEnvironment.bedroomControls?.windowOpen}
          />
          <Row
            label="遮光カーテン"
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
