/** 网络头像展示 URL（绕过微信对同 URL 的强缓存） */
export function displayAvatarUrl(url) {
  const u = String(url || '').trim()
  if (!u) return ''
  if (!/^https?:\/\//i.test(u)) return u
  if (u.includes('?')) return u
  return `${u}?v=0`
}
