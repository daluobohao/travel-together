<template>
  <view class="page dm-chat">
    <view class="dm-chat__header">
      <view class="dm-chat__back" @click="goBack">
        <wm-icon name="chevronLeft" :size="34" color="#0f172a" />
      </view>
      <view class="dm-chat__title-wrap">
        <text class="dm-chat__title">{{ peerNickname || '私聊' }}</text>
      </view>
      <view class="dm-chat__placeholder" />
    </view>

    <scroll-view class="dm-chat__messages" scroll-y :scroll-top="scrollTop" :scroll-with-animation="true">
      <view class="dm-chat__messages-inner">
        <view v-if="!messages.length" class="dm-chat__empty">
          <text>打个招呼吧</text>
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
            <view v-if="!item.mine" class="msg-row__avatar">
              <image
                v-if="item.avatarUrl"
                class="msg-row__avatar-img"
                :src="item.avatarUrl"
                mode="aspectFill"
              />
              <text v-else>{{ item.avatarLetter }}</text>
            </view>

            <view class="msg-col" :class="item.mine ? 'msg-col--mine' : 'msg-col--other'">
              <view
                class="msg-bubble"
                :class="{
                  'msg-bubble--mine': item.mine && item.msgType !== 'sticker',
                  'msg-bubble--failed': item.failed,
                  'msg-bubble--image': item.msgType === 'image',
                  'msg-bubble--sticker': item.msgType === 'sticker',
                }"
              >
                <image
                  v-if="item.msgType === 'image' && item.imageUrl"
                  class="msg-bubble__image"
                  :src="item.imageUrl"
                  mode="widthFix"
                  @click.stop="previewChatImage(item.imageUrl)"
                />
                <text v-else-if="item.msgType === 'sticker'" class="msg-bubble__sticker">{{ item.stickerEmoji }}</text>
                <text v-else class="msg-bubble__text">{{ item.text }}</text>
              </view>
              <text v-if="item.pending" class="msg-col__hint">发送中…</text>
              <text v-else-if="item.failed" class="msg-col__hint msg-col__hint--fail">发送失败，请重试</text>
            </view>

            <view v-if="item.mine" class="msg-row__avatar msg-row__avatar--mine">
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

    <view class="dm-chat__composer">
      <view class="dm-chat__emoji-btn" @click="toggleEmojiPanel">
        <text class="dm-chat__emoji-icon">😊</text>
      </view>
      <view class="dm-chat__image-btn" @click="sendImageMessage">
        <wm-icon name="camera" :size="36" color="#64748b" />
      </view>
      <input
        v-model="draft"
        class="dm-chat__input"
        placeholder="输入消息..."
        placeholder-class="dm-chat__input-placeholder"
        confirm-type="send"
        @confirm="sendMessage"
      />
      <view class="dm-chat__send" @click="sendMessage">
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
import { getDirectMessages, getMe, markDirectChatRead, sendDirectMessage } from '@/api'
import { chooseAndUploadChatImage } from '@/utils/chatImagePicker'
import { getStickerEmoji } from '@/constants/chatStickers'
import { parseChatMessageFields } from '@/utils/chatMessageFields'

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

export default {
  components: { WmIcon, ChatEmojiPanel },
  data() {
    return {
      threadId: '',
      peerNickname: '',
      peerAvatarUrl: '',
      messages: [],
      messageIds: {},
      draft: '',
      scrollTop: 0,
      myUserId: '',
      myNickname: '我',
      myAvatarUrl: '',
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
    this.threadId = query?.threadId ? decodeURIComponent(query.threadId) : ''
    this.peerNickname = query?.peerNickname ? decodeURIComponent(query.peerNickname) : ''
    this.peerAvatarUrl = query?.peerAvatarUrl ? decodeURIComponent(query.peerAvatarUrl) : ''
    this.bootstrap()
  },
  onShow() {
    if (this.threadId) markDirectChatRead(this.threadId).catch(() => {})
  },
  methods: {
    async bootstrap() {
      try {
        const me = await getMe()
        this.myUserId = me?.userId || ''
        this.myNickname = me?.nickname || '我'
        this.myAvatarUrl = me?.avatarUrl || ''
      } catch (e) {
        console.warn(e)
      }
      await this.loadMessages()
      if (this.threadId) {
        try {
          await markDirectChatRead(this.threadId)
        } catch (e) {
          console.warn(e)
        }
      }
    },
    normalizeMessage(raw, { skipDedup = false } = {}) {
      if (!raw) return null
      const id = raw.messageId || `local_${Date.now()}`
      if (!skipDedup && this.messageIds[id]) return null
      if (!skipDedup) this.messageIds[id] = true

      const sid = raw.sender?.userId
      const mine = !!this.myUserId && sid === this.myUserId
      const nickname = raw.sender?.nickname || (mine ? this.myNickname : this.peerNickname) || '用户'
      const avatarUrl = mine
        ? raw.sender?.avatarUrl || this.myAvatarUrl
        : raw.sender?.avatarUrl || this.peerAvatarUrl

      if (!mine && raw.sender?.avatarUrl && !this.peerAvatarUrl) {
        this.peerAvatarUrl = raw.sender.avatarUrl
      }

      return {
        id,
        ...parseChatMessageFields(raw),
        mine,
        createdAt: raw.createdAt || new Date().toISOString(),
        avatarUrl: avatarUrl || '',
        avatarLetter: String(nickname || '?').slice(0, 1),
        pending: false,
        failed: false,
      }
    },
    rebuildMessageIds() {
      this.messageIds = {}
      for (const m of this.messages) {
        if (m?.id) this.messageIds[m.id] = true
      }
    },
    async loadMessages() {
      if (!this.threadId) return
      try {
        const data = await getDirectMessages(this.threadId, { limit: 50 })
        const rawList = data?.list || []
        this.messageIds = {}
        this.messages = rawList.map((m) => this.normalizeMessage(m)).filter(Boolean)
        this.rebuildMessageIds()
        this.scrollToBottom()
      } catch (e) {
        uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
      }
    },
    scrollToBottom() {
      this.$nextTick(() => {
        this.scrollTop = 9999999 + Math.random()
      })
    },
    previewChatImage(url) {
      if (!url) return
      uni.previewImage({ urls: [url], current: url })
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
      if (!stickerId || !this.threadId) return
      const tempId = `temp_${Date.now()}`
      const nowIso = new Date().toISOString()
      const stickerEmoji = getStickerEmoji(stickerId)
      this.messages.push({
        id: tempId,
        msgType: 'sticker',
        text: '',
        imageUrl: '',
        stickerId,
        stickerEmoji,
        mine: true,
        pending: true,
        failed: false,
        createdAt: nowIso,
        avatarUrl: this.myAvatarUrl,
        avatarLetter: String(this.myNickname || '我').slice(0, 1),
      })
      this.messageIds[tempId] = true
      this.scrollToBottom()
      try {
        const row = await sendDirectMessage(this.threadId, { msgType: 'sticker', stickerId })
        const realId = row?.messageId
        const idx = this.messages.findIndex((m) => m.id === tempId)
        if (idx >= 0) {
          if (realId && !this.messageIds[realId]) {
            this.messageIds[realId] = true
            this.messages.splice(idx, 1, {
              id: realId,
              msgType: 'sticker',
              text: '',
              imageUrl: '',
              stickerId: row?.stickerId || stickerId,
              stickerEmoji: getStickerEmoji(row?.stickerId || stickerId),
              mine: true,
              pending: false,
              failed: false,
              createdAt: row?.createdAt || nowIso,
              avatarUrl: this.myAvatarUrl,
              avatarLetter: String(this.myNickname || '我').slice(0, 1),
            })
          } else {
            this.messages[idx].pending = false
          }
        }
        await markDirectChatRead(this.threadId)
      } catch (e) {
        const idx = this.messages.findIndex((m) => m.id === tempId)
        if (idx >= 0) {
          this.messages.splice(idx, 1, { ...this.messages[idx], failed: true, pending: false })
        }
        uni.showToast({ title: e.message || '发送失败', icon: 'none' })
      }
    },
    async sendImageMessage() {
      if (this.sendingImage || !this.threadId) return
      this.showEmojiPanel = false
      this.sendingImage = true
      let tempId = ''
      try {
        const imageUrl = await chooseAndUploadChatImage()
        tempId = `temp_${Date.now()}`
        const nowIso = new Date().toISOString()
        this.messages.push({
          id: tempId,
          msgType: 'image',
          text: '',
          imageUrl,
          mine: true,
          pending: true,
          failed: false,
          createdAt: nowIso,
          avatarUrl: this.myAvatarUrl,
          avatarLetter: String(this.myNickname || '我').slice(0, 1),
        })
        this.messageIds[tempId] = true
        this.scrollToBottom()

        const row = await sendDirectMessage(this.threadId, { msgType: 'image', imageUrl })
        const realId = row?.messageId
        const idx = this.messages.findIndex((m) => m.id === tempId)
        if (idx >= 0) {
          if (realId && !this.messageIds[realId]) {
            this.messageIds[realId] = true
            this.messages.splice(idx, 1, {
              id: realId,
              msgType: 'image',
              text: '',
              imageUrl: row?.imageUrl || imageUrl,
              mine: true,
              pending: false,
              failed: false,
              createdAt: row?.createdAt || nowIso,
              avatarUrl: this.myAvatarUrl,
              avatarLetter: String(this.myNickname || '我').slice(0, 1),
            })
          } else {
            this.messages[idx].pending = false
          }
        }
        await markDirectChatRead(this.threadId)
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
      if (!text || !this.threadId) return
      this.showEmojiPanel = false

      const tempId = `temp_${Date.now()}`
      const nowIso = new Date().toISOString()
      this.messages.push({
        id: tempId,
        text,
        mine: true,
        pending: true,
        failed: false,
        createdAt: nowIso,
        avatarUrl: this.myAvatarUrl,
        avatarLetter: String(this.myNickname || '我').slice(0, 1),
      })
      this.messageIds[tempId] = true
      this.draft = ''
      this.scrollToBottom()

      try {
        const row = await sendDirectMessage(this.threadId, { msgType: 'text', text })
        const realId = row?.messageId
        const idx = this.messages.findIndex((m) => m.id === tempId)
        if (idx >= 0) {
          if (realId && !this.messageIds[realId]) {
            this.messageIds[realId] = true
            this.messages.splice(idx, 1, {
              id: realId,
              text,
              mine: true,
              pending: false,
              failed: false,
              createdAt: row?.createdAt || nowIso,
              avatarUrl: this.myAvatarUrl,
              avatarLetter: String(this.myNickname || '我').slice(0, 1),
            })
          } else {
            this.messages[idx].pending = false
          }
        }
        await markDirectChatRead(this.threadId)
      } catch (e) {
        const idx = this.messages.findIndex((m) => m.id === tempId)
        if (idx >= 0) {
          this.messages.splice(idx, 1, { ...this.messages[idx], failed: true, pending: false })
        }
        uni.showToast({ title: e?.message || '发送失败', icon: 'none' })
      }
    },
    goBack() {
      uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/messages/messages' }) })
    },
  },
}
</script>

<style lang="scss" scoped>
.dm-chat {
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
    max-width: 420rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
