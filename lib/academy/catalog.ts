import type {
  AcademyContentCategory,
  AcademyLesson,
  AcademyQualification,
  AcademyTest,
} from "./types";

export const ACADEMY_QUALIFICATIONS: AcademyQualification[] = [
  {
    id: "navigator",
    name: "Sleep Wellness Navigator",
    shortName: "Navigator",
    description:
      "睡眠ウェルネスの基礎を学び、日常生活やコミュニティで実践できる入門資格。",
    validityMonths: 24,
  },
  {
    id: "melatonin_yoga_instructor",
    name: "Melatonin Yoga™ Instructor",
    shortName: "MY Instructor",
    description:
      "メラトニンヨガ™を指導できる認定インストラクター資格。科学と身体実践を伝える。",
    validityMonths: 24,
  },
  {
    id: "sleep_wellness_producer",
    name: "Sleep Wellness Producer",
    shortName: "Producer",
    description:
      "企業・地域・教育へ睡眠ウェルネスを広げるプロデューサー資格。",
    validityMonths: 24,
  },
];

export const ACADEMY_CATEGORY_LABELS: Record<AcademyContentCategory, string> = {
  sleep_science: "睡眠科学",
  melatonin_yoga: "メラトニンヨガ™",
  japanese_ma: "日本文化と「間」",
  breathing: "呼吸法",
  soxai: "SOXAI活用",
  case_study: "ケーススタディ",
};

export const ACADEMY_CONTENT_TYPE_LABELS = {
  video: "動画",
  pdf: "PDF",
  material: "資料",
} as const;

export const ACADEMY_LESSONS: AcademyLesson[] = [
  {
    id: "ss-01",
    category: "sleep_science",
    title: "サーカディアンリズムの基礎",
    summary: "体内時計と光・温度・食事の関係を学びます。",
    contentType: "video",
    durationLabel: "18分",
    qualificationId: "navigator",
  },
  {
    id: "ss-02",
    category: "sleep_science",
    title: "睡眠ステージと回復のしくみ",
    summary: "NREM / REM と日中パフォーマンスのつながり。",
    contentType: "pdf",
    durationLabel: "12ページ",
    qualificationId: "navigator",
  },
  {
    id: "ss-03",
    category: "sleep_science",
    title: "加齢と睡眠変化",
    summary: "ライフステージ別の睡眠課題と介入の考え方。",
    contentType: "material",
    durationLabel: "資料",
    qualificationId: "sleep_wellness_producer",
  },
  {
    id: "my-01",
    category: "melatonin_yoga",
    title: "メラトニンヨガ™ 導入シークエンス",
    summary: "夕方〜就寝前に適した基本シークエンス。",
    contentType: "video",
    durationLabel: "24分",
    qualificationId: "melatonin_yoga_instructor",
  },
  {
    id: "my-02",
    category: "melatonin_yoga",
    title: "指導上の安全ガイドライン",
    summary: "禁忌・配慮事項とクラス設計のポイント。",
    contentType: "pdf",
    durationLabel: "8ページ",
    qualificationId: "melatonin_yoga_instructor",
  },
  {
    id: "ma-01",
    category: "japanese_ma",
    title: "「間」と休息の美学",
    summary: "日本文化における間と、現代の睡眠習慣への応用。",
    contentType: "video",
    durationLabel: "15分",
    qualificationId: "navigator",
  },
  {
    id: "ma-02",
    category: "japanese_ma",
    title: "季節と睡眠のリズム",
    summary: "二十四節気と生活リズムの整え方。",
    contentType: "material",
    durationLabel: "資料",
    qualificationId: "sleep_wellness_producer",
  },
  {
    id: "br-01",
    category: "breathing",
    title: "就寝前の呼吸プロトコル",
    summary: "副交感神経を促す呼吸法の実践。",
    contentType: "video",
    durationLabel: "12分",
    qualificationId: "navigator",
  },
  {
    id: "br-02",
    category: "breathing",
    title: "指導用キューイング集",
    summary: "クラスで使える声かけとタイミング。",
    contentType: "pdf",
    durationLabel: "6ページ",
    qualificationId: "melatonin_yoga_instructor",
  },
  {
    id: "sx-01",
    category: "soxai",
    title: "SOXAIデータの読み方",
    summary: "スコア・ステージ・心拍変動の解釈。",
    contentType: "video",
    durationLabel: "20分",
    qualificationId: "navigator",
  },
  {
    id: "sx-02",
    category: "soxai",
    title: "クライアントフィードバックの型",
    summary: "測定結果を伝える会話フレーム。",
    contentType: "material",
    durationLabel: "資料",
    qualificationId: "sleep_wellness_producer",
  },
  {
    id: "cs-01",
    category: "case_study",
    title: "シフトワーカー支援ケース",
    summary: "不規則勤務のクライアント支援プロセス。",
    contentType: "pdf",
    durationLabel: "10ページ",
    qualificationId: "sleep_wellness_producer",
  },
  {
    id: "cs-02",
    category: "case_study",
    title: "入眠困難への段階的介入",
    summary: "初回ヒアリングから4週間プログラムまで。",
    contentType: "video",
    durationLabel: "22分",
    qualificationId: "melatonin_yoga_instructor",
  },
];

export const ACADEMY_TESTS: AcademyTest[] = [
  {
    id: "test-navigator",
    qualificationId: "navigator",
    title: "Navigator 認定テスト",
    description: "睡眠科学と基礎実践の理解を確認します。合格点 70点。",
    passingScore: 70,
    questions: [
      {
        id: "nq1",
        kind: "multiple_choice",
        prompt: "サーカディアンリズムを最も強く同調させる刺激はどれですか？",
        choices: ["食事の量", "光（特に朝の光）", "就寝前の入浴", "カフェイン制限"],
        correctIndex: 1,
        points: 20,
      },
      {
        id: "nq2",
        kind: "multiple_choice",
        prompt: "深い睡眠（N3）が特に寄与するとされるのは？",
        choices: [
          "短期記憶の固定のみ",
          "身体回復・免疫と成長ホルモン分泌",
          "夢の想起",
          "体温の上昇",
        ],
        correctIndex: 1,
        points: 20,
      },
      {
        id: "nq3",
        kind: "multiple_choice",
        prompt: "入眠の質を高める生活習慣として適切なのは？",
        choices: [
          "就寝直前の高輝度画面視聴",
          "就寝前の激しい有酸素",
          "一定の就寝・起床時刻",
          "午後の長時間仮眠（3時間以上）",
        ],
        correctIndex: 2,
        points: 20,
      },
      {
        id: "nq4",
        kind: "written",
        prompt:
          "クライアントに「睡眠衛生」を説明するとき、伝えるべきポイントを1つ書いてください。",
        keywords: ["光", "リズム", "カフェイン", "寝室", "規則", "就寝"],
        points: 40,
      },
    ],
  },
  {
    id: "test-my-instructor",
    qualificationId: "melatonin_yoga_instructor",
    title: "Melatonin Yoga™ Instructor 認定テスト",
    description: "指導安全とシークエンス設計の理解を確認します。合格点 75点。",
    passingScore: 75,
    questions: [
      {
        id: "mq1",
        kind: "multiple_choice",
        prompt: "メラトニンヨガ™のクラスを実施する推奨時間帯は？",
        choices: ["早朝の覚醒直後", "正午の休憩直後", "夕方〜就寝前", "深夜帯のみ"],
        correctIndex: 2,
        points: 25,
      },
      {
        id: "mq2",
        kind: "multiple_choice",
        prompt: "指導上、最優先で確認すべきことは？",
        choices: [
          "音楽のジャンル",
          "禁忌・既往と安全配慮",
          "マットのブランド",
          "SNS投稿の有無",
        ],
        correctIndex: 1,
        points: 25,
      },
      {
        id: "mq3",
        kind: "written",
        prompt:
          "副交感神経を促す呼吸キューの例を1つ記述してください（ダミー採点可）。",
        keywords: ["息", "吐", "ゆっくり", "鼻", "腹", "リラックス"],
        points: 50,
      },
    ],
  },
  {
    id: "test-producer",
    qualificationId: "sleep_wellness_producer",
    title: "Sleep Wellness Producer 認定テスト",
    description: "プログラム設計とケース対応の理解を確認します。合格点 80点。",
    passingScore: 80,
    questions: [
      {
        id: "pq1",
        kind: "multiple_choice",
        prompt: "企業向け睡眠プログラム設計で最初に行うべきことは？",
        choices: [
          "アプリ開発",
          "課題ヒアリングと目標設定",
          "機材購入",
          "全社員への強制参加",
        ],
        correctIndex: 1,
        points: 30,
      },
      {
        id: "pq2",
        kind: "multiple_choice",
        prompt: "SOXAI活用でクライアントへ伝える際の基本姿勢は？",
        choices: [
          "数値のみを絶対視する",
          "数値を文脈（生活・主観）と合わせて伝える",
          "診断名を断定する",
          "データを見せない",
        ],
        correctIndex: 1,
        points: 30,
      },
      {
        id: "pq3",
        kind: "written",
        prompt: "ケーススタディで重視すべき「継続」の観点を1つ書いてください。",
        keywords: ["習慣", "フォロー", "継続", "目標", "振り返り", "小さく"],
        points: 40,
      },
    ],
  },
];

export function getQualification(id: string): AcademyQualification | undefined {
  return ACADEMY_QUALIFICATIONS.find((q) => q.id === id);
}

export function getLesson(id: string): AcademyLesson | undefined {
  return ACADEMY_LESSONS.find((l) => l.id === id);
}

export function getTest(id: string): AcademyTest | undefined {
  return ACADEMY_TESTS.find((t) => t.id === id);
}

export function lessonsByCategory(
  category: AcademyContentCategory,
): AcademyLesson[] {
  return ACADEMY_LESSONS.filter((l) => l.category === category);
}
