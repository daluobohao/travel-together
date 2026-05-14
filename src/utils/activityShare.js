/** 非活动详情页：分享统一落到首页，避免好友打开到登录/半完成引导页 */
export const DEFAULT_MINI_PROGRAM_SHARE = {
  title: '旅聚 · 发现身边的活动',
  path: '/pages/home/home',
}

export function buildDefaultTimelineShare() {
  return { title: DEFAULT_MINI_PROGRAM_SHARE.title }
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
