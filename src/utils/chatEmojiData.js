import { STICKER_PACKS } from '@/constants/chatStickers'

export const EMOJI_GROUPS = [
  {
    id: 'smile',
    name: '笑脸',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇'],
  },
  {
    id: 'gesture',
    name: '手势',
    emojis: ['👍', '👎', '👌', '🙏', '👏', '🤝', '💪', '🙋', '🤙', '✌️', '🤞', '👋'],
  },
  {
    id: 'heart',
    name: '心情',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '😍', '🥰', '😘'],
  },
  {
    id: 'travel',
    name: '出行',
    emojis: ['✈️', '🚗', '🏕️', '⛰️', '🌊', '🗺️', '📸', '🎒', '🧳', '☀️', '🌧️', '❄️'],
  },
]

export const FLAT_EMOJIS = EMOJI_GROUPS.flatMap((g) => g.emojis)

export const PANEL_TABS = [
  { id: 'emoji', name: '常用', kind: 'emoji' },
  ...STICKER_PACKS.map((p) => ({ id: p.id, name: p.name, kind: 'sticker' })),
]

export function stickersForTab(tabId) {
  const pack = STICKER_PACKS.find((p) => p.id === tabId)
  return pack?.stickers || []
}
