# Sleep Wellness API Platform — Developer Guide

> Version 4.0 · Open Platform  
> Base path: `/api/v1`

Sleep Wellness Platform を外部サービスと接続するための REST API / Webhook / 開発者コンソールのガイドです。

---

## 1. 概要

| 項目 | 内容 |
|---|---|
| 製品名 | Sleep Wellness API Platform |
| API バージョン | `v1` |
| OpenAPI | `GET /api/v1/openapi`（自動生成） |
| 管理 UI | `/developer`（管理者のみ） |
| リファレンス UI | `/developer/docs` |

---

## 2. API 一覧

| API / 領域 | 説明 | Scope |
|---|---|---|
| Clients | クライアント一覧・詳細 | `clients:read` |
| Analysis | 睡眠分析一覧・詳細 | `analysis:read` |
| Journey | Sleep Wellness Journey™ | `journey:read` |
| Homework | 宿題一覧 | `homework:read` |
| Sleep Coach | 日次コーチ提案 | `sleep-coach:read` |
| Academy | 講座・試験・証明書 | `academy:read` |
| Events | イベント一覧 | `events:read` |
| Reports | レポートメタデータ | `reports:read` |
| Meta | Health / OpenAPI | （公開） |

---

## 3. エンドポイント一覧

すべての保護エンドポイントは認証が必要です。レスポンスは原則 `{ "data": ... }` 形式です。

| Method | Path | 説明 |
|---|---|---|
| `GET` | `/api/v1/health` | ヘルスチェック（認証不要） |
| `GET` | `/api/v1/openapi` | OpenAPI 3.1 JSON（認証不要） |
| `GET` | `/api/v1/clients` | クライアント一覧 |
| `GET` | `/api/v1/clients/{id}` | クライアント詳細 |
| `GET` | `/api/v1/clients/{id}/journey` | Journey |
| `GET` | `/api/v1/clients/{id}/sleep-coach` | Sleep Coach |
| `GET` | `/api/v1/analyses` | 分析一覧（`?clientId=` 可） |
| `GET` | `/api/v1/analyses/{id}` | 分析詳細 |
| `GET` | `/api/v1/homework` | 宿題一覧（`?clientId=` 可） |
| `GET` | `/api/v1/academy` | Academy アイテム |
| `GET` | `/api/v1/events` | イベント一覧 |
| `GET` | `/api/v1/reports` | レポート一覧（`?clientId=` 可） |
| `GET` | `/api/v1/reports/{id}` | レポート詳細 |

### Developer 管理 API（管理者のみ）

| Method | Path | 説明 |
|---|---|---|
| `GET` | `/api/developer/keys` | Dashboard 一式 |
| `POST` | `/api/developer/keys` | API Key 発行 |
| `DELETE` | `/api/developer/keys/{id}` | API Key 無効化 |
| `GET` / `POST` | `/api/developer/webhooks` | Webhook 一覧 / 登録 |
| `PATCH` / `DELETE` | `/api/developer/webhooks/{id}` | Webhook 更新 / 削除 |
| `GET` | `/api/developer/audit` | 監査ログ |
| `GET` / `PUT` | `/api/developer/rate-limit` | Rate Limit 取得 / 更新 |

---

## 4. 認証方式

3 方式をサポートします。優先順位は **API Key → JWT → Role** です。

### 4.1 API Key

管理者（`/developer`）が発行します。有効期限・Scope・無効化に対応。

```http
GET /api/v1/clients
X-API-Key: swij_live_••••••••
```

または:

```http
Authorization: Bearer swij_live_••••••••
```

デモ用キー（ローカル）:

```text
swij_live_demo_platform_key_v4
```

### 4.2 JWT（セッション）

Supabase Auth のセッション Cookie / Bearer JWT。ログイン済みユーザーは Role に応じたアクセスが可能です。

```http
Authorization: Bearer <supabase_access_token>
```

### 4.3 Role（デモ / 内部）

ローカル検証用ヘッダです。

```http
X-SWIJ-Role: admin
X-SWIJ-User-Id: demo-user
```

---

## 5. Rate Limit

レスポンスヘッダ:

| Header | 意味 |
|---|---|
| `X-RateLimit-Limit` | 1 分あたり上限 |
| `X-RateLimit-Remaining` | 残り回数 |
| `X-RateLimit-Reset` | リセット時刻（UNIX 秒） |

超過時は `429 Rate limit exceeded`。

既定値（`/developer` で変更可）:

| 区分 | 既定 |
|---|---|
| defaultPerMinute | 60 |
| burstPerMinute | 120 |
| authenticatedPerMinute | 300 |

API Key ごとに `rateLimitPerMinute` を個別設定できます。

---

## 6. Webhook

### イベント

| Event | 発火タイミング |
|---|---|
| `AnalysisCompleted` | 分析完了時 |
| `HomeworkCompleted` | 宿題完了時 |
| `ScoreUpdated` | スコア更新時 |
| `JourneyUpdated` | Journey 更新時 |
| `CertificateIssued` | 証明書発行時 |

### ペイロード例

```json
{
  "id": "evt_…",
  "type": "AnalysisCompleted",
  "createdAt": "2026-07-22T12:00:00.000Z",
  "data": {
    "analysisId": "an_001",
    "clientId": "cli_yamada",
    "sleepWellnessScore": 74
  }
}
```

署名（HMAC-SHA256）:

```text
X-SWIJ-Signature: t=<unix>,v1=<hex>
```

`v1 = HMAC_SHA256(secret, "<timestamp>.<raw_body>")`

---

## 7. 監査ログ

すべての `/api/v1/*` 呼び出しは監査ログに記録されます。

- method / path / status
- authMethod（`api_key` | `jwt` | `role` | `none`）
- apiKeyId / userId / role / appName
- durationMs / error

UI: `/developer/audit`

---

## 8. クイックスタート

```bash
# Health
curl -s http://localhost:3000/api/v1/health

# OpenAPI
curl -s http://localhost:3000/api/v1/openapi | head

# Clients
curl -s \
  -H "X-API-Key: swij_live_demo_platform_key_v4" \
  http://localhost:3000/api/v1/clients
```

---

## 9. エラーコード

| Status | 意味 |
|---|---|
| `401` | Unauthorized / Invalid API key |
| `403` | Forbidden / Missing scope |
| `404` | Not found |
| `429` | Rate limit exceeded |

---

## 10. データベース

Supabase スキーマ: `supabase/api-platform.sql`

- `api_keys`
- `api_webhooks`
- `api_webhook_deliveries`
- `api_audit_logs`
- `api_rate_limit_settings`

現行ランタイムはデモストア（インメモリ）を使用し、SQL は本番永続化用の基盤です。

---

## 11. モジュール構成

```text
lib/api-platform/          # 認証・Rate Limit・OpenAPI・Webhook・監査
modules/developer/         # Developer Module（Version 4.0）
app/developer/             # Dashboard / Docs / Audit UI
app/api/v1/                # Public REST API
app/api/developer/         # 管理 API
```

---

## 12. セキュリティ注意

- 発行直後の API Key 平文は **一度だけ** 表示されます
- キーはハッシュ（SHA-256）で保管します
- Scope は最小権限で発行してください
- 本番では HTTPS 必須、Webhook は署名検証を実装してください
