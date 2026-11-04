/**
 * 指定 baw 钱包测试 mint。用法: node bpkm-mint-wallet.mjs <yuxi|feng|huangrong> [mintAddress]
 */
import fs from 'fs'
import path from 'path'
import { Contract, Interface, JsonRpcProvider, formatEther, getAddress } from 'ethers'
import { fileURLToPath } from 'url'
import { bawWalletJson } from './baw-wallet-json.mjs'

const walletId = process.argv[2]
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
if (!walletId) throw new Error('Usage: node bpkm-mint-wallet.mjs <yuxi|feng|huangrong>')

const dep = JSON.parse(fs.readFileSync(path.join(root, 'deployments-bsc-test.json'), 'utf8'))
const MINT = process.argv[3] || dep.mint
const RPC = process.env.BSC_RPC || 'https://bsc-dataseed.binance.org'

const MINT_ABI = [
  'function mint() payable',
  'function mintingRound() view returns (uint256 r, bool inWindow)',
  'function allowanceOf(address) view returns (uint256)',
  'function agentOf(address) view returns (uint256 agentId, bool ok)',
  'function rounds(uint256) view returns (uint256 capWei, uint256 priceWei, uint256 maxMintPerWallet)',
  'event Minted(address indexed minter, uint256 indexed round, uint256 indexed agentId, string handle, uint8 species, uint8 multiplier, uint256 amountBPKM, uint256 bnbPaid, uint256 raisedInRoundAfter)',
]

function pickBscAddress(data) {
  if (data?.address) return getAddress(data.address)
  const list = data?.addresses ?? []
  const hit =
    list.find((a) => String(a.binanceChainId) === '56') ||
    list.find((a) => /bsc|bnb/i.test(String(a.chainName ?? '')))
  if (!hit?.address) throw new Error('无 BSC 地址')
  return getAddress(hit.address)
}

function bawMint(from, inputData, valueWei) {
  const preview = bawWalletJson(walletId, [
    'contract-call',
    'preview',
    '--binanceChainId',
    '56',
    '--from',
    from,
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
  console.log('App 确认 preview, requestId:', preview.data.requestId)
  const exec = bawWalletJson(walletId, ['contract-call', 'execute', '--requestId', preview.data.requestId])
  if (!exec.success) throw new Error(`execute: ${JSON.stringify(exec.error ?? exec)}`)
  return exec.data.txHash
}

async function main() {
  const st = bawWalletJson(walletId, ['wallet', 'status'])
  if (st.data?.status !== 'CONNECTED') throw new Error(`${walletId} 未 CONNECTED`)

  const from = pickBscAddress(bawWalletJson(walletId, ['wallet', 'address']).data)
  const provider = new JsonRpcProvider(RPC, 56, { staticNetwork: true })
  const mint = new Contract(MINT, MINT_ABI, provider)

  const mr = await mint.mintingRound()
  const inWindow = mr.inWindow ?? mr[1]
  if (!inWindow) throw new Error('无 mint 窗口（测试轮可能已结束，需 redeploy-test）')

  const [, agentOk] = await mint.agentOf(from)
  if (!agentOk) throw new Error('该地址无 Agent ID')

  const r = mr.r ?? mr[0]
  const priceWei = (await mint.rounds(r)).priceWei
  const allowance = await mint.allowanceOf(from)
  if (allowance === 0n) throw new Error('allowanceOf=0')

  console.log('wallet', walletId, from)
  console.log('Mint', MINT, 'price', formatEther(priceWei), 'BNB')

  const data = new Interface(MINT_ABI).encodeFunctionData('mint', [])
  const txHash = bawMint(from, data, priceWei)
  console.log('tx', txHash, 'https://bscscan.com/tx/' + txHash)

  const receipt = await provider.waitForTransaction(txHash, 1, 180_000)
  if (receipt.status !== 1) throw new Error('mint revert')

  for (const log of receipt.logs) {
    try {
      const p = mint.interface.parseLog(log)
      if (p?.name === 'Minted') {
        console.log('Minted', {
          round: p.args.round.toString(),
          species: Number(p.args.species),
          multiplier: Number(p.args.multiplier),
        })
      }
    } catch {
      /* skip */
    }
  }
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
