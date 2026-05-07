
$content = Get-Content "C:\Users\user\Desktop\NuurHome\crm\src\app\mahsulotlar\page.js" -Raw
$stack = @()
$inBacktick = $false

# Regex to find <div, </div>, and `
$matches = [regex]::Matches($content, "<div|</div>|``")

foreach ($m in $matches) {
    if ($m.Value -eq "``") {
        $inBacktick = -not $inBacktick
        continue
    }
    
    if ($inBacktick) { continue }
    
    if ($m.Value -eq "<div") {
        $stack += $m.Index
    } else {
        if ($stack.Count -eq 0) {
            Write-Host "Extra closing tag at index $($m.Index)"
        } else {
            $stack = $stack[0..($stack.Count - 2)]
        }
    }
}
foreach ($s in $stack) {
    $line = ($content.Substring(0, $s).ToCharArray() | Where-Object { $_ -eq "`n" }).Count + 1
    Write-Host "Unclosed <div at line $line"
}
