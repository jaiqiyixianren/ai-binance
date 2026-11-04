/**
 * 与晞 baw：可选 signout 后 signin，输出 JSON 并生成二维码 PNG。
 * 用法: node baw-yuxi-login-qr.mjs [--fresh]
 */
import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const fresh = process.argv.includes('--fresh')

function runBaw(args) {
  process.env.BINANCE_BAW_DIR = path.join(root, 'baw-sessions', 'yuxi')
  process.env.BINANCE_INSTANCE_ID = 'ai-binance-yuxi'
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

async function main() {
  const status = runBaw(['--json', 'wallet', 'status'])
  console.log('wallet status:', status.text)

  if (fresh) {
    console.log('signout...')
    console.log(runBaw(['auth', 'signout', '--json']).text)
  }

  const signin = runBaw(['auth', 'signin', '--json'])
  console.log(signin.text)

  let data
  try {
    data = JSON.parse(signin.text)
  } catch {
    console.error('Could not parse signin JSON')
    process.exit(1)
  }

  if (data?.data?.status === 'ALREADY_CONNECTED') {
    console.log('\n与晞 baw 已是 CONNECTED，无需扫码。可直接: node bpkm-mint-yuxi.mjs')
    return
  }

  const url = data?.data?.urlForWeb || data?.data?.qrCodeUrl
  const qrCodeId = data?.data?.qrCodeId
  const pairing = data?.data?.pairingCode

  if (!url && !qrCodeId) {
    console.error('No QR payload:', JSON.stringify(data, null, 2))
    process.exit(1)
  }

  const meta = {
    qrCodeId,
    expireAt: data?.data?.expireAt,
    urlForWeb: url,
    pairingCode: pairing,
  }
  fs.writeFileSync(path.join(__dirname, 'signin-yuxi-pending.json'), JSON.stringify(meta, null, 2))
  console.log('\n--- 扫码登录 ---')
  if (pairing) console.log('配对码 Pairing code:', pairing)
  if (qrCodeId) console.log('qrCodeId:', qrCodeId)
  if (url) console.log('URL:', url)

  if (url) {
    try {
      const qr = await import('qrcode')
      const pngPath = path.join(root, 'web', 'public', 'baw-yuxi-login-qr.png')
      await qr.default.toFile(pngPath, url, { width: 320, margin: 2 })
      console.log('\n二维码 PNG:', pngPath)
      console.log('本地预览: http://localhost:5173/baw-yuxi-login-qr.png （需 npm run dev）')
    } catch (e) {
      console.warn('PNG 生成失败，请用 Binance App 扫上面 URL 或本机终端 ASCII 码')
    }
  }

  console.log('\n扫码后在 App 确认配对码，再执行:')
  console.log(`node baw-yuxi-verify.mjs ${qrCodeId}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
