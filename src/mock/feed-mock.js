/**
 * 同城动态 Mock
 */
import { wmDB } from './wandermeet-db'

function nowIso() {
  return new Date().toISOString()
}

function ensureFeed() {
  if (!wmDB.feedPosts) wmDB.feedPosts = []
  if (!wmDB.feedLikes) wmDB.feedLikes = []
  if (!wmDB.feedComments) wmDB.feedComments = []
  if (!wmDB.userFollows) wmDB.userFollows = []
}

export function mockGetFeedTopics() {
  return {
    topics: [
      { id: 'weekend', label: '周末出门' },
      { id: 'city_move', label: '换城市了' },
      { id: 'buddy', label: '找搭子' },
      { id: 'activity_recap', label: '活动复盘' },
    ],
  }
}

function mockAuthor(userId) {
  const uid = String(userId)
  const u = wmDB.users?.[uid] || wmDB.profile
  return {
    userId: uid,
    nickname: u?.nickname || '用户',
    avatarUrl: u?.avatarUrl || null,
    trustLevel: 'basic',
    photoVerified: false,
  }
}

export function mockListFeed(query = {}) {
  ensureFeed()
  const uid = String(wmDB.profile.userId)
  let list = wmDB.feedPosts.filter((p) => p.status === 'published' && p.postKind === 'city')
  if (query.scope === 'following') {
    const followees = wmDB.userFollows
      .filter((f) => f.followerId === uid)
      .map((f) => f.followeeId)
    list = list.filter((p) => followees.includes(p.userId))
  } else if (query.cityCode) {
    list = list.filter((p) => p.cityCode === query.cityCode)
  }
  if (query.topic) {
    list = list.filter((p) => (p.topicTags || []).includes(query.topic))
  }
  list = list.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const page = Number(query.page) || 1
  const pageSize = Number(query.pageSize) || 20
  const start = (page - 1) * pageSize
  const slice = list.slice(start, start + pageSize)
  return {
    list: slice.map((p) => ({
      ...p,
      likedByMe: wmDB.feedLikes.some((l) => l.postId === p.postId && l.userId === uid),
      author: mockAuthor(p.userId),
    })),
    total: list.length,
    page,
    pageSize,
  }
}

export function mockCreateFeedPost(payload) {
  ensureFeed()
  const uid = String(wmDB.profile.userId)
  const post = {
    postId: `post_${Date.now()}`,
    postKind: payload.postKind || 'city',
    cityCode: payload.cityCode || '110000',
    activityId: payload.activityId || null,
    content: payload.content || '',
    images: payload.images || [],
    locationName: payload.locationName || null,
    lat: payload.lat != null ? Number(payload.lat) : null,
    lng: payload.lng != null ? Number(payload.lng) : null,
    topicTags: payload.topicTags || [],
    likeCount: 0,
    commentCount: 0,
    userId: uid,
    status: 'published',
    createdAt: nowIso(),
  }
  wmDB.feedPosts.unshift(post)
  return { postId: post.postId }
}

export function mockListActivityPosts(activityId, query = {}) {
  ensureFeed()
  const uid = String(wmDB.profile.userId)
  const list = wmDB.feedPosts
    .filter((p) => p.activityId === String(activityId) && p.postKind === 'activity')
    .map((p) => ({
      ...p,
      likedByMe: wmDB.feedLikes.some((l) => l.postId === p.postId && l.userId === uid),
      author: mockAuthor(p.userId),
    }))
  return { list, total: list.length, page: 1, pageSize: 20 }
}

export function mockDeleteFeedPost(postId) {
  ensureFeed()
  const uid = String(wmDB.profile.userId)
  const post = wmDB.feedPosts.find((p) => p.postId === postId)
  if (!post || post.status === 'deleted') throw new Error('动态不存在')
  if (String(post.userId) !== uid) throw new Error('无权删除')
  post.status = 'deleted'
  return { ok: true }
}

export function mockGetFeedPost(postId) {
  ensureFeed()
  const uid = String(wmDB.profile.userId)
  const post = wmDB.feedPosts.find((p) => p.postId === postId && p.status === 'published')
  if (!post) return null
  return {
    ...post,
    likedByMe: wmDB.feedLikes.some((l) => l.postId === post.postId && l.userId === uid),
    author: mockAuthor(post.userId),
  }
}

export function mockToggleLike(postId) {
  ensureFeed()
  const uid = String(wmDB.profile.userId)
  const post = wmDB.feedPosts.find((p) => p.postId === postId)
  if (!post) throw new Error('动态不存在')
  const idx = wmDB.feedLikes.findIndex((l) => l.postId === postId && l.userId === uid)
  if (idx >= 0) {
    wmDB.feedLikes.splice(idx, 1)
    post.likeCount = Math.max(0, (post.likeCount || 0) - 1)
    return { postId, liked: false, likeCount: post.likeCount }
  }
  wmDB.feedLikes.push({ postId, userId: uid })
  post.likeCount = (post.likeCount || 0) + 1
  return { postId, liked: true, likeCount: post.likeCount }
}

export function mockFollowUser(userId, following) {
  ensureFeed()
  const uid = String(wmDB.profile.userId)
  const tid = String(userId).replace(/^u_/, 'u_')
  wmDB.userFollows = wmDB.userFollows.filter(
    (f) => !(f.followerId === uid && f.followeeId === tid),
  )
  if (following) {
    wmDB.userFollows.push({ followerId: uid, followeeId: tid })
  }
  return { userId: tid, following: !!following }
}

export function mockGetFollowStatus(userId) {
  ensureFeed()
  const uid = String(wmDB.profile.userId)
  const tid = String(userId)
  const following = wmDB.userFollows.some(
    (f) => f.followerId === uid && f.followeeId === tid,
  )
  return { userId: tid, following }
}

export function mockListUserPosts(userId, query = {}) {
  ensureFeed()
  const uid = String(wmDB.profile.userId)
  const raw = String(userId || '')
  const target = raw.startsWith('u_') ? raw : `u_${raw}`
  let list = wmDB.feedPosts.filter(
    (p) => p.status === 'published' && String(p.userId) === target,
  )
  list = list.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const page = Number(query.page) || 1
  const pageSize = Number(query.pageSize) || 20
  const start = (page - 1) * pageSize
  const slice = list.slice(start, start + pageSize)
  return {
    list: slice.map((p) => ({
      ...p,
      likedByMe: wmDB.feedLikes.some((l) => l.postId === p.postId && l.userId === uid),
      author: mockAuthor(p.userId),
    })),
    total: list.length,
    page,
    pageSize,
  }
}

export function mockListFeedComments(postId, query = {}) {
  ensureFeed()
  const uid = String(wmDB.profile.userId)
  const list = (wmDB.feedComments || [])
    .filter((c) => c.postId === postId)
    .map((c) => ({
      ...c,
      author: mockAuthor(c.userId),
    }))
  const page = Number(query.page) || 1
  const pageSize = Number(query.pageSize) || 50
  const start = (page - 1) * pageSize
  const slice = list.slice(start, start + pageSize)
  return { list: slice, total: list.length, page, pageSize }
}

export function mockCreateFeedComment(postId, payload = {}) {
  ensureFeed()
  const uid = String(wmDB.profile.userId)
  const post = wmDB.feedPosts.find((p) => p.postId === postId)
  if (!post) throw new Error('动态不存在')
  const row = {
    commentId: `pcom_${Date.now()}`,
    postId,
    userId: uid,
    content: payload.content || '',
    createdAt: nowIso(),
  }
  wmDB.feedComments.push(row)
  post.commentCount = (post.commentCount || 0) + 1
  return { commentId: row.commentId }
}
