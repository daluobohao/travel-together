import { getAccessToken } from '@/api/config'
import { getMe } from '@/api'

const AUTO_NICKNAME_RE = /^旅人.{1,28}$/

export const PROFILE_INCOMPLETE_MSG = '请先完善资料'

/** 系统分配的默认昵称（如微信登录「旅人xxxx」） */
export function isAutoNickname(name) {
  const n = String(name || '').trim()
  if (!n) return true
  return AUTO_NICKNAME_RE.test(n)
}

/** 默认出生日期：今天减 18 年（YYYY-MM-DD） */
export function defaultBirthDate18YearsAgo() {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 18)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayDateString() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 登录后是否仍需完善昵称（系统默认「旅人xxxx」需改为自定义昵称） */
export function needsMinimalProfile(user) {
  if (user == null) return false
  if (user.profileComplete === true) return false
  return isAutoNickname(user.nickname)
}

export function isProfileIncompleteError(err) {
  const msg = String(err?.message || '')
  return err?.statusCode === 403 && msg.includes('完善资料')
}

export function buildProfileEditUrl(returnUrl) {
  const q = ['first=1']
  const ret = String(returnUrl || '').trim()
  if (ret) q.push(`return=${encodeURIComponent(ret)}`)
  return `/pages/profile-edit/profile-edit?${q.join('&')}`
}

function openProfileEdit(returnUrl) {
  const url = buildProfileEditUrl(returnUrl)
  uni.redirectTo({
    url,
    fail: () => {
      uni.navigateTo({ url })
    },
  })
}

/**
 * 已登录且资料未完善时跳转完善页；返回 false 表示已拦截。
 * 未登录时返回 false，由调用方先走登录。
 */
export async function ensureProfileComplete({ redirectPath } = {}) {
  if (!getAccessToken()) return false
  try {
    const me = await getMe()
    if (!needsMinimalProfile(me)) return true
  } catch (_) {
    /* 拉取失败时仍引导完善，避免绕过 */
  }
  openProfileEdit(redirectPath)
  return false
}
