import { clearWmAuthTokens } from '@/api/config'
import { getAccessToken, loginByWechat, setAccessToken, setRefreshToken } from '@/api'
import { loadOnboardingConfig } from '@/config/onboarding'
import { tryBindPendingReferralAfterLogin } from '@/utils/referralInv'
import {
  clearAcquisitionAfterLogin,
  getLoginAcquisitionPayload,
} from '@/utils/acquisitionSource'
import { refreshMessageUnreadSummary } from '@/utils/messageUnread'

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

export function clearPostLoginRedirect() {
  try {
    uni.removeStorageSync(REDIRECT_URL_KEY)
  } catch {
    /* ignore */
  }
}

const LOGIN_PAGE_PATH = '/pages/login/login'
/** 取消登录后若回到这些页会再次触发登录，改回首页 */
const LOGIN_GATED_RETURN_PREFIXES = ['/pages/chat-detail/', '/pages/publish/publish', '/pages/bind-phone/']

function isLoginGatedReturnPath(url) {
  const u = String(url || '')
  return LOGIN_GATED_RETURN_PREFIXES.some((p) => u.startsWith(p) || u.includes(p))
}

/**
 * 用户取消登录：清 token 与回跳；有页面栈则返回上一页，否则回到发起登录前的浏览页或首页。
 */
export function leaveLoginWithoutAuth() {
  let returnUrl = ''
  try {
    returnUrl = String(uni.getStorageSync(REDIRECT_URL_KEY) || '').trim()
  } catch {
    /* ignore */
  }
  clearPostLoginRedirect()
  setSkipSilentLogin(true)
  clearWmAuthTokens()

  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({
      fail: () => {
        uni.reLaunch({ url: '/pages/home/home' })
      },
    })
    return
  }

  if (
    returnUrl &&
    !returnUrl.includes(LOGIN_PAGE_PATH) &&
    !isLoginGatedReturnPath(returnUrl)
  ) {
    uni.redirectTo({
      url: returnUrl,
      fail: () => {
        uni.reLaunch({ url: '/pages/home/home' })
      },
    })
    return
  }

  uni.reLaunch({ url: '/pages/home/home' })
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
          reject(new Error('未获取到登录凭证'))
        },
        fail: (err) => {
          reject(new Error(err?.errMsg || '登录失败'))
        },
      })
    }),
    WX_LOGIN_TIMEOUT_MS,
    '登录超时',
  )
}

export function applyLoginTokens(data) {
  if (data?.accessToken) setAccessToken(data.accessToken)
  if (data?.refreshToken) setRefreshToken(data.refreshToken)
  refreshMessageUnreadSummary().catch(() => {})
}

/** 未完成极简引导：无 onboardingCompletedAt 或未选性别 */
function needsMinimalProfile(user) {
  if (user == null) return false
  const oc = user.onboardingCompletedAt
  const g = user.gender
  const needGender = g === null || g === undefined || g === ''
  return !oc || needGender
}

function reLaunchAfterLogin(url) {
  uni.reLaunch({
    url,
    fail: () => {
      uni.switchTab?.({ url, fail: () => uni.redirectTo({ url }) })
    },
  })
}

/** 登录成功后的统一跳转（短信 / 微信共用） */
export function navigateAfterLogin(user, { showToast = true } = {}) {
  if (showToast) {
    uni.showToast({ title: '登录成功', icon: 'success' })
  }
  const delay = showToast ? 400 : 0
  setTimeout(() => {
    ;(async () => {
      let target = '/pages/home/home'
      try {
        // 邀请绑定不阻塞跳转；失败时静默忽略
        tryBindPendingReferralAfterLogin().catch(() => {})
        clearAcquisitionAfterLogin()
        const { fullEnabled } = await loadOnboardingConfig()
        if (fullEnabled && !user?.onboardingCompletedAt) {
          target = '/pages/onboarding/onboarding'
        } else if (needsMinimalProfile(user)) {
          target = '/pages/profile-edit/profile-edit?first=1'
        } else {
          target = consumePostLoginRedirect('/pages/home/home')
        }
      } catch (e) {
        console.warn('[navigateAfterLogin]', e)
        target = consumePostLoginRedirect('/pages/home/home')
      } finally {
        reLaunchAfterLogin(target)
      }
    })()
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
      const data = await loginByWechat({ code, ...getLoginAcquisitionPayload() })
      if (shouldSkipSilentLogin()) return false
      applyLoginTokens(data)
      clearAcquisitionAfterLogin()
      return true
    } catch {
      return false
    } finally {
      silentLoginPromise = null
    }
  })()

  return silentLoginPromise
}
