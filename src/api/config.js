export const API_BASE_URL = 'https://wang-hao-hao.cn/api/v1/wm'
// export const API_BASE_URL = 'http://106.13.108.88:8001/api/v1/wm'
export const MOCK_SWITCH_KEY = 'wm_use_mock'
export const ACCESS_TOKEN_KEY = 'wm_access_token'
export const REFRESH_TOKEN_KEY = 'wm_refresh_token'

export function getMockEnabled() {
  const v = uni.getStorageSync(MOCK_SWITCH_KEY)
  // 未写入时默认走真实接口，避免体验版/真机误以为「全国只有几个省」；需纯本地 Mock 时在开发者工具里打开 Mock 开关。
  if (v === '' || v === null || typeof v === 'undefined') return false
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

export function getRefreshToken() {
  return uni.getStorageSync(REFRESH_TOKEN_KEY) || ''
}

export function setRefreshToken(token) {
  uni.setStorageSync(REFRESH_TOKEN_KEY, token || '')
}

import { clearAllActivityChatCaches } from '@/utils/activityChatCache'

/** 清空本地 access / refresh（登出或刷新失败时） */
export function clearWmAuthTokens() {
  uni.removeStorageSync(ACCESS_TOKEN_KEY)
  uni.removeStorageSync(REFRESH_TOKEN_KEY)
  clearAllActivityChatCaches()
}
