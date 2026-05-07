
$content = Get-Content "C:\Users\user\Desktop\NuurHome\crm\src\app\mahsulotlar\page.js" -Raw
$clean = [regex]::Replace($content, "(?s)``.*?``", "")
$open = ([regex]::Matches($clean, "<div")).Count
$close = ([regex]::Matches($clean, "</div>")).Count
Write-Host "JSX OpenDiv: $open"
Write-Host "JSX CloseDiv: $close"
