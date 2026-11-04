/** 浏览器端查卡限流，减轻 RPC 被刷与误操作 */
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 8
const MIN_GAP_MS = 2_000

const timestamps = []

export function assertLookupAllowed() {
  const now = Date.now()
  while (timestamps.length && now - timestamps[0] > WINDOW_MS) {
    timestamps.shift()
  }
  if (timestamps.length >= MAX_PER_WINDOW) {
    throw new Error('Too many lookups — wait a minute and try again.')
  }
  const last = timestamps[timestamps.length - 1]
  if (last != null && now - last < MIN_GAP_MS) {
    throw new Error('Please wait a few seconds between lookups.')
  }
  timestamps.push(now)
}
