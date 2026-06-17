/** 同城动态分享：好友转发 + 朋友圈（落地 feed-detail） */
import {
  SHARE_SRC_FRIEND,
  SHARE_SRC_TIMELINE,
  appendShareSrcToPath,
  appendShareSrcToQuery,
} from '@/utils/acquisitionSource'
import { displayAvatarUrl } from '@/utils/avatarDisplay'

export const FEED_SHARE_TITLE_FALLBACK = '旅聚 · 同城动态'

const TITLE_MAX = 32
const EXCERPT_MAX = 18

export function isCityFeedPost(post) {
  return (post?.postKind || 'city') === 'city'
}

export function normalizeFeedPostId(raw) {
  const s = String(raw || '').trim()
  if (!s) return ''
  return s.startsWith('post_') ? s : `post_${s.replace(/^post_/i, '')}`
}

export function buildFeedDetailPath(postId) {
  const id = encodeURIComponent(normalizeFeedPostId(postId))
  return `/pages/feed-detail/feed-detail?postId=${id}`
}

/** 分享标题：作者昵称 + 正文摘要（朋友圈/好友卡片主文案） */
export function buildFeedShareTitle(post) {
  const nickname = String(post?.author?.nickname || '').trim() || '旅人'
  const content = String(post?.content || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!content) return FEED_SHARE_TITLE_FALLBACK
  const excerpt = content.length > EXCERPT_MAX ? `${content.slice(0, EXCERPT_MAX)}…` : content
  const title = `${nickname}：${excerpt}`
  return title.length > TITLE_MAX ? `${title.slice(0, TITLE_MAX - 1)}…` : title
}

function buildFeedShareImageUrl(post) {
  const first = (post?.images || [])[0]
  return first ? displayAvatarUrl(first) || first : ''
}

export function buildFeedShareMessage(post) {
  if (!post?.postId || !isCityFeedPost(post)) {
    return {
      title: FEED_SHARE_TITLE_FALLBACK,
      path: appendShareSrcToPath('/pages/discover/discover', SHARE_SRC_FRIEND),
    }
  }
  const title = buildFeedShareTitle(post)
  const path = appendShareSrcToPath(buildFeedDetailPath(post.postId), SHARE_SRC_FRIEND)
  const imageUrl = buildFeedShareImageUrl(post)
  return imageUrl ? { title, path, imageUrl } : { title, path }
}

export function buildFeedTimelineShare(post) {
  if (!post?.postId || !isCityFeedPost(post)) {
    return {
      title: FEED_SHARE_TITLE_FALLBACK,
      query: appendShareSrcToQuery('', SHARE_SRC_TIMELINE),
    }
  }
  const title = buildFeedShareTitle(post)
  const baseQuery = `postId=${encodeURIComponent(normalizeFeedPostId(post.postId))}`
  const query = appendShareSrcToQuery(baseQuery, SHARE_SRC_TIMELINE)
  const imageUrl = buildFeedShareImageUrl(post)
  return imageUrl ? { title, query, imageUrl } : { title, query }
}

export function buildFeedShareClipboardText(post) {
  if (!post?.postId || !isCityFeedPost(post)) return ''
  const title = buildFeedShareTitle(post)
  const path = appendShareSrcToPath(buildFeedDetailPath(post.postId), SHARE_SRC_FRIEND)
  return [
    `【去旅聚】${title}`,
    '在微信中打开「去旅聚」小程序：可点右上角「···」转发；或把下方页面路径发给朋友。',
    `页面路径：${path}`,
  ].join('\n')
}

export function promptFeedTimelineShare() {
  uni.showToast({
    title: '请点击右上角 ··· → 分享到朋友圈',
    icon: 'none',
    duration: 2600,
  })
}

/** 页面 onShareAppMessage：优先单条动态，否则走 fallback */
export function resolveFeedShareAppMessage(page, fallback) {
  const post = page?.pendingSharePost
  if (post && isCityFeedPost(post)) return buildFeedShareMessage(post)
  return typeof fallback === 'function' ? fallback() : fallback
}

/** 页面 onShareTimeline：优先单条动态，否则走 fallback */
export function resolveFeedShareTimeline(page, fallback) {
  const post = page?.pendingSharePost
  if (post && isCityFeedPost(post)) return buildFeedTimelineShare(post)
  return typeof fallback === 'function' ? fallback() : fallback
}
