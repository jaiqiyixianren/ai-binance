/**
 * 测试 Mint：在指定轮次结束后调用 finalizeRound(r)。
 * 用法: node test-finalize-round.mjs [roundIndex，默认 0]
 * 需 DEPLOYER_KEY_FILE 或 DEPLOYER_PRIVATE_KEY（任意 EOA 可调 finalizeRound）。
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Contract, JsonRpcProvider, Mnemonic, HDNodeWallet, Wallet, formatEther } from 'ethers'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const RPC = process.env.BSC_RPC || 'https://bsc-dataseed.binance.org'
const dep = JSON.parse(fs.readFileSync(path.join(root, 'deployments-bsc-test.json'), 'utf8'))
const MINT = dep.mint
const ROUND = Number(process.argv[2] ?? 0)

const ABI = [
  'function finalizeRound(uint256 r)',
  'function roundEnd(uint256 r) view returns (uint256)',
  'function roundFinalized(uint256) view returns (bool)',
  'function raisedBnb(uint256) view returns (uint256)',
  'function mintingRound() view returns (uint256, bool)',
  'function ROUND_DURATION() view returns (uint256)',
]

function loadWallet(provider) {
  let raw
  if (process.env.DEPLOYER_PRIVATE_KEY) raw = process.env.DEPLOYER_PRIVATE_KEY.trim()
  else if (process.env.DEPLOYER_KEY_FILE) raw = fs.readFileSync(process.env.DEPLOYER_KEY_FILE, 'utf8').trim()
  else {
    const fallback = path.join(process.env.USERPROFILE || '', 'Desktop', '新建 文本文档 (2).txt')
    raw = fs.readFileSync(fallback, 'utf8').trim()
  }
  const compact = raw.replace(/\s+/g, ' ').trim()
  const words = compact.split(' ').filter(Boolean)
  if (words.length >= 12 && words.length <= 24) {
    return HDNodeWallet.fromMnemonic(Mnemonic.fromPhrase(words.join(' ')), "m/44'/60'/0'/0/0").connect(
      provider,
    )
  }
  let k = compact.replace(/\s/g, '')
  if (!k.startsWith('0x')) k = '0x' + k
  return new Wallet(k, provider)
}

async function main() {
  const provider = new JsonRpcProvider(RPC, 56)
  const wallet = loadWallet(provider)
  const mint = new Contract(MINT, ABI, wallet)

  const end = Number(await mint.roundEnd(ROUND))
  const latest = await provider.getBlock('latest')
  const raised = await mint.raisedBnb(ROUND)
  const finalized = await mint.roundFinalized(ROUND)
  const mr = await mint.mintingRound()

  console.log('Mint (test)', MINT)
  console.log('Round', ROUND, 'raised', formatEther(raised), 'BNB', 'finalized', finalized)
  console.log('Chain now', latest.timestamp, 'roundEnd', end)
  console.log('mintingRound', { r: mr[0].toString(), inWindow: mr[1] })

  if (finalized) {
    console.log('Already finalized.')
    return
  }
  if (latest.timestamp < end) {
    const waitSec = end - latest.timestamp
    console.log(`Too early — wait ${waitSec}s (~${Math.ceil(waitSec / 60)} min) until round ${ROUND} ends.`)
    console.log(`Then re-run: node test-finalize-round.mjs ${ROUND}`)
    process.exit(1)
  }

  if (ROUND === 0 && Number(mr[0]) === 0 && mr[1]) {
    console.warn('Still in round 0 window — finalize only after roundEnd(0).')
  }

  console.log('Sending finalizeRound(%s)...', ROUND)
  const est = await mint.finalizeRound.estimateGas(ROUND).catch(() => null)
  if (est) console.log('estimateGas', est.toString())
  const gasLimit = est ? (est * 130n) / 100n : 6_000_000n
  console.log('gasLimit', gasLimit.toString())
  const tx = await mint.finalizeRound(ROUND, { gasLimit })
  console.log('tx', tx.hash)
  const receipt = await tx.wait()
  console.log('status', receipt.status, 'gas', receipt.gasUsed.toString())
  console.log('https://bscscan.com/tx/' + tx.hash)
}

main().catch((e) => {
  console.error(e.shortMessage || e.message || e)
  process.exit(1)
})
