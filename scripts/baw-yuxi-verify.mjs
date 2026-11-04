import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const qrCodeId = process.argv[2] || JSON.parse(
  fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'signin-yuxi-pending.json'), 'utf8'),
).qrCodeId

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
process.env.BINANCE_BAW_DIR = path.join(root, 'baw-sessions', 'yuxi')
process.env.BINANCE_INSTANCE_ID = 'ai-binance-yuxi'
const importUri = new URL(`file:///${path.join(__dirname, 'baw-disable-keytar.mjs').replace(/\\/g, '/')}`).href
process.env.NODE_OPTIONS = `--import "${importUri}"`
const bawEntry = path.join(root, 'node_modules', '@binance', 'agentic-wallet', 'dist', 'index.js')

const r = spawnSync(process.execPath, [bawEntry, 'auth', 'verify', '--qrCodeId', qrCodeId, '--json'], {
  encoding: 'utf8',
  env: process.env,
  maxBuffer: 10 * 1024 * 1024,
})
console.log(r.stdout || r.stderr)
