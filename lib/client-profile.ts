/** クライアント基本情報（分析精度向上用） */

export type ClientGender = "female" | "male" | "other" | "unspecified";

export const CLIENT_GENDER_OPTIONS: Array<{
  value: ClientGender;
  label: string;
}> = [
  { value: "female", label: "女性" },
  { value: "male", label: "男性" },
  { value: "other", label: "その他" },
  { value: "unspecified", label: "回答しない" },
];

export type ClientProfileBasics = {
  age: string;
  gender: string;
  heightCm: string;
  weightKg: string;
  medications: string;
  drinkingHabit: string;
  exerciseHabit: string;
  snoringNasal: string;
  medicalHistory: string;
};

export function emptyClientProfileBasics(): ClientProfileBasics {
  return {
    age: "",
    gender: "",
    heightCm: "",
    weightKg: "",
    medications: "",
    drinkingHabit: "",
    exerciseHabit: "",
    snoringNasal: "",
    medicalHistory: "",
  };
}

export function formatGenderLabel(value: string | undefined | null): string {
  if (!value?.trim()) return "";
  const found = CLIENT_GENDER_OPTIONS.find((option) => option.value === value);
  return found?.label ?? value.trim();
}

export function parseOptionalAge(value: string | undefined | null): number | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  const age = Math.round(n);
  if (age < 0 || age > 130) return null;
  return age;
}

export function parseOptionalPositiveNumber(
  value: string | undefined | null,
): number | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function hasAgeAndGender(profile: {
  age?: string | number | null;
  gender?: string | null;
}): boolean {
  const ageOk =
    typeof profile.age === "number"
      ? Number.isFinite(profile.age)
      : Boolean(String(profile.age ?? "").trim());
  const genderOk = Boolean(String(profile.gender ?? "").trim());
  return ageOk && genderOk;
}
