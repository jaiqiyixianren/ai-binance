# Owner 从 Mint 合约 withdrawUsdt 退 1 USDT 给用户（需 wallet-a 已登录 deployer 0x2548…）
param(
  [string]$Recipient = '0x44A02Dc00916c84b2473De22b9cA047a76B30C42',
  [string]$AmountWei = '1000000000000000000'
)

$Mint = '0x4a144D1A5Ca9C8e60A93C9836DD8740eB216FF5C'
$Owner = '0x2548d570741171aC475bf3a4f48Bf0f3BfA7f9C2'
$Data = '0xed09245100000000000000000000000044a02dc00916c84b2473de22b9ca047a76b30c420000000000000000000000000000000000000000000000000de0b6b3a7640000'

$preview = & "$PSScriptRoot\baw-a.ps1" contract-call preview `
  --binanceChainId 56 --from $Owner --to $Mint --value 0 --inputData $Data --gasLimit 300000 --json | ConvertFrom-Json

if (-not $preview.success) {
  $preview | ConvertTo-Json -Depth 6
  exit 1
}

$rid = $preview.data.requestId
Write-Host "Preview OK, requestId=$rid — confirm in Binance App if prompted"
& "$PSScriptRoot\baw-a.ps1" contract-call execute --requestId $rid --json
