import { wmRequest } from './client'
import { getMockEnabled } from './config'
import { PUBLISH_FEE_YUAN, PUBLISH_PAY_PRODUCT, PUBLISH_PAY_PRODUCT_NAME } from '@/pay/constants'

const ok = (data) => ({ code: 0, message: 'ok', data })

/** mock：qrId -> 是否已支付 */
const mockPaidOrders = new Map()

function markMockPaid(qrId) {
  if (qrId) mockPaidOrders.set(String(qrId), true)
}

function isMockPaid(qrId) {
  return mockPaidOrders.get(String(qrId)) === true
}

/**
 * H5 扫码支付：创建发布活动微信 Native 支付码（参考 daydaylove /api/pay/qrcode）。
 * 客户端先生成 qrId，后端 attach 为 `${userId},${qrId},publish`。
 * @returns {{ qrId: string, outTradeNo?: string, payCodeUrl: string, mockSkip?: boolean }}
 */
export const createPublishQrcode = ({ userId, qrId }) =>
  wmRequest({
    method: 'POST',
    path: '/pay/publish/qrcode',
    data: {
      userId,
      qrId,
      product: PUBLISH_PAY_PRODUCT,
    },
    needAuth: true,
    mockHandler: ({ data }) => {
      const id = data?.qrId || `mock_pub_${Date.now()}`
      console.info('[mock] POST /pay/publish/qrcode → pending', { qrId: id })
      return ok({
        qrId: id,
        outTradeNo: `wm_pub_${Date.now()}`,
        payCodeUrl: 'mock:publish',
        feeYuan: '0.10',
      })
    },
  })

/**
 * 创建发布活动小程序支付单（后端需用 code 换 openid 并调 YunGouOS minAppPay）。
 * @returns {{ qrId: string, outTradeNo?: string, paymentParams: object, mockSkip?: boolean }}
 */
export const createPublishMinipay = ({ userId, qrId, code }) =>
  wmRequest({
    method: 'POST',
    path: '/pay/publish/minipay',
    data: {
      userId,
      qrId,
      code,
      product: PUBLISH_PAY_PRODUCT,
    },
    needAuth: true,
    mockHandler: () => {
      const id = qrId || `mock_pub_${Date.now()}`
      return ok({
        qrId: id,
        outTradeNo: `wm_pub_${Date.now()}`,
        mockSkip: true,
        paymentParams: null,
        feeYuan: '0.10',
      })
    },
  })

/**
 * 查询支付结果（参考 daydaylove `/api/pay/state` 轮询）。
 * @returns {{ paid: boolean, state?: string, member?: string }}
 */
function payStateMockHandler({ data }) {
  const qid = data?.qrId
  const paid = isMockPaid(qid)
  console.info('[mock] pay state →', paid ? 'paid' : 'pending', { qr_id: qid })
  return ok({
    paid,
    state: paid ? 'paid' : 'pending',
    outTradeNo: paid ? `wm_pub_mock_${qid}` : undefined,
    paidAt: paid ? new Date().toISOString() : undefined,
  })
}

/** 查询支付结果；真实支付场景勿依赖本地 Mock 状态 */
export const queryPublishPayState = ({ userId, qrId }) => {
  const opts = {
    method: 'POST',
    path: '/pay/state',
    data: { userId, qrId, product: PUBLISH_PAY_PRODUCT },
    needAuth: true,
  }
  if (getMockEnabled()) {
    opts.mockHandler = payStateMockHandler
  }
  return wmRequest(opts)
}

/** 支付成功后立即查微信单（走真实接口，用于 minipay 真支付后） */
export const syncPublishPayFromWechat = ({ userId, qrId }) =>
  wmRequest({
    method: 'POST',
    path: '/pay/publish/sync',
    data: { userId, qrId, product: PUBLISH_PAY_PRODUCT },
    needAuth: true,
  })

/**
 * 模拟支付成功：前端 Mock 写本地状态；否则调后端 POST /pay/mock/confirm（须服务端 WECHAT_PAY_USE_MOCK）。
 */
export async function confirmMockPublishPayment(qrId, userId) {
  if (getMockEnabled()) {
    markMockPaid(qrId)
    console.info('[mock] 本地支付状态已标记 paid', { qr_id: qrId })
    return
  }
  if (!userId || !qrId) return
  await wmRequest({
    method: 'POST',
    path: '/pay/mock/confirm',
    data: { userId, qrId, product: PUBLISH_PAY_PRODUCT },
    needAuth: true,
  })
}

/** 是否处于本地支付 Mock（未请求真实 /pay/*） */
export function isPublishPayMockEnabled() {
  return getMockEnabled()
}
