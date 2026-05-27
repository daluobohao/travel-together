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
    const parts = d.map((item) => {
      if (typeof item === 'string') return item
      if (item && typeof item.msg === 'string') return item.msg
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

function currentPageRoute() {
  const pages = getCurrentPages()
  const cur = pages[pages.length - 1]
  const route = cur?.route || ''
  return route ? `/${route}` : ''
}

/** needAuth 且无 token：跳转登录页（与 Tab 栏、发布页一致） */
export function requireAuthOrLogin(redirectPath = '') {
  if (getAccessToken()) return true
  const path = redirectPath || currentPageRoute()
  if (path) uni.setStorageSync(POST_LOGIN_REDIRECT_KEY, path)
  uni.navigateTo({ url: '/pages/login/login' })
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
  uni.navigateTo({ url: '/pages/login/login' })
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
      if (route && !route.includes('/pages/login/login')) {
        uni.setStorageSync(POST_LOGIN_REDIRECT_KEY, route)
        uni.navigateTo({ url: '/pages/login/login' })
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
  const safePageSize = Math.min(50, Math.max(1, Number(pageSize) || 20))
  const start = (safePage - 1) * safePageSize
  return {
    list: list.slice(start, start + safePageSize),
    total: list.length,
    page: safePage,
    pageSize: safePageSize,
  }
}
