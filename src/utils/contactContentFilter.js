/**
 * 与后端 `contact_content_filter.py` 对齐，用于 Mock 与可选前端预校验。
 * @returns {string|null} 若需拦截则返回提示文案，否则 null
 */
export const CONTACT_REJECT_DETAIL = '为保护安全，请勿发送手机号、微信号等联系方式'

const SOLICIT_PHRASES = [
  '加我微信',
  '加你微信',
  '加您微信',
  '加下微信',
  '加个人微信',
  '加我个人微信',
  '加下我微信',
  '互加微信',
  '私聊微信',
  '私加微信',
]

/** 与后端同一套规则（冒号含半角与全角 U+FF1A） */
const CONTACT_HINT_PATTERNS = [
  /微信[号\s：:]*[a-zA-Z0-9_-]{4,32}/,
  /薇信[号\s：:]*[a-zA-Z0-9_-]{4,32}/,
  /wx\s*[\uFF1A:：]\s*[a-zA-Z0-9_-]{3,32}/i,
  /vx\s*[\uFF1A:：]\s*[a-zA-Z0-9_-]{3,32}/i,
  /微信号[：:\s]*[a-zA-Z0-9_-]{4,32}/,
  /wechat[：:\s]+[a-zA-Z0-9_-]{4,32}/i,
  /(?:QQ|qq)[：:\s]*\d{5,12}/,
  /扣扣[：:\s]*\d{5,12}/,
  /(?:互加|扫码加)(?:个)?微/,
]

function normalizeTextForScan(s) {
  let t = String(s || '')
  try {
    t = t.normalize('NFKC')
  } catch (e) {
    // ignore
  }
  for (const z of ['\u200b', '\u200c', '\u200d', '\ufeff', '\u2060']) {
    t = t.split(z).join('')
  }
  let out = ''
  for (let i = 0; i < t.length; i++) {
    const ch = t[i]
    const code = ch.charCodeAt(0)
    if (code >= 0xff10 && code <= 0xff19) {
      out += String.fromCharCode(code - 0xff10 + 48)
    } else {
      out += ch
    }
  }
  return out
}

function containsMainlandMobile(norm) {
  const digits = norm.replace(/\D/g, '')
  if (digits.length < 11) return false
  for (let i = 0; i <= digits.length - 11; i++) {
    const chunk = digits.slice(i, i + 11)
    if (/^1[3-9]\d{9}$/.test(chunk)) return true
  }
  return false
}

export function contactTextBlockedReason(text) {
  if (text == null) return null
  const raw = String(text).trim()
  if (!raw) return null
  const norm = normalizeTextForScan(raw)
  if (containsMainlandMobile(norm)) return CONTACT_REJECT_DETAIL
  for (let i = 0; i < SOLICIT_PHRASES.length; i++) {
    if (norm.includes(SOLICIT_PHRASES[i])) return CONTACT_REJECT_DETAIL
  }
  for (let i = 0; i < CONTACT_HINT_PATTERNS.length; i++) {
    if (CONTACT_HINT_PATTERNS[i].test(norm)) return CONTACT_REJECT_DETAIL
  }
  return null
}
