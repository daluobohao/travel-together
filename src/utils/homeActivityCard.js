/** 首页活动卡片展示辅助 */

export function calcDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6378137
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(Number(lat2) - Number(lat1))
  const dLng = toRad(Number(lng2) - Number(lng1))
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(Number(lat1))) *
      Math.cos(toRad(Number(lat2))) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

export function sortActivityCardsByDistance(cards, lat, lng) {
  const userLat = Number(lat)
  const userLng = Number(lng)
  if (!Number.isFinite(userLat) || !Number.isFinite(userLng)) return cards || []
  return (cards || [])
    .map((row) => ({
      ...row,
      distanceMeters: calcDistanceMeters(userLat, userLng, row.lat, row.lng),
    }))
    .sort((a, b) => {
      const diff = Number(a.distanceMeters) - Number(b.distanceMeters)
      if (diff !== 0) return diff
      return new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    })
}

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
