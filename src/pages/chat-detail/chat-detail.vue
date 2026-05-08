<template>
  <view class="page chat-detail">
    <view class="chat-detail__header">
      <view class="chat-detail__back" @click="goBack">
        <wm-icon name="chevronLeft" :size="34" color="#0f172a" />
      </view>
      <view class="chat-detail__title-wrap">
        <text class="chat-detail__title">{{ chat.name }}</text>
        <text class="chat-detail__sub">{{ chat.subtitle }}</text>
      </view>
      <view class="chat-detail__placeholder" />
    </view>

    <scroll-view class="chat-detail__messages" scroll-y :scroll-top="scrollTop" :scroll-with-animation="true">
      <view class="chat-detail__messages-inner">
        <view v-if="!messages.length" class="chat-detail__empty">
          <text>欢迎来到活动群聊</text>
        </view>
        <view
          v-for="msg in messages"
          :key="msg.id"
          class="msg-row"
          :class="msg.mine ? 'msg-row--mine' : 'msg-row--other'"
        >
          <view
            v-if="!msg.mine && msg.openProfile"
            class="msg-row__avatar"
            @click.stop="openUserPublic(msg)"
          >
            <text>{{ msg.avatarLetter }}</text>
          </view>
          <view class="msg" :class="msg.mine ? 'msg--mine' : 'msg--other'">
          <view class="msg__bubble" :class="{ 'msg__bubble--failed': msg.failed }">
            <text class="msg__sender" v-if="!msg.mine" @click.stop="openUserPublic(msg)">{{ msg.sender }}</text>
            <text class="msg__text">{{ msg.text }}</text>
            <view class="msg__meta">
              <text v-if="msg.pending" class="msg__status">发送中…</text>
              <text v-else-if="msg.failed" class="msg__status msg__status--failed">发送失败</text>
              <text class="msg__time">{{ msg.time }}</text>
            </view>
          </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <view class="chat-detail__composer">
      <input
        v-model="draft"
        class="chat-detail__input"
        placeholder="输入消息..."
        placeholder-class="chat-detail__input-placeholder"
        confirm-type="send"
        @confirm="sendMessage"
      />
      <view class="chat-detail__send" @click="sendMessage">
        <text>发送</text>
      </view>
    </view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import {
  API_BASE_URL,
  getAccessToken,
  getActivityDetail,
  getActivityMessages,
  getMe,
  markMyChatRead,
  sendActivityMessage,
} from '@/api'

const POLL_INTERVAL_MS = 4000
const DEFAULT_LIMIT = 50

function formatTime(iso) {
  try {
    const d = iso ? new Date(iso) : new Date()
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    return `${h}:${m}`
  } catch (e) {
    return '刚刚'
  }
}

function buildWsUrl(activityId) {
  try {
    const base = API_BASE_URL || ''
    const wsBase = base.replace(/^http/i, 'ws')
    return `${wsBase}/activities/${activityId}/ws`
  } catch (e) {
    return ''
  }
}

export default {
  components: { WmIcon },
  data() {
    return {
      chatId: '',
      chat: { name: '聊天', subtitle: '' },
      messages: [],
      messageIds: {}, // 去重用：{ [messageId]: true }
      lastCreatedAt: '',
      draft: '',
      scrollTop: 0,
      pollingTimer: null,
      pollingBusy: false,
      pollingPaused: false,
      socketTask: null,
      useWebSocket: false, // 切到 true 时优先走 WS，失败自动退回轮询
      currentUserId: '', // 当前登录用户的ID
    }
  },
  onLoad(query) {
    this.chatId = query?.id ? String(query.id) : '1'
    this.bootstrapGroup()
  },
  onShow() {
    this.pollingPaused = false
    // 回到前台先拉一次
    this.fetchIncremental().catch(() => {})
  },
  onHide() {
    this.pollingPaused = true
  },
  onUnload() {
    this.stopPolling()
    this.closeSocket()
  },
  beforeDestroy() {
    this.stopPolling()
    this.closeSocket()
  },
  beforeUnmount() {
    this.stopPolling()
    this.closeSocket()
  },
  methods: {
    async bootstrapGroup() {
      await this.loadCurrentUser()
      await this.loadGroup()
      try {
        await markMyChatRead(this.chatId)
      } catch (e) {
        console.warn('标记已读失败', e)
      }
      if (this.useWebSocket) {
        const ok = this.openSocket()
        if (!ok) this.startPolling()
      } else {
        this.startPolling()
      }
    },
    async loadCurrentUser() {
      try {
        const user = await getMe()
        this.currentUserId = user?.userId || ''
      } catch (e) {
        console.warn('获取当前用户信息失败', e)
      }
    },
    async loadGroup() {
      try {
        const [detail, msgData] = await Promise.all([
          getActivityDetail(this.chatId),
          getActivityMessages(this.chatId, { limit: DEFAULT_LIMIT }),
        ])
        this.chat = {
          name: detail?.title || '活动群聊',
          subtitle: `${Number(detail?.enrolledCount || 0)}/${Number(detail?.maxMembers || 0)} 成员`,
        }
        const rawList = msgData?.list || []
        this.messageIds = {}
        this.messages = rawList.map((m) => this.normalizeMessage(m)).filter(Boolean)
        this.updateLastCreatedAt(rawList)
        markMyChatRead(this.chatId).catch(() => {})
      } catch (e) {
        uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
      } finally {
        this.scrollToBottom()
      }
    },
    normalizeMessage(raw) {
      if (!raw) return null
      const id = raw.messageId || `local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      if (this.messageIds[id]) return null
      this.messageIds[id] = true
      const senderUserId = raw.sender?.userId
      const isMine = senderUserId === 'me' || (this.currentUserId && senderUserId === this.currentUserId)
      const openProfile =
        !isMine && senderUserId && senderUserId !== 'system'
      return {
        id,
        sender: raw.sender?.nickname || '用户',
        text: raw.text || '',
        time: formatTime(raw.createdAt),
        mine: isMine,
        createdAt: raw.createdAt,
        userId: senderUserId,
        openProfile,
        avatarLetter: String(raw.sender?.nickname || '?').slice(0, 1),
      }
    },
    openUserPublic(msg) {
      if (!msg?.userId || msg.userId === 'system') return
      uni.navigateTo({
        url:
          '/pages/user-public/user-public?userId=' +
          encodeURIComponent(msg.userId) +
          '&activityId=' +
          encodeURIComponent(this.chatId),
      })
    },
    updateLastCreatedAt(list) {
      if (!Array.isArray(list) || !list.length) return
      let latest = this.lastCreatedAt ? new Date(this.lastCreatedAt).getTime() : 0
      list.forEach((m) => {
        const t = new Date(m.createdAt).getTime()
        if (!Number.isNaN(t) && t > latest) latest = t
      })
      if (latest) this.lastCreatedAt = new Date(latest).toISOString()
    },
    startPolling() {
      this.stopPolling()
      this.pollingTimer = setInterval(() => {
        if (this.pollingPaused || this.pollingBusy) return
        this.fetchIncremental().catch(() => {})
      }, POLL_INTERVAL_MS)
    },
    stopPolling() {
      if (this.pollingTimer) {
        clearInterval(this.pollingTimer)
        this.pollingTimer = null
      }
    },
    async fetchIncremental() {
      if (!this.chatId) return
      this.pollingBusy = true
      try {
        const query = { limit: DEFAULT_LIMIT }
        if (this.lastCreatedAt) query.since = this.lastCreatedAt
        const msgData = await getActivityMessages(this.chatId, query)
        const rawList = msgData?.list || []
        if (!rawList.length) return
        const incoming = rawList.map((m) => this.normalizeMessage(m)).filter(Boolean)
        if (incoming.length) {
          this.messages = [...this.messages, ...incoming]
          this.updateLastCreatedAt(rawList)
          this.scrollToBottom()
        }
      } catch (e) {
        // 网络波动时静默失败，下个轮询周期重试
      } finally {
        this.pollingBusy = false
      }
    },
    openSocket() {
      // WebSocket 预留：后端若暴露 /activities/:id/ws 可直接启用
      try {
        const url = buildWsUrl(this.chatId)
        if (!url || !url.startsWith('ws')) return false
        const token = getAccessToken()
        this.socketTask = uni.connectSocket({
          url: `${url}${token ? `?token=${encodeURIComponent(token)}` : ''}`,
          complete: () => {},
        })
        const task = this.socketTask
        if (!task) return false
        task.onOpen(() => {
          // 可选：订阅消息
        })
        task.onMessage((res) => {
          try {
            const payload = typeof res?.data === 'string' ? JSON.parse(res.data) : res?.data
            if (payload?.type === 'message' && payload.data) {
              const norm = this.normalizeMessage(payload.data)
              if (norm) {
                this.messages.push(norm)
                this.updateLastCreatedAt([payload.data])
                this.scrollToBottom()
              }
            }
          } catch (e) {
            // ignore malformed payload
          }
        })
        task.onError(() => {
          this.closeSocket()
          this.startPolling()
        })
        task.onClose(() => {
          this.socketTask = null
          if (!this.pollingTimer) this.startPolling()
        })
        return true
      } catch (e) {
        return false
      }
    },
    closeSocket() {
      if (this.socketTask) {
        try {
          this.socketTask.close && this.socketTask.close({})
        } catch (e) {
          // ignore
        }
        this.socketTask = null
      }
    },
    scrollToBottom() {
      this.$nextTick(() => {
        this.scrollTop = 9999999 + Math.random()
      })
    },
    goBack() {
      uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/messages/messages' }) })
    },
    async sendMessage() {
      const text = (this.draft || '').trim()
      if (!text) return
      // 群聊：走真实接口，乐观渲染
      const tempId = `temp_${Date.now()}`
      this.messages.push({
        id: tempId,
        sender: '你',
        text,
        time: formatTime(new Date().toISOString()),
        mine: true,
        pending: true,
      })
      this.messageIds[tempId] = true
      this.draft = ''
      this.scrollToBottom()
      try {
        const row = await sendActivityMessage(this.chatId, { msgType: 'text', text })
        const realId = row?.messageId
        const idx = this.messages.findIndex((m) => m.id === tempId)
        if (idx >= 0) {
          if (realId && !this.messageIds[realId]) {
            this.messageIds[realId] = true
            this.messages.splice(idx, 1, {
              id: realId,
              sender: '你',
              text,
              time: formatTime(row?.createdAt),
              mine: true,
              createdAt: row?.createdAt,
            })
          } else {
            this.messages[idx].pending = false
          }
        }
        this.updateLastCreatedAt([{ createdAt: row?.createdAt }])
        try {
          await markMyChatRead(this.chatId)
        } catch (e) {
          console.warn('标记已读失败', e)
        }
      } catch (e) {
        const idx = this.messages.findIndex((m) => m.id === tempId)
        if (idx >= 0) this.messages.splice(idx, 1, { ...this.messages[idx], failed: true, pending: false })
        uni.showToast({ title: e?.message || '发送失败', icon: 'none' })
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.chat-detail {
  min-height: 100vh;
  background: transparent;
  display: flex;
  flex-direction: column;

  &__header {
    position: sticky;
    top: 0;
    z-index: 10;
    height: calc(96rpx + var(--status-bar-height, 0px) + env(safe-area-inset-top));
    padding: calc(var(--status-bar-height, 0px) + env(safe-area-inset-top)) 24rpx 0;
    background: $wm-sticky-header-gradient;
    border-bottom: none;
    box-shadow: 0 8rpx 28rpx rgba(99, 102, 241, 0.07);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__back,
  &__placeholder {
    width: 72rpx;
    height: 72rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__title-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rpx;
  }

  &__title {
    font-size: 30rpx;
    color: #0f172a;
    font-weight: 600;
  }

  &__sub {
    font-size: 20rpx;
    color: #94a3b8;
  }

  &__messages {
    flex: 1;
    padding: 20rpx 24rpx;
  }

  &__messages-inner {
    width: 100%;
    max-width: 760rpx;
    margin: 0 auto;
  }

  &__empty {
    padding: 60rpx 0;
    text-align: center;
    color: #94a3b8;
    font-size: 24rpx;
  }

  &__composer {
    display: flex;
    align-items: center;
    gap: 12rpx;
    padding: 16rpx 20rpx calc(16rpx + env(safe-area-inset-bottom));
    background: #ffffff;
    border-top: 1rpx solid #e5e7eb;
  }

  &__input {
    flex: 1;
    height: 72rpx;
    border-radius: 14rpx;
    padding: 0 18rpx;
    background: #f8fafc;
    font-size: 26rpx;
    color: #0f172a;
  }

  &__input-placeholder {
    color: #94a3b8;
  }

  &__send {
    width: 108rpx;
    height: 72rpx;
    border-radius: 14rpx;
    background: #6366f1;
    color: #ffffff;
    font-size: 26rpx;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.msg-row {
  display: flex;
  align-items: flex-end;
  gap: 12rpx;
  margin-bottom: 14rpx;

  &--mine {
    justify-content: flex-end;
  }

  &--other {
    justify-content: flex-start;
  }

  &__avatar {
    width: 56rpx;
    height: 56rpx;
    border-radius: 12rpx;
    background: linear-gradient(135deg, #a78bfa, #6366f1);
    color: #ffffff;
    font-size: 24rpx;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
}

.msg {
  display: flex;

  &--other {
    justify-content: flex-start;

    .msg__bubble {
      background: #ffffff;
      border-top-left-radius: 8rpx;
    }
  }

  &--mine {
    justify-content: flex-end;

    .msg__bubble {
      background: #e0e7ff;
      border-top-right-radius: 8rpx;
      padding-right: 28px;
      margin-right: 24px;
    }
  }

  &__bubble {
    max-width: 78%;
    padding: 14rpx 18rpx;
    border-radius: 16rpx;
    box-shadow: 0 2rpx 8rpx rgba(15, 23, 42, 0.04);
    box-sizing: border-box;
    overflow: visible;
  }

  &__sender {
    display: block;
    font-size: 20rpx;
    color: #6366f1;
    margin-bottom: 4rpx;
  }

  &__text {
    display: block;
    font-size: 26rpx;
    color: #0f172a;
    line-height: 1.45;
    white-space: normal;
    word-break: break-word;
  }

  &__time {
    font-size: 20rpx;
    color: #94a3b8;
  }

  &__meta {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8rpx;
    margin-top: 6rpx;
  }

  &__status {
    font-size: 20rpx;
    color: #94a3b8;

    &--failed {
      color: #ef4444;
    }
  }

  &__bubble--failed {
    opacity: 0.75;
  }
}
</style>
