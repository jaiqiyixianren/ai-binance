import { bawWalletJson } from './baw-wallet-json.mjs'
const id = process.argv[2] || 'huangrong'
const cmd = process.argv[3] || 'status'
const args =
  cmd === 'address'
    ? ['wallet', 'address']
    : cmd === 'settings'
      ? ['wallet', 'settings']
      : ['wallet', 'status']
console.log(JSON.stringify(bawWalletJson(id, args), null, 2))
