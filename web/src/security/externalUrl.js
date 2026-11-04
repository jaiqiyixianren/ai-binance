import { getAddress, isAddress } from 'ethers'

const BSCSCAN = 'https://bscscan.com'

export function bscscanAddressUrl(address) {
  if (!address || !isAddress(address)) return ''
  return `${BSCSCAN}/address/${getAddress(address)}`
}

export function bscscanTxUrl(txHash) {
  const h = txHash?.trim()
  if (!h || !/^0x[0-9a-fA-F]{64}$/.test(h)) return ''
  return `${BSCSCAN}/tx/${h}`
}
