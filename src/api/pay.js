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
      })
    },
  })

/**
 * 创建发布活动小程序支付单（后端需用 code 换 openid 并调 YunGouOS minAppPay）。
 * @returns {{ qrId: string, outTradeNo?: string, paymentParams: object, mockSkip?: boolean }}
 */
export const createPublishMinipay = (payload) =>
  wmRequest({
    method: 'POST',
    path: '/pay/publish/minipay',
    data: {
      code: payload?.code,
      fee: PUBLISH_FEE_YUAN,
      name: PUBLISH_PAY_PRODUCT_NAME,
      product: PUBLISH_PAY_PRODUCT,
    },
    needAuth: true,
    mockHandler: () => {
      const qrId = `mock_pub_${Date.now()}`
      return ok({
        qrId,
        outTradeNo: `wm_pub_${Date.now()}`,
        mockSkip: true,
        paymentParams: null,
      })
    },
  })

/**
 * 查询支付结果（参考 daydaylove `/api/pay/state` 轮询）。
 * @returns {{ paid: boolean, state?: string, member?: string }}
 */
export const queryPublishPayState = ({ userId, qrId }) =>
  wmRequest({
    method: 'POST',
    path: '/pay/state',
    data: {
      userId,
      qrId,
      product: PUBLISH_PAY_PRODUCT,
    },
    needAuth: true,
    mockHandler: ({ data }) => {
      const qid = data?.qrId
      const paid = isMockPaid(qid)
      console.info('[mock] POST /pay/state →', paid ? 'paid' : 'pending', { qr_id: qid })
      return ok({
        paid,
        state: paid ? 'paid' : 'pending',
        outTradeNo: paid ? `wm_pub_mock_${qid}` : undefined,
        paidAt: paid ? new Date().toISOString() : undefined,
      })
    },
  })

/** mock 模式下模拟 YunGouOS 回调成功，供 POST /pay/state 轮询到 paid */
export function confirmMockPublishPayment(qrId) {
  markMockPaid(qrId)
  console.info('[mock] 支付回调已模拟（attach 第三段 publish）', { qr_id: qrId })
}

/** 是否处于本地支付 Mock（未请求真实 /pay/*） */
export function isPublishPayMockEnabled() {
  return getMockEnabled()
}
