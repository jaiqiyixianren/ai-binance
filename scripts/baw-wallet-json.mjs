import { spawnSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

export function bawWalletJson(walletId, args) {
  process.env.BINANCE_BAW_DIR = path.join(root, 'baw-sessions', walletId)
  process.env.BINANCE_INSTANCE_ID = `ai-binance-${walletId}`
  const importPath = path.join(__dirname, 'baw-disable-keytar.mjs')
  const importUri = new URL(`file:///${importPath.replace(/\\/g, '/')}`).href
  process.env.NODE_OPTIONS = `--import "${importUri}"`
  const bawEntry = path.join(root, 'node_modules', '@binance', 'agentic-wallet', 'dist', 'index.js')
  const r = spawnSync(process.execPath, [bawEntry, '--json', ...args], {
    encoding: 'utf8',
    env: { ...process.env },
    maxBuffer: 10 * 1024 * 1024,
    timeout: 300_000,
  })
  const t = (r.stdout || r.stderr || '').trim()
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start < 0 || end <= start) {
    throw new Error(`[${walletId}] baw 无 JSON：${t.slice(0, 200) || '(empty)'}`)
  }
  return JSON.parse(t.slice(start, end + 1))
}
