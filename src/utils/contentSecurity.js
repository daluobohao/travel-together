/** 微信小程序内容安全：发布前调用后端 ``POST /content/sec-check``（对接微信 msgSecCheck） */

import { checkContentSec } from '@/api'

export const CONTENT_VIOLATION_MSG = '所发布内容含违规信息，请修改后重试'

/** scene：1 资料 2 评论 3 论坛 4 社交日志 */
export const SEC_SCENE = {
  PROFILE: 1,
  COMMENT: 2,
  FORUM: 3,
  SOCIAL: 4,
}

export function isContentViolationMessage(msg) {
  const s = String(msg || '').trim()
  return s.includes('违规') || s.includes('87014')
}

export function normalizeContentViolationMessage(msg) {
  return isContentViolationMessage(msg) ? CONTENT_VIOLATION_MSG : (msg || CONTENT_VIOLATION_MSG)
}

/** 发布前检测单段文本；不通过时 toast 并 throw */
export async function ensureTextContentSafe(text, scene = SEC_SCENE.SOCIAL) {
  const raw = (text || '').trim()
  if (!raw) return
  try {
    await checkContentSec({ content: raw, scene })
  } catch (e) {
    const msg = normalizeContentViolationMessage(e?.message)
    uni.showToast({ title: msg, icon: 'none' })
    const err = new Error(msg)
    err.isContentViolation = true
    throw err
  }
}

/** 多字段依次检测（空值跳过） */
export async function ensureTextFieldsSafe(fields, scene = SEC_SCENE.SOCIAL) {
  for (const value of Object.values(fields || {})) {
    await ensureTextContentSafe(value, scene)
  }
}
