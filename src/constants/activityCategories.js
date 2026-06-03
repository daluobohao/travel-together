/** 活动一级 / 二级分类（与后端 ``activity_category.py`` 对齐） */

export const ACTIVITY_CATEGORY_OTHER = 'other'

export const FALLBACK_ACTIVITY_CATEGORIES = [
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
    ],
  },
  {
    categoryId: 'games',
    name: '游戏娱乐',
    subcategories: [
      { subCategoryId: 'boardgame', name: '桌游' },
      { subCategoryId: 'escape_room', name: '密室' },
      { subCategoryId: 'esports', name: '电竞' },
      { subCategoryId: 'mahjong', name: '棋牌' },
    ],
  },
  {
    categoryId: 'outdoor',
    name: '户外自然',
    subcategories: [
      { subCategoryId: 'hiking', name: '徒步' },
      { subCategoryId: 'camping', name: '露营' },
      { subCategoryId: 'cycling', name: '骑行' },
      { subCategoryId: 'climbing', name: '攀岩' },
    ],
  },
  {
    categoryId: 'dining',
    name: '吃喝探店',
    subcategories: [
      { subCategoryId: 'meal', name: '约饭' },
      { subCategoryId: 'bar', name: '小酌' },
      { subCategoryId: 'explore_food', name: '探店' },
      { subCategoryId: 'afternoon_tea', name: '下午茶' },
    ],
  },
  {
    categoryId: 'culture',
    name: '文娱体验',
    subcategories: [
      { subCategoryId: 'exhibit', name: '展览' },
      { subCategoryId: 'show', name: '演出' },
      { subCategoryId: 'movie', name: '电影' },
      { subCategoryId: 'live', name: 'Live' },
      { subCategoryId: 'sport_watch', name: '观赛' },
    ],
  },
  {
    categoryId: 'social',
    name: '轻社交',
    subcategories: [
      { subCategoryId: 'coffee', name: '咖啡' },
      { subCategoryId: 'tea_chat', name: '茶叙' },
      { subCategoryId: 'icebreak', name: '破冰' },
      { subCategoryId: 'chat', name: '随便聊聊' },
    ],
  },
  {
    categoryId: 'cowork',
    name: '学习共创',
    subcategories: [
      { subCategoryId: 'language', name: '语言' },
      { subCategoryId: 'coworking', name: '联合办公' },
      { subCategoryId: 'side_project', name: '副业分享' },
      { subCategoryId: 'talk', name: '分享会' },
    ],
  },
  {
    categoryId: 'citywalk',
    name: 'Citywalk·探索',
    subcategories: [
      { subCategoryId: 'walk', name: '城市漫步' },
      { subCategoryId: 'photo', name: '扫街摄影' },
      { subCategoryId: 'route', name: '路线打卡' },
    ],
  },
  {
    categoryId: 'travel',
    name: '旅行·结伴',
    subcategories: [
      { subCategoryId: 'day_trip', name: '短途' },
      { subCategoryId: 'weekend', name: '周边游' },
      { subCategoryId: 'multi_day', name: '多日游' },
      { subCategoryId: 'carpool', name: '拼车结伴' },
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
  dining: '约饭·探店',
  photography: '摄影扫街',
  exhibit: '展览',
  night_run: '夜跑',
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
  const l1 = CATEGORY_BY_ID[cid]?.name || LEGACY_CATEGORY_NAMES[cid] || cid || '活动'
  const sid = String(subCategoryId || '').trim()
  if (!sid) return l1
  const sub = SUB_NAME_BY_PAIR[`${cid}:${sid}`] || sid
  return `${l1} · ${sub}`
}

export function getSubCategoryName(categoryId, subCategoryId) {
  return SUB_NAME_BY_PAIR[`${categoryId}:${subCategoryId}`] || subCategoryId || ''
}

export function publishTitlePlaceholder(categoryId, subCategoryId) {
  const sub = getSubCategoryName(categoryId, subCategoryId)
  if (categoryId === 'sports' && subCategoryId === 'basketball') return '周末 XX 篮球局，差 2 人'
  if (sub) return `周末 ${sub} 局，一起来`
  const l1 = CATEGORY_BY_ID[categoryId]?.name
  if (l1) return `给这场${l1}活动起个名字`
  return '给活动起个吸引人的名字'
}

/** 发现页一级入口图标 / 配色 */
export const ACTIVITY_CATEGORY_VISUAL = {
  sports: { icon: 'run', bg: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', color: '#dc2626' },
  games: { icon: 'dice', bg: 'linear-gradient(135deg, #e7e5e4 0%, #d6d3d1 100%)', color: '#44403c' },
  outdoor: { icon: 'hike', bg: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', color: '#047857' },
  dining: { icon: 'utensil', bg: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)', color: '#0369a1' },
  culture: { icon: 'palette', bg: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)', color: '#7c3aed' },
  social: { icon: 'coffee', bg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', color: '#b45309' },
  cowork: { icon: 'laptop', bg: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)', color: '#0284c7' },
  citywalk: { icon: 'walk', bg: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)', color: '#4f46e5' },
  travel: { icon: 'globe', bg: 'linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%)', color: '#0e7490' },
  other: { icon: 'tag', bg: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)', color: '#475569' },
  // 旧版 id 兜底
  coffee: { icon: 'coffee', bg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', color: '#b45309' },
  hiking: { icon: 'hike', bg: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', color: '#047857' },
  boardgame: { icon: 'dice', bg: 'linear-gradient(135deg, #e7e5e4 0%, #d6d3d1 100%)', color: '#44403c' },
}

export const ACTIVITY_CATEGORY_COLOR_MAP = {
  sports: { color: '#dc2626', bg: '#fef2f2', label: '运动健身' },
  games: { color: '#44403c', bg: '#f5f5f4', label: '游戏娱乐' },
  outdoor: { color: '#047857', bg: '#ecfdf5', label: '户外自然' },
  dining: { color: '#0369a1', bg: '#e0f2fe', label: '吃喝探店' },
  culture: { color: '#7c3aed', bg: '#ede9fe', label: '文娱体验' },
  social: { color: '#b45309', bg: '#fef3c7', label: '轻社交' },
  cowork: { color: '#0284c7', bg: '#e0f2fe', label: '学习共创' },
  citywalk: { color: '#4f46e5', bg: '#e0e7ff', label: 'Citywalk·探索' },
  travel: { color: '#0e7490', bg: '#cffafe', label: '旅行·结伴' },
  other: { color: '#64748b', bg: '#f1f5f9', label: '其他' },
  ...Object.fromEntries(
    Object.entries(LEGACY_CATEGORY_NAMES).map(([id, label]) => [
      id,
      { color: '#64748b', bg: '#f1f5f9', label },
    ]),
  ),
}
