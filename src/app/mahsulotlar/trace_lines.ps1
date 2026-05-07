
$content = Get-Content "C:\Users\user\Desktop\NuurHome\crm\src\app\mahsulotlar\page.js" -Raw
$clean = [regex]::Replace($content, "(?s)``.*?``", "STRI")
$lines = $clean.Split("`n")
$stack = @()
for ($i=0; $i -lt $lines.Length; $i++) {
    $line = $lines[$i]
    $lineNum = $i + 1
    
    # Simple tag detection
    $tagMatches = [regex]::Matches($line, "<div|</div>")
    foreach($m in $tagMatches) {
        if ($m.Value -eq "<div") {
            $stack += @{ Line = $lineNum; Id = $stack.Count }
        } else {
            if ($stack.Count -gt 0) {
                $stack = $stack[0..($stack.Count - 2)]
            } else {
                Write-Host "Unexpected </div> at line $lineNum"
            }
        }
    }
}
foreach ($s in $stack) {
    Write-Host "Unclosed <div from line $($s.Line)"
}
