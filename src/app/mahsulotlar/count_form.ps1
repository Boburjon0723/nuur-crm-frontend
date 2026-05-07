
$content = Get-Content "C:\Users\user\Desktop\NuurHome\crm\src\app\mahsulotlar\page.js" -Raw
$openForm = ([regex]::Matches($content, "<form")).Count
$closeForm = ([regex]::Matches($content, "</form>")).Count
Write-Host "OpenForm: $openForm"
Write-Host "CloseForm: $closeForm"
