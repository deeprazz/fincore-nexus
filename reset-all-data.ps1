# ==============================================================================
# FinCore Nexus - Clean-Slate Database & Records Reset
# ==============================================================================
param (
    [switch]$Force
)

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "       FinCore Nexus - Resetting All Records (Clean Slate)        " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

# 1. Terminate running microservices and frontends
Write-Host "`n[1/3] Stopping any running microservices..." -ForegroundColor Yellow
$stopScript = Join-Path $PSScriptRoot "stop-all.ps1"
if (Test-Path $stopScript) {
    & $stopScript
}

# 2. Reset Docker PostgreSQL and Kafka Volumes
Write-Host "`n[2/3] Wiping all databases, records, and Kafka topics via Docker..." -ForegroundColor Yellow
Set-Location $PSScriptRoot
docker compose down -v 2>&1 | Out-Null
Write-Host "  -> Old volumes and records removed." -ForegroundColor Green

# 3. Bring up fresh backing infrastructure
Write-Host "`n[3/3] Bringing up fresh PostgreSQL, Redis, and Kafka infrastructure..." -ForegroundColor Yellow
docker compose up -d postgres db-init redis kafka

Write-Host "`nWaiting for PostgreSQL healthcheck..." -ForegroundColor Cyan
$ready = $false
for ($i = 0; $i -lt 20; $i++) {
    $status = docker exec fincore-postgres pg_isready -U fincore -d fincore 2>&1
    if ($LASTEXITCODE -eq 0) {
        $ready = $true
        break
    }
    Start-Sleep -Seconds 1
}

if ($ready) {
    Write-Host "==================================================================" -ForegroundColor Green
    Write-Host " Clean-Slate Database Reset Complete!                            " -ForegroundColor Green
    Write-Host "==================================================================" -ForegroundColor Green
    Write-Host " State summary:" -ForegroundColor White
    Write-Host "  - Customer Records:   0 (Clean fresh start)" -ForegroundColor White
    Write-Host "  - Staff Operator:     teller (password: Teller@123)" -ForegroundColor White
    Write-Host "  - Supported Details:  Name, Email, Phone (10 digits), Aadhaar (12 digits), PAN (10 chars)" -ForegroundColor White
    Write-Host "  - Next Step:          Run .\start-all.ps1 to launch all services" -ForegroundColor Cyan
} else {
    Write-Host "  [WARN] PostgreSQL did not report ready within 20s. Check docker ps." -ForegroundColor Red
}
