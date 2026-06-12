<template>
  <view class="page friend-list">
    <view class="friend-list__header">
      <view class="friend-list__back" @click="goBack">
        <wm-icon name="chevronLeft" :size="36" color="#0f172a" />
      </view>
      <text class="friend-list__title">好友列表</text>
      <view class="friend-list__placeholder" />
    </view>

    <view class="friend-list__hint">
      <text>通过私聊申请并同意后，即可成为好友</text>
    </view>

    <view v-if="loading" class="friend-list__state"><text>加载中…</text></view>
    <view v-else-if="!friends.length" class="friend-list__state">
      <text>还没有好友</text>
      <text class="friend-list__state-sub">可在活动群聊中申请私聊，对方同意后会出现在这里</text>
    </view>
    <view v-else class="friend-list__body">
      <view
        v-for="item in friends"
        :key="item.threadId"
        class="friend-row"
        hover-class="friend-row--hover"
        @click="openChat(item)"
      >
        <view class="friend-row__avatar">
          <image
            v-if="item.avatarUrl"
            class="friend-row__avatar-img"
            :src="item.avatarDisplaySrc"
            mode="aspectFill"
          />
          <text v-else class="friend-row__avatar-text">{{ item.initial }}</text>
        </view>
        <view class="friend-row__main">
          <text class="friend-row__name">{{ item.nickname }}</text>
          <text class="friend-row__sub">点击发消息</text>
        </view>
        <view class="friend-row__profile" @click.stop="openProfile(item)">
          <text>资料</text>
        </view>
        <view class="friend-row__more" @click.stop="openManage(item)">
          <text>···</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import { getDirectChats } from '@/api'
import { displayAvatarUrl } from '@/utils/avatarDisplay'
import { showFriendManageSheet } from '@/utils/friendRelationship'

export default {
  components: { WmIcon },
  data() {
    return {
      loading: true,
      friends: [],
      page: 1,
      total: 0,
      hasMore: false,
      loadingMore: false,
    }
  },
  onShow() {
    this.load(true)
  },
  onReachBottom() {
    if (!this.hasMore || this.loadingMore || this.loading) return
    this.loadingMore = true
    this.page += 1
    this.load(false).finally(() => {
      this.loadingMore = false
    })
  },
  methods: {
    goBack() {
      uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/profile/profile' }) })
    },
    mapFriend(item) {
      const nickname = item.peerNickname || '用户'
      return {
        threadId: item.threadId,
        userId: item.peerUserId,
        nickname,
        avatarUrl: item.peerAvatarUrl || '',
        avatarDisplaySrc: displayAvatarUrl(item.peerAvatarUrl),
        initial: String(nickname).slice(0, 1),
      }
    },
    async load(reset = true) {
      if (reset) {
        this.loading = true
        this.page = 1
        this.friends = []
      }
      try {
        const data = await getDirectChats({ page: this.page, pageSize: 50 })
        const rows = (data?.list || []).map((item) => this.mapFriend(item))
        this.total = Number(data?.total) || 0
        this.friends = reset ? rows : [...this.friends, ...rows]
        this.hasMore = this.friends.length < this.total
      } catch (e) {
        if (reset) this.friends = []
        uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    openChat(item) {
      if (!item?.threadId) return
      const ava = item.avatarUrl ? '&peerAvatarUrl=' + encodeURIComponent(item.avatarUrl) : ''
      const uid = item.userId ? '&peerUserId=' + encodeURIComponent(item.userId) : ''
      uni.navigateTo({
        url:
          '/pages/direct-chat-detail/direct-chat-detail?threadId=' +
          encodeURIComponent(item.threadId) +
          '&peerNickname=' +
          encodeURIComponent(item.nickname || '') +
          uid +
          ava,
      })
    },
    openProfile(item) {
      if (!item?.userId) return
      uni.navigateTo({
        url: '/pages/user-public/user-public?userId=' + encodeURIComponent(item.userId),
      })
    },
    openManage(item) {
      if (!item?.threadId || !item?.userId) return
      showFriendManageSheet({
        threadId: item.threadId,
        userId: item.userId,
        nickname: item.nickname,
        onRemoved: () => {
          this.friends = this.friends.filter((f) => f.threadId !== item.threadId)
          this.total = Math.max(0, this.total - 1)
        },
        onBlocked: () => {
          this.friends = this.friends.filter((f) => f.threadId !== item.threadId)
          this.total = Math.max(0, this.total - 1)
        },
      })
    },
  },
}
</script>

<style lang="scss" scoped>
.friend-list {
  min-height: 100vh;
  background: transparent;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));

  &__header {
    position: sticky;
    top: 0;
    z-index: 10;
    height: calc(96rpx + var(--status-bar-height, 0px) + env(safe-area-inset-top));
    padding: calc(var(--status-bar-height, 0px) + env(safe-area-inset-top)) 24rpx 0;
    background: $wm-sticky-header-gradient;
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

  &__title {
    font-size: 32rpx;
    font-weight: 700;
    color: #0f172a;
  }

  &__hint {
    padding: 20rpx 32rpx 8rpx;
    font-size: 24rpx;
    color: #94a3b8;
    line-height: 1.5;
  }

  &__state {
    padding: 80rpx 48rpx;
    text-align: center;
    font-size: 28rpx;
    color: #94a3b8;
    line-height: 1.6;
    display: flex;
    flex-direction: column;
    gap: 12rpx;
  }

  &__state-sub {
    font-size: 24rpx;
    color: #cbd5e1;
  }

  &__body {
    padding: 16rpx 24rpx 0;
    display: flex;
    flex-direction: column;
    gap: 16rpx;
  }
}

.friend-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  background: #ffffff;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(15, 23, 42, 0.04);

  &--hover {
    background: #f8fafc;
  }

  &__avatar {
    width: 88rpx;
    height: 88rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, #6366f1, #0d9488);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    flex-shrink: 0;
  }

  &__avatar-img {
    width: 100%;
    height: 100%;
  }

  &__avatar-text {
    font-size: 34rpx;
    font-weight: 700;
    color: #ffffff;
  }

  &__main {
    flex: 1;
    min-width: 0;
  }

  &__name {
    display: block;
    font-size: 32rpx;
    font-weight: 700;
    color: #0f172a;
  }

  &__sub {
    display: block;
    margin-top: 6rpx;
    font-size: 24rpx;
    color: #94a3b8;
  }

  &__profile {
    flex-shrink: 0;
    padding: 12rpx 20rpx;
    border-radius: 999rpx;
    background: #f1f5f9;
    font-size: 24rpx;
    color: #64748b;
  }

  &__more {
    flex-shrink: 0;
    width: 56rpx;
    height: 56rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32rpx;
    color: #94a3b8;
    letter-spacing: 2rpx;
  }
}
</style>
