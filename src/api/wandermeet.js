import { wmRequest, paginate } from './client'
import { setAccessToken } from './config'
import { wmDB, toActivityCard } from '@/mock/wandermeet-db'

const ok = (data) => ({ code: 0, message: 'ok', data })

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

// 2
export const loginBySms = (payload) =>
  wmRequest({
    method: 'POST',
    path: '/auth/sms/login',
    data: payload,
    needAuth: false,
    mockHandler: () => {
      const data = {
        accessToken: 'wm_at_mock',
        expiresIn: 7200,
        refreshToken: 'wm_rt_mock',
        user: {
          userId: wmDB.profile.userId,
          nickname: wmDB.profile.nickname,
          avatarUrl: wmDB.profile.avatarUrl,
          status: wmDB.profile.status,
        },
      }
      setAccessToken(data.accessToken)
      return ok(data)
    },
  })

// 3
export const refreshToken = (payload) =>
  wmRequest({
    method: 'POST',
    path: '/auth/token/refresh',
    data: payload,
    needAuth: false,
    mockHandler: () => ok({ accessToken: 'wm_at_mock_new', expiresIn: 7200 }),
  })

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
      wmDB.profile = {
        ...wmDB.profile,
        nickname: data.nickname ?? wmDB.profile.nickname,
        avatarUrl: data.avatarUrl ?? wmDB.profile.avatarUrl,
        tags: data.tags ?? wmDB.profile.tags,
        bio: data.bio ?? wmDB.profile.bio,
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
export const getActivityCategories = () =>
  wmRequest({
    method: 'GET',
    path: '/meta/activity-categories',
    needAuth: false,
    mockHandler: () => ok({ categories: wmDB.categories }),
  })

// 10
export const getActivities = (query = {}) =>
  wmRequest({
    method: 'GET',
    path: '/activities',
    query,
    mockHandler: ({ query: q }) => {
      let list = wmDB.activities.slice()
      if (q.categoryId) list = list.filter((x) => x.categoryId === q.categoryId)
      list = normalizeDateRange(list, q.dateRange)
      return ok(paginate(list.map(toActivityCard), q.page, q.pageSize))
    },
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
      if (q.cityCode) list = list.filter((x) => String(x.cityCode || '') === String(q.cityCode))
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
        enrolledCount: 0,
        myEnrollment: null,
      }
      wmDB.activities.unshift(row)
      return ok({ activityId: row.activityId, title: row.title, activityStatus: row.activityStatus, organizer: row.organizer })
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
      const list =
        role === 'organized'
          ? wmDB.activities.filter((x) => x.organizer.userId === wmDB.profile.userId)
          : wmDB.activities.filter((x) => x.myEnrollment)
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
  coffee: { color: '#8b5cf6', bg: '#f5f3ff', label: '咖啡' },
  citywalk: { color: '#0ea5e9', bg: '#e0f2fe', label: 'Citywalk' },
  hiking: { color: '#10b981', bg: '#ecfdf5', label: '徒步' },
  boardgame: { color: '#f59e0b', bg: '#fffbeb', label: '桌游' },
  exhibit: { color: '#ef4444', bg: '#fef2f2', label: '展览' },
  night_run: { color: '#ef4444', bg: '#fef2f2', label: '夜跑' },
  movie: { color: '#6366f1', bg: '#eef2ff', label: '电影' },
  badminton: { color: '#0ea5a4', bg: '#ccfbf1', label: '羽毛球' },
  food: { color: '#f97316', bg: '#ffedd5', label: '美食' },
  photography: { color: '#4f46e5', bg: '#e0e7ff', label: '摄影' },
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
  full: { key: 'full', label: '已满员', color: '#f97316', bg: '#ffedd5' },
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

export function mapActivityCard(card) {
  const tag = categoryColorMap[card.categoryId] || { color: '#64748b', bg: '#f1f5f9', label: card.categoryId }
  const safeActivityId =
    typeof card.activityId === 'undefined' || card.activityId === null ? '' : String(card.activityId)
  const status = computeActivityStatus(card)
  return {
    id: safeActivityId,
    activityId: safeActivityId,
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

// Backward compatible alias for existing pages.
export const getConversationList = (query = {}) =>
  getMyChats(query).then((data) => {
    const colors = [
      'linear-gradient(135deg, #fbbf24, #f97316)',
      'linear-gradient(135deg, #60a5fa, #6366f1)',
      'linear-gradient(135deg, #f87171, #ec4899)',
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
