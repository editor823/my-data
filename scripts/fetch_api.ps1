[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
$clientId = 'u8xuqbb564'
$clientSecret = 'z4Ijlccm7b1SRXfuY2RpEfBcyOAwX1fyw10RRA6C'
$headers = @{
    'X-Naver-Client-Id' = $clientId
    'X-Naver-Client-Secret' = $clientSecret
}

$keywords = @(
    @{ stock = '와이제이링크'; query = '와이제이링크 스페이스X'; tag = '🔥 직납 팩트' },
    @{ stock = '에이치브이엠'; query = '에이치브이엠 우주항공'; tag = '📑 수주 팩트' },
    @{ stock = '센서뷰'; query = '센서뷰 스페이스X'; tag = '🎯 직납 팩트' },
    @{ stock = '켄코아에어로스페이스'; query = '켄코아에어로스페이스 스페이스X'; tag = '⚡ 수주 팩트' },
    @{ stock = '스피어'; query = '스피어 우주항공'; tag = '🚀 우주항공 팩트' }
)

function Clean-Text($str) {
    if (-not $str) { return '' }
    $s = [System.Text.RegularExpressions.Regex]::Replace($str, '<[^>]+>', '')
    $s = [System.Net.WebUtility]::HtmlDecode($s)
    return $s.Trim()
}

$allItems = @()
$counter = 1

foreach ($k in $keywords) {
    $q = [System.Uri]::EscapeDataString($k.query)
    $url = 'https://openapi.naver.com/v1/search/news.json?query=' + $q + '&display=5&sort=sim'
    try {
        $resp = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
        if ($resp -and $resp.items) {
            Write-Host  Success for: count: 0 
            foreach ($it in $resp.items) {
                $targetLink = $it.link
                if (-not $targetLink -or $targetLink -eq '') {
                    $targetLink = $it.originallink
                }

                $title = Clean-Text $it.title
                $desc = Clean-Text $it.description
                $pubDateStr = (Get-Date).ToString('yyyy-MM-dd')
                try {
                    $d = [DateTime]::Parse($it.pubDate)
                    $pubDateStr = $d.ToString('yyyy-MM-dd')
                } catch {}

                $source = '네이버뉴스'
                $match = [System.Text.RegularExpressions.Regex]::Match($title, '\[(.*?)\]$')
                if ($match.Success) {
                    $source = $match.Groups[1].Value
                }

                $idStr = ('tl_space_{0:D3}' -f $counter)
                $counter++

                $itemObj = [ordered]@{
                    id = $idStr
                    date = $pubDateStr
                    source = $source
                    type = 'news'
                    stockName = $k.stock
                    tag = $k.tag
                    title = $title
                    desc = $desc
                    link = $targetLink
                    news_url = $targetLink
                }
                $allItems += $itemObj
            }
        }
    } catch {
        Write-Host "Error for $($k.query): $($_.Exception.Message)"
    }
}

$jsonOut = $allItems | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText('c:\Users\edite\Desktop\my-data\scripts\api_result.json', $jsonOut, [System.Text.Encoding]::UTF8)
Write-Host Completed! Total items: 0 