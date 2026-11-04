/**
 * AGC：与晞 / 峰 — 可领取则 claim（A/B），并将钱包内 AGC 卖出为 USDT（或 BNB）。
 * 依赖 baw 已登录 + 开发者模式；无私钥。
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execFileSync } from 'child_process'
import { Contract, JsonRpcProvider, formatUnits } from 'ethers'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'agc-automation-config.json'), 'utf8'))
const logDir = path.join(root, 'logs')
fs.mkdirSync(logDir, { recursive: true })
const logFile = path.join(logDir, `agc-claim-sell-${new Date().toISOString().slice(0, 10)}.log`)

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  fs.appendFileSync(logFile, line)
  console.log(msg)
}

function parseBawJson(out) {
  const t = out.trim()
  if (!t) throw new Error('empty baw output')
  try {
    return JSON.parse(t)
  } catch {
    const start = t.indexOf('{')
    const end = t.lastIndexOf('}')
    if (start >= 0 && end > start) return JSON.parse(t.slice(start, end + 1))
    throw new Error(`no JSON in baw output: ${t.slice(0, 400)}`)
  }
}

function baw(walletId, args) {
  const ps1 = path.join(__dirname, `baw-${walletId}.ps1`)
  const out = execFileSync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1, '--json', ...args],
    { encoding: 'utf8', cwd: root, timeout: 120_000, maxBuffer: 10 * 1024 * 1024 },
  )
  return parseBawJson(out)
}

function bawContract(walletId, from, inputData, gasLimit = '600000') {
  const preview = baw(walletId, [
    'contract-call',
    'preview',
    '--binanceChainId',
    String(cfg.chainId),
    '--from',
    from,
    '--to',
    cfg.mint,
    '--value',
    '0',
    '--inputData',
    inputData,
    '--gasLimit',
    gasLimit,
  ])
  if (!preview.success) throw new Error(preview.error?.message || 'preview failed')
  const rid = preview.data.requestId
  const exec = baw(walletId, ['contract-call', 'execute', '--requestId', rid])
  if (!exec.success) throw new Error(exec.error?.message || 'execute failed')
  return exec.data.txHash
}

async function pending(provider, wallet) {
  const mint = new Contract(
    cfg.mint,
    ['function pending(address) view returns (uint256 freeBnb, uint256 freeAgc, uint256 rewardVested, uint256 lpWithdrawable)'],
    provider,
  )
  const p = await mint.pending(wallet)
  return {
    freeBnb: p.freeBnb,
    freeAgc: p.freeAgc,
    rewardVested: p.rewardVested,
    lpWithdrawable: p.lpWithdrawable,
  }
}

async function agcBalance(provider, wallet) {
  const t = new Contract(cfg.agc, ['function balanceOf(address) view returns (uint256)'], provider)
  return t.balanceOf(wallet)
}

async function swapAgc(walletId, fromQtyHuman) {
  const toToken = cfg.sellTo === 'BNB' ? cfg.native : cfg.usdt
  const submit = baw(walletId, [
    'market-order',
    'swap',
    '--fromTokenQty',
    fromQtyHuman,
    '--fromToken',
    cfg.agc,
    '--toToken',
    toToken,
    '--binanceChainId',
    String(cfg.chainId),
    '--slippage',
    cfg.swapSlippage,
  ])
  if (!submit.success) throw new Error(submit.error?.message || 'swap submit failed')
  const orderId = submit.data.orderId
  for (let i = 0; i < 24; i++) {
    const st = baw(walletId, ['market-order', 'list', '--orderId', orderId])
    const status = st.data?.status ?? st.data?.[0]?.status
    if (status === 'FINISHED') return { orderId, status, detail: st.data }
    if (status === 'FAILED') throw new Error(`swap FAILED orderId=${orderId}`)
    await new Promise((r) => setTimeout(r, 5000))
  }
  return { orderId, status: 'PENDING' }
}

async function processWallet(w) {
  log(`—— ${w.name} (${w.id}) ${w.bscAddress} ——`)
  const st = baw(w.id, ['wallet', 'status'])
  if (!st.success || st.data?.status !== 'CONNECTED') {
    log(`跳过：baw 未连接（${st.error?.message ?? st.data?.status ?? 'unknown'}），请先 .\\scripts\\baw-${w.id}.ps1 auth signin + verify`)
    return
  }

  const provider = new JsonRpcProvider(cfg.rpc, cfg.chainId, { staticNetwork: true })

  for (let round = 0; round < cfg.maxClaimRounds; round++) {
    const p = await pending(provider, w.bscAddress)
    log(
      `pending round ${round + 1}: freeBnb=${formatUnits(p.freeBnb, 18)} freeAgc=${formatUnits(p.freeAgc, 18)} rewardVested=${formatUnits(p.rewardVested, 18)} lpWithdrawable=${p.lpWithdrawable.toString()}`,
    )
    let did = false
    if (p.freeBnb > 0n || p.freeAgc > 0n) {
      log('claimFree…')
      log(`tx ${bawContract(w.id, w.bscAddress, cfg.claimCalldata.claimFree)}`)
      did = true
    }
    if (p.rewardVested > 0n) {
      log('claimReward…')
      log(`tx ${bawContract(w.id, w.bscAddress, cfg.claimCalldata.claimReward)}`)
      did = true
    }
    if (p.lpWithdrawable > 0n) {
      log('withdrawLP…')
      log(`tx ${bawContract(w.id, w.bscAddress, cfg.claimCalldata.withdrawLP)}`)
      did = true
    }
    if (!did) break
    await new Promise((r) => setTimeout(r, 8000))
  }

  const bal = await agcBalance(provider, w.bscAddress)
  const human = formatUnits(bal, 18)
  log(`AGC 余额 ${human}`)
  if (bal <= 0n) return
  const minWei = BigInt(Math.floor(parseFloat(cfg.minAgcHumanToSell) * 1e18))
  if (bal < minWei) {
    log(`低于 minAgcHumanToSell=${cfg.minAgcHumanToSell}，不卖出`)
    return
  }
  const sellQty = human.replace(/,/g, '')
  log(`卖出 AGC → ${cfg.sellTo}，数量≈${sellQty}，滑点 ${cfg.swapSlippage}%`)
  try {
    const sw = await swapAgc(w.id, sellQty)
    log(`swap 结果: ${JSON.stringify(sw)}`)
  } catch (e) {
    log(`swap 失败: ${e.message}`)
  }
}

for (const w of cfg.wallets) {
  try {
    await processWallet(w)
  } catch (e) {
    log(`${w.name} 错误: ${e.message}`)
  }
}

log('本轮结束')
