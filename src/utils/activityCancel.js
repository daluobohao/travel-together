import { cancelActivity } from '@/api'
import { apiActivityPathId } from '@/utils/activityId'

/**
 * 发起人取消活动：二次确认 + 可选原因。
 * @returns {Promise<boolean>} 是否已成功取消
 */
export function confirmCancelActivity(activityId, { onSuccess } = {}) {
  const pathId = apiActivityPathId(activityId)
  if (!pathId) {
    uni.showToast({ title: '活动信息无效', icon: 'none' })
    return Promise.resolve(false)
  }
  return new Promise((resolve) => {
    uni.showModal({
      title: '取消活动',
      content: '确定取消此活动？已报名成员会在群聊收到通知，此操作不可撤销。',
      confirmText: '取消活动',
      confirmColor: '#dc2626',
      cancelText: '再想想',
      editable: true,
      placeholderText: '取消原因（选填）',
      success: async (res) => {
        if (!res.confirm) {
          resolve(false)
          return
        }
        try {
          const reason = String(res.content || '').trim()
          await cancelActivity(pathId, reason ? { reason } : {})
          uni.showToast({ title: '活动已取消', icon: 'success' })
          if (typeof onSuccess === 'function') onSuccess()
          resolve(true)
        } catch (e) {
          uni.showToast({ title: e?.message || '取消失败', icon: 'none' })
          resolve(false)
        }
      },
      fail: () => resolve(false),
    })
  })
}
