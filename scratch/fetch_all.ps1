$periods = @('today', 'week', 'month')
$allData = @{}

foreach ($p in $periods) {
    Write-Host "Fetching period: $p"
    $url = "https://moneyt-api.ramenarchive.com/v1/kc-8f31a7d4e26b49c0?action=searchViralShorts&keyword=&period=$p&sort=views&shorts=true"
    $resp = Invoke-RestMethod -Uri $url -TimeoutSec 15
    $allData[$p] = $resp.videos
    Write-Host "Count for $p : $($resp.videos.Count)"
}

$allData | ConvertTo-Json -Depth 5 | Out-File -FilePath "scratch/boutique_all_periods.json" -Encoding utf8
Write-Host "Saved scratch/boutique_all_periods.json successfully!"
