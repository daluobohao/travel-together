<template>
  <view class="page chat-detail">
    <view class="chat-detail__header">
      <view class="chat-detail__back" @click="goBack">
        <wm-icon name="chevronLeft" :size="34" color="#0f172a" />
      </view>
      <view class="chat-detail__title-wrap">
        <text class="chat-detail__title">{{ chat.name }}</text>
        <text class="chat-detail__sub">{{ chat.members }} 人在线</text>
      </view>
      <view class="chat-detail__placeholder" />
    </view>

    <scroll-view class="chat-detail__messages" scroll-y>
      <view class="chat-detail__messages-inner">
        <view
          v-for="msg in messages"
          :key="msg.id"
          class="msg"
          :class="msg.mine ? 'msg--mine' : 'msg--other'"
        >
          <view class="msg__bubble">
            <text class="msg__sender" v-if="!msg.mine">{{ msg.sender }}</text>
            <text class="msg__text">{{ msg.text }}</text>
            <text class="msg__time">{{ msg.time }}</text>
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
      />
      <view class="chat-detail__send" @click="sendMessage">
        <text>发送</text>
      </view>
    </view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import { getActivityDetail, getActivityMessages, sendActivityMessage } from '@/api'

export default {
  components: { WmIcon },
  data() {
    return {
      chatId: 1,
      chat: { name: '群聊', members: 0 },
      messages: [],
      draft: '',
    }
  },
  onLoad(query) {
    this.chatId = Number(query.id || 1)
    this.loadChat()
  },
  methods: {
    async loadChat() {
      const [detail, msgData] = await Promise.all([
        getActivityDetail(String(this.chatId)),
        getActivityMessages(String(this.chatId), { limit: 50 }),
      ])
      this.chat = {
        name: detail?.title || '活动群聊',
        members: detail?.maxMembers || 0,
      }
      this.messages = (msgData?.list || []).map((m) => ({
        id: m.messageId,
        sender: m.sender?.nickname || '用户',
        text: m.text || '',
        time: '刚刚',
        mine: m.sender?.userId === 'me',
      }))
    },
    goBack() {
      uni.navigateBack()
    },
    async sendMessage() {
      const text = (this.draft || '').trim()
      if (!text) return
      await sendActivityMessage(String(this.chatId), { msgType: 'text', text })
      this.messages.push({ id: Date.now(), sender: '你', text, time: '刚刚', mine: true })
      this.draft = ''
    },
  },
}
</script>

<style lang="scss" scoped>
.chat-detail {
  min-height: 100vh;
  background: #f3f4f6;
  display: flex;
  flex-direction: column;

  &__header {
    position: sticky;
    top: 0;
    z-index: 10;
    height: calc(96rpx + env(safe-area-inset-top));
    padding: env(safe-area-inset-top) 24rpx 0;
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

.msg {
  display: flex;
  margin-bottom: 14rpx;

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
    display: block;
    margin-top: 6rpx;
    font-size: 20rpx;
    color: #94a3b8;
  }
}
</style>
