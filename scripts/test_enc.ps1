# UTF-8 with BOM can be read properly by PowerShell 5.1
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$clientId = "u8xuqbb564"
$clientSecret = "z4Ijlccm7b1SRXfuY2RpEfBcyOAwX1fyw10RRA6C"

$keywords = @(
    @{ stock = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("7JmA7J207KCc7J2066OB")); query = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("7JmA7J207KCc7J2066OBIOyKpO2OmOydtOyKpFg=")); tag = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("8J+UkCDsp4Hrganngb3tirg=")) },
    @{ stock = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("7JeQ7J207LmY6釉뚯씠7Jeg")); query = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("7JeQ7J207LmY6釉뚯씠7JegIOyqw7KOvO2VreqzvQ==")); tag = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("8J+TkSDsiJjso7wg7Yyp7Yq4")) },
    @{ stock = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("7IS87ISc67ew")); query = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("7IS87ISc67ewIOyKpO2OmOydtOyKpFg=")); tag = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("8J+OhCDsp4Hrganngb3tirg=")) },
    @{ stock = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("7LyE7L2U7JWE7JeQ7Ja066Gc7Iqk7Y6Y7J207Iqk")); query = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("7LyE7L2U7JWE7JeQ7Ja066Gc7Iqk7Y6Y7J207IqkIOyKpO2OmOydtOyKpFg=")); tag = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("4pqhIOyImOyjvCDtjpXtirg=")) },
    @{ stock = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("7Iqk7ZS87Ja0")); query = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("7Iqk7ZS87Ja0IOyqw7KOvO2VreqzvQ==")); tag = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("8J+agCDsn7Dso7ztlZ3qs7Ug7Yyp7Yq4")) }
)

Write-Host "Keywords initialized test:"
foreach ($k in $keywords) {
    Write-Host "$($k.stock) -> $($k.query)"
}
