const DM_NOTIFICATION_TYPES = new Set(['dm_request', 'dm_request_accepted'])

/** 是否为「系统通知」Tab 应展示的平台通知（排除私聊申请等） */
export function isPlatformNotificationType(type) {
  return !DM_NOTIFICATION_TYPES.has(String(type || '').trim())
}

export function filterPlatformNotifications(list) {
  return (list || []).filter((item) => isPlatformNotificationType(item?.type))
}
