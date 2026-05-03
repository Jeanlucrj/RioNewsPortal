#!/usr/bin/env bash
# =============================================================================
# setup-seo.sh — Finaliza a integração SEO do O Diário Carioca
#
# Uso:
#   chmod +x setup-seo.sh
#   SUPABASE_TOKEN=sbp_xxx VERCEL_TOKEN=xxx ./setup-seo.sh
#
# Onde obter os tokens:
#   Supabase → https://supabase.com/dashboard/account/tokens  (Create new token)
#   Vercel   → https://vercel.com/account/tokens              (Create Token)
# =============================================================================

set -e

SUPABASE_TOKEN="${SUPABASE_TOKEN:?Defina SUPABASE_TOKEN}"
VERCEL_TOKEN="${VERCEL_TOKEN:?Defina VERCEL_TOKEN}"

PROJECT_REF="kctirxnuvxklkkmzxciz"
VERCEL_PROJECT_ID="prj_v1WDYAbXYbfBHWrtVQ4IWHsDbTOZ"
VERCEL_ORG_ID="team_GeL2yKjcYvjB1F43uNwVufo6"
SITE_URL="https://odiariocarioca.com.br"
DB_URL="postgresql://postgres:Mf%4006296009@db.kctirxnuvxklkkmzxciz.supabase.co:5432/postgres"

SA_JSON_FILE="${SA_JSON_FILE:-/c/Users/User/Downloads/rionews-seo-e113430a46c4.json}"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║        SEO Setup — O Diário Carioca                     ║"
echo "╚══════════════════════════════════════════════════════════╝"

# ── 1. Carregar service account JSON ────────────────────────────────────────
echo ""
echo "▶ [1/5] Carregando Google Service Account JSON..."
if [ ! -f "$SA_JSON_FILE" ]; then
  echo "❌ Arquivo não encontrado: $SA_JSON_FILE"
  echo "   Defina SA_JSON_FILE=<caminho> ou coloque o arquivo no local padrão."
  exit 1
fi
SA_JSON=$(cat "$SA_JSON_FILE" | tr -d '\n\r')
echo "✅ Service account: $(echo $SA_JSON | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).client_email))")"

# ── 2. Supabase CLI: login + link ────────────────────────────────────────────
echo ""
echo "▶ [2/5] Configurando Supabase CLI..."
npx supabase@latest login --token "$SUPABASE_TOKEN" 2>&1 | grep -v "^$"
npx supabase@latest link --project-ref "$PROJECT_REF" 2>&1 | grep -v "^$" || true
echo "✅ Supabase CLI linkado ao projeto $PROJECT_REF"

# ── 3. Supabase: secrets da Edge Function ────────────────────────────────────
echo ""
echo "▶ [3/5] Configurando secrets da Edge Function..."
echo "$SA_JSON" | npx supabase@latest secrets set GOOGLE_SERVICE_ACCOUNT_JSON 2>&1 | grep -v "^$" || \
  npx supabase@latest secrets set "GOOGLE_SERVICE_ACCOUNT_JSON=$SA_JSON" 2>&1 | grep -v "^$"
echo "✅ GOOGLE_SERVICE_ACCOUNT_JSON configurado no Supabase"

# ── 4. Supabase: deploy Edge Function ────────────────────────────────────────
echo ""
echo "▶ [4/5] Deploy da Edge Function index-news..."
npx supabase@latest functions deploy index-news \
  --project-ref "$PROJECT_REF" \
  --no-verify-jwt 2>&1 | grep -v "^$"
echo "✅ Edge Function index-news deployada"

# ── 5. Obter service_role_key e configurar no banco ──────────────────────────
echo ""
echo "▶ [4.5/5] Obtendo service_role_key do projeto Supabase..."
SVC_KEY=$(curl -s "https://api.supabase.com/v1/projects/$PROJECT_REF/api-keys" \
  -H "Authorization: Bearer $SUPABASE_TOKEN" | \
  node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const keys=JSON.parse(d);const k=keys.find(x=>x.name==='service_role');console.log(k?k.api_key:'NOT_FOUND');})")

if [ "$SVC_KEY" != "NOT_FOUND" ] && [ -n "$SVC_KEY" ]; then
  echo "✅ service_role_key obtida"
  node << PGSCRIPT
const {Client}=require('pg');
const c=new Client({connectionString:'$DB_URL',ssl:{rejectUnauthorized:false}});
c.connect()
  .then(()=>c.query("ALTER DATABASE postgres SET \"app.settings.service_role_key\" = '$SVC_KEY'"))
  .then(()=>{console.log('✅ GUC service_role_key configurado no banco');c.end();})
  .catch(e=>{console.error('❌ GUC:',e.message);c.end();});
PGSCRIPT
else
  echo "⚠️  Não foi possível obter service_role_key via API."
  echo "   Execute manualmente no SQL Editor do Supabase:"
  echo "   ALTER DATABASE postgres SET \"app.settings.service_role_key\" = '<sua-chave>';"
fi

# ── 6. Vercel: env vars ──────────────────────────────────────────────────────
echo ""
echo "▶ [5/5] Configurando variáveis de ambiente no Vercel..."

set_vercel_env() {
  local KEY="$1"
  local VALUE="$2"
  for TARGET in "production" "preview"; do
    curl -s -X POST "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/env" \
      -H "Authorization: Bearer $VERCEL_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"key\":\"$KEY\",\"value\":$(echo "$VALUE" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.stringify(d.trim())))"),\"type\":\"encrypted\",\"target\":[\"$TARGET\"]}" \
      | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const r=JSON.parse(d);if(r.error){console.log('  ⚠ '+'$KEY'+' ('+TARGET+'): '+r.error.message);}else{console.log('  ✅ '+'$KEY'+' → '+TARGET);};})" 2>/dev/null
  done
}

set_vercel_env "SITE_URL" "$SITE_URL"
set_vercel_env "GOOGLE_SERVICE_ACCOUNT_JSON" "$SA_JSON"

# Trigger redeploy
echo ""
echo "▶ Triggering redeploy no Vercel..."
cd "$(dirname "$0")"
git commit --allow-empty -m "chore: trigger redeploy after SEO env vars" && git push origin main
echo "✅ Redeploy acionado"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✅ SEO Integration 100% ativa!                         ║"
echo "║                                                          ║"
echo "║  Verifique:                                              ║"
echo "║  • https://odiariocarioca.com.br/sitemap.xml             ║"
echo "║  • https://odiariocarioca.com.br/sitemap-news.xml        ║"
echo "║  • https://odiariocarioca.com.br/api/health (gemini)     ║"
echo "╚══════════════════════════════════════════════════════════╝"
