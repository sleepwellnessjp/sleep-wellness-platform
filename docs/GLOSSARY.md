# Glossary

> SWIJ / Sleep Wellness Platform 用語集  
> 画面・文書・コードで表記を揃えるための基準。調査日: 2026-07-22

| 日本語名 | 英語名 | 正式表記 | 画面上の推奨表記 | 備考 |
|---|---|---|---|---|
| スリープウェルネス研究所（日本） | Sleep Wellness Institute Japan | Sleep Wellness Institute Japan | Sleep Wellness Institute Japan / SWIJ | 運営ブランド。ロゴ alt も同名 |
| SWIJ | SWIJ | SWIJ | SWIJ | 略称。認定番号 `SWIJ-YYYY-XXXX` |
| スリープウェルネスプラットフォーム | Sleep Wellness Platform | Sleep Wellness Platform | Sleep Wellness Platform | 本プロダクト名 |
| スリープウェルネス OS | Sleep Wellness OS | Sleep Wellness OS | （内部設計名） | `docs/SLEEP_WELLNESS_OS.md`。対外は Platform |
| 睡眠分析 | Sleep Analysis | 睡眠分析 | 睡眠分析 / 新規分析 | SOXAI 画像〜結果までのフロー |
| スリープウェルネススコア | Sleep Wellness Score | Sleep Wellness Score | Sleep Wellness Score | AI 分析が出力する独自 0–100。SOXAI 睡眠スコアと別 |
| SOXAI 睡眠スコア | SOXAI Sleep Score | （デバイス表示に従う） | SOXAI 睡眠スコア / sleep score | 端末由来。DB `sleep_score` 等 |
| AI 分析 | AI Analysis | AI 分析 | AI 分析 | OpenAI によるレポート生成（`/api/analyze`） |
| OCR / 指標抽出 | OCR / Extract | OCR | 指標の読み取り / 確認 | OpenAI Vision（`/api/extract`） |
| スリープコーチ | Sleep Coach | Sleep Coach | Sleep Coach | 現状ルールベース。GPT 未配線 |
| ジャーニー | Sleep Wellness Journey | Sleep Wellness Journey | Journey / Sleep Wellness Journey | 改善の物語。ルールベース |
| インストラクターインサイト | Instructor Insight | Instructor Insight | AI Instructor Insight（現行 UI） | **外部 AI ではない**（ルール）。表記見直し候補 |
| おすすめ行動（当日） | Today's Recommendations | todaysRecommendations | 今日のおすすめ | AI 分析出力 |
| AI 宿題 | Recommendations Until Next | recommendationsUntilNext | AI宿題 / 次回までの行動 | AI 生成・編集・チェック可 |
| 宿題 | Homework | client_homeworks | 宿題 | 講師が付与する宿題（AI宿題と区別） |
| 達成率 | Achievement Rate / Completion Rate | 達成率 | 達成率 | AI宿題チェックまたは宿題完了率 |
| 継続日数 | Streak | streakDays | 継続日数 | 宿題ストリーク等。定義が複数あるため文脈明示 |
| 認定講師 | Instructor / Certified Instructor | 認定講師 | 認定講師 | Role `instructor` |
| クライアント | Client | クライアント | クライアント | Role `client` または担当対象者 |
| 管理者 | Admin | 管理者 | 管理者 | Role `admin` / `super_admin` |
| 企業管理者 | Enterprise Admin | enterprise | 企業（Home） | Role `enterprise`。`company_admin` は不使用 |
| メディカルレポート | Medical Report / Expert Report | Sleep Wellness Expert Report | Expert Report / Medical Report | 結果画面の文章レポート。医療診断ではない |
| ビジュアルレポート | Visual Report | Sleep Wellness Visual Report | Visual Report | チャート中心の結果表示 |
| PDF | PDF | PDFダウンロード | PDF（印刷） | 実体はブラウザ印刷 |
| メラトニンヨガ | Melatonin Yoga | メラトニンヨガ™ | メラトニンヨガ™ | 商標。™ を省略しない |
| アカデミー | Academy | Academy | Academy | 講座・試験・証明書 |
| コミュニティ | Community | Community | Community | 議論・ナレッジ・イベント告知 |
| インサイツ | Insights / SWI | Sleep Wellness Intelligence | Insights | 匿名集計ダッシュボード |
| プログラム | Program | 改善プログラム | プログラム | `programs` テーブル |
| クレジット | Analysis Credit | 月次クレジット | クレジット | 分析消費単位 |
| 会員 / 認定 | Membership / Certification | membership | 認定 / 会員ステータス | navigator 等の認定種別 |
| ポータル | Portal | マイポータル / クライアントポータル | ポータル | 講師 `/portal`、client リンク |
| デベロッパー API | Developer API / API Platform | Sleep Wellness API Platform | Developer | v1 外部 API。現状デモ中心 |
| マーケットプレイス | Marketplace | — | （使用しない） | **未実装。案内禁止** |

---

## 使い分けルール

1. **Score** と書いたら原則 Sleep Wellness Score。デバイス値は「SOXAI 睡眠スコア」と明示。
2. **宿題** と **AI宿題** を混同しない。
3. **Instructor Insight** を「GPT が生成」と説明しない（現行はルール）。
4. **Medical Report** は帳票名であり医療行為を意味しない。近くに免責を置く。
5. **メラトニンヨガ™** は常に商標表記。

---

## Role 表記対照

| DB 値 | 日本語推奨 | 英語 UI eyebrow |
|---|---|---|
| `super_admin` | 管理者 | ADMIN |
| `admin` | 管理者 | ADMIN |
| `instructor` | 認定講師 | INSTRUCTOR |
| `client` | クライアント | CLIENT |
| `enterprise` | 企業管理者 | （Enterprise Home） |
