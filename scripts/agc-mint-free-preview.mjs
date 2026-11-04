import { Interface } from 'ethers'
import { execFileSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const baw = path.join(__dirname, '..', 'node_modules', '.bin', 'baw.cmd')

const FROM = '0xf3F005BC1136d6Cc8eBb85cd939A304b70e0c8AC'
const MINT = '0x6288DFe86f22B53eEB6886aE2D78941de7483743'
const REF = process.argv[2] || '0xc45a622da0c361A759d9B14619C9c5A3e880e9e6'
const shares = BigInt(process.argv[3] || '5')

const iface = new Interface(['function mintFree(uint256 shares,address referrer) payable'])
const inputData = iface.encodeFunctionData('mintFree', [shares, REF])
const value = (shares * 2000000000000000n).toString()

const out = execFileSync(
  baw,
  [
    'contract-call',
    'preview',
    '--binanceChainId',
    '56',
    '--from',
    FROM,
    '--to',
    MINT,
    '--value',
    value,
    '--inputData',
    inputData,
    '--json',
  ],
  { encoding: 'utf8' },
)
console.log(out)
