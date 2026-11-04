# 一次发起三个 signin（各钱包 App 扫各码，再分别 verify）
$wallets = @('yuxi', 'feng', 'huangrong')
$names = @{ yuxi = '与晞'; feng = '峰'; huangrong = '黄荣' }
Write-Host "修复 keytar 后需各钱包重新扫码一次。下面 3 组码请在 5 分钟内完成。"
Write-Host ""
foreach ($id in $wallets) {
  Write-Host "======== $($names[$id]) ($id) ========"
  & "$PSScriptRoot\baw-$id.ps1" auth signin --json
  Write-Host ""
}
Write-Host "扫码后分别执行（qrCodeId 换成上面对应 JSON 里的值）："
foreach ($id in $wallets) {
  Write-Host "  .\scripts\baw-$id.ps1 auth verify --qrCodeId <id> --json"
}
