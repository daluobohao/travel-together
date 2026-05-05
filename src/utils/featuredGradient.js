/** 精选卡片渐变：本地 HSV 三色槽位（与卡片下标 idx % 3 对应） */

export const FEATURED_GRADIENT_STORAGE_KEY = 'DISCOVER_FEATURED_GRADIENT_SLOTS_V1'

/** 与原先三条内置渐变接近的默认 HSV */
export const DEFAULT_HSV_SLOTS = [
  { h: 158, s: 72, v: 82 },
  { h: 270, s: 85, v: 92 },
  { h: 38, s: 95, v: 98 },
]

export function hsvToRgb(h, s, v) {
  const hh = ((Number(h) % 360) + 360) % 360
  const ss = Math.max(0, Math.min(100, Number(s))) / 100
  const vv = Math.max(0, Math.min(100, Number(v))) / 100
  const c = vv * ss
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1))
  const m = vv - c
  let rp = 0
  let gp = 0
  let bp = 0
  if (hh < 60) {
    rp = c
    gp = x
    bp = 0
  } else if (hh < 120) {
    rp = x
    gp = c
    bp = 0
  } else if (hh < 180) {
    rp = 0
    gp = c
    bp = x
  } else if (hh < 240) {
    rp = 0
    gp = x
    bp = c
  } else if (hh < 300) {
    rp = x
    gp = 0
    bp = c
  } else {
    rp = c
    gp = 0
    bp = x
  }
  return [
    Math.round((rp + m) * 255),
    Math.round((gp + m) * 255),
    Math.round((bp + m) * 255),
  ]
}

export function gradientCssFromHsv(h, s, v) {
  const [r1, g1, b1] = hsvToRgb(h, s, v)
  const h2 = (Number(h) + 18 + Math.min(8, Math.round(Number(s) * 0.06))) % 360
  const s2 = Math.min(100, Number(s) + 8)
  const v2 = Math.max(22, Number(v) - 22)
  const [r2, g2, b2] = hsvToRgb(h2, s2, v2)
  return `linear-gradient(135deg, rgb(${r1},${g1},${b1}) 0%, rgb(${r2},${g2},${b2}) 100%)`
}

function normalizeSlot(slot) {
  return {
    h: Math.max(0, Math.min(360, Math.round(Number(slot.h) || 0))),
    s: Math.max(0, Math.min(100, Math.round(Number(slot.s) || 0))),
    v: Math.max(0, Math.min(100, Math.round(Number(slot.v) || 0))),
  }
}

export function loadFeaturedGradientSlots() {
  try {
    const raw = uni.getStorageSync(FEATURED_GRADIENT_STORAGE_KEY)
    if (!raw || !Array.isArray(raw) || raw.length !== 3) {
      return DEFAULT_HSV_SLOTS.map((s) => ({ ...s }))
    }
    return raw.map(normalizeSlot)
  } catch {
    return DEFAULT_HSV_SLOTS.map((s) => ({ ...s }))
  }
}

export function saveFeaturedGradientSlots(slots) {
  const normalized = (slots || []).slice(0, 3).map((slot) => normalizeSlot(slot || {}))
  while (normalized.length < 3) {
    normalized.push({ ...DEFAULT_HSV_SLOTS[normalized.length] })
  }
  uni.setStorageSync(FEATURED_GRADIENT_STORAGE_KEY, normalized)
}

export function gradientsFromSlots(slots) {
  const base =
    slots && Array.isArray(slots) && slots.length === 3
      ? slots
      : DEFAULT_HSV_SLOTS.map((s) => ({ ...s }))
  return base.map((slot) => gradientCssFromHsv(slot.h, slot.s, slot.v))
}
