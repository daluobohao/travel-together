export const API_BASE_URL = 'http://8.217.79.34:8001/api/v1/wm'
export const MOCK_SWITCH_KEY = 'wm_use_mock'
export const ACCESS_TOKEN_KEY = 'wm_access_token'

export function getMockEnabled() {
  const v = uni.getStorageSync(MOCK_SWITCH_KEY)
  if (v === '' || v === null || typeof v === 'undefined') return true
  return !!v
}

export function setMockEnabled(enabled) {
  uni.setStorageSync(MOCK_SWITCH_KEY, !!enabled)
}

export function getAccessToken() {
  return uni.getStorageSync(ACCESS_TOKEN_KEY) || ''
}

export function setAccessToken(token) {
  uni.setStorageSync(ACCESS_TOKEN_KEY, token || '')
}
