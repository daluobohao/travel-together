<template>
  <view class="page dm-req">
    <view class="dm-req__header">
      <view class="dm-req__back" @click="goBack">
        <wm-icon name="chevronLeft" :size="36" color="#0f172a" />
      </view>
      <text class="dm-req__title">私聊申请</text>
      <view class="dm-req__placeholder" />
    </view>

    <view class="dm-req__tabs">
      <text class="tab" :class="{ 'tab--on': tab === 'incoming' }" @click="tab = 'incoming'; load()">收到的</text>
      <text class="tab" :class="{ 'tab--on': tab === 'outgoing' }" @click="tab = 'outgoing'; load()">发出的</text>
    </view>

    <view v-if="loading" class="dm-req__state"><text>加载中…</text></view>
    <view v-else-if="!items.length" class="dm-req__state"><text>暂无待处理申请</text></view>
    <view v-else class="dm-req__list">
      <view v-for="it in items" :key="it.requestId" class="card">
        <view class="card__head">
          <text class="card__name">{{ tab === 'incoming' ? it.fromUser.nickname : it.toUser.nickname }}</text>
          <text class="card__time">{{ relTime(it.createdAt) }}</text>
        </view>
        <text v-if="it.introText" class="card__intro">「{{ it.introText }}」</text>
        <text class="card__act">{{ it.activityId }}</text>
        <view v-if="tab === 'incoming' && it.status === 'pending'" class="card__actions">
          <view class="btn btn--ok" @click="accept(it)"><text>同意</text></view>
          <view class="btn btn--no" @click="reject(it)"><text>拒绝</text></view>
        </view>
        <view v-else-if="tab === 'outgoing' && it.status === 'pending'" class="card__actions">
          <view class="btn btn--no btn--full" @click="cancelReq(it)"><text>撤回申请</text></view>
        </view>
        <text v-else class="card__status">{{ statusLabel(it.status) }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import { acceptDmRequest, cancelDmRequest, listDmRequests, rejectDmRequest } from '@/api'

export default {
  components: { WmIcon },
  data() {
    return {
      tab: 'incoming',
      items: [],
      loading: false,
    }
  },
  onShow() {
    this.load()
  },
  methods: {
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
    statusLabel(s) {
      const m = { pending: '待处理', accepted: '已同意', rejected: '已拒绝', cancelled: '已撤回' }
      return m[s] || s
    },
    async load() {
      this.loading = true
      try {
        const data = await listDmRequests({ direction: this.tab, status: 'pending', page: 1, pageSize: 50 })
        this.items = data?.list || []
      } catch (e) {
        this.items = []
        uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    async accept(it) {
      try {
        const data = await acceptDmRequest(it.requestId)
        uni.showToast({ title: '已同意', icon: 'success' })
        const nick = it.fromUser?.nickname || ''
        uni.navigateTo({
          url:
            '/pages/direct-chat-detail/direct-chat-detail?threadId=' +
            encodeURIComponent(data.threadId) +
            '&peerNickname=' +
            encodeURIComponent(nick),
        })
      } catch (e) {
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
      }
    },
    async reject(it) {
      try {
        await rejectDmRequest(it.requestId)
        uni.showToast({ title: '已拒绝', icon: 'none' })
        await this.load()
      } catch (e) {
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
      }
    },
    async cancelReq(it) {
      try {
        await cancelDmRequest(it.requestId)
        uni.showToast({ title: '已撤回', icon: 'none' })
        await this.load()
      } catch (e) {
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
      }
    },
    goBack() {
      uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/messages/messages' }) })
    },
  },
}
</script>

<style lang="scss" scoped>
.dm-req {
  min-height: 100vh;
  background: #f3f4f6;

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

  &__title {
    font-size: 32rpx;
    font-weight: 600;
    color: #0f172a;
  }

  &__tabs {
    display: flex;
    background: #fff;
    border-bottom: 1rpx solid #e5e7eb;
  }

  &__state {
    padding: 80rpx 32rpx;
    text-align: center;
    font-size: 28rpx;
    color: #94a3b8;
  }

  &__list {
    padding: 24rpx;
    display: flex;
    flex-direction: column;
    gap: 20rpx;
  }
}

.tab {
  flex: 1;
  text-align: center;
  padding: 28rpx 0;
  font-size: 28rpx;
  color: #64748b;

  &--on {
    color: #6366f1;
    font-weight: 700;
    border-bottom: 4rpx solid #6366f1;
  }
}

.card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 28rpx;
  box-shadow: 0 4rpx 16rpx rgba(15, 23, 42, 0.04);

  &__head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__name {
    font-size: 32rpx;
    font-weight: 600;
    color: #0f172a;
  }

  &__time {
    font-size: 22rpx;
    color: #94a3b8;
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

  &__actions {
    display: flex;
    gap: 20rpx;
    margin-top: 24rpx;
  }

  &__status {
    margin-top: 16rpx;
    font-size: 26rpx;
    color: #94a3b8;
  }
}

.btn {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  border-radius: 14rpx;
  font-size: 28rpx;
  font-weight: 600;

  &--ok {
    background: #6366f1;
    color: #ffffff;
  }

  &--no {
    background: #f1f5f9;
    color: #334155;
  }

  &--full {
    flex: none;
    width: 100%;
  }
}
</style>
