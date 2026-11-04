param(
  [Parameter(Mandatory = $true)][ValidateSet('yuxi', 'feng', 'huangrong')][string]$WalletId
)
$names = @{ yuxi = '与晞'; feng = '峰'; huangrong = '黄荣' }
Write-Host ">>> $($names[$WalletId]) signin"
$signin = & "$PSScriptRoot\baw-$WalletId.ps1" auth signin --json | ConvertFrom-Json
if ($signin.data.status -eq 'ALREADY_CONNECTED') {
  Write-Host "已是 CONNECTED，跳过扫码"
  & "$PSScriptRoot\baw-$WalletId.ps1" --json wallet status
  exit 0
}
if (-not $signin.success) {
  $signin | ConvertTo-Json -Depth 5
  exit 1
}
Write-Host "配对码: $($signin.data.pairingCode)"
Write-Host "链接: $($signin.data.urlForWeb)"
Write-Host "请在 App 确认…"
$verify = & "$PSScriptRoot\baw-$WalletId.ps1" auth verify --qrCodeId $signin.data.qrCodeId --json | ConvertFrom-Json
$verify | ConvertTo-Json -Depth 5
if ($verify.data.status -ne 'SUCCESS') { exit 1 }
Write-Host "verify OK，当前地址："
& "$PSScriptRoot\baw-$WalletId.ps1" --json wallet address
