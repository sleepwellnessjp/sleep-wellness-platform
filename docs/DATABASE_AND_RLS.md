# Database and RLS

> 調査日: 2026-07-22  
> SQL は **実行していない**。`supabase/migrations/` を適用順の正とし、ルート `supabase/*.sql` は SQL Editor 用ミラーとして扱う。

## 1. 適用順（migrations）

| 順 | ファイル | 主な内容 |
|---|---|---|
| 1 | `20260716100000_base_schema.sql` | profiles, clients, analyses, programs + RLS |
| 2 | `20260720100000_platform_v1.sql` | roles, membership, credits, history, admin_logs, notifications |
| 3 | `20260720120000_analysis_persist_v1.sql` | 分析ペイロード列・クレジット冪等 |
| 4 | `20260720130000_grant_pilot_membership.sql` | membership ensure + パイロット付与 |
| 5 | `20260721100000_analysis_structured_metrics.sql` | OCR/構造化メトリクス列 |
| 6 | `20260722100000_client_profile_basics.sql` | clients に基礎属性列 |
| 7 | `20260722120000_client_profile_v2.sql` | client_profiles, weather_records |
| 8 | `20260722140000_occupation_environment_baselines.sql` | 職業・環境・ベースライン |
| 9 | `20260722150000_create_client_with_profile.sql` | 作成 RPC |
| 10 | `20260722160000_client_tags.sql` | tags |
| 11 | `20260722170000_client_guidance_notes.sql` | 指導メモ |
| 12 | `20260722180000_client_appointments.sql` | 予約 |
| 13 | `20260722190000_clients_instructor_id.sql` | owner_id → instructor_id |
| 14 | `20260722200000_client_mypage.sql` | auth_user_id / portal RPC |
| 15 | `20260722210000_client_homeworks.sql` | 宿題 |
| 16 | `20260722220000_v1_rc_security_hardening.sql` | サインアップ/role 保護強化 |
| 17 | `20260722230000_academy.sql` | Academy |
| 18 | `20260722240000_admin_console.sql` | platform_settings, system_activity_logs |
| 19 | `20260722250000_community.sql` | Community |
| 20 | `20260722260000_swi_insights.sql` | 匿名ビュー + RPC |
| 21 | `20260722270000_sleep_wellness_os_enterprise_role.sql` | enterprise role |

### ルート SQL との重複・矛盾

| 問題 | 内容 |
|---|---|
| `schema.sql` vs base migration | ルートは既に `instructor_id` / `tags` 前提。migration は当初 `owner_id` |
| 早期 profile/baselines migration | 一時的に `owner_id` 参照 → `22190000` で修正 |
| `api-platform.sql` | **migrations に無し**。types にも無し |
| `patch-consume-credit-idempotent.sql` | ルートのみ |
| hardening / enterprise | migration のみ（ルートミラー無し） |

**推奨:** 本番は migrations を時系列適用。ルート SQL を単体で実行すると状態がずれる。

---

## 2. 認証と Role 格納

| 項目 | 実態 |
|---|---|
| Auth | Supabase Auth（`auth.users`） |
| プロフィール | `profiles.id` = `auth.users.id` |
| Role | `profiles.role`（`user_roles` テーブル無し） |
| カタログ | `roles` テーブル |
| サインアップ | `handle_new_user`（hardening 後は instructor/client のみメタデータ許可） |

---

## 3. テーブル一覧

凡例 RLS: E=有効。画面は代表例。

### 3.1 `profiles`

| 項目 | 内容 |
|---|---|
| 目的 | ユーザープロフィールと Role |
| 主要カラム | id, email, display_name, role, avatar_url, client_message, last_login_at |
| FK | id → auth.users |
| Role 関係 | 全 Role の源泉 |
| 参照画面 | login 後全 Home, settings, portal, admin |
| RLS | E |
| SELECT | 自分 / admin+ / 担当講師（リンク client） |
| INSERT | 自分 |
| UPDATE | 自分（role 変更は service_role 以外ブロック） |
| DELETE | ポリシーなし |
| 懸念 | INSERT own と trigger の二重経路 |

### 3.2 `roles`

| 項目 | 内容 |
|---|---|
| 目的 | Role カタログ |
| 主要カラム | id, label, description, permissions |
| FK | なし |
| RLS | E / SELECT authenticated。書込ポリシーなし |
| 懸念 | 低（参照用） |

### 3.3 `clients`

| 項目 | 内容 |
|---|---|
| 目的 | 講師の担当クライアント |
| 主要カラム | id, instructor_id, auth_user_id, name, name_kana, email, phone, memo, tags, … |
| FK | instructor_id → auth.users, auth_user_id → auth.users |
| Role 関係 | instructor 所有 / client リンク |
| 参照画面 | `/clients*`, 分析, プログラム, client Home |
| RLS | E |
| SELECT | 担当講師 / リンク本人 / admin+ |
| INSERT/UPDATE/DELETE | 担当講師（instructor_id = uid） |
| 懸念 | リンク client が memo/連絡先まで見える |

### 3.4 `analyses`

| 項目 | 内容 |
|---|---|
| 目的 | 睡眠分析・OCR・AI 結果 |
| 主要カラム | client_id, owner_id, sleep_score, wellness 系, ocr_data, ai_result, confirmed_metrics, report_payload, day_context, … |
| FK | client_id → clients, owner_id → auth.users |
| 参照画面 | `/analysis/*`, client 履歴, compare |
| RLS | E |
| SELECT | owner / リンク client / admin+ |
| INSERT/UPDATE/DELETE | owner |
| 懸念 | client SELECT で AI/OCR JSON 全体が露出。`update_own_homework_checks` が DEFINER で JSON 書換 |

### 3.5 `programs`

| 項目 | 内容 |
|---|---|
| 目的 | クライアント改善プログラム |
| 主要カラム | client_id, owner_id, phase, progress, goals, menu_items, … |
| FK | client_id → clients, owner_id → auth.users |
| 参照画面 | `/programs*` |
| RLS | E / owner CRUD + admin SELECT |

### 3.6 `membership` / `monthly_credit` / `credit_transactions` / `analysis_history`

| 項目 | 内容 |
|---|---|
| 目的 | 認定・月次クレジット・消費履歴 |
| FK | → profiles（history は clients/analyses も） |
| 参照画面 | `/portal`, 分析アクセス制御, admin instructors |
| RLS | E / 本人 SELECT + admin 管理。書込は主に DEFINER RPC |
| 懸念 | 過去に membership 自己再有効化あり → hardening で緩和 |

### 3.7 `admin_logs` / `notifications` / `platform_settings` / `system_activity_logs`

| テーブル | 目的 | RLS 要約 | 懸念 |
|---|---|---|---|
| admin_logs | 管理操作監査 | admin+ SELECT/INSERT。UPDATE/DELETE は super_admin 系 | — |
| notifications | ユーザー通知 | 本人 SELECT/UPDATE。INSERT admin+。DELETE なし | OS 通知はデモ混在 |
| platform_settings | ブランド/法務設定 | admin+ | — |
| system_activity_logs | ログイン/分析/PDF 等 | admin SELECT。INSERT は認証ユーザーが自己/null actor 可 | 書き込みが広い |

### 3.8 `client_profiles` / `weather_records`

| 項目 | 内容 |
|---|---|
| 目的 | 固定プロフィール JSON / 天気文脈 |
| RLS | owner CRUD（profiles はクライアント所有確認付き） |
| 参照画面 | `/clients/[id]/profile*` , 分析 AI 入力 |

### 3.9 `client_guidance_notes` / `client_appointments` / `client_homeworks`

| テーブル | 目的 | SELECT | 書込 |
|---|---|---|---|
| guidance_notes | 指導メモ | 講師 / リンク client | 講師 |
| appointments | 予約 | 講師 | 講師 |
| homeworks | 宿題 | 講師 / リンク client | 講師 CRUD。完了は RPC |

### 3.10 職業・環境・ベースライン

`occupation_master`, `environment_event_master`, `client_occupation_attributes`, `analysis_environment_events`, `client_metric_baselines`

| 項目 | 内容 |
|---|---|
| マスター | authenticated SELECT（active）。書込ポリシーなし |
| 子テーブル | owner CRUD + 所有確認 |
| 参照 | 分析・プロフィール関連 |

### 3.11 Academy

`academy_credentials`, `academy_lesson_progress`, `academy_test_attempts`

| 項目 | 内容 |
|---|---|
| RLS | 本人 SELECT/INSERT（/UPDATE）。admin SELECT |
| 懸念 | **資格・試験結果を本人が INSERT 可能**（証明書番号の自己発行リスク） |

### 3.12 Community（9 テーブル）

announcements, discussion_posts/comments, likes, case_shares, knowledge_items, events, message_threads, messages

| 項目 | 内容 |
|---|---|
| ゲート | `is_community_member()` = instructor/admin/super_admin |
| enterprise | **メンバー関数に含まれない** |
| 懸念 | messages の UPDATE/DELETE ポリシー欠如（拒否＝運用制限） |

### 3.13 View: `swi_anonymous_analysis_metrics`

匿名 Insights 用。`security_invoker`。types の Views には未登録。

### 3.14 API Platform（ルート SQL のみ・アプリ未接続）

`api_keys`, `api_webhooks`, `api_webhook_deliveries`, `api_audit_logs`, `api_rate_limit_settings`

| 項目 | 内容 |
|---|---|
| RLS | admin 向け FOR ALL（定義上） |
| 実行時 | **アプリは demo-store を使用**。migrations 未収録 |

---

## 4. セキュリティ上の懸念（優先度順）

1. **Academy 資格の自己 INSERT**（本番で悪用可能）
2. **Developer API が DB ではなく demo API Key / `x-swij-role` に依存**（本番公開危険）
3. ~~proxy matcher と PROTECTED_PREFIXES の不一致~~ → 公開許可リスト＋ catch-all matcher で解消
4. **ルート SQL と migrations のドリフト**（誤適用で RLS 破綻）
5. **リンク client による analyses フル SELECT**（機微 JSON）
6. **パイロットメールのハードコード**（grant SQL）
7. **system_activity_logs の広い INSERT**

---

## 5. `database.types.ts` との差分

- 収録: 主要業務テーブル（enterprise role 含む profiles）
- 未収録: api-platform 5 テーブル、SWI view、一部 legacy clients 列（basics migration）

型は「最終想定スキーマ」に近いが、DB 実適用状態とは別途照合が必要。
