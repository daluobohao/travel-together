/** 活动群聊本地缓存（Storage），用于进页秒开；服务端仍为权威数据源。 */

export const ACTIVITY_CHAT_CACHE_PREFIX = 'wm_activity_chat_'
const MAX_MESSAGES_PER_ACTIVITY = 200

export function normalizeActivityChatId(activityId) {
  const s = String(activityId || '').trim()
  if (!s) return ''
  return s.startsWith('act_') ? s : `act_${s}`
}

function cacheKey(activityId) {
  const id = normalizeActivityChatId(activityId)
  return id ? `${ACTIVITY_CHAT_CACHE_PREFIX}${id}` : ''
}

export function parseMessagePk(messageId) {
  const s = String(messageId || '').replace(/^msg_/, '')
  if (!/^\d+$/.test(s)) return 0
  return parseInt(s, 10)
}

/** 取列表中最后一条服务端消息 id（忽略 temp_ 乐观消息） */
export function getLastServerMessageId(messages) {
  let maxPk = 0
  let maxId = null
  for (const m of messages || []) {
    const id = m?.id
    if (!id || String(id).startsWith('temp_')) continue
    const pk = parseMessagePk(id)
    if (pk > maxPk) {
      maxPk = pk
      maxId = id
    }
  }
  return maxId
}

export function sortMessagesByTime(list) {
  return [...(list || [])].sort((a, b) => {
    const ta = new Date(a?.createdAt || 0).getTime()
    const tb = new Date(b?.createdAt || 0).getTime()
    if (ta !== tb) return ta - tb
    return parseMessagePk(a?.id) - parseMessagePk(b?.id)
  })
}

export function mergeMessageLists(existing, incoming) {
  const map = new Map()
  for (const m of existing || []) {
    if (m?.id) map.set(m.id, m)
  }
  for (const m of incoming || []) {
    if (!m?.id) continue
    const prev = map.get(m.id)
    map.set(m.id, prev ? { ...prev, ...m } : m)
  }
  const merged = sortMessagesByTime(Array.from(map.values()))
  if (merged.length <= MAX_MESSAGES_PER_ACTIVITY) return merged
  return merged.slice(-MAX_MESSAGES_PER_ACTIVITY)
}

export function loadActivityChatCache(activityId) {
  const key = cacheKey(activityId)
  if (!key) return []
  try {
    const raw = uni.getStorageSync(key)
    if (!raw || !Array.isArray(raw.messages)) return []
    return sortMessagesByTime(raw.messages)
  } catch {
    return []
  }
}

export function saveActivityChatCache(activityId, messages) {
  const key = cacheKey(activityId)
  if (!key) return
  const sorted = sortMessagesByTime(messages)
  const trimmed =
    sorted.length <= MAX_MESSAGES_PER_ACTIVITY
      ? sorted
      : sorted.slice(-MAX_MESSAGES_PER_ACTIVITY)
  try {
    uni.setStorageSync(key, {
      activityId: normalizeActivityChatId(activityId),
      updatedAt: Date.now(),
      messages: trimmed,
    })
  } catch (e) {
    console.warn('[activityChatCache] save failed', e)
  }
}

/** 登出时清空所有活动群聊缓存 */
export function clearAllActivityChatCaches() {
  try {
    const info = uni.getStorageInfoSync()
    const keys = info?.keys || []
    for (const k of keys) {
      if (String(k).startsWith(ACTIVITY_CHAT_CACHE_PREFIX)) {
        uni.removeStorageSync(k)
      }
    }
  } catch (e) {
    console.warn('[activityChatCache] clear failed', e)
  }
}
