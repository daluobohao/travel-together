import { getAccessToken, loginByWechat, setAccessToken, setRefreshToken } from '@/api'

const SKIP_SILENT_LOGIN_KEY = 'wm_skip_silent_login'
const REDIRECT_URL_KEY = 'REDIRECT_URL'

/** 登录成功后要回到的页面（如消息 Tab） */
export function setPostLoginRedirect(url) {
  if (url) uni.setStorageSync(REDIRECT_URL_KEY, url)
}

export function consumePostLoginRedirect(fallback = '/pages/home/home') {
  const url = uni.getStorageSync(REDIRECT_URL_KEY)
  if (url) {
    uni.removeStorageSync(REDIRECT_URL_KEY)
    return url
  }
  return fallback
}

/** 用户在登录页主动取消后，本进程内不再静默 wx.login */
export function setSkipSilentLogin(skip = true) {
  uni.setStorageSync(SKIP_SILENT_LOGIN_KEY, !!skip)
}

export function shouldSkipSilentLogin() {
  return !!uni.getStorageSync(SKIP_SILENT_LOGIN_KEY)
}

export function clearSkipSilentLogin() {
  uni.removeStorageSync(SKIP_SILENT_LOGIN_KEY)
}

const WX_LOGIN_TIMEOUT_MS = 12000

function withTimeout(promise, ms, message = '请求超时') {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms)
    Promise.resolve(promise)
      .then((v) => {
        clearTimeout(timer)
        resolve(v)
      })
      .catch((e) => {
        clearTimeout(timer)
        reject(e)
      })
  })
}

/** 小程序 ``wx.login`` 换取一次性 code */
export function getWxLoginCode() {
  return withTimeout(
    new Promise((resolve, reject) => {
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
    }),
    WX_LOGIN_TIMEOUT_MS,
    '微信登录超时',
  )
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
      uni.reLaunch({ url: consumePostLoginRedirect('/pages/home/home') })
    }
  }, delay)
}

/** 并发调用共用一个 Promise，避免 App 启动与「我的」页重复 wx.login */
let silentLoginPromise = null

/**
 * 启动静默登录：无本地 access 时 wx.login → 后端 wechat/login。
 * @returns {Promise<boolean>} 是否已获得 token
 */
export function trySilentWechatLogin() {
  if (shouldSkipSilentLogin()) return Promise.resolve(false)
  if (getAccessToken()) return Promise.resolve(true)
  if (silentLoginPromise) return silentLoginPromise

  silentLoginPromise = (async () => {
    try {
      const code = await getWxLoginCode()
      if (shouldSkipSilentLogin()) return false
      const data = await loginByWechat({ code })
      if (shouldSkipSilentLogin()) return false
      applyLoginTokens(data)
      return true
    } catch {
      return false
    } finally {
      silentLoginPromise = null
    }
  })()

  return silentLoginPromise
}
