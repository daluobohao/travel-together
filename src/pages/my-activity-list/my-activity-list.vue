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
        <text class="my-activity-page__summary-sub">
          共 {{ activities.length }} 项：城市大群 {{ cityHallItems.length }} · 活动 {{ eventItems.length }}
        </text>
      </view>

      <view v-if="cityHallItems.length" class="my-activity-page__block">
        <text class="my-activity-page__block-title">城市大群</text>
        <text class="my-activity-page__block-desc">同城交流群，与活动列表区分展示</text>
        <view class="my-activity-page__list">
          <view
            v-for="item in cityHallItems"
            :key="item.id"
            class="activity activity--city-hall"
            hover-class="activity--hover"
            @click="openActivity(item)"
          >
            <view class="activity__main">
              <view class="activity__title-row">
                <text class="activity__badge">同城</text>
                <text class="activity__title">{{ item.title }}</text>
              </view>
              <text class="activity__meta">{{ item.time }} · {{ item.location }}</text>
            </view>
            <view class="activity__right">
              <view class="activity__status activity__status--city-hall">
                <text>已加入</text>
              </view>
              <wm-icon name="chevronRight" :size="28" color="#cbd5e1" />
            </view>
          </view>
        </view>
      </view>

      <view v-if="eventItems.length" class="my-activity-page__block">
        <text class="my-activity-page__block-title">活动</text>
        <view class="my-activity-page__list">
          <view
            v-for="item in eventItems"
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

      <view v-if="!activities.length" class="my-activity-page__empty">
        <text>暂无已参加的活动或城市大群</text>
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
  computed: {
    cityHallItems() {
      return this.activities.filter((x) => x.activityKind === 'city_hall')
    },
    eventItems() {
      return this.activities.filter((x) => x.activityKind !== 'city_hall')
    },
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
          activityKind: card.activityKind || 'event',
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
      const id = encodeURIComponent(item.id)
      if (item.activityKind === 'city_hall') {
        uni.navigateTo({
          url: `/pages/chat-detail/chat-detail?id=${id}`,
        })
      } else {
        uni.navigateTo({
          url: `/pages/activity-detail/activity-detail?id=${id}`,
        })
      }
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

  &__block {
    margin-bottom: 28rpx;
  }

  &__block-title {
    display: block;
    font-size: 28rpx;
    font-weight: 700;
    color: #334155;
    margin-bottom: 8rpx;
    padding-left: 4rpx;
  }

  &__block-desc {
    display: block;
    font-size: 22rpx;
    color: #94a3b8;
    margin-bottom: 14rpx;
    padding-left: 4rpx;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 14rpx;
  }

  &__empty {
    padding: 80rpx 24rpx;
    text-align: center;
    font-size: 26rpx;
    color: #94a3b8;
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

  &--city-hall {
    border: 1rpx solid rgba(99, 102, 241, 0.25);
    background: linear-gradient(135deg, #fafaff 0%, #ffffff 55%);
  }

  &--hover {
    transform: scale(0.99);
  }

  &__main {
    flex: 1;
    min-width: 0;
  }

  &__title-row {
    display: flex;
    align-items: center;
    gap: 12rpx;
    flex-wrap: wrap;
  }

  &__badge {
    flex-shrink: 0;
    font-size: 20rpx;
    font-weight: 700;
    color: #4f46e5;
    background: rgba(99, 102, 241, 0.12);
    padding: 4rpx 14rpx;
    border-radius: 999rpx;
  }

  &__title {
    display: block;
    font-size: 30rpx;
    font-weight: 600;
    color: #0f172a;
    flex: 1;
    min-width: 0;
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

    &--city-hall {
      background: #ede9fe;
      color: #5b21b6;
    }
  }
}
</style>
