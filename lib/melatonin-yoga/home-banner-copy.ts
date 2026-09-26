import { melatoninYogaApplyHref } from "@/lib/melatonin-yoga/apply-url";

/** トップバナー・申込フォームで共有する養成コースの固定文 */

export const MELATONIN_YOGA_TRAINING_COURSE_COPY = {
  launch: "養成コース 2027年2月開講",
  capacity: "定員12名",
  earlyBird: "早割 120,000円（2026年12月26日のお申し込みまで）",
  tuition: "受講料 130,000円（税込）",
  retake: "再受講 65,000円（税込）",
  formats: "オンライン・対面・アーカイブ動画での受講が可能",
  platformFee:
    "Sleep Wellness Platform の年額利用料 12,000円は受講料に含まれません",
} as const;

export const MELATONIN_YOGA_TRAINING_COURSE_INFO = {
  title: "養成コース概要",
  bullets: [
    MELATONIN_YOGA_TRAINING_COURSE_COPY.tuition,
    MELATONIN_YOGA_TRAINING_COURSE_COPY.earlyBird,
    MELATONIN_YOGA_TRAINING_COURSE_COPY.retake,
    MELATONIN_YOGA_TRAINING_COURSE_COPY.capacity,
    MELATONIN_YOGA_TRAINING_COURSE_COPY.formats,
    MELATONIN_YOGA_TRAINING_COURSE_COPY.platformFee,
  ],
} as const;

export type MelatoninYogaHomeApplyBannerItem = {
  id: string;
  eyebrow: string;
  title: string;
  highlights: readonly string[];
  description?: string;
  ctaLabel: string;
  ctaHref: string;
  highlightsAriaLabel: string;
};

/** トップ PRACTICE セクションの申込案内バナー（順序どおりに表示） */
export const MELATONIN_YOGA_HOME_APPLY_BANNERS: readonly MelatoninYogaHomeApplyBannerItem[] =
  [
    {
      id: "training_course",
      eyebrow: "お申し込み受付中",
      title: "メラトニンヨガ™認定インストラクター養成コース",
      highlights: [
        MELATONIN_YOGA_TRAINING_COURSE_COPY.launch,
        MELATONIN_YOGA_TRAINING_COURSE_COPY.capacity,
        MELATONIN_YOGA_TRAINING_COURSE_COPY.earlyBird,
      ],
      ctaLabel: "日程を見て申し込む",
      ctaHref: melatoninYogaApplyHref("training_course"),
      highlightsAriaLabel: "養成コースの要点",
    },
    {
      id: "consultation",
      eyebrow: "参加無料",
      title: "メラトニンヨガ™ 相談会",
      highlights: [
        "オンライン／対面",
        "約60分",
        "講座の説明・ご質問への回答・メラトニンヨガ体験",
      ],
      description:
        "養成コースを検討中の方も、まずは知りたい方も、お気軽にどうぞ。",
      ctaLabel: "相談会の日程を見る",
      ctaHref: melatoninYogaApplyHref("consultation"),
      highlightsAriaLabel: "相談会の要点",
    },
  ];
