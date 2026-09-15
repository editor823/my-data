$lines = [System.IO.File]::ReadAllLines('css/components.css')
$cleanLines = [System.Collections.Generic.List[string]]::new()
for ($i = 0; $i -lt 4409; $i++) {
    $cleanLines.Add($lines[$i])
}
$snippet = [System.IO.File]::ReadAllLines('scratch/responsive_snippet.css')
$cleanLines.Add("")
foreach ($s in $snippet) {
    $cleanLines.Add($s)
}
[System.IO.File]::WriteAllLines('css/components.css', $cleanLines)
Write-Output "Overwritten css/components.css with clean responsive snippet. Total lines: $($cleanLines.Count)"
