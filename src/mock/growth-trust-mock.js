/**
 * PRD 裂变与信任 — Mock 业务逻辑（本地开发 / mock 模式）
 */
import { wmDB } from './wandermeet-db'

const REFERRAL_TIERS = [1, 3, 5, 10]
const ENTITLEMENT_DAYS = {
  premium_lite_3d: 3,
  premium_std_7d: 7,
  premium_std_15d: 15,
  premium_std_30d: 30,
}

function nowIso() {
  return new Date().toISOString()
}

function addDays(iso, days) {
  const d = new Date(iso || Date.now())
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

function genReferralCode(userId) {
  const base = String(userId || 'U').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  const hash = base.slice(-4).padStart(4, '0')
  return `WM${hash}${Math.random().toString(36).slice(2, 4).toUpperCase()}`.slice(0, 8)
}

function ensureGrowthTables() {
  if (!wmDB.referralCodes) wmDB.referralCodes = {}
  if (!wmDB.referralBindings) wmDB.referralBindings = []
  if (!wmDB.userEntitlements) wmDB.userEntitlements = []
  if (!wmDB.userBadges) wmDB.userBadges = []
  if (!wmDB.photoVerifications) wmDB.photoVerifications = []
  if (!wmDB.activityCheckins) wmDB.activityCheckins = []
  if (!wmDB.activityMeetReviews) wmDB.activityMeetReviews = []
  if (!wmDB.activityExposureBoosts) wmDB.activityExposureBoosts = []
  if (!wmDB.userSafetyAcks) wmDB.userSafetyAcks = []
  if (!wmDB.userTrustProfiles) wmDB.userTrustProfiles = {}
}

function getTrustProfile(userId) {
  ensureGrowthTables()
  const uid = String(userId)
  if (!wmDB.userTrustProfiles[uid]) {
    wmDB.userTrustProfiles[uid] = {
      userId: uid,
      trustScore: 500,
      trustLevel: 'basic',
      meetCount: 0,
      showMeetCount: true,
      photoVerified: false,
      updatedAt: nowIso(),
    }
  }
  return wmDB.userTrustProfiles[uid]
}

function computeTrustLevel(userId) {
  const p = wmDB.profile
  const tp = getTrustProfile(userId)
  const isSelf = String(userId) === String(p.userId)
  const profile = isSelf ? p : wmDB.users?.[userId]
  const hasProfile =
    profile &&
    profile.avatarUrl &&
    profile.nickname &&
    profile.bio &&
    (profile.tags?.length || 0) >= 1
  const realname =
    isSelf && p.verification?.status === 'approved'
  const photo = tp.photoVerified
  if (realname) return 'realname_verified'
  if (photo) return 'photo_verified'
  if (hasProfile) return 'profile_complete'
  return 'basic'
}

function syncTrustLevel(userId) {
  const tp = getTrustProfile(userId)
  tp.trustLevel = computeTrustLevel(userId)
  tp.updatedAt = nowIso()
  return tp
}

function getOrCreateReferralCode(userId) {
  ensureGrowthTables()
  const uid = String(userId)
  if (wmDB.referralCodes[uid]) return wmDB.referralCodes[uid]
  const code = genReferralCode(uid)
  wmDB.referralCodes[uid] = { userId: uid, code, createdAt: nowIso() }
  return wmDB.referralCodes[uid]
}

function findReferralByCode(code) {
  ensureGrowthTables()
  const c = String(code || '').toUpperCase()
  return Object.values(wmDB.referralCodes).find((x) => x.code === c) || null
}

function maskNickname(name) {
  const s = String(name || '用户')
  if (s.length <= 1) return `${s}*`
  return `${s[0]}**${s.slice(-1)}`
}

function countQualifiedReferrals(inviterId) {
  ensureGrowthTables()
  return wmDB.referralBindings.filter(
    (b) => b.inviterId === String(inviterId) && b.status === 'qualified',
  ).length
}

function nextTierProgress(qualified) {
  const tiers = REFERRAL_TIERS
  let next = tiers[0]
  for (const t of tiers) {
    if (qualified < t) {
      next = t
      break
    }
    next = t
  }
  if (qualified >= tiers[tiers.length - 1]) {
    return { nextTier: null, progress: 1, currentTier: tiers[tiers.length - 1] }
  }
  const prev =
    tiers.filter((t) => t <= qualified).pop() || 0
  const range = next - prev || next
  const progress = Math.min(1, (qualified - prev) / range)
  return { nextTier: next, progress, currentTier: prev }
}

function grantEntitlement(userId, type, source, sourceRefId, pinQuota = 0) {
  ensureGrowthTables()
  const days = ENTITLEMENT_DAYS[type] || 7
  const uid = String(userId)
  const existing = wmDB.userEntitlements
    .filter((e) => e.userId === uid && new Date(e.expiresAt) > new Date())
    .sort((a, b) => new Date(b.expiresAt) - new Date(a.expiresAt))[0]
  const startsAt = nowIso()
  const base = existing ? existing.expiresAt : startsAt
  const expiresAt = addDays(base, days)
  const row = {
    id: `ent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId: uid,
    entitlementType: type,
    startsAt,
    expiresAt,
    pinQuotaRemaining: pinQuota,
    source,
    sourceRefId: sourceRefId || null,
    createdAt: nowIso(),
  }
  wmDB.userEntitlements.push(row)
  return row
}

function grantBadge(userId, badgeId) {
  ensureGrowthTables()
  const uid = String(userId)
  const exists = wmDB.userBadges.find((b) => b.userId === uid && b.badgeId === badgeId)
  if (exists) return exists
  const row = {
    id: `bdg_${Date.now()}`,
    userId: uid,
    badgeId,
    grantedAt: nowIso(),
    visible: true,
  }
  wmDB.userBadges.push(row)
  return row
}

function getActiveEntitlement(userId) {
  ensureGrowthTables()
  const uid = String(userId)
  const now = new Date()
  const active = wmDB.userEntitlements
    .filter((e) => e.userId === uid && new Date(e.expiresAt) > now)
    .sort((a, b) => new Date(b.expiresAt) - new Date(a.expiresAt))
  if (!active.length) return null
  const pinQuota = active.reduce((s, e) => s + (e.pinQuotaRemaining || 0), 0)
  const top = active[0]
  return {
    active: true,
    tier: top.entitlementType.includes('lite') ? 'lite' : 'standard',
    expiresAt: top.expiresAt,
    pinQuotaRemaining: pinQuota,
  }
}

function getUserBadges(userId) {
  ensureGrowthTables()
  return wmDB.userBadges.filter((b) => b.userId === String(userId) && b.visible !== false)
}

/** 有效动作触发：加群或报名 */
export function mockOnQualifiedAction(action) {
  ensureGrowthTables()
  const inviteeId = String(wmDB.profile.userId)
  const binding = wmDB.referralBindings.find(
    (b) => b.inviteeId === inviteeId && b.status === 'pending',
  )
  if (!binding) return
  const created = new Date(binding.createdAt)
  const deadline = new Date(created.getTime() + 7 * 24 * 3600 * 1000)
  if (new Date() > deadline) {
    binding.status = 'expired'
    return
  }
  binding.status = 'qualified'
  binding.qualifiedAction = action
  binding.qualifiedAt = nowIso()
  grantEntitlement(inviteeId, 'premium_lite_3d', 'referral', binding.id)
  grantBadge(inviteeId, 'newcomer')
  const tp = getTrustProfile(inviteeId)
  tp.trustScore = Math.min(1000, tp.trustScore + 20)
  syncTrustLevel(inviteeId)
}

export function mockBindReferral(code) {
  ensureGrowthTables()
  const inviteeId = String(wmDB.profile.userId)
  const existing = wmDB.referralBindings.find((b) => b.inviteeId === inviteeId)
  if (existing) {
    return { ok: false, reason: 'already_bound', binding: existing }
  }
  const ref = findReferralByCode(code)
  if (!ref) return { ok: false, reason: 'invalid_code' }
  if (ref.userId === inviteeId) return { ok: false, reason: 'self_invite' }
  const binding = {
    id: `rb_${Date.now()}`,
    inviterId: ref.userId,
    inviteeId,
    code: ref.code,
    status: 'pending',
    qualifiedAction: null,
    qualifiedAt: null,
    rewardGrantedAt: null,
    createdAt: nowIso(),
  }
  wmDB.referralBindings.push(binding)
  wmDB.profile.acquisitionSource = `referral:${ref.code}`
  return { ok: true, binding }
}

export function mockGetReferral() {
  ensureGrowthTables()
  const uid = String(wmDB.profile.userId)
  const ref = getOrCreateReferralCode(uid)
  const qualified = countQualifiedReferrals(uid)
  const pending = wmDB.referralBindings.filter(
    (b) => b.inviterId === uid && b.status === 'pending',
  ).length
  const tier = nextTierProgress(qualified)
  const tp = syncTrustLevel(uid)
  const records = wmDB.referralBindings.filter((b) => b.inviterId === uid)
    .slice(-20)
    .reverse()
    .map((b) => {
      const u = wmDB.users?.[b.inviteeId]
      return {
        inviteeNickname: maskNickname(u?.nickname || '新用户'),
        status: b.status,
        qualifiedAction: b.qualifiedAction,
        createdAt: b.createdAt,
        qualifiedAt: b.qualifiedAt,
      }
    })
  return {
    code: ref.code,
    sharePath: `/pages/entry/entry?inv=${ref.code}`,
    qualifiedCount: qualified,
    pendingCount: pending,
    photoVerified: tp.photoVerified,
    nextTier: tier.nextTier,
    nextTierProgress: tier.progress,
    tiers: REFERRAL_TIERS,
    records,
  }
}

export function mockGetPremium() {
  ensureGrowthTables()
  const uid = String(wmDB.profile.userId)
  const ent = getActiveEntitlement(uid)
  const badges = getUserBadges(uid).map((b) => b.badgeId)
  if (!ent) {
    return { enabled: false, sku: [], entitlement: { active: false, badges } }
  }
  return {
    enabled: true,
    sku: [],
    entitlement: { ...ent, badges },
  }
}

export function mockGetEntitlements() {
  ensureGrowthTables()
  const uid = String(wmDB.profile.userId)
  return wmDB.userEntitlements
    .filter((e) => e.userId === uid)
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((e) => ({
      id: e.id,
      entitlementType: e.entitlementType,
      startsAt: e.startsAt,
      expiresAt: e.expiresAt,
      pinQuotaRemaining: e.pinQuotaRemaining,
      source: e.source,
    }))
}

export function mockPinActivity(activityId) {
  ensureGrowthTables()
  const uid = String(wmDB.profile.userId)
  const ent = getActiveEntitlement(uid)
  if (!ent || ent.pinQuotaRemaining < 1) {
    throw new Error('暂无可用置顶次数')
  }
  const act = wmDB.activities.find((a) => a.activityId === String(activityId))
  if (!act || act.organizer?.userId !== uid) throw new Error('只能置顶自己组织的活动')
  const row = wmDB.userEntitlements.find(
    (e) => e.userId === uid && e.pinQuotaRemaining > 0 && new Date(e.expiresAt) > new Date(),
  )
  if (row) row.pinQuotaRemaining -= 1
  wmDB.activityExposureBoosts.push({
    id: `boost_${Date.now()}`,
    activityId: String(activityId),
    userId: uid,
    boostType: 'pin',
    weight: 100,
    startsAt: nowIso(),
    endsAt: addDays(nowIso(), 1),
  })
  return { activityId: String(activityId), pinnedUntil: addDays(nowIso(), 1) }
}

function parseActivityStart(activity) {
  return new Date(activity.startAt)
}

export function mockGetCheckinWindow(activity) {
  const start = parseActivityStart(activity)
  const endAt = activity.endAt ? new Date(activity.endAt) : null
  const windowStart = new Date(start.getTime() + 2 * 3600 * 1000)
  let windowEnd = endAt
    ? new Date(Math.min(endAt.getTime() + 24 * 3600 * 1000, start.getTime() + 72 * 3600 * 1000))
    : new Date(start.getTime() + 48 * 3600 * 1000)
  const now = new Date()
  return {
    open: now >= windowStart && now <= windowEnd,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
  }
}

export function mockGetPendingCheckins() {
  ensureGrowthTables()
  const uid = String(wmDB.profile.userId)
  return wmDB.activities
    .filter(
      (a) =>
        (a.activityKind || 'event') === 'event' &&
        a.myEnrollment?.status === 'joined' &&
        a.activityStatus !== 'cancelled',
    )
    .map((a) => {
      const win = mockGetCheckinWindow(a)
      const checked = wmDB.activityCheckins.some(
        (c) => c.activityId === a.activityId && c.userId === uid,
      )
      return {
        activityId: a.activityId,
        title: a.title,
        startAt: a.startAt,
        locationName: a.locationName,
        checkinOpen: win.open,
        checkedIn: checked,
        windowEnd: win.windowEnd,
      }
    })
    .filter((x) => x.checkinOpen && !x.checkedIn)
}

export function mockCheckin(activityId, photoUrl) {
  ensureGrowthTables()
  const act = wmDB.activities.find((a) => a.activityId === String(activityId))
  if (!act) throw new Error('活动不存在')
  if ((act.activityKind || 'event') !== 'event') throw new Error('城市大群不支持打卡')
  const win = mockGetCheckinWindow(act)
  if (!win.open) throw new Error('当前不在打卡时间窗口内')
  const uid = String(wmDB.profile.userId)
  const exists = wmDB.activityCheckins.find(
    (c) => c.activityId === String(activityId) && c.userId === uid,
  )
  if (exists) return exists
  const row = {
    activityId: String(activityId),
    userId: uid,
    checkedInAt: nowIso(),
    photoUrl: photoUrl || null,
  }
  wmDB.activityCheckins.push(row)
  return row
}

export function mockGetReviewCandidates(activityId) {
  ensureGrowthTables()
  const uid = String(wmDB.profile.userId)
  const checkedUserIds = wmDB.activityCheckins
    .filter((c) => c.activityId === String(activityId))
    .map((c) => c.userId)
  if (!checkedUserIds.includes(uid)) throw new Error('请先完成到场打卡')
  return checkedUserIds
    .filter((id) => id !== uid)
    .filter((id) => {
      return !wmDB.activityMeetReviews.some(
        (r) =>
          r.activityId === String(activityId) &&
          r.fromUserId === uid &&
          r.toUserId === id,
      )
    })
    .map((id) => {
      const u = wmDB.users?.[id] || { nickname: '参与者', avatarUrl: null }
      return { userId: id, nickname: u.nickname, avatarUrl: u.avatarUrl }
    })
}

export function mockSubmitReview(activityId, payload) {
  ensureGrowthTables()
  const uid = String(wmDB.profile.userId)
  const toUserId = String(payload.toUserId)
  const exists = wmDB.activityMeetReviews.some(
    (r) =>
      r.activityId === String(activityId) &&
      r.fromUserId === uid &&
      r.toUserId === toUserId,
  )
  if (exists) throw new Error('已评价过该用户')
  const row = {
    activityId: String(activityId),
    fromUserId: uid,
    toUserId,
    met: !!payload.met,
    tags: (payload.tags || []).slice(0, 3),
    comment: String(payload.comment || '').slice(0, 50),
    createdAt: nowIso(),
  }
  wmDB.activityMeetReviews.push(row)
  mockProcessSuccessfulMeet(activityId, uid, toUserId)
  return row
}

function mockProcessSuccessfulMeet(activityId, userA, userB) {
  for (const [a, b] of [
    [userA, userB],
    [userB, userA],
  ]) {
    const revAB = wmDB.activityMeetReviews.find(
      (r) => r.activityId === activityId && r.fromUserId === a && r.toUserId === b,
    )
    if (!revAB || !revAB.met) continue
    const checkA = wmDB.activityCheckins.some(
      (c) => c.activityId === activityId && c.userId === a,
    )
    const checkB = wmDB.activityCheckins.some(
      (c) => c.activityId === activityId && c.userId === b,
    )
    if (!checkA || !checkB) continue
    ;[a, b].forEach((uid) => {
      const tp = getTrustProfile(uid)
      const prev = tp.meetCount
      tp.meetCount += 1
      tp.trustScore = Math.min(1000, tp.trustScore + 30)
      syncTrustLevel(uid)
      if (prev === 0) {
        grantBadge(uid, 'meet_first')
        grantEntitlement(uid, 'premium_std_7d', 'meet', activityId)
      } else if (tp.meetCount === 3) {
        grantEntitlement(uid, 'premium_std_7d', 'meet', activityId)
      } else if (tp.meetCount === 5) {
        grantBadge(uid, 'meet_regular')
      }
    })
  }
}

export function mockGetMeetHistory() {
  ensureGrowthTables()
  const uid = String(wmDB.profile.userId)
  const activityIds = [
    ...new Set(
      wmDB.activityCheckins.filter((c) => c.userId === uid).map((c) => c.activityId),
    ),
  ]
  return activityIds.map((aid) => {
    const act = wmDB.activities.find((a) => a.activityId === aid)
    const checked = wmDB.activityCheckins.some(
      (c) => c.activityId === aid && c.userId === uid,
    )
    const reviewsDone = wmDB.activityMeetReviews.filter(
      (r) => r.activityId === aid && r.fromUserId === uid,
    ).length
    const others = wmDB.activityCheckins.filter(
      (c) => c.activityId === aid && c.userId !== uid,
    ).length
    const success =
      checked &&
      reviewsDone >= others &&
      wmDB.activityMeetReviews.some(
        (r) => r.activityId === aid && r.fromUserId === uid && r.met,
      )
    return {
      activityId: aid,
      title: act?.title || '活动',
      startAt: act?.startAt,
      success,
      checkedIn: checked,
    }
  })
}

export function mockGetTrust() {
  ensureGrowthTables()
  const uid = String(wmDB.profile.userId)
  const tp = syncTrustLevel(uid)
  const p = wmDB.profile
  const photo = wmDB.photoVerifications.find((v) => v.userId === uid)
  const badges = getUserBadges(uid)
  const qualified = countQualifiedReferrals(uid)
  return {
    trustLevel: tp.trustLevel,
    trustScoreSummary: tp.trustScore >= 700 ? '良好' : tp.trustScore >= 400 ? '一般' : '偏低',
    meetCount: tp.meetCount,
    showMeetCount: tp.showMeetCount,
    photoVerified: tp.photoVerified,
    photoVerification: photo
      ? { status: photo.status, rejectReason: photo.rejectReason, submittedAt: photo.submittedAt }
      : { status: null },
    realnameVerification: {
      status: p.verification?.status || null,
      label: '实名认证（可选）',
    },
    profileComplete:
      !!p.avatarUrl && !!p.nickname && !!p.bio && (p.tags?.length || 0) >= 1,
    qualifiedReferrals: qualified,
    badges: badges.map((b) => ({
      badgeId: b.badgeId,
      grantedAt: b.grantedAt,
      visible: b.visible,
    })),
  }
}

export function mockSubmitPhotoVerification(selfieUrl) {
  ensureGrowthTables()
  const uid = String(wmDB.profile.userId)
  const row = {
    id: `pv_${Date.now()}`,
    userId: uid,
    selfieUrl,
    status: 'pending',
    rejectReason: null,
    reviewerId: null,
    submittedAt: nowIso(),
    reviewedAt: null,
  }
  wmDB.photoVerifications = wmDB.photoVerifications.filter((v) => v.userId !== uid)
  wmDB.photoVerifications.push(row)
  return { status: 'pending', submittedAt: row.submittedAt }
}

export function mockGetPhotoVerification() {
  ensureGrowthTables()
  const uid = String(wmDB.profile.userId)
  const row = wmDB.photoVerifications.find((v) => v.userId === uid)
  if (!row) return { status: null }
  return {
    status: row.status,
    rejectReason: row.rejectReason,
    submittedAt: row.submittedAt,
    reviewedAt: row.reviewedAt,
  }
}

/** 开发 mock：一键通过照片验证 */
export function mockApprovePhotoVerification() {
  ensureGrowthTables()
  const uid = String(wmDB.profile.userId)
  const row = wmDB.photoVerifications.find((v) => v.userId === uid)
  if (!row) return
  row.status = 'approved'
  row.reviewedAt = nowIso()
  const tp = getTrustProfile(uid)
  tp.photoVerified = true
  tp.trustScore = Math.min(1000, tp.trustScore + 150)
  syncTrustLevel(uid)
}

export function mockSafetyAck(ackType) {
  ensureGrowthTables()
  const uid = String(wmDB.profile.userId)
  const exists = wmDB.userSafetyAcks.find(
    (a) => a.userId === uid && a.ackType === ackType,
  )
  if (exists) return { ackType, ackAt: exists.ackAt }
  const row = { id: `ack_${Date.now()}`, userId: uid, ackType, ackAt: nowIso() }
  wmDB.userSafetyAcks.push(row)
  return row
}

export function mockHasSafetyAck(ackType) {
  ensureGrowthTables()
  const uid = String(wmDB.profile.userId)
  return wmDB.userSafetyAcks.some((a) => a.userId === uid && a.ackType === ackType)
}

export function mockGetSafetyGuide() {
  return { format: 'sections' }
}

export function mockGetOrganizerExposure() {
  ensureGrowthTables()
  const uid = String(wmDB.profile.userId)
  const qualified = countQualifiedReferrals(uid)
  const tier = nextTierProgress(qualified)
  return {
    qualifiedReferrals: qualified,
    nextTier: tier.nextTier,
    nextTierProgress: tier.progress,
    tiers: [3, 5, 10],
  }
}

export function mockEnhancePublicProfile(profile, userId) {
  ensureGrowthTables()
  const tp = syncTrustLevel(userId)
  const badges = getUserBadges(userId).map((b) => b.badgeId)
  const ent = getActiveEntitlement(userId)
  return {
    ...profile,
    trustLevel: tp.trustLevel,
    photoVerified: tp.photoVerified,
    meetCount: tp.meetCount,
    showMeetCount: tp.showMeetCount,
    badges,
    premiumBadge: !!ent?.active,
  }
}

export function mockSetBadgeVisibility(badgeId, visible) {
  ensureGrowthTables()
  const uid = String(wmDB.profile.userId)
  const row = wmDB.userBadges.find((b) => b.userId === uid && b.badgeId === badgeId)
  if (row) row.visible = !!visible
  return { badgeId, visible: !!visible }
}

export function mockSetShowMeetCount(show) {
  ensureGrowthTables()
  const tp = getTrustProfile(wmDB.profile.userId)
  tp.showMeetCount = !!show
  return { showMeetCount: tp.showMeetCount }
}

function _parsePvId(verificationId) {
  const s = String(verificationId || '')
  return s.startsWith('pv_') ? s.slice(3) : s
}

export function mockAdminListPhotoVerifications(query = {}) {
  ensureGrowthTables()
  const status = query.status || 'pending'
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 20))
  const rows = wmDB.photoVerifications
    .filter((v) => v.status === status)
    .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))
  const total = rows.length
  const slice = rows.slice((page - 1) * pageSize, page * pageSize)
  const list = slice.map((v) => {
    const u = wmDB.users?.[v.userId] || wmDB.profile
    return {
      verificationId: v.id || `pv_${v.userId}`,
      userId: v.userId,
      nickname: u?.nickname || '用户',
      avatarUrl: u?.avatarUrl || null,
      selfieUrl: v.selfieUrl,
      status: v.status,
      submittedAt: v.submittedAt,
    }
  })
  return { list, total, page, pageSize }
}

export function mockAdminApprovePhotoVerification(verificationId) {
  ensureGrowthTables()
  const vid = _parsePvId(verificationId)
  const row = wmDB.photoVerifications.find(
    (v) => String(v.id) === String(vid) || String(v.id) === String(verificationId),
  )
  if (!row || row.status !== 'pending') throw new Error('记录不存在或已审核')
  row.status = 'approved'
  row.reviewedAt = nowIso()
  const tp = getTrustProfile(row.userId)
  tp.photoVerified = true
  tp.trustScore = Math.min(1000, tp.trustScore + 150)
  syncTrustLevel(row.userId)
  return {
    verificationId: row.id || `pv_${row.userId}`,
    userId: row.userId,
    status: 'approved',
  }
}

export function mockAdminRejectPhotoVerification(verificationId, reason) {
  ensureGrowthTables()
  const vid = _parsePvId(verificationId)
  const row = wmDB.photoVerifications.find(
    (v) => String(v.id) === String(vid) || String(v.id) === String(verificationId),
  )
  if (!row || row.status !== 'pending') throw new Error('记录不存在或已审核')
  row.status = 'rejected'
  row.rejectReason = String(reason || '请重新拍摄').slice(0, 256)
  row.reviewedAt = nowIso()
  return {
    verificationId: row.id || `pv_${row.userId}`,
    userId: row.userId,
    status: 'rejected',
  }
}
