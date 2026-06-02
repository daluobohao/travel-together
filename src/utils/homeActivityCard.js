/** 首页活动卡片展示辅助 */

export function shortLocationName(raw) {
  const s = String(raw || '').trim()
  if (!s) return '地点待定'
  const ascii = s.indexOf('(')
  if (ascii > 0) return s.slice(0, ascii).trim()
  const full = s.indexOf('（')
  if (full > 0) return s.slice(0, full).trim()
  if (s.length > 24) return `${s.slice(0, 24)}…`
  return s
}

/** 同标题 + 同时段去重，避免首屏重复卡片 */
export function dedupeHomeActivities(list) {
  const seen = new Set()
  return (list || []).filter((item) => {
    const key = `${item.title || ''}|${item.time || ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function spotsLeftLabel(joined, total) {
  const j = Number(joined) || 0
  const t = Number(total) || 0
  if (t <= 0) return ''
  const left = t - j
  if (left <= 0) return '已满员'
  if (left <= 3) return `还可 ${left} 人加入`
  return `${j}/${t} 人已加入`
}

export function isUrgentSpot(joined, total) {
  const t = Number(total) || 0
  const j = Number(joined) || 0
  if (t <= 0) return false
  const left = t - j
  return left > 0 && left <= 3
}
