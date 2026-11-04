import fs from 'fs'
import { ethers, Mnemonic, HDNodeWallet, Wallet } from 'ethers'

const file = process.argv[2]
if (!file) throw new Error('usage: node check-deployer-balance.mjs <keyfile>')
const raw = fs.readFileSync(file, 'utf8').trim()
const words = raw.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
let w
if (words.length >= 12 && words.length <= 24) {
  w = HDNodeWallet.fromMnemonic(Mnemonic.fromPhrase(words.join(' ')), "m/44'/60'/0'/0/0")
} else {
  let k = raw.replace(/\s/g, '')
  if (!k.startsWith('0x')) k = '0x' + k
  w = new Wallet(k)
}
const p = new ethers.JsonRpcProvider(process.env.BSC_RPC || 'https://bsc.publicnode.com', 56)
const bal = await p.getBalance(w.address)
console.log(JSON.stringify({ address: w.address, bnb: ethers.formatEther(bal) }))
