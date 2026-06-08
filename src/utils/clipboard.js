/** 复制到剪贴板（小程序） */
export function copyTextToClipboard(text, { emptyHint = '暂无可复制内容', successHint = '已复制' } = {}) {
  const data = String(text || '').trim()
  if (!data) {
    uni.showToast({ title: emptyHint, icon: 'none' })
    return
  }
  uni.setClipboardData({
    data,
    success: () => {
      uni.showToast({ title: successHint, icon: 'none' })
    },
    fail: () => {
      uni.showToast({ title: '复制失败', icon: 'none' })
    },
  })
}

/** 聊天消息可复制内容 */
export function chatMessageCopyText(msg) {
  if (!msg) return ''
  if (msg.msgType === 'image') return msg.imageUrl || ''
  if (msg.msgType === 'sticker') return msg.stickerEmoji || ''
  if (msg.msgType === 'location') {
    const name = msg.locationName || '位置'
    const addr = msg.address || ''
    const coords =
      msg.lat != null && msg.lng != null ? `（${msg.lat},${msg.lng}）` : ''
    return [name, addr, coords].filter(Boolean).join(' ')
  }
  if (msg.msgType === 'chain_signup') {
    const lines = [`[接龙] ${msg.chainTitle || ''}`.trim()]
    for (const [i, e] of (msg.chainEntries || []).entries()) {
      const note = e.note ? ` ${e.note}` : ''
      lines.push(`${i + 1}. ${e.nickname || '用户'}${note}`)
    }
    return lines.join('\n')
  }
  return msg.text || ''
}
