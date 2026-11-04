# 三钱包状态（必须用各 baw-*.ps1，且已禁用 keytar 互踢）
$ids = @(
  @{ id = 'yuxi'; name = '与晞' },
  @{ id = 'feng'; name = '峰' },
  @{ id = 'huangrong'; name = '黄荣' }
)
foreach ($w in $ids) {
  Write-Host "=== $($w.name) ($($w.id)) ==="
  & "$PSScriptRoot\baw-$($w.id).ps1" --json wallet status
  Write-Host ''
}
