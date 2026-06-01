import { bindReferralCode } from '@/api'

const INV_STORAGE_KEY = 'wm_pending_invite_code'

export function savePendingInviteCode(code) {
  const c = String(code || '')
    .trim()
    .toUpperCase()
  if (!c || c.length < 4) return
  try {
    uni.setStorageSync(INV_STORAGE_KEY, c)
  } catch (_) {
    /* ignore */
  }
}

export function getPendingInviteCode() {
  try {
    return uni.getStorageSync(INV_STORAGE_KEY) || ''
  } catch (_) {
    return ''
  }
}

export function clearPendingInviteCode() {
  try {
    uni.removeStorageSync(INV_STORAGE_KEY)
  } catch (_) {
    /* ignore */
  }
}

/** 登录成功后尝试绑定待处理的邀请码（不阻塞跳转） */
export async function tryBindPendingReferralAfterLogin() {
  const code = getPendingInviteCode()
  if (!code) return
  try {
    await bindReferralCode(code)
    clearPendingInviteCode()
  } catch (_) {
    /* 已绑定或无效码时忽略 */
  }
}

export function parseInviteFromQuery(options = {}) {
  const inv = options.inv || options.invite || options.code || ''
  return String(inv || '')
    .trim()
    .toUpperCase()
}
