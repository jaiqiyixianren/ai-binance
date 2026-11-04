import { bawWalletJson } from './baw-wallet-json.mjs'

for (const id of ['yuxi', 'feng', 'huangrong']) {
  try {
    console.log('---', id, '---')
    console.log('status', bawWalletJson(id, ['wallet', 'status']))
    try {
      const addr = bawWalletJson(id, ['wallet', 'address'])
      const list = addr.data?.addresses ?? []
      const bsc = list.find((a) => String(a.binanceChainId) === '56') || list[0]
      console.log('BSC', bsc?.address, 'agent?', bsc?.chainName)
    } catch (e) {
      console.log('address err', e.message)
    }
  } catch (e) {
    console.log('err', e.message)
  }
}
