Write-Host "Testing Canary Release (90% v1, 10% v2)..."

$results = @()
for ($i = 1; $i -le 100; $i++) {
    $response = curl.exe -s http://localhost:8080/ping
    $results += $response
    if ($i % 10 -eq 0) {
        Write-Host "Requests sent: $i"
    }
}

Write-Host ""
Write-Host "Canary test completed: 100 requests sent"
Write-Host "Sample responses:"
$results | Select-Object -First 5
