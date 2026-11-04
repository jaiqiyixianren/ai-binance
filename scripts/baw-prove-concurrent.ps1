# 验收：三钱包是否同时 CONNECTED，并打印 BSC 地址
$ids = @('yuxi', 'feng', 'huangrong')
$names = @{ yuxi = '与晞'; feng = '峰'; huangrong = '黄荣' }
$ok = 0
foreach ($id in $ids) {
  Write-Host "=== $($names[$id]) ==="
  $st = & "$PSScriptRoot\baw-$id.ps1" --json wallet status | ConvertFrom-Json
  $st | ConvertTo-Json -Depth 4
  if ($st.success -and $st.data.status -eq 'CONNECTED') {
    $ok++
    & "$PSScriptRoot\baw-$id.ps1" --json wallet address
  }
  Write-Host ''
}
Write-Host "同时在线: $ok / 3"
if ($ok -lt 3) { exit 1 }
