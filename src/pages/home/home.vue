<template>
  <view class="page home">
    <!-- Header -->
    <view class="home__header">
      <view class="home__header-main">
        <view class="home__brand">
          <text class="home__logo">旅聚</text>
          <text class="home__subtitle">北京 · 今天就能找到人</text>
        </view>
      </view>
      <view class="home__chips">
        <view
          v-for="chip in chips"
          :key="chip.key"
          class="chip"
          :class="{ 'chip--active': chip.key === activeChip }"
          @click="onChipClick(chip.key)"
        >
          <text>{{ chip.label }}</text>
        </view>
      </view>
    </view>

    <!-- Loading state - Skeleton -->
    <view v-if="loading" class="home__list">
      <view v-for="index in 3" :key="index" class="skeleton-card">
        <view class="skeleton-tag-row">
          <view class="skeleton-tag skeleton-tag--small"></view>
          <view class="skeleton-tag skeleton-tag--small"></view>
        </view>
        <view class="skeleton-title"></view>
        <view class="skeleton-meta">
          <view class="skeleton-meta-row"></view>
          <view class="skeleton-meta-row"></view>
        </view>
        <view class="skeleton-footer">
          <view class="skeleton-quota"></view>
          <view class="skeleton-organizer"></view>
        </view>
      </view>
    </view>

    <!-- Empty state -->
    <view v-else-if="!loading && activities.length === 0" class="home__empty">
      <wm-icon name="users" :size="96" color="#cbd5e1" />
      <text class="empty-title">暂无活动</text>
      <text class="empty-desc">看看其他时间段，或者去发布一个？</text>
    </view>

    <!-- Activity list -->
    <view v-else class="home__list">
      <view
        v-for="(item, index) in activities"
        :key="item.id"
        class="card"
        hover-class="card--hover"
        :style="{ animationDelay: `${index * 80}ms` }"
        @click="onOpenActivity(item)"
      >
        <view class="card__top">
          <view class="card__tags">
            <view class="tag tag--category" :style="{ color: item.tagColor, background: item.tagBg }">
              <text>{{ item.category }}</text>
            </view>
            <view class="tag tag--verified">
              <wm-icon name="check" :size="20" color="#10b981" />
              <text>已认证</text>
            </view>
            <view v-if="item.enrollmentStatus === 'joined'" class="tag tag--enrolled">
              <text>已报名</text>
            </view>
            <view
              v-if="item.statusKey !== 'open'"
              class="tag"
              :style="{ background: item.statusBg, color: item.statusColor }"
            >
              <text>{{ item.statusLabel }}</text>
            </view>
          </view>
          <wm-icon name="chevronRight" :size="32" color="#cbd5e1" />
        </view>

        <text class="card__title">{{ item.title }}</text>

        <view class="card__meta">
          <view class="meta-row">
            <wm-icon name="clock" :size="28" color="#6366f1" />
            <text class="meta-row__text">{{ item.time }}</text>
          </view>
          <view class="meta-row">
            <wm-icon name="mapPin" :size="28" color="#6366f1" />
            <text class="meta-row__text">{{ item.location }}</text>
            <text class="meta-row__dist">· {{ item.distance }}</text>
          </view>
        </view>

        <view class="card__footer">
          <view class="card__quota">
            <wm-icon name="users" :size="26" color="#475569" />
            <text class="card__quota-text">{{ item.joined }}/{{ item.total }}人</text>
          </view>
          <text class="card__organizer">发起人：{{ item.organizer }}</text>
        </view>
      </view>
    </view>

    <wm-tab-bar active="home" />
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import WmTabBar from '@/components/WmTabBar/WmTabBar.vue'
import { getActivities, getNearbyActivities, mapActivityCard } from '@/api'

const BEIJING_FALLBACK_LOCATION = { lat: 39.90923, lng: 116.397428 }

export default {
  components: { WmIcon, WmTabBar },
  data() {
    return {
      activeChip: 'today',
      chips: [
        { key: 'today', label: '今天' },
        { key: 'tomorrow', label: '明天' },
        { key: 'nearby', label: '距离优先' },
      ],
      activities: [],
      userLocation: null,
      loading: false,
    }
  },
  onShow() {
    this.loadActivities()
  },
  methods: {
    ensureCachedLocation() {
      const fromStorage = uni.getStorageSync('HOME_USER_LOCATION')
      if (fromStorage?.lat && fromStorage?.lng) {
        this.userLocation = { lat: Number(fromStorage.lat), lng: Number(fromStorage.lng) }
      }
    },
    getCurrentLocation() {
      return new Promise((resolve, reject) => {
        uni.getLocation({
          type: 'wgs84',
          success: (res) => {
            resolve({
              lat: Number(res.latitude),
              lng: Number(res.longitude),
            })
          },
          fail: reject,
        })
      })
    },
    async loadActivities() {
      this.loading = true
      this.activities = []
      try {
        if (this.activeChip === 'nearby') {
          this.ensureCachedLocation()
          if (!this.userLocation) {
            try {
              this.userLocation = await this.getCurrentLocation()
              uni.setStorageSync('HOME_USER_LOCATION', this.userLocation)
            } catch (e) {
              this.userLocation = BEIJING_FALLBACK_LOCATION
            }
          }
          const data = await getNearbyActivities({
            lat: this.userLocation.lat,
            lng: this.userLocation.lng,
            radiusKm: 5,
            cityCode: '110000',
            dateRange: 'all',
            sortBy: 'distance',
            page: 1,
            pageSize: 20,
          })
          this.activities = (data?.list || []).map(mapActivityCard)
          return
        }
        const dateRange =
          this.activeChip === 'today' ? 'today' : this.activeChip === 'tomorrow' ? 'tomorrow' : 'all'
        const data = await getActivities({
          cityCode: '110000',
          dateRange,
          page: 1,
          pageSize: 20,
        })
        this.activities = (data?.list || []).map(mapActivityCard)
      } catch (e) {
        this.activities = []
        uni.showToast({ title: e?.message || '活动加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    onChipClick(key) {
      if (key === this.activeChip) return
      this.activeChip = key
      this.loadActivities()
    },
    onOpenActivity(item) {
      uni.navigateTo({
        url: `/pages/activity-detail/activity-detail?id=${item.id}`,
      })
    },
  },
}
</script>

<style lang="scss" scoped>
.home {
  min-height: 100vh;
  background: #f3f4f6;

  &__header {
    position: sticky;
    top: 0;
    z-index: 10;
    padding: calc(28rpx + var(--status-bar-height, 0px) + env(safe-area-inset-top)) 28rpx 24rpx;
    background: #ffffff;
    border-bottom: 1rpx solid #e5e7eb;
    display: flex;
    flex-direction: column;
    gap: 24rpx;
  }

  &__header-main {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__brand {
    display: flex;
    flex-direction: column;
    gap: 6rpx;
    min-width: 0;
  }

  &__logo {
    font-size: 40rpx;
    font-weight: 500;
    color: #1a1a1a;
    line-height: 60rpx;
  }

  &__subtitle {
    font-size: 24rpx;
    color: #6b7280;
    line-height: 34rpx;
  }

  &__chips {
    display: flex;
    align-items: center;
    gap: 14rpx;
  }

  &__empty {
    padding: 120rpx 32rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24rpx;
  }

  &__list {
    padding: 24rpx 32rpx 40rpx;
    display: flex;
    flex-direction: column;
    gap: 24rpx;
  }
}

.empty-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #374151;
}

.empty-desc {
  font-size: 24rpx;
  color: #94a3b8;
}

.chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 54rpx;
  padding: 0 22rpx;
  border-radius: 999rpx;
  background: #f1f2f4;
  color: #1a1a1a;
  font-size: 24rpx;
  font-weight: 500;
  line-height: 1;
  transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1), color 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.1s;

  &:active {
    transform: scale(0.95);
  }

  &--active {
    background: #6366f1;
    color: #ffffff;
    box-shadow: 0 4rpx 12rpx rgba(99, 102, 241, 0.3);
  }
}

.skeleton-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 28rpx 28rpx 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(15, 23, 42, 0.04);
}

.skeleton-tag-row {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.skeleton-tag {
  height: 36rpx;
  border-radius: 8rpx;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-tag--small {
  width: 100rpx;
}

.skeleton-title {
  height: 40rpx;
  width: 80%;
  border-radius: 8rpx;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  margin-bottom: 18rpx;
}

.skeleton-meta {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  margin-bottom: 22rpx;
}

.skeleton-meta-row {
  height: 28rpx;
  width: 60%;
  border-radius: 8rpx;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-footer {
  padding-top: 20rpx;
  border-top: 1rpx dashed #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.skeleton-quota {
  height: 26rpx;
  width: 120rpx;
  border-radius: 8rpx;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-organizer {
  height: 22rpx;
  width: 160rpx;
  border-radius: 8rpx;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 28rpx 28rpx 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(15, 23, 42, 0.04);
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  animation: fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) backwards;

  &--hover {
    transform: scale(0.98);
    box-shadow: 0 8rpx 24rpx rgba(15, 23, 42, 0.08);
  }

  &__top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__tags {
    display: flex;
    gap: 12rpx;
    align-items: center;
  }

  &__title {
    display: block;
    margin-top: 16rpx;
    font-size: 34rpx;
    font-weight: 600;
    color: #0f172a;
    line-height: 1.3;
  }

  &__meta {
    margin-top: 18rpx;
    display: flex;
    flex-direction: column;
    gap: 10rpx;
  }

  &__footer {
    margin-top: 22rpx;
    padding-top: 20rpx;
    border-top: 1rpx dashed #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__quota {
    display: flex;
    align-items: center;
    gap: 8rpx;
  }

  &__quota-text {
    font-size: 26rpx;
    color: #475569;
    font-weight: 500;
  }

  &__organizer {
    font-size: 22rpx;
    color: #94a3b8;
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  height: 36rpx;
  padding: 0 14rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
  font-weight: 600;

  &--verified {
    background: #ecfdf5;
    color: #059669;
  }

  &--enrolled {
    background: #eef2ff;
    color: #4f46e5;
  }
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 10rpx;

  &__text {
    font-size: 24rpx;
    color: #475569;
  }

  &__dist {
    font-size: 22rpx;
    color: #94a3b8;
  }
}
</style>
