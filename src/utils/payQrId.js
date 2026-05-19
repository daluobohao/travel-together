/** 与 daydaylove attach 第二段 qr_id 一致，客户端生成后传给下单接口 */
export function generatePayQrId() {
  return `pub_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

/** 将 YunGouOS 返回的 weixin:// 链接转为可展示的二维码图片（仅 H5） */
export function buildWxPayQrImageUrl(payCodeUrl, size = 240) {
  const raw = String(payCodeUrl || '').trim()
  if (!raw || raw.startsWith('mock:')) return ''
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(raw)}`
}
