param(
    [string]$Url = "http://localhost:8083/api/payments",
    [int]$TotalRequests = 50,
    [int]$Concurrency = 5
)

$headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("teller:Teller@123"))
    "Content-Type" = "application/json"
}

Write-Host "Running FinCore Nexus Payment Load Test ($TotalRequests requests, concurrency $Concurrency)..." -ForegroundColor Cyan
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

$successCount = 0
$failCount = 0
$latencies = [System.Collections.Generic.List[double]]::new()

for ($i = 0; $i -lt $TotalRequests; $i++) {
    $reqId = "bench-$i-" + [Guid]::NewGuid().ToString()
    $body = @{
        customerId = "a0000000-0000-0000-0000-000000000001"
        sourceAccountId = "b0000000-0000-0000-0000-000000000001"
        targetAccountNumber = "100000000099"
        targetIfsc = "FINC0001234"
        amount = 100.00
        paymentRail = "IMPS"
        idempotencyKey = $reqId
        purpose = "Load Test Transaction"
    } | ConvertTo-Json

    $reqWatch = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $res = Invoke-RestMethod -Uri $Url -Method Post -Body $body -Headers $headers -TimeoutSec 5
        $reqWatch.Stop()
        $latencies.Add($reqWatch.Elapsed.TotalMilliseconds)
        $successCount++
    } catch {
        $reqWatch.Stop()
        $latencies.Add($reqWatch.Elapsed.TotalMilliseconds)
        $failCount++
    }
}

$stopwatch.Stop()
$totalSec = $stopwatch.Elapsed.TotalSeconds
$tps = [Math]::Round(($TotalRequests / $totalSec), 2)
$sorted = $latencies | Sort-Object
$p50 = [Math]::Round($sorted[[Math]::Floor($sorted.Count * 0.50)], 2)
$p95 = [Math]::Round($sorted[[Math]::Floor($sorted.Count * 0.95)], 2)
$successRate = [Math]::Round(($successCount / $TotalRequests) * 100, 2)

Write-Host "================ LOAD TEST SUMMARY ================" -ForegroundColor Green
Write-Host "Total Requests:   $TotalRequests"
Write-Host "Successful:       $successCount"
Write-Host "Failed:           $failCount"
Write-Host "Success Rate:     $successRate %"
Write-Host "Total Time:       $([Math]::Round($totalSec, 2)) s"
Write-Host "Measured TPS:     $tps req/sec"
Write-Host "Latency p50:      $p50 ms"
Write-Host "Latency p95:      $p95 ms"
Write-Host "===================================================" -ForegroundColor Green
