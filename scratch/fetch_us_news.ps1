[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$news = Invoke-RestMethod -Uri 'https://m.stock.naver.com/api/news/list?category=mainnews&page=1&pageSize=40'
foreach ($n in $news) {
    if ($n.tit -match '미국|뉴욕|나스닥|S&P|반도체|연준|FOMC|유가|금리') {
        Write-Output "$($n.tit) | $($n.ohnm) | $($n.dt)"
    }
}
