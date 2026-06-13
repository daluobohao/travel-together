const EMPTY = Object.freeze({ chatUnread: 0, notifUnread: 0 })

let state = { ...EMPTY }
const listeners = new Set()

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

export function setMessageUnreadSummary(next) {
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
  setMessageUnreadSummary(EMPTY)
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
  setMessageUnreadSummary({ chatUnread, notifUnread })
}
