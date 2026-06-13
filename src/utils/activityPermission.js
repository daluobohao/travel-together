import { isSameUserId } from '@/utils/friendRelationship'

/** 当前用户是否为活动发起人（优先用服务端 isOrganizer，兼容旧接口） */
export function isActivityOrganizer(detail, meUserId) {
  if (!detail) return false
  if (typeof detail.isOrganizer === 'boolean') return detail.isOrganizer
  return isSameUserId(meUserId, detail.organizer?.userId)
}
