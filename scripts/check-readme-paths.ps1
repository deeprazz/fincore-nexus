<#
.SYNOPSIS
    Validate that all file and directory paths referenced in README.md exist on disk.
.DESCRIPTION
    Extracts backticked repository paths from README.md, validates each path against Test-Path,
    and returns a non-zero exit code if any broken or missing path is detected.
#>

param(
    [string]$ReadmePath = "$PSScriptRoot/../README.md"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $ReadmePath)) {
    Write-Error "README file not found at: $ReadmePath"
    exit 1
}

$readmeContent = Get-Content -Raw -Path $ReadmePath

# Character 96 is backtick `
$tick = [char]96
$regex = "(?<=$tick)[^$tick\r\n]+(?=$tick)"
$matches = [regex]::Matches($readmeContent, $regex)

$missingPaths = @()
$checkedPaths = [System.Collections.Generic.HashSet[string]]::new()

$repoRoot = (Resolve-Path "$PSScriptRoot/..").Path

Write-Host "Verifying documentation path traceability in README.md..." -ForegroundColor Cyan
Write-Host "Found $($matches.Count) total inline code tokens." -ForegroundColor Cyan

foreach ($m in $matches) {
    $token = $m.Value.Trim()

    # Skip non-path tokens
    if ($token -match '^https?://' -or
        $token -match '\s' -or
        $token -match '[\$\<\>\*\?\"\|\:]' -or
        $token -match '^(npm|mvn|git|docker|powershell|curl|java|helm|kubectl|SET|export)' -or
        $token -match '^(ROLE_|GET|POST|PUT|PATCH|DELETE)' -or
        $token -match '^[0-9]+(\.[0-9]+)?(\s*(ms|s|%|req/sec|TPS|DPD|kB))?$' -or
        $token -match '^(true|false|null|default|keycloak|basic|test)$' -or
        $token -match '^[A-Z_]{3,}$' -or
        $token -match '^\-') {
        continue
    }

    # Identify tokens that represent file or directory paths
    $isPath = $false
    if ($token -match '^(services|frontend|infra|loadtest|docs|scripts)[\\/]' -or
        $token -match '^\.[\\/]' -or
        $token -match '\.(java|jsx|js|sql|json|yml|yaml|ps1|md|sh)$') {
        $isPath = $true
    }

    if ($isPath) {
        # Normalize relative path
        $cleaned = $token -replace '^\.[\\/]', ''
        $cleaned = $cleaned -replace '/', '\'

        if ($checkedPaths.Add($cleaned)) {
            # If path contains '...', it's an abbreviated path - search for basename in repo
            if ($cleaned -match '\.\.\.') {
                $baseName = Split-Path $cleaned -Leaf
                $found = Get-ChildItem -Path $repoRoot -Recurse -Filter $baseName -ErrorAction SilentlyContinue | Select-Object -First 1
                if ($null -eq $found) {
                    $missingPaths += $token
                    Write-Host " [MISSING] $token (searched leaf '$baseName')" -ForegroundColor Red
                } else {
                    Write-Host " [OK]      $token -> $($found.FullName.Replace($repoRoot, ''))" -ForegroundColor Green
                }
            } else {
                $fullPath = Join-Path $repoRoot $cleaned
                if (-not (Test-Path $fullPath)) {
                    # Also try finding leaf if bare filename was given
                    $baseName = Split-Path $cleaned -Leaf
                    $found = Get-ChildItem -Path $repoRoot -Recurse -Filter $baseName -ErrorAction SilentlyContinue | Select-Object -First 1
                    if ($null -eq $found) {
                        $missingPaths += $token
                        Write-Host " [MISSING] $token" -ForegroundColor Red
                    } else {
                        Write-Host " [OK]      $token (found at $($found.FullName.Replace($repoRoot, '')))" -ForegroundColor Green
                    }
                } else {
                    Write-Host " [OK]      $token" -ForegroundColor Green
                }
            }
        }
    }
}

Write-Host "`n========================================================"
Write-Host " Checked $($checkedPaths.Count) unique repository paths."
if ($missingPaths.Count -gt 0) {
    Write-Host " FAILED: $($missingPaths.Count) referenced path(s) do not exist on disk:" -ForegroundColor Red
    $missingPaths | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
    exit 1
} else {
    Write-Host " SUCCESS: All referenced paths verified successfully." -ForegroundColor Green
    exit 0
}
