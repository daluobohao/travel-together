import { loginByDouyin } from '@/api'
import { getAccessToken } from '@/api/config'
import {
  applyLoginTokens,
  setSkipSilentLogin,
  shouldSkipSilentLogin,
} from '@/utils/wechatAuth'

const TT_LOGIN_TIMEOUT_MS = 12000

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

/** 抖音小程序 ``tt.login`` 换取一次性 code */
export function getTtLoginCode() {
  return withTimeout(
    new Promise((resolve, reject) => {
      uni.login({
        provider: 'toutiao',
        success: (res) => {
          const code = res?.code
          if (code) {
            resolve(code)
            return
          }
          reject(new Error('未获取到抖音登录凭证'))
        },
        fail: (err) => {
          reject(new Error(err?.errMsg || '抖音登录失败'))
        },
      })
    }),
    TT_LOGIN_TIMEOUT_MS,
    '抖音登录超时',
  )
}

let silentLoginPromise = null

/** 启动静默登录：无本地 access 时 tt.login → POST /auth/douyin/login */
export function trySilentDouyinLogin() {
  if (shouldSkipSilentLogin()) return Promise.resolve(false)
  if (getAccessToken()) return Promise.resolve(true)
  if (silentLoginPromise) return silentLoginPromise

  silentLoginPromise = (async () => {
    try {
      const code = await getTtLoginCode()
      if (shouldSkipSilentLogin()) return false
      const data = await loginByDouyin({ code })
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

export { setSkipSilentLogin, clearSkipSilentLogin } from '@/utils/wechatAuth'
