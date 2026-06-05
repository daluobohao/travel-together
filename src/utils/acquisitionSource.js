/** 获客渠道归因：落地页 ``src`` 参数 → 登录时上报 ``acquisitionSource`` */

const ACQ_STORAGE_KEY = 'wm_pending_acquisition_source'

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

export function parseSrcFromQuery(options = {}) {
  const raw = options.src || options.source || options.utm_source || ''
  return normalizeSrc(raw)
}

/** App 冷启动：scene + query */
export function captureLaunchAttribution(options = {}) {
  const fromQuery = parseSrcFromQuery(options.query || {})
  if (fromQuery) {
    savePendingAcquisitionSource(fromQuery)
    return
  }
  const scene = Number(options.scene)
  if (scene && SCENE_DEFAULT_SRC[scene]) {
    savePendingAcquisitionSource(SCENE_DEFAULT_SRC[scene])
  }
}

/** 任意页面 onLoad：带 src 的分享/外链落地 */
export function capturePageQueryAttribution(options = {}) {
  const src = parseSrcFromQuery(options)
  if (src) savePendingAcquisitionSource(src)
}

/** 登录请求体附加字段（仅新用户由后端写入） */
export function getLoginAcquisitionPayload() {
  const src = getPendingAcquisitionSource()
  return src ? { acquisitionSource: src } : {}
}

export function clearAcquisitionAfterLogin() {
  clearPendingAcquisitionSource()
}

export function appendQueryParam(pathOrQuery, key, value) {
  const v = encodeURIComponent(String(value))
  if (!pathOrQuery) return `${key}=${v}`
  return pathOrQuery.includes('?') ? `${pathOrQuery}&${key}=${v}` : `${pathOrQuery}?${key}=${v}`
}

export function appendShareSrcToPath(path, src = SHARE_SRC_FRIEND) {
  const base = path || '/pages/entry/entry'
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}src=${encodeURIComponent(src)}`
}

export function appendShareSrcToQuery(query, src = SHARE_SRC_TIMELINE) {
  const q = query ? String(query) : ''
  const sep = q ? '&' : ''
  return `${q}${sep}src=${encodeURIComponent(src)}`
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
  if (s.startsWith('wx_oa_')) return `公众号 ${s.slice(6)}`
  if (s.startsWith('wx_scene_')) return `微信场景 ${s.slice(9)}`
  return s
}
