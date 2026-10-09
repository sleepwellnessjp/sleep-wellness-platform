import type { ReactNode } from "react";
import SoxaiStudyHero from "@/components/yoga-fest-2026/SoxaiStudyHero";
import SoxaiStudyPosterImage from "@/components/yoga-fest-2026/SoxaiStudyPosterImage";
import SoxaiStudyRegistrationForm from "@/components/yoga-fest-2026/SoxaiStudyRegistrationForm";

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="border-l-2 border-[#8a6a2d] pl-3 text-lg font-semibold tracking-[-0.02em] text-[#071426] sm:text-xl">
        {title}
      </h2>
      <div className="space-y-3 text-sm leading-7 text-slate-700 sm:text-[15px] sm:leading-8">
        {children}
      </div>
    </section>
  );
}

export default function SoxaiStudyPageContent() {
  return (
    <div className="space-y-10 sm:space-y-12">
      <SoxaiStudyHero />

      <SoxaiStudyPosterImage />

      <Section title="この検証の目的">
        <p>
          ヨガのクラス中に、心と体がどのように変化しているのかを記録し、ヨガの体験を「見える化」することが目的です。数値に良い・悪いはありません。その日の体調や取り組み方によって、人それぞれさまざまな変化が表れます。その一人ひとりの違いも含めた、ありのままのデータが大切な研究材料になります。
        </p>
        <p>
          分析はSOXAI社の専門スタッフが行い、将来的には大学の研究者と協力して、学術発表（論文など）につなげることを目指しています。協力してくださる先生と生徒さんお一人おひとりの参加が、ヨガの価値を社会に伝える一歩になります。
        </p>
      </Section>

      <Section title="データの取り扱い">
        <ul className="list-disc space-y-2 pl-5">
          <li>分析や発表は、個人が特定できない形で行います</li>
          <li>
            データ抽出のため、メールアドレス・年代・クラスをSOXAI株式会社へ提供します。お名前や正確な年齢は提供しません
          </li>
          <li>
            先生には後日、個人が特定できない形でクラス全体の結果をお伝えします。全体の結果を知りたい方は先生にお尋ねください（お伝えするかどうかは先生のご判断です）
          </li>
          <li>
            運営から個人の結果をお送りすることはありません。ご自身のデータはSOXAIアプリでご覧いただけます
          </li>
          <li>
            個人が特定できない形に加工したデータを、大学などの研究機関と共有することがあります
          </li>
          <li>
            参加は自由です。途中でやめることも、後からデータの削除を申し出ることもできます（登録確認メールへの返信でご連絡ください）
          </li>
          <li>SOXAIアプリの利用には、SOXAI社の利用規約が適用されます</li>
        </ul>
      </Section>

      <Section title="クラスのあとに">
        <p>
          クラス終了後、検証実験にご協力いただいた皆さんと講師で記念撮影を行います。撮影のあと、リングをご返却ください。
        </p>
        <p className="text-xs leading-6 text-slate-600 sm:text-sm">
          ※写真に写りたくない方は、スタッフにお声がけください。
        </p>
      </Section>

      <Section title="18歳未満の方へ">
        <p>
          18歳未満の方は、保護者の方の同意を得たうえでご登録ください。
        </p>
      </Section>

      <SoxaiStudyRegistrationForm />
    </div>
  );
}
