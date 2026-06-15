import { clearWmAuthTokens } from '@/api/config'
import {
  clearSkipSilentLogin,
  getAccessToken,
  loginByWechat,
  redirectToLogin,
  setAccessToken,
  setRefreshToken,
  setSkipSilentLogin,
  shouldSkipSilentLogin,
} from '@/api'
import { loadOnboardingConfig } from '@/config/onboarding'
import { tryBindPendingReferralAfterLogin } from '@/utils/referralInv'
import {
  clearAcquisitionAfterLogin,
  getLoginAcquisitionPayload,
} from '@/utils/acquisitionSource'
import { refreshMessageUnreadSummary } from '@/utils/messageUnread'

export { needsMinimalProfile } from '@/utils/profileGate'

const REDIRECT_URL_KEY = 'REDIRECT_URL'

export { clearSkipSilentLogin, setSkipSilentLogin, shouldSkipSilentLogin }

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
const BROWSE_HOME_PATH = '/pages/home/home'
/** 取消登录后若回到这些页会再次触发登录，改回首页 */
const LOGIN_GATED_RETURN_PREFIXES = [
  '/pages/chat-detail/',
  '/pages/direct-chat-detail/',
  '/pages/publish/publish',
  '/pages/bind-phone/',
]

const TAB_BAR_PATHS = new Set([
  '/pages/home/home',
  '/pages/discover/discover',
  '/pages/messages/messages',
  '/pages/profile/profile',
])

function isLoginGatedReturnPath(url) {
  const u = String(url || '')
  return LOGIN_GATED_RETURN_PREFIXES.some((p) => u.startsWith(p) || u.includes(p))
}

function normalizePagePath(url) {
  const raw = String(url || '').trim()
  if (!raw) return ''
  const path = raw.split('?')[0]
  return path.startsWith('/') ? path : `/${path}`
}

function isTabBarPath(url) {
  return TAB_BAR_PATHS.has(normalizePagePath(url))
}

function goBrowsePage(url) {
  const target = String(url || '').trim() || BROWSE_HOME_PATH
  const path = normalizePagePath(target)
  const query = target.includes('?') ? `?${target.split('?').slice(1).join('?')}` : ''
  const full = `${path}${query}`

  if (isTabBarPath(path)) {
    uni.reLaunch({
      url: path,
      fail: () => {
        uni.switchTab?.({ url: path, fail: () => uni.reLaunch({ url: BROWSE_HOME_PATH }) })
      },
    })
    return
  }

  uni.redirectTo({
    url: full,
    fail: () => {
      uni.reLaunch({ url: BROWSE_HOME_PATH })
    },
  })
}

function goBrowseHome() {
  goBrowsePage(BROWSE_HOME_PATH)
}

function pageRouteAt(index) {
  const pages = getCurrentPages()
  const page = pages[index]
  const route = page?.route || ''
  return route ? `/${route}` : ''
}

function safeNavigateBackFromLogin() {
  const pages = getCurrentPages()
  if (pages.length <= 1) return false

  let delta = 0
  for (let i = pages.length - 2; i >= 0; i -= 1) {
    delta += 1
    const path = pageRouteAt(i)
    if (!path || path.includes(LOGIN_PAGE_PATH)) continue
    if (isLoginGatedReturnPath(path)) continue
    uni.navigateBack({
      delta,
      fail: () => goBrowseHome(),
    })
    return true
  }
  return false
}

/**
 * 用户取消登录：清 token 与回跳；统一回首页浏览，避免回到需登录页再次弹登录（审核合规）。
 */
export function leaveLoginWithoutAuth() {
  clearPostLoginRedirect()
  setSkipSilentLogin(true)
  clearWmAuthTokens()
  goBrowseHome()
}

/** 用户主动点「登录」：清失效 token 并强制打开登录页 */
export function openLoginPage(redirectPath = '') {
  clearSkipSilentLogin()
  redirectToLogin(redirectPath, { force: true })
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
