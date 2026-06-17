/** @ 成员：发送体组装与气泡分段 */

export const MAX_MENTIONS_PER_MESSAGE = 5

const MENTIONS_KIND = 'text_mentions'

/** 解析 text_content 中的 @ 扩展 JSON；纯文本原样返回 */
export function decodeTextMentionsPayload(textContent) {
  if (!textContent) return { text: '', mentions: [] }
  const raw = String(textContent).trim()
  if (!raw) return { text: '', mentions: [] }
  if (!raw.startsWith('{')) return { text: textContent, mentions: [] }
  try {
    const data = JSON.parse(raw)
    if (!data || data.kind !== MENTIONS_KIND) return { text: textContent, mentions: [] }
    const mentions = Array.isArray(data.mentions) ? data.mentions : []
    return { text: String(data.text || ''), mentions }
  } catch {
    return { text: textContent, mentions: [] }
  }
}

export function buildMentionsPayload(text, pendingMentions = []) {
  const body = String(text || '')
  if (!body || !pendingMentions?.length) return []
  const used = new Set()
  const out = []
  for (const m of pendingMentions) {
    if (out.length >= MAX_MENTIONS_PER_MESSAGE) break
    const uid = String(m?.userId || '').trim()
    const nick = String(m?.nickname || '').trim()
    if (!uid || !nick || used.has(uid)) continue
    const needle = `@${nick}`
    const start = body.indexOf(needle)
    if (start < 0) continue
    used.add(uid)
    out.push({
      userId: uid,
      nickname: nick,
      start,
      end: start + needle.length,
    })
  }
  return out
}

export function buildTextSegments(text, mentions = []) {
  const body = String(text || '')
  if (!body) return []
  const sorted = (mentions || [])
    .filter((m) => m && m.nickname && body.includes(`@${m.nickname}`))
    .map((m) => {
      const needle = `@${m.nickname}`
      const start = typeof m.start === 'number' ? m.start : body.indexOf(needle)
      const end = typeof m.end === 'number' ? m.end : start + needle.length
      return { ...m, start, end, needle }
    })
    .filter((m) => m.start >= 0 && m.end > m.start)
    .sort((a, b) => a.start - b.start)

  if (!sorted.length) {
    return [{ type: 'text', text: body }]
  }

  const segments = []
  let cursor = 0
  for (const m of sorted) {
    if (m.start < cursor) continue
    if (m.start > cursor) {
      segments.push({ type: 'text', text: body.slice(cursor, m.start) })
    }
    segments.push({
      type: 'mention',
      text: body.slice(m.start, m.end),
      userId: m.userId,
      nickname: m.nickname,
    })
    cursor = m.end
  }
  if (cursor < body.length) {
    segments.push({ type: 'text', text: body.slice(cursor) })
  }
  return segments.length ? segments : [{ type: 'text', text: body }]
}
