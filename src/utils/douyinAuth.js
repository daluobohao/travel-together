import { loginByDouyin } from '@/api'
import { getAccessToken } from '@/api/config'
import {
  clearAcquisitionAfterLogin,
  getLoginAcquisitionPayload,
} from '@/utils/acquisitionSource'
import { applyLoginTokens, setSkipSilentLogin, shouldSkipSilentLogin } from '@/utils/wechatAuth'
import { gateProfileAfterSilentLogin } from '@/utils/profileGate'

const TT_LOGIN_TIMEOUT_MS = 12000
const LOG_PREFIX = '[douyinAuth]'

function maskCredential(value) {
  const s = String(value || '').trim()
  if (!s) return '(无)'
  if (s.length <= 10) return `${s.slice(0, 2)}***(${s.length})`
  return `${s.slice(0, 8)}…${s.slice(-4)} (${s.length}字符)`
}

function logTtLoginSuccess(source, res) {
  const hasCode = !!(res?.code && String(res.code).trim())
  const hasAnonymousCode = !!(res?.anonymousCode && String(res.anonymousCode).trim())
  console.log(`${LOG_PREFIX} tt.login 成功 [${source}]`, {
    hasCode,
    code: hasCode ? maskCredential(res.code) : '(无)',
    hasAnonymousCode,
    anonymousCode: hasAnonymousCode ? maskCredential(res.anonymousCode) : '(无)',
    isLogin: res?.isLogin,
    errMsg: res?.errMsg || '',
    tip: hasCode
      ? '有 code，可发给后端 /auth/douyin/login'
      : hasAnonymousCode
        ? '仅有 anonymousCode，不能当 code 用；请在抖音 App 登录或真机预览'
        : '无 code 也无 anonymousCode',
  })
}

function logTtLoginFail(source, err) {
  console.warn(`${LOG_PREFIX} tt.login 失败 [${source}]`, err)
}

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

/** 将后端 / 抖音错误转为用户可读提示 */
export function mapDouyinLoginErrorMessage(err) {
  const msg = String(err?.message || '').trim()
  if (!msg) return '抖音登录失败，请稍后重试'
  if (/invalid.*expired.*douyin/i.test(msg) || /douyin login code/i.test(msg)) {
    return '登录凭证无效或已使用，请再点一次「抖音一键登录」；若仍失败，请确认服务端 DY_MP_APPID/AppSecret 与小程序 AppID 一致'
  }
  return msg
}

let ttLoginPromise = null
let silentLoginPromise = null

function invokeTtLoginOnce(source = 'unknown') {
  if (ttLoginPromise) return ttLoginPromise

  console.log(`${LOG_PREFIX} 调用 tt.login [${source}]`)

  ttLoginPromise = withTimeout(
    new Promise((resolve, reject) => {
      const onSuccess = (res) => {
        logTtLoginSuccess(source, res)
        const code = res?.code
        if (code && String(code).trim()) {
          resolve(String(code).trim())
          return
        }
        if (res?.anonymousCode) {
          reject(
            new Error(
              '当前仅获取到匿名凭证，无法完成登录。请在抖音 App 内登录账号后重试，或使用真机预览',
            ),
          )
          return
        }
        reject(new Error('未获取到抖音登录凭证'))
      }

      const onFail = (err) => {
        logTtLoginFail(source, err)
        reject(new Error(err?.errMsg || '抖音登录失败'))
      }

      if (typeof tt !== 'undefined' && typeof tt.login === 'function') {
        tt.login({ force: true, success: onSuccess, fail: onFail })
        return
      }

      console.warn(`${LOG_PREFIX} 未检测到 tt.login，降级 uni.login [${source}]`)
      uni.login({ success: onSuccess, fail: onFail })
    }),
    TT_LOGIN_TIMEOUT_MS,
    '抖音登录超时',
  ).finally(() => {
    ttLoginPromise = null
  })

  return ttLoginPromise
}

/** 抖音小程序 ``tt.login`` 换取一次性 code（须为 res.code，非 anonymousCode） */
export function getTtLoginCode(source = 'unknown') {
  return invokeTtLoginOnce(source)
}

/** 等待启动静默登录结束，避免与手动登录争抢/复用同一 code */
export function waitForDouyinSilentLoginIdle() {
  if (!silentLoginPromise) return Promise.resolve()
  return silentLoginPromise.catch(() => false).then(() => undefined)
}

/** 获取新 code 并登录（手动登录页使用） */
export async function loginWithDouyinCode() {
  await waitForDouyinSilentLoginIdle()
  const code = await getTtLoginCode('manual')
  console.log(`${LOG_PREFIX} POST /auth/douyin/login [manual]`, { code: maskCredential(code) })
  return loginByDouyin({ code, ...getLoginAcquisitionPayload() })
}

/** 启动静默登录：无本地 access 时 tt.login → POST /api/v1/wm/auth/douyin/login */
export function trySilentDouyinLogin() {
  if (shouldSkipSilentLogin()) return Promise.resolve(false)
  if (getAccessToken()) return Promise.resolve(true)
  if (silentLoginPromise) return silentLoginPromise

  silentLoginPromise = (async () => {
    try {
      const code = await getTtLoginCode('silent')
      if (shouldSkipSilentLogin()) return false
      console.log(`${LOG_PREFIX} POST /auth/douyin/login [silent]`, { code: maskCredential(code) })
      const data = await loginByDouyin({ code, ...getLoginAcquisitionPayload() })
      if (shouldSkipSilentLogin()) return false
      applyLoginTokens(data)
      clearAcquisitionAfterLogin()
      gateProfileAfterSilentLogin(data.user)
      console.log(`${LOG_PREFIX} 静默登录成功`)
      return true
    } catch (e) {
      console.warn(`${LOG_PREFIX} 静默登录未成功`, mapDouyinLoginErrorMessage(e))
      return false
    } finally {
      silentLoginPromise = null
    }
  })()

  return silentLoginPromise
}

export { setSkipSilentLogin, clearSkipSilentLogin } from '@/utils/wechatAuth'
