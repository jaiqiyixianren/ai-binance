import { execFileSync } from 'child_process'
import { Contract, Interface, JsonRpcProvider } from 'ethers'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const walletId = process.argv[2] || 'huangrong'
const FROM = '0x0616E9D81F009FDCf77eD4a9B504F2C5BD73DBaA'
const MINT = '0x6288DFe86f22B53eEB6886aE2D78941de7483743'
const REF = '0xf3F005BC1136d6Cc8eBb85cd939A304b70e0c8AC'
const ps1 = path.join(__dirname, `baw-${walletId}.ps1`)
const shares = 5n
const value = shares * 2000000000000000n

function baw(args) {
  const out = execFileSync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1, '--json', ...args],
    { encoding: 'utf8' },
  )
  const t = out.trim()
  return JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1))
}

const p = new JsonRpcProvider('https://bsc-dataseed.bnbchain.org', 56)
const router = new Contract(
  '0x10ED43C718714eb63d5aA57B78B54704E256024E',
  ['function getAmountsOut(uint256,address[]) view returns (uint256[])'],
  p,
)
const amounts = await router.getAmountsOut(value, [
  '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  '0x63dea5aCdbE1F27c968907D08610A5f0A0284bA6',
])
const iface = new Interface(['function mintPool(uint256,address,uint256) payable'])

for (const pct of [85n, 80n, 75n, 70n, 65n, 60n, 50n]) {
  const min = (amounts[1] * pct) / 100n
  const data = iface.encodeFunctionData('mintPool', [shares, REF, min])
  console.log(`try min ${pct}% of quote → ${min}`)
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
    value.toString(),
    '--inputData',
    data,
    '--gasLimit',
    '800000',
  ])
  if (!preview.success) {
    console.log('preview fail:', preview.error?.message)
    continue
  }
  const exec = baw(['contract-call', 'execute', '--requestId', preview.data.requestId])
  if (!exec.success) {
    console.log('execute fail:', exec.error?.message)
    continue
  }
  console.log('tx', exec.data.txHash)
  process.exit(0)
}
process.exit(1)
