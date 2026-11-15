# ==============================================================================
# FinCore Nexus - Start All Microservices & Infrastructure
# ==============================================================================
param (
    [switch]$NoFrontend,
    [switch]$NoGateway,
    [switch]$Help
)

if ($Help) {
    Write-Host @"
FinCore Nexus Multi-Service Launcher
Usage:
  .\start-all.ps1               # Starts infra, all 5 microservices, API Gateway, and Frontend
  .\start-all.ps1 -NoFrontend   # Starts infra and all backend microservices only
  .\start-all.ps1 -NoGateway    # Starts microservices without API Gateway
"@
    exit 0
}

$RootDir = $PSScriptRoot
$JavaHome = "C:\Program Files\Eclipse Adoptium\jdk-25.0.5.8-hotspot"
if (Test-Path $JavaHome) {
    $env:JAVA_HOME = $JavaHome
}

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "          FinCore Nexus - Starting All Microservices              " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

# ------------------------------------------------------------------------------
# 1. Start Infrastructure via Docker (PostgreSQL, Redis, Kafka)
# ------------------------------------------------------------------------------
Write-Host "`n[1/3] Checking Docker Infrastructure (Postgres, Redis, Kafka)..." -ForegroundColor Yellow
$dockerRunning = $false
try {
    $null = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        $dockerRunning = $true
    }
} catch {
    $dockerRunning = $false
}

if ($dockerRunning) {
    $runningNames = docker ps --format "{{.Names}}" 2>&1
    $allNames = docker ps -a --format "{{.Names}}" 2>&1
    $requiredContainers = @("fincore-postgres", "fincore-redis", "fincore-kafka")
    
    $missingFromRunning = @()
    foreach ($name in $requiredContainers) {
        if ($runningNames -notcontains $name) {
            $missingFromRunning += $name
        }
    }

    if ($missingFromRunning.Count -eq 0) {
        Write-Host "  -> [OK] Postgres, Redis, and Kafka containers are already running and healthy." -ForegroundColor Green
    } else {
        # Check if existing containers are merely stopped
        $toStart = @()
        $toCreate = @()
        foreach ($name in $missingFromRunning) {
            if ($allNames -contains $name) {
                $toStart += $name
            } else {
                $toCreate += $name
            }
        }

        if ($toStart.Count -gt 0) {
            Write-Host "  -> Starting existing containers: $($toStart -join ', ')..." -ForegroundColor Cyan
            docker start $toStart | Out-Null
        }

        if ($toCreate.Count -gt 0) {
            Write-Host "  -> Creating missing backing services via docker compose..." -ForegroundColor Cyan
            docker compose up -d postgres db-init redis kafka
        }
    }
} else {
    Write-Host "  -> [NOTICE] Docker is not running or not accessible in current context." -ForegroundColor DarkYellow
    Write-Host "     If Postgres/Redis/Kafka are running locally or in background, services will connect." -ForegroundColor Gray
}

# ------------------------------------------------------------------------------
# Helper: Check if a TCP port is in use
# ------------------------------------------------------------------------------
function Test-PortInUse([int]$Port) {
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    return ($null -ne $conn)
}

# ------------------------------------------------------------------------------
# 2. Launch Backend Spring Boot Microservices
# ------------------------------------------------------------------------------
Write-Host "`n[2/3] Launching Backend Spring Boot Microservices..." -ForegroundColor Yellow

$services = @(
    @{ Name = "Core Banking Service";   Dir = "services\core-banking-services"; Port = 8081 },
    @{ Name = "Loan Management";        Dir = "services\loan-service";          Port = 8082 },
    @{ Name = "Payment Orchestration";  Dir = "services\payment-service";       Port = 8083 },
    @{ Name = "KYC & Compliance";       Dir = "services\kyc-service";           Port = 8084 },
    @{ Name = "Notification Service";   Dir = "services\notification-service";  Port = 8085 }
)

if (-not $NoGateway) {
    $services += @{ Name = "API Gateway"; Dir = "services\api-gateway"; Port = 8080 }
}

foreach ($svc in $services) {
    $svcName = $svc.Name
    $svcPort = $svc.Port
    $svcPath = Join-Path $RootDir $svc.Dir

    if (Test-PortInUse -Port $svcPort) {
        Write-Host "  [SKIP] $svcName is ALREADY running on port $svcPort." -ForegroundColor DarkGray
        continue
    }

    Write-Host "  [START] Starting $svcName on port $svcPort..." -ForegroundColor Cyan

    $svcScript = @"
`$host.UI.RawUI.WindowTitle = 'FinCore [$svcPort] $svcName'
`$env:JAVA_HOME = '$JavaHome'
Set-Location '$svcPath'
Write-Host '==================================================================' -ForegroundColor Cyan
Write-Host ' [FinCore] Starting $svcName on Port $svcPort... ' -ForegroundColor Cyan
Write-Host '==================================================================' -ForegroundColor Cyan
mvn spring-boot:run
"@
    $bytes = [System.Text.Encoding]::Unicode.GetBytes($svcScript)
    $encoded = [System.Convert]::ToBase64String($bytes)
    Start-Process powershell -ArgumentList "-NoExit", "-EncodedCommand", $encoded
    Start-Sleep -Milliseconds 800
}

# ------------------------------------------------------------------------------
# 3. Launch Frontend (Vite)
# ------------------------------------------------------------------------------
if (-not $NoFrontend) {
    Write-Host "`n[3/3] Launching Frontend Development Server..." -ForegroundColor Yellow
    if (Test-PortInUse -Port 5173) {
        Write-Host "  [SKIP] Frontend is ALREADY running on port 5173." -ForegroundColor DarkGray
    } else {
        $frontendPath = Join-Path $RootDir "frontend"
        Write-Host "  [START] Starting React 19 Frontend on port 5173..." -ForegroundColor Cyan
        $frontendScript = @"
`$host.UI.RawUI.WindowTitle = 'FinCore [5173] React Frontend'
Set-Location '$frontendPath'
Write-Host '==================================================================' -ForegroundColor Cyan
Write-Host ' [FinCore] Starting React 19 Frontend on Port 5173... ' -ForegroundColor Cyan
Write-Host '==================================================================' -ForegroundColor Cyan
npm run dev
"@
        $bytes = [System.Text.Encoding]::Unicode.GetBytes($frontendScript)
        $encoded = [System.Convert]::ToBase64String($bytes)
        Start-Process powershell -ArgumentList "-NoExit", "-EncodedCommand", $encoded
    }
} else {
    Write-Host "`n[3/3] Skipping frontend (-NoFrontend passed)." -ForegroundColor Gray
}

Write-Host "`n==================================================================" -ForegroundColor Green
Write-Host " All services have been launched in dedicated terminal windows!   " -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Green
Write-Host " Services map:"
Write-Host "  - Frontend:             http://localhost:5173" -ForegroundColor White
Write-Host "  - API Gateway:          http://localhost:8080" -ForegroundColor White
Write-Host "  - Core Banking:         http://localhost:8081" -ForegroundColor White
Write-Host "  - Loan Management:      http://localhost:8082" -ForegroundColor White
Write-Host "  - Payment Service:      http://localhost:8083" -ForegroundColor White
Write-Host "  - KYC Service:          http://localhost:8084" -ForegroundColor White
Write-Host "  - Notification Service: http://localhost:8085" -ForegroundColor White
Write-Host "`nTo stop all services at any time, run: .\stop-all.ps1" -ForegroundColor Yellow
