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
  return msg.text || ''
}
