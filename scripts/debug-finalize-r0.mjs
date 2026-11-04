import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Contract, JsonRpcProvider, formatEther, Mnemonic, HDNodeWallet } from 'ethers'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dep = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'deployments-bsc-test.json'), 'utf8'))
const provider = new JsonRpcProvider(process.env.BSC_RPC || 'https://bsc-dataseed.binance.org', 56)

const mintAbi = [
  'function finalizeRound(uint256 r)',
  'function raisedBnb(uint256) view returns (uint256)',
  'function roundFinalized(uint256) view returns (bool)',
  'function router() view returns (address)',
  'function token() view returns (address)',
  'function LP_BNB_BPS() view returns (uint256)',
  'function BPKM_PER_BNB_FOR_LP() view returns (uint256)',
]
const mint = new Contract(dep.mint, mintAbi, provider)

const raised = await mint.raisedBnb(0)
const fin = await mint.roundFinalized(0)
const bps = await mint.LP_BNB_BPS()
const perBnb = await mint.BPKM_PER_BNB_FOR_LP()
const lpBnb = (raised * bps) / 10000n
const bpkmAmt = (lpBnb * perBnb) / 10n ** 18n
console.log('finalized', fin, 'raised', formatEther(raised))
console.log('lpBnb', formatEther(lpBnb), 'bpkmAmt', formatEther(bpkmAmt))
console.log('router', await mint.router())
console.log('token', await mint.token())

const bal = await provider.getBalance(dep.mint)
console.log('mint BNB balance', formatEther(bal))

try {
  await mint.finalizeRound.staticCall(0)
  console.log('staticCall OK')
} catch (e) {
  console.log('staticCall revert', e.shortMessage || e.message)
  if (e.data) console.log('data', e.data)
}

const raw = fs.readFileSync(path.join(process.env.USERPROFILE, 'Desktop', '新建 文本文档 (2).txt'), 'utf8').trim()
const words = raw.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
const wallet = HDNodeWallet.fromMnemonic(Mnemonic.fromPhrase(words.join(' ')), "m/44'/60'/0'/0/0").connect(provider)
const mintW = mint.connect(wallet)
try {
  const est = await mintW.finalizeRound.estimateGas(0)
  console.log('estimateGas', est.toString())
} catch (e) {
  console.log('estimateGas fail', e.shortMessage || e.message, e.data)
}

for (const failed of [
  '0x7594926ec75cb936dc7fbba126672a01cb73ef817e229b0a587cc9376ca8fa76',
  '0x828d6a033a9b5cc54c643b094bbef1b30161102fafc8d9f0b44b5903080419c7',
]) {
  const rc = await provider.getTransactionReceipt(failed)
  console.log('tx', failed.slice(0, 12), 'status', rc?.status, 'gasUsed', rc?.gasUsed?.toString())
}

const token = new Contract(dep.token, ['function balanceOf(address) view returns (uint256)', 'function totalSupply() view returns (uint256)'], provider)
console.log('token totalSupply', formatEther(await token.totalSupply()))
console.log('mint token bal', formatEther(await token.balanceOf(dep.mint)))
