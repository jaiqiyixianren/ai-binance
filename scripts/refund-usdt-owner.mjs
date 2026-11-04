import fs from 'fs'
import { Contract, JsonRpcProvider, Wallet, formatUnits, Mnemonic, HDNodeWallet } from 'ethers'

const MINT = '0x4a144D1A5Ca9C8e60A93C9836DD8740eB216FF5C'
const USDT = '0x55d398326f99059fF775485246999027B3197955'
const RECIPIENT = process.env.REFUND_TO || '0x44A02Dc00916c84b2473De22b9cA047a76B30C42'
const AMOUNT = process.env.REFUND_AMOUNT || '1' // USDT human
const RPC = process.env.BSC_RPC || 'https://bsc-dataseed.binance.org'
const EXPECTED_OWNER = '0x2548d570741171aC475bf3a4f48Bf0f3BfA7f9C2'

function loadWallet(provider) {
  let raw
  if (process.env.DEPLOYER_PRIVATE_KEY) {
    raw = process.env.DEPLOYER_PRIVATE_KEY.trim()
  } else {
    const file = process.env.DEPLOYER_KEY_FILE
    if (!file) throw new Error('Set DEPLOYER_KEY_FILE or DEPLOYER_PRIVATE_KEY')
    raw = fs.readFileSync(file, 'utf8').trim()
  }
  const compact = raw.replace(/\s+/g, ' ').trim()
  const words = compact.split(' ').filter(Boolean)
  if (words.length >= 12 && words.length <= 24) {
    const m = Mnemonic.fromPhrase(words.join(' '))
    return HDNodeWallet.fromMnemonic(m, "m/44'/60'/0'/0/0").connect(provider)
  }
  let k = compact.replace(/\s/g, '')
  if (!k.startsWith('0x')) k = '0x' + k
  return new Wallet(k, provider)
}

const provider = new JsonRpcProvider(RPC, 56)
const wallet = loadWallet(provider)
if (wallet.address.toLowerCase() !== EXPECTED_OWNER.toLowerCase()) {
  throw new Error(`Signer ${wallet.address} is not contract owner ${EXPECTED_OWNER}`)
}

const mint = new Contract(
  MINT,
  [
    'function owner() view returns (address)',
    'function withdrawUsdt(address to, uint256 amount)',
  ],
  wallet,
)

const owner = await mint.owner()
if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
  throw new Error('On-chain owner mismatch')
}

const usdt = new Contract(USDT, ['function balanceOf(address) view returns (uint256)'], provider)
const beforeMint = await usdt.balanceOf(MINT)
const beforeUser = await usdt.balanceOf(RECIPIENT)
const amountWei = BigInt(Math.floor(parseFloat(AMOUNT) * 1e6)) * 1_000_000_000_000n // 18 dec

console.log('Mint USDT before:', formatUnits(beforeMint, 18))
console.log('User USDT before:', formatUnits(beforeUser, 18))
console.log('Refunding', AMOUNT, 'USDT to', RECIPIENT)

const tx = await mint.withdrawUsdt(RECIPIENT, amountWei)
console.log('tx sent', tx.hash)
const rc = await tx.wait()
console.log('status', rc.status)

const afterMint = await usdt.balanceOf(MINT)
const afterUser = await usdt.balanceOf(RECIPIENT)
console.log('Mint USDT after:', formatUnits(afterMint, 18))
console.log('User USDT after:', formatUnits(afterUser, 18))
