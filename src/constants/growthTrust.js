/** PRD 裂变与信任 — 前端常量与展示文案 */

export const REFERRAL_TIERS = [
  { count: 1, label: '权益包 7 天（标准版）' },
  { count: 3, label: '权益包 15 天 + 徽章「引路人」' },
  { count: 5, label: '权益包 15 天 + 活动置顶 1 次' },
  { count: 10, label: '权益包 30 天 + 徽章「同城使者」' },
]

export const ORGANIZER_EXPOSURE_TIERS = [
  { count: 3, label: '下一场活动 24h 列表加权' },
  { count: 5, label: '48h 加权 + 发现页推荐槽' },
  { count: 10, label: '7 天内前 2 场各 48h 加权' },
]

export const TRUST_LEVELS = [
  { key: 'basic', label: '已注册', min: 1 },
  { key: 'profile_complete', label: '资料完整', min: 2 },
  { key: 'photo_verified', label: '照片已验证', min: 3 },
  { key: 'realname_verified', label: '实名已验证', min: 4 },
]

export const BADGE_META = {
  referrer_guide: { name: '引路人', desc: '有效邀请 ≥3' },
  referrer_ambassador: { name: '同城使者', desc: '有效邀请 ≥10' },
  meet_first: { name: '见过面', desc: '首次成功见面互评' },
  meet_regular: { name: '常出门', desc: '成功见面 ≥5' },
  newcomer: { name: '新人', desc: '受邀新用户礼包' },
}

export const MEET_REVIEW_TAGS = [
  { id: 'punctual', label: '准时' },
  { id: 'friendly', label: '友善' },
  { id: 'would_meet_again', label: '适合再约' },
  { id: 'would_not_meet_again', label: '不推荐再约' },
]

export const DEFAULT_INVITE_SHARE = {
  title: '来旅聚，加入同城大群',
  path: '/pages/entry/entry',
}

export const SAFETY_ENROLL_NOTICE = [
  '尽量在公共场所见面，首次避免私密场所。',
  '不要向陌生人私下转账或预付大额费用。',
  '告知亲友行程；感觉不适可退出并举报。',
]

export const SAFETY_GUIDE_SECTIONS = [
  {
    title: '见面地点怎么选',
    body: '优先地铁口、商场、连锁咖啡等人流较多的公共场所；首次见面避免私密场所或偏远地点。',
  },
  {
    title: '独行赴约前告知亲友',
    body: '把活动时间、地点、同行人数告诉可信赖的亲友；约定一个「平安报平安」的时间点。',
  },
  {
    title: '费用 AA 与防诈骗',
    body: '活动费用以现场 AA 为主；不要向陌生人预付大额费用或转账；遇到异常收费及时退出并举报。',
  },
  {
    title: '不适时如何举报/拉黑',
    body: '在活动详情或用户资料页可举报；私聊中遇到骚扰可拉黑。平台会处理违规账号。',
  },
  {
    title: '平台能力说明',
    body: '旅聚提供照片验证、实名认证（可选）、见面打卡与互评（不公开差评）、举报与拉黑等能力，帮助你更安心地同城社交。',
  },
]

export const FEED_TOPICS = [
  { id: 'weekend', label: '周末出门' },
  { id: 'city_move', label: '换城市了' },
  { id: 'buddy', label: '找搭子' },
  { id: 'activity_recap', label: '活动复盘' },
]

export function formatTrustLevelLabel(key) {
  const row = TRUST_LEVELS.find((x) => x.key === key)
  return row?.label || '已注册'
}

export function feedTopicLabel(id) {
  return FEED_TOPICS.find((t) => t.id === id)?.label || id
}
