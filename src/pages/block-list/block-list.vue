<template>
  <view class="page block-list">
    <view class="block-list__header">
      <view class="block-list__back" @click="goBack">
        <wm-icon name="chevronLeft" :size="36" color="#0f172a" />
      </view>
      <text class="block-list__title">拉黑列表</text>
      <view class="block-list__placeholder" />
    </view>

    <view class="block-list__hint">
      <text>拉黑后对方无法给你发私聊；取消拉黑后可恢复正常互动</text>
    </view>

    <view v-if="loading" class="block-list__state"><text>加载中…</text></view>
    <view v-else-if="!items.length" class="block-list__state">
      <text>暂无拉黑用户</text>
    </view>
    <view v-else class="block-list__body">
      <view v-for="item in items" :key="item.blockedUserId" class="block-row">
        <view class="block-row__avatar">
          <image
            v-if="item.avatarDisplaySrc"
            class="block-row__avatar-img"
            :src="item.avatarDisplaySrc"
            mode="aspectFill"
          />
          <text v-else class="block-row__avatar-text">{{ item.initial }}</text>
        </view>
        <view class="block-row__main">
          <text class="block-row__name">{{ item.nickname }}</text>
          <text class="block-row__sub">已拉黑</text>
        </view>
        <view class="block-row__action" @click="confirmUnblock(item)">
          <text>取消拉黑</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import { getBlockList, unblockUser } from '@/api'
import { displayAvatarUrl } from '@/utils/avatarDisplay'

export default {
  components: { WmIcon },
  data() {
    return {
      loading: true,
      items: [],
    }
  },
  onShow() {
    this.load()
  },
  methods: {
    goBack() {
      uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/profile/profile' }) })
    },
    mapItem(row) {
      const nickname = row.nickname || '用户'
      return {
        blockedUserId: row.blockedUserId,
        nickname,
        avatarDisplaySrc: displayAvatarUrl(row.avatarUrl),
        initial: String(nickname).slice(0, 1),
      }
    },
    async load() {
      this.loading = true
      try {
        const data = await getBlockList({ page: 1, pageSize: 50 })
        this.items = (data?.list || []).map((row) => this.mapItem(row))
      } catch (e) {
        this.items = []
        uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    confirmUnblock(item) {
      if (!item?.blockedUserId) return
      uni.showModal({
        title: '取消拉黑',
        content: `确定取消拉黑「${item.nickname || '该用户'}」？`,
        success: async (res) => {
          if (!res.confirm) return
          try {
            await unblockUser(item.blockedUserId)
            this.items = this.items.filter((x) => x.blockedUserId !== item.blockedUserId)
            uni.showToast({ title: '已取消拉黑', icon: 'success' })
          } catch (e) {
            uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
          }
        },
      })
    },
  },
}
</script>

<style lang="scss" scoped>
.block-list {
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
  }

  &__body {
    padding: 16rpx 24rpx 0;
    display: flex;
    flex-direction: column;
    gap: 16rpx;
  }
}

.block-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  background: #ffffff;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(15, 23, 42, 0.04);

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

  &__action {
    flex-shrink: 0;
    padding: 12rpx 20rpx;
    border-radius: 999rpx;
    background: #fef2f2;
    font-size: 24rpx;
    color: #ef4444;
  }
}
</style>
