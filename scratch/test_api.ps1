try {
  $url = "https://moneyt-api.ramenarchive.com/v1/kc-8f31a7d4e26b49c0?action=searchViralShorts&keyword=&period=week&sort=views&shorts=true"
  $resp = Invoke-RestMethod -Uri $url -TimeoutSec 15
  Write-Host "Success! Count:" $resp.videos.Count
  $resp.videos | Select-Object -First 3 | ConvertTo-Json -Depth 3 | Out-File -FilePath "scratch/api_result.json" -Encoding utf8
  Write-Host "Written to scratch/api_result.json"
} catch {
  Write-Host "API Error:" $_
}
