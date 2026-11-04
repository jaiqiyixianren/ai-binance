import { spawnSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const dir = path.dirname(fileURLToPath(import.meta.url))

console.log('=== 黄荣 mint ===')
let r = spawnSync(process.execPath, [path.join(dir, 'bpkm-mint-wallet.mjs'), 'huangrong'], {
  stdio: 'inherit',
  env: process.env,
})
if (r.status !== 0) process.exit(r.status ?? 1)

console.log('\n=== 等第 2 轮 → finalizeRound(0) 加池 ===')
r = spawnSync(process.execPath, [path.join(dir, 'test-wait-r2-then-finalize-r0.mjs')], {
  stdio: 'inherit',
  env: process.env,
})
process.exit(r.status ?? 0)
