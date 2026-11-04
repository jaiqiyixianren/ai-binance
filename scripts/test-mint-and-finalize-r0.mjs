/**
 * 测试流：与晞 mint 一笔 → 等到第 2 轮开窗 → finalizeRound(0)
 * 前置：node baw-yuxi-verify.mjs（已 CONNECTED）
 */
import { spawnSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.BPKM_USE_TEST = '1'

console.log('=== 1/2 mint (与晞 baw) ===')
let r = spawnSync(process.execPath, [path.join(__dirname, 'bpkm-mint-yuxi.mjs')], {
  stdio: 'inherit',
  env: process.env,
})
if (r.status !== 0) process.exit(r.status ?? 1)

console.log('\n=== 2/2 wait round 2 → finalizeRound(0) ===')
r = spawnSync(process.execPath, [path.join(__dirname, 'test-wait-r2-then-finalize-r0.mjs')], {
  stdio: 'inherit',
  env: process.env,
})
process.exit(r.status ?? 0)
