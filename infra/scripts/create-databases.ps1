# Create all FinCore Nexus databases
# Run with: BypassSandbox: true (requires Docker access)

$databases = @("fincore_loan", "fincore_payment", "fincore_kyc", "fincore_notification")

foreach ($db in $databases) {
    Write-Host "Creating database: $db"
    docker exec fincore-postgres psql -U fincore -c "CREATE DATABASE $db;"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK: $db created"
    } else {
        Write-Host "  WARN: $db may already exist or failed"
    }
}

Write-Host "Done."
