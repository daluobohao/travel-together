<template>
  <view class="page hosted">
    <view class="hosted__header">
      <view class="hosted__back" @click="goBack">
        <wm-icon name="chevronLeft" :size="34" color="#0f172a" />
      </view>
      <text class="hosted__title">发起活动列表</text>
      <view class="hosted__placeholder" />
    </view>

    <view class="hosted__content">
      <view class="hosted__summary">
        <text class="hosted__summary-title">我发起的活动</text>
        <text class="hosted__summary-sub">共 {{ hostedActivities.length }} 场，点击进入发布页进行管理</text>
      </view>

      <view class="hosted__list">
        <view
          v-for="item in hostedActivities"
          :key="item.id"
          class="activity"
          hover-class="activity--hover"
          @click="openPublish(item)"
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

      <view class="hosted__new-btn" @click="openPublish()">
        <text>+ 去发布新活动</text>
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
      hostedActivities: [],
    }
  },
  onShow() {
    this.loadHostedActivities()
  },
  methods: {
    async loadHostedActivities() {
      const data = await getMyActivities({ role: 'organized', page: 1, pageSize: 50 })
      this.hostedActivities = (data?.list || []).map((item) => {
        const card = mapActivityCard(item)
        return {
          id: Number(card.activityId),
          title: card.title,
          time: card.time,
          location: card.location,
          statusKey: 'recruiting',
          statusLabel: '招募中',
        }
      })
    },
    goBack() {
      uni.navigateBack()
    },
    openPublish() {
      uni.navigateTo({
        url: '/pages/publish/publish',
      })
    },
  },
}
</script>

<style lang="scss" scoped>
.hosted {
  min-height: 100vh;
  background: #f3f4f6;

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

  &__new-btn {
    margin-top: 22rpx;
    height: 84rpx;
    border-radius: 16rpx;
    background: #6366f1;
    color: #ffffff;
    font-size: 28rpx;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
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

    &--recruiting {
      background: #eef2ff;
      color: #6366f1;
    }

    &--ended {
      background: #f1f5f9;
      color: #64748b;
    }
  }
}
</style>
