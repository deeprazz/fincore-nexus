# ==============================================================================
# FinCore Nexus - Stop All Microservices
# ==============================================================================
param (
    [switch]$KeepFrontend,
    [switch]$StopDocker,
    [switch]$Help
)

if ($Help) {
    Write-Host @"
FinCore Nexus Multi-Service Stopper
Usage:
  .\stop-all.ps1               # Stops all backend microservices and frontend
  .\stop-all.ps1 -KeepFrontend # Stops all backend microservices, keeps frontend running
  .\stop-all.ps1 -StopDocker   # Also runs 'docker compose down' for database/redis/kafka
"@
    exit 0
}

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "          FinCore Nexus - Stopping Services                       " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

$portsToStop = @(8080, 8081, 8082, 8083, 8084, 8085)
if (-not $KeepFrontend) {
    $portsToStop += 5173
}

$stoppedPids = @()

foreach ($port in $portsToStop) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            $procId = $conn.OwningProcess
            if ($procId -gt 0 -and $stoppedPids -notcontains $procId) {
                try {
                    $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
                    $procName = if ($proc) { $proc.ProcessName } else { "PID $procId" }
                    Write-Host "  [STOP] Port $port in use by $procName (PID $procId). Stopping..." -ForegroundColor Yellow
                    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                    $stoppedPids += $procId
                    Write-Host "  [OK] Terminated process on port $port." -ForegroundColor Green
                } catch {
                    Write-Host "  [WARN] Failed to terminate PID $procId on port ${port}: $($_.Exception.Message)" -ForegroundColor Red
                }
            }
        }
    } else {
        Write-Host "  [INFO] Port $port is already free." -ForegroundColor DarkGray
    }
}

if ($StopDocker) {
    Write-Host "`nStopping Docker infrastructure..." -ForegroundColor Yellow
    docker compose down
    Write-Host "  [OK] Docker containers stopped." -ForegroundColor Green
}

Write-Host "`nAll targeted FinCore services have been stopped." -ForegroundColor Green
