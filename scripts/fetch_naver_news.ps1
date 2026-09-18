$clientId = 'u8xuqbb564'
$clientSecret = 'z4Ijlccm7b1SRXfuY2RpEfBcyOAwX1fyw10RRA6C'

$keywords = @(
    @{ stock = '와이제이링크'; query = '와이제이링크 스페이스X'; tag = '🔥 직납 팩트' },
    @{ stock = '에이치브이엠'; query = '에이치브이엠 우주항공'; tag = '📑 수주 팩트' },
    @{ stock = '센서뷰'; query = '센서뷰 스페이스X'; tag = '🎯 직납 팩트' },
    @{ stock = '켄코아에어로스페이스'; query = '켄코아에어로스페이스 스페이스X'; tag = '⚡ 수주 팩트' },
    @{ stock = '스피어'; query = '스피어 우주항공'; tag = '🚀 우주항공 팩트' }
)

$headers = @{
    'X-Naver-Client-Id' = $clientId
    'X-Naver-Client-Secret' = $clientSecret
}

function Clean-HtmlText($text) {
    if (-not $text) { return "" }
    $clean = $text -replace '<[^>]+>', ''
    $clean = $clean -replace '&quot;', '"'
    $clean = $clean -replace '&apos;', "'"
    $clean = $clean -replace '&amp;', '&'
    $clean = $clean -replace '&lt;', '<'
    $clean = $clean -replace '&gt;', '>'
    $clean = $clean -replace '&#39;', "'"
    return $clean.Trim()
}

$results = @()
$counter = 1

foreach ($kw in $keywords) {
    $enc = [System.Uri]::EscapeDataString($kw.query)
    $url = "https://openapi.naver.com/v1/search/news.json?query=$enc&display=10&sort=sim"
    
    try {
        $res = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
        if ($res -and $res.items) {
            Write-Host "검색 성공: $($kw.query), 기사 수: $($res.items.Count)"
            foreach ($item in $res.items) {
                # 네이버 뉴스 직결 링크(n.news.naver.com) 우선, 없으면 link, 그것도 없으면 originallink
                $link = $item.link
                if ($item.link -match 'naver\.com') {
                    $link = $item.link
                } elseif ($item.originallink) {
                    # 만약 link에 naver.com이 없고 originallink가 유효하다면 link를 우선 확인
                    $link = $item.link
                }

                $title = Clean-HtmlText $item.title
                $desc = Clean-HtmlText $item.description
                
                # 날짜 포맷 (pubDate: Mon, 15 Sep 2025 14:00:00 +0900 -> YYYY-MM-DD)
                $dateStr = ""
                try {
                    $parsedDate = [DateTime]::Parse($item.pubDate)
                    $dateStr = $parsedDate.ToString("yyyy-MM-dd")
                } catch {
                    $dateStr = (Get-Date).ToString("yyyy-MM-dd")
                }

                # 언론사 추출 (title 뒷부분에 [XX일보] 형태가 있거나 기본 출처)
                $source = "네이버뉴스"
                if ($title -match '\[(.*?)\]$') {
                    $source = $matches[1]
                }

                $idStr = ("tl_space_{0:D3}" -f $counter)
                $counter++

                $entry = [ordered]@{
                    id = $idStr
                    date = $dateStr
                    source = $source
                    type = "news"
                    stockName = $kw.stock
                    tag = $kw.tag
                    title = $title
                    desc = $desc
                    link = $link
                    news_url = $link
                }
                $results += $entry
            }
        }
    } catch {
        Write-Host "오류 발생: $($kw.query) - $($_.Exception.Message)"
    }
}

Write-Host "총 수집된 기사 수: $($results.Count)"
$results | ConvertTo-Json -Depth 5 | Out-File -FilePath "c:\Users\edite\Desktop\my-data\scripts\sample_naver_news.json" -Encoding utf8
