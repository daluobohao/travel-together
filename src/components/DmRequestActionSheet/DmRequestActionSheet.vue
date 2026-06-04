<template>
  <view v-if="visible" class="dra" @touchmove.stop.prevent="noop">
    <view class="dra__mask" :class="{ 'dra__mask--in': animating }" @click="onClose" />
    <view class="dra__panel" :class="{ 'dra__panel--in': animating }">
      <view class="dra__handle" />
      <text class="dra__title">私聊申请</text>

      <view v-if="request" class="dra__card">
        <view class="dra__head">
          <text class="dra__name">{{ peerName }}</text>
          <text class="dra__time">{{ relTime(request.createdAt) }}</text>
        </view>
        <text v-if="request.introText" class="dra__intro">「{{ request.introText }}」</text>
        <text v-if="request.activityId" class="dra__act">来自活动 {{ request.activityId }}</text>
        <text class="dra__status">{{ statusHint }}</text>

        <view v-if="canAcceptReject" class="dra__actions">
          <view class="dra__btn dra__btn--ok" @click="onAccept"><text>同意</text></view>
          <view class="dra__btn dra__btn--no" @click="onReject"><text>拒绝</text></view>
        </view>
        <view v-else-if="canCancel" class="dra__actions">
          <view class="dra__btn dra__btn--no dra__btn--full" @click="onCancel"><text>撤回申请</text></view>
        </view>
        <view v-else-if="canOpenChat" class="dra__actions">
          <view class="dra__btn dra__btn--ok dra__btn--full" @click="onOpenChat"><text>去私聊</text></view>
        </view>
      </view>

      <view class="dra__cancel" hover-class="dra__cancel--hover" @click="onClose">
        <text>关闭</text>
      </view>
    </view>
  </view>
</template>

<script>
import { acceptDmRequest, cancelDmRequest, rejectDmRequest } from '@/api'

export default {
  name: 'DmRequestActionSheet',
  props: {
    visible: { type: Boolean, default: false },
    request: { type: Object, default: null },
    currentUserId: { type: String, default: '' },
  },
  emits: ['update:visible', 'done'],
  data() {
    return { animating: false }
  },
  computed: {
    isIncoming() {
      return this.request?.toUser?.userId === this.currentUserId
    },
    peerUser() {
      if (!this.request) return null
      return this.isIncoming ? this.request.fromUser : this.request.toUser
    },
    peerName() {
      return this.peerUser?.nickname || '用户'
    },
    canAcceptReject() {
      return this.isIncoming && this.request?.status === 'pending'
    },
    canCancel() {
      return !this.isIncoming && this.request?.status === 'pending'
    },
    canOpenChat() {
      return this.request?.status === 'accepted' && this.request?.threadId
    },
    statusHint() {
      const m = {
        pending: this.isIncoming ? '对方申请与你私聊，待你处理' : '等待对方同意',
        accepted: '已同意，可以私聊',
        rejected: '已拒绝',
        cancelled: '已撤回',
      }
      return m[this.request?.status] || ''
    },
  },
  watch: {
    visible(v) {
      if (v) {
        this.animating = false
        this.$nextTick(() => {
          setTimeout(() => {
            this.animating = true
          }, 20)
        })
      } else {
        this.animating = false
      }
    },
  },
  methods: {
    noop() {},
    relTime(iso) {
      if (!iso) return ''
      const t = new Date(iso).getTime()
      if (Number.isNaN(t)) return ''
      const diff = Date.now() - t
      if (diff < 60 * 1000) return '刚刚'
      if (diff < 3600 * 1000) return `${Math.floor(diff / 60000)}分钟前`
      if (diff < 24 * 3600 * 1000) return `${Math.floor(diff / 3600000)}小时前`
      return `${Math.floor(diff / (24 * 3600 * 1000))}天前`
    },
    onClose() {
      this.$emit('update:visible', false)
    },
    async onAccept() {
      if (!this.request?.requestId) return
      try {
        const data = await acceptDmRequest(this.request.requestId)
        uni.showToast({ title: '已同意', icon: 'success' })
        this.$emit('done', { action: 'accepted', request: this.request, threadId: data?.threadId })
        this.onClose()
        this.openChat(data?.threadId)
      } catch (e) {
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
      }
    },
    async onReject() {
      if (!this.request?.requestId) return
      try {
        await rejectDmRequest(this.request.requestId)
        uni.showToast({ title: '已拒绝', icon: 'none' })
        this.$emit('done', { action: 'rejected', request: this.request })
        this.onClose()
      } catch (e) {
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
      }
    },
    async onCancel() {
      if (!this.request?.requestId) return
      try {
        await cancelDmRequest(this.request.requestId)
        uni.showToast({ title: '已撤回', icon: 'none' })
        this.$emit('done', { action: 'cancelled', request: this.request })
        this.onClose()
      } catch (e) {
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
      }
    },
    onOpenChat() {
      this.openChat(this.request?.threadId)
      this.onClose()
    },
    openChat(threadId) {
      const tid = threadId || this.request?.threadId
      if (!tid) return
      const peer = this.peerUser
      const nick = peer?.nickname || ''
      const uid = peer?.userId ? '&peerUserId=' + encodeURIComponent(peer.userId) : ''
      const ava = peer?.avatarUrl ? '&peerAvatarUrl=' + encodeURIComponent(peer.avatarUrl) : ''
      uni.navigateTo({
        url:
          '/pages/direct-chat-detail/direct-chat-detail?threadId=' +
          encodeURIComponent(tid) +
          '&peerNickname=' +
          encodeURIComponent(nick) +
          uid +
          ava,
      })
    },
  },
}
</script>

<style lang="scss" scoped>
.dra {
  position: fixed;
  inset: 0;
  z-index: 220;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;

  &__mask {
    position: absolute;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    opacity: 0;
    transition: opacity 0.25s ease;

    &--in {
      opacity: 1;
    }
  }

  &__panel {
    position: relative;
    z-index: 1;
    background: #ffffff;
    border-radius: 32rpx 32rpx 0 0;
    padding: 16rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
    box-shadow: 0 -16rpx 48rpx rgba(15, 23, 42, 0.12);
    transform: translateY(100%);
    transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);

    &--in {
      transform: translateY(0);
    }
  }

  &__handle {
    width: 64rpx;
    height: 8rpx;
    margin: 0 auto 20rpx;
    border-radius: 999rpx;
    background: rgba(148, 163, 184, 0.45);
  }

  &__title {
    display: block;
    font-size: 34rpx;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 20rpx;
  }

  &__card {
    background: #f8fafc;
    border-radius: 24rpx;
    padding: 28rpx;
    border: 1rpx solid rgba(148, 163, 184, 0.18);
  }

  &__head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16rpx;
  }

  &__name {
    font-size: 32rpx;
    font-weight: 700;
    color: #0f172a;
  }

  &__time {
    font-size: 22rpx;
    color: #94a3b8;
    flex-shrink: 0;
  }

  &__intro {
    display: block;
    margin-top: 16rpx;
    font-size: 28rpx;
    color: #334155;
    line-height: 1.5;
  }

  &__act {
    display: block;
    margin-top: 12rpx;
    font-size: 24rpx;
    color: #94a3b8;
  }

  &__status {
    display: block;
    margin-top: 16rpx;
    font-size: 26rpx;
    color: #64748b;
  }

  &__actions {
    display: flex;
    gap: 20rpx;
    margin-top: 24rpx;
  }

  &__btn {
    flex: 1;
    text-align: center;
    padding: 22rpx 0;
    border-radius: 16rpx;
    font-size: 28rpx;
    font-weight: 700;

    &--ok {
      background: #6366f1;
      color: #ffffff;
    }

    &--no {
      background: #e2e8f0;
      color: #334155;
    }

    &--full {
      flex: none;
      width: 100%;
    }
  }

  &__cancel {
    margin-top: 20rpx;
    height: 80rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28rpx;
    color: #64748b;

    &--hover {
      opacity: 0.75;
    }
  }
}
</style>
