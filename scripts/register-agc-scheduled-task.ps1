# 注册 Windows 计划任务：每 30 分钟跑一轮 AGC 领取+卖出
# 用法（管理员可选）：powershell -ExecutionPolicy Bypass -File .\scripts\register-agc-scheduled-task.ps1
$TaskName = 'AGC-ClaimSell-YuxiFeng'
$Script = Join-Path $PSScriptRoot 'run-agc-claim-sell.ps1'
$Action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$Script`""
$Trigger = New-ScheduledTaskTrigger -Daily -At '00:05'
$Trigger.Repetition = $(New-ScheduledTaskTrigger -Once -At '00:05' -RepetitionInterval (New-TimeSpan -Minutes 30) -RepetitionDuration (New-TimeSpan -Days 3650)).Repetition
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description 'AGC claimFree/claimReward/withdrawLP + sell AGC (yuxi,feng)' -Force
Write-Host "已注册计划任务: $TaskName（每 30 分钟）"
Write-Host "日志: $PSScriptRoot\..\logs\agc-claim-sell-*.log"
Write-Host "前提: 两个钱包 baw 已 signin + auth verify，开发者模式已开；App 可能需确认每笔交易。"
