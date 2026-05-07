
$lines = Get-Content "C:\Users\user\Desktop\NuurHome\crm\src\app\mahsulotlar\page.js"
$newLines = @()
for ($i=0; $i -lt $lines.Length; $i++) {
    if ($i -eq 2666) { # Line 2667
        continue
    }
    $newLines += $lines[$i]
}
$newLines | Set-Content "C:\Users\user\Desktop\NuurHome\crm\src\app\mahsulotlar\page.js" -Encoding UTF8
