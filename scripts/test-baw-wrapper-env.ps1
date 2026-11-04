$WalletId = 'yuxi'
$Root = Split-Path $PSScriptRoot -Parent
$env:BINANCE_BAW_DIR = Join-Path $Root "baw-sessions\$WalletId"
$env:BINANCE_INSTANCE_ID = "ai-binance-$WalletId"
$importUri = [System.Uri]::new((Resolve-Path -LiteralPath (Join-Path $PSScriptRoot 'baw-disable-keytar.mjs')).Path).AbsoluteUri
$env:NODE_OPTIONS = "--import `"$importUri`""
node (Join-Path $PSScriptRoot 'test-baw-keytar-off.mjs')
