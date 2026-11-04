# 恢复 keytar（恢复后 Windows 又变单会话）
$KeytarRoot = Join-Path $PSScriptRoot '..\node_modules\@github\keytar'
Get-ChildItem -Path $KeytarRoot -Recurse -Filter 'keytar.node.disabled' | ForEach-Object {
  $orig = $_.FullName -replace '\.disabled$',''
  Rename-Item -LiteralPath $_.FullName -NewName 'keytar.node'
  Write-Host "restored $orig"
}
