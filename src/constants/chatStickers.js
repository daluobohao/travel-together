/** 官方贴纸 catalog（id 须与后端 app/services/chat_stickers.py 一致） */

export const STICKER_PACKS = [
  {
    id: 'travel',
    name: '旅聚',
    stickers: [
      { id: 'travel_wave', emoji: '👋' },
      { id: 'travel_hi', emoji: '🙋' },
      { id: 'travel_map', emoji: '🗺️' },
      { id: 'travel_hike', emoji: '🥾' },
      { id: 'travel_coffee', emoji: '☕' },
      { id: 'travel_sun', emoji: '🌤️' },
      { id: 'travel_camera', emoji: '📷' },
      { id: 'travel_tent', emoji: '⛺' },
    ],
  },
  {
    id: 'react',
    name: '互动',
    stickers: [
      { id: 'react_ok', emoji: '👌' },
      { id: 'react_thanks', emoji: '🙏' },
      { id: 'react_love', emoji: '❤️' },
      { id: 'react_laugh', emoji: '😂' },
      { id: 'react_cool', emoji: '😎' },
      { id: 'react_clap', emoji: '👏' },
      { id: 'react_party', emoji: '🎉' },
      { id: 'react_sad', emoji: '😢' },
    ],
  },
]

const STICKER_EMOJI_MAP = Object.create(null)

for (const pack of STICKER_PACKS) {
  for (const s of pack.stickers) {
    STICKER_EMOJI_MAP[s.id] = s.emoji
  }
}

export function getStickerEmoji(stickerId) {
  if (!stickerId) return ''
  return STICKER_EMOJI_MAP[stickerId] || '❓'
}

export function isKnownStickerId(stickerId) {
  return !!stickerId && Object.prototype.hasOwnProperty.call(STICKER_EMOJI_MAP, stickerId)
}
