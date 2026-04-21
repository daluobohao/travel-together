<template>
  <view class="page history-page">
    <view class="history-page__header">
      <view class="history-page__back" @click="goBack">
        <wm-icon name="chevronLeft" :size="34" color="#0f172a" />
      </view>
      <text class="history-page__title">历史活动列表</text>
      <view class="history-page__placeholder" />
    </view>

    <view class="history-page__content">
      <view class="history-page__summary">
        <text class="history-page__summary-title">已结束活动</text>
        <text class="history-page__summary-sub">共 {{ activities.length }} 场，点击查看活动详情</text>
      </view>

      <view class="history-page__list">
        <view
          v-for="item in activities"
          :key="item.id"
          class="activity"
          hover-class="activity--hover"
          @click="openActivity(item)"
        >
          <view class="activity__main">
            <text class="activity__title">{{ item.title }}</text>
            <text class="activity__meta">{{ item.time }} · {{ item.location }}</text>
          </view>
          <view class="activity__right">
            <view class="activity__status"><text>已结束</text></view>
            <wm-icon name="chevronRight" :size="28" color="#cbd5e1" />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import { getActivities, mapActivityCard } from '@/api'

export default {
  components: { WmIcon },
  data() {
    return {
      activities: [],
    }
  },
  onShow() {
    this.loadHistory()
  },
  methods: {
    async loadHistory() {
      const data = await getActivities({ cityCode: '110000', page: 1, pageSize: 50 })
      this.activities = (data?.list || [])
        .filter((x) => x.activityStatus === 'ended' || x.activityStatus === 'cancelled')
        .map((x) => {
          const card = mapActivityCard(x)
          return {
            id: String(card.activityId || ''),
            title: card.title,
            time: card.time,
            location: card.location,
          }
        })
    },
    goBack() {
      uni.navigateBack()
    },
    openActivity(item) {
      uni.navigateTo({
        url: `/pages/activity-detail/activity-detail?id=${item.id}`,
      })
    },
  },
}
</script>

<style lang="scss" scoped>
.history-page {
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

  &__content {
    padding: 24rpx;
  }

  &__summary {
    background: #ffffff;
    border-radius: 20rpx;
    padding: 24rpx;
    margin-bottom: 18rpx;
  }

  &__summary-title {
    display: block;
    font-size: 30rpx;
    font-weight: 700;
    color: #0f172a;
  }

  &__summary-sub {
    display: block;
    margin-top: 8rpx;
    font-size: 24rpx;
    color: #94a3b8;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 14rpx;
  }
}

.activity {
  background: #ffffff;
  border-radius: 18rpx;
  padding: 22rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4rpx 16rpx rgba(15, 23, 42, 0.04);

  &--hover {
    transform: scale(0.99);
  }

  &__main {
    flex: 1;
    min-width: 0;
  }

  &__title {
    display: block;
    font-size: 30rpx;
    font-weight: 600;
    color: #0f172a;
  }

  &__meta {
    display: block;
    margin-top: 8rpx;
    font-size: 22rpx;
    color: #94a3b8;
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 10rpx;
    margin-left: 12rpx;
  }

  &__status {
    font-size: 20rpx;
    font-weight: 600;
    padding: 4rpx 12rpx;
    border-radius: 8rpx;
    background: #f1f5f9;
    color: #64748b;
  }
}
</style>
