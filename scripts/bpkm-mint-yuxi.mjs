/**
 * 与晞钱包 baw 测试 mint（默认 0.0002 BNB / 第 1 轮）
 * 用法: node bpkm-mint-yuxi.mjs [mintAddress]
 */
import fs from 'fs'
import path from 'path'
import { Contract, Interface, JsonRpcProvider, formatEther } from 'ethers'
import { fileURLToPath } from 'url'
import { bawYuxiJson } from './baw-yuxi-run.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const RPC = process.env.BSC_RPC || 'https://bsc.publicnode.com'
const YUXI = '0xf3F005BC1136d6Cc8eBb85cd939A304b70e0c8AC'

const testDepPath = path.join(root, 'deployments-bsc-test.json')
const depPath = path.join(root, 'deployments-bsc.json')
const useTest = process.env.BPKM_USE_TEST === '1'
const dep = useTest && fs.existsSync(testDepPath)
  ? JSON.parse(fs.readFileSync(testDepPath, 'utf8'))
  : fs.existsSync(depPath)
    ? JSON.parse(fs.readFileSync(depPath, 'utf8'))
    : fs.existsSync(testDepPath)
      ? JSON.parse(fs.readFileSync(testDepPath, 'utf8'))
      : {}
const MINT = process.argv[2] || process.env.MINT_ADDRESS || dep.mint
if (!MINT) throw new Error('Pass mint address or set deployments-bsc.json / MINT_ADDRESS')

const MINT_ABI = [
  'function mint() payable',
  'function mintingRound() view returns (uint256 r, bool inWindow)',
  'function activeRound() view returns (uint256 r, bool ok)',
  'function allowanceOf(address) view returns (uint256)',
  'function agentOf(address) view returns (uint256 agentId, bool ok)',
  'function rounds(uint256) view returns (uint256 capWei, uint256 priceWei, uint256 maxMintPerWallet)',
  'event Minted(address indexed minter, uint256 indexed round, uint256 indexed agentId, string handle, uint8 species, uint8 multiplier, uint256 amountBPKM, uint256 bnbPaid, uint256 raisedInRoundAfter)',
]

function bawMint(inputData, valueWei) {
  const preview = bawYuxiJson([
    'contract-call',
    'preview',
    '--binanceChainId',
    '56',
    '--from',
    YUXI,
    '--to',
    MINT,
    '--value',
    valueWei.toString(),
    '--inputData',
    inputData,
    '--gasLimit',
    '600000',
  ])
  if (!preview.success) throw new Error(`preview: ${JSON.stringify(preview.error ?? preview)}`)
  console.log('Preview OK — confirm in Binance App if required, requestId:', preview.data.requestId)
  const exec = bawYuxiJson(['contract-call', 'execute', '--requestId', preview.data.requestId])
  if (!exec.success) throw new Error(`execute: ${JSON.stringify(exec.error ?? exec)}`)
  return exec.data.txHash
}

async function main() {
  const provider = new JsonRpcProvider(RPC, 56, { staticNetwork: true })
  const mint = new Contract(MINT, MINT_ABI, provider)

  const [mr, ar] = await Promise.all([mint.mintingRound(), mint.activeRound()])
  const [r] = mr
  const [, , maxPerWallet] = await mint.rounds(r)
  const allowance = await mint.allowanceOf(YUXI)
  const [, agentOk] = await mint.agentOf(YUXI)

  console.log('Mint contract', MINT)
  console.log('Wallet (与晞)', YUXI)
  console.log('mintingRound', { r: r.toString(), inWindow: mr[1] })
  console.log('activeRound', { r: ar[0].toString(), ok: ar[1] })
  console.log('allowanceOf', allowance.toString())
  console.log('agentOf.ok', agentOk)

  if (!mr[1]) throw new Error('Not in a mint window (RoundNotStarted or RoundEnded)')
  if (!agentOk) throw new Error('Agent ID not bound to this wallet')
  if (allowance === 0n) throw new Error('No mint allowance (quota exhausted?)')

  const priceWei = (await mint.rounds(r)).priceWei
  console.log('priceWei', priceWei.toString(), '=', formatEther(priceWei), 'BNB')

  const iface = new Interface(MINT_ABI)
  const data = iface.encodeFunctionData('mint', [])
  const txHash = bawMint(data, priceWei)
  console.log('tx', txHash)
  console.log('https://bscscan.com/tx/' + txHash)

  const receipt = await provider.waitForTransaction(txHash, 1, 120_000)
  const logs = receipt.logs
    .map((log) => {
      try {
        return mint.interface.parseLog(log)
      } catch {
        return null
      }
    })
    .filter(Boolean)
  const minted = logs.find((l) => l.name === 'Minted')
  if (minted) {
    console.log('Minted event', {
      round: minted.args.round.toString(),
      species: Number(minted.args.species),
      multiplier: Number(minted.args.multiplier),
      amountBPKM: minted.args.amountBPKM.toString(),
    })
  }
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
