import { bawWalletJson } from './baw-wallet-json.mjs'

const id = process.argv[2]
const qr = process.argv[3]
const max = Number(process.argv[4] || 40)
if (!id || !qr) throw new Error('Usage: node baw-wait-verify.mjs <id> <qrCodeId> [polls]')

for (let i = 0; i < max; i++) {
  const r = bawWalletJson(id, ['auth', 'verify', '--qrCodeId', qr])
  const st = r.data?.status
  console.log(new Date().toISOString(), st)
  if (st === 'SUCCESS') {
    console.log(JSON.stringify(r, null, 2))
    process.exit(0)
  }
  if (st === 'FAILED' || st === 'EXPIRED') {
    console.log(JSON.stringify(r, null, 2))
    process.exit(1)
  }
  await new Promise((x) => setTimeout(x, 5000))
}
process.exit(2)
