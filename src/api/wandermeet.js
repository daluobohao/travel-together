import { wmRequest, paginate } from './client'
import { setAccessToken } from './config'
import { wmDB, toActivityCard } from '@/mock/wandermeet-db'

const ok = (data) => ({ code: 0, message: 'ok', data })

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
      if (q.dateRange === 'today') list = list.filter((x) => x.activityId === '1' || x.activityId === '3')
      if (q.dateRange === 'tomorrow') list = list.filter((x) => x.activityId === '2')
      return ok(paginate(list.map(toActivityCard), q.page, q.pageSize))
    },
  })

// 11
export const getActivityDetail = (activityId, query = {}) =>
  wmRequest({
    method: 'GET',
    path: `/activities/${activityId}`,
    query,
    mockHandler: () => ok(wmDB.activities.find((x) => x.activityId === String(activityId)) || null),
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

// 15 / 16
export const enrollActivity = (activityId) =>
  wmRequest({
    method: 'POST',
    path: `/activities/${activityId}/enrollments`,
    data: {},
    mockHandler: () => ok({ enrollmentId: `enr_${Date.now()}`, status: 'joined' }),
  })

export const cancelEnrollment = (activityId) =>
  wmRequest({
    method: 'DELETE',
    path: `/activities/${activityId}/enrollments/me`,
    mockHandler: () => ok({ status: 'cancelled' }),
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
export const getActivityMessages = (activityId, query = {}) =>
  wmRequest({
    method: 'GET',
    path: `/activities/${activityId}/messages`,
    query,
    mockHandler: ({ query: q }) => {
      const list = wmDB.chats[String(activityId)] || []
      const limit = Math.min(50, Math.max(1, Number(q.limit) || 20))
      return ok({ list: list.slice(-limit), nextCursor: list.length ? list[0].messageId : null })
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
        sender: { userId: 'me', nickname: '你', avatarUrl: null },
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

function fmtTime(startAt) {
  if (!startAt) return ''
  const d = new Date(startAt)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${h}:${m}`
}

function metersToKm(meters) {
  if (!meters && meters !== 0) return ''
  return `${(Number(meters) / 1000).toFixed(1)}km`
}

export function mapActivityCard(card) {
  const tag = categoryColorMap[card.categoryId] || { color: '#64748b', bg: '#f1f5f9', label: card.categoryId }
  return {
    id: Number(card.activityId),
    activityId: String(card.activityId),
    category: tag.label,
    tagColor: tag.color,
    tagBg: tag.bg,
    title: card.title,
    time: fmtTime(card.startAt),
    location: card.locationName,
    distance: metersToKm(card.distanceMeters),
    joined: card.enrolledCount,
    total: card.maxMembers,
    organizer: card.organizer?.nickname || '组织者',
    categoryId: card.categoryId,
  }
}

export const getCommunityRules = () =>
  wmRequest({
    method: 'GET',
    path: '/meta/community-rules',
    needAuth: false,
    mockHandler: () =>
      ok([
        { title: '信息真实', desc: '发布活动时请确保时间、地点、人数与费用信息真实准确。' },
        { title: '友善沟通', desc: '群聊与线下交流中请保持礼貌，禁止骚扰与人身攻击。' },
        { title: '安全优先', desc: '组织者需优先考虑活动安全，参与者量力而行。' },
        { title: '拒绝商业骚扰', desc: '未经允许不得在活动中广告营销、拉群引流。' },
        { title: '尊重隐私', desc: '未经同意，不得公开他人联系方式、照片或聊天记录。' },
      ]),
  })

export const getReviewList = (query = {}) =>
  wmRequest({
    method: 'GET',
    path: '/me/reviews',
    query,
    mockHandler: ({ query: q }) => ok(paginate(wmDB.reviews, q.page, q.pageSize)),
  })

export const getConversationList = () =>
  wmRequest({
    method: 'GET',
    path: '/me/conversations',
    mockHandler: () => {
      const list = wmDB.activities.slice(0, 3).map((activity, idx) => {
        const msgs = wmDB.chats[activity.activityId] || []
        const last = msgs[msgs.length - 1]
        return {
          id: Number(activity.activityId),
          name: activity.title,
          sender: last?.sender?.nickname || activity.organizer.nickname,
          preview: last?.text || '欢迎来到活动群',
          time: idx === 0 ? '5分钟前' : idx === 1 ? '1小时前' : '3小时前',
          unread: idx === 0 ? 2 : idx === 2 ? 1 : 0,
          color: idx === 0 ? 'linear-gradient(135deg, #fbbf24, #f97316)' : idx === 1 ? 'linear-gradient(135deg, #60a5fa, #6366f1)' : 'linear-gradient(135deg, #f87171, #ec4899)',
        }
      })
      return ok({ list })
    },
  })
