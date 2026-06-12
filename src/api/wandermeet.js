import {
  ACTIVITY_CATEGORY_COLOR_MAP,
  FALLBACK_ACTIVITY_CATEGORIES,
  formatActivityCategoryDisplay,
  normalizeCategoryList,
} from '@/constants/activityCategories'
import { wmRequest, paginate } from './client'
import { clearWmAuthTokens, getMockEnabled, setAccessToken, setRefreshToken } from './config'
import cityHallPrefectures from './city_hall_prefectures.json'
import { provinceDisplayName } from './china_province_display.js'
import { wmDB, toActivityCard } from '@/mock/wandermeet-db'
import {
  mockAdminApprovePhotoVerification,
  mockAdminListPhotoVerifications,
  mockAdminRejectPhotoVerification,
  mockApprovePhotoVerification,
  mockBindReferral,
  mockCheckin,
  mockEnhancePublicProfile,
  mockGetCheckinWindow,
  mockGetEntitlements,
  mockGetMeetHistory,
  mockGetOrganizerExposure,
  mockGetPendingCheckins,
  mockGetPhotoVerification,
  mockGetPremium,
  mockGetReferral,
  mockGetReviewCandidates,
  mockGetSafetyGuide,
  mockGetTrust,
  mockHasSafetyAck,
  mockOnQualifiedAction,
  mockPinActivity,
  mockSafetyAck,
  mockSetBadgeVisibility,
  mockSetShowMeetCount,
  mockSubmitPhotoVerification,
  mockSubmitReview,
} from '@/mock/growth-trust-mock'
import {
  mockCreateFeedComment,
  mockCreateFeedPost,
  mockDeleteFeedPost,
  mockFollowUser,
  mockGetFeedPost,
  mockGetFeedTopics,
  mockGetFollowStatus,
  mockListActivityPosts,
  mockListFeed,
  mockListFeedComments,
  mockListUserPosts,
  mockToggleLike,
} from '@/mock/feed-mock'
import { localTextBlockedReason } from '@/utils/localTextContentFilter'
import { SENSITIVE_REJECT_DETAIL } from '@/utils/sensitiveContentFilter'
import { cityShortNameForHostBadge } from '@/utils/cityCatalog'
import { isKnownStickerId } from '@/constants/chatStickers'

const ok = (data) => ({ code: 0, message: 'ok', data })

function mockActivityContentStrict(activityId) {
  const activity = wmDB.activities.find((x) => x.activityId === String(activityId))
  return (activity?.activityKind || '') === 'city_hall'
}

function mockLocalTextBlocked(text, activityId) {
  return localTextBlockedReason(text, { strict: mockActivityContentStrict(activityId) })
}

function mockChainPayload(title, description, entries, closed = false) {
  return JSON.stringify({
    kind: 'chain_signup',
    title: String(title || '').trim(),
    description: String(description || '').trim(),
    closed: !!closed,
    entries: entries || [],
  })
}

function mockDecodeChain(textContent) {
  if (!textContent) return null
  try {
    const data = JSON.parse(textContent)
    if (data?.kind !== 'chain_signup') return null
    return data
  } catch {
    return null
  }
}

function mockChainFieldsFromRow(row) {
  if (row.msgType !== 'chain_signup') return {}
  const data = mockDecodeChain(row.text)
  if (!data) {
    return {
      chainTitle: row.chainTitle || '',
      chainDescription: row.chainDescription || '',
      chainClosed: !!row.chainClosed,
      chainEntries: row.chainEntries || [],
    }
  }
  return {
    chainTitle: data.title || '',
    chainDescription: data.description || '',
    chainClosed: !!data.closed,
    chainEntries: data.entries || [],
  }
}

function mockDecodeMentions(textContent) {
  if (!textContent || !String(textContent).startsWith('{')) return null
  try {
    const data = JSON.parse(textContent)
    if (data?.kind !== 'text_mentions') return null
    return {
      text: data.text || '',
      mentions: Array.isArray(data.mentions) ? data.mentions : [],
    }
  } catch {
    return null
  }
}

function mockMentionFieldsFromRow(row) {
  if (row.msgType !== 'text') return {}
  if (row.mentions?.length) {
    return { text: row.text || '', mentions: row.mentions }
  }
  const decoded = mockDecodeMentions(row.text)
  if (decoded) return decoded
  return { mentions: [] }
}

function mockChatMessageRow(base, data) {
  const msgType = data.msgType || 'text'
  const row = {
    ...base,
    msgType,
    text: msgType === 'text' ? data.text || null : null,
    imageUrl: msgType === 'image' ? data.imageUrl || null : null,
    stickerId: msgType === 'sticker' ? data.stickerId : null,
    locationName: null,
    address: null,
    lat: null,
    lng: null,
    createdAt: new Date().toISOString(),
  }
  if (msgType === 'location') {
    row.locationName = data.locationName || null
    row.address = data.address || null
    row.lat = data.lat
    row.lng = data.lng
  }
  if (msgType === 'activity_rec') {
    row.recActivityId = data.recActivityId || null
    row.recActivityTitle = data.recActivityTitle || null
    row.text = data.text || null
  }
  if (msgType === 'chain_signup') {
    const me = wmDB.profile?.userId || 'me'
    const nickname = wmDB.profile?.nickname || '你'
    const note = (data.chainNote || '').trim()
    const entries = [
      {
        entryId: `e_${me}`,
        userId: me,
        nickname,
        note,
        createdAt: new Date().toISOString(),
      },
    ]
    row.text = mockChainPayload(data.chainTitle, data.chainDescription, entries, false)
    Object.assign(row, mockChainFieldsFromRow(row))
  }
  if (msgType === 'text' && data.mentions?.length) {
    row.mentions = data.mentions
  }
  return row
}

function mockChatLastPreview(msg) {
  if (!msg) return null
  const t = msg.msgType
  if (t === 'image') return '[图片]'
  if (t === 'sticker') return '[表情]'
  if (t === 'location') {
    const n = msg.locationName || ''
    return n ? `[位置] ${String(n).slice(0, 24)}` : '[位置]'
  }
  if (t === 'activity_rec') {
    const title = msg.recActivityTitle || ''
    return title ? `[活动] ${String(title).slice(0, 24)}` : '[活动推荐]'
  }
  if (t === 'chain_signup') {
    const fields = mockChainFieldsFromRow(msg)
    const count = (fields.chainEntries || []).length
    const title = fields.chainTitle || '接龙'
    return `[接龙] ${String(title).slice(0, 20)} (${count}人)`
  }
  return msg.text || null
}

function mockCityNameFromCode(cityCode) {
  for (const blk of cityHallPrefectures) {
    for (const c of blk.cities || []) {
      if (c.cityCode === cityCode) return c.cityName
    }
  }
  return cityCode
}

function mockHostBadgeLabel(cityCode, role = 'owner') {
  const short = cityShortNameForHostBadge(mockCityNameFromCode(cityCode))
  return role === 'deputy' ? `${short}副城主` : `${short}城主`
}

function mockBuildHostSummary(userId, cityCode, role = 'owner') {
  const u = wmDB.users?.[userId] || {}
  const cityName = mockCityNameFromCode(cityCode)
  return {
    userId,
    nickname: u.nickname || '用户',
    avatarUrl: u.avatarUrl || null,
    role,
    badgeLabel: mockHostBadgeLabel(cityCode, role),
  }
}

function mockLookupHostFields(cityCode) {
  const cfg = wmDB.cityGroupHosts?.[cityCode]
  if (!cfg?.ownerUserId) {
    return {
      owner: null,
      announcement: null,
      welcomeText: null,
      currentUserHostRole: null,
      ...mockApplyFields(cityCode, 0),
    }
  }
  const me = wmDB.profile?.userId
  let currentUserHostRole = null
  if (me === cfg.ownerUserId) currentUserHostRole = 'owner'
  else if ((cfg.deputies || []).includes(me)) currentUserHostRole = 'deputy'
  return {
    owner: mockBuildHostSummary(cfg.ownerUserId, cityCode, 'owner'),
    announcement: cfg.announcement || null,
    welcomeText: cfg.welcomeText || null,
    currentUserHostRole,
    ...mockApplyFields(cityCode, 0),
  }
}

function mockApplyFields(cityCode, memberCount) {
  const hasOwner = !!wmDB.cityGroupHosts?.[cityCode]?.ownerUserId
  const mc = cityCode === '440300' ? 120 : Number(memberCount || 0)
  const me = wmDB.profile?.userId
  const pending = (wmDB.cityGroupHostApplications || []).some(
    (a) =>
      a.cityCode === cityCode &&
      a.userId === me &&
      a.status === 'pending' &&
      a.applicationType === 'owner',
  )
  let canApply = !hasOwner && mc >= 100 && !pending
  let denyReason = null
  if (hasOwner) denyReason = 'has_owner'
  else if (mc < 100) denyReason = 'member_count_low'
  else if (pending) {
    canApply = false
    denyReason = 'pending_application'
  }
  return {
    canApplyForOwner: canApply,
    denyReason,
    hostApplicationStatus: pending ? 'pending' : null,
    ownerVacantDays: hasOwner ? 0 : 45,
    applyMinMembers: 100,
  }
}

function mockListCityHostBadges(userId) {
  const out = []
  for (const [cityCode, cfg] of Object.entries(wmDB.cityGroupHosts || {})) {
    if (cfg.ownerUserId === userId) {
      out.push({
        cityCode,
        cityName: mockCityNameFromCode(cityCode),
        role: 'owner',
        badgeLabel: mockHostBadgeLabel(cityCode, 'owner'),
      })
    }
    for (const dep of cfg.deputies || []) {
      if (dep === userId) {
        out.push({
          cityCode,
          cityName: mockCityNameFromCode(cityCode),
          role: 'deputy',
          badgeLabel: mockHostBadgeLabel(cityCode, 'deputy'),
        })
      }
    }
  }
  return out
}

function mockHostRoleForSender(activityId, userId) {
  const act = wmDB.activities.find((a) => String(a.activityId) === String(activityId).replace(/^act_/, ''))
  const cc = act?.cityCode
  if (!cc || (act?.activityKind || 'event') !== 'city_hall') return null
  const cfg = wmDB.cityGroupHosts?.[cc]
  if (!cfg) return null
  if (cfg.ownerUserId === userId) return 'owner'
  if ((cfg.deputies || []).includes(userId)) return 'deputy'
  return null
}

function buildMockCityHallCatalog() {
  const provinces = cityHallPrefectures.map((blk) => ({
    provinceCode: blk.provinceCode,
    provinceName: provinceDisplayName(blk.provinceCode),
    cities: (blk.cities || []).map((c) => {
      const hostCfg = wmDB.cityGroupHosts?.[c.cityCode]
      const ownerNick = hostCfg?.ownerUserId
        ? wmDB.users?.[hostCfg.ownerUserId]?.nickname || null
        : null
      return {
        cityCode: c.cityCode,
        cityName: c.cityName,
        displayName: `${c.cityName} · 城市大群`,
        memberCount: 0,
        activityId: null,
        joined: null,
        ownerNickname: ownerNick,
      }
    }),
  }))
  return { provinces }
}

function normalizePlaceQuery(raw) {
  let s = String(raw || '')
    .trim()
    .toLowerCase()
  try {
    s = s.normalize('NFKC')
  } catch (_) {
    /* ignore */
  }
  return s.replace(/\u3000/g, ' ').trim()
}

function placeSearchNeedles(raw) {
  const q = normalizePlaceQuery(raw)
  if (!q || q.length > 32) return []
  const needles = [q]
  for (const sep of ['市', '自治州', '盟', '地区', '州']) {
    const i = q.indexOf(sep)
    if (i !== -1) {
      const sub = q.slice(0, i + sep.length)
      if (sub && sub !== q) needles.push(sub)
    }
  }
  return [...new Set(needles)]
}

function mockPlaceSuggestionSearch(raw) {
  const needles = placeSearchNeedles(raw)
  if (!needles.length) return []
  const out = []
  for (const blk of cityHallPrefectures) {
    const pcode = blk.provinceCode
    const pname = provinceDisplayName(pcode)
    for (const c of blk.cities || []) {
      const code = c.cityCode
      const name = c.cityName
      const hay = `${name} ${code} ${pname}`.toLowerCase()
      const hit =
        needles.some((n) => hay.includes(n)) ||
        needles.some((n) => String(code).toLowerCase().includes(n))
      if (hit) {
        out.push({
          cityCode: code,
          cityName: name,
          provinceCode: pcode,
          provinceName: pname,
        })
        if (out.length >= 30) return out
      }
    }
  }
  return out
}

const _MUNICIPALITY_PREFIXES = new Set(['11', '12', '31', '50'])

/** 与后端 ``activity_city_code_matches`` 对齐，供 Mock 列表过滤。 */
function activityCityMatchesPlaceFilter(selectedCode, activityCityCode) {
  const a = String(activityCityCode || '').trim()
  const s = String(selectedCode || '').trim()
  if (!s) return true
  if (a === s) return true
  if (/^\d{6}$/.test(s) && s.slice(0, 2) !== '00') {
    const prov = `${s.slice(0, 2)}0000`
    const skipProv = _MUNICIPALITY_PREFIXES.has(s.slice(0, 2)) && s !== prov
    const variants = new Set([s, `${s.slice(0, 4)}00`])
    if (!skipProv) variants.add(prov)
    if (variants.has(a)) return true
    if (s.endsWith('0000')) return a.startsWith(s.slice(0, 2))
    if (
      s.endsWith('00') &&
      !s.endsWith('0000') &&
      !_MUNICIPALITY_PREFIXES.has(s.slice(0, 2))
    ) {
      return a.startsWith(s.slice(0, 4))
    }
  }
  return false
}

function mockRequirePhoneBound() {
  if (!wmDB.profile.phoneBound) {
    return { code: 403, message: '请先绑定手机号', data: null }
  }
  return null
}

function toRad(n) {
  return (Number(n) * Math.PI) / 180
}

function calcDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6378137
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

function normalizeDateRange(list, dateRange) {
  if (dateRange === 'today') return list.filter((x) => x.activityId === '1' || x.activityId === '3')
  if (dateRange === 'tomorrow') return list.filter((x) => x.activityId === '2')
  if (dateRange === 'weekend') return list.filter((x) => x.activityId === '2')
  if (dateRange === 'next7d') {
    const now = Date.now()
    const max = now + 7 * 24 * 60 * 60 * 1000
    const bjOffsetMs = 8 * 60 * 60 * 1000
    const bjNow = new Date(now + bjOffsetMs)
    const earliest =
      Date.UTC(bjNow.getUTCFullYear(), bjNow.getUTCMonth(), bjNow.getUTCDate()) - bjOffsetMs
    return list.filter((x) => {
      const ms = new Date(x.startAt).getTime()
      return Number.isFinite(ms) && ms >= earliest && ms <= max
    })
  }
  return list
}

function sortActivityCards(list, sortBy) {
  const sb = sortBy || 'startAt'
  if (sb === 'popularity') {
    return list.slice().sort((a, b) => {
      const diff = Number(b.enrolledCount || 0) - Number(a.enrolledCount || 0)
      if (diff !== 0) return diff
      return new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    })
  }
  if (sb === 'startAt') {
    return list.slice().sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
  }
  return list
}

// 1
export const sendSmsCode = (payload) =>
  wmRequest({
    method: 'POST',
    path: '/auth/sms/send',
    data: payload,
    needAuth: false,
    mockHandler: () => ok({ expireInSeconds: 300 }),
  })

function mockAuthLoginData(tokenSuffix = 'mock') {
  const data = {
    accessToken: `wm_at_${tokenSuffix}`,
    expiresIn: 7200,
    refreshToken: `wm_rt_${tokenSuffix}`,
    user: {
      userId: wmDB.profile.userId,
      nickname: wmDB.profile.nickname,
      avatarUrl: wmDB.profile.avatarUrl,
      gender: wmDB.profile.gender,
      status: wmDB.profile.status,
      onboardingCompletedAt: wmDB.profile.onboardingCompletedAt,
    },
  }
  setAccessToken(data.accessToken)
  setRefreshToken(data.refreshToken)
  return ok(data)
}

// 2
export const loginBySms = (payload) =>
  wmRequest({
    method: 'POST',
    path: '/auth/sms/login',
    data: payload,
    needAuth: false,
    mockHandler: () => mockAuthLoginData('mock'),
  })

// 2.1 H5 邮箱注册
export const registerByEmail = (payload) =>
  wmRequest({
    method: 'POST',
    path: '/auth/email/register',
    data: payload,
    needAuth: false,
    mockHandler: ({ data }) => {
      const email = (data && data.email) || 'user@example.com'
      const local = String(email).split('@')[0] || '旅人'
      wmDB.profile.nickname = wmDB.profile.nickname || local
      return mockAuthLoginData(`email_reg_${Date.now()}`)
    },
  })

// 2.2 H5 邮箱登录
export const loginByEmail = (payload) =>
  wmRequest({
    method: 'POST',
    path: '/auth/email/login',
    data: payload,
    needAuth: false,
    mockHandler: () => mockAuthLoginData('email_login'),
  })

// 2.3.1 H5 忘记密码 — 发送验证码
export const forgotPasswordByEmail = (payload) =>
  wmRequest({
    method: 'POST',
    path: '/auth/email/forgot-password',
    data: payload,
    needAuth: false,
    mockHandler: () => ok({ expireInSeconds: 900 }),
  })

// 2.3.2 H5 忘记密码 — 重置密码并登录
export const resetPasswordByEmail = (payload) =>
  wmRequest({
    method: 'POST',
    path: '/auth/email/reset-password',
    data: payload,
    needAuth: false,
    mockHandler: () => mockAuthLoginData('email_reset'),
  })

export const bindPhoneWechat = (payload) =>
  wmRequest({
    method: 'POST',
    path: '/me/phone/bind-wechat',
    data: payload,
    needAuth: true,
    mockHandler: ({ data }) => {
      const phone = '13800138000'
      wmDB.profile.phoneBound = true
      wmDB.profile.phoneMasked = '138****8000'
      const out = {
        phoneMasked: wmDB.profile.phoneMasked,
        phoneBound: true,
        merged: false,
      }
      if (data?.phoneCode === 'merge') {
        out.merged = true
        out.accessToken = 'wm_at_mock_merged'
        out.expiresIn = 7200
        out.refreshToken = 'wm_rt_mock_merged'
        out.user = { ...wmDB.profile }
      }
      return ok(out)
    },
  })

export const bindPhoneSms = (payload) =>
  wmRequest({
    method: 'POST',
    path: '/me/phone/bind-sms',
    data: payload,
    needAuth: true,
    mockHandler: () => {
      wmDB.profile.phoneBound = true
      wmDB.profile.phoneMasked = '138****8000'
      return ok({
        phoneMasked: wmDB.profile.phoneMasked,
        phoneBound: true,
        merged: false,
      })
    },
  })

// 2.5 微信小程序登录（wx.login 的 code → 与短信登录相同 token 结构）
export const loginByWechat = (payload) =>
  wmRequest({
    method: 'POST',
    path: '/auth/wechat/login',
    data: payload,
    needAuth: false,
    mockHandler: ({ data }) => {
      const code = (data && data.code) || 'mock_wx_code'
      const openidKey = `mock_${String(code).slice(0, 24)}`
      const dataOut = {
        accessToken: `wm_at_${openidKey}`,
        expiresIn: 7200,
        refreshToken: `wm_rt_${openidKey}`,
        user: {
          userId: wmDB.profile.userId,
          nickname: wmDB.profile.nickname || '微信用户',
          avatarUrl: wmDB.profile.avatarUrl,
          gender: wmDB.profile.gender,
          status: wmDB.profile.status || 'active',
          onboardingCompletedAt: wmDB.profile.onboardingCompletedAt,
        },
      }
      setAccessToken(dataOut.accessToken)
      setRefreshToken(dataOut.refreshToken)
      return ok(dataOut)
    },
  })

// 2.6 抖音小程序登录
// POST /api/v1/wm/auth/douyin/login
// Body: { code: string } — tt.login 返回的 code
// Response: accessToken, refreshToken, expiresIn, user（与短信/微信登录相同）
export const loginByDouyin = (payload) =>
  wmRequest({
    method: 'POST',
    path: '/auth/douyin/login',
    data: { code: payload?.code },
    needAuth: false,
    mockHandler: ({ data }) => {
      const code = (data && data.code) || 'mock_tt_code'
      const openidKey = `dy_${String(code).slice(0, 24)}`
      const dataOut = {
        accessToken: `wm_at_${openidKey}`,
        expiresIn: 7200,
        refreshToken: `wm_rt_${openidKey}`,
        user: {
          userId: wmDB.profile.userId,
          nickname: wmDB.profile.nickname || '抖音用户',
          avatarUrl: wmDB.profile.avatarUrl,
          gender: wmDB.profile.gender,
          status: wmDB.profile.status || 'active',
          onboardingCompletedAt: wmDB.profile.onboardingCompletedAt,
        },
      }
      setAccessToken(dataOut.accessToken)
      setRefreshToken(dataOut.refreshToken)
      return ok(dataOut)
    },
  })

// 3
export const refreshToken = (payload) =>
  wmRequest({
    method: 'POST',
    path: '/auth/token/refresh',
    data: payload,
    needAuth: false,
    mockHandler: () => {
      const data = {
        accessToken: 'wm_at_mock_new',
        expiresIn: 7200,
        refreshToken: `wm_rt_mock_${Date.now()}`,
      }
      setAccessToken(data.accessToken)
      setRefreshToken(data.refreshToken)
      return ok(data)
    },
  })

/** 调用后端吊销当前 access + refresh；无论成功与否都会清空本地 token */
export const logout = async () => {
  try {
    await wmRequest({
      method: 'POST',
      path: '/auth/logout',
      needAuth: true,
      mockHandler: () => ok({ status: 'ok' }),
    })
  } catch {
    // 仍清本地，避免残留凭证
  } finally {
    clearWmAuthTokens()
    import('@/utils/messageUnread')
      .then((m) => m.clearMessageUnreadSummary())
      .catch(() => {})
  }
}

// 4
export const getMe = () =>
  wmRequest({
    method: 'GET',
    path: '/me',
    mockHandler: () => ok(wmDB.profile),
  })

export const getMyStats = () =>
  wmRequest({
    method: 'GET',
    path: '/me/stats',
    mockHandler: () =>
      ok({
        joinedCount: wmDB.activities.filter((x) => x.myEnrollment).length,
        organizedCount: wmDB.activities.filter((x) => x.organizer?.userId === wmDB.profile.userId)
          .length,
      }),
  })

// 5
export const updateMe = (payload) =>
  wmRequest({
    method: 'PATCH',
    path: '/me',
    data: payload,
    mockHandler: ({ data }) => {
      if (data.gender != null) {
        if (wmDB.profile.gender != null && data.gender !== wmDB.profile.gender) {
          return { code: 400, message: '提交后不可修改性别', data: null }
        }
        if (wmDB.profile.gender == null) {
          wmDB.profile.gender = data.gender
        }
      }
      wmDB.profile = {
        ...wmDB.profile,
        nickname: data.nickname ?? wmDB.profile.nickname,
        avatarUrl: data.avatarUrl ?? wmDB.profile.avatarUrl,
        tags: data.tags ?? wmDB.profile.tags,
        bio: data.bio ?? wmDB.profile.bio,
        countryCode: data.countryCode ?? wmDB.profile.countryCode,
        travelerRoles: data.travelerRoles ?? wmDB.profile.travelerRoles,
        currentPlace: data.currentPlace ?? wmDB.profile.currentPlace,
        stayKind: data.stayKind ?? wmDB.profile.stayKind,
        stayEndAt: data.stayEndAt ?? wmDB.profile.stayEndAt,
        acquisitionSource: data.acquisitionSource ?? wmDB.profile.acquisitionSource,
        notifyPrefs: data.notifyPrefs ?? wmDB.profile.notifyPrefs,
        showDistance: data.showDistance ?? wmDB.profile.showDistance,
      }
      if (data.completeOnboarding) {
        wmDB.profile.onboardingCompletedAt = new Date().toISOString()
      }
      const uid = wmDB.profile.userId
      if (uid && wmDB.users?.[uid]) {
        wmDB.users[uid] = { ...wmDB.users[uid], gender: wmDB.profile.gender }
      }
      return ok(wmDB.profile)
    },
  })

// 6
export const getAvatarUploadUrl = (payload) =>
  wmRequest({
    method: 'POST',
    path: '/me/avatar/upload-url',
    data: payload,
    mockHandler: ({ data }) => {
      const ext = data.fileExt || 'jpg'
      const publicUrl = `https://oss.example.com/wm/avatar/${wmDB.profile.userId}/avatar.${ext}`
      return ok({
        uploadUrl: 'https://oss.example.com/mock-upload',
        objectKey: `wm/avatar/u_${wmDB.profile.userId}/avatar.${ext}`,
        publicUrl,
        headers: {},
      })
    },
  })

// 6.1 头像上传见 ./avatarUpload.js（避免本文件循环依赖）
export { uploadAvatar } from './avatarUpload'
export { uploadChatImage } from './chatImageUpload'
export { uploadPhotoVerificationSelfie } from './photoVerifyUpload'

// 7
export const getVerification = () =>
  wmRequest({
    method: 'GET',
    path: '/me/verification',
    mockHandler: () =>
      ok({
        status: wmDB.profile.verification.status,
        rejectReason: null,
        submittedAt: null,
        reviewedAt: null,
      }),
  })

// 8
export const submitVerification = (payload) =>
  wmRequest({
    method: 'POST',
    path: '/me/verification',
    data: payload,
    mockHandler: () => {
      wmDB.profile.verification.status = 'pending'
      wmDB.profile.verification.canCreateActivity = false
      return ok({ status: 'pending' })
    },
  })

// 9
export const getPublishMeta = () =>
  wmRequest({
    method: 'GET',
    path: '/meta/publish',
    needAuth: false,
    mockHandler: () =>
      ok({
        publishPayEnabled: false,
        publishFeeYuan: '0.10',
      }),
  })

export const getOnboardingMeta = () =>
  wmRequest({
    method: 'GET',
    path: '/meta/onboarding',
    needAuth: false,
    mockHandler: () =>
      ok({
        fullOnboardingEnabled: false,
        acquisitionSources: [
          { id: 'xiaohongshu', label: '小红书' },
          { id: 'douyin', label: '抖音' },
          { id: 'friend', label: '朋友推荐' },
          { id: 'other', label: '其他' },
        ],
        countryCodes: [
          { id: 'CN', label: '中国' },
          { id: 'US', label: '美国' },
          { id: 'JP', label: '日本' },
          { id: 'OTHER', label: '其他' },
        ],
        travelerRoles: [
          { id: 'leisure', label: '休闲旅行', description: '' },
          { id: 'digital_nomad', label: '数字游民', description: '' },
          { id: 'local_host', label: '本地东道主', description: '' },
        ],
        interestCategories: [
          {
            categoryId: 'food',
            name: '美食饮品',
            tags: [
              { id: 'foodie', label: '美食探店' },
              { id: 'coffee', label: '咖啡' },
            ],
          },
          {
            categoryId: 'outdoor',
            name: '户外',
            tags: [
              { id: 'hiking', label: '徒步' },
              { id: 'cycling', label: '骑行' },
            ],
          },
        ],
        stayKinds: [
          { id: 'indefinite', label: '常住 / 暂无离开计划' },
          { id: 'fixed_dates', label: '有明确停留区间' },
        ],
      }),
  })

export const getActivityCategories = () =>
  wmRequest({
    method: 'GET',
    path: '/meta/activity-categories',
    needAuth: false,
    mockHandler: () => ok({ categories: normalizeCategoryList(FALLBACK_ACTIVITY_CATEGORIES) }),
  })

export const getCityGroupsMeta = () =>
  wmRequest({
    method: 'GET',
    path: '/meta/city-groups',
    needAuth: false,
    mockHandler: () =>
      ok({
        recommendTip: '',
        userCanCreate: false,
      }),
  })

export const getCityHallCatalog = () =>
  wmRequest({
    method: 'GET',
    path: '/city-groups/catalog',
    needAuth: false,
    tokenIfPresent: true,
    mockHandler: () => ok(buildMockCityHallCatalog()),
  })

export const getCityHallLookup = (cityCode) =>
  wmRequest({
    method: 'GET',
    path: '/city-groups/lookup',
    query: { cityCode },
    needAuth: false,
    tokenIfPresent: true,
    mockHandler: ({ query: q }) => {
      const cc = (q && q.cityCode) || '110000'
      const hostFields = mockLookupHostFields(cc)
      const exists = cc === '110000' || cc === '310100'
      if (!exists) {
        return ok({
          exists: false,
          cityCode: cc,
          displayName: '',
          memberCount: 0,
          messageCount: 0,
          unreadCount: null,
          joined: false,
          activityId: null,
          activityKind: 'event',
          ...hostFields,
        })
      }
      const joined = cc === '110000'
      return ok({
        exists: true,
        cityCode: cc,
        displayName: `${mockCityNameFromCode(cc)} · 城市大群`,
        memberCount: cc === '110000' ? 128 : 86,
        messageCount: 120,
        unreadCount: joined ? 8 : null,
        joined,
        activityId: `act_city_${cc}`,
        activityKind: 'city_hall',
        ...hostFields,
      })
    },
  })

export const getCityGroupProfile = (cityCode) =>
  wmRequest({
    method: 'GET',
    path: '/city-groups/profile',
    query: { cityCode },
    needAuth: false,
    tokenIfPresent: true,
    mockHandler: ({ query: q }) => {
      const cc = (q && q.cityCode) || '110000'
      const hostFields = mockLookupHostFields(cc)
      const cfg = wmDB.cityGroupHosts?.[cc]
      const deputies = (cfg?.deputies || []).map((uid) => mockBuildHostSummary(uid, cc, 'deputy'))
      return ok({
        cityCode: cc,
        displayName: `${mockCityNameFromCode(cc)} · 城市大群`,
        memberCount: 0,
        activityId: null,
        deputies,
        ...hostFields,
      })
    },
  })

export const getCityGroupHostContext = (activityId) =>
  wmRequest({
    method: 'GET',
    path: '/city-groups/host-context',
    query: { activityId },
    needAuth: true,
    mockHandler: ({ query: q }) => {
      const aid = String(q?.activityId || '').replace(/^act_/, '')
      const act = wmDB.activities.find((a) => String(a.activityId) === aid)
      const cc = act?.cityCode || '110000'
      const hostFields = mockLookupHostFields(cc)
      const cfg = wmDB.cityGroupHosts?.[cc]
      const deputies = (cfg?.deputies || []).map((uid) => mockBuildHostSummary(uid, cc, 'deputy'))
      const hostUserIds = []
      if (hostFields.owner?.userId) hostUserIds.push(hostFields.owner.userId)
      deputies.forEach((d) => hostUserIds.push(d.userId))
      return ok({
        cityCode: cc,
        activityId: q?.activityId || `act_${aid}`,
        owner: hostFields.owner,
        deputies,
        currentUserHostRole: hostFields.currentUserHostRole,
        canModerate: !!hostFields.currentUserHostRole,
        hostUserIds,
      })
    },
  })

export const patchCityGroupHostProfile = (payload) =>
  wmRequest({
    method: 'PATCH',
    path: '/city-groups/me/host-profile',
    data: payload,
    needAuth: true,
    mockHandler: ({ data }) => {
      const cc = data?.cityCode
      if (!cc || !wmDB.cityGroupHosts?.[cc]) {
        return { code: 403, message: 'Not a city group host', data: null }
      }
      const cfg = wmDB.cityGroupHosts[cc]
      const me = wmDB.profile.userId
      const isHost = cfg.ownerUserId === me || (cfg.deputies || []).includes(me)
      if (!isHost) return { code: 403, message: 'Not a city group host', data: null }
      if (data.welcomeText !== undefined) cfg.welcomeText = data.welcomeText || ''
      if (data.announcement !== undefined) cfg.announcement = data.announcement || ''
      if (data.clearWelcome) cfg.welcomeText = ''
      if (data.clearAnnouncement) cfg.announcement = ''
      const hostFields = mockLookupHostFields(cc)
      return ok({
        cityCode: cc,
        displayName: `${mockCityNameFromCode(cc)} · 城市大群`,
        memberCount: 0,
        activityId: null,
        deputies: (cfg.deputies || []).map((uid) => mockBuildHostSummary(uid, cc, 'deputy')),
        ...hostFields,
      })
    },
  })

export const deleteCityGroupHostMessage = (messageId, cityCode) =>
  wmRequest({
    method: 'POST',
    path: `/city-groups/me/messages/${encodeURIComponent(messageId)}/delete`,
    data: { cityCode },
    needAuth: true,
    mockHandler: ({ data }) => {
      if (!wmDB.cityGroupDeletedMessageIds) wmDB.cityGroupDeletedMessageIds = []
      wmDB.cityGroupDeletedMessageIds.push(String(messageId))
      return ok({ ok: true })
    },
  })

export const muteCityGroupMember = (payload) =>
  wmRequest({
    method: 'POST',
    path: '/city-groups/me/members/mute',
    data: payload,
    needAuth: true,
    mockHandler: () => {
      const until = new Date(Date.now() + 24 * 3600 * 1000).toISOString()
      return ok({ mutedUntil: until })
    },
  })

export const submitCityGroupHostApplication = (payload) =>
  wmRequest({
    method: 'POST',
    path: '/city-groups/me/host-applications',
    data: payload,
    needAuth: true,
    mockHandler: ({ data }) => {
      const cc = data?.cityCode
      if (!wmDB.cityGroupHostApplications) wmDB.cityGroupHostApplications = []
      const row = {
        id: Date.now(),
        cityCode: cc,
        userId: wmDB.profile.userId,
        applicationType: 'owner',
        status: 'pending',
        introText: data?.introText || '',
      }
      wmDB.cityGroupHostApplications.push(row)
      return ok({
        applicationId: row.id,
        cityCode: cc,
        status: 'pending',
        applicationType: 'owner',
      })
    },
  })

export const nominateCityGroupDeputy = (payload) =>
  wmRequest({
    method: 'POST',
    path: '/city-groups/me/nominate-deputy',
    data: payload,
    needAuth: true,
    mockHandler: ({ data }) => {
      if (!wmDB.cityGroupHostApplications) wmDB.cityGroupHostApplications = []
      const row = {
        id: Date.now(),
        cityCode: data?.cityCode,
        userId: data?.userId,
        applicationType: 'deputy',
        status: 'pending',
        nominatorUserId: wmDB.profile.userId,
      }
      wmDB.cityGroupHostApplications.push(row)
      return ok({
        applicationId: row.id,
        cityCode: data?.cityCode,
        status: 'pending',
        applicationType: 'deputy',
      })
    },
  })

export const recommendActivityToCityGroup = (payload) =>
  wmRequest({
    method: 'POST',
    path: '/city-groups/me/recommend-activity',
    data: payload,
    needAuth: true,
    mockHandler: ({ data }) => {
      const actId = String(data?.activityId || '').replace(/^act_/, '')
      const act = wmDB.activities.find((a) => String(a.activityId) === actId)
      const title = act?.title || '活动'
      const cc = data?.cityCode
      const hallId = cc === '110000' ? '1' : 'act_mock_city_hall'
      const row = {
        messageId: `msg_${Date.now()}`,
        activityId: hallId,
        sender: {
          userId: wmDB.profile.userId,
          nickname: wmDB.profile.nickname,
          avatarUrl: wmDB.profile.avatarUrl,
        },
        msgType: 'activity_rec',
        recActivityId: `act_${actId}`,
        recActivityTitle: title,
        text: null,
        createdAt: new Date().toISOString(),
        senderHostRole: 'owner',
      }
      if (!wmDB.chats[hallId]) wmDB.chats[hallId] = []
      wmDB.chats[hallId].push(row)
      return ok(row)
    },
  })

export const joinCityHall = (cityCode, cityLabel) => {
  const payload = { cityCode }
  const lbl = (cityLabel && String(cityLabel).trim()) || ''
  if (lbl) payload.cityLabel = lbl
  return wmRequest({
    method: 'POST',
    path: '/city-groups/join',
    data: payload,
    needAuth: true,
    mockHandler: ({ data }) => {
      const denied = mockRequirePhoneBound()
      if (denied) return denied
      const cc = (data && data.cityCode) || '110000'
      const name = (data && data.cityLabel && String(data.cityLabel).trim()) || cc
      mockOnQualifiedAction('city_hall_join')
      return ok({
        cityCode: cc,
        displayName: `${name} · 城市大群`,
        memberCount: 1,
        joined: true,
        activityId: 'act_mock_city_hall',
        enrollmentId: 'enr_mock_1',
      })
    },
  })
}

// 10
export const getActivities = (query = {}) =>
  wmRequest({
    method: 'GET',
    path: '/activities',
    query,
    needAuth: false,
    tokenIfPresent: true,
    mockHandler: ({ query: q }) => {
      let list = wmDB.activities.slice()
      if (q.cityCode) {
        list = list.filter((x) => activityCityMatchesPlaceFilter(String(q.cityCode), x.cityCode))
      }
      if (q.categoryId) list = list.filter((x) => x.categoryId === q.categoryId)
      if (q.subCategoryId) list = list.filter((x) => x.subCategoryId === q.subCategoryId)
      list = normalizeDateRange(list, q.dateRange)
      list = sortActivityCards(list, q.sortBy || 'startAt')
      return ok(paginate(list.map(toActivityCard), q.page, q.pageSize))
    },
  })

export const getPlaceSuggestions = (q) =>
  wmRequest({
    method: 'GET',
    path: '/meta/place-suggestions',
    query: { q: q || '' },
    needAuth: false,
    mockHandler: ({ query: qq }) => ok({ list: mockPlaceSuggestionSearch((qq && qq.q) || '') }),
  })

export const createPlaceActivityAlert = (data) =>
  wmRequest({
    method: 'POST',
    path: '/me/place-activity-alerts',
    data,
    needAuth: true,
    mockHandler: ({ data: d }) =>
      ok({
        alertId: 'pal_mock_1',
        cityCode: d.cityCode || '110000',
        placeLabel: d.placeLabel || '订阅地',
        categoryId: d.categoryId || '',
        dateRange: d.dateRange || 'all',
        createdAt: new Date().toISOString(),
      }),
  })

export const submitUserFeedback = (data = {}) => {
  const description = String(data.description || '').trim()
  const payload = {
    scene: data.scene || 'other',
    description,
    expectation: String(data.expectation || '').trim(),
    contactWilling: !!data.contactWilling,
    contactNote: String(data.contactNote || '').trim(),
    appVersion: String(data.appVersion || '').trim(),
    platform: data.platform || 'mp-weixin',
  }
  return wmRequest({
    method: 'POST',
    path: '/me/feedback',
    data: payload,
    needAuth: true,
    mockHandler: () => ok({ feedbackId: 'fb_mock_1' }),
  })
}

export const getNearbyActivities = (query = {}) =>
  wmRequest({
    method: 'GET',
    path: '/activities/nearby',
    query,
    needAuth: false,
    tokenIfPresent: true,
    mockHandler: ({ query: q }) => {
      const userLat = Number(q.lat)
      const userLng = Number(q.lng)
      const radiusKm = [1, 3, 5, 10, 20].includes(Number(q.radiusKm)) ? Number(q.radiusKm) : 5
      if (!Number.isFinite(userLat) || !Number.isFinite(userLng)) {
        return { code: 400, message: 'lat/lng 必填', data: null }
      }

      let list = wmDB.activities.slice()
      if (q.cityCode) {
        list = list.filter((x) => activityCityMatchesPlaceFilter(String(q.cityCode), x.cityCode))
      }
      if (q.categoryId) list = list.filter((x) => x.categoryId === q.categoryId)
      if (q.subCategoryId) list = list.filter((x) => x.subCategoryId === q.subCategoryId)
      list = normalizeDateRange(list, q.dateRange || 'all')

      list = list
        .map((row) => ({
          ...row,
          distanceMeters: calcDistanceMeters(userLat, userLng, Number(row.lat), Number(row.lng)),
        }))
        .filter((row) => Number(row.distanceMeters) <= radiusKm * 1000)

      const sortBy = q.sortBy || 'distance'
      if (sortBy === 'startAt') {
        list = list.slice().sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      } else if (sortBy === 'popularity') {
        list = list.slice().sort((a, b) => {
          const diff = Number(b.enrolledCount || 0) - Number(a.enrolledCount || 0)
          if (diff !== 0) return diff
          return Number(a.distanceMeters) - Number(b.distanceMeters)
        })
      } else {
        list = list.slice().sort((a, b) => Number(a.distanceMeters) - Number(b.distanceMeters))
      }

      const pageData = paginate(list.map(toActivityCard), q.page, q.pageSize)
      return ok({
        ...pageData,
        searchCenter: { lat: userLat, lng: userLng },
        radiusKm,
      })
    },
  })

function mergeOrganizerPublic(row) {
  const uid = row.organizer?.userId
  const u = uid && wmDB.users?.[uid] ? wmDB.users[uid] : null
  if (!u) return row.organizer
  return {
    ...row.organizer,
    nickname: u.nickname || row.organizer.nickname,
    avatarUrl: u.avatarUrl != null ? u.avatarUrl : row.organizer.avatarUrl,
    bio: u.bio != null ? u.bio : '',
    tags: Array.isArray(u.tags) ? u.tags : [],
    verificationBadge: u.verificationBadge != null ? u.verificationBadge : row.organizer.verificationBadge,
  }
}

// 11
export const getActivityDetail = (activityId, query = {}) =>
  wmRequest({
    method: 'GET',
    path: `/activities/${activityId}`,
    query,
    needAuth: false,
    tokenIfPresent: true,
    mockHandler: () => {
      const row = wmDB.activities.find((x) => x.activityId === String(activityId)) || null
      if (!row) return ok(null)
      const organizerId = row.organizer?.userId
      const organizerHostedCount = organizerId
        ? wmDB.activities.filter((x) => x.organizer?.userId === organizerId).length
        : 0
      const organizer = mergeOrganizerPublic(row)
      return ok({ ...row, organizer, organizerHostedCount })
    },
  })

/** 发起人/用户公开资料（后端需登录；群聊/详情页查看他人资料） */
export const getUserPublicProfile = (userId) =>
  wmRequest({
    method: 'GET',
    path: `/users/${encodeURIComponent(String(userId))}/public`,
    needAuth: true,
    mockHandler: () => {
      const uid = String(userId)
      const organizedCount = wmDB.activities.filter((x) => x.organizer?.userId === uid).length
      const u = wmDB.users?.[uid]
      if (u) {
        return ok({
          ...mockEnhancePublicProfile({ ...u, organizedCount }, uid),
          cityHostBadges: mockListCityHostBadges(uid),
        })
      }
      const act = wmDB.activities.find((x) => x.organizer?.userId === uid)
      if (act?.organizer) {
        return ok(
          mockEnhancePublicProfile(
            {
              userId: act.organizer.userId,
              nickname: act.organizer.nickname,
              avatarUrl: act.organizer.avatarUrl,
              bio: '',
              tags: [],
              verificationBadge: act.organizer.verificationBadge,
              organizedCount,
            },
            uid,
          ),
        )
      }
      return ok(null)
    },
  })

// 12
export const createActivity = (payload) =>
  wmRequest({
    method: 'POST',
    path: '/activities',
    data: payload,
    mockHandler: ({ data }) => {
      const denied = mockRequirePhoneBound()
      if (denied) return denied
      const nextId = String(Date.now())
      const row = {
        activityId: nextId,
        title: data.title,
        description: data.description,
        categoryId: data.categoryId,
        subCategoryId: data.subCategoryId || '',
        categoryLabel: data.categoryLabel || '',
        startAt: data.startAt,
        endAt: data.endAt || null,
        cityCode: data.cityCode || '110000',
        locationName: data.locationName,
        addressDetail: data.addressDetail || null,
        lat: data.lat || 39.9,
        lng: data.lng || 116.4,
        distanceMeters: null,
        maxMembers: data.maxMembers || 8,
        feeType: data.feeType || 'aa',
        feeAmount: data.feeAmount || null,
        rulesAccepted: data.rulesAccepted,
        activityStatus: 'pending_review',
        organizer: { userId: wmDB.profile.userId, nickname: wmDB.profile.nickname, avatarUrl: null, verificationBadge: true },
        enrolledCount: 1,
        myEnrollment: { status: 'joined' },
      }
      wmDB.activities.unshift(row)
      return ok({
        activityId: row.activityId,
        title: row.title,
        activityStatus: row.activityStatus,
        organizer: row.organizer,
        enrolledCount: 1,
        myEnrollment: { status: 'joined' },
      })
    },
  })

// 13
export const updateActivity = (activityId, payload) =>
  wmRequest({
    method: 'PATCH',
    path: `/activities/${activityId}`,
    data: payload,
    mockHandler: ({ data }) => {
      const idx = wmDB.activities.findIndex((x) => x.activityId === String(activityId))
      if (idx === -1) return ok(null)
      wmDB.activities[idx] = { ...wmDB.activities[idx], ...data }
      return ok(wmDB.activities[idx])
    },
  })

// 14
export const cancelActivity = (activityId, payload) =>
  wmRequest({
    method: 'POST',
    path: `/activities/${activityId}/cancel`,
    data: payload,
    mockHandler: () => {
      const row = wmDB.activities.find((x) => x.activityId === String(activityId))
      if (row) row.activityStatus = 'cancelled'
      return ok({ activityId: String(activityId), activityStatus: 'cancelled' })
    },
  })

function pushGroupSystemMessage(activityId, text) {
  const row = {
    messageId: `msg_sys_${Date.now()}`,
    activityId: String(activityId),
    sender: { userId: 'system', nickname: '系统通知', avatarUrl: null },
    msgType: 'text',
    text,
    imageUrl: null,
    createdAt: new Date().toISOString(),
  }
  if (!wmDB.chats[String(activityId)]) wmDB.chats[String(activityId)] = []
  wmDB.chats[String(activityId)].push(row)
}

function pushActivityFullNotification(activity) {
  wmDB.notifications.unshift({
    notificationId: `ntf_full_${Date.now()}`,
    type: 'activity_full',
    title: '活动已成行',
    body: `你参与的「${activity.title}」已满员（${activity.enrolledCount}/${activity.maxMembers}），活动成行！`,
    payload: { activityId: activity.activityId, enrolledCount: activity.enrolledCount, maxMembers: activity.maxMembers },
    readAt: null,
    createdAt: new Date().toISOString(),
  })
}

// 15 / 16
export const enrollActivity = (activityId) =>
  wmRequest({
    method: 'POST',
    path: `/activities/${activityId}/enrollments`,
    data: {},
    mockHandler: () => {
      const denied = mockRequirePhoneBound()
      if (denied) return denied
      const row = wmDB.activities.find((x) => x.activityId === String(activityId))
      if (row) {
        const current = Number(row.enrolledCount || 0)
        const max = Number(row.maxMembers || 0)
        if (current >= max) {
          return { code: 4001, message: '活动已满员', data: null }
        }
        row.enrolledCount = current + 1
        row.myEnrollment = { status: 'joined', enrolledAt: new Date().toISOString() }
        if (row.enrolledCount >= max) {
          // 满员后触发一次群系统消息 + 成行通知
          if (!row.fullNotifiedAt) {
            row.fullNotifiedAt = new Date().toISOString()
            pushGroupSystemMessage(
              row.activityId,
              `活动人数已满（${row.enrolledCount}/${row.maxMembers}），本次活动成行，请留意集合时间与地点。`
            )
            pushActivityFullNotification(row)
          }
        }
        mockOnQualifiedAction('event_enroll')
      }
      return ok({ enrollmentId: `enr_${Date.now()}`, status: 'joined' })
    },
  })

export const cancelEnrollment = (activityId) =>
  wmRequest({
    method: 'DELETE',
    path: `/activities/${activityId}/enrollments/me`,
    mockHandler: () => {
      const row = wmDB.activities.find((x) => x.activityId === String(activityId))
      if (row?.organizer?.userId && row.organizer.userId === wmDB.profile.userId) {
        return {
          code: 403,
          message: '发起人不能取消报名，如需结束请取消活动',
          data: null,
        }
      }
      if (row) {
        row.enrolledCount = Math.max(0, Number(row.enrolledCount || 0) - 1)
        row.myEnrollment = null
        // 若有人取消导致不再满员，允许下次再次触发“成行通知”
        if (Number(row.enrolledCount || 0) < Number(row.maxMembers || 0)) {
          row.fullNotifiedAt = null
        }
      }
      return ok({ status: 'cancelled' })
    },
  })

// 17
export const getActivityMembers = (activityId, query = {}) =>
  wmRequest({
    method: 'GET',
    path: `/activities/${activityId}/members`,
    query,
    mockHandler: ({ query: q }) => {
      const activity = wmDB.activities.find((x) => x.activityId === String(activityId))
      const page = Math.max(1, Number(q.page) || 1)
      const pageSize = Math.min(100, Math.max(1, Number(q.pageSize) || 20))
      const kw = String(q.q || '').trim().toLowerCase()
      const isCityHall = (activity?.activityKind || '') === 'city_hall'
      let pool = [
        ...(isCityHall
          ? []
          : [
              {
                userId: activity?.organizer?.userId || 'u_10001',
                nickname: activity?.organizer?.nickname || '组织者',
                avatarUrl: activity?.organizer?.avatarUrl || null,
                role: 'organizer',
                joinedAt: new Date().toISOString(),
              },
            ]),
        {
          userId: wmDB.profile.userId,
          nickname: wmDB.profile.nickname,
          avatarUrl: wmDB.profile.avatarUrl,
          role: 'member',
          joinedAt: new Date().toISOString(),
        },
        {
          userId: 'u_10002',
          nickname: '旅人小李',
          avatarUrl: null,
          role: 'member',
          joinedAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          userId: 'u_10003',
          nickname: '周末玩家',
          avatarUrl: null,
          role: 'member',
          joinedAt: new Date(Date.now() - 172800000).toISOString(),
        },
      ]
      if (isCityHall && page === 1) {
        const cc = activity?.cityCode
        const hostCfg = cc ? wmDB.cityGroupHosts?.[cc] : null
        const hostItems = []
        if (hostCfg?.ownerUserId) {
          const owner = wmDB.users?.[hostCfg.ownerUserId] || {}
          hostItems.push({
            userId: hostCfg.ownerUserId,
            nickname: owner.nickname || '城主',
            avatarUrl: owner.avatarUrl || null,
            role: 'owner',
            joinedAt: new Date().toISOString(),
          })
        }
        for (const depId of hostCfg?.deputies || []) {
          const dep = wmDB.users?.[depId] || {}
          hostItems.push({
            userId: depId,
            nickname: dep.nickname || '管理',
            avatarUrl: dep.avatarUrl || null,
            role: 'deputy',
            joinedAt: new Date().toISOString(),
          })
        }
        const seen = new Set(pool.map((m) => m.userId))
        pool = [...hostItems.filter((h) => !seen.has(h.userId)), ...pool]
      }
      if (kw) {
        pool = pool.filter((m) => String(m.nickname || '').toLowerCase().includes(kw))
      }
      const start = (page - 1) * pageSize
      const list = pool.slice(start, start + pageSize)
      return ok({ list })
    },
  })

// 18 / 19
// query: { limit?, afterMessageId? (增量), cursor? (上拉历史) }
export const getActivityMessages = (activityId, query = {}) =>
  wmRequest({
    method: 'GET',
    path: `/activities/${activityId}/messages`,
    query,
    mockHandler: ({ query: q }) => {
      const denied = mockRequirePhoneBound()
      if (denied) return denied
      let list = (wmDB.chats[String(activityId)] || []).slice()
      const deleted = new Set(wmDB.cityGroupDeletedMessageIds || [])
      list = list.filter((m) => !deleted.has(String(m.messageId)))
      const parsePk = (id) => {
        const n = Number(String(id || '').replace(/^msg_/, ''))
        return Number.isFinite(n) ? n : 0
      }
      const afterKey = q.afterMessageId || q.after
      if (afterKey) {
        const afterPk = parsePk(afterKey)
        list = list.filter((m) => parsePk(m.messageId) > afterPk)
        list.sort((a, b) => parsePk(a.messageId) - parsePk(b.messageId))
      }
      const limit = Math.min(100, Math.max(1, Number(q.limit) || 50))
      let sliced
      if (afterKey) {
        sliced = list.slice(0, limit)
      } else if (q.cursor) {
        const cursorPk = parsePk(q.cursor)
        list = list.filter((m) => parsePk(m.messageId) < cursorPk)
        list.sort((a, b) => parsePk(a.messageId) - parsePk(b.messageId))
        sliced = list.slice(-limit)
      } else {
        sliced = list.slice(-limit)
      }
      sliced = sliced.map((m) => ({
        ...m,
        ...mockChainFieldsFromRow(m),
        ...mockMentionFieldsFromRow(m),
        senderHostRole: mockHostRoleForSender(activityId, m.sender?.userId),
      }))
      return ok({
        list: sliced,
        nextCursor: sliced.length ? sliced[sliced.length - 1].messageId : null,
      })
    },
  })

export const sendActivityMessage = (activityId, payload) =>
  wmRequest({
    method: 'POST',
    path: `/activities/${activityId}/messages`,
    data: payload,
    mockHandler: ({ data }) => {
      const denied = mockRequirePhoneBound()
      if (denied) return denied
      if (data.msgType === 'text' && data.text) {
        const blocked = mockLocalTextBlocked(data.text, activityId)
        if (blocked) return { code: 400, message: blocked, data: null }
      }
      if (data.msgType === 'sticker' && !isKnownStickerId(data.stickerId)) {
        return { code: 400, message: 'Unknown stickerId', data: null }
      }
      if (data.msgType === 'location') {
        if (!data.locationName || data.lat == null || data.lng == null) {
          return { code: 400, message: 'locationName, lat, lng required', data: null }
        }
      }
      if (data.msgType === 'chain_signup') {
        const title = (data.chainTitle || '').trim()
        if (title.length < 2) {
          return { code: 400, message: 'chainTitle required', data: null }
        }
        const titleBlocked = mockLocalTextBlocked(title, activityId)
        if (titleBlocked) return { code: 400, message: titleBlocked, data: null }
        if (data.chainNote) {
          const blocked = mockLocalTextBlocked(data.chainNote, activityId)
          if (blocked) return { code: 400, message: blocked, data: null }
        }
      }
      const row = mockChatMessageRow(
        {
          messageId: `msg_${Date.now()}`,
          activityId: String(activityId),
          sender: { userId: wmDB.profile.userId, nickname: wmDB.profile.nickname, avatarUrl: null },
        },
        data
      )
      if (!wmDB.chats[String(activityId)]) wmDB.chats[String(activityId)] = []
      wmDB.chats[String(activityId)].push(row)
      return ok(row)
    },
  })

function mockFindChainMessage(activityId, messageId) {
  const list = wmDB.chats[String(activityId)] || []
  const row = list.find((m) => String(m.messageId) === String(messageId))
  if (!row || row.msgType !== 'chain_signup') return null
  return row
}

function mockUpdateChainRow(row, updater) {
  const data = mockDecodeChain(row.text)
  if (!data) return null
  updater(data)
  row.text = mockChainPayload(data.title, data.description, data.entries, data.closed)
  Object.assign(row, mockChainFieldsFromRow(row))
  return row
}

export const joinChainSignup = (activityId, messageId, payload = {}) =>
  wmRequest({
    method: 'POST',
    path: `/activities/${activityId}/messages/${messageId}/chain/entries`,
    data: payload,
    mockHandler: ({ data }) => {
      const row = mockFindChainMessage(activityId, messageId)
      if (!row) return { code: 404, message: 'not found', data: null }
      const me = wmDB.profile?.userId || 'me'
      const nickname = wmDB.profile?.nickname || '你'
      const note = (data?.note || '').trim()
      if (note) {
        const blocked = mockLocalTextBlocked(note, activityId)
        if (blocked) return { code: 400, message: blocked, data: null }
      }
      mockUpdateChainRow(row, (chain) => {
        if (chain.closed) {
          throw Object.assign(new Error('closed'), { code: 400 })
        }
        const entries = Array.isArray(chain.entries) ? chain.entries : []
        const hit = entries.find((e) => e.userId === me)
        if (hit) hit.note = note
        else {
          entries.push({
            entryId: `e_${me}`,
            userId: me,
            nickname,
            note,
            createdAt: new Date().toISOString(),
          })
        }
        chain.entries = entries
      })
      return ok({ ...row, sender: row.sender })
    },
  })

export const leaveChainSignup = (activityId, messageId) =>
  wmRequest({
    method: 'DELETE',
    path: `/activities/${activityId}/messages/${messageId}/chain/entries/me`,
    mockHandler: () => {
      const row = mockFindChainMessage(activityId, messageId)
      if (!row) return { code: 404, message: 'not found', data: null }
      const me = wmDB.profile?.userId || 'me'
      mockUpdateChainRow(row, (chain) => {
        chain.entries = (chain.entries || []).filter((e) => e.userId !== me)
      })
      return ok({ ...row, sender: row.sender })
    },
  })

export const closeChainSignup = (activityId, messageId) =>
  wmRequest({
    method: 'POST',
    path: `/activities/${activityId}/messages/${messageId}/chain/close`,
    mockHandler: () => {
      const row = mockFindChainMessage(activityId, messageId)
      if (!row) return { code: 404, message: 'not found', data: null }
      const me = wmDB.profile?.userId || 'me'
      if (row.sender?.userId !== me) {
        return { code: 403, message: 'only creator', data: null }
      }
      mockUpdateChainRow(row, (chain) => {
        chain.closed = true
      })
      return ok({ ...row, sender: row.sender })
    },
  })

// 20 / 21
export const createReport = (payload) =>
  wmRequest({
    method: 'POST',
    path: '/reports',
    data: payload,
    mockHandler: ({ data }) => {
      const reportId = `rep_${Date.now()}`
      wmDB.reports.unshift({ reportId, ...data, status: 'pending', createdAt: new Date().toISOString() })
      return ok({ reportId, status: 'pending' })
    },
  })

export const getMyReports = (query = {}) =>
  wmRequest({
    method: 'GET',
    path: '/me/reports',
    query,
    mockHandler: ({ query: q }) => ok(paginate(wmDB.reports, q.page, q.pageSize)),
  })

// 22 / 23 / 24
export const blockUser = (payload) =>
  wmRequest({
    method: 'POST',
    path: '/blocks',
    data: payload,
    mockHandler: ({ data }) => {
      wmDB.blocks.push({ blockedUserId: data.blockedUserId, createdAt: new Date().toISOString() })
      return ok({ blockedUserId: data.blockedUserId })
    },
  })

export const unblockUser = (blockedUserId) =>
  wmRequest({
    method: 'DELETE',
    path: `/blocks/${blockedUserId}`,
    mockHandler: () => {
      wmDB.blocks = wmDB.blocks.filter((x) => x.blockedUserId !== blockedUserId)
      return ok({ ok: true })
    },
  })

export const getBlockList = () =>
  wmRequest({ method: 'GET', path: '/blocks', mockHandler: () => ok({ list: wmDB.blocks }) })

// 25 / 26 / 27
export const getNotifications = (query = {}) =>
  wmRequest({
    method: 'GET',
    path: '/notifications',
    query,
    mockHandler: ({ query: q }) => {
      let list = wmDB.notifications.slice()
      if (q.read === 'unread') list = list.filter((x) => !x.readAt)
      return ok(paginate(list, q.page, q.pageSize))
    },
  })

export const readNotification = (notificationId) =>
  wmRequest({
    method: 'PATCH',
    path: `/notifications/${notificationId}/read`,
    mockHandler: () => {
      const row = wmDB.notifications.find((x) => x.notificationId === notificationId)
      if (row) row.readAt = new Date().toISOString()
      return ok({ notificationId, readAt: row?.readAt || new Date().toISOString() })
    },
  })

export const readAllNotifications = () =>
  wmRequest({
    method: 'POST',
    path: '/notifications/read-all',
    mockHandler: () => {
      const now = new Date().toISOString()
      wmDB.notifications.forEach((x) => {
        x.readAt = x.readAt || now
      })
      return ok({ updatedCount: wmDB.notifications.length })
    },
  })

// 28
export const getMyActivities = (query = {}) =>
  wmRequest({
    method: 'GET',
    path: '/me/activities',
    query,
    mockHandler: ({ query: q }) => {
      const role = q.role || 'joined'
      let list =
        role === 'organized'
          ? wmDB.activities.filter((x) => x.organizer.userId === wmDB.profile.userId)
          : wmDB.activities.filter((x) => x.myEnrollment)
      if (role === 'organized') {
        list = list.slice().sort((a, b) => new Date(b.startAt) - new Date(a.startAt))
      }
      const allCards = list.map(toActivityCard)
      const cityHallCount = allCards.filter((x) => x.activityKind === 'city_hall').length
      const eventCount = allCards.length - cityHallCount
      if (q.activityKind === 'city_hall') {
        list = list.filter((x) => x.activityKind === 'city_hall')
      } else if (q.activityKind === 'event') {
        list = list.filter((x) => x.activityKind !== 'city_hall')
        list = list.slice().sort((a, b) => new Date(b.startAt) - new Date(a.startAt))
      }
      const cards = list.map(toActivityCard)
      const pageData = paginate(cards, q.page, q.pageSize)
      return ok({
        ...pageData,
        cityHallCount,
        eventCount,
      })
    },
  })

// 29
export const getPremiumStatus = () =>
  wmRequest({
    method: 'GET',
    path: '/me/premium',
    mockHandler: () => ok(mockGetPremium()),
  })

// ===== PRD 裂变与信任 =====

export const getMyReferral = () =>
  wmRequest({
    method: 'GET',
    path: '/me/referral',
    mockHandler: () => ok(mockGetReferral()),
  })

export const bindReferralCode = (code) =>
  wmRequest({
    method: 'POST',
    path: '/me/referral/bind',
    data: { code },
    mockHandler: ({ data }) => {
      const result = mockBindReferral(data?.code)
      if (!result.ok) {
        const msg =
          result.reason === 'already_bound'
            ? '已绑定邀请关系'
            : result.reason === 'self_invite'
              ? '不能使用自己的邀请码'
              : '邀请码无效'
        return { code: 400, message: msg, data: null }
      }
      return ok(result.binding)
    },
  })

export const getMyEntitlements = () =>
  wmRequest({
    method: 'GET',
    path: '/me/entitlements',
    mockHandler: () => ok({ list: mockGetEntitlements() }),
  })

export const pinMyActivity = (activityId) =>
  wmRequest({
    method: 'POST',
    path: `/me/activities/${activityId}/pin`,
    mockHandler: () => {
      try {
        return ok(mockPinActivity(activityId))
      } catch (e) {
        return { code: 400, message: e.message || '置顶失败', data: null }
      }
    },
  })

export const getPendingMeetCheckins = () =>
  wmRequest({
    method: 'GET',
    path: '/me/meet-checkins/pending',
    mockHandler: () => ok({ list: mockGetPendingCheckins() }),
  })

export const checkinActivity = (activityId, payload = {}) =>
  wmRequest({
    method: 'POST',
    path: `/activities/${activityId}/checkin`,
    data: payload,
    mockHandler: ({ data }) => {
      try {
        return ok(mockCheckin(activityId, data?.photoUrl))
      } catch (e) {
        return { code: 400, message: e.message || '打卡失败', data: null }
      }
    },
  })

export const getMeetReviewCandidates = (activityId) =>
  wmRequest({
    method: 'GET',
    path: `/activities/${activityId}/meet-review/candidates`,
    mockHandler: () => {
      try {
        return ok({ list: mockGetReviewCandidates(activityId) })
      } catch (e) {
        return { code: 400, message: e.message || '无法加载', data: null }
      }
    },
  })

export const submitMeetReview = (activityId, payload) =>
  wmRequest({
    method: 'POST',
    path: `/activities/${activityId}/meet-review`,
    data: payload,
    mockHandler: ({ data }) => {
      try {
        return ok(mockSubmitReview(activityId, data))
      } catch (e) {
        return { code: 400, message: e.message || '提交失败', data: null }
      }
    },
  })

export const getMeetHistory = () =>
  wmRequest({
    method: 'GET',
    path: '/me/meet-history',
    mockHandler: () => ok({ list: mockGetMeetHistory() }),
  })

export const getMyTrust = () =>
  wmRequest({
    method: 'GET',
    path: '/me/trust',
    mockHandler: () => ok(mockGetTrust()),
  })

export const submitPhotoVerification = (payload) =>
  wmRequest({
    method: 'POST',
    path: '/me/photo-verification',
    data: payload,
    mockHandler: ({ data }) => ok(mockSubmitPhotoVerification(data?.selfieUrl)),
  })

export const getPhotoVerification = () =>
  wmRequest({
    method: 'GET',
    path: '/me/photo-verification',
    mockHandler: () => ok(mockGetPhotoVerification()),
  })

export const submitSafetyAck = (ackType = 'enroll_first') =>
  wmRequest({
    method: 'POST',
    path: '/me/safety-ack',
    data: { ackType },
    mockHandler: ({ data }) => {
      const type = data?.ackType || 'enroll_first'
      const row = mockSafetyAck(type)
      try {
        uni.setStorageSync(`wm_safety_ack_${type}`, row.ackAt || new Date().toISOString())
      } catch (_) {
        /* ignore */
      }
      return ok(row)
    },
  })

export function hasSafetyAck(ackType = 'enroll_first') {
  if (getMockEnabled()) return mockHasSafetyAck(ackType)
  try {
    return !!uni.getStorageSync(`wm_safety_ack_${ackType}`)
  } catch (_) {
    return false
  }
}

export const getSafetyGuideContent = () =>
  wmRequest({
    method: 'GET',
    path: '/content/safety-guide',
    needAuth: false,
    mockHandler: () => ok(mockGetSafetyGuide()),
  })

export const getOrganizerExposure = () =>
  wmRequest({
    method: 'GET',
    path: '/me/organizer-exposure',
    mockHandler: () => ok(mockGetOrganizerExposure()),
  })

export const setBadgeVisibility = (badgeId, visible) =>
  wmRequest({
    method: 'PATCH',
    path: '/me/badges/visibility',
    data: { badgeId, visible },
    mockHandler: ({ data }) => ok(mockSetBadgeVisibility(data.badgeId, data.visible)),
  })

export const setShowMeetCount = (show) =>
  wmRequest({
    method: 'PATCH',
    path: '/me/trust/show-meet-count',
    data: { showMeetCount: show },
    mockHandler: ({ data }) => ok(mockSetShowMeetCount(data.showMeetCount)),
  })

/** Mock 开发：模拟照片验证通过 */
export const devApprovePhotoVerification = () => {
  mockApprovePhotoVerification()
  return Promise.resolve({ status: 'approved' })
}

export { formatTrustLevelLabel, feedTopicLabel, FEED_TOPICS } from '@/constants/growthTrust'
export { uploadFeedImage } from './feedImageUpload'

// ===== 同城动态 feed =====

export const getFeedTopics = () =>
  wmRequest({
    method: 'GET',
    path: '/feed/topics',
    needAuth: false,
    mockHandler: () => ok(mockGetFeedTopics()),
  })

export const getCityFeed = (query = {}) =>
  wmRequest({
    method: 'GET',
    path: '/feed',
    query,
    mockHandler: ({ query: q }) => ok(mockListFeed(q)),
  })

/** 发布前内容安全检测（微信 msgSecCheck）；scene: 1资料 2评论 3论坛 4社交日志 */
export const checkContentSec = (payload) =>
  wmRequest({
    method: 'POST',
    path: '/content/sec-check',
    data: payload,
    mockHandler: ({ data }) => {
      const text = String(data?.content || '').trim()
      const strict = !!data?.strict
      const blocked = localTextBlockedReason(text, { strict })
      if (blocked) {
        return { code: 400, message: blocked, data: null }
      }
      if (/违规测试|色情|赌博|毒品/.test(text)) {
        return { code: 400, message: SENSITIVE_REJECT_DETAIL, data: null }
      }
      return ok({ safe: true })
    },
  })

export const createFeedPost = (payload) =>
  wmRequest({
    method: 'POST',
    path: '/feed/posts',
    data: payload,
    mockHandler: ({ data }) => ok(mockCreateFeedPost(data)),
  })

export const getFeedPost = (postId) =>
  wmRequest({
    method: 'GET',
    path: `/feed/posts/${postId}`,
    needAuth: false,
    tokenIfPresent: true,
    mockHandler: () => {
      const d = mockGetFeedPost(postId)
      return d ? ok(d) : { code: 404, message: 'not found', data: null }
    },
  })

export const deleteFeedPost = (postId) =>
  wmRequest({
    method: 'DELETE',
    path: `/me/feed/posts/${postId}`,
    mockHandler: () => {
      try {
        return ok(mockDeleteFeedPost(postId))
      } catch (e) {
        return { code: 404, message: e.message || '删除失败', data: null }
      }
    },
  })

export const likeFeedPost = (postId) =>
  wmRequest({
    method: 'POST',
    path: `/feed/posts/${postId}/like`,
    mockHandler: () => {
      try {
        return ok(mockToggleLike(postId))
      } catch (e) {
        return { code: 400, message: e.message, data: null }
      }
    },
  })

export const getFeedComments = (postId, query = {}) =>
  wmRequest({
    method: 'GET',
    path: `/feed/posts/${postId}/comments`,
    query,
    mockHandler: ({ query: q }) => ok(mockListFeedComments(postId, q)),
  })

export const createFeedComment = (postId, payload) =>
  wmRequest({
    method: 'POST',
    path: `/feed/posts/${postId}/comments`,
    data: payload,
    needAuth: true,
    mockHandler: ({ data }) => ok(mockCreateFeedComment(postId, data)),
  })

export const getActivityPosts = (activityId, query = {}) =>
  wmRequest({
    method: 'GET',
    path: `/activities/${activityId}/posts`,
    query,
    needAuth: false,
    tokenIfPresent: true,
    mockHandler: ({ query: q }) => ok(mockListActivityPosts(activityId, q)),
  })

export const createActivityPost = (activityId, payload) =>
  wmRequest({
    method: 'POST',
    path: `/activities/${activityId}/posts`,
    data: payload,
    mockHandler: ({ data }) => {
      const row = mockCreateFeedPost({
        ...data,
        postKind: 'activity',
        activityId: String(activityId),
      })
      return ok(row)
    },
  })

export const followUser = (userId) =>
  wmRequest({
    method: 'POST',
    path: `/users/${userId}/follow`,
    mockHandler: () => ok(mockFollowUser(userId, true)),
  })

export const unfollowUser = (userId) =>
  wmRequest({
    method: 'DELETE',
    path: `/users/${userId}/follow`,
    mockHandler: () => ok(mockFollowUser(userId, false)),
  })

export const getFollowStatus = (userId) =>
  wmRequest({
    method: 'GET',
    path: `/users/${userId}/follow`,
    mockHandler: () => ok(mockGetFollowStatus(userId)),
  })

export const getUserFeedPosts = (userId, query = {}) =>
  wmRequest({
    method: 'GET',
    path: `/users/${userId}/posts`,
    query,
    mockHandler: ({ query: q }) => ok(mockListUserPosts(userId, q)),
  })

// 30~36 admin
export const adminListActivities = (query = {}) =>
  wmRequest({
    method: 'GET',
    path: '/admin/activities',
    query,
    mockHandler: ({ query: q }) => {
      let list = wmDB.activities.slice()
      if (q.activityStatus) list = list.filter((x) => x.activityStatus === q.activityStatus)
      return ok(paginate(list, q.page, q.pageSize))
    },
  })

export const adminApproveActivity = (activityId, payload = {}) =>
  wmRequest({
    method: 'POST',
    path: `/admin/activities/${activityId}/approve`,
    data: payload,
    mockHandler: () => {
      const row = wmDB.activities.find((x) => x.activityId === String(activityId))
      if (row) row.activityStatus = 'published'
      return ok({ activityId: String(activityId), activityStatus: 'published' })
    },
  })

export const adminRejectActivity = (activityId, payload) =>
  wmRequest({
    method: 'POST',
    path: `/admin/activities/${activityId}/reject`,
    data: payload,
    mockHandler: () => ok({ activityId: String(activityId), activityStatus: 'rejected' }),
  })

export const adminListReports = (query = {}) =>
  wmRequest({
    method: 'GET',
    path: '/admin/reports',
    query,
    mockHandler: ({ query: q }) => {
      const list = q.status ? wmDB.reports.filter((x) => x.status === q.status) : wmDB.reports
      return ok(paginate(list, q.page, q.pageSize))
    },
  })

export const adminHandleReport = (reportId, payload) =>
  wmRequest({
    method: 'PATCH',
    path: `/admin/reports/${reportId}`,
    data: payload,
    mockHandler: ({ data }) => {
      const row = wmDB.reports.find((x) => x.reportId === reportId)
      if (row) {
        row.status = 'handled'
        row.action = data.action
        row.note = data.note || ''
      }
      return ok({ reportId, status: 'handled' })
    },
  })

export const adminBanUser = (userId, payload) =>
  wmRequest({
    method: 'POST',
    path: `/admin/users/${userId}/ban`,
    data: payload,
    mockHandler: () => ok({ userId, status: 'banned' }),
  })

export const adminUnbanUser = (userId) =>
  wmRequest({
    method: 'POST',
    path: `/admin/users/${userId}/unban`,
    mockHandler: () => ok({ userId, status: 'active' }),
  })

export const adminListPhotoVerifications = (query = {}) =>
  wmRequest({
    method: 'GET',
    path: '/admin/photo-verifications',
    query,
    mockHandler: ({ query: q }) => ok(mockAdminListPhotoVerifications(q)),
  })

export const adminApprovePhotoVerification = (verificationId) =>
  wmRequest({
    method: 'POST',
    path: `/admin/photo-verifications/${verificationId}/approve`,
    mockHandler: () => {
      try {
        return ok(mockAdminApprovePhotoVerification(verificationId))
      } catch (e) {
        return { code: 400, message: e.message || '操作失败', data: null }
      }
    },
  })

export const adminRejectPhotoVerification = (verificationId, reason) =>
  wmRequest({
    method: 'POST',
    path: `/admin/photo-verifications/${verificationId}/reject`,
    data: { reason },
    mockHandler: () => {
      try {
        return ok(mockAdminRejectPhotoVerification(verificationId, reason))
      } catch (e) {
        return { code: 400, message: e.message || '操作失败', data: null }
      }
    },
  })

function mockAdminListCityGroupHosts(query = {}) {
  const list = []
  let id = 1
  for (const [cityCode, cfg] of Object.entries(wmDB.cityGroupHosts || {})) {
    if (query.cityCode && query.cityCode !== cityCode) continue
    if (cfg.ownerUserId) {
      const uid = cfg.ownerUserId
      const u = wmDB.users?.[uid]
      list.push({
        id: id++,
        cityCode,
        userId: uid,
        nickname: u?.nickname || '用户',
        role: 'owner',
        status: 'active',
        appointedAt: new Date().toISOString(),
      })
    }
    for (const uid of cfg.deputies || []) {
      const u = wmDB.users?.[uid]
      list.push({
        id: id++,
        cityCode,
        userId: uid,
        nickname: u?.nickname || '用户',
        role: 'deputy',
        status: 'active',
        appointedAt: new Date().toISOString(),
      })
    }
  }
  if (query.status) {
    return ok(paginate(list.filter((x) => x.status === query.status), query.page, query.pageSize))
  }
  return ok(paginate(list, query.page, query.pageSize))
}

function mockAdminAppointCityGroupHost(payload = {}) {
  const cc = payload.cityCode
  const uid = payload.userId
  const role = payload.role || 'owner'
  if (!cc || !uid) throw new Error('参数不完整')
  if (!wmDB.cityGroupHosts) wmDB.cityGroupHosts = {}
  if (!wmDB.cityGroupHosts[cc]) {
    wmDB.cityGroupHosts[cc] = { ownerUserId: null, deputies: [], announcement: '', welcomeText: '' }
  }
  const cfg = wmDB.cityGroupHosts[cc]
  if (role === 'owner') {
    cfg.ownerUserId = uid
  } else if (!(cfg.deputies || []).includes(uid)) {
    cfg.deputies = [...(cfg.deputies || []), uid]
  }
  return ok({
    id: Date.now(),
    cityCode: cc,
    userId: uid,
    role,
    status: 'active',
  })
}

function mockAdminListCityGroupHostApplications(query = {}) {
  const apps = wmDB.cityGroupHostApplications || []
  const filtered = query.status ? apps.filter((a) => a.status === query.status) : apps
  const list = filtered.map((a) => {
    const u = wmDB.users?.[a.userId]
    return {
      applicationId: a.id,
      cityCode: a.cityCode,
      userId: a.userId,
      nickname: u?.nickname || '用户',
      applicationType: a.applicationType,
      status: a.status,
      introText: a.introText || '',
      nominatorUserId: a.nominatorUserId || null,
      createdAt: new Date().toISOString(),
    }
  })
  return ok(paginate(list, query.page, query.pageSize))
}

export const adminListCityGroupHosts = (query = {}) =>
  wmRequest({
    method: 'GET',
    path: '/admin/city-group-hosts',
    query,
    needAuth: true,
    mockHandler: ({ query: q }) => mockAdminListCityGroupHosts(q),
  })

export const adminAppointCityGroupHost = (payload) =>
  wmRequest({
    method: 'POST',
    path: '/admin/city-group-hosts',
    data: payload,
    needAuth: true,
    mockHandler: ({ data }) => {
      try {
        return mockAdminAppointCityGroupHost(data)
      } catch (e) {
        return { code: 400, message: e.message || '任命失败', data: null }
      }
    },
  })

export const adminUpdateCityGroupHost = (hostId, payload) =>
  wmRequest({
    method: 'PATCH',
    path: `/admin/city-group-hosts/${hostId}`,
    data: payload,
    needAuth: true,
    mockHandler: ({ data }) => ok({ id: hostId, status: data?.status || 'resigned' }),
  })

export const adminListCityGroupHostApplications = (query = {}) =>
  wmRequest({
    method: 'GET',
    path: '/admin/city-group-hosts/applications',
    query,
    needAuth: true,
    mockHandler: ({ query: q }) => mockAdminListCityGroupHostApplications(q),
  })

export const adminApproveCityGroupHostApplication = (applicationId) =>
  wmRequest({
    method: 'POST',
    path: `/admin/city-group-hosts/applications/${applicationId}/approve`,
    needAuth: true,
    mockHandler: () => {
      const apps = wmDB.cityGroupHostApplications || []
      const row = apps.find((a) => a.id === Number(applicationId))
      if (row) {
        row.status = 'approved'
        mockAdminAppointCityGroupHost({
          cityCode: row.cityCode,
          userId: row.userId,
          role: row.applicationType === 'deputy' ? 'deputy' : 'owner',
        })
      }
      return ok({ ok: true })
    },
  })

export const adminRejectCityGroupHostApplication = (applicationId, reviewNote) =>
  wmRequest({
    method: 'POST',
    path: `/admin/city-group-hosts/applications/${applicationId}/reject`,
    data: reviewNote != null ? { reviewNote } : {},
    needAuth: true,
    mockHandler: () => {
      const apps = wmDB.cityGroupHostApplications || []
      const row = apps.find((a) => a.id === Number(applicationId))
      if (row) row.status = 'rejected'
      return ok({ ok: true })
    },
  })

export const adminGetAcquisitionStats = () =>
  wmRequest({
    method: 'GET',
    path: '/admin/acquisition-stats',
    needAuth: true,
    mockHandler: () => {
      const counts = {}
      if (wmDB.profile?.acquisitionSource) {
        counts[wmDB.profile.acquisitionSource] = 1
      }
      counts.mp_weixin = (counts.mp_weixin || 0) + 12
      counts.wx_share_friend = (counts.wx_share_friend || 0) + 8
      counts['referral:ABC123'] = (counts['referral:ABC123'] || 0) + 3
      const total = Object.values(counts).reduce((a, b) => a + b, 0) + 5
      const items = Object.entries(counts)
        .map(([source, count]) => ({
          source,
          count,
          pct: total ? Math.round((count / total) * 10000) / 100 : 0,
        }))
        .sort((a, b) => b.count - a.count)
      items.push({ source: '(未记录)', count: 5, pct: total ? Math.round((5 / total) * 10000) / 100 : 0 })
      const withSource = items.filter((x) => x.source !== '(未记录)').reduce((s, x) => s + x.count, 0)
      return ok({
        totalUsers: total,
        withSource,
        withoutSource: 5,
        items,
      })
    },
  })

// ===== Frontend-friendly aggregate helpers =====
const categoryColorMap = ACTIVITY_CATEGORY_COLOR_MAP

export function resolveActivityCategoryTag(card) {
  const display = formatActivityCategoryDisplay(
    card.categoryId,
    card.subCategoryId,
    card.categoryLabel,
    card.categoryDisplay,
  )
  const base =
    categoryColorMap[card.categoryId] || {
      color: '#64748b',
      bg: '#f1f5f9',
      label: card.categoryId || '活动',
    }
  return { ...base, label: display }
}

/**
 * 解析接口返回的时间字符串。MySQL/SQLAlchemy 常见 **无时区 ISO**（无 Z），语义为 UTC；
 * 若直接用 `new Date('2026-05-01T14:00:00')`，部分环境会按**本地**解析，导致与结束时间差 8 小时等问题。
 */
export function parseApiDateTime(value) {
  if (value === null || value === undefined || value === '') return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const s = String(value).trim()
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)) {
    const d = new Date(s)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) {
    const d = new Date(`${s}Z`)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * 活动开始时间展示：固定按 **北京时间 (Asia/Shanghai)** 的日历日与时、分。
 */
export function formatActivityTime(startAt) {
  if (startAt === null || startAt === undefined || startAt === '') return ''
  const d = parseApiDateTime(startAt)
  if (!d) return ''
  if (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Shanghai',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(d)
      const by = (t) => parts.find((p) => p.type === t)?.value
      const month = by('month')
      const day = by('day')
      const hourRaw = by('hour')
      const minute = by('minute')
      if (month && day && hourRaw != null && minute != null) {
        const hour = String(hourRaw).padStart(2, '0')
        return `${month}/${day} ${hour}:${minute}`
      }
    } catch (e) {
      // fall through
    }
  }
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${h}:${m}`
}

/** 开始～结束，均为北京时间展示；无结束时间则只显示开始 */
export function formatActivityTimeRange(startAt, endAt) {
  const start = formatActivityTime(startAt)
  if (endAt === null || endAt === undefined || endAt === '') return start
  return `${start} - ${formatActivityTime(endAt)}`
}

const USER_GENDER_LABELS = {
  male: '男',
  female: '女',
  unspecified: '保密',
}

/** API 值 male/female/unspecified → 展示文案；未设置返回空串 */
export function formatUserGenderLabel(g) {
  if (g === null || g === undefined || g === '') return ''
  return USER_GENDER_LABELS[g] || ''
}

function fmtTime(startAt) {
  return formatActivityTime(startAt)
}

function metersToKm(meters) {
  if (!meters && meters !== 0) return ''
  return `${(Number(meters) / 1000).toFixed(1)}km`
}

const STATUS_LABEL_MAP = {
  pending_review: { key: 'pending', label: '审核中', color: '#0ea5e9', bg: '#e0f2fe' },
  published: { key: 'open', label: '报名中', color: '#10b981', bg: '#ecfdf5' },
  full: { key: 'full', label: '已满员', color: '#0d9488', bg: '#ecfeff' },
  ended: { key: 'ended', label: '已结束', color: '#64748b', bg: '#f1f5f9' },
  cancelled: { key: 'cancelled', label: '已取消', color: '#ef4444', bg: '#fef2f2' },
  rejected: { key: 'rejected', label: '未通过', color: '#ef4444', bg: '#fef2f2' },
}

export function computeActivityStatus(raw) {
  const activityStatus = raw?.activityStatus || 'published'
  const enrolled = Number(raw?.enrolledCount || 0)
  const max = Number(raw?.maxMembers || 0)
  const endAtDt = raw?.endAt ? parseApiDateTime(raw.endAt) : null
  const endAt = endAtDt ? endAtDt.getTime() : 0
  const now = Date.now()
  // 仅在“后端明确 ended”或“提供了 endAt 且已过期”时判定结束，避免误伤未来活动
  const timeEnded = endAt && now > endAt
  let statusKey = activityStatus
  if (activityStatus === 'cancelled' || activityStatus === 'rejected' || activityStatus === 'pending_review') {
    statusKey = activityStatus
  } else if (activityStatus === 'ended' || timeEnded) {
    statusKey = 'ended'
  } else if (max > 0 && enrolled >= max) {
    statusKey = 'full'
  } else {
    statusKey = 'published'
  }
  const tag = STATUS_LABEL_MAP[statusKey] || STATUS_LABEL_MAP.published
  const canJoin = statusKey === 'published'
  return {
    statusKey: tag.key,
    statusLabel: tag.label,
    statusColor: tag.color,
    statusBg: tag.bg,
    isFull: statusKey === 'full',
    isEnded: statusKey === 'ended',
    isCancelled: statusKey === 'cancelled',
    canJoin,
  }
}

const ACTIVITY_POST_HOURS_AFTER_END = 72

/** 与后端 activity_post_window_open 一致：开始后至结束+72h（无 endAt 则 start+72h） */
export function isActivityPostWindowOpen(raw, nowMs = Date.now()) {
  const startDt = raw?.startAt ? parseApiDateTime(raw.startAt) : null
  if (!startDt) return false
  const startMs = startDt.getTime()
  const endDt = raw?.endAt ? parseApiDateTime(raw.endAt) : null
  const windowEndMs = endDt
    ? endDt.getTime() + ACTIVITY_POST_HOURS_AFTER_END * 60 * 60 * 1000
    : startMs + ACTIVITY_POST_HOURS_AFTER_END * 60 * 60 * 1000
  return nowMs >= startMs && nowMs <= windowEndMs
}

import { resolveChatBadgeCount } from '@/utils/chatBadge'

export function mapActivityCard(card) {
  const tag = resolveActivityCategoryTag(card)
  const safeActivityId =
    typeof card.activityId === 'undefined' || card.activityId === null ? '' : String(card.activityId)
  const status = computeActivityStatus(card)
  return {
    id: safeActivityId,
    activityId: safeActivityId,
    activityKind: card.activityKind || 'event',
    isCityHall: (card.activityKind || 'event') === 'city_hall',
    category: tag.label,
    tagColor: tag.color,
    tagBg: tag.bg,
    title: card.title,
    time: fmtTime(card.startAt),
    location: card.locationName,
    distance: metersToKm(card.distanceMeters),
    joined: Number(card.enrolledCount || 0),
    total: Number(card.maxMembers || 0),
    organizer: card.organizer?.nickname || '',
    organizerId: card.organizer?.userId || '',
    categoryId: card.categoryId,
    subCategoryId: card.subCategoryId || '',
    enrollmentStatus: card.enrollmentStatus || card.myEnrollment?.status || null,
    messageCount: Number(card.messageCount || 0),
    unreadCount: card.unreadCount == null ? null : Number(card.unreadCount || 0),
    chatBadge: resolveChatBadgeCount({
      joined: (card.enrollmentStatus || card.myEnrollment?.status) === 'joined',
      unreadCount: card.unreadCount,
      messageCount: card.messageCount,
    }),
    ...status,
  }
}

export const getCommunityRules = () =>
  Promise.resolve([
    { title: '信息真实', desc: '发布活动时请确保时间、地点、人数与费用信息真实准确。' },
    { title: '友善沟通', desc: '群聊与线下交流中请保持礼貌，禁止骚扰与人身攻击。' },
    { title: '安全优先', desc: '组织者需优先考虑活动安全，参与者量力而行。' },
    { title: '拒绝商业骚扰', desc: '未经允许不得在活动中广告营销、拉群引流。' },
    { title: '尊重隐私', desc: '未经同意，不得公开他人联系方式、照片或聊天记录。' },
  ])

export const getReviewList = (query = {}) =>
  wmRequest({
    method: 'GET',
    path: '/me/reviews',
    query,
    mockHandler: ({ query: q }) => ok(paginate(wmDB.reviews, q.page, q.pageSize)),
  })

export const getMyChats = (query = {}) =>
  wmRequest({
    method: 'GET',
    path: '/me/chats',
    query: { page: query.page || 1, pageSize: query.pageSize || 5 },
    mockHandler: ({ query: q }) => {
      const rows = wmDB.activities
        .filter(
          (x) =>
            (x.myEnrollment && x.myEnrollment.status === 'joined') ||
            x.organizer?.userId === wmDB.profile.userId
        )
        .map((activity) => {
          const chatList = wmDB.chats[String(activity.activityId)] || []
          const last = chatList.length ? chatList[chatList.length - 1] : null
          const lastMessage = mockChatLastPreview(last)
          // Keep member count logic compatible:
          const memberCount =
            typeof activity.enrolledCount !== 'undefined'
              ? Number(activity.enrolledCount)
              : activity.organizer?.userId
              ? 1
              : 0
          return {
            activityId: String(activity.activityId),
            title: activity.title,
            activityStatus: activity.activityStatus || 'published',
            memberCount,
            lastMessage,
            lastMessageAt: last?.createdAt || null,
            unreadCount: Number(activity.activityId) === 1 ? 105 : Number(activity.activityId) === 2 ? 3 : 0,
          }
        })
        .sort((a, b) => {
          const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
          const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
          return tb - ta
        })
      return ok(paginate(rows, q.page, q.pageSize))
    },
  })

export const getMessageUnreadSummary = () =>
  wmRequest({
    method: 'GET',
    path: '/me/messages/unread-summary',
    needAuth: true,
    mockHandler: () => {
      const joined = (wmDB.activities || []).filter(
        (a) => a.myEnrollment?.status === 'joined' || a.organizer?.userId === wmDB.profile.userId,
      )
      let chatUnread = 0
      joined.forEach((a) => {
        const id = Number(a.activityId) || 0
        if (id === 1) chatUnread += 5
        else if (id === 2) chatUnread += 0
        else chatUnread += 2
      })
      chatUnread += (wmDB.dmThreads || []).length > 0 ? 1 : 0
      const notifUnread = (wmDB.notifications || []).filter((n) => !n.readAt).length
      return ok({ chatUnread, notifUnread })
    },
  })

export const markChatRead = (activityId) =>
  wmRequest({
    method: 'PATCH',
    path: `/me/chats/${activityId}/read`,
    mockHandler: () => ok({ updatedCount: 1 }),
  })

// Alias for new naming used by messages page.
export const markMyChatRead = (activityId) => markChatRead(activityId)

/** 活动 id 统一为 act_*（与后端文档一致） */
export function normalizeActivityIdForApi(raw) {
  const s = raw === undefined || raw === null ? '' : String(raw).trim()
  if (!s) return ''
  return s.startsWith('act_') ? s : `act_${s}`
}

function sortUserPairIds(a, b) {
  const x = String(a)
  const y = String(b)
  return x < y ? [x, y] : [y, x]
}

function parseDmReqId(s) {
  const t = String(s || '').replace(/^dmreq_/, '')
  const n = Number(t)
  return Number.isFinite(n) ? n : 0
}

function parseDmThrId(s) {
  const t = String(s || '').replace(/^dmthr_/, '')
  const n = Number(t)
  return Number.isFinite(n) ? n : 0
}

/** 在同一活动语境下查询与对方的私聊关系 */
export const getUserDmContext = (userId, activityId) =>
  wmRequest({
    method: 'GET',
    path: `/users/${encodeURIComponent(userId)}/dm-context`,
    query: { activityId: normalizeActivityIdForApi(activityId) },
    mockHandler: ({ query }) => {
      const rawAct = String(query.activityId || '')
      const aid = rawAct.replace(/^act_/, '')
      const me = wmDB.profile.userId
      const target = String(userId)
      if (target === me) {
        return ok({ threadId: null, outgoingPendingRequestId: null, incomingPendingRequestId: null, canRequest: false, denyReason: 'self' })
      }
      const activity = wmDB.activities.find((x) => String(x.activityId) === aid)
      if (!activity) {
        return ok({
          threadId: null,
          outgoingPendingRequestId: null,
          incomingPendingRequestId: null,
          canRequest: false,
          denyReason: 'not_in_activity',
        })
      }
      const iJoin =
        activity.organizer?.userId === me ||
        !!(activity.myEnrollment && activity.myEnrollment.status === 'joined')
      if (!iJoin) {
        return ok({
          threadId: null,
          outgoingPendingRequestId: null,
          incomingPendingRequestId: null,
          canRequest: false,
          denyReason: 'not_in_activity',
        })
      }
      const targetJoin =
        activity.organizer?.userId === target ||
        !!(activity.myEnrollment && activity.myEnrollment.status === 'joined') ||
        Object.prototype.hasOwnProperty.call(wmDB.users || {}, target)
      if (!targetJoin) {
        return ok({
          threadId: null,
          outgoingPendingRequestId: null,
          incomingPendingRequestId: null,
          canRequest: false,
          denyReason: 'target_not_in_activity',
        })
      }
      const thread = wmDB.dmThreads.find((t) => {
        const [lo, hi] = sortUserPairIds(t.userLow, t.userHigh)
        const [a, b] = sortUserPairIds(me, target)
        return lo === a && hi === b
      })
      if (thread) {
        return ok({
          threadId: `dmthr_${thread.id}`,
          outgoingPendingRequestId: null,
          incomingPendingRequestId: null,
          canRequest: false,
          denyReason: 'has_thread',
        })
      }
      const pendingOut = wmDB.dmRequests.find(
        (r) => r.fromUserId === me && r.toUserId === target && r.status === 'pending'
      )
      if (pendingOut) {
        return ok({
          threadId: null,
          outgoingPendingRequestId: `dmreq_${pendingOut.id}`,
          incomingPendingRequestId: null,
          canRequest: false,
          denyReason: 'pending_outgoing',
        })
      }
      const pendingIn = wmDB.dmRequests.find(
        (r) => r.fromUserId === target && r.toUserId === me && r.status === 'pending'
      )
      if (pendingIn) {
        return ok({
          threadId: null,
          outgoingPendingRequestId: null,
          incomingPendingRequestId: `dmreq_${pendingIn.id}`,
          canRequest: false,
          denyReason: 'pending_incoming',
        })
      }
      return ok({
        threadId: null,
        outgoingPendingRequestId: null,
        incomingPendingRequestId: null,
        canRequest: true,
        denyReason: null,
      })
    },
  })

export const createDmRequest = (activityId, payload) =>
  wmRequest({
    method: 'POST',
    path: `/activities/${normalizeActivityIdForApi(activityId)}/dm-requests`,
    data: payload,
    mockHandler: ({ data }) => {
      const me = wmDB.profile.userId
      const to = data?.toUserId
      if (!to) return { code: 400, message: 'invalid toUserId', data: null }
      if (data?.introText) {
        const blocked = localTextBlockedReason(String(data.introText), { strict: true })
        if (blocked) return { code: 400, message: blocked, data: null }
      }
      const aid = String(activityId).replace(/^act_/, '')
      const nextId = Math.max(0, ...wmDB.dmRequests.map((r) => r.id)) + 1
      wmDB.dmRequests.push({
        id: nextId,
        activityId: aid,
        fromUserId: me,
        toUserId: to,
        introText: (data.introText && String(data.introText).slice(0, 500)) || null,
        status: 'pending',
        threadId: null,
        createdAt: new Date().toISOString(),
        respondedAt: null,
      })
      wmDB.notifications.unshift({
        notificationId: `ntf_dm_${nextId}`,
        type: 'dm_request',
        title: '私聊申请',
        body: `${wmDB.profile.nickname} 申请与你私聊`,
        payload: { dmRequestId: `dmreq_${nextId}`, activityId: `act_${aid}`, fromUserId: me },
        readAt: null,
        createdAt: new Date().toISOString(),
      })
      return ok({ requestId: `dmreq_${nextId}`, threadId: null, status: 'pending' })
    },
  })

export const listDmRequests = (query = {}) =>
  wmRequest({
    method: 'GET',
    path: '/me/dm-requests',
    query,
    mockHandler: ({ query: q }) => {
      const me = wmDB.profile.userId
      const dir = q.direction || 'incoming'
      const st = q.status || 'pending'
      let list = wmDB.dmRequests.slice()
      if (dir === 'incoming') list = list.filter((r) => r.toUserId === me)
      else list = list.filter((r) => r.fromUserId === me)
      if (st === 'pending') list = list.filter((r) => r.status === 'pending')
      const rows = list.map((r) => {
        const fromU = wmDB.users[r.fromUserId] || { nickname: '用户' }
        const toU = wmDB.users[r.toUserId] || { nickname: '用户' }
        return {
          requestId: `dmreq_${r.id}`,
          activityId: `act_${r.activityId}`,
          fromUser: {
            userId: r.fromUserId,
            nickname: fromU.nickname,
            avatarUrl: fromU.avatarUrl || null,
          },
          toUser: { userId: r.toUserId, nickname: toU.nickname, avatarUrl: toU.avatarUrl || null },
          introText: r.introText,
          status: r.status,
          threadId: r.threadId ? `dmthr_${r.threadId}` : null,
          createdAt: r.createdAt,
          respondedAt: r.respondedAt,
        }
      })
      return ok(paginate(rows, q.page, q.pageSize))
    },
  })

/** 按 requestId 查找私聊申请（系统通知跳转等） */
export async function findDmRequest(requestId) {
  const id = String(requestId || '').trim()
  if (!id) return null
  const [incoming, outgoing] = await Promise.all([
    listDmRequests({ direction: 'incoming', status: 'all', page: 1, pageSize: 50 }),
    listDmRequests({ direction: 'outgoing', status: 'all', page: 1, pageSize: 50 }),
  ])
  const all = [...(incoming?.list || []), ...(outgoing?.list || [])]
  return all.find((r) => r.requestId === id) || null
}

export const acceptDmRequest = (requestId) =>
  wmRequest({
    method: 'POST',
    path: `/me/dm-requests/${requestId}/accept`,
    mockHandler: () => {
      const id = parseDmReqId(requestId)
      const req = wmDB.dmRequests.find((r) => r.id === id)
      if (!req) return { code: 404, message: 'request not found', data: null }
      const me = wmDB.profile.userId
      if (req.toUserId !== me) return { code: 403, message: 'not your request', data: null }
      if (req.status !== 'pending') return { code: 400, message: 'request not pending', data: null }
      const tid = Math.max(0, ...wmDB.dmThreads.map((t) => t.id)) + 1
      const [userLow, userHigh] = sortUserPairIds(req.fromUserId, req.toUserId)
      wmDB.dmThreads.push({ id: tid, userLow, userHigh })
      req.status = 'accepted'
      req.threadId = tid
      req.respondedAt = new Date().toISOString()
      if (!wmDB.dmMessages[String(tid)]) wmDB.dmMessages[String(tid)] = []
      return ok({ requestId: `dmreq_${id}`, threadId: `dmthr_${tid}`, status: 'accepted' })
    },
  })

export const rejectDmRequest = (requestId) =>
  wmRequest({
    method: 'POST',
    path: `/me/dm-requests/${requestId}/reject`,
    mockHandler: () => {
      const id = parseDmReqId(requestId)
      const req = wmDB.dmRequests.find((r) => r.id === id)
      if (!req) return { code: 404, message: 'request not found', data: null }
      if (req.toUserId !== wmDB.profile.userId) return { code: 403, message: 'not your request', data: null }
      req.status = 'rejected'
      req.respondedAt = new Date().toISOString()
      return ok({ status: 'rejected' })
    },
  })

export const cancelDmRequest = (requestId) =>
  wmRequest({
    method: 'DELETE',
    path: `/me/dm-requests/${requestId}`,
    mockHandler: () => {
      const id = parseDmReqId(requestId)
      const req = wmDB.dmRequests.find((r) => r.id === id)
      if (!req) return { code: 404, message: 'request not found', data: null }
      if (req.fromUserId !== wmDB.profile.userId) return { code: 403, message: 'not your request', data: null }
      req.status = 'cancelled'
      req.respondedAt = new Date().toISOString()
      return ok({ status: 'cancelled' })
    },
  })

export const getDirectChats = (query = {}) =>
  wmRequest({
    method: 'GET',
    path: '/me/direct-chats',
    query,
    mockHandler: ({ query: q }) => {
      const me = wmDB.profile.userId
      const list = wmDB.dmThreads
        .map((t) => {
          let peer = null
          if (t.userLow === me) peer = t.userHigh
          else if (t.userHigh === me) peer = t.userLow
          else return null
          const u = wmDB.users[peer]
          const msgs = wmDB.dmMessages[String(t.id)] || []
          const last = msgs.length ? msgs[msgs.length - 1] : null
          return {
            threadId: `dmthr_${t.id}`,
            peerUserId: peer,
            peerNickname: u?.nickname || '用户',
            peerAvatarUrl: u?.avatarUrl || null,
            lastMessage: mockChatLastPreview(last),
            lastMessageAt: last?.createdAt || null,
            unreadCount: 0,
          }
        })
        .filter(Boolean)
      list.sort((a, b) => {
        const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
        const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
        return tb - ta
      })
      return ok(paginate(list, q.page, q.pageSize))
    },
  })

export const getDirectMessages = (threadId, query = {}) =>
  wmRequest({
    method: 'GET',
    path: `/direct-chats/${threadId}/messages`,
    query,
    mockHandler: ({ query: q }) => {
      const tid = parseDmThrId(threadId)
      const t = wmDB.dmThreads.find((x) => x.id === tid)
      if (!t) return { code: 404, message: 'thread not found', data: null }
      const me = wmDB.profile.userId
      if (t.userLow !== me && t.userHigh !== me) return { code: 403, message: 'forbidden', data: null }
      let list = (wmDB.dmMessages[String(tid)] || []).slice()
      const limit = Math.min(50, Math.max(1, Number(q.limit) || 30))
      list = list.slice(-limit)
      const mapped = list.map((m) => ({
        messageId: m.messageId,
        threadId: `dmthr_${tid}`,
        sender: m.sender,
        msgType: m.msgType,
        text: m.text,
        imageUrl: m.imageUrl,
        stickerId: m.stickerId,
        locationName: m.locationName,
        address: m.address,
        lat: m.lat,
        lng: m.lng,
        createdAt: m.createdAt,
      }))
      const nextCursor = mapped.length ? mapped[0].messageId : null
      return ok({ list: mapped, nextCursor })
    },
  })

export const sendDirectMessage = (threadId, payload) =>
  wmRequest({
    method: 'POST',
    path: `/direct-chats/${threadId}/messages`,
    data: payload,
    mockHandler: ({ data }) => {
      const tid = parseDmThrId(threadId)
      const t = wmDB.dmThreads.find((x) => x.id === tid)
      if (!t) return { code: 404, message: 'thread not found', data: null }
      const me = wmDB.profile.userId
      if (t.userLow !== me && t.userHigh !== me) return { code: 403, message: 'forbidden', data: null }
      if (data.msgType === 'text' && data.text) {
        const blocked = localTextBlockedReason(data.text)
        if (blocked) return { code: 400, message: blocked, data: null }
      }
      if (data.msgType === 'sticker' && !isKnownStickerId(data.stickerId)) {
        return { code: 400, message: 'Unknown stickerId', data: null }
      }
      if (data.msgType === 'location') {
        if (!data.locationName || data.lat == null || data.lng == null) {
          return { code: 400, message: 'locationName, lat, lng required', data: null }
        }
      }
      const row = mockChatMessageRow(
        {
          messageId: `dmmsg_${Date.now()}`,
          threadId: `dmthr_${tid}`,
          sender: {
            userId: wmDB.profile.userId,
            nickname: wmDB.profile.nickname,
            avatarUrl: wmDB.profile.avatarUrl,
          },
        },
        data
      )
      if (!wmDB.dmMessages[String(tid)]) wmDB.dmMessages[String(tid)] = []
      wmDB.dmMessages[String(tid)].push({
        messageId: row.messageId,
        sender: row.sender,
        msgType: row.msgType,
        text: row.text,
        imageUrl: row.imageUrl,
        stickerId: row.stickerId,
        locationName: row.locationName,
        address: row.address,
        lat: row.lat,
        lng: row.lng,
        createdAt: row.createdAt,
      })
      return ok(row)
    },
  })

export const markDirectChatRead = (threadId) =>
  wmRequest({
    method: 'PATCH',
    path: `/direct-chats/${threadId}/read`,
    mockHandler: () => ok({ updatedCount: 1 }),
  })

// Backward compatible alias for existing pages.
export const getConversationList = (query = {}) =>
  getMyChats(query).then((data) => {
    const colors = [
      'linear-gradient(135deg, #38bdf8, #0284c7)',
      'linear-gradient(135deg, #60a5fa, #6366f1)',
      'linear-gradient(135deg, #2dd4bf, #0d9488)',
    ]
    const list = (data?.list || []).map((item, idx) => ({
      id: String(item.activityId || idx + 1),
      name: item.title || '活动群聊',
      sender: '群消息',
      preview: item.lastMessage || '暂无消息',
      time: relativeTimeSafe(item.lastMessageAt),
      unread: Number(item.unreadCount || 0),
      color: colors[idx % colors.length],
      activityId: String(item.activityId || ''),
    }))
    return { ...data, list }
  })

function relativeTimeSafe(iso) {
  if (!iso) return '最近'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '最近'
  const diff = Date.now() - t
  if (diff < 60 * 1000) return '刚刚'
  if (diff < 3600 * 1000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 24 * 3600 * 1000) return `${Math.floor(diff / 3600000)}小时前`
  return `${Math.floor(diff / (24 * 3600 * 1000))}天前`
}
