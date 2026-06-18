/** 活动说明页：全站模板章节（与后端 GUIDE_SECTION_KEYS 对齐） */

export const ACTIVITY_GUIDE_OVERVIEW_KEY = 'overviewNote'

export const ACTIVITY_GUIDE_SECTIONS = [
  { key: 'itinerary', label: '行程安排', ordinal: '二' },
  { key: 'equipment', label: '装备要求', ordinal: '三' },
  { key: 'enrollmentRequirements', label: '报名条件', ordinal: '四' },
  { key: 'feeNote', label: '费用说明', ordinal: '五' },
  { key: 'risk', label: '风险提示', ordinal: '六' },
  { key: 'environment', label: '补充说明', ordinal: '七' },
]

export const ACTIVITY_GUIDE_EMPTY_HINT = '组织者暂未补充'

export function guideSectionText(sections, key) {
  if (!sections || typeof sections !== 'object') return ''
  const v = sections[key]
  return v != null ? String(v).trim() : ''
}

export function mergeGuideFormFromDetail(detail) {
  const src = detail?.guideSections || {}
  const form = { overviewNote: guideSectionText(src, 'overviewNote') }
  ACTIVITY_GUIDE_SECTIONS.forEach((s) => {
    form[s.key] = guideSectionText(src, s.key)
  })
  return form
}

export function buildGuideSectionsPayload(form) {
  const out = {}
  const put = (k, v) => {
    const t = (v || '').trim()
    if (t) out[k] = t
  }
  put('overviewNote', form.overviewNote)
  ACTIVITY_GUIDE_SECTIONS.forEach((s) => put(s.key, form[s.key]))
  return out
}

export const PUBLISH_GUIDE_DRAFT_KEY = 'wm_publish_guide_draft'
export const PUBLISH_GUIDE_DRAFT_CONTEXT_KEY = 'wm_publish_guide_draft_context'

export function readPublishGuideDraft() {
  try {
    const raw = uni.getStorageSync(PUBLISH_GUIDE_DRAFT_KEY)
    return raw && typeof raw === 'object' ? raw : {}
  } catch (_) {
    return {}
  }
}

export function writePublishGuideDraft(sections) {
  try {
    uni.setStorageSync(PUBLISH_GUIDE_DRAFT_KEY, sections && typeof sections === 'object' ? sections : {})
  } catch (_) {
    /* ignore */
  }
}

export function clearPublishGuideDraft() {
  try {
    uni.removeStorageSync(PUBLISH_GUIDE_DRAFT_KEY)
    uni.removeStorageSync(PUBLISH_GUIDE_DRAFT_CONTEXT_KEY)
  } catch (_) {
    /* ignore */
  }
}

export function readPublishGuideDraftContext() {
  try {
    const raw = uni.getStorageSync(PUBLISH_GUIDE_DRAFT_CONTEXT_KEY)
    return raw && typeof raw === 'object' ? raw : {}
  } catch (_) {
    return {}
  }
}

export function writePublishGuideDraftContext(ctx) {
  try {
    uni.setStorageSync(PUBLISH_GUIDE_DRAFT_CONTEXT_KEY, ctx && typeof ctx === 'object' ? ctx : {})
  } catch (_) {
    /* ignore */
  }
}

export function guideSectionsHasContent(sections) {
  const payload = buildGuideSectionsPayload(mergeGuideFormFromDetail({ guideSections: sections }))
  return Object.keys(payload).length > 0
}
