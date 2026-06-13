/** 活动 ID 规范化（接口 path 与列表过滤共用） */

export function bareActivityId(raw) {
  const s = String(raw || '').trim()
  if (!s) return ''
  return s.startsWith('act_') ? s.slice(4) : s
}

export function apiActivityPathId(raw) {
  const bare = bareActivityId(raw)
  return bare ? `act_${bare}` : ''
}

export function sameActivityId(a, b) {
  const left = bareActivityId(a)
  const right = bareActivityId(b)
  return !!left && left === right
}
