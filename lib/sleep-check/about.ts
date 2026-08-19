export const SLEEP_CHECK_ABOUT_SECTIONS = [
  {
    heading: "なぜこの8つの質問なのか",
    paragraphs: [
      "睡眠の状態を測る質問票は、世界にいくつもあります。代表的なものを挙げます。",
    ],
    scales: [
      {
        name: "ピッツバーグ睡眠質問票（PSQI）",
        body: "18項目。睡眠の質を7つの側面から総合的に評価します。1989年にBuysseらが開発し、睡眠研究の国際標準として最も広く使われています。詳細に測れる反面、記入に時間がかかります。",
      },
      {
        name: "エプワース眠気尺度（ESS）",
        body: "8項目。日中の眠気だけに焦点を当てた尺度です。睡眠時無呼吸症候群のスクリーニングに用いられます。",
      },
      {
        name: "アテネ不眠尺度（AIS）",
        body: "8項目。ここで使っているものです。",
      },
    ],
  },
  {
    heading: "AISを選んだ理由",
    paragraphs: [
      "AISは、世界保健機関（WHO）が主導した「睡眠と健康に関する世界プロジェクト」のなかで開発されました。国際疾病分類（ICD-10）の不眠症の診断基準にもとづいて設計されています。",
      "不眠の3つの主要な症状を、すべて含んでいることが特徴です。",
    ],
    bullets: [
      "寝つきにくさ",
      "夜中に目が覚めること",
      "希望より早く目が覚めること",
    ],
    paragraphsAfterBullets: [
      "さらに、睡眠そのものだけでなく、日中の状態も測ります。眠りの問題は、翌日の気分や集中力に表れるからです。",
      "8項目という短さでありながら、信頼性と妥当性が繰り返し検証されています。日本語版についても、複数の研究で検証が行われています。",
      "短時間で答えられて、しかも測るべきものを漏らさない。この両立が、AISを選んだ理由です。",
    ],
  },
  {
    heading: "判定について",
    paragraphs: [
      "このセルフチェックでは、点数から不眠症を診断することはしていません。",
      "参考までに、研究では次のような区分が報告されています（岡島ら, 2020）。",
    ],
    bullets: [
      "0〜5点：不眠の症状は見られない",
      "6〜9点：軽度",
      "10〜15点：中等度",
      "16〜24点：重度",
    ],
    paragraphsAfterBullets: [
      "ただし、この区分は研究上のものであり、診断ではありません。眠りの状態は日によって変わりますし、点数だけで決まるものでもありません。",
      "このページでお伝えしているのは、あくまで「いまの眠りがどんな感じか」という手がかりです。",
    ],
  },
] as const;

export const SLEEP_CHECK_ABOUT_REFERENCES = [
  'Soldatos CR, Dikeos DG, Paparrigopoulos TJ. "Athens Insomnia Scale: validation of an instrument based on ICD-10 criteria." Journal of Psychosomatic Research. 2000;48(6):555-560.',
  'Okajima I, et al. "Evaluation of Severity Levels of the Athens Insomnia Scale Based on the Criterion of Insomnia Severity Index." International Journal of Environmental Research and Public Health. 2020;17(23):8789.',
  'Buysse DJ, et al. "The Pittsburgh Sleep Quality Index: a new instrument for psychiatric practice and research." Psychiatry Research. 1989;28(2):193-213.',
  'Johns MW. "A new method for measuring daytime sleepiness: the Epworth sleepiness scale." Sleep. 1991;14(6):540-545.',
] as const;
