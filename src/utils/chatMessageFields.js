import { getStickerEmoji } from '@/constants/chatStickers'

export function inferMsgType(raw) {
  if (raw?.msgType) return raw.msgType
  if (raw?.recActivityId) return 'activity_rec'
  if (raw?.stickerId) return 'sticker'
  if (raw?.imageUrl) return 'image'
  if (raw?.locationName != null && raw?.lat != null && raw?.lng != null) return 'location'
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
    locationName: msgType === 'location' ? raw?.locationName || '' : '',
    address: msgType === 'location' ? raw?.address || '' : '',
    lat: msgType === 'location' ? raw?.lat : null,
    lng: msgType === 'location' ? raw?.lng : null,
    recActivityId: msgType === 'activity_rec' ? raw?.recActivityId || '' : '',
    recActivityTitle: msgType === 'activity_rec' ? raw?.recActivityTitle || '' : '',
  }
}
