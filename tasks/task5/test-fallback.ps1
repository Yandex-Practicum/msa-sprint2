Write-Host "Testing Fallback Route..."

for ($i = 1; $i -le 10; $i++) {
    Write-Host "Request ${i}:"
    $response = curl.exe -s http://localhost:8080/ping -w "`nStatus: %{http_code}`n"
    Write-Host $response
    Write-Host ""
}

Write-Host "Fallback test completed: 10 requests sent"
