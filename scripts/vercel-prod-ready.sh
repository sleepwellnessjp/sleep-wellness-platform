#!/usr/bin/env bash
# βテスト本番準備: .env.local の値を Vercel Production/Preview に投入し、本番デプロイする
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env.local ]]; then
  echo ".env.local がありません" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env.local
set +a

: "${NEXT_PUBLIC_SUPABASE_URL:?NEXT_PUBLIC_SUPABASE_URL が未設定}"
: "${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:?NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY が未設定}"
: "${OPENAI_API_KEY:?OPENAI_API_KEY が未設定}"

APP_URL="${NEXT_PUBLIC_APP_URL:-https://sleep-wellness-platform-phi.vercel.app}"

for env in production preview; do
  vercel env add NEXT_PUBLIC_SUPABASE_URL "$env" --value "$NEXT_PUBLIC_SUPABASE_URL" --yes --force
  vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY "$env" --value "$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" --yes --force
  vercel env add OPENAI_API_KEY "$env" --value "$OPENAI_API_KEY" --sensitive --yes --force
done

vercel env add NEXT_PUBLIC_APP_URL production --value "$APP_URL" --yes --force
vercel env ls
vercel --prod --yes
