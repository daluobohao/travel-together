<template>
  <view class="page all-activities">
    <view class="all-activities__header">
      <view class="all-activities__back" @click="goBack">
        <wm-icon name="chevronLeft" :size="34" color="#0f172a" />
      </view>
      <text class="all-activities__title">全部活动</text>
      <view class="all-activities__placeholder" />
    </view>

    <view class="all-activities__body">
      <view class="summary">
        <text class="summary__title">发现更多同城活动</text>
        <text class="summary__sub">共 {{ activities.length }} 场，点击可查看详情</text>
      </view>

      <view class="list">
        <view
          v-for="item in activities"
          :key="item.id"
          class="card"
          hover-class="card--hover"
          @click="openActivity(item)"
        >
          <view class="card__top">
            <view class="tag-row">
              <view class="tag" :style="{ color: item.tagColor, background: item.tagBg }">
                <text>{{ item.category }}</text>
              </view>
              <view
                v-if="item.statusKey !== 'open'"
                class="tag"
                :style="{ background: item.statusBg, color: item.statusColor }"
              >
                <text>{{ item.statusLabel }}</text>
              </view>
            </view>
            <wm-icon name="chevronRight" :size="30" color="#cbd5e1" />
          </view>

          <text class="card__title">{{ item.title }}</text>

          <view class="meta-row">
            <wm-icon name="clock" :size="26" color="#6366f1" />
            <text>{{ item.time }}</text>
          </view>
          <view class="meta-row">
            <wm-icon name="mapPin" :size="26" color="#6366f1" />
            <text>{{ item.location }}</text>
            <text class="meta-row__dist">· {{ item.distance }}</text>
          </view>

          <view class="card__footer">
            <text>{{ item.joined }}/{{ item.total }}人</text>
            <text>发起人：{{ item.organizer }}</text>
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
    this.loadActivities()
  },
  methods: {
    async loadActivities() {
      const data = await getActivities({ cityCode: '110000', page: 1, pageSize: 50 })
      this.activities = (data?.list || []).map(mapActivityCard)
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
.all-activities {
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

  &__body {
    padding: 24rpx;
  }
}

.summary {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 18rpx;

  &__title {
    display: block;
    font-size: 30rpx;
    color: #0f172a;
    font-weight: 700;
  }

  &__sub {
    display: block;
    margin-top: 8rpx;
    font-size: 24rpx;
    color: #94a3b8;
  }
}

.list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(15, 23, 42, 0.04);

  &--hover {
    transform: scale(0.99);
  }

  &__top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__title {
    display: block;
    margin-top: 12rpx;
    font-size: 32rpx;
    font-weight: 600;
    color: #0f172a;
  }

  &__footer {
    margin-top: 14rpx;
    padding-top: 14rpx;
    border-top: 1rpx dashed #e2e8f0;
    display: flex;
    justify-content: space-between;
    font-size: 22rpx;
    color: #64748b;
  }
}

.tag {
  display: inline-flex;
  align-items: center;
  height: 36rpx;
  padding: 0 14rpx;
  border-radius: 10rpx;
  font-size: 20rpx;
  font-weight: 600;
}

.tag-row {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  flex-wrap: wrap;
}

.meta-row {
  margin-top: 10rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 24rpx;
  color: #475569;

  &__dist {
    color: #94a3b8;
  }
}
</style>
