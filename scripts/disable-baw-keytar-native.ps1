# 禁用 keytar 原生模块 → baw 与 Linux 一样只用 BINANCE_BAW_DIR/session.json（可多钱包）
$KeytarRoot = Join-Path $PSScriptRoot '..\node_modules\@github\keytar'
Get-ChildItem -Path $KeytarRoot -Recurse -Filter 'keytar.node' | ForEach-Object {
  $bak = $_.FullName + '.disabled'
  if (-not (Test-Path $bak)) {
    Rename-Item -LiteralPath $_.FullName -NewName ($_.Name + '.disabled')
    Write-Host "disabled $($_.FullName)"
  }
}
Write-Host 'keytar native disabled. Re-login each wallet via baw-*.ps1 once.'
