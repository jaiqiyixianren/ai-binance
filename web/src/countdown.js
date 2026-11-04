/**
 * @param {number} totalSec
 * @returns {{ d: number, h: number, m: number, s: number }}
 */
export function splitCountdown(totalSec) {
  const t = Math.max(0, Math.floor(totalSec))
  const d = Math.floor(t / 86400)
  const h = Math.floor((t % 86400) / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  return { d, h, m, s }
}

/**
 * @param {number} totalSec
 * @param {'en'|'zh'|'ja'} locale
 */
export function formatCountdownClock(totalSec, locale = 'en') {
  const { d, h, m, s } = splitCountdown(totalSec)
  const pad = (n) => String(n).padStart(2, '0')
  const time = `${pad(h)}:${pad(m)}:${pad(s)}`
  if (d > 0) {
    if (locale === 'zh') return `${d} 天 ${time}`
    if (locale === 'ja') return `${d}日 ${time}`
    return `${d}d ${time}`
  }
  return time
}

/**
 * @param {Array<{ index: number, startSec: number, endSec: number, finalized?: boolean }>} rows
 * @param {number} nowSec
 */
export function resolveNextRoundCountdown(rows, nowSec) {
  if (!rows?.length) return null
  const sorted = [...rows].sort((a, b) => a.index - b.index)
  const now = nowSec

  for (const row of sorted) {
    if (now < row.startSec) {
      return { kind: 'starts', roundIndex: row.index, targetSec: row.startSec }
    }
  }

  const active = sorted.find((r) => now >= r.startSec && now < r.endSec)
  if (active) {
    const next = sorted.find((r) => r.index === active.index + 1)
    if (next) {
      return { kind: 'next', roundIndex: next.index, targetSec: next.startSec }
    }
    return { kind: 'ends', roundIndex: active.index, targetSec: active.endSec }
  }

  const allEnded = sorted.every((r) => now >= r.endSec || r.finalized)
  if (allEnded) return { kind: 'done', roundIndex: null, targetSec: null }

  return null
}
