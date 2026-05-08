<template>
  <view class="page my-activity-page">
    <view class="my-activity-page__header">
      <view class="my-activity-page__back" @click="goBack">
        <wm-icon name="chevronLeft" :size="34" color="#0f172a" />
      </view>
      <text class="my-activity-page__title">我的活动列表</text>
      <view class="my-activity-page__placeholder" />
    </view>

    <view class="my-activity-page__content">
      <view class="my-activity-page__summary">
        <text class="my-activity-page__summary-title">我的活动</text>
        <text class="my-activity-page__summary-sub">共 {{ activities.length }} 场，点击可查看活动详情</text>
      </view>

      <view class="my-activity-page__list">
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
            <view class="activity__status" :class="`activity__status--${item.statusKey}`">
              <text>{{ item.statusLabel }}</text>
            </view>
            <wm-icon name="chevronRight" :size="28" color="#cbd5e1" />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import { getMyActivities, mapActivityCard } from '@/api'

export default {
  components: { WmIcon },
  data() {
    return {
      activities: [],
    }
  },
  onShow() {
    this.loadActivities()
  },
  methods: {
    async loadActivities() {
      const data = await getMyActivities({ role: 'joined', page: 1, pageSize: 50 })
      this.activities = (data?.list || []).map((item) => {
        const card = mapActivityCard(item)
        return {
          id: String(card.activityId || ''),
          title: card.title,
          time: card.time,
          location: card.location,
          statusKey: 'enrolled',
          statusLabel: '已报名',
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
.my-activity-page {
  min-height: 100vh;
  background: transparent;

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

    &--ongoing {
      background: #ecfdf5;
      color: #059669;
    }

    &--enrolled {
      background: #eef2ff;
      color: #6366f1;
    }
  }
}
</style>
