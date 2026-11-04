import { getAddress } from 'ethers'
import { ADDRESSES, MINT_LOG_FROM_BLOCK, ROUND_DURATION_SEC } from './config.js'

/** 官方 Mint 部署区块（略留余量）。部署脚本会写入 deployments-bsc.json。 */
export const KNOWN_MINT_LOG_FROM = {
  '0x98baffc1f6f767405c7683bfc86063fd8ef3163': 131_675_861,
  '0x73e7bd4f2e837a02d8a30af44a89862c7db76500': 131_671_294,
  '0x2f6e303ccf0484ddc81eb1c20a4fb3e2b93e2217': 131_667_641,
  '0xee36ec656738968c201f99a6a3c952d5dd761923': 131_666_537,
  '0xbb14de40bb0b3fe9e8167f6e7347c5147521fF1D': 131_661_500,
}

/** BSC 公共 RPC 单次 getLogs 区块跨度上限（保守值） */
const LOG_CHUNK_SIZE = 4_000

/** 估算出块间隔（秒），用于由 roundStart 推算起始块 */
const BSC_BLOCK_TIME_SEC = 3

/** 当前轮扫描额外回溯块（防止估算误差） */
const ROUND_SCAN_BLOCK_BUFFER = 2_000

/** 单轮最长 24h；扫描上限块数（再加 buffer） */
const MAX_ROUND_SCAN_BLOCKS =
  Math.ceil(ROUND_DURATION_SEC / BSC_BLOCK_TIME_SEC) + ROUND_SCAN_BLOCK_BUFFER

/**
 * 仅当前开放轮次：从「本轮开始」附近扫到 latest，避免从部署块全量扫。
 * @returns {Promise<{ roundIndex: number, inWindow: boolean, fromBlock: number | null }>}
 */
export async function resolveCurrentRoundLogScan(provider, mintContract, latestBlock) {
  const [roundIndex, inWindow] = await mintContract.mintingRound()
  const r = Number(roundIndex)
  if (!inWindow) {
    return { roundIndex: r, inWindow: false, fromBlock: null }
  }

  const roundStartTs = Number(await mintContract.roundStart(r))
  const latestBlockObj = await provider.getBlock(latestBlock)
  const elapsed = Math.max(0, latestBlockObj.timestamp - roundStartTs)
  const blocksSinceStart = Math.ceil(elapsed / BSC_BLOCK_TIME_SEC) + ROUND_SCAN_BLOCK_BUFFER
  const scanDepth = Math.min(blocksSinceStart, MAX_ROUND_SCAN_BLOCKS)

  let fromBlock = Math.max(0, latestBlock - scanDepth)
  const mintAddress = mintContract.target ?? ADDRESSES.mint
  const floor = resolveDeployFloorBlock(mintAddress)
  if (floor != null) {
    fromBlock = Math.max(fromBlock, floor)
  }

  return { roundIndex: r, inWindow: true, fromBlock }
}

function resolveDeployFloorBlock(mintAddress) {
  if (MINT_LOG_FROM_BLOCK != null && MINT_LOG_FROM_BLOCK > 0) {
    return MINT_LOG_FROM_BLOCK
  }
  if (!mintAddress) return null
  const known = KNOWN_MINT_LOG_FROM[getAddress(mintAddress).toLowerCase()]
  return known ?? null
}

export async function queryMintedLogsChunked(mintContract, wallet, fromBlock, toBlock) {
  const filter = mintContract.filters.Minted(wallet, null, null)
  const logs = []

  for (let start = fromBlock; start <= toBlock; start += LOG_CHUNK_SIZE) {
    const end = Math.min(start + LOG_CHUNK_SIZE - 1, toBlock)
    const chunk = await mintContract.queryFilter(filter, start, end)
    logs.push(...chunk)
  }

  return logs
}
