import { JsonRpcProvider, Contract, formatEther } from 'ethers'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dep = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'deployments-bsc-test.json'), 'utf8'))
const RPCs = [
  process.env.BSC_RPC,
  'https://bsc-dataseed.binance.org',
  'https://bsc-dataseed1.binance.org',
  'https://rpc.ankr.com/bsc',
].filter(Boolean)

let provider
for (const u of RPCs) {
  try {
    const p = new JsonRpcProvider(u, 56)
    await p.getBlockNumber()
    provider = p
    console.log('RPC', u)
    break
  } catch (e) {
    console.log('skip', u, e.code || e.message?.slice(0, 80))
  }
}
if (!provider) throw new Error('no RPC')

const ABI = [
  'function roundFinalized(uint256) view returns (bool)',
  'function raisedBnb(uint256) view returns (uint256)',
  'function mintingRound() view returns (uint256, bool)',
  'function roundEnd(uint256) view returns (uint256)',
  'function pair() view returns (address)',
  'function BPKM_PER_BNB_FOR_LP() view returns (uint256)',
]
const mint = new Contract(dep.mint, ABI, provider)
console.log('Mint', dep.mint)
const latest = await provider.getBlock('latest')
console.log('block', latest.number, 'ts', latest.timestamp)

for (let r = 0; r < 4; r++) {
  const fin = await mint.roundFinalized(r)
  const raised = await mint.raisedBnb(r)
  const end = Number(await mint.roundEnd(r))
  console.log(
    `R${r} finalized=${fin} raised=${formatEther(raised)} BNB end=${end} canFinalize=${latest.timestamp >= end}`,
  )
}
const mr = await mint.mintingRound()
console.log('mintingRound index', mr[0].toString(), 'inWindow', mr[1])
try {
  console.log('pair', await mint.pair())
  console.log('BPKM_PER_BNB_FOR_LP', formatEther(await mint.BPKM_PER_BNB_FOR_LP()))
} catch (e) {
  console.log('extra', e.message)
}
