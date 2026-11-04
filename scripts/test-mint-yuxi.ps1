# 与晞 · 对 deployments-bsc-test.json 测试 Mint 打 0.0002 BNB
$env:BPKM_USE_TEST = '1'
Set-Location $PSScriptRoot
node bpkm-mint-yuxi.mjs @args
