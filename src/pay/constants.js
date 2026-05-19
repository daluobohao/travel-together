/**
 * 发布活动单次费用（元）
 * 付费策略 A：仅前端保证「先付后发」；POST /activities 不校验是否已支付。
 */
export const PUBLISH_FEE_YUAN = 1

/** 与 daydaylove attach 第三段一致，用于支付回调识别业务 */
export const PUBLISH_PAY_PRODUCT = 'publish'

export const PUBLISH_PAY_PRODUCT_NAME = '发布活动'
