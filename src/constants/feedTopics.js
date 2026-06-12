/** 同城动态预设话题（与后端 TOPIC_META 对齐；离线/ Mock 兜底） */
export const FEED_TOPIC_GROUPS = ['出行状态', '找伴意图', '本地生活', '活动相关']

export const FEED_TOPICS = [
  { id: 'weekend', label: '周末出门', group: '出行状态', sort: 1 },
  { id: 'city_move', label: '换城市了', group: '出行状态', sort: 2 },
  { id: 'new_in_town', label: '刚落地', group: '出行状态', sort: 3 },
  { id: 'buddy', label: '找搭子', group: '找伴意图', sort: 4 },
  { id: 'coffee_chat', label: '约咖啡', group: '找伴意图', sort: 5 },
  { id: 'sport', label: '一起运动', group: '找伴意图', sort: 6 },
  { id: 'food', label: '一起吃饭', group: '找伴意图', sort: 7 },
  { id: 'explore', label: '本地探索', group: '本地生活', sort: 8 },
  { id: 'remote_work', label: '远程办公', group: '本地生活', sort: 9 },
  { id: 'tips', label: '避坑分享', group: '本地生活', sort: 10 },
  { id: 'activity_recap', label: '活动复盘', group: '活动相关', sort: 11 },
  { id: 'looking_for_activity', label: '求活动推荐', group: '活动相关', sort: 12 },
]

const TOPIC_LABEL_MAP = Object.fromEntries(FEED_TOPICS.map((t) => [t.id, t.label]))

export function feedTopicLabel(id) {
  return TOPIC_LABEL_MAP[id] || id
}

export function normalizeFeedTopics(rawList) {
  const list = Array.isArray(rawList) ? rawList : []
  if (!list.length) return FEED_TOPICS.slice()
  return list
    .map((t, i) => ({
      id: String(t.id || ''),
      label: String(t.label || t.id || ''),
      group: String(t.group || ''),
      sort: Number(t.sort) || i + 1,
    }))
    .filter((t) => t.id)
    .sort((a, b) => a.sort - b.sort)
}

export function groupFeedTopics(topics) {
  const rows = normalizeFeedTopics(topics)
  const map = new Map(FEED_TOPIC_GROUPS.map((g) => [g, []]))
  for (const t of rows) {
    const g = t.group && map.has(t.group) ? t.group : FEED_TOPIC_GROUPS[0]
    if (!map.has(g)) map.set(g, [])
    map.get(g).push(t)
  }
  return FEED_TOPIC_GROUPS.filter((g) => map.get(g)?.length).map((group) => ({
    group,
    topics: map.get(group),
  }))
}
