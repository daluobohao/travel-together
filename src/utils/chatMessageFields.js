import { getStickerEmoji } from '@/constants/chatStickers'

export function inferMsgType(raw) {
  if (raw?.msgType) return raw.msgType
  if (raw?.stickerId) return 'sticker'
  if (raw?.imageUrl) return 'image'
  return 'text'
}

/** 从接口/Mock 原始消息解析展示字段 */
export function parseChatMessageFields(raw) {
  const msgType = inferMsgType(raw)
  const stickerId = msgType === 'sticker' ? raw?.stickerId || '' : ''
  return {
    msgType,
    text: msgType === 'text' ? raw?.text || '' : '',
    imageUrl: msgType === 'image' ? raw?.imageUrl || '' : '',
    stickerId,
    stickerEmoji: msgType === 'sticker' ? getStickerEmoji(stickerId) : '',
  }
}
