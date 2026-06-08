/**
 * 与后端 `sensitive_content_filter.py` 对齐的本地敏感词过滤。
 */
import { compactTextForSensitiveScan, normalizeTextForScan } from '@/utils/textScanUtils'

export const SENSITIVE_REJECT_DETAIL = '所发布内容含违规信息，请修改后重试'

const CORE_TERMS = [
  '习近平',
  '习主席',
  '习大大',
  '习书记',
  '习总',
  '李克强',
  '毛泽东',
  '毛主席',
  '邓小平',
  '江泽民',
  '胡锦涛',
  '温家宝',
  '朱镕基',
  '周恩来',
  '华国锋',
  '六四',
  '六四事件',
  '8964',
  '64事件',
  '天安门事件',
  '天安门屠杀',
  '法轮功',
  '法轮大法',
  '真善忍',
  '台独',
  '台湾独立',
  '港独',
  '藏独',
  '疆独',
  '分裂国家',
  '颠覆政权',
  '反共产党',
  '反党',
  '反共',
  '颜色革命',
]

const STRICT_EXTRA_TERMS = [
  '习近乎',
  '习维尼',
  '维尼',
  '庆丰',
  '包子',
  '刁大大',
  '膜蛤',
  '赵家人',
  '扛麦郎',
  'xijinping',
  'xi jinping',
]

const STRICT_PATTERNS = [
  /习\s*近\s*平/,
  /x\s*i\s*j\s*i\s*n\s*p\s*i\s*n\s*g/i,
  /总理\s*李强|李强\s*总理|国务院总理/,
]

function containsTerm(compact, term) {
  const needle = compactTextForSensitiveScan(term)
  if (!needle) return false
  return compact.includes(needle)
}

export function sensitiveTextBlockedReason(text, { strict = false } = {}) {
  if (text == null) return null
  const raw = String(text).trim()
  if (!raw) return null

  const norm = normalizeTextForScan(raw)
  const compact = compactTextForSensitiveScan(raw)

  for (let i = 0; i < CORE_TERMS.length; i++) {
    if (containsTerm(compact, CORE_TERMS[i])) return SENSITIVE_REJECT_DETAIL
  }

  if (strict) {
    for (let i = 0; i < STRICT_EXTRA_TERMS.length; i++) {
      if (containsTerm(compact, STRICT_EXTRA_TERMS[i])) return SENSITIVE_REJECT_DETAIL
    }
    for (let i = 0; i < STRICT_PATTERNS.length; i++) {
      if (STRICT_PATTERNS[i].test(norm) || STRICT_PATTERNS[i].test(compact)) {
        return SENSITIVE_REJECT_DETAIL
      }
    }
  }

  return null
}
