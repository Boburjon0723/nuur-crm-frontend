
$content = Get-Content "C:\Users\user\Desktop\NuurHome\crm\src\app\mahsulotlar\page.js" -Raw
$p = 0
$b = 0
for ($i=0; $i -lt $content.Length; $i++) {
    $c = $content[$i]
    if ($c -eq '(') { $p++ }
    elseif ($c -eq ')') { $p-- }
    elseif ($c -eq '{') { $b++ }
    elseif ($c -eq '}') { $b-- }
    
    if ($p -lt 0) { Write-Host "Negative Paren at index $i"; break }
    if ($b -lt 0) { Write-Host "Negative Brace at index $i"; break }
}
Write-Host "Paren Balance: $p"
Write-Host "Brace Balance: $b"
