import {
  createPublishQrcode,
  createPublishMinipay,
  queryPublishPayState,
  isPublishPayMockEnabled,
} from '@/api/pay'
import { getMe, isLoggedIn } from '@/api'
import { getWxLoginCode } from '@/utils/wechatAuth'
import { generatePayQrId } from '@/utils/payQrId'
import { PUBLISH_FEE_YUAN } from '@/pay/constants'

const POLL_INTERVAL_MS = 1000
const POLL_MAX_TIMES = 100

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function ensureLoggedInForPublish() {
  if (!isLoggedIn()) {
    uni.setStorageSync('REDIRECT_URL', '/pages/publish/publish')
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

async function confirmMockPay(qrId) {
  const res = await new Promise((resolve) => {
    uni.showModal({
      title: '模拟支付',
      content: `开发 Mock：确认支付 ${PUBLISH_FEE_YUAN} 元以继续发布？`,
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
  confirmMockPublishPayment(qrId)
}

async function pollPublishPaid({ userId, qrId }) {
  for (let i = 0; i < POLL_MAX_TIMES; i++) {
    const state = await queryPublishPayState({ userId, qrId })
    if (state?.paid) return state
    await sleep(POLL_INTERVAL_MS)
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
    order = await createPublishQrcode({ qrId })
  } finally {
    uni.hideLoading()
  }

  if (!order?.qrId) throw new Error('创建支付单失败')

  return {
    needPayModal: true,
    userId,
    qrId: order.qrId,
    payCodeUrl: order.payCodeUrl || '',
    mockMode: isPublishPayMockEnabled(),
  }
}

// #ifdef MP-WEIXIN
/**
 * 小程序：minAppPay（后续接入；当前可先走 H5 同款提示）。
 */
async function payByMiniprogram() {
  const { userId } = await ensureLoggedInForPublish()
  uni.showLoading({ title: '准备支付…', mask: true })
  let order
  try {
    const code = await getWxLoginCode()
    order = await createPublishMinipay({ code })
  } finally {
    uni.hideLoading()
  }

  const qrId = order?.qrId
  if (!qrId) throw new Error('创建支付单失败')

  if (order?.mockSkip) {
    await confirmMockPay(qrId)
    return { userId, qrId }
  }

  await requestWxPayment(order.paymentParams)
  uni.showLoading({ title: '确认支付结果…', mask: true })
  try {
    await pollPublishPaid({ userId, qrId })
  } finally {
    uni.hideLoading()
  }
  return { userId, qrId }
}
// #endif

/**
 * 发布活动前付费（当前优先 H5 扫码；小程序走 minipay 或提示）。
 */
export async function payBeforePublishActivity() {
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
