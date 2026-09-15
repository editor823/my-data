$lines = [System.IO.File]::ReadAllLines('css/components.css')
$newLines = [System.Collections.Generic.List[string]]::new()
for ($idx = 0; $idx -lt $lines.Length; $idx++) {
    # 3367 line to 3386 line is the duplicate .stock-sub-tab
    if ($idx -ge 3367 -and $idx -le 3386) {
        continue
    }
    $newLines.Add($lines[$idx])
}
[System.IO.File]::WriteAllLines('css/components.css', $newLines)
Write-Output "Cleaned components.css: Line count is $($newLines.Count)"
