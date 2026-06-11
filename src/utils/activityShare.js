/** 非活动详情页：分享统一落到首页（带 src 归因）；邀请链仍走 entry */
import {
  SHARE_SRC_FRIEND,
  SHARE_SRC_TIMELINE,
  appendShareSrcToPath,
  appendShareSrcToQuery,
} from '@/utils/acquisitionSource'

export const DEFAULT_MINI_PROGRAM_SHARE = {
  title: '去旅聚 · 发现身边的活动',
  path: appendShareSrcToPath('/pages/home/home', SHARE_SRC_FRIEND),
}

export function buildDefaultTimelineShare() {
  return {
    title: DEFAULT_MINI_PROGRAM_SHARE.title,
    query: appendShareSrcToQuery('', SHARE_SRC_TIMELINE),
  }
}

/** 登录/引导等页面不宜作为分享落地页，统一回首页 */
const SHARE_FALLBACK_ROUTES = new Set([
  'pages/login/login',
  'pages/onboarding/onboarding',
  'pages/bind-phone/bind-phone',
  'pages/forgot-password/forgot-password',
])

function getCurrentPageContext() {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  if (!current) return { route: '', options: {} }
  const route = current.route || current.$page?.fullPath?.split('?')[0]?.replace(/^\//, '') || ''
  const options = current.options || current.$page?.options || {}
  return { route, options }
}

function buildPageQuery(options) {
  return Object.keys(options)
    .filter((key) => options[key] != null && options[key] !== '')
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(options[key]))}`)
    .join('&')
}

/** 全局默认分享：当前页（带 query）；敏感页回首页 */
export function buildCurrentPageShareMessage(title = DEFAULT_MINI_PROGRAM_SHARE.title) {
  const { route, options } = getCurrentPageContext()
  if (!route || SHARE_FALLBACK_ROUTES.has(route)) {
    return { ...DEFAULT_MINI_PROGRAM_SHARE }
  }
  const query = buildPageQuery(options)
  const path = query ? `/${route}?${query}` : `/${route}`
  return {
    title,
    path: appendShareSrcToPath(path, SHARE_SRC_FRIEND),
  }
}

/** 全局默认朋友圈分享 */
export function buildCurrentPageTimelineShare(title = DEFAULT_MINI_PROGRAM_SHARE.title) {
  const { route, options } = getCurrentPageContext()
  if (!route || SHARE_FALLBACK_ROUTES.has(route)) {
    return { title }
  }
  const query = buildPageQuery(options)
  const q = appendShareSrcToQuery(query, SHARE_SRC_TIMELINE)
  return q ? { title, query: q } : buildDefaultTimelineShare()
}

/** 首页分享标题（可带城市） */
export function buildHomeShareMessage(cityName) {
  const city = (cityName && String(cityName).trim()) || ''
  const title = city ? `去旅聚 · ${city}附近的活动` : DEFAULT_MINI_PROGRAM_SHARE.title
  return { title, path: DEFAULT_MINI_PROGRAM_SHARE.path }
}

/** 同城动态 Tab 分享 */
export const DISCOVER_PAGE_SHARE = {
  title: '去旅聚 · 同城动态',
  path: appendShareSrcToPath('/pages/discover/discover', SHARE_SRC_FRIEND),
}

export function buildDiscoverShareMessage(cityName) {
  const city = (cityName && String(cityName).trim()) || ''
  const title = city ? `去旅聚 · ${city}同城动态` : DISCOVER_PAGE_SHARE.title
  return { title, path: DISCOVER_PAGE_SHARE.path }
}

export function buildDiscoverShareClipboardText(cityName) {
  const city = (cityName && String(cityName).trim()) || ''
  const headline = city ? `【去旅聚】${city}同城动态` : '【去旅聚】同城动态'
  return [
    headline,
    '在微信中打开「去旅聚」小程序：可点右上角「···」转发；或把下方页面路径发给已安装该小程序的朋友。',
    `页面路径：${DISCOVER_PAGE_SHARE.path}`,
  ].join('\n')
}

/** 复制首页分享说明（微信粘贴发给好友） */
export function buildHomeShareClipboardText(cityName) {
  const city = (cityName && String(cityName).trim()) || ''
  const headline = city ? `【去旅聚】${city}附近的活动` : '【去旅聚】发现身边的活动'
  return [
    headline,
    '在微信中打开「去旅聚」小程序：可点右上角「···」转发；或把下方页面路径发给已安装该小程序的朋友。',
    `页面路径：${DEFAULT_MINI_PROGRAM_SHARE.path}`,
  ].join('\n')
}

/** 活动分享落地首页时携带的活动 ID 参数 */
export const SHARED_ACTIVITY_QUERY_KEY = 'sharedActivityId'

/** 活动详情分享 / 复制（微信小程序 path + 说明文案） */

export function buildActivityDetailPath(activityId) {
  const id = encodeURIComponent(String(activityId || '').trim())
  return `/pages/activity-detail/activity-detail?id=${id}`
}

export function normalizeShareActivityId(raw) {
  const s = String(raw || '').trim()
  if (!s) return ''
  return s.replace(/^act_/i, '')
}

/** 首页落地并置顶该活动（好友分享 path） */
export function buildHomeSharePathWithActivity(activityId) {
  const id = normalizeShareActivityId(activityId)
  if (!id) return DEFAULT_MINI_PROGRAM_SHARE.path
  const base = `/pages/home/home?${SHARED_ACTIVITY_QUERY_KEY}=${encodeURIComponent(id)}`
  return appendShareSrcToPath(base, SHARE_SRC_FRIEND)
}

export function parseSharedActivityIdFromQuery(options = {}) {
  return normalizeShareActivityId(options[SHARED_ACTIVITY_QUERY_KEY] || options.id)
}

/** 供 ``onShareAppMessage`` 使用：落地首页 + 置顶活动 */
export function buildActivityShareMessage(activity) {
  if (!activity?.id) {
    return { title: '去旅聚 · 发现身边的活动', path: DEFAULT_MINI_PROGRAM_SHARE.path }
  }
  const title = (activity.title && String(activity.title).trim().slice(0, 64)) || '去旅聚活动'
  return {
    title,
    path: buildHomeSharePathWithActivity(activity.id),
  }
}

/** 供 ``onShareTimeline`` 的 query（无 ``?``）；朋友圈仍从详情页发起，由详情页重定向到首页 */
export function buildActivityTimelineQuery(activityId) {
  const id = normalizeShareActivityId(activityId)
  const base = id ? `${SHARED_ACTIVITY_QUERY_KEY}=${encodeURIComponent(id)}` : ''
  return appendShareSrcToQuery(base, SHARE_SRC_TIMELINE)
}

/** 复制到剪贴板：标题 + 打开方式 + 小程序页面路径 */
export function buildActivityShareClipboardText(activity) {
  const title = (activity?.title && String(activity.title).trim()) || '活动'
  const path = activity?.id ? buildHomeSharePathWithActivity(activity.id) : DEFAULT_MINI_PROGRAM_SHARE.path
  return [
    `【去旅聚】${title}`,
    '在微信中打开「去旅聚」小程序，使用右上角「···」可转发给好友；也可将下方路径发给已安装该小程序的朋友。',
    `页面路径：${path}`,
  ].join('\n')
}

/** 将置顶活动插入列表首位并去重 */
export function pinSharedActivityOnList(list, pinnedCard) {
  if (!pinnedCard?.id) return list || []
  const pinId = String(pinnedCard.id)
  const rest = (list || []).filter((item) => String(item.id) !== pinId)
  return [{ ...pinnedCard, sharedPin: true }, ...rest]
}
