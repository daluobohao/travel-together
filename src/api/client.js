import {
  API_BASE_URL,
  clearWmAuthTokens,
  getAccessToken,
  getMockEnabled,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from './config'

/** 毫秒；小程序默认较短，列表/冷启动接口可适当加长避免误报 timeout */
const REQUEST_TIMEOUT_MS = 60000

function buildQuery(query = {}) {
  const entries = Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== '')
  if (!entries.length) return ''
  return `?${entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')}`
}

/** 并发 401 时共用一个刷新 Promise，避免重复 POST /auth/token/refresh */
let refreshPromise = null

async function tryRefreshAccessToken() {
  if (getMockEnabled()) {
    const rt = getRefreshToken()
    if (!rt) return false
    setAccessToken('wm_at_mock_new')
    setRefreshToken(`wm_rt_mock_${Date.now()}`)
    return true
  }

  const rt = getRefreshToken()
  if (!rt) return false

  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      const url = `${API_BASE_URL}/auth/token/refresh`
      const res = await uni.request({
        url,
        method: 'POST',
        data: { refreshToken: rt },
        header: { 'Content-Type': 'application/json' },
        timeout: REQUEST_TIMEOUT_MS,
      })
      let response = res
      if (Array.isArray(res)) {
        const err = res[0]
        response = res[1]
        if (err) return false
      }
      if (!response || typeof response.statusCode !== 'number') return false
      if (response.statusCode < 200 || response.statusCode >= 300) {
        clearWmAuthTokens()
        return false
      }
      const body = response.data
      if (body && typeof body.code !== 'undefined' && body.code !== 0) {
        clearWmAuthTokens()
        return false
      }
      const d = body?.data
      if (!d?.accessToken || !d?.refreshToken) {
        clearWmAuthTokens()
        return false
      }
      setAccessToken(d.accessToken)
      setRefreshToken(d.refreshToken)
      return true
    } catch {
      clearWmAuthTokens()
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

function unwrap(payload) {
  if (payload && typeof payload.code !== 'undefined') {
    if (payload.code !== 0) {
      const err = new Error(payload.message || '请求失败')
      err.code = payload.code
      err.data = payload.data
      throw err
    }
    return payload.data
  }
  return payload
}

/** FastAPI HTTPException / 校验错误：body 常为 `{ detail: string | array }` */
function messageFromHttpErrorBody(data) {
  if (!data || typeof data !== 'object') return ''
  if (typeof data.message === 'string' && data.message.trim()) return data.message.trim()
  const d = data.detail
  if (typeof d === 'string' && d.trim()) return d.trim()
  if (Array.isArray(d)) {
    const fieldLabel = (loc) => {
      const key = Array.isArray(loc) ? loc[loc.length - 1] : loc
      const map = {
        body: '请求数据',
        description: '问题描述',
        scene: '场景',
        expectation: '补充说明',
      }
      return map[key] || key || '字段'
    }
    const parts = d.map((item) => {
      if (typeof item === 'string') return item
      if (item && item.type === 'missing' && Array.isArray(item.loc)) {
        return `${fieldLabel(item.loc)}不能为空`
      }
      if (item && typeof item.msg === 'string') {
        if (item.msg === 'Field required' && Array.isArray(item.loc)) {
          return `${fieldLabel(item.loc)}不能为空`
        }
        return item.msg
      }
      if (item && typeof item.message === 'string') return item.message
      return ''
    })
    const joined = parts.filter(Boolean).join('；')
    return joined || ''
  }
  return ''
}

export function isLoggedIn() {
  return !!getAccessToken()
}

const POST_LOGIN_REDIRECT_KEY = 'REDIRECT_URL'
const SKIP_SILENT_LOGIN_KEY = 'wm_skip_silent_login'

/** 用户在登录页主动取消后，本进程内不再自动跳转登录 */
export function setSkipSilentLogin(skip = true) {
  uni.setStorageSync(SKIP_SILENT_LOGIN_KEY, !!skip)
}

export function shouldSkipSilentLogin() {
  return !!uni.getStorageSync(SKIP_SILENT_LOGIN_KEY)
}

export function clearSkipSilentLogin() {
  try {
    uni.removeStorageSync(SKIP_SILENT_LOGIN_KEY)
  } catch {
    /* ignore */
  }
}

function currentPageRoute() {
  const pages = getCurrentPages()
  const cur = pages[pages.length - 1]
  const route = cur?.route || ''
  return route ? `/${route}` : ''
}

const LOGIN_PAGE = '/pages/login/login'

/**
 * 鉴权策略（与产品一致）：
 * - 首页 / 发现 / 活动详情浏览：匿名可访问（接口 needAuth: false + tokenIfPresent）
 * - 报名、群聊、消息、发布、我的数据：须登录（页面或接口 redirectToLogin）
 * - 进群聊、报名、发活动、加城市大群：须绑定手机号（ensurePhoneBound）
 */

/**
 * 未登录时打开登录页；已登录返回 true。
 * @param {boolean} force 清 token 并强制打开（用户点「登录」）
 * @param {boolean} explicit 用户主动触发需登录操作（如发活动、报名），忽略「先逛逛」标记
 */
export function redirectToLogin(redirectPath = '', { force = false, explicit = false } = {}) {
  const current = currentPageRoute()
  if (current.includes(LOGIN_PAGE)) return false
  if (!force && getAccessToken()) return true
  if (!force && !explicit && shouldSkipSilentLogin()) return false
  if (force) clearWmAuthTokens()
  clearSkipSilentLogin()
  const path = redirectPath || current
  if (path && !path.includes(LOGIN_PAGE)) {
    uni.setStorageSync(POST_LOGIN_REDIRECT_KEY, path)
  }
  uni.navigateTo({
    url: LOGIN_PAGE,
    fail: () => {
      uni.redirectTo({
        url: LOGIN_PAGE,
        fail: () => {
          uni.reLaunch({ url: LOGIN_PAGE })
        },
      })
    },
  })
  return false
}

/** needAuth 且无 token：跳转登录页（与 Tab 栏、发布页一致） */
export function requireAuthOrLogin(redirectPath = '') {
  if (redirectToLogin(redirectPath)) return true
  const err = new Error('请先登录')
  err.needLogin = true
  err.isAuthError = true
  throw err
}

function isAuthFailureStatus(statusCode, data) {
  if (statusCode === 401) return true
  if (statusCode === 403) {
    const detail = messageFromHttpErrorBody(data)
    return /not authenticated/i.test(detail)
  }
  return false
}

let pendingLoginCallback = null

export function setPendingLoginCallback(callback) {
  pendingLoginCallback = callback
}

export function clearPendingLoginCallback() {
  pendingLoginCallback = null
}

export async function goToLogin(retryPath = '') {
  if (retryPath) {
    uni.setStorageSync('PENDING_REQUEST_PATH', retryPath)
  }
  redirectToLogin(retryPath)
}

export async function wmRequest({
  method = 'GET',
  path,
  query,
  data,
  needAuth = true,
  /** 未登录也可访问的接口：若本地有 accessToken 则附带，用于服务端 ``get_optional_user`` 等场景 */
  tokenIfPresent = false,
  mockHandler,
  __didRefresh = false,
}) {
  if (getMockEnabled() && typeof mockHandler === 'function') {
    const mockPayload = await Promise.resolve(mockHandler({ query: query || {}, data: data || {} }))
    return unwrap(mockPayload)
  }

  if (needAuth) {
    requireAuthOrLogin()
  }

  const url = `${API_BASE_URL}${path}${buildQuery(query)}`
  const headers = { 'Content-Type': 'application/json' }

  if (needAuth || tokenIfPresent) {
    const token = getAccessToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  /** 微信小程序等对 POST JSON 序列化不一致时，显式 stringify 避免 body 为空导致 422 */
  let requestData = data
  const m = (method || 'GET').toUpperCase()
  if (
    data != null &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    !(typeof ArrayBuffer !== 'undefined' && data instanceof ArrayBuffer) &&
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(m)
  ) {
    try {
      requestData = JSON.stringify(data)
    } catch {
      requestData = data
    }
  }

  const res = await uni.request({
    url,
    method,
    data: requestData,
    header: headers,
    dataType: 'json',
    timeout: REQUEST_TIMEOUT_MS,
  })

  let error = null
  let response = null

  if (Array.isArray(res)) {
    ;[error, response] = res
  } else {
    response = res
  }

  if (error) throw error
  if (!response) throw new Error('请求失败：无响应数据')
  if (typeof response.statusCode === 'number' && (response.statusCode < 200 || response.statusCode >= 300)) {
    if (
      needAuth &&
      response.statusCode === 401 &&
      !__didRefresh &&
      path !== '/auth/token/refresh'
    ) {
      const refreshed = await tryRefreshAccessToken()
      if (refreshed) {
        return wmRequest({
          method,
          path,
          query,
          data,
          needAuth,
          mockHandler,
          __didRefresh: true,
        })
      }
    }

    const fromBody = messageFromHttpErrorBody(response.data)
    const authFailed = needAuth && isAuthFailureStatus(response.statusCode, response.data)
    if (authFailed) {
      const route = currentPageRoute()
      if (route && !route.includes(LOGIN_PAGE)) {
        redirectToLogin(route)
      }
    }
    const msg = authFailed
      ? '请先登录'
      : fromBody ||
        (response.statusCode === 401
          ? '请先登录'
          : response.statusCode === 403
            ? '没有权限'
            : response.statusCode === 404
              ? '资源不存在'
              : response.statusCode === 429
                ? '操作过于频繁，请稍后再试'
                : response.statusCode === 422
                  ? fromBody || '提交内容不符合要求，请检查字数与选项'
                  : `请求失败（${response.statusCode}）`)
    const err = new Error(msg)
    err.statusCode = response.statusCode
    err.data = response.data
    err.isAuthError = authFailed || response.statusCode === 401
    err.needLogin = authFailed
    throw err
  }
  return unwrap(response.data)
}

export function paginate(list, page = 1, pageSize = 20) {
  const safePage = Math.max(1, Number(page) || 1)
  const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 20))
  const start = (safePage - 1) * safePageSize
  return {
    list: list.slice(start, start + safePageSize),
    total: list.length,
    page: safePage,
    pageSize: safePageSize,
  }
}
