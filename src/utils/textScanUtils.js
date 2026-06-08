/** 与后端 `text_scan_utils.py` 对齐 */

const ZERO_WIDTH = ['\u200b', '\u200c', '\u200d', '\ufeff', '\u2060']
const COMPACT_STRIP_RE = /[\s\u00b7\u2022\-_*\.\u3000]+/g

export function normalizeTextForScan(text) {
  let t = String(text || '')
  try {
    t = t.normalize('NFKC')
  } catch (e) {
    // ignore
  }
  for (let i = 0; i < ZERO_WIDTH.length; i++) {
    t = t.split(ZERO_WIDTH[i]).join('')
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

export function compactTextForSensitiveScan(text) {
  const norm = normalizeTextForScan(text).toLowerCase()
  return norm.replace(COMPACT_STRIP_RE, '')
}
