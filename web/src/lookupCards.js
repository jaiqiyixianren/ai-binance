import { Contract, formatUnits, getAddress, isAddress } from 'ethers'
import { ADDRESSES, MINT_ABI } from './config.js'
import { cardMetaForSpecies } from './cards.js'
import { queryMintedLogsChunked, resolveCurrentRoundLogScan } from './mintLogScan.js'

function sortRows(rows) {
  return [...rows].sort((a, b) => {
    const blockA = a.blockNumber ?? 0
    const blockB = b.blockNumber ?? 0
    return blockB - blockA
  })
}

function mapLogToRow(log) {
  const a = log.args
  const species = Number(a.species ?? a.tier)
  return {
    round: Number(a.round ?? 0),
    species,
    multiplier: Number(a.multiplier),
    amountBPKM: a.amountBPKM,
    handle: a.handle ?? '',
    txHash: log.transactionHash,
    blockNumber: log.blockNumber,
  }
}

function enrichRows(rows, mintAddr) {
  return sortRows(rows).map((row) => {
    const meta = cardMetaForSpecies(row.species, mintAddr)
    return {
      ...row,
      tier: row.species,
      nameZh: meta?.nameZh ?? `#${row.species}`,
      nameEn: meta?.nameEn ?? '',
      image: meta?.image ?? '',
      slug: meta?.slug ?? `species-${row.species}`,
      accent: meta?.accent,
    }
  })
}

/**
 * 只查「当前开放轮次」内该地址的 Minted 事件（窗口外不扫链、不展示历史轮）。
 */
export async function lookupCardsByAddress(provider, addressInput) {
  if (!ADDRESSES.mint) throw new Error('Mint address not configured')
  if (!addressInput?.trim()) throw new Error('Enter wallet address')
  if (!isAddress(addressInput)) throw new Error('Invalid BSC address')

  const wallet = getAddress(addressInput.trim())
  const mint = new Contract(ADDRESSES.mint, MINT_ABI, provider)
  const mintAddr = ADDRESSES.mint

  const latest = await provider.getBlockNumber()
  const { roundIndex, inWindow, fromBlock } = await resolveCurrentRoundLogScan(provider, mint, latest)

  if (!inWindow || fromBlock == null) {
    return {
      cards: [],
      roundIndex,
      inWindow: false,
      source: 'none',
      messageKey: 'lookupNoActiveRound',
    }
  }

  let rows = []
  try {
    const logs = await queryMintedLogsChunked(mint, wallet, fromBlock, latest)
    rows = logs.map(mapLogToRow).filter((row) => row.round === roundIndex)
  } catch (e) {
    const msg = e.shortMessage || e.message || String(e)
    throw new Error(
      msg.includes('query') || msg.includes('log') || msg.includes('block')
        ? `读取本轮 Mint 事件失败（可稍后重试）：${msg}`
        : msg,
    )
  }

  return {
    cards: enrichRows(rows, mintAddr),
    roundIndex,
    inWindow: true,
    source: rows.length ? 'events' : 'none',
    messageKey: rows.length ? null : 'lookupEmptyRound',
  }
}

export function formatCardBpkm(amountWei) {
  if (amountWei == null) return null
  return Number(formatUnits(amountWei, 18)).toLocaleString('en-US')
}
