import { getDirectChats, getMyChats, getNotifications } from '@/api/wandermeet'
import { getAccessToken } from '@/api/config'

const EMPTY = Object.freeze({ chatUnread: 0, notifUnread: 0 })
/** 与后端 ``/me/chats``、``/me/direct-chats`` 的 pageSize 上限一致 */
const CHAT_LIST_PAGE_SIZE = 50

let state = { ...EMPTY }
const listeners = new Set()
let inflight = null

export function getMessageUnreadState() {
  try {
    const app = getApp()
    const g = app?.globalData?.wmMessageUnread
    if (g && typeof g.chatUnread === 'number') {
      return { chatUnread: g.chatUnread, notifUnread: Number(g.notifUnread) || 0 }
    }
  } catch (_) {
    /* ignore */
  }
  return { ...state }
}

export function subscribeMessageUnread(listener) {
  if (typeof listener === 'function') listeners.add(listener)
  return () => listeners.delete(listener)
}

function notifyListeners() {
  const snap = getMessageUnreadState()
  listeners.forEach((fn) => {
    try {
      fn(snap)
    } catch (_) {
      /* ignore */
    }
  })
}

function setState(next) {
  state = {
    chatUnread: Math.max(0, Number(next.chatUnread) || 0),
    notifUnread: Math.max(0, Number(next.notifUnread) || 0),
  }
  try {
    const app = getApp()
    if (app) {
      if (!app.globalData) app.globalData = {}
      app.globalData.wmMessageUnread = { ...state }
    }
  } catch (_) {
    /* ignore */
  }
  notifyListeners()
}

export function clearMessageUnreadSummary() {
  setState(EMPTY)
}

/** 消息页已拉到的列表先写入 Tab 角标（首屏即时展示，与列表一致） */
export function publishTabUnreadFromLists(groupChats = [], privateChats = [], systemNotifs = []) {
  let chatUnread = 0
  ;(groupChats || []).forEach((x) => {
    chatUnread += Number(x.unread ?? x.unreadCount) || 0
  })
  ;(privateChats || []).forEach((x) => {
    chatUnread += Number(x.unread ?? x.unreadCount) || 0
  })
  const notifUnread = (systemNotifs || []).filter((x) => !x.read && !x.readAt).length
  setState({ chatUnread, notifUnread })
}

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
  let groupUnread = 0
  let dmUnread = 0
  let notifUnread = 0

  try {
    groupUnread = await sumAllPagesUnread((page, pageSize) => getMyChats({ page, pageSize }))
  } catch (_) {
    /* 群聊汇总失败时保留已有角标 */
    groupUnread = state.chatUnread
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
    notifUnread = state.notifUnread
  }

  return {
    chatUnread: groupUnread + dmUnread,
    notifUnread,
  }
}

async function fetchUnreadSummary() {
  return fetchUnreadFromChatLists()
}

/** 拉取 Tab 栏未读汇总；未登录清零 */
export function refreshMessageUnreadSummary() {
  if (!getAccessToken()) {
    clearMessageUnreadSummary()
    return Promise.resolve(getMessageUnreadState())
  }
  if (inflight) return inflight
  inflight = fetchUnreadSummary()
    .then((data) => {
      setState({
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
