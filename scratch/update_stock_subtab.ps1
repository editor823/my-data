$lines = [System.IO.File]::ReadAllLines('css/components.css')
for ($idx = 0; $idx -lt $lines.Length; $idx++) {
    if ($lines[$idx].Trim() -eq '.stock-sub-tab {') {
        # find the closing bracket
        for ($j = $idx + 1; $j -lt $idx + 20; $j++) {
            if ($lines[$j].Trim() -eq 'padding: 12px 16px;') {
                $lines[$j] = '  padding: 12px 18px;'
            }
            if ($lines[$j].Trim() -eq 'transition: all 0.2s ease;') {
                $lines[$j] = "  white-space: nowrap;`r`n  flex-shrink: 0;`r`n  word-break: keep-all;`r`n  transition: all 0.2s ease;"
                break
            }
        }
        break
    }
}
[System.IO.File]::WriteAllLines('css/components.css', $lines)
Write-Output "Successfully updated .stock-sub-tab"
