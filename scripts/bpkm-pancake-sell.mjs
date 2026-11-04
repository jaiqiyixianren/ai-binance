/**
 * BPKM → BNB：Pancake V2 swapExactTokensForETH（绕过 market-order 风控）
 * 用法: node bpkm-pancake-sell.mjs [walletId] [数量，默认 5000]
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  Contract,
  Interface,
  JsonRpcProvider,
  formatEther,
  parseEther,
  getAddress,
} from 'ethers'
import { bawWalletJson } from './baw-wallet-json.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dep = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'deployments-bsc-test.json'), 'utf8'))
const TOKEN = dep.token
const ROUTER = '0x10ED43C718714eb63d5aA57B78B54704E256024E'
const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
const RPC = process.env.BSC_RPC || 'https://bsc-dataseed.binance.org'

const walletId = process.argv[2] || 'huangrong'
const qtyHuman = process.argv[3] || '5000'
const amountIn = parseEther(qtyHuman)

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address,address) view returns (uint256)',
  'function approve(address,uint256) returns (bool)',
]
const ROUTER_ABI = [
  'function getAmountsOut(uint256 amountIn, address[] path) view returns (uint256[] amounts)',
  'function swapExactTokensForETH(uint256 amountIn,uint256 amountOutMin,address[] path,address to,uint256 deadline)',
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

function bawCall(from, to, inputData, gasLimit = '800000') {
  const preview = bawWalletJson(walletId, [
    'contract-call',
    'preview',
    '--binanceChainId',
    '56',
    '--from',
    from,
    '--to',
    to,
    '--inputData',
    inputData,
    '--gasLimit',
    gasLimit,
  ])
  if (!preview.success) throw new Error(`preview: ${JSON.stringify(preview.error ?? preview)}`)
  console.log('App 确认:', preview.data.requestId)
  const exec = bawWalletJson(walletId, ['contract-call', 'execute', '--requestId', preview.data.requestId])
  if (!exec.success) throw new Error(`execute: ${JSON.stringify(exec.error ?? exec)}`)
  return exec.data.txHash
}

async function main() {
  const st = bawWalletJson(walletId, ['wallet', 'status'])
  if (st.data?.status !== 'CONNECTED') throw new Error(`${walletId} 未 CONNECTED`)

  const from = pickBscAddress(bawWalletJson(walletId, ['wallet', 'address']).data)
  const provider = new JsonRpcProvider(RPC, 56, { staticNetwork: true })
  const token = new Contract(TOKEN, ERC20_ABI, provider)
  const router = new Contract(ROUTER, ROUTER_ABI, provider)

  const bal = await token.balanceOf(from)
  console.log('wallet', from, 'BPKM', formatEther(bal))
  if (bal < amountIn) throw new Error(`余额不足: 需要 ${qtyHuman}`)

  const pathTokens = [TOKEN, WBNB]
  const amounts = await router.getAmountsOut(amountIn, pathTokens)
  const quotedBnb = amounts[1]
  const amountOutMin = (quotedBnb * 85n) / 100n
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200)

  console.log('卖出', qtyHuman, 'BPKM，预计', formatEther(quotedBnb), 'BNB，minOut 85%')

  const allowance = await token.allowance(from, ROUTER)
  if (allowance < amountIn) {
    const approveData = new Interface(ERC20_ABI).encodeFunctionData('approve', [ROUTER, amountIn])
    console.log('approve router…')
    const txA = bawCall(from, TOKEN, approveData, '120000')
    console.log('approve tx', txA)
    await provider.waitForTransaction(txA, 1, 120_000)
  }

  const swapData = new Interface(ROUTER_ABI).encodeFunctionData('swapExactTokensForETH', [
    amountIn,
    amountOutMin,
    pathTokens,
    from,
    deadline,
  ])
  const bnbBefore = await provider.getBalance(from)
  const tx = bawCall(from, ROUTER, swapData, '500000')
  console.log('swap tx', tx, 'https://bscscan.com/tx/' + tx)
  const rc = await provider.waitForTransaction(tx, 1, 180_000)
  if (rc.status !== 1) throw new Error('swap revert')
  const bnbAfter = await provider.getBalance(from)
  console.log('BNB 变化约', formatEther(bnbAfter - bnbBefore), '(含 gas)')
  console.log('BNB 余额', formatEther(bnbAfter))
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
