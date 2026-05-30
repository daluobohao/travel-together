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
      <view class="chat-detail__members" @click="openMembers">
        <wm-icon name="users" :size="32" color="#0f172a" />
      </view>
    </view>

    <scroll-view class="chat-detail__messages" scroll-y :scroll-top="scrollTop" :scroll-with-animation="true">
      <view class="chat-detail__messages-inner">
        <view v-if="!messages.length" class="chat-detail__empty">
          <text>欢迎来到活动群聊</text>
        </view>
        <template v-for="item in displayItems" :key="item.id">
          <view v-if="item.type === 'time'" class="chat-time">
            <text class="chat-time__label">{{ item.label }}</text>
          </view>
          <view
            v-else
            class="msg-row"
            :class="item.mine ? 'msg-row--mine' : 'msg-row--other'"
          >
            <view
              v-if="!item.mine"
              class="msg-row__avatar"
              :class="{ 'msg-row__avatar--tap': item.openProfile }"
              @click.stop="item.openProfile && openUserPublic(item)"
            >
              <image
                v-if="item.avatarUrl"
                class="msg-row__avatar-img"
                :src="item.avatarUrl"
                mode="aspectFill"
              />
              <text v-else>{{ item.avatarLetter }}</text>
            </view>

            <view class="msg-col" :class="item.mine ? 'msg-col--mine' : 'msg-col--other'">
              <text
                v-if="!item.mine && item.sender"
                class="msg-col__name"
                @click.stop="item.openProfile && openUserPublic(item)"
              >
                {{ item.sender }}
              </text>
              <view
                class="msg-bubble"
                :class="{
                  'msg-bubble--mine': item.mine && item.msgType !== 'sticker',
                  'msg-bubble--failed': item.failed,
                  'msg-bubble--image': item.msgType === 'image',
                  'msg-bubble--sticker': item.msgType === 'sticker',
                }"
                @longpress.stop="copyChatMessage(item)"
              >
                <image
                  v-if="item.msgType === 'image' && item.imageUrl"
                  class="msg-bubble__image"
                  :src="item.imageUrl"
                  mode="widthFix"
                  @click.stop="previewChatImage(item.imageUrl)"
                />
                <text v-else-if="item.msgType === 'sticker'" class="msg-bubble__sticker" selectable>{{ item.stickerEmoji }}</text>
                <text v-else class="msg-bubble__text" selectable>{{ item.text }}</text>
              </view>
              <text v-if="item.pending" class="msg-col__hint">发送中…</text>
              <text v-else-if="item.failed" class="msg-col__hint msg-col__hint--fail">发送失败，请重试</text>
            </view>

            <view
              v-if="item.mine"
              class="msg-row__avatar msg-row__avatar--mine"
            >
              <image
                v-if="item.avatarUrl"
                class="msg-row__avatar-img"
                :src="item.avatarUrl"
                mode="aspectFill"
              />
              <text v-else>{{ item.avatarLetter }}</text>
            </view>
          </view>
        </template>
      </view>
    </scroll-view>

    <view class="chat-detail__composer">
      <view class="chat-detail__emoji-btn" @click="toggleEmojiPanel">
        <text class="chat-detail__emoji-icon">😊</text>
      </view>
      <view class="chat-detail__image-btn" @click="sendImageMessage">
        <wm-icon name="camera" :size="36" color="#64748b" />
      </view>
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
    <chat-emoji-panel
      :visible="showEmojiPanel"
      @pick-emoji="onPickEmoji"
      @pick-sticker="onPickSticker"
    />
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import ChatEmojiPanel from '@/components/ChatEmojiPanel/ChatEmojiPanel.vue'
import {
  API_BASE_URL,
  getAccessToken,
  getActivityDetail,
  getActivityMessages,
  getMe,
  isLoggedIn,
  markMyChatRead,
  redirectToLogin,
  sendActivityMessage,
} from '@/api'
import { chooseAndUploadChatImage } from '@/utils/chatImagePicker'
import { getStickerEmoji } from '@/constants/chatStickers'
import { parseChatMessageFields } from '@/utils/chatMessageFields'
import { chatMessageCopyText, copyTextToClipboard } from '@/utils/clipboard'
import {
  getLastServerMessageId,
  loadActivityChatCache,
  mergeMessageLists,
  saveActivityChatCache,
} from '@/utils/activityChatCache'

const POLL_INTERVAL_MS = 4000
const DEFAULT_LIMIT = 50

const TIME_GAP_MS = 5 * 60 * 1000

function formatTimeDivider(iso, prevIso) {
  if (!iso) return null
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    const prev = prevIso ? new Date(prevIso) : null
    if (prev && !Number.isNaN(prev.getTime()) && d.getTime() - prev.getTime() < TIME_GAP_MS) {
      return null
    }
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    const now = new Date()
    const today = now.toDateString()
    const yesterday = new Date(now.getTime() - 86400000).toDateString()
    const ds = d.toDateString()
    if (ds === today) return `${h}:${m}`
    if (ds === yesterday) return `昨天 ${h}:${m}`
    return `${d.getMonth() + 1}月${d.getDate()}日 ${h}:${m}`
  } catch (e) {
    return null
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
  components: { WmIcon, ChatEmojiPanel },
  data() {
    return {
      chatId: '',
      chat: { name: '聊天', subtitle: '' },
      activityKind: 'event',
      enrolledCount: 0,
      maxMembers: 0,
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
      currentUserId: '',
      currentUserNickname: '',
      currentUserAvatar: '',
      sendingImage: false,
      showEmojiPanel: false,
    }
  },
  computed: {
    displayItems() {
      const items = []
      let prevCreatedAt = ''
      for (const msg of this.messages) {
        const label = formatTimeDivider(msg.createdAt, prevCreatedAt)
        if (label) {
          items.push({ type: 'time', id: `time_${msg.id}`, label })
        }
        items.push({ type: 'message', ...msg })
        if (msg.createdAt) prevCreatedAt = msg.createdAt
      }
      return items
    },
  },
  onLoad(query) {
    this.chatId = query?.id ? String(query.id) : '1'
    if (!isLoggedIn()) {
      redirectToLogin(`/pages/chat-detail/chat-detail?id=${encodeURIComponent(this.chatId)}`)
      return
    }
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
    this.persistCache()
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
        this.currentUserNickname = user?.nickname || '我'
        this.currentUserAvatar = user?.avatarUrl || ''
      } catch (e) {
        console.warn('获取当前用户信息失败', e)
      }
    },
    async loadGroup() {
      const cached = loadActivityChatCache(this.chatId)
      if (cached.length) {
        this.applyMessagesList(cached)
        this.scrollToBottom()
      }
      try {
        const [detail, msgData] = await Promise.all([
          getActivityDetail(this.chatId),
          getActivityMessages(this.chatId, { limit: DEFAULT_LIMIT }),
        ])
        const enrolled = Number(detail?.enrolledCount || 0)
        const maxM = Number(detail?.maxMembers || 0)
        this.activityKind = detail?.activityKind || 'event'
        this.enrolledCount = enrolled
        this.maxMembers = maxM
        const isCityHall = this.activityKind === 'city_hall'
        this.chat = {
          name: detail?.title || '活动群聊',
          subtitle: isCityHall
            ? enrolled > 0
              ? `${enrolled} 人 · 城市大群`
              : '城市大群'
            : maxM > 0
              ? `${enrolled}/${maxM} 成员`
              : `${enrolled} 成员`,
        }
        const rawList = msgData?.list || []
        const incoming = rawList.map((m) => this.normalizeMessage(m, { skipDedup: true })).filter(Boolean)
        if (this.mergeIncomingMessages(incoming)) {
          this.scrollToBottom()
        }
        this.updateLastCreatedAt(rawList)
        this.persistCache()
        markMyChatRead(this.chatId).catch(() => {})
      } catch (e) {
        if (!this.messages.length) {
          uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
        }
      } finally {
        if (!cached.length) this.scrollToBottom()
      }
    },
    applyMessagesList(list) {
      this.messages = list || []
      this.rebuildMessageIds()
    },
    rebuildMessageIds() {
      this.messageIds = {}
      for (const m of this.messages) {
        if (m?.id) this.messageIds[m.id] = true
      }
    },
    persistCache() {
      if (!this.chatId || !this.messages.length) return
      saveActivityChatCache(this.chatId, this.messages)
    },
    mergeIncomingMessages(incoming) {
      if (!incoming?.length) return false
      const prevLen = this.messages.length
      const merged = mergeMessageLists(this.messages, incoming)
      const changed =
        merged.length !== prevLen ||
        merged.some(
          (m, i) =>
            m.id !== this.messages[i]?.id ||
            m.text !== this.messages[i]?.text ||
            m.imageUrl !== this.messages[i]?.imageUrl ||
            m.msgType !== this.messages[i]?.msgType ||
            m.stickerId !== this.messages[i]?.stickerId
        )
      if (changed) {
        this.messages = merged
        this.rebuildMessageIds()
      }
      return changed
    },
    normalizeMessage(raw, { skipDedup = false } = {}) {
      if (!raw) return null
      const id = raw.messageId || `local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      if (!skipDedup && this.messageIds[id]) return null
      if (!skipDedup) this.messageIds[id] = true
      const senderUserId = raw.sender?.userId
      const isMine = senderUserId === 'me' || (this.currentUserId && senderUserId === this.currentUserId)
      const openProfile =
        !isMine && senderUserId && senderUserId !== 'system'
      const nickname = raw.sender?.nickname || '用户'
      const fields = parseChatMessageFields(raw)
      return {
        id,
        sender: nickname,
        ...fields,
        mine: isMine,
        createdAt: raw.createdAt || new Date().toISOString(),
        userId: senderUserId,
        openProfile,
        avatarUrl: raw.sender?.avatarUrl || '',
        avatarLetter: String(nickname || '?').slice(0, 1),
      }
    },
    openUserPublic(msg) {
      if (!msg?.userId || msg.userId === 'system') return
      const q = [
        'userId=' + encodeURIComponent(msg.userId),
        'activityId=' + encodeURIComponent(this.chatId),
      ]
      if (msg.sender) q.push('nick=' + encodeURIComponent(msg.sender))
      if (msg.avatarUrl) q.push('ava=' + encodeURIComponent(msg.avatarUrl))
      uni.navigateTo({
        url: '/pages/user-public/user-public?' + q.join('&'),
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
        const afterId = getLastServerMessageId(this.messages)
        if (afterId) query.afterMessageId = afterId
        const msgData = await getActivityMessages(this.chatId, query)
        const rawList = msgData?.list || []
        if (!rawList.length) return
        const incoming = rawList.map((m) => this.normalizeMessage(m, { skipDedup: true })).filter(Boolean)
        if (this.mergeIncomingMessages(incoming)) {
          this.updateLastCreatedAt(rawList)
          this.persistCache()
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
              const norm = this.normalizeMessage(payload.data, { skipDedup: true })
              if (norm && this.mergeIncomingMessages([norm])) {
                this.updateLastCreatedAt([payload.data])
                this.persistCache()
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
    openMembers() {
      if (!this.chatId) return
      const q = [
        'id=' + encodeURIComponent(this.chatId),
        'title=' + encodeURIComponent(this.chat.name || ''),
        'activityKind=' + encodeURIComponent(this.activityKind || 'event'),
        'memberTotal=' + encodeURIComponent(String(this.enrolledCount || 0)),
        'maxMembers=' + encodeURIComponent(String(this.maxMembers || 0)),
      ].join('&')
      uni.navigateTo({ url: '/pages/chat-members/chat-members?' + q })
    },
    goBack() {
      uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/messages/messages' }) })
    },
    previewChatImage(url) {
      if (!url) return
      uni.previewImage({ urls: [url], current: url })
    },
    copyChatMessage(item) {
      const text = chatMessageCopyText(item)
      if (!text) return
      copyTextToClipboard(text)
    },
    toggleEmojiPanel() {
      this.showEmojiPanel = !this.showEmojiPanel
    },
    onPickEmoji(emoji) {
      this.draft = `${this.draft || ''}${emoji}`
    },
    onPickSticker(stickerId) {
      this.showEmojiPanel = false
      this.sendStickerMessage(stickerId)
    },
    async sendStickerMessage(stickerId) {
      if (!stickerId || !this.chatId) return
      const tempId = `temp_${Date.now()}`
      const nowIso = new Date().toISOString()
      const stickerEmoji = getStickerEmoji(stickerId)
      this.messages.push({
        id: tempId,
        sender: this.currentUserNickname || '我',
        msgType: 'sticker',
        text: '',
        imageUrl: '',
        stickerId,
        stickerEmoji,
        mine: true,
        pending: true,
        createdAt: nowIso,
        avatarUrl: this.currentUserAvatar,
        avatarLetter: String(this.currentUserNickname || '我').slice(0, 1),
      })
      this.messageIds[tempId] = true
      this.scrollToBottom()
      try {
        const row = await sendActivityMessage(this.chatId, { msgType: 'sticker', stickerId })
        const realId = row?.messageId
        const idx = this.messages.findIndex((m) => m.id === tempId)
        if (idx >= 0) {
          if (realId && !this.messageIds[realId]) {
            this.messageIds[realId] = true
            this.messages.splice(idx, 1, {
              id: realId,
              sender: this.currentUserNickname || '我',
              msgType: 'sticker',
              text: '',
              imageUrl: '',
              stickerId: row?.stickerId || stickerId,
              stickerEmoji: getStickerEmoji(row?.stickerId || stickerId),
              mine: true,
              createdAt: row?.createdAt || nowIso,
              avatarUrl: this.currentUserAvatar,
              avatarLetter: String(this.currentUserNickname || '我').slice(0, 1),
            })
          } else {
            this.messages[idx].pending = false
          }
        }
        this.updateLastCreatedAt([{ createdAt: row?.createdAt }])
        this.persistCache()
        try {
          await markMyChatRead(this.chatId)
        } catch (e) {
          console.warn('标记已读失败', e)
        }
      } catch (e) {
        const idx = this.messages.findIndex((m) => m.id === tempId)
        if (idx >= 0) {
          this.messages.splice(idx, 1, { ...this.messages[idx], failed: true, pending: false })
        }
        uni.showToast({ title: e?.message || '发送失败', icon: 'none' })
      }
    },
    async sendImageMessage() {
      if (this.sendingImage || !this.chatId) return
      this.showEmojiPanel = false
      this.sendingImage = true
      let tempId = ''
      try {
        const imageUrl = await chooseAndUploadChatImage()
        tempId = `temp_${Date.now()}`
        const nowIso = new Date().toISOString()
        this.messages.push({
          id: tempId,
          sender: this.currentUserNickname || '我',
          msgType: 'image',
          text: '',
          imageUrl,
          mine: true,
          pending: true,
          createdAt: nowIso,
          avatarUrl: this.currentUserAvatar,
          avatarLetter: String(this.currentUserNickname || '我').slice(0, 1),
        })
        this.messageIds[tempId] = true
        this.scrollToBottom()

        const row = await sendActivityMessage(this.chatId, { msgType: 'image', imageUrl })
        const realId = row?.messageId
        const idx = this.messages.findIndex((m) => m.id === tempId)
        if (idx >= 0) {
          if (realId && !this.messageIds[realId]) {
            this.messageIds[realId] = true
            this.messages.splice(idx, 1, {
              id: realId,
              sender: this.currentUserNickname || '我',
              msgType: 'image',
              text: '',
              imageUrl: row?.imageUrl || imageUrl,
              mine: true,
              createdAt: row?.createdAt || nowIso,
              avatarUrl: this.currentUserAvatar,
              avatarLetter: String(this.currentUserNickname || '我').slice(0, 1),
            })
          } else {
            this.messages[idx].pending = false
          }
        }
        this.updateLastCreatedAt([{ createdAt: row?.createdAt }])
        this.persistCache()
        try {
          await markMyChatRead(this.chatId)
        } catch (e) {
          console.warn('标记已读失败', e)
        }
      } catch (e) {
        if (tempId) {
          const idx = this.messages.findIndex((m) => m.id === tempId)
          if (idx >= 0) {
            this.messages.splice(idx, 1, { ...this.messages[idx], failed: true, pending: false })
          }
        }
        if (e?.message && e.message !== '已取消') {
          uni.showToast({ title: e.message || '发送失败', icon: 'none' })
        }
      } finally {
        this.sendingImage = false
      }
    },
    async sendMessage() {
      const text = (this.draft || '').trim()
      if (!text) return
      this.showEmojiPanel = false
      // 群聊：走真实接口，乐观渲染
      const tempId = `temp_${Date.now()}`
      const nowIso = new Date().toISOString()
      this.messages.push({
        id: tempId,
        sender: this.currentUserNickname || '我',
        text,
        mine: true,
        pending: true,
        createdAt: nowIso,
        avatarUrl: this.currentUserAvatar,
        avatarLetter: String(this.currentUserNickname || '我').slice(0, 1),
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
              sender: this.currentUserNickname || '我',
              text,
              mine: true,
              createdAt: row?.createdAt || nowIso,
              avatarUrl: this.currentUserAvatar,
              avatarLetter: String(this.currentUserNickname || '我').slice(0, 1),
            })
          } else {
            this.messages[idx].pending = false
          }
        }
        this.updateLastCreatedAt([{ createdAt: row?.createdAt }])
        this.persistCache()
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
  height: 100vh;
  background: #ededed;
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
  &__members {
    width: 72rpx;
    height: 72rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__members:active {
    opacity: 0.75;
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
    height: 0;
    padding: 16rpx 0;
    background: #ededed;
    box-sizing: border-box;
  }

  &__messages-inner {
    width: 100%;
    padding: 0 24rpx 24rpx;
    box-sizing: border-box;
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

  &__emoji-btn,
  &__image-btn {
    width: 72rpx;
    height: 72rpx;
    border-radius: 14rpx;
    background: #f8fafc;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__emoji-icon {
    font-size: 40rpx;
    line-height: 1;
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

.chat-time {
  display: flex;
  justify-content: center;
  padding: 20rpx 0 12rpx;

  &__label {
    font-size: 22rpx;
    color: #b2b2b2;
    background: rgba(0, 0, 0, 0.06);
    padding: 6rpx 16rpx;
    border-radius: 8rpx;
    line-height: 1.2;
  }
}

.msg-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  margin-bottom: 24rpx;

  &--mine {
    flex-direction: row;
    justify-content: flex-end;
  }

  &--other {
    justify-content: flex-start;
  }

  &__avatar {
    width: 80rpx;
    height: 80rpx;
    border-radius: 8rpx;
    background: #c8c8c8;
    color: #ffffff;
    font-size: 28rpx;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;

    &--mine {
      background: linear-gradient(135deg, #7dd3fc, #38bdf8);
    }

    &--tap:active {
      opacity: 0.85;
    }
  }

  &__avatar-img {
    width: 100%;
    height: 100%;
  }
}

.msg-col {
  display: flex;
  flex-direction: column;
  max-width: calc(100% - 112rpx);
  min-width: 0;

  &--mine {
    align-items: flex-end;
  }

  &--other {
    align-items: flex-start;
  }

  &__name {
    font-size: 22rpx;
    color: #888888;
    line-height: 1.3;
    margin-bottom: 6rpx;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__hint {
    font-size: 20rpx;
    color: #b2b2b2;
    margin-top: 6rpx;

    &--fail {
      color: #ef4444;
    }
  }
}

.msg-bubble {
  display: inline-block;
  max-width: 520rpx;
  padding: 18rpx 22rpx;
  border-radius: 8rpx;
  background: #ffffff;
  position: relative;
  box-sizing: border-box;

  &--mine {
    background: #95ec69;
  }

  &--failed {
    opacity: 0.72;
  }

  &--image {
    padding: 0;
    background: transparent;
    max-width: 420rpx;
  }

  &--sticker {
    padding: 0;
    background: transparent;
    max-width: 200rpx;
  }

  &__text {
    font-size: 32rpx;
    color: #191919;
    line-height: 1.5;
    word-break: break-word;
    white-space: pre-wrap;
  }

  &__image {
    max-width: 400rpx;
    min-width: 120rpx;
    border-radius: 8rpx;
    display: block;
  }

  &__sticker {
    font-size: 96rpx;
    line-height: 1.1;
  }
}
</style>
