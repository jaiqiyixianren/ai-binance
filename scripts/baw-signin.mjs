import { bawWalletJson } from './baw-wallet-json.mjs'

const id = process.argv[2]
const qr = process.argv[3]
if (!id) throw new Error('Usage: node baw-signin.mjs <walletId> [qrCodeId verify]')

if (qr) {
  console.log(JSON.stringify(bawWalletJson(id, ['auth', 'verify', '--qrCodeId', qr]), null, 2))
} else {
  console.log(JSON.stringify(bawWalletJson(id, ['auth', 'signin']), null, 2))
}
