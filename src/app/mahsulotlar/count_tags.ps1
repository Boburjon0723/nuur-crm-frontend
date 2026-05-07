
$content = Get-Content "C:\Users\user\Desktop\NuurHome\crm\src\app\mahsulotlar\page.js" -Raw
$openDiv = ([regex]::Matches($content, "<div")).Count
$closeDiv = ([regex]::Matches($content, "</div>")).Count
Write-Host "OpenDiv: $openDiv"
Write-Host "CloseDiv: $closeDiv"
