import { getAccessToken } from '@/api/config'
import { getMe } from '@/api'

const AUTO_NICKNAME_RE = /^旅人.{1,28}$/

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

/** 登录后是否仍需完善昵称、性别、出生日期 */
export function needsMinimalProfile(user) {
  if (user == null) return false
  if (user.profileComplete === true) return false

  const needNick = isAutoNickname(user.nickname)
  const needGender = user.gender !== 'male' && user.gender !== 'female'
  const needBirth = !user.birthDate

  if (needNick || needGender) return true
  if (!needBirth) return false
  // 历史用户：曾走完极简引导，仅有昵称+性别
  if (user.onboardingCompletedAt) return false
  return true
}

const PROFILE_EDIT_FIRST_URL = '/pages/profile-edit/profile-edit?first=1'

export function redirectToProfileCompletion() {
  uni.reLaunch({
    url: PROFILE_EDIT_FIRST_URL,
    fail: () => {
      uni.redirectTo({ url: PROFILE_EDIT_FIRST_URL })
    },
  })
}

/** 已登录且资料未完善时跳转完善页；返回是否已拦截 */
export async function redirectIfProfileIncomplete() {
  if (!getAccessToken()) return false
  try {
    const me = await getMe()
    if (!needsMinimalProfile(me)) return false
    redirectToProfileCompletion()
    return true
  } catch {
    return false
  }
}

export function gateProfileAfterSilentLogin(user) {
  if (needsMinimalProfile(user)) {
    redirectToProfileCompletion()
    return true
  }
  return false
}
