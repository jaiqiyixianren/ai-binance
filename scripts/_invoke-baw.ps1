param(
  [Parameter(Mandatory = $true)][string]$WalletId,
  [Parameter(ValueFromRemainingArguments = $true)][string[]]$BawArgs
)
$Root = Split-Path $PSScriptRoot -Parent
$env:BINANCE_BAW_DIR = Join-Path $Root "baw-sessions\$WalletId"
# 固定 per 钱包，勿改（改后旧 session.json 解不开）
$env:BINANCE_INSTANCE_ID = "ai-binance-$WalletId"
$importPath = Join-Path $PSScriptRoot 'baw-disable-keytar.mjs'
$importUri = [System.Uri]::new((Resolve-Path -LiteralPath $importPath).Path).AbsoluteUri
$flag = "--import `"$importUri`""
if ($env:NODE_OPTIONS) {
  if ($env:NODE_OPTIONS -notlike "*baw-disable-keytar*") {
    $env:NODE_OPTIONS = "$flag $($env:NODE_OPTIONS)"
  }
} else {
  $env:NODE_OPTIONS = $flag
}
# 直接 node + loader，避免 baw.cmd 未带上 NODE_OPTIONS
$bawEntry = Join-Path $Root 'node_modules\@binance\agentic-wallet\dist\index.js'
& node $bawEntry @BawArgs
exit $LASTEXITCODE
