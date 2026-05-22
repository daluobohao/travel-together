import {
  createPublishQrcode,
  createPublishMinipay,
  queryPublishPayState,
  syncPublishPayFromWechat,
  confirmMockPublishPayment,
  isPublishPayMockEnabled,
} from '@/api/pay'
import { getMe, getPublishMeta, isLoggedIn } from '@/api'
import { getWxLoginCode, setPostLoginRedirect } from '@/utils/wechatAuth'
import { generatePayQrId } from '@/utils/payQrId'
import {
  PUBLISH_FEE_YUAN,
  PUBLISH_PAY_FALLBACK_ENABLED,
  formatPublishFeeYuan,
  publishFeeLabel,
} from '@/pay/constants'

let publishPayConfigCache = null

/** 是否启用发布前付费（读服务端 PAY_PUBLISH_ENABLED） */
export async function loadPublishPayConfig(force = false) {
  if (!force && publishPayConfigCache != null) return publishPayConfigCache
  try {
    const data = await getPublishMeta()
    publishPayConfigCache = {
      enabled: !!data?.publishPayEnabled,
      feeYuan: data?.publishFeeYuan != null ? String(data.publishFeeYuan) : String(PUBLISH_FEE_YUAN),
    }
  } catch (e) {
    console.warn('[publishPay] loadPublishPayConfig failed', e)
    publishPayConfigCache = {
      enabled: PUBLISH_PAY_FALLBACK_ENABLED,
      feeYuan: String(PUBLISH_FEE_YUAN),
    }
  }
  return publishPayConfigCache
}

export function clearPublishPayConfigCache() {
  publishPayConfigCache = null
}

function resolveFeeYuan(order) {
  const fromApi = order?.feeYuan
  if (fromApi != null && String(fromApi).trim() !== '') return String(fromApi).trim()
  return String(PUBLISH_FEE_YUAN)
}

async function confirmPayAmount(feeYuan) {
  const label = publishFeeLabel(feeYuan)
  const res = await new Promise((resolve) => {
    uni.showModal({
      title: '确认支付',
      content: `发布活动需支付 ${label}，确认后将调起微信支付。`,
      confirmText: '去支付',
      cancelText: '取消',
      success: (r) => resolve(!!r.confirm),
    })
  })
  if (!res) {
    const e = new Error('已取消支付')
    e.cancelled = true
    throw e
  }
}

const POLL_INTERVAL_MS = 1000
const POLL_MAX_TIMES = 100

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function ensureLoggedInForPublish() {
  if (!isLoggedIn()) {
    setPostLoginRedirect('/pages/publish/publish')
    uni.navigateTo({ url: '/pages/login/login' })
    const e = new Error('请先登录')
    e.needLogin = true
    throw e
  }
  const me = await getMe()
  const userId = me?.userId
  if (!userId) throw new Error('无法获取用户信息，请重新登录')
  return { userId }
}

async function confirmMockPay(qrId, userId) {
  const res = await new Promise((resolve) => {
    uni.showModal({
      title: '模拟支付',
      content: `开发 Mock：确认支付 ${formatPublishFeeYuan(PUBLISH_FEE_YUAN)} 元以继续发布？`,
      confirmText: '确认支付',
      cancelText: '取消',
      success: (r) => resolve(!!r.confirm),
    })
  })
  if (!res) {
    const e = new Error('已取消支付')
    e.cancelled = true
    throw e
  }
  await confirmMockPublishPayment(qrId, userId)
}

async function pollPublishPaid({ userId, qrId }) {
  let lastState = 'pending'
  for (let i = 0; i < POLL_MAX_TIMES; i++) {
    const state = await queryPublishPayState({ userId, qrId })
    if (state?.paid) return state
    if (state?.state) lastState = state.state
    if (state?.state === 'failed') {
      throw new Error('支付未成功（订单校验失败），请重新发布或联系客服')
    }
    if (state?.state === 'expired') {
      throw new Error('支付二维码已过期，请重新发布')
    }
    await sleep(POLL_INTERVAL_MS)
  }
  if (lastState === 'pending') {
    throw new Error('支付结果确认超时（可能回调延迟），请稍后重试发布或联系客服')
  }
  throw new Error('支付结果确认超时，请稍后在「我的活动」查看是否发布成功')
}

function requestWxPayment(paymentParams) {
  return new Promise((resolve, reject) => {
    if (!paymentParams || typeof paymentParams !== 'object') {
      reject(new Error('支付参数无效'))
      return
    }
    const params = { ...paymentParams }
    uni.requestPayment({
      ...params,
      success: (res) => {
        if (res?.errMsg === 'requestPayment:ok') {
          resolve(res)
          return
        }
        reject(new Error(res?.errMsg || '支付未完成'))
      },
      fail: (err) => {
        const msg = err?.errMsg || ''
        if (msg.includes('cancel')) {
          const e = new Error('已取消支付')
          e.cancelled = true
          reject(e)
          return
        }
        reject(new Error(msg || '拉起微信支付失败'))
      },
    })
  })
}

/**
 * H5：准备扫码支付，由 PublishPayModal 展示二维码并轮询。
 * @returns {{ needPayModal: true, userId: string, qrId: string, payCodeUrl?: string, mockMode: boolean }}
 */
export async function prepareH5PublishPayment() {
  const { userId } = await ensureLoggedInForPublish()
  const qrId = generatePayQrId()

  uni.showLoading({ title: '准备支付…', mask: true })
  let order
  try {
    order = await createPublishQrcode({ userId, qrId })
  } finally {
    uni.hideLoading()
  }

  if (!order?.qrId) throw new Error('创建支付单失败')

  const payUrl = order.payCodeUrl || ''
  const backendMock = payUrl.includes('mock_') || payUrl.startsWith('mock:')

  return {
    needPayModal: true,
    userId,
    qrId: order.qrId,
    payCodeUrl: payUrl,
    mockMode: isPublishPayMockEnabled() || backendMock,
    feeYuan: resolveFeeYuan(order),
  }
}

// #ifdef MP-WEIXIN
/**
 * 小程序：minAppPay（后续接入；当前可先走 H5 同款提示）。
 */
async function payByMiniprogram() {
  const { userId } = await ensureLoggedInForPublish()
  const qrId = generatePayQrId()
  uni.showLoading({ title: '准备支付…', mask: true })
  let order
  try {
    const code = await getWxLoginCode()
    order = await createPublishMinipay({ userId, qrId, code })
  } finally {
    uni.hideLoading()
  }

  const orderQrId = order?.qrId || qrId
  if (!orderQrId) throw new Error('创建支付单失败')

  const feeYuan = resolveFeeYuan(order)

  if (order?.mockSkip || isPublishPayMockEnabled()) {
    await confirmMockPay(orderQrId, userId)
    return { userId, qrId: orderQrId, feeYuan }
  }

  await confirmPayAmount(feeYuan)
  await requestWxPayment(order.paymentParams)
  uni.showLoading({ title: '确认支付结果…', mask: true })
  try {
    // 真支付后先主动查微信单一次（不依赖异步 notify）
    try {
      await syncPublishPayFromWechat({ userId, qrId: orderQrId })
    } catch (syncErr) {
      console.warn('[pay] sync from wechat failed, will poll', syncErr?.message || syncErr)
    }
    await pollPublishPaid({ userId, qrId: orderQrId })
  } finally {
    uni.hideLoading()
  }
  return { userId, qrId: orderQrId, feeYuan }
}
// #endif

/**
 * 发布活动前付费（当前优先 H5 扫码；小程序走 minipay 或提示）。
 */
export async function payBeforePublishActivity() {
  const cfg = await loadPublishPayConfig()
  if (!cfg.enabled) {
    return { skipped: true, publishPayEnabled: false }
  }

  // #ifdef H5
  return prepareH5PublishPayment()
  // #endif

  // #ifdef MP-WEIXIN
  return payByMiniprogram()
  // #endif

  // #ifndef H5 || MP-WEIXIN
  throw new Error('当前环境暂不支持支付，请使用 H5 或微信小程序')
  // #endif
}

export { pollPublishPaid, ensureLoggedInForPublish }
