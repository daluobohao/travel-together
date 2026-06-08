/**
 * 与后端 `local_text_content_filter.py` 对齐：联系方式 + 敏感词。
 */
import { contactTextBlockedReason } from '@/utils/contactContentFilter'
import { sensitiveTextBlockedReason } from '@/utils/sensitiveContentFilter'

export function localTextBlockedReason(text, { strict = false } = {}) {
  const contact = contactTextBlockedReason(text)
  if (contact) return contact
  return sensitiveTextBlockedReason(text, { strict })
}
