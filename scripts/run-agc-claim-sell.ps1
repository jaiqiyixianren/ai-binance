# 每轮：与晞 + 峰 领取 AGC 奖励并卖出（见 agc-automation-config.json）
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
node .\agc-claim-sell.mjs
exit $LASTEXITCODE
