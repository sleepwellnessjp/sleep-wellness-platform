# Role and Permission Matrix

> 調査日: 2026-07-22  
> **実際に存在する Role のみ**（`profiles.role` / `lib/platform/types.ts`）

## 存在する Role

| Role | 画面ラベル（`lib/os/roles.ts`） | Home |
|---|---|---|
| `super_admin` | 管理者 | `/admin` |
| `admin` | 管理者 | `/admin` |
| `instructor` | 認定講師 | `/dashboard` |
| `client` | クライアント | `/client` |
| `enterprise` | （企業 Home） | `/enterprise` |

### 候補だが **存在しない** Role

| 名称 | 状態 |
|---|---|
| `company_admin` | コード・SQL・型に **未定義**。企業向けは `enterprise` |

補足: `super_admin` と `admin` は同一 Admin Home。差分は主に membership DELETE 等が `is_super_admin()` に残る箇所（要確認）。

---

## 画面アクセス（`proxy.ts` + ナビ）

| 画面群 | super_admin | admin | instructor | client | enterprise |
|---|---|---|---|---|---|
| `/admin/*` | ○ | ○ | ×（Home へ） | × | × |
| `/developer/*` | ○ | ○ | × | × | × |
| `/dashboard`, `/clients`, `/programs`, `/analysis/*`, `/portal`, `/academy`, `/community`, `/insights` | ○※ | ○※ | ○ | ×（講師系へリダイレクト） | × |
| `/client`, `/client/*` | ○（例外許可） | ○ | × | ○ | × |
| `/enterprise` | ○ | ○ | × | × | ○ |
| `/settings`, `/notifications` | ○ | ○ | ○ | ○ | ○ |
| Planned: `/research` 等 | マッチ不足の可能性 | 同左 | 同左 | 同左 | 同左 |

※ 管理者の講師画面利用は proxy 上ブロックされない（`isInstructorOnlyPath` は client/enterprise 向け）。運用方針は **要確認**。

**重大懸念:** `PROTECTED_PREFIXES` にある `/research`, `/retreat`, `/events`, `/companies`, `/reports`, `/billing`, `/notifications` が `proxy.ts` の `config.matcher` に含まれておらず、セッション強制が効かない可能性あり。

---

## データ操作マトリクス

凡例: ○=可 / △=条件付き / ×=不可 / ?=要確認

### profiles

| 操作 | super_admin | admin | instructor | client | enterprise |
|---|---|---|---|---|---|
| 自分の SELECT/UPDATE | ○ | ○ | ○ | ○ | ○ |
| 他人の SELECT | ○（admin+） | ○ | △（リンク済み client） | × | × |
| role 変更 | service_role のみ（`protect_profile_role`） | 同左 | × | × | × |
| DELETE | ×（ポリシーなし） | × | × | × | × |

### clients / analyses / programs / client_* 

| 操作 | instructor（担当） | client（リンク済） | admin+ |
|---|---|---|---|
| clients SELECT | ○ | ○（自分） | ○ |
| clients INSERT/UPDATE/DELETE | ○（自担当） | × | ?（RLS は instructor_id 一致が主） |
| analyses SELECT | ○（owner） | ○ | ○ |
| analyses 書込 | ○（owner） | ×（完了チェック RPC のみ） | ? |
| programs CRUD | ○（owner） | × | SELECT 可（admin console） |
| client_homeworks | CRUD | SELECT + 完了 RPC | ? |
| client_guidance_notes | CRUD | SELECT | ? |

### membership / credits

| 操作 | instructor | admin+ | super_admin |
|---|---|---|---|
| membership SELECT | 自分 | ○ | ○ |
| membership INSERT/UPDATE | × | ○ | ○ |
| membership DELETE | × | × | ○（platform_v1 ポリシー） |
| credits 消費 | RPC | RPC / 管理 | 同左 |

### Academy / Community

| 操作 | instructor | client | admin+ |
|---|---|---|---|
| Academy 学習進捗 | 自分 | 自分（Role があれば） | 全体 SELECT |
| Academy credentials INSERT | **自分で可（RLS）** | 同左 | SELECT |
| Community 参加 | ○（`is_community_member`） | ×（ゲート外） | ○ |
| enterprise の Community | **ゲート外（要確認）** | — | — |

### Developer API

| 操作 | 実態 |
|---|---|
| API Key 管理画面 | admin 想定 UI |
| 認証実装 | **demo-store の API Key** + JWT + **`x-swij-role` ヘッダ** |
| DB `api_keys` テーブル | SQL 定義のみ・migrations 未収録・実行時未使用 |

---

## 他ユーザーデータへのアクセス可否

| Role | 原則 | 例外・懸念 |
|---|---|---|
| instructor | 自担当クライアントのみ | RLS 破綻・owner_id 不一致時は要確認 |
| client | リンク済み本人のみ | analyses 全体（OCR/AI JSON 含む）を SELECT 可能 |
| admin / super_admin | 横断閲覧あり | 運営権限。監査は `admin_logs` |
| enterprise | デモ画面のみ | 実テナント分離 **未実装** |

---

## 管理者権限まとめ

| 権限 | admin | super_admin |
|---|---|---|
| Admin Console | ○ | ○ |
| Developer Console | ○ | ○ |
| membership 削除 | ×（要確認: ポリシー上 super_admin） | ○ |
| platform_settings | ○ | ○ |
| サインアップで付与 | 不可（hardening 後は instructor/client のみ） | 不可 |

---

## 不明点（要確認）

1. admin が講師画面で他講師データまで見えるか（RLS は admin SELECT 広げるが UI は講師向け）。
2. `enterprise` の実データモデル（組織テーブル）は未実装。
3. portal claim RPC と `protect_profile_role` の実行時整合。
4. proxy matcher 欠落ルートの本番影響。
