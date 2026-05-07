
$content = Get-Content "C:\Users\user\Desktop\NuurHome\crm\src\app\mahsulotlar\page.js" -Raw
$sub = $content.Substring(0, $content.IndexOf("<div className=`"p-8`">", 0))
$stack = @()
$inBacktick = $false
$matches = [regex]::Matches($sub, "<div|</div>|``")
foreach ($m in $matches) {
    if ($m.Value -eq "``") { $inBacktick = -not $inBacktick; continue }
    if ($inBacktick) { continue }
    if ($m.Value -eq "<div") { $stack += $m.Index }
    else { if ($stack.Count -gt 0) { $stack = $stack[0..($stack.Count - 2)] } }
}
foreach ($s in $stack) {
    $line = ($sub.Substring(0, $s).ToCharArray() | Where-Object { $_ -eq "`n" }).Count + 1
    Write-Host "Unclosed <div before 1439 at line $line"
}
