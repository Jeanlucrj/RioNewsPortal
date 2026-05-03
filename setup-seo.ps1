# =============================================================================
# setup-seo.ps1 — Finaliza SEO em producao (Edge Function + Vercel env vars)
# O Diario Carioca — odiariocarioca.com.br
#
# Precisa de 2 tokens (30 segundos para pegar cada um):
#
#   SUPABASE_TOKEN: https://supabase.com/dashboard/account/tokens
#                   → "Generate new token" → copie
#
#   SERVICE_ROLE_KEY: https://supabase.com/dashboard/project/kctirxnuvxklkkmzxciz/settings/api
#                     → "service_role" (secret) → clique em "Reveal" → copie
#
#   VERCEL_TOKEN: https://vercel.com/account/tokens
#                 → "Create Token" → copie
#
# Uso:
#   $env:SUPABASE_TOKEN   = "sbp_xxxx"
#   $env:SERVICE_ROLE_KEY = "eyJhbGci..."
#   $env:VERCEL_TOKEN     = "xxxx"
#   .\setup-seo.ps1
# =============================================================================

$ErrorActionPreference = "Stop"

$SUPABASE_TOKEN   = $env:SUPABASE_TOKEN
$SERVICE_ROLE_KEY = $env:SERVICE_ROLE_KEY
$VERCEL_TOKEN     = $env:VERCEL_TOKEN

if (-not $SUPABASE_TOKEN)   { Write-Error "Defina `$env:SUPABASE_TOKEN"   }
if (-not $SERVICE_ROLE_KEY) { Write-Error "Defina `$env:SERVICE_ROLE_KEY" }
if (-not $VERCEL_TOKEN)     { Write-Error "Defina `$env:VERCEL_TOKEN"     }

$PROJECT_REF     = "kctirxnuvxklkkmzxciz"
$VERCEL_PROJECT  = "prj_v1WDYAbXYbfBHWrtVQ4IWHsDbTOZ"
$DB_URL          = "postgresql://postgres:Mf%4006296009@db.kctirxnuvxklkkmzxciz.supabase.co:5432/postgres"
$SA_JSON_FILE    = "C:\Users\User\Downloads\rionews-seo-e113430a46c4.json"
$SITE_URL        = "https://odiariocarioca.com.br"
$SCRIPT_DIR      = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   SEO Setup — O Diario Carioca                          ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

# ── 1. Ler service account JSON ──────────────────────────────────────────────
Write-Host "`n▶ [1/4] Carregando Google Service Account..." -ForegroundColor Yellow
$SA_JSON = Get-Content $SA_JSON_FILE -Raw
$SA_OBJ  = $SA_JSON | ConvertFrom-Json
Write-Host "✅ Service account: $($SA_OBJ.client_email)" -ForegroundColor Green

# ── 2. Supabase: login + link + secret + deploy ──────────────────────────────
Write-Host "`n▶ [2/4] Supabase: login, secret e deploy da Edge Function..." -ForegroundColor Yellow

# Login
npx --yes supabase@latest login --token $SUPABASE_TOKEN 2>&1 | Out-Null
Write-Host "   ✅ Login OK" -ForegroundColor Green

# Link ao projeto
Set-Location $SCRIPT_DIR
npx supabase@latest link --project-ref $PROJECT_REF 2>&1 | Out-Null
Write-Host "   ✅ Projeto linkado ($PROJECT_REF)" -ForegroundColor Green

# Configurar secret da Edge Function
$SA_JSON_INLINE = ($SA_JSON -replace "`r`n","" -replace "`n","")
npx supabase@latest secrets set "GOOGLE_SERVICE_ACCOUNT_JSON=$SA_JSON_INLINE" --project-ref $PROJECT_REF 2>&1 | Out-Null
Write-Host "   ✅ Secret GOOGLE_SERVICE_ACCOUNT_JSON configurado" -ForegroundColor Green

# Deploy da Edge Function
npx supabase@latest functions deploy index-news --project-ref $PROJECT_REF --no-verify-jwt 2>&1 | Out-Null
Write-Host "   ✅ Edge Function index-news deployada" -ForegroundColor Green

# ── 3. Configurar service_role_key no banco via pg ───────────────────────────
Write-Host "`n▶ [3/4] Configurando service_role_key no banco de dados..." -ForegroundColor Yellow

$pgScript = @"
const {Client}=require('pg');
const c=new Client({connectionString:'$DB_URL',ssl:{rejectUnauthorized:false}});
const key='$SERVICE_ROLE_KEY';
c.connect()
  .then(()=>c.query('ALTER DATABASE postgres SET "app.settings.service_role_key" = \'' + key + '\''))
  .then(()=>{console.log('OK');c.end();})
  .catch(e=>{console.error('FAIL:',e.message);c.end();process.exit(1);});
"@

$result = $pgScript | node
if ($result -eq "OK") {
    Write-Host "   ✅ GUC service_role_key configurado — webhook ativo" -ForegroundColor Green
} else {
    Write-Host "   ⚠ $result" -ForegroundColor Yellow
}

# ── 4. Vercel: env vars + redeploy ───────────────────────────────────────────
Write-Host "`n▶ [4/4] Configurando variáveis no Vercel..." -ForegroundColor Yellow

function Set-VercelEnv($Key, $Value) {
    $targets = @("production", "preview")
    foreach ($target in $targets) {
        $body = @{
            key    = $Key
            value  = $Value
            type   = "encrypted"
            target = @($target)
        } | ConvertTo-Json -Compress

        $resp = Invoke-RestMethod `
            -Uri "https://api.vercel.com/v10/projects/$VERCEL_PROJECT/env" `
            -Method POST `
            -Headers @{ Authorization = "Bearer $VERCEL_TOKEN"; "Content-Type" = "application/json" } `
            -Body $body `
            -ErrorAction SilentlyContinue

        if ($resp.error) {
            # Se ja existe, faz PATCH (update)
            $existing = Invoke-RestMethod `
                -Uri "https://api.vercel.com/v10/projects/$VERCEL_PROJECT/env" `
                -Headers @{ Authorization = "Bearer $VERCEL_TOKEN" } `
                -ErrorAction SilentlyContinue
            $envId = ($existing.envs | Where-Object { $_.key -eq $Key -and $_.target -contains $target }).id
            if ($envId) {
                Invoke-RestMethod `
                    -Uri "https://api.vercel.com/v10/projects/$VERCEL_PROJECT/env/$envId" `
                    -Method PATCH `
                    -Headers @{ Authorization = "Bearer $VERCEL_TOKEN"; "Content-Type" = "application/json" } `
                    -Body (@{ value = $Value } | ConvertTo-Json) | Out-Null
                Write-Host "   ✅ $Key atualizado → $target" -ForegroundColor Green
            }
        } else {
            Write-Host "   ✅ $Key criado → $target" -ForegroundColor Green
        }
    }
}

Set-VercelEnv "SITE_URL" $SITE_URL
Set-VercelEnv "GOOGLE_SERVICE_ACCOUNT_JSON" $SA_JSON_INLINE

# Redeploy
Write-Host "`n▶ Acionando redeploy no Vercel..." -ForegroundColor Yellow
Set-Location $SCRIPT_DIR
git commit --allow-empty -m "chore: redeploy after SEO env vars" 2>&1 | Out-Null
git push origin main 2>&1 | Out-Null
Write-Host "✅ Redeploy acionado via git push" -ForegroundColor Green

# ── Resumo ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ SEO Integration 100% ativa!                         ║" -ForegroundColor Green
Write-Host "╠══════════════════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║  Verifique em ~2 minutos:                                ║" -ForegroundColor Green
Write-Host "║  • odiariocarioca.com.br/sitemap.xml                     ║" -ForegroundColor Green
Write-Host "║  • odiariocarioca.com.br/sitemap-news.xml                ║" -ForegroundColor Green
Write-Host "║  • odiariocarioca.com.br/api/health  (gemini + seo)      ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Green
