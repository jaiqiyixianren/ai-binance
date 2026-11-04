/** 避免把 RPC/HTML 等冗长响应直接展示给用户 */
export function safeUserError(err, fallback = 'Request failed. Try again later.') {
  const raw = err?.shortMessage || err?.message || String(err ?? '')
  const msg = raw.trim()
  if (!msg || msg.length > 280) return fallback
  if (/https?:\/\//i.test(msg) || /<html/i.test(msg)) return fallback
  if (/401|403|429|502|503|504|timeout/i.test(msg)) {
    return 'Network or RPC busy — try again in a moment.'
  }
  return msg
}
