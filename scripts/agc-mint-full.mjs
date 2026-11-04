/**
 * AGC 打满今日 A + B。用法: node agc-mint-full.mjs huangrong
 */
import { Contract, Interface, JsonRpcProvider, solidityPacked } from 'ethers'
import { execFileSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'agc-automation-config.json'), 'utf8'))
const walletId = process.argv[2] || 'huangrong'
const ADDR = {
  yuxi: '0xf3F005BC1136d6Cc8eBb85cd939A304b70e0c8AC',
  feng: '0xD543729FF9f5026a12e4851105EEc02D6F089206',
  huangrong: '0x0616E9D81F009FDCf77eD4a9B504F2C5BD73DBaA',
}
const FROM = cfg.wallets.find((x) => x.id === walletId)?.bscAddress || ADDR[walletId]
if (!FROM) throw new Error('unknown wallet')
const MINT = cfg.mint
const ROUTER = '0x10ED43C718714eb63d5aA57B78B54704E256024E'
// 1号钱包 与晞（默认推荐人；仅首 mint 前有效）
const REF_DEFAULT = '0xf3F005BC1136d6Cc8eBb85cd939A304b70e0c8AC'
const SHARE_WEI = 2000000000000000n
const ps1 = path.join(__dirname, `baw-${walletId}.ps1`)

function baw(args) {
  const out = execFileSync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1, '--json', ...args],
    { encoding: 'utf8', timeout: 180_000 },
  )
  const t = out.trim()
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  return JSON.parse(t.slice(start, end + 1))
}

function bawMint(inputData, valueWei) {
  const preview = baw([
    'contract-call',
    'preview',
    '--binanceChainId',
    '56',
    '--from',
    FROM,
    '--to',
    MINT,
    '--value',
    valueWei.toString(),
    '--inputData',
    inputData,
    '--gasLimit',
    '800000',
  ])
  if (!preview.success) throw new Error(JSON.stringify(preview.error))
  const exec = baw(['contract-call', 'execute', '--requestId', preview.data.requestId])
  if (!exec.success) throw new Error(JSON.stringify(exec.error))
  return exec.data.txHash
}

const provider = new JsonRpcProvider(cfg.rpc, 56, { staticNetwork: true })
const pad64 = (a) => a.toLowerCase().replace('0x', '').padStart(64, '0')

async function readQuota(addr) {
  const data =
    '0xe58f661c' +
    pad64(addr) +
    '0000000000000000000000000000000000000000000000000000000000000001'
  const raw = await provider.call({ to: MINT, data })
  const words = []
  for (let i = 0; i < 17; i++) words.push(BigInt('0x' + raw.slice(2 + 64 * i, 66 + 64 * i)))
  return { aLeft: words[3], bLeft: words[6], open: words[15], paused: words[16] }
}

async function readFirstDay(addr) {
  const data = '0x1959a002' + pad64(addr)
  const raw = await provider.call({ to: MINT, data })
  return BigInt('0x' + raw.slice(2, 66))
}

const q = await readQuota(FROM)
console.log(`quota: aLeft=${q.aLeft} bLeft=${q.bLeft} open=${q.open} paused=${q.paused}`)

if (q.open === 0n || q.paused === 1n) {
  console.log('mint 未开放或已暂停')
  process.exit(0)
}

const firstDay = await readFirstDay(FROM)
const REF = firstDay === 0n ? REF_DEFAULT : '0x0000000000000000000000000000000000000000'
console.log('referrer', REF, 'firstDay', firstDay.toString())

const iface = new Interface([
  'function mintFree(uint256 shares,address referrer) payable',
  'function mintPool(uint256 shares,address referrer,uint256 minAgcOut) payable',
])

if (q.aLeft > 0n) {
  const shares = q.aLeft
  const value = shares * SHARE_WEI
  const data = iface.encodeFunctionData('mintFree', [shares, REF])
  console.log(`mintFree ${shares} shares, value ${value}`)
  console.log('tx', bawMint(data, value))
}

const q2 = await readQuota(FROM)
if (q2.bLeft > 0n) {
  const shares = q2.bLeft
  const value = shares * SHARE_WEI
  const router = new Contract(
    ROUTER,
    ['function getAmountsOut(uint256 amountIn, address[] path) view returns (uint256[] amounts)'],
    provider,
  )
  const amounts = await router.getAmountsOut(value, [
    '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    cfg.agc,
  ])
  const minAgcOut = (amounts[1] * 92n) / 100n
  const data = iface.encodeFunctionData('mintPool', [shares, REF, minAgcOut])
  console.log(`mintPool ${shares} shares, minAgcOut ${minAgcOut}`)
  console.log('tx', bawMint(data, value))
}

const q3 = await readQuota(FROM)
console.log(`done: aLeft=${q3.aLeft} bLeft=${q3.bLeft}`)
