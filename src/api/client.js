import { API_BASE_URL, getAccessToken, getMockEnabled } from './config'

/** 毫秒；小程序默认较短，列表/冷启动接口可适当加长避免误报 timeout */
const REQUEST_TIMEOUT_MS = 60000

function buildQuery(query = {}) {
  const entries = Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== '')
  if (!entries.length) return ''
  return `?${entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')}`
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
  const d = data.detail
  if (typeof d === 'string' && d.trim()) return d.trim()
  if (Array.isArray(d)) {
    const parts = d.map((item) => {
      if (typeof item === 'string') return item
      if (item && typeof item.msg === 'string') return item.msg
      return ''
    })
    const joined = parts.filter(Boolean).join('；')
    return joined || ''
  }
  return ''
}

export async function wmRequest({
  method = 'GET',
  path,
  query,
  data,
  needAuth = true,
  mockHandler,
}) {
  if (getMockEnabled() && typeof mockHandler === 'function') {
    const mockPayload = await Promise.resolve(mockHandler({ query: query || {}, data: data || {} }))
    return unwrap(mockPayload)
  }

  const url = `${API_BASE_URL}${path}${buildQuery(query)}`
  const headers = { 'Content-Type': 'application/json' }

  if (needAuth) {
    const token = getAccessToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const res = await uni.request({
    url,
    method,
    data,
    header: headers,
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
    const fromBody = messageFromHttpErrorBody(response.data)
    const msg =
      fromBody ||
      (response.statusCode === 401
        ? '请先登录'
        : response.statusCode === 403
          ? '没有权限'
          : response.statusCode === 404
            ? '资源不存在'
            : `请求失败（${response.statusCode}）`)
    const err = new Error(msg)
    err.statusCode = response.statusCode
    err.data = response.data
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
