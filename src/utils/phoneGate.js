import { getMe, isLoggedIn, redirectToLogin } from '@/api'

/** 与后端 ``PHONE_BINDING_REQUIRED_DETAIL`` 对齐 */
export const PHONE_BINDING_REQUIRED_MSG = '请先绑定手机号'

export const PHONE_GATE_REASON = {
  CHAT: 'chat',
  PUBLISH: 'publish',
  ENROLL: 'enroll',
  CITY_HALL: 'city_hall',
}

const REASON_DESC = {
  [PHONE_GATE_REASON.CHAT]: '进入群聊需先验证手机号，方便活动协调与账号安全。',
  [PHONE_GATE_REASON.PUBLISH]: '发布活动需先验证手机号，便于其他旅人联系你。',
  [PHONE_GATE_REASON.ENROLL]: '报名活动需先验证手机号，便于组织者联系你。',
  [PHONE_GATE_REASON.CITY_HALL]: '加入城市大群需先验证手机号，方便同城交流。',
}

export function phoneGateDesc(reason) {
  return REASON_DESC[reason] || '绑定手机号后可继续，便于活动协调与账号安全。'
}

export function buildBindPhoneUrl(returnUrl, reason) {
  const q = []
  const ret = String(returnUrl || '').trim()
  if (ret) q.push(`return=${encodeURIComponent(ret)}`)
  if (reason) q.push(`reason=${encodeURIComponent(reason)}`)
  return q.length ? `/pages/bind-phone/bind-phone?${q.join('&')}` : '/pages/bind-phone/bind-phone'
}

export function isPhoneBindingRequiredError(err) {
  const msg = String(err?.message || '')
  return err?.statusCode === 403 && (msg.includes('绑定手机号') || /phone.?bind/i.test(msg))
}

/**
 * 已登录且已绑手机返回 true；未登录跳登录；未绑手机跳绑定页。
 */
export async function ensurePhoneBound({ redirectPath, reason } = {}) {
  const ret = String(redirectPath || '').trim()
  if (!isLoggedIn()) {
    redirectToLogin(ret)
    return false
  }
  try {
    const me = await getMe()
    if (me?.phoneBound) return true
  } catch (_) {
    /* 拉取失败时仍引导绑定，避免绕过 */
  }
  const url = buildBindPhoneUrl(ret, reason)
  uni.redirectTo({
    url,
    fail: () => {
      uni.navigateTo({ url })
    },
  })
  return false
}
