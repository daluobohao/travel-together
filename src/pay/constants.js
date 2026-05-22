/**
 * 发布活动单次费用（元，展示用；实际扣款以后端 PAY_PUBLISH_FEE_YUAN 为准）
 * 是否付费以 GET /meta/publish 的 publishPayEnabled 为准（服务端 PAY_PUBLISH_ENABLED）。
 * 付费策略 A：仅前端保证「先付后发」；POST /activities 不校验是否已支付。
 */
export const PUBLISH_FEE_YUAN = 0.1

/** 拉取 /meta/publish 失败时的兜底（与后端默认 pay_publish_enabled=false 对齐） */
export const PUBLISH_PAY_FALLBACK_ENABLED = false

/** 与 daydaylove attach 第三段一致，用于支付回调识别业务 */
export const PUBLISH_PAY_PRODUCT = 'publish'

export const PUBLISH_PAY_PRODUCT_NAME = '发布活动'

/** 金额展示，如 0.1 → 「0.10」 */
export function formatPublishFeeYuan(yuan) {
  const n = Number(yuan ?? PUBLISH_FEE_YUAN)
  if (!Number.isFinite(n) || n < 0) return '0.10'
  return n.toFixed(2)
}

export function publishFeeLabel(yuan) {
  return `¥${formatPublishFeeYuan(yuan)}`
}
