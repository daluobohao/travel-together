/** 首页活动列表：时间窗 / 分类 / 排序（与后端对齐） */

export const HOME_ACTIVITY_DATE_RANGE = 'next7d'
export const HOME_CATEGORY_ALL = ''
export const HOME_SORT_DISTANCE = 'distance'
export const HOME_SORT_POPULARITY = 'popularity'
export const HOME_NEARBY_RADIUS_KM = 20
export const HOME_ACTIVITY_WINDOW_DAYS = 7

export function formatDateYmd(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function publishStartDateBounds() {
  const start = new Date()
  const end = new Date()
  end.setDate(end.getDate() + HOME_ACTIVITY_WINDOW_DAYS)
  return {
    start: formatDateYmd(start),
    end: formatDateYmd(end),
  }
}

/** 北京时间今天 0 点对应的 UTC 毫秒（与后端 next7d 对齐） */
export function beijingTodayStartMs(nowMs = Date.now()) {
  const bjOffsetMs = 8 * 60 * 60 * 1000
  const bjNow = new Date(nowMs + bjOffsetMs)
  return Date.UTC(bjNow.getUTCFullYear(), bjNow.getUTCMonth(), bjNow.getUTCDate()) - bjOffsetMs
}

export function next7dWindowBoundsMs(nowMs = Date.now()) {
  return {
    earliest: beijingTodayStartMs(nowMs),
    latest: nowMs + HOME_ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  }
}

export function isStartWithinHomeWindow(isoOrLocal) {
  if (!isoOrLocal) return false
  const ms = new Date(isoOrLocal).getTime()
  if (!Number.isFinite(ms)) return false
  const { earliest, latest } = next7dWindowBoundsMs()
  return ms >= earliest && ms <= latest
}

/** 发活动页：开始时间范围说明（与首页 next7d 一致） */
export const PUBLISH_START_WINDOW_HINT =
  '仅可选近 7 天内开始：首页只展示这段时间内的活动，方便大家近期组局、尽快见面'

/** 超出 7 天时向用户解释原因（Toast / 弹窗） */
export const PUBLISH_START_WINDOW_REJECT_MSG =
  '开始时间需在 7 天内。首页只展示近 7 天可参加的活动，避免远期空局，也方便大家尽快组局见面。'
