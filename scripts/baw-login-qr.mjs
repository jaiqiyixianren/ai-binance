/**
 * 任意 baw 钱包：signin + 本地二维码 PNG（勿依赖浏览器打开 urlForWeb）
 * 用法: node baw-login-qr.mjs <yuxi|feng|huangrong> [--fresh]
 */
import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const walletId = process.argv[2]
const fresh = process.argv.includes('--fresh')
if (!walletId) throw new Error('Usage: node baw-login-qr.mjs <yuxi|feng|huangrong>')

function runBaw(args) {
  process.env.BINANCE_BAW_DIR = path.join(root, 'baw-sessions', walletId)
  process.env.BINANCE_INSTANCE_ID = `ai-binance-${walletId}`
  const importPath = path.join(__dirname, 'baw-disable-keytar.mjs')
  const importUri = new URL(`file:///${importPath.replace(/\\/g, '/')}`).href
  process.env.NODE_OPTIONS = `--import "${importUri}"`
  const bawEntry = path.join(root, 'node_modules', '@binance', 'agentic-wallet', 'dist', 'index.js')
  const r = spawnSync(process.execPath, [bawEntry, ...args], {
    encoding: 'utf8',
    env: { ...process.env },
    maxBuffer: 10 * 1024 * 1024,
  })
  const text = (r.stdout || '').trim() || (r.stderr || '').trim()
  return { status: r.status, text }
}

function parseJson(text) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0) throw new Error(`no JSON: ${text.slice(0, 300)}`)
  return JSON.parse(text.slice(start, end + 1))
}

async function main() {
  const st = parseJson(runBaw(['--json', 'wallet', 'status']).text)
  console.log('status:', st.data?.status ?? st)

  if (fresh && st.data?.status === 'CONNECTED') {
    console.log('signout…')
    console.log(runBaw(['auth', 'signout', '--json']).text)
  }

  const signin = parseJson(runBaw(['auth', 'signin', '--json']).text)
  if (signin?.data?.status === 'ALREADY_CONNECTED') {
    console.log('已是 CONNECTED，无需扫码')
    return
  }
  if (!signin.success) {
    console.log(JSON.stringify(signin, null, 2))
    process.exit(1)
  }

  const { urlForWeb, qrCodeId, pairingCode, expireAt } = signin.data
  const meta = { walletId, qrCodeId, expireAt, urlForWeb, pairingCode }
  const metaPath = path.join(__dirname, `signin-${walletId}-pending.json`)
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2))

  const pngPath = path.join(root, 'web', 'public', `baw-${walletId}-login-qr.png`)
  fs.mkdirSync(path.dirname(pngPath), { recursive: true })
  const qr = await import('qrcode')
  await qr.default.toFile(pngPath, urlForWeb, { width: 360, margin: 2 })

  console.log('')
  console.log('=== 峰/钱包登录（不要用电脑浏览器打开链接）===')
  console.log('1. 手机打开 **已安装的** Binance App')
  console.log('2. 进入 Web3 / Agentic Wallet 相关入口，选择 **扫一扫**')
  console.log('3. 扫下面 PNG 文件里的二维码（不是浏览器里的下载页）')
  console.log('4. App 里核对配对码:', pairingCode)
  console.log('5. 确认后在本机执行（会阻塞约 5 分钟）:')
  console.log(`   node baw-wait-verify.mjs ${walletId} ${qrCodeId}`)
  console.log('')
  console.log('二维码 PNG:', pngPath)
  console.log('qrCodeId:', qrCodeId)
  console.log('（urlForWeb 仅用于生成二维码，浏览器打开可能只会提示下载 App）')
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
