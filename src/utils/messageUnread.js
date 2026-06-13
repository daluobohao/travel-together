import { getDirectChats, getMyChats, getNotifications } from '@/api/wandermeet'
import { getAccessToken } from '@/api/config'
import {
  clearMessageUnreadSummary,
  getMessageUnreadState,
  publishTabUnreadFromLists,
  setMessageUnreadSummary,
  subscribeMessageUnread,
} from '@/utils/messageUnreadStore'

export {
  clearMessageUnreadSummary,
  getMessageUnreadState,
  publishTabUnreadFromLists,
  subscribeMessageUnread,
}

/** 与后端 ``/me/chats``、``/me/direct-chats`` 的 pageSize 上限一致 */
const CHAT_LIST_PAGE_SIZE = 50

let inflight = null

function sumUnreadFromList(list) {
  let n = 0
  ;(list || []).forEach((item) => {
    n += Number(item.unreadCount) || 0
  })
  return n
}

async function sumAllPagesUnread(fetchPage) {
  let total = 0
  let page = 1
  while (true) {
    const data = await fetchPage(page, CHAT_LIST_PAGE_SIZE)
    total += sumUnreadFromList(data?.list)
    const maxTotal = Number(data?.total) || 0
    const got = data?.list?.length || 0
    if (!got || page * CHAT_LIST_PAGE_SIZE >= maxTotal) break
    page += 1
  }
  return total
}

async function fetchUnreadFromChatLists() {
  const prev = getMessageUnreadState()
  let groupUnread = 0
  let dmUnread = 0
  let notifUnread = 0

  try {
    groupUnread = await sumAllPagesUnread((page, pageSize) => getMyChats({ page, pageSize }))
  } catch (_) {
    groupUnread = prev.chatUnread
  }

  try {
    dmUnread = await sumAllPagesUnread((page, pageSize) => getDirectChats({ page, pageSize }))
  } catch (_) {
    dmUnread = 0
  }

  try {
    const notifs = await getNotifications({ page: 1, pageSize: 1, read: 'unread' })
    notifUnread = Number(notifs?.total) || 0
  } catch (_) {
    notifUnread = prev.notifUnread
  }

  return {
    chatUnread: groupUnread + dmUnread,
    notifUnread,
  }
}

/** 拉取 Tab 栏未读汇总；未登录清零 */
export function refreshMessageUnreadSummary() {
  if (!getAccessToken()) {
    clearMessageUnreadSummary()
    return Promise.resolve(getMessageUnreadState())
  }
  if (inflight) return inflight
  inflight = fetchUnreadFromChatLists()
    .then((data) => {
      setMessageUnreadSummary({
        chatUnread: data?.chatUnread,
        notifUnread: data?.notifUnread,
      })
      return getMessageUnreadState()
    })
    .catch(() => getMessageUnreadState())
    .finally(() => {
      inflight = null
    })
  return inflight
}
