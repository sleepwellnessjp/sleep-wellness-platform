/**
 * 第3の昼実践（10/12 発表）の公開切替。
 *
 * フラグ名: THIRD_DAY_PRACTICE_REVEALED
 * 環境変数: NEXT_PUBLIC_THIRD_DAY_PRACTICE_REVEALED=1
 *
 * フェーズ1（現在）: false → ティザーのみ表示。正式名称はソースに含めない。
 * フェーズ2（2026-10-12）:
 *   1. NEXT_PUBLIC_THIRD_DAY_PRACTICE_REVEALED=1 を Vercel に設定
 *   2. components/programs/ThirdDayPracticeRevealedPage.tsx を追加（仕様書フェーズ2）
 *   3. app/practice/1012/page.tsx で Revealed を import して差し替え
 *   4. 必要なら正式ルートへリダイレクトを追加
 */
export const THIRD_DAY_PRACTICE_REVEALED =
  process.env.NEXT_PUBLIC_THIRD_DAY_PRACTICE_REVEALED === "1";

/** ヨガフェスタ横浜2026 クラス詳細URL。 */
export const YOGAFESTA_YOKOHAMA_2026_HREF: string | null =
  "https://yoga-class-manager-ten.vercel.app/yogafesta/class/12D4";

export const PRACTICE_TEASER_PATH = "/practice/1012";
