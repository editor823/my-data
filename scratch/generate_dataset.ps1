# boutique_all_periods.json 데이터를 js/viral_shorts_data.js 로 변환하는 스크립트 (UTF-8 인코딩 안전)

$jsonPath = "scratch/boutique_all_periods.json"
$targetJs = "js/viral_shorts_data.js"

$raw = Get-Content $jsonPath -Raw -Encoding utf8 | ConvertFrom-Json

function Convert-VideoList($list, $periodName) {
    $items = @()
    $rank = 1
    foreach ($v in $list) {
        $type = if ($v.isShorts) { 'shorts' } else { 'video' }
        $titleEsc = $v.title.Replace('\', '\\').Replace("'", "\'")
        $channelEsc = $v.channel.Trim().Replace('\', '\\').Replace("'", "\'")
        $timeAgoEsc = $v.published.Replace('\', '\\').Replace("'", "\'")
        $viewsEsc = $v.views.Replace('\', '\\').Replace("'", "\'")
        $thumbEsc = $v.thumbnail.Replace('\', '\\').Replace("'", "\'")
        $urlEsc = $v.url.Replace('\', '\\').Replace("'", "\'")

        # viewsNum 숫자 파싱
        $vNum = 0
        if ($v.views -match '([0-9,]+)') {
            $numStr = $matches[1].Replace(',', '')
            [int64]::TryParse($numStr, [ref]$vNum) | Out-Null
        }

        $itemStr = @"
  {
    rank: $rank,
    id: '$($v.id)',
    type: '$type',
    title: '$titleEsc',
    channel: '$channelEsc',
    timeAgo: '$timeAgoEsc',
    views: '$viewsEsc',
    viewsNum: $vNum,
    videoUrl: '$urlEsc',
    thumb: '$thumbEsc',
    tags: ['전체'],
    period: '$periodName'
  }
"@
        $items += $itemStr
        $rank++
    }
    return $items -join ",`n"
}

$todayJs = Convert-VideoList $raw.today "today"
$weekJs = Convert-VideoList $raw.week "week"
$monthJs = Convert-VideoList $raw.month "month"

$fullJs = @"
/**
 * 8번 바이럴숏폼 (유튜브 실시간 바이럴 & 숏폼) 데이터셋
 * boutique-info 원본 실시간 API 데이터 1:1 완벽 일치 (각 50개)
 * 실제 유튜브 영상 직링크 (url: https://www.youtube.com/shorts/... 또는 watch?v=...)
 */

// 1. [당일 (오늘 24H)] 실시간 인기 & 화제 영상 50개
window.VIRAL_SHORTS_TODAY = [
$todayJs
];

// 2. [최근 일주일 (7일)] 실시간 인기 & 화제 영상 50개
window.VIRAL_SHORTS_WEEK = [
$weekJs
];

// 3. [30일 (1개월)] 실시간 인기 & 화제 영상 50개
window.VIRAL_SHORTS_MONTH = [
$monthJs
];

// 기간별 맵핑 객체
window.VIRAL_SHORTS_BY_PERIOD = {
  today: window.VIRAL_SHORTS_TODAY,
  week: window.VIRAL_SHORTS_WEEK,
  month: window.VIRAL_SHORTS_MONTH
};

// 기본 호환성 데이터셋 (당일 / 일주일)
window.VIRAL_SHORTS_50 = window.VIRAL_SHORTS_TODAY;
"@

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($targetJs, $fullJs, $utf8NoBom)
Write-Host "Successfully generated UTF-8 clean $targetJs"
