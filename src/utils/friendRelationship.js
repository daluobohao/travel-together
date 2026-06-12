import { blockUser, removeDirectChatFriend } from '@/api'

export function normalizeUserId(userId) {
  const raw = String(userId || '').trim()
  if (!raw) return ''
  return raw.startsWith('u_') ? raw : `u_${raw}`
}

export function confirmRemoveFriend({ threadId, nickname, onSuccess }) {
  uni.showModal({
    title: '删除好友',
    content: `确定将「${nickname || '该用户'}」从好友列表移除？对方不会收到通知，聊天记录仍保留，之后可再次申请私聊。`,
    confirmText: '删除',
    confirmColor: '#ef4444',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await removeDirectChatFriend(threadId)
        uni.showToast({ title: '已删除好友', icon: 'success' })
        onSuccess?.()
      } catch (e) {
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
      }
    },
  })
}

export function confirmBlockUser({ userId, nickname, onSuccess }) {
  uni.showModal({
    title: '拉黑用户',
    content: `确定拉黑「${nickname || '该用户'}」？对方将无法给你发私聊，也不会出现在你的好友列表中。`,
    confirmText: '拉黑',
    confirmColor: '#ef4444',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await blockUser({ blockedUserId: normalizeUserId(userId) })
        uni.showToast({ title: '已拉黑', icon: 'success' })
        onSuccess?.()
      } catch (e) {
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
      }
    },
  })
}

export function showFriendManageSheet({ threadId, userId, nickname, onRemoved, onBlocked }) {
  uni.showActionSheet({
    itemList: ['删除好友', '拉黑用户'],
    success: (res) => {
      if (res.tapIndex === 0) {
        confirmRemoveFriend({ threadId, nickname, onSuccess: onRemoved })
      } else if (res.tapIndex === 1) {
        confirmBlockUser({ userId, nickname, onSuccess: onBlocked })
      }
    },
  })
}
