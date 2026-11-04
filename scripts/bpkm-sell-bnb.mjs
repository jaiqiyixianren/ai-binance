/**
 * 测试网 BPKM → BNB（Pancake 市价 swap，黄荣 baw 钱包）
 * 用法: node bpkm-sell-bnb.mjs [walletId] [数量人类可读，默认卖 10% 余额至少 1000]
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Contract, JsonRpcProvider, formatEther, parseEther, getAddress } from 'ethers'
import { bawWalletJson } from './baw-wallet-json.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dep = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'deployments-bsc-test.json'), 'utf8'))
const TOKEN = dep.token
const NATIVE = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
const CHAIN = 56
const walletId = process.argv[2] || 'huangrong'
const qtyArg = process.argv[3]

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function pickBscAddress(data) {
  if (data?.address) return getAddress(data.address)
  const list = data?.addresses ?? []
  const hit =
    list.find((a) => String(a.binanceChainId) === '56') ||
    list.find((a) => /bsc|bnb/i.test(String(a.chainName ?? '')))
  if (!hit?.address) throw new Error('无 BSC 地址')
  return getAddress(hit.address)
}

async function main() {
  const st = bawWalletJson(walletId, ['wallet', 'status'])
  if (!st.success || st.data?.status !== 'CONNECTED') {
    throw new Error(`baw ${walletId} 未连接: ${st.error?.message ?? st.data?.status}`)
  }
  const ad = bawWalletJson(walletId, ['wallet', 'address'])
  if (!ad.success) throw new Error(`address: ${JSON.stringify(ad.error)}`)
  const addr = pickBscAddress(ad.data)

  const provider = new JsonRpcProvider(process.env.BSC_RPC || 'https://bsc-dataseed.binance.org', CHAIN)
  const token = new Contract(
    TOKEN,
    ['function balanceOf(address) view returns (uint256)', 'function symbol() view returns (string)'],
    provider,
  )
  const bal = await token.balanceOf(addr)
  const sym = await token.symbol()
  console.log('wallet', walletId, addr)
  console.log('balance', formatEther(bal), sym)

  if (bal === 0n) throw new Error('余额为 0，无法卖出')

  let qtyHuman
  if (qtyArg) {
    qtyHuman = qtyArg
  } else {
    const tenth = bal / 10n
    const min = parseEther('1000')
    const sell = tenth > min ? tenth : bal < min ? bal : min
    qtyHuman = formatEther(sell)
  }

  console.log('quote', qtyHuman, sym, '→ BNB')
  const quote = bawWalletJson(walletId, [
    'market-order',
    'quote',
    '--fromTokenQty',
    qtyHuman,
    '--fromToken',
    TOKEN,
    '--toToken',
    NATIVE,
    '--binanceChainId',
    String(CHAIN),
    '--slippage',
    '12',
  ])
  if (!quote.success) throw new Error(`quote 失败: ${JSON.stringify(quote.error ?? quote)}`)
  console.log('quote result', JSON.stringify(quote.data, null, 2))

  console.log('请在 App 确认 swap…')
  const submit = bawWalletJson(walletId, [
    'market-order',
    'swap',
    '--fromTokenQty',
    qtyHuman,
    '--fromToken',
    TOKEN,
    '--toToken',
    NATIVE,
    '--binanceChainId',
    String(CHAIN),
    '--slippage',
    '12',
    '--gasLevel',
    'HIGH',
  ])
  if (!submit.success) throw new Error(`swap 提交失败: ${JSON.stringify(submit.error ?? submit)}`)
  const orderId = submit.data.orderId
  console.log('orderId', orderId)

  for (let i = 0; i < 36; i++) {
    await sleep(5000)
    const st2 = bawWalletJson(walletId, ['market-order', 'list', '--orderId', orderId])
    const row = st2.data?.orderId ? st2.data : st2.data?.[0]
    const status = row?.status
    console.log('poll', i + 1, status)
    if (status === 'FINISHED') {
      console.log('FINISHED', JSON.stringify(row, null, 2))
      const bnbAfter = await provider.getBalance(addr)
      console.log('BNB balance now', formatEther(bnbAfter))
      return
    }
    if (status === 'FAILED') throw new Error(`swap FAILED: ${JSON.stringify(row)}`)
  }
  throw new Error('超时仍为 PENDING')
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
