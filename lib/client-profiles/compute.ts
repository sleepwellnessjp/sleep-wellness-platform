/**
 * Age / BMI / hydration helpers for Client Profile V2
 */

/** 生年月日から年齢（満年齢）を計算。不正なら null */
export function calculateAgeYearsFromBirthDate(
  birthDate: string | null | undefined,
  asOf: Date = new Date(),
): number | null {
  if (!birthDate?.trim()) return null;
  const match = birthDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  const birth = new Date(year, month - 1, day);
  if (
    birth.getFullYear() !== year ||
    birth.getMonth() !== month - 1 ||
    birth.getDate() !== day
  ) {
    return null;
  }

  let age = asOf.getFullYear() - year;
  const beforeBirthday =
    asOf.getMonth() < month - 1 ||
    (asOf.getMonth() === month - 1 && asOf.getDate() < day);
  if (beforeBirthday) age -= 1;

  if (age < 0 || age > 130) return null;
  return age;
}

/**
 * 生年月日があれば自動計算、なければ手動年齢を採用。
 * 両方ある場合は生年月日を優先。
 */
export function resolveAgeYears(input: {
  birthDate?: string | null;
  ageYears?: number | string | null;
  asOf?: Date;
}): number | null {
  const fromBirth = calculateAgeYearsFromBirthDate(
    input.birthDate,
    input.asOf ?? new Date(),
  );
  if (fromBirth != null) return fromBirth;

  if (input.ageYears == null || input.ageYears === "") return null;
  const n =
    typeof input.ageYears === "number"
      ? input.ageYears
      : Number(String(input.ageYears).trim());
  if (!Number.isFinite(n)) return null;
  const age = Math.round(n);
  if (age < 0 || age > 130) return null;
  return age;
}

/** BMI = weightKg / (heightM ^ 2)。小数1桁 */
export function calculateBmi(
  heightCm: number | null | undefined,
  weightKg: number | null | undefined,
): number | null {
  if (
    heightCm == null ||
    weightKg == null ||
    !Number.isFinite(heightCm) ||
    !Number.isFinite(weightKg) ||
    heightCm <= 0 ||
    weightKg <= 0
  ) {
    return null;
  }
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  if (!Number.isFinite(bmi) || bmi <= 0 || bmi > 200) return null;
  return Math.round(bmi * 10) / 10;
}

/** 水分各項目の合計（mL）。未入力は0扱い、すべて未入力なら null */
export function sumHydrationMl(parts: {
  waterMl?: number | null;
  teaMl?: number | null;
  coffeeTeaMl?: number | null;
  sportsDrinkMl?: number | null;
  alcoholMl?: number | null;
  otherBeverageMl?: number | null;
}): number | null {
  const values = [
    parts.waterMl,
    parts.teaMl,
    parts.coffeeTeaMl,
    parts.sportsDrinkMl,
    parts.alcoholMl,
    parts.otherBeverageMl,
  ];
  const present = values.filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0,
  );
  if (present.length === 0) return null;
  return present.reduce((sum, v) => sum + v, 0);
}
