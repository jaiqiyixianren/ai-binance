import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const walletId = 'yuxi'

process.env.BINANCE_BAW_DIR = path.join(root, 'baw-sessions', walletId)
process.env.BINANCE_INSTANCE_ID = `ai-binance-${walletId}`
const importPath = path.join(__dirname, 'baw-disable-keytar.mjs')
const importUri = new URL(`file:///${importPath.replace(/\\/g, '/')}`).href
process.env.NODE_OPTIONS = `--import "${importUri}"`

const bawEntry = path.join(root, 'node_modules', '@binance', 'agentic-wallet', 'dist', 'index.js')
const r = spawnSync(process.execPath, [bawEntry, 'auth', 'signin', '--json'], {
  encoding: 'utf8',
  env: process.env,
  maxBuffer: 10 * 1024 * 1024,
})

const out = `${r.stdout || ''}${r.stderr || ''}`
fs.writeFileSync(path.join(__dirname, 'signin-yuxi-raw.txt'), out)
console.log('exit', r.status)
console.log(out || '(no output)')
if (r.error) console.error(r.error)
