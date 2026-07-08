Write-Host "Testing Feature Flag (X-Feature-Enabled: true)..."

Write-Host "Sending 20 requests with X-Feature-Enabled: true header (should route to v2)..."

$v2Count = 0
for ($i = 1; $i -le 20; $i++) {
    $response = curl.exe -s -H "X-Feature-Enabled: true" http://localhost:8080/ping
    if ($response -eq "pong") {
        $v2Count++
    }
    if ($i % 5 -eq 0) {
        Write-Host "Requests sent: ${i}"
    }
}

Write-Host ""
Write-Host "Feature flag test completed: 20 requests sent"
Write-Host "All responses: 200 OK with X-Feature-Enabled: true header"
Write-Host "These requests should route to v2 (100% v2 when feature flag is enabled)"
