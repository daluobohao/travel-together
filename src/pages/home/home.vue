<template>
  <view class="page home">
    <!-- Header -->
    <view class="home__header">
      <view class="home__header-main">
        <view class="home__brand">
          <text class="home__logo">旅聚</text>
          <text class="home__subtitle">{{ citySubtitle }}</text>
        </view>
      </view>
      <view class="home__search" @click="onTapSearch">
        <view class="home__search-inner">
          <wm-icon name="search" :size="32" color="#94a3b8" />
          <text class="home__search-text">{{ searchBarText }}</text>
        </view>
        <view
          v-if="hasSearchAnchor"
          class="home__search-clear"
          @click.stop="onClearSearch"
        >
          <wm-icon name="close" :size="28" color="#64748b" />
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
            <text v-if="item.distance" class="meta-row__dist">· {{ item.distance }}</text>
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
import {
  clearHomeSearchAnchor,
  getHomeActivityAnchor,
  getHomeSearchAnchorSync,
} from '@/utils/homeCity'

export default {
  components: { WmIcon, WmTabBar },
  data() {
    return {
      activeChip: 'today',
      chips: [
        { key: 'today', label: '今天' },
        { key: 'tomorrow', label: '明天' },
        { key: 'nearby', label: '距离优先' },
        { key: 'all', label: '全部' },
      ],
      activities: [],
      activityAnchor: null,
      hasSearchAnchor: false,
      loading: false,
    }
  },
  computed: {
    citySubtitle() {
      const name =
        (this.activityAnchor?.displayName && String(this.activityAnchor.displayName).trim()) ||
        '定位中'
      return `${name} · 今天就能找到人`
    },
    searchBarText() {
      if (this.hasSearchAnchor && this.activityAnchor?.displayName) {
        return this.activityAnchor.displayName
      }
      return '搜索地点，查看附近活动'
    },
  },
  onShow() {
    this.syncSearchAnchorUi()
    this.loadActivities()
  },
  methods: {
    syncSearchAnchorUi() {
      const search = getHomeSearchAnchorSync()
      this.hasSearchAnchor = !!search
      if (search) {
        this.activityAnchor = {
          source: 'search',
          lat: search.lat,
          lng: search.lng,
          cityCode: search.cityCode,
          displayName: search.displayName,
          cityName: search.displayName,
        }
      }
    },
    async ensureActivityAnchor() {
      const anchor = await getHomeActivityAnchor()
      this.activityAnchor = anchor
      this.hasSearchAnchor = anchor.source === 'search'
      return anchor
    },
    onTapSearch() {
      uni.navigateTo({ url: '/pages/location-picker/location-picker?from=home' })
    },
    async onClearSearch() {
      clearHomeSearchAnchor()
      this.hasSearchAnchor = false
      await this.loadActivities()
    },
    async loadActivities() {
      this.loading = true
      this.activities = []
      try {
        const anchor = await this.ensureActivityAnchor()
        const { lat, lng, cityCode } = anchor
        if (this.activeChip === 'nearby') {
          const data = await getNearbyActivities({
            lat,
            lng,
            radiusKm: 5,
            cityCode,
            dateRange: 'all',
            sortBy: 'distance',
            page: 1,
            pageSize: 20,
          })
          this.activities = (data?.list || []).map(mapActivityCard)
          return
        }
        const dateRange =
          this.activeChip === 'today'
            ? 'today'
            : this.activeChip === 'tomorrow'
              ? 'tomorrow'
              : 'all'
        const data = await getActivities({
          cityCode,
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
  background: transparent;

  &__header {
    position: sticky;
    top: 0;
    z-index: 10;
    padding: calc(32rpx + var(--status-bar-height, 0px) + env(safe-area-inset-top)) 32rpx 28rpx;
    background: $wm-sticky-header-gradient;
    border-bottom: none;
    box-shadow: 0 12rpx 40rpx rgba(2, 132, 199, 0.06);
    display: flex;
    flex-direction: column;
    gap: 28rpx;
  }

  &__header-main {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__brand {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
    min-width: 0;
  }

  &__logo {
    font-size: 48rpx;
    font-weight: 800;
    background: $wm-gradient-hero;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: 2rpx;
    line-height: 64rpx;
  }

  &__subtitle {
    font-size: 26rpx;
    color: $wm-text-3;
    line-height: 36rpx;
    font-weight: 500;
  }

  &__search {
    display: flex;
    align-items: center;
    gap: 12rpx;
  }

  &__search-inner {
    flex: 1;
    min-width: 0;
    height: 72rpx;
    border-radius: $wm-radius-lg;
    background: #ffffff;
    border: $wm-card-edge;
    box-shadow: $wm-shadow-sm;
    padding: 0 24rpx;
    display: flex;
    align-items: center;
    gap: 14rpx;
  }

  &__search-text {
    flex: 1;
    min-width: 0;
    font-size: 28rpx;
    color: $wm-text-2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__search-clear {
    flex-shrink: 0;
    width: 64rpx;
    height: 64rpx;
    border-radius: 50%;
    background: #ffffff;
    border: $wm-card-edge;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__chips {
    display: flex;
    align-items: center;
    gap: 16rpx;
    overflow-x: auto;
    padding-bottom: 4rpx;
  }

  &__empty {
    padding: 140rpx 32rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 28rpx;
  }

  &__list {
    padding: 28rpx 32rpx 48rpx;
    display: flex;
    flex-direction: column;
    gap: 28rpx;
  }
}

.empty-title {
  font-size: 34rpx;
  font-weight: 700;
  color: $wm-text-1;
}

.empty-desc {
  font-size: 26rpx;
  color: $wm-text-3;
}

.chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 60rpx;
  padding: 0 28rpx;
  border-radius: 999rpx;
  background: #fafafa;
  color: $wm-text-2;
  font-size: 26rpx;
  font-weight: 500;
  line-height: 1;
  border: 2rpx solid transparent;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  flex-shrink: 0;

  &:active {
    transform: scale(0.95);
  }

  &--active {
    background: $wm-gradient-primary;
    color: #ffffff;
    box-shadow: $wm-shadow-glow;
    border-color: rgba(255, 255, 255, 0.3);
  }
}

.skeleton-card {
  background: #ffffff;
  border-radius: $wm-radius-lg;
  padding: 32rpx 32rpx 28rpx;
  border: $wm-card-edge;
  box-shadow: $wm-shadow-md;
}

.skeleton-tag-row {
  display: flex;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.skeleton-tag {
  height: 40rpx;
  border-radius: $wm-radius-sm;
  background: linear-gradient(90deg, #f8fafc 25%, #e2e8f0 50%, #f8fafc 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-tag--small {
  width: 120rpx;
}

.skeleton-title {
  height: 44rpx;
  width: 85%;
  border-radius: $wm-radius-sm;
  background: linear-gradient(90deg, #f8fafc 25%, #e2e8f0 50%, #f8fafc 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  margin-bottom: 20rpx;
}

.skeleton-meta {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-bottom: 24rpx;
}

.skeleton-meta-row {
  height: 32rpx;
  width: 65%;
  border-radius: $wm-radius-sm;
  background: linear-gradient(90deg, #f8fafc 25%, #e2e8f0 50%, #f8fafc 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-footer {
  padding-top: 24rpx;
  border-top: 2rpx dashed #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.skeleton-quota {
  height: 28rpx;
  width: 140rpx;
  border-radius: $wm-radius-sm;
  background: linear-gradient(90deg, #f8fafc 25%, #e2e8f0 50%, #f8fafc 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-organizer {
  height: 24rpx;
  width: 180rpx;
  border-radius: $wm-radius-sm;
  background: linear-gradient(90deg, #f8fafc 25%, #e2e8f0 50%, #f8fafc 75%);
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
  border-radius: $wm-radius-lg;
  padding: 32rpx 32rpx 28rpx;
  border: $wm-card-edge;
  box-shadow: $wm-shadow-md;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
  animation: fadeInUp 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 6rpx;
    background: $wm-gradient-primary;
    opacity: 0;
    transition: opacity 0.2s;
  }

  &--hover {
    transform: translateY(-4rpx) scale(0.995);
    box-shadow: $wm-card-elevated-shadow;

    &::before {
      opacity: 1;
    }
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
    flex-wrap: wrap;
  }

  &__title {
    display: block;
    margin-top: 20rpx;
    font-size: 36rpx;
    font-weight: 700;
    color: $wm-text-1;
    line-height: 1.35;
  }

  &__meta {
    margin-top: 20rpx;
    display: flex;
    flex-direction: column;
    gap: 12rpx;
  }

  &__footer {
    margin-top: 24rpx;
    padding-top: 24rpx;
    border-top: 2rpx dashed #f1f5f9;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__quota {
    display: flex;
    align-items: center;
    gap: 10rpx;
  }

  &__quota-text {
    font-size: 26rpx;
    color: $wm-text-2;
    font-weight: 600;
  }

  &__organizer {
    font-size: 22rpx;
    color: $wm-text-3;
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(24rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  height: 40rpx;
  padding: 0 16rpx;
  border-radius: $wm-radius-sm;
  font-size: 22rpx;
  font-weight: 600;

  &--verified {
    background: #ecfdf5;
    color: #059669;
  }

  &--enrolled {
    background: $wm-primary-soft;
    color: $wm-primary;
  }
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 12rpx;

  &__text {
    font-size: 26rpx;
    color: $wm-text-2;
    font-weight: 500;
  }

  &__dist {
    font-size: 22rpx;
    color: $wm-text-3;
    font-weight: 500;
  }
}
</style>
