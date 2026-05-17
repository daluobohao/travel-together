import { getAccessToken, loginByWechat, setAccessToken, setRefreshToken } from '@/api'

/** 小程序 ``wx.login`` 换取一次性 code */
export function getWxLoginCode() {
  return new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: (res) => {
        const code = res?.code
        if (code) {
          resolve(code)
          return
        }
        reject(new Error('未获取到微信登录凭证'))
      },
      fail: (err) => {
        reject(new Error(err?.errMsg || '微信登录失败'))
      },
    })
  })
}

export function applyLoginTokens(data) {
  if (data?.accessToken) setAccessToken(data.accessToken)
  if (data?.refreshToken) setRefreshToken(data.refreshToken)
}

/** 登录成功后的统一跳转（短信 / 微信共用） */
export function navigateAfterLogin(user, { showToast = true } = {}) {
  const oc = user?.onboardingCompletedAt
  const needGender = user != null && (user.gender === null || user.gender === undefined)
  if (showToast) {
    uni.showToast({ title: '登录成功', icon: 'success' })
  }
  const delay = showToast ? 400 : 0
  setTimeout(() => {
    if (!oc) {
      uni.reLaunch({ url: '/pages/onboarding/onboarding' })
    } else if (needGender) {
      uni.reLaunch({ url: '/pages/profile-edit/profile-edit?first=1' })
    } else {
      uni.reLaunch({ url: '/pages/home/home' })
    }
  }, delay)
}

/**
 * 启动静默登录：无本地 access 时 wx.login → 后端 wechat/login。
 * @returns {Promise<boolean>} 是否已获得 token
 */
export async function trySilentWechatLogin() {
  if (getAccessToken()) return true
  try {
    const code = await getWxLoginCode()
    const data = await loginByWechat({ code })
    applyLoginTokens(data)
    return true
  } catch {
    return false
  }
}
