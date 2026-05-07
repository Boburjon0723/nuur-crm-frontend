
$content = Get-Content "C:\Users\user\Desktop\NuurHome\crm\src\app\mahsulotlar\page.js" -Raw
$open = ($content.ToCharArray() | Where-Object { $_ -eq '{' }).Count
$close = ($content.ToCharArray() | Where-Object { $_ -eq '}' }).Count
$openP = ($content.ToCharArray() | Where-Object { $_ -eq '(' }).Count
$closeP = ($content.ToCharArray() | Where-Object { $_ -eq ')' }).Count
Write-Host "OpenBrace: $open"
Write-Host "CloseBrace: $close"
Write-Host "OpenParen: $openP"
Write-Host "CloseParen: $closeP"
