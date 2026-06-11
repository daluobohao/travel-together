/** 群聊角标数字：≥100 展示 99+；≤0 返回空字符串 */
export function formatChatBadgeCount(count) {
  const n = Number(count) || 0
  if (n <= 0) return ''
  if (n >= 100) return '99+'
  return String(n)
}

/** 已进群展示未读，未进群展示总消息数 */
export function resolveChatBadgeCount({ joined, unreadCount, messageCount }) {
  const raw = joined ? Number(unreadCount) || 0 : Number(messageCount) || 0
  return formatChatBadgeCount(raw)
}
