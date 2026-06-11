/** 活动一级 / 二级分类（与后端 ``activity_category.py`` 对齐） */

export const ACTIVITY_CATEGORY_OTHER = 'other'

export const FALLBACK_ACTIVITY_CATEGORIES = [
  {
    categoryId: 'dining',
    name: '吃吃喝喝',
    subcategories: [
      { subCategoryId: 'meal', name: '约饭' },
      { subCategoryId: 'coffee', name: '咖啡' },
      { subCategoryId: 'tea_tasting', name: '品茶' },
      { subCategoryId: 'afternoon_tea', name: '下午茶' },
      { subCategoryId: 'bar', name: '小酌一下' },
    ],
  },
  {
    categoryId: 'leisure',
    name: '休闲娱乐',
    subcategories: [
      { subCategoryId: 'karaoke', name: 'K歌' },
      { subCategoryId: 'movie', name: '看电影' },
      { subCategoryId: 'escape_room', name: '密室' },
      { subCategoryId: 'script_murder', name: '剧本杀' },
      { subCategoryId: 'billiards', name: '台球' },
      { subCategoryId: 'mahjong', name: '棋牌' },
      { subCategoryId: 'arcade', name: '电玩' },
      { subCategoryId: 'diy', name: '拼豆/DIY' },
      { subCategoryId: 'cat_mouse', name: '猫鼠游戏' },
    ],
  },
  {
    categoryId: 'shows',
    name: '观影演出',
    subcategories: [
      { subCategoryId: 'concert', name: '演唱会' },
      { subCategoryId: 'talk_show', name: '脱口秀' },
      { subCategoryId: 'esports', name: '电竞' },
      { subCategoryId: 'drama', name: '话剧' },
      { subCategoryId: 'musical', name: '音乐剧' },
      { subCategoryId: 'crosstalk', name: '相声' },
    ],
  },
  {
    categoryId: 'sports',
    name: '运动健身',
    subcategories: [
      { subCategoryId: 'basketball', name: '篮球' },
      { subCategoryId: 'badminton', name: '羽毛球' },
      { subCategoryId: 'tennis', name: '网球' },
      { subCategoryId: 'running', name: '跑步' },
      { subCategoryId: 'fitness', name: '健身' },
      { subCategoryId: 'frisbee', name: '飞盘' },
      { subCategoryId: 'swim', name: '游泳' },
      { subCategoryId: 'yoga', name: '瑜伽' },
    ],
  },
  {
    categoryId: 'outdoor',
    name: '户外自然',
    subcategories: [
      { subCategoryId: 'skiing', name: '滑雪' },
      { subCategoryId: 'hiking', name: '徒步' },
      { subCategoryId: 'picnic', name: '野炊' },
      { subCategoryId: 'cycling', name: '骑行' },
      { subCategoryId: 'climbing', name: '攀岩' },
      { subCategoryId: 'offroad', name: '越野' },
      { subCategoryId: 'fishing', name: '钓鱼' },
      { subCategoryId: 'picking', name: '采摘' },
      { subCategoryId: 'photography', name: '摄影' },
    ],
  },
  {
    categoryId: 'travel',
    name: '旅行结伴',
    subcategories: [
      { subCategoryId: 'summer_escape', name: '夏季避暑' },
      { subCategoryId: 'winter_escape', name: '冬季避寒' },
      { subCategoryId: 'weekend_trip', name: '周边游' },
    ],
  },
  {
    categoryId: 'learning',
    name: '学习交流',
    subcategories: [
      { subCategoryId: 'book_club', name: '读书分享' },
      { subCategoryId: 'talent', name: '才艺展示' },
      { subCategoryId: 'professional', name: '专业交流' },
      { subCategoryId: 'language_culture', name: '语言文化' },
    ],
  },
  { categoryId: ACTIVITY_CATEGORY_OTHER, name: '其他', subcategories: [] },
]

const LEGACY_CATEGORY_NAMES = {
  coffee: '咖啡',
  citywalk: 'Citywalk',
  hiking: '徒步',
  boardgame: '桌游',
  coworking: '联合办公·共创',
  indie: '副业·独立开发',
  language: '语言交换',
  photography: '摄影扫街',
  exhibit: '展览',
  night_run: '夜跑',
}

const RETIRED_L1_NAMES = {
  games: '游戏娱乐',
  culture: '文娱体验',
  social: '轻社交',
  cowork: '学习共创',
  citywalk: 'Citywalk·探索',
}

const LEGACY_L1_SUBS = {
  games: {
    boardgame: '桌游',
    escape_room: '密室',
    esports: '电竞',
    mahjong: '棋牌',
  },
  culture: {
    exhibit: '展览',
    show: '演出',
    movie: '电影',
    live: 'Live',
    sport_watch: '观赛',
  },
  social: {
    coffee: '咖啡',
    tea_chat: '茶叙',
    icebreak: '破冰',
    chat: '随便聊聊',
  },
  cowork: {
    language: '语言',
    coworking: '联合办公',
    side_project: '副业分享',
    talk: '分享会',
  },
  citywalk: {
    walk: '城市漫步',
    photo: '扫街摄影',
    route: '路线打卡',
  },
  dining: {
    explore_food: '探店',
    bar: '小酌',
  },
  outdoor: {
    camping: '露营',
  },
  travel: {
    day_trip: '短途',
    weekend: '周边游',
    multi_day: '多日游',
    carpool: '拼车结伴',
  },
}

const CATEGORY_BY_ID = FALLBACK_ACTIVITY_CATEGORIES.reduce((acc, c) => {
  acc[c.categoryId] = c
  return acc
}, {})

const SUB_NAME_BY_PAIR = {}
FALLBACK_ACTIVITY_CATEGORIES.forEach((c) => {
  ;(c.subcategories || []).forEach((s) => {
    SUB_NAME_BY_PAIR[`${c.categoryId}:${s.subCategoryId}`] = s.name
  })
})

function primaryCategoryName(categoryId) {
  const cid = String(categoryId || '').trim()
  if (CATEGORY_BY_ID[cid]) return CATEGORY_BY_ID[cid].name
  if (RETIRED_L1_NAMES[cid]) return RETIRED_L1_NAMES[cid]
  return LEGACY_CATEGORY_NAMES[cid] || cid || '活动'
}

function subCategoryName(categoryId, subCategoryId) {
  const sid = String(subCategoryId || '').trim()
  if (!sid) return ''
  const key = `${categoryId}:${sid}`
  if (SUB_NAME_BY_PAIR[key]) return SUB_NAME_BY_PAIR[key]
  return LEGACY_L1_SUBS[categoryId]?.[sid] || sid
}

export function normalizeCategoryList(categories) {
  const list = Array.isArray(categories) && categories.length ? categories : FALLBACK_ACTIVITY_CATEGORIES
  return list.map((c) => ({
    categoryId: c.categoryId,
    name: c.name,
    subcategories: (c.subcategories || []).map((s) => ({
      subCategoryId: s.subCategoryId,
      name: s.name,
    })),
  }))
}

export function formatActivityCategoryDisplay(categoryId, subCategoryId, categoryLabel, categoryDisplay) {
  if (categoryDisplay) return categoryDisplay
  const cid = String(categoryId || '').trim()
  if (cid === ACTIVITY_CATEGORY_OTHER) {
    const theme = String(categoryLabel || '').trim()
    return theme ? `其他 · ${theme}` : '其他'
  }
  if (LEGACY_CATEGORY_NAMES[cid] && !subCategoryId) return LEGACY_CATEGORY_NAMES[cid]
  const l1 = primaryCategoryName(cid)
  const sub = subCategoryName(cid, subCategoryId)
  if (!sub) return l1
  return `${l1} · ${sub}`
}

export function getSubCategoryName(categoryId, subCategoryId) {
  return subCategoryName(categoryId, subCategoryId) || subCategoryId || ''
}

export function publishTitlePlaceholder(categoryId, subCategoryId) {
  const sub = getSubCategoryName(categoryId, subCategoryId)
  if (categoryId === 'sports' && subCategoryId === 'basketball') return '周末 XX 篮球局，差 2 人'
  if (sub) return `周末 ${sub} 局，一起来`
  const l1 = CATEGORY_BY_ID[categoryId]?.name
  if (l1) return `给这场${l1}活动起个名字`
  return '给活动起个吸引人的名字'
}

/** 发现页 / 卡片一级入口图标 / 配色 */
export const ACTIVITY_CATEGORY_VISUAL = {
  dining: { icon: 'utensil', bg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', color: '#b45309' },
  leisure: { icon: 'dice', bg: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)', color: '#be185d' },
  shows: { icon: 'palette', bg: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)', color: '#7c3aed' },
  sports: { icon: 'run', bg: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', color: '#dc2626' },
  outdoor: { icon: 'hike', bg: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', color: '#047857' },
  travel: { icon: 'globe', bg: 'linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%)', color: '#0e7490' },
  learning: { icon: 'laptop', bg: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)', color: '#0284c7' },
  other: { icon: 'tag', bg: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)', color: '#475569' },
  // 已下线 / 旧版 id 兜底
  games: { icon: 'dice', bg: 'linear-gradient(135deg, #e7e5e4 0%, #d6d3d1 100%)', color: '#44403c' },
  culture: { icon: 'palette', bg: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)', color: '#7c3aed' },
  social: { icon: 'coffee', bg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', color: '#b45309' },
  cowork: { icon: 'laptop', bg: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)', color: '#0284c7' },
  citywalk: { icon: 'walk', bg: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)', color: '#4f46e5' },
  coffee: { icon: 'coffee', bg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', color: '#b45309' },
  hiking: { icon: 'hike', bg: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', color: '#047857' },
  boardgame: { icon: 'dice', bg: 'linear-gradient(135deg, #e7e5e4 0%, #d6d3d1 100%)', color: '#44403c' },
}

export const ACTIVITY_CATEGORY_COLOR_MAP = {
  dining: { color: '#b45309', bg: '#fef3c7', label: '吃吃喝喝' },
  leisure: { color: '#be185d', bg: '#fce7f3', label: '休闲娱乐' },
  shows: { color: '#7c3aed', bg: '#ede9fe', label: '观影演出' },
  sports: { color: '#dc2626', bg: '#fef2f2', label: '运动健身' },
  outdoor: { color: '#047857', bg: '#ecfdf5', label: '户外自然' },
  travel: { color: '#0e7490', bg: '#cffafe', label: '旅行结伴' },
  learning: { color: '#0284c7', bg: '#e0f2fe', label: '学习交流' },
  other: { color: '#64748b', bg: '#f1f5f9', label: '其他' },
  games: { color: '#44403c', bg: '#f5f5f4', label: '游戏娱乐' },
  culture: { color: '#7c3aed', bg: '#ede9fe', label: '文娱体验' },
  social: { color: '#b45309', bg: '#fef3c7', label: '轻社交' },
  cowork: { color: '#0284c7', bg: '#e0f2fe', label: '学习共创' },
  citywalk: { color: '#4f46e5', bg: '#e0e7ff', label: 'Citywalk·探索' },
  ...Object.fromEntries(
    Object.entries(LEGACY_CATEGORY_NAMES).map(([id, label]) => [
      id,
      { color: '#64748b', bg: '#f1f5f9', label },
    ]),
  ),
}
