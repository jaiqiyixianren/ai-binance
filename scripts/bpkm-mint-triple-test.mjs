/**
 * 三钱包（与晞 / 峰 / 黄荣）依次尝试测试 Mint，成功一个即停。
 * 前置：对应 baw 会话 CONNECTED + Agent ID。
 */
import fs from 'fs'
import path from 'path'
import { Contract, Interface, JsonRpcProvider, formatEther, getAddress } from 'ethers'
import { fileURLToPath } from 'url'
import { bawWalletJson } from './baw-wallet-json.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const RPC = process.env.BSC_RPC || 'https://bsc.publicnode.com'

const WALLETS = [
  { id: 'yuxi', name: '与晞' },
  { id: 'feng', name: '峰' },
  { id: 'huangrong', name: '黄荣' },
]

const dep = JSON.parse(fs.readFileSync(path.join(root, 'deployments-bsc-test.json'), 'utf8'))
const MINT = process.argv[2] || dep.mint

const MINT_ABI = [
  'function mint() payable',
  'function mintingRound() view returns (uint256 r, bool inWindow)',
  'function activeRound() view returns (uint256 r, bool ok)',
  'function allowanceOf(address) view returns (uint256)',
  'function agentOf(address) view returns (uint256 agentId, bool ok)',
  'function rounds(uint256) view returns (uint256 capWei, uint256 priceWei, uint256 maxMintPerWallet)',
  'event Minted(address indexed minter, uint256 indexed round, uint256 indexed agentId, string handle, uint8 species, uint8 multiplier, uint256 amountBPKM, uint256 bnbPaid, uint256 raisedInRoundAfter)',
]

function bawMint(walletId, fromAddress, inputData, valueWei) {
  const preview = bawWalletJson(walletId, [
    'contract-call',
    'preview',
    '--binanceChainId',
    '56',
    '--from',
    fromAddress,
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
  console.log('  preview requestId:', preview.data.requestId, '→ 请在 Binance App 确认')
  const exec = bawWalletJson(walletId, ['contract-call', 'execute', '--requestId', preview.data.requestId])
  if (!exec.success) throw new Error(`execute: ${JSON.stringify(exec.error ?? preview)}`)
  return exec.data.txHash
}

function pickBscAddress(data) {
  if (data?.address) return getAddress(data.address)
  const list = data?.addresses
  if (!Array.isArray(list) || list.length === 0) return null
  const hit =
    list.find((a) => String(a.binanceChainId) === '56') ||
    list.find((a) => /bsc|bnb|smart chain/i.test(String(a.chainName ?? ''))) ||
    list.find((a) => a.address?.startsWith('0x'))
  return hit?.address ? getAddress(hit.address) : null
}

async function resolveBscAddress(walletId) {
  const st = bawWalletJson(walletId, ['wallet', 'status'])
  if (!st.success || st.data?.status !== 'CONNECTED') {
    throw new Error(`baw 未 CONNECTED（${st.data?.status ?? 'unknown'}）`)
  }
  const addr = bawWalletJson(walletId, ['wallet', 'address'])
  if (!addr.success) throw new Error(addr.error?.message ?? '无法读取 wallet address')
  const bsc = pickBscAddress(addr.data)
  if (!bsc) throw new Error('未找到 BSC 地址')
  return bsc
}

async function tryWallet(provider, mint, walletId, name) {
  console.log(`\n=== ${name} (${walletId}) ===`)
  let address
  try {
    address = await resolveBscAddress(walletId)
  } catch (e) {
    console.log('跳过:', e.message)
    return null
  }
  console.log('地址', address)

  const [, agentOk] = await mint.agentOf(address)
  if (!agentOk) {
    console.log('跳过: 无 Agent ID 或未绑定该地址')
    return null
  }

  const allowance = await mint.allowanceOf(address)
  if (allowance === 0n) {
    console.log('跳过: allowanceOf=0（未开窗 / 已满 / 无额度）')
    return null
  }

  const mr = await mint.mintingRound()
  const r = mr.r ?? mr[0]
  const priceWei = (await mint.rounds(r)).priceWei
  console.log('allowance', allowance.toString(), 'price', formatEther(priceWei), 'BNB')

  const iface = new Interface(MINT_ABI)
  const data = iface.encodeFunctionData('mint', [])
  const txHash = bawMint(walletId, address, data, priceWei)
  console.log('tx', txHash)
  console.log('https://bscscan.com/tx/' + txHash)

  const receipt = await provider.waitForTransaction(txHash, 1, 180_000)
  if (receipt.status !== 1) throw new Error('receipt failed')

  for (const log of receipt.logs) {
    try {
      const parsed = mint.interface.parseLog(log)
      if (parsed?.name === 'Minted') {
        console.log('Minted', {
          wallet: name,
          round: parsed.args.round.toString(),
          species: Number(parsed.args.species),
          multiplier: Number(parsed.args.multiplier),
        })
      }
    } catch {
      /* ignore */
    }
  }
  return txHash
}

async function main() {
  const provider = new JsonRpcProvider(RPC, 56, { staticNetwork: true })
  const mint = new Contract(MINT, MINT_ABI, provider)

  const mr = await mint.mintingRound()
  const roundIdx = mr.r ?? mr[0]
  const inWindow = mr.inWindow ?? mr[1]
  console.log('Test Mint', MINT)
  console.log('mintingRound', { r: roundIdx?.toString?.() ?? roundIdx, inWindow })
  if (!inWindow) throw new Error('当前无 mint 窗口（可能 10 分钟测试轮已结束，需 redeploy 测试合约）')

  for (const { id, name } of WALLETS) {
    try {
      const tx = await tryWallet(provider, mint, id, name)
      if (tx) {
        console.log(`\n✓ 成功：${name} tx ${tx}`)
        return
      }
    } catch (e) {
      console.log('失败:', e.message || e)
    }
  }
  throw new Error('三个钱包均未成功 mint（登录 / Agent / App 确认 / 额度）')
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
