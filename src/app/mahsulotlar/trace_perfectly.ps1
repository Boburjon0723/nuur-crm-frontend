
$content = Get-Content "C:\Users\user\Desktop\NuurHome\crm\src\app\mahsulotlar\page.js" -Raw
$inBacktick = $false
$stack = @()
$lines = $content -split "`r?`n"

for ($i=0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    $lineNum = $i + 1
    
    # Handle backticks
    $chars = $line.ToCharArray()
    for ($j=0; $j -lt $chars.Count; $j++) {
        if ($chars[$j] -eq '`') {
            $inBacktick = -not $inBacktick
        }
        
        if (-not $inBacktick) {
            # Try to match <div at this position
            if ($line.Substring($j).StartsWith("<div")) {
                $stack += @{ Line = $lineNum; Col = $j + 1 }
            }
            elseif ($line.Substring($j).StartsWith("</div>")) {
                if ($stack.Count -gt 0) {
                    $stack = $stack[0..($stack.Count - 2)]
                } else {
                    Write-Host "Unexpected </div> at line $lineNum col $($j+1)"
                }
            }
        }
    }
}

foreach ($s in $stack) {
    Write-Host "Unclosed <div from line $($s.Line) col $($s.Col)"
}
