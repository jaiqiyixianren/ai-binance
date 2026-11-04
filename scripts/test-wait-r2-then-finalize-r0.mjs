/**
 * 等到测试 Mint 进入第 2 轮（index 1）窗口后，对第 1 轮调用 finalizeRound(0)。
 * 用法: node test-wait-r2-then-finalize-r0.mjs
 */
import { JsonRpcProvider, Contract } from 'ethers'
import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const dep = JSON.parse(fs.readFileSync(path.join(root, 'deployments-bsc-test.json'), 'utf8'))
const MINT = dep.mint
const RPC = process.env.BSC_RPC || 'https://bsc-dataseed.binance.org'

const ABI = [
  'function mintingRound() view returns (uint256, bool)',
  'function roundFinalized(uint256) view returns (bool)',
]

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  const provider = new JsonRpcProvider(RPC, 56)
  const mint = new Contract(MINT, ABI, provider)

  console.log('Waiting until round index >= 1 (2nd round window) or round 0 finalized path...')
  for (let i = 0; i < 120; i++) {
    const [r, inWindow] = await mint.mintingRound()
    const ri = Number(r)
    const fin0 = await mint.roundFinalized(0)
    console.log(new Date().toISOString(), 'mintingRound', ri, inWindow, 'round0Finalized', fin0)

    if (fin0) {
      console.log('Round 0 already finalized.')
      return
    }

    if (ri >= 1 && inWindow) {
      console.log('Round 2 (index 1) is live — finalizing round 0...')
      const r = spawnSync('node', [path.join(__dirname, 'test-finalize-round.mjs'), '0'], {
        stdio: 'inherit',
        env: process.env,
      })
      process.exit(r.status ?? 1)
    }

    await sleep(15_000)
  }
  throw new Error('Timeout waiting for round 2')
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
