import { wmRequest, paginate } from './client'
import { clearWmAuthTokens, setAccessToken, setRefreshToken } from './config'
import cityHallPrefectures from './city_hall_prefectures.json'
import { provinceDisplayName } from './china_province_display.js'
import { wmDB, toActivityCard } from '@/mock/wandermeet-db'
import { contactTextBlockedReason } from '@/utils/contactContentFilter'

const ok = (data) => ({ code: 0, message: 'ok', data })

function buildMockCityHallCatalog() {
  const provinces = cityHallPrefectures.map((blk) => ({
    provinceCode: blk.provinceCode,
    provinceName: provinceDisplayName(blk.provinceCode),
    cities: (blk.cities || []).map((c) => ({
      cityCode: c.cityCode,
      cityName: c.cityName,
      displayName: `${c.cityName} · 城市大群`,
      memberCount: 0,
      activityId: null,
      joined: null,
    })),
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
    mockHandler: ({ data }) =>
      ok({
        uploadUrl: 'https://oss.example.com/mock-upload',
        objectKey: `wm/avatar/${wmDB.profile.userId}/avatar.${data.fileExt || 'jpg'}`,
        headers: { 'Content-Type': data.contentType || 'image/jpeg' },
      }),
  })

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
export const getOnboardingMeta = () =>
  wmRequest({
    method: 'GET',
    path: '/meta/onboarding',
    needAuth: false,
    mockHandler: () =>
      ok({
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
    mockHandler: () => ok({ categories: wmDB.categories }),
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
      return ok({
        exists: false,
        cityCode: cc,
        displayName: '',
        memberCount: 0,
        joined: false,
        activityId: null,
        activityKind: 'event',
      })
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
      const cc = (data && data.cityCode) || '110000'
      const name = (data && data.cityLabel && String(data.cityLabel).trim()) || cc
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
    mockHandler: ({ query: q }) => {
      let list = wmDB.activities.slice()
      if (q.cityCode) {
        list = list.filter((x) => activityCityMatchesPlaceFilter(String(q.cityCode), x.cityCode))
      }
      if (q.categoryId) list = list.filter((x) => x.categoryId === q.categoryId)
      list = normalizeDateRange(list, q.dateRange)
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

export const submitUserFeedback = (data) =>
  wmRequest({
    method: 'POST',
    path: '/me/feedback',
    data,
    needAuth: true,
    mockHandler: () => ok({ feedbackId: 'fb_mock_1' }),
  })

export const getNearbyActivities = (query = {}) =>
  wmRequest({
    method: 'GET',
    path: '/activities/nearby',
    query,
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
      list = normalizeDateRange(list, q.dateRange || 'all')

      list = list
        .map((row) => ({
          ...row,
          distanceMeters: calcDistanceMeters(userLat, userLng, Number(row.lat), Number(row.lng)),
        }))
        .filter((row) => Number(row.distanceMeters) <= radiusKm * 1000)

      if ((q.sortBy || 'distance') === 'startAt') {
        list = list.slice().sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
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

/** 发起人/用户公开资料（便于详情页单独拉取或与后端对齐） */
export const getUserPublicProfile = (userId) =>
  wmRequest({
    method: 'GET',
    path: `/users/${String(userId)}/public`,
    mockHandler: () => {
      const uid = String(userId)
      const organizedCount = wmDB.activities.filter((x) => x.organizer?.userId === uid).length
      const u = wmDB.users?.[uid]
      if (u) {
        return ok({ ...u, organizedCount })
      }
      const act = wmDB.activities.find((x) => x.organizer?.userId === uid)
      if (act?.organizer) {
        return ok({
          userId: act.organizer.userId,
          nickname: act.organizer.nickname,
          avatarUrl: act.organizer.avatarUrl,
          bio: '',
          tags: [],
          verificationBadge: act.organizer.verificationBadge,
          organizedCount,
        })
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
      const nextId = String(Date.now())
      const row = {
        activityId: nextId,
        title: data.title,
        description: data.description,
        categoryId: data.categoryId,
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
export const getActivityMembers = (activityId) =>
  wmRequest({
    method: 'GET',
    path: `/activities/${activityId}/members`,
    mockHandler: () => {
      const activity = wmDB.activities.find((x) => x.activityId === String(activityId))
      return ok({
        list: [
          {
            userId: activity?.organizer.userId || 'u_10001',
            nickname: activity?.organizer.nickname || '组织者',
            avatarUrl: null,
            role: 'organizer',
            joinedAt: new Date().toISOString(),
          },
        ],
      })
    },
  })

// 18 / 19
// query: { limit?: number, since?: ISOString (增量拉取), cursor?: string }
export const getActivityMessages = (activityId, query = {}) =>
  wmRequest({
    method: 'GET',
    path: `/activities/${activityId}/messages`,
    query,
    mockHandler: ({ query: q }) => {
      let list = wmDB.chats[String(activityId)] || []
      if (q.since) {
        const sinceTs = new Date(q.since).getTime()
        if (!Number.isNaN(sinceTs)) {
          list = list.filter((m) => new Date(m.createdAt).getTime() > sinceTs)
        }
      }
      const limit = Math.min(100, Math.max(1, Number(q.limit) || 50))
      const sliced = list.slice(-limit)
      return ok({
        list: sliced,
        nextCursor: sliced.length ? sliced[0].messageId : null,
      })
    },
  })

export const sendActivityMessage = (activityId, payload) =>
  wmRequest({
    method: 'POST',
    path: `/activities/${activityId}/messages`,
    data: payload,
    mockHandler: ({ data }) => {
      if (data.msgType === 'text' && data.text) {
        const blocked = contactTextBlockedReason(data.text)
        if (blocked) return { code: 400, message: blocked, data: null }
      }
      const row = {
        messageId: `msg_${Date.now()}`,
        activityId: String(activityId),
        sender: { userId: wmDB.profile.userId, nickname: wmDB.profile.nickname, avatarUrl: null },
        msgType: data.msgType,
        text: data.text || null,
        imageUrl: data.imageUrl || null,
        createdAt: new Date().toISOString(),
      }
      if (!wmDB.chats[String(activityId)]) wmDB.chats[String(activityId)] = []
      wmDB.chats[String(activityId)].push(row)
      return ok(row)
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
      const timeScope = q.timeScope || 'all'
      let list = wmDB.activities
      if (role === 'organized') {
        list = list.filter((x) => x.organizer?.userId === wmDB.profile.userId)
      } else if (role === 'all') {
        list = list.filter(
          (x) =>
            (x.activityKind || 'event') === 'event' &&
            (x.organizer?.userId === wmDB.profile.userId || x.myEnrollment),
        )
      } else {
        list = list.filter((x) => x.myEnrollment)
      }
      if (timeScope === 'past') {
        list = list.filter((x) => {
          const st = x.activityStatus
          if (st === 'ended' || st === 'cancelled') return true
          if (x.endAt && new Date(x.endAt).getTime() < Date.now()) return true
          return false
        })
      } else if (timeScope === 'upcoming') {
        list = list.filter((x) => {
          if (x.activityStatus === 'cancelled' || x.activityStatus === 'ended') return false
          if (x.endAt && new Date(x.endAt).getTime() <= Date.now()) return false
          return x.activityStatus === 'published'
        })
      }
      return ok(paginate(list.map(toActivityCard), q.page, q.pageSize))
    },
  })

// 29
export const getPremiumStatus = () =>
  wmRequest({
    method: 'GET',
    path: '/me/premium',
    mockHandler: () => ok({ enabled: false, sku: [] }),
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

// ===== Frontend-friendly aggregate helpers =====
const categoryColorMap = {
  coffee: { color: '#0f7669', bg: '#ecfdf5', label: '咖啡' },
  citywalk: { color: '#0ea5e9', bg: '#e0f2fe', label: 'Citywalk' },
  hiking: { color: '#10b981', bg: '#ecfdf5', label: '徒步' },
  boardgame: { color: '#0d9488', bg: '#ecfdf5', label: '桌游' },
  coworking: { color: '#0284c7', bg: '#e0f2fe', label: '联合办公·共创' },
  indie: { color: '#ca8a04', bg: '#fef9c3', label: '副业·独立开发' },
  language: { color: '#2563eb', bg: '#dbeafe', label: '语言交换' },
  dining: { color: '#0d9488', bg: '#ccfbf1', label: '约饭·探店' },
  photography: { color: '#7c3aed', bg: '#ede9fe', label: '摄影扫街' },
  exhibit: { color: '#ef4444', bg: '#fef2f2', label: '展览' },
  night_run: { color: '#ef4444', bg: '#fef2f2', label: '夜跑' },
  other: { color: '#64748b', bg: '#f1f5f9', label: '其他' },
  movie: { color: '#6366f1', bg: '#eef2ff', label: '电影' },
  badminton: { color: '#0ea5a4', bg: '#ccfbf1', label: '羽毛球' },
  food: { color: '#0284c7', bg: '#e0f2fe', label: '美食' },
  mountaineering: { color: '#16a34a', bg: '#dcfce7', label: '登山' },
  cycling: { color: '#0284c7', bg: '#e0f2fe', label: '骑行' },
  camping: { color: '#a16207', bg: '#fef9c3', label: '露营' },
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

export function resolveActivityCategoryTag(card) {
  const base =
    categoryColorMap[card.categoryId] || {
      color: '#64748b',
      bg: '#f1f5f9',
      label: card.categoryId || '活动',
    }
  const theme = String(card.categoryLabel || '').trim()
  if (card.categoryId === 'other' && theme) {
    return { ...base, label: `其他 · ${theme}` }
  }
  return base
}

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
    organizer: card.organizer?.nickname || '组织者',
    organizerId: card.organizer?.userId || '',
    categoryId: card.categoryId,
    enrollmentStatus: card.enrollmentStatus || card.myEnrollment?.status || null,
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
    query: { page: query.page || 1, pageSize: query.pageSize || 20 },
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
          const lastMessage =
            last?.msgType === 'image' ? '[图片]' : last?.text || null
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
            unreadCount: 0,
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
        const blocked = contactTextBlockedReason(String(data.introText))
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
            lastMessage: last ? (last.msgType === 'image' ? '[图片]' : last.text) : null,
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
        const blocked = contactTextBlockedReason(data.text)
        if (blocked) return { code: 400, message: blocked, data: null }
      }
      const row = {
        messageId: `dmmsg_${Date.now()}`,
        threadId: `dmthr_${tid}`,
        sender: {
          userId: wmDB.profile.userId,
          nickname: wmDB.profile.nickname,
          avatarUrl: wmDB.profile.avatarUrl,
        },
        msgType: data.msgType || 'text',
        text: data.text || null,
        imageUrl: data.imageUrl || null,
        createdAt: new Date().toISOString(),
      }
      if (!wmDB.dmMessages[String(tid)]) wmDB.dmMessages[String(tid)] = []
      wmDB.dmMessages[String(tid)].push({
        messageId: row.messageId,
        sender: row.sender,
        msgType: row.msgType,
        text: row.text,
        imageUrl: row.imageUrl,
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
