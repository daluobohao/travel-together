/** 非活动详情页：分享统一落到首页，避免好友打开到登录/半完成引导页 */
export const DEFAULT_MINI_PROGRAM_SHARE = {
  title: '旅聚 · 发现身边的活动',
  path: '/pages/home/home',
}

export function buildDefaultTimelineShare() {
  return { title: DEFAULT_MINI_PROGRAM_SHARE.title }
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
  return {
    title,
    path: query ? `/${route}?${query}` : `/${route}`,
  }
}

/** 全局默认朋友圈分享 */
export function buildCurrentPageTimelineShare(title = DEFAULT_MINI_PROGRAM_SHARE.title) {
  const { route, options } = getCurrentPageContext()
  if (!route || SHARE_FALLBACK_ROUTES.has(route)) {
    return { title }
  }
  const query = buildPageQuery(options)
  return query ? { title, query } : { title }
}

/** 首页分享标题（可带城市） */
export function buildHomeShareMessage(cityName) {
  const city = (cityName && String(cityName).trim()) || ''
  const title = city ? `旅聚 · ${city}附近的活动` : DEFAULT_MINI_PROGRAM_SHARE.title
  return { title, path: DEFAULT_MINI_PROGRAM_SHARE.path }
}

/** 发现 Tab 分享 */
export const DISCOVER_PAGE_SHARE = {
  title: '旅聚 · 发现活动与分类',
  path: '/pages/discover/discover',
}

export function buildDiscoverShareMessage() {
  return { ...DISCOVER_PAGE_SHARE }
}

export function buildDiscoverShareClipboardText() {
  return [
    '【旅聚】发现活动与分类',
    '在微信中打开「旅聚」小程序：可点右上角「···」转发；或把下方页面路径发给已安装该小程序的朋友。',
    `页面路径：${DISCOVER_PAGE_SHARE.path}`,
  ].join('\n')
}

/** 复制首页分享说明（微信粘贴发给好友） */
export function buildHomeShareClipboardText(cityName) {
  const city = (cityName && String(cityName).trim()) || ''
  const headline = city ? `【旅聚】${city}附近的活动` : '【旅聚】发现身边的活动'
  return [
    headline,
    '在微信中打开「旅聚」小程序：可点右上角「···」转发；或把下方页面路径发给已安装该小程序的朋友。',
    `页面路径：${DEFAULT_MINI_PROGRAM_SHARE.path}`,
  ].join('\n')
}

/** 活动详情分享 / 复制（微信小程序 path + 说明文案） */

export function buildActivityDetailPath(activityId) {
  const id = encodeURIComponent(String(activityId || '').trim())
  return `/pages/activity-detail/activity-detail?id=${id}`
}

/** 供 ``onShareAppMessage`` 使用 */
export function buildActivityShareMessage(activity) {
  if (!activity?.id) {
    return { title: '旅聚 · 发现身边的活动', path: '/pages/home/home' }
  }
  const title = (activity.title && String(activity.title).trim().slice(0, 64)) || '旅聚活动'
  return {
    title,
    path: buildActivityDetailPath(activity.id),
  }
}

/** 供 ``onShareTimeline`` 的 query（无 ``?``） */
export function buildActivityTimelineQuery(activityId) {
  return `id=${encodeURIComponent(String(activityId || '').trim())}`
}

/** 复制到剪贴板：标题 + 打开方式 + 小程序页面路径 */
export function buildActivityShareClipboardText(activity) {
  const title = (activity?.title && String(activity.title).trim()) || '活动'
  const path = activity?.id ? buildActivityDetailPath(activity.id) : '/pages/home/home'
  return [
    `【旅聚】${title}`,
    '在微信中打开「旅聚」小程序，使用右上角「···」可转发给好友；也可将下方路径发给已安装该小程序的朋友。',
    `页面路径：${path}`,
  ].join('\n')
}
