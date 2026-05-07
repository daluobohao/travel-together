<template>
  <view class="page dm-chat">
    <view class="dm-chat__header">
      <view class="dm-chat__back" @click="goBack">
        <wm-icon name="chevronLeft" :size="36" color="#0f172a" />
      </view>
      <view class="dm-chat__title-wrap">
        <text class="dm-chat__title">{{ peerNickname || '私聊' }}</text>
      </view>
      <view class="dm-chat__placeholder" />
    </view>

    <scroll-view class="dm-chat__messages" scroll-y :scroll-top="scrollTop" :scroll-with-animation="true">
      <view class="dm-chat__inner">
        <view v-if="!messages.length" class="dm-chat__empty"><text>打个招呼吧</text></view>
        <view
          v-for="msg in messages"
          :key="msg.id"
          class="dm-row"
          :class="msg.mine ? 'dm-row--mine' : 'dm-row--other'"
        >
          <view v-if="!msg.mine" class="dm-row__avatar"><text>{{ shortNick(msg.sender) }}</text></view>
          <view class="dm-bubble" :class="{ 'dm-bubble--mine': msg.mine }">
            <text class="dm-bubble__text">{{ msg.text }}</text>
            <text class="dm-bubble__time">{{ msg.time }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <view class="dm-chat__composer">
      <input
        v-model="draft"
        class="dm-chat__input"
        placeholder="发送私信…"
        placeholder-class="dm-chat__input-ph"
        confirm-type="send"
        @confirm="sendMessage"
      />
      <view class="dm-chat__send" @click="sendMessage"><text>发送</text></view>
    </view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import { getDirectMessages, getMe, markDirectChatRead, sendDirectMessage } from '@/api'

function fmt(iso) {
  try {
    const d = iso ? new Date(iso) : new Date()
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    return `${h}:${m}`
  } catch (e) {
    return ''
  }
}

export default {
  components: { WmIcon },
  data() {
    return {
      threadId: '',
      peerNickname: '',
      messages: [],
      draft: '',
      scrollTop: 0,
      myUserId: '',
      ids: {},
    }
  },
  onLoad(query) {
    this.threadId = query?.threadId ? decodeURIComponent(query.threadId) : ''
    this.peerNickname = query?.peerNickname ? decodeURIComponent(query.peerNickname) : ''
    this.bootstrap()
  },
  onShow() {
    if (this.threadId) markDirectChatRead(this.threadId).catch(() => {})
  },
  methods: {
    shortNick(n) {
      return String(n || '?').slice(0, 1)
    },
    async bootstrap() {
      try {
        const me = await getMe()
        this.myUserId = me?.userId || ''
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
    norm(raw) {
      if (!raw) return null
      const id = raw.messageId || `local_${Date.now()}`
      if (this.ids[id]) return null
      this.ids[id] = true
      const sid = raw.sender?.userId
      const mine = !!this.myUserId && sid === this.myUserId
      return {
        id,
        sender: raw.sender?.nickname || '用户',
        text: raw.text || '',
        time: fmt(raw.createdAt),
        mine,
      }
    },
    async loadMessages() {
      if (!this.threadId) return
      try {
        const data = await getDirectMessages(this.threadId, { limit: 50 })
        const rawList = data?.list || []
        this.ids = {}
        this.messages = rawList.map((m) => this.norm(m)).filter(Boolean)
        this.$nextTick(() => {
          this.scrollTop = 999999 + Math.random()
        })
      } catch (e) {
        uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
      }
    },
    async sendMessage() {
      const text = (this.draft || '').trim()
      if (!text || !this.threadId) return
      const temp = `temp_${Date.now()}`
      this.messages.push({
        id: temp,
        sender: '我',
        text,
        time: fmt(new Date().toISOString()),
        mine: true,
      })
      this.ids[temp] = true
      this.draft = ''
      this.$nextTick(() => {
        this.scrollTop = 999999 + Math.random()
      })
      try {
        const row = await sendDirectMessage(this.threadId, { msgType: 'text', text })
        const idx = this.messages.findIndex((m) => m.id === temp)
        const real = this.norm(row)
        if (real && idx >= 0) this.messages.splice(idx, 1, real)
        await markDirectChatRead(this.threadId)
      } catch (e) {
        const idx = this.messages.findIndex((m) => m.id === temp)
        if (idx >= 0) this.messages.splice(idx, 1)
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
  background: #f3f4f6;
  display: flex;
  flex-direction: column;

  &__header {
    position: sticky;
    top: 0;
    z-index: 10;
    height: calc(96rpx + var(--status-bar-height, 0px) + env(safe-area-inset-top));
    padding: calc(var(--status-bar-height, 0px) + env(safe-area-inset-top)) 24rpx 0;
    background: #ffffff;
    border-bottom: 1rpx solid #e5e7eb;
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
    flex: 1;
    display: flex;
    justify-content: center;
  }

  &__title {
    font-size: 30rpx;
    font-weight: 600;
    color: #0f172a;
    max-width: 420rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__messages {
    flex: 1;
    padding: 20rpx 24rpx;
  }

  &__inner {
    max-width: 760rpx;
    margin: 0 auto;
  }

  &__empty {
    padding: 80rpx 0;
    text-align: center;
    color: #94a3b8;
    font-size: 26rpx;
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

  &__input-ph {
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

.dm-row {
  display: flex;
  align-items: flex-end;
  gap: 12rpx;
  margin-bottom: 16rpx;

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
    color: #fff;
    font-size: 24rpx;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
}

.dm-bubble {
  max-width: 74%;
  padding: 14rpx 18rpx;
  border-radius: 16rpx;
  background: #ffffff;
  box-shadow: 0 2rpx 8rpx rgba(15, 23, 42, 0.04);

  &--mine {
    background: #e0e7ff;
  }

  &__text {
    font-size: 28rpx;
    color: #0f172a;
    line-height: 1.45;
    word-break: break-word;
  }

  &__time {
    display: block;
    margin-top: 6rpx;
    font-size: 20rpx;
    color: #94a3b8;
    text-align: right;
  }
}
</style>
