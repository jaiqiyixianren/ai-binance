import { JsonRpcProvider } from 'ethers'

const BSC_CHAIN_ID = 56

export const DEFAULT_BSC_RPC = 'https://bsc-dataseed.binance.org'

/** 只读展示页允许的 BSC HTTPS RPC 主机（防 .env 被篡改指向恶意节点） */
const ALLOWED_RPC_HOSTS = new Set([
  'bsc-dataseed.binance.org',
  'bsc-dataseed1.binance.org',
  'bsc-dataseed2.binance.org',
  'bsc-dataseed3.binance.org',
  'bsc-dataseed4.binance.org',
  'bsc-dataseed.bnbchain.org',
  'bsc.publicnode.com',
  'rpc.ankr.com',
  'binance.llamarpc.com',
  'bsc-mainnet.public.blastapi.io',
  '1rpc.io',
])

const RPC_REQUEST_TIMEOUT_MS = 28_000

/**
 * @param {string | undefined} envUrl VITE_BSC_RPC
 * @returns {string}
 */
export function resolvePublicBscRpcUrl(envUrl) {
  const raw = (envUrl || DEFAULT_BSC_RPC).trim()
  try {
    const u = new URL(raw)
    if (u.protocol !== 'https:') return DEFAULT_BSC_RPC
    if (u.username || u.password || u.hash) return DEFAULT_BSC_RPC
    if (!ALLOWED_RPC_HOSTS.has(u.hostname)) return DEFAULT_BSC_RPC
    return u.origin
  } catch {
    return DEFAULT_BSC_RPC
  }
}

/** @returns {string[]} CSP connect-src 主机源（build 时注入） */
export function cspConnectSourcesForEnv(envUrl) {
  const url = resolvePublicBscRpcUrl(envUrl)
  const hosts = new Set(['https://bsc-dataseed.binance.org'])
  try {
    hosts.add(new URL(url).origin)
  } catch {
    /* ignore */
  }
  for (const h of ALLOWED_RPC_HOSTS) {
    hosts.add(`https://${h}`)
  }
  return [...hosts]
}

let sharedProvider
let sharedUrl

export function createBscReadProvider() {
  const url = resolvePublicBscRpcUrl(import.meta.env.VITE_BSC_RPC)
  if (!sharedProvider || sharedUrl !== url) {
    sharedUrl = url
    sharedProvider = new JsonRpcProvider(url, BSC_CHAIN_ID, {
      staticNetwork: true,
      batchMaxCount: 4,
    })
  }
  return sharedProvider
}

export function withRpcTimeout(promise, ms = RPC_REQUEST_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('RPC timeout')), ms)
    }),
  ])
}
