import { API_BASE_URL, getAccessToken, getMockEnabled } from './config'

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
      throw err
    }
    return payload.data
  }
  return payload
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
    throw new Error(`请求失败：HTTP ${response.statusCode}`)
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
