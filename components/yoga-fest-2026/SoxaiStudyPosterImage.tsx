import Image from "next/image";

const POSTER_ALT =
  "ヨガフェスタ横浜2026 ヨガの見える化 スマートリング検証実験。クラスの間、指にリングをつけるだけ。心と体の変化をデータで記録します。";

export default function SoxaiStudyPosterImage() {
  return (
    <figure className="w-full">
      <Image
        src="/images/yoga-fest-2026/soxai-poster.jpg"
        alt={POSTER_ALT}
        width={960}
        height={1200}
        sizes="(max-width: 768px) 100vw, 768px"
        className="h-auto w-full rounded-2xl border border-[#071426]/10 shadow-sm"
        priority={false}
      />
    </figure>
  );
}
