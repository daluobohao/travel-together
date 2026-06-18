/** 获客渠道归因：分享 path/query → 登录时上报 acquisitionSource；inv 走裂变绑定 */

import { parseInviteFromQuery, savePendingInviteCode } from '@/utils/referralInv'

const ACQ_STORAGE_KEY = 'wm_pending_acquisition_source'
const FROM_STORAGE_KEY = 'wm_pending_share_from'
const SHARE_USER_ID_KEY = 'wm_share_user_id'
const MY_REFERRAL_CODE_KEY = 'wm_my_referral_code'

export const SHARE_SRC_FRIEND = 'wx_share_friend'
export const SHARE_SRC_TIMELINE = 'wx_share_timeline'

const SCENE_DEFAULT_SRC = {
  1007: 'wx_scene_single_chat',
  1008: 'wx_scene_group_chat',
  1011: 'wx_scene_scan_qr',
  1012: 'wx_scene_longpress_qr',
  1047: 'wx_scene_scan_mp',
  1154: 'wx_scene_search',
  1155: 'wx_scene_timeline',
}

function normalizeSrc(raw) {
  const s = String(raw || '')
    .trim()
    .slice(0, 64)
  if (!s) return ''
  return s.replace(/[^\w:\-\.]/g, '_')
}

/** 分享者 userId，统一为 u_{digits} */
export function normalizeFromUserId(raw) {
  const s = String(raw || '')
    .trim()
    .replace(/^u_/i, '')
  if (!/^\d+$/.test(s)) return ''
  return `u_${s}`
}

export function savePendingAcquisitionSource(src) {
  const normalized = normalizeSrc(src)
  if (!normalized) return
  try {
    uni.setStorageSync(ACQ_STORAGE_KEY, normalized)
  } catch {
    /* ignore */
  }
}

export function getPendingAcquisitionSource() {
  try {
    return normalizeSrc(uni.getStorageSync(ACQ_STORAGE_KEY) || '')
  } catch {
    return ''
  }
}

export function clearPendingAcquisitionSource() {
  try {
    uni.removeStorageSync(ACQ_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function savePendingShareFrom(fromUserId) {
  const normalized = normalizeFromUserId(fromUserId)
  if (!normalized) return
  try {
    uni.setStorageSync(FROM_STORAGE_KEY, normalized)
  } catch {
    /* ignore */
  }
}

export function getPendingShareFrom() {
  try {
    return normalizeFromUserId(uni.getStorageSync(FROM_STORAGE_KEY) || '')
  } catch {
    return ''
  }
}

export function clearPendingShareFrom() {
  try {
    uni.removeStorageSync(FROM_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function cacheShareUserId(userId) {
  const normalized = normalizeFromUserId(userId)
  if (!normalized) return
  try {
    uni.setStorageSync(SHARE_USER_ID_KEY, normalized)
  } catch {
    /* ignore */
  }
}

export function getCachedShareUserId() {
  try {
    return normalizeFromUserId(uni.getStorageSync(SHARE_USER_ID_KEY) || '')
  } catch {
    return ''
  }
}

export function cacheMyReferralCode(code) {
  const c = String(code || '')
    .trim()
    .toUpperCase()
  if (!c || c.length < 4) return
  try {
    uni.setStorageSync(MY_REFERRAL_CODE_KEY, c)
  } catch {
    /* ignore */
  }
}

export function getCachedMyReferralCode() {
  try {
    return String(uni.getStorageSync(MY_REFERRAL_CODE_KEY) || '')
      .trim()
      .toUpperCase()
  } catch {
    return ''
  }
}

export function clearShareAttributionCache() {
  try {
    uni.removeStorageSync(SHARE_USER_ID_KEY)
    uni.removeStorageSync(MY_REFERRAL_CODE_KEY)
  } catch {
    /* ignore */
  }
}

/** 登录后预拉 userId + 邀请码，供 onShareAppMessage 同步读取 */
export async function prefetchShareAttributionCache() {
  try {
    const { getAccessToken } = await import('@/api/config')
    if (!getAccessToken()) return
    const { getMe, getMyReferral } = await import('@/api')
    try {
      const me = await getMe()
      if (me?.userId) cacheShareUserId(me.userId)
    } catch {
      /* ignore */
    }
    try {
      const ref = await getMyReferral()
      if (ref?.code) cacheMyReferralCode(ref.code)
    } catch {
      /* ignore */
    }
  } catch {
    /* ignore */
  }
}

export function parseSrcFromQuery(options = {}) {
  const raw = options.src || options.source || options.utm_source || ''
  return normalizeSrc(raw)
}

export function parseFromFromQuery(options = {}) {
  const raw = options.from || options.sharer || ''
  return normalizeFromUserId(raw)
}

function appendQuerySegment(query, key, value) {
  const q = query ? String(query) : ''
  const sep = q ? '&' : ''
  return `${q}${sep}${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
}

function queryHasParam(query, key) {
  if (!query) return false
  const pattern = new RegExp(`(?:^|&)${key}=`, 'i')
  return pattern.test(String(query))
}

function stripQueryParam(query, key) {
  if (!query) return ''
  return String(query)
    .split('&')
    .filter((seg) => {
      if (!seg) return false
      const k = seg.split('=')[0]
      return k !== key && decodeURIComponent(k) !== key
    })
    .join('&')
}

function enrichShareQuery(query, src) {
  let q = stripQueryParam(query ? String(query) : '', 'src')
  q = appendQuerySegment(q, 'src', src)
  const from = getCachedShareUserId()
  const inv = getCachedMyReferralCode()
  if (from && !queryHasParam(q, 'from')) q = appendQuerySegment(q, 'from', from)
  if (inv && !queryHasParam(q, 'inv')) q = appendQuerySegment(q, 'inv', inv)
  return q
}

/** 好友分享 path：渠道 src + 分享者 from + 裂变 inv */
export function appendShareAttributionToPath(path, src = SHARE_SRC_FRIEND) {
  const base = path || '/pages/home/home'
  const idx = base.indexOf('?')
  const route = idx >= 0 ? base.slice(0, idx) : base
  const existing = idx >= 0 ? base.slice(idx + 1) : ''
  const q = enrichShareQuery(existing, src)
  return `${route}?${q}`
}

/** 朋友圈分享 query：渠道 src + 分享者 from + 裂变 inv */
export function appendShareAttributionToQuery(query, src = SHARE_SRC_TIMELINE) {
  return enrichShareQuery(query, src)
}

/** App 冷启动：scene + query（src / from / inv） */
export function captureLaunchAttribution(options = {}) {
  capturePageQueryAttribution(options.query || {})
  if (parseSrcFromQuery(options.query || {})) return
  const scene = Number(options.scene)
  if (scene && SCENE_DEFAULT_SRC[scene]) {
    savePendingAcquisitionSource(SCENE_DEFAULT_SRC[scene])
  }
}

/** 任意页面 onLoad：分享/外链落地参数 */
export function capturePageQueryAttribution(options = {}) {
  const src = parseSrcFromQuery(options)
  if (src) savePendingAcquisitionSource(src)
  const from = parseFromFromQuery(options)
  if (from) savePendingShareFrom(from)
  const inv = parseInviteFromQuery(options)
  if (inv) savePendingInviteCode(inv)
}

/** 合并渠道与分享者，如 wx_share_friend:u_9 */
export function buildLoginAcquisitionSource() {
  const src = getPendingAcquisitionSource()
  const from = getPendingShareFrom()
  if (src && from) return normalizeSrc(`${src}:${from}`)
  if (src) return src
  if (from) return normalizeSrc(`share:${from}`)
  return ''
}

/** 登录请求体附加字段（仅新用户由后端写入） */
export function getLoginAcquisitionPayload() {
  const combined = buildLoginAcquisitionSource()
  return combined ? { acquisitionSource: combined } : {}
}

export function clearAcquisitionAfterLogin() {
  clearPendingAcquisitionSource()
  clearPendingShareFrom()
}

export function appendQueryParam(pathOrQuery, key, value) {
  const v = encodeURIComponent(String(value))
  if (!pathOrQuery) return `${key}=${v}`
  return pathOrQuery.includes('?') ? `${pathOrQuery}&${key}=${v}` : `${pathOrQuery}?${key}=${v}`
}

/** @deprecated 请用 appendShareAttributionToPath */
export function appendShareSrcToPath(path, src = SHARE_SRC_FRIEND) {
  return appendShareAttributionToPath(path, src)
}

/** @deprecated 请用 appendShareAttributionToQuery */
export function appendShareSrcToQuery(query, src = SHARE_SRC_TIMELINE) {
  return appendShareAttributionToQuery(query, src)
}

/** 运营链接示例文案 */
export const ACQ_LINK_EXAMPLES = [
  { label: '公众号文章 A', src: 'wx_oa_article_a' },
  { label: '公众号菜单', src: 'wx_oa_menu' },
  { label: '主播口播', src: 'dy_live_0510' },
]

export function buildEntryPathWithSrc(src, extraQuery = {}) {
  const parts = [`src=${encodeURIComponent(normalizeSrc(src))}`]
  for (const [k, v] of Object.entries(extraQuery || {})) {
    if (v != null && v !== '') parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
  }
  return `/pages/entry/entry?${parts.join('&')}`
}

export function acquisitionSourceLabel(source) {
  const s = String(source || '')
  const map = {
    mp_weixin: '微信小程序',
    mp_douyin: '抖音小程序',
    h5_email: '邮箱注册',
    wx_share_friend: '微信好友分享',
    wx_share_timeline: '微信朋友圈',
    wx_oa_menu: '公众号菜单',
    friend: '朋友推荐（自报）',
    xiaohongshu: '小红书（自报）',
    douyin: '抖音（自报）',
    wechat: '微信（自报）',
    search: '搜索（自报）',
    other: '其他（自报）',
    '(未记录)': '未记录',
  }
  if (map[s]) return map[s]
  if (s.startsWith('referral:')) return `邀请码 ${s.slice(9)}`
  if (s.startsWith('wx_share_friend:')) return `好友分享 · ${s.slice(16)}`
  if (s.startsWith('wx_share_timeline:')) return `朋友圈 · ${s.slice(18)}`
  if (s.startsWith('share:')) return `分享者 ${s.slice(6)}`
  if (s.startsWith('wx_oa_')) return `公众号 ${s.slice(6)}`
  if (s.startsWith('wx_scene_')) return `微信场景 ${s.slice(9)}`
  return s
}
