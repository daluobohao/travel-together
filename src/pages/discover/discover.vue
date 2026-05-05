<template>
  <view class="page discover">
    <!-- Header -->
    <view class="discover__header">
      <text class="discover__title">发现</text>
      <text class="discover__subtitle">找到你感兴趣的活动</text>
    </view>

    <!-- Skeleton Loading -->
    <view v-if="loading" class="skeleton-content">
      <!-- Nearby Skeleton -->
      <view class="section section--nearby">
        <view class="section__head section__head--nearby">
          <view class="skeleton-section-title" style="width: 160rpx" />
          <view class="skeleton-radius-row">
            <view v-for="i in 3" :key="i" class="skeleton-radius-chip" />
          </view>
        </view>
        <view class="nearby-list">
          <view v-for="i in 2" :key="i" class="skeleton-nearby-card">
            <view class="skeleton-nearby-main">
              <view class="skeleton-nearby-tags">
                <view class="skeleton-nearby-cat" />
                <view class="skeleton-nearby-dist" />
              </view>
              <view class="skeleton-nearby-title" />
              <view class="skeleton-nearby-meta" />
            </view>
          </view>
        </view>
      </view>

      <!-- Categories Skeleton -->
      <view class="section">
        <view class="skeleton-section-title"></view>
        <view class="categories">
          <view v-for="i in 6" :key="i" class="skeleton-category-card">
            <view class="skeleton-category-icon"></view>
            <view class="skeleton-category-label"></view>
            <view class="skeleton-category-count"></view>
          </view>
        </view>
      </view>

      <!-- Featured Skeleton -->
      <view class="section">
        <view class="section__head">
          <view class="skeleton-section-title"></view>
          <view class="skeleton-section-more"></view>
        </view>
        <view class="featured">
          <view v-for="i in 3" :key="i" class="skeleton-featured-card"></view>
        </view>
      </view>
    </view>

    <!-- Actual Content -->
    <template v-else>
      <!-- Nearby -->
      <view class="section section--nearby">
        <view class="section__head section__head--nearby">
          <text class="section__title section__title--inline">附近活动</text>
          <view class="radius-chips">
            <view
              v-for="r in radiusOptions"
              :key="r"
              class="radius-chip"
              :class="{ 'radius-chip--active': r === nearbyRadiusKm }"
              @click="onRadiusChange(r)"
            >
              <text>{{ r }}km</text>
            </view>
          </view>
        </view>
        <view v-if="nearbyLoading" class="nearby-loading">
          <text>加载附近活动…</text>
        </view>
        <view v-else-if="!nearbyCards.length" class="nearby-empty">
          <text>暂无附近活动，试试放大半径或晚点再来看看</text>
        </view>
        <view v-else class="nearby-list">
          <view
            v-for="item in nearbyCards"
            :key="item.id"
            class="nearby-card"
            @click="onOpenNearby(item)"
          >
            <view class="nearby-card__main">
              <view class="nearby-card__tags">
                <view class="nearby-card__cat" :style="{ color: item.tagColor, background: item.tagBg }">
                  <text>{{ item.category }}</text>
                </view>
                <text v-if="item.distance" class="nearby-card__dist">{{ item.distance }}</text>
              </view>
              <text class="nearby-card__title">{{ item.title }}</text>
              <text class="nearby-card__meta">{{ item.time }} · {{ item.location }}</text>
            </view>
            <wm-icon name="chevronRight" :size="28" color="#cbd5e1" />
          </view>
        </view>
      </view>

      <!-- Categories -->
      <view class="section">
        <text class="section__title">活动分类</text>
        <view class="categories">
          <view v-for="c in categories" :key="c.key" class="category-card" @click="onCategory(c)">
            <view class="category-card__icon" :style="{ background: c.bg }">
              <text class="category-card__emoji">{{ c.emoji }}</text>
            </view>
            <text class="category-card__label">{{ c.label }}</text>
            <text class="category-card__count">{{ c.count }} 场活动</text>
          </view>
        </view>
      </view>

      <!-- Featured activities -->
      <view class="section">
        <view class="section__head">
          <text class="section__title">精选活动</text>
          <view class="section__head-actions">
            <text class="section__more section__more--muted" @click.stop="showFeaturedPicker = true">配色</text>
            <text class="section__more" @click="onViewAll">查看全部</text>
          </view>
        </view>
        <view class="featured">
          <view
            v-for="f in featured"
            :key="f.id"
            class="featured-card"
            :style="{ background: f.gradient }"
            @click="onFeatured(f)"
          >
            <view class="featured-card__inner">
              <view class="featured-card__tag">
                <text>{{ f.tag }}</text>
              </view>
              <text class="featured-card__title">{{ f.title }}</text>
              <view class="featured-card__meta">
                <text>{{ f.date }}</text>
                <text class="featured-card__dot">·</text>
                <text>{{ f.enrolled }}人已报名</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </template>

    <wm-tab-bar active="discover" />

    <featured-color-picker-modal
      :visible="showFeaturedPicker"
      :value-slots="featuredGradientSlots"
      @close="showFeaturedPicker = false"
      @save="onFeaturedGradientSave"
    />
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import WmTabBar from '@/components/WmTabBar/WmTabBar.vue'
import FeaturedColorPickerModal from '@/components/FeaturedColorPickerModal/FeaturedColorPickerModal.vue'
import { getActivities, getActivityCategories, getNearbyActivities, mapActivityCard } from '@/api'
import {
  gradientsFromSlots,
  loadFeaturedGradientSlots,
  saveFeaturedGradientSlots,
} from '@/utils/featuredGradient.js'

const BEIJING_FALLBACK_LOCATION = { lat: 39.90923, lng: 116.397428 }
const FEATURED_LIMIT = 3

function toDistanceMeters(distanceText = '') {
  const n = Number(String(distanceText).replace('km', ''))
  if (!Number.isFinite(n)) return null
  return Math.round(n * 1000)
}

function scoreFeaturedCard(card) {
  const joined = Number(card?.joined || 0)
  const total = Number(card?.total || 0)
  const distanceMeters = toDistanceMeters(card?.distance)
  let score = 0

  if (!card?.isEnded && !card?.isCancelled) score += 80
  if (card?.canJoin) score += 60
  if (card?.enrollmentStatus === 'joined') score += 40
  score += Math.min(40, joined * 4)
  if (total > 0 && joined >= total) score -= 15
  if (distanceMeters !== null) {
    score += Math.max(0, 25 - Math.floor(distanceMeters / 1000) * 5)
  }
  return score
}

function buildFeaturedCards(allCards) {
  const scored = (allCards || [])
    .map((card) => ({ card, score: scoreFeaturedCard(card) }))
    .sort((a, b) => b.score - a.score)

  const selected = []
  const categorySet = new Set()
  for (const row of scored) {
    if (!categorySet.has(row.card.categoryId)) {
      selected.push(row.card)
      categorySet.add(row.card.categoryId)
    }
    if (selected.length >= FEATURED_LIMIT) break
  }
  if (selected.length < FEATURED_LIMIT) {
    for (const row of scored) {
      if (selected.find((x) => x.activityId === row.card.activityId)) continue
      selected.push(row.card)
      if (selected.length >= FEATURED_LIMIT) break
    }
  }
  return selected.slice(0, FEATURED_LIMIT)
}

export default {
  components: { WmIcon, WmTabBar, FeaturedColorPickerModal },
  data() {
    return {
      loading: false,
      categories: [],
      featured: [],
      featuredGradientSlots: [],
      showFeaturedPicker: false,
      nearbyRadiusKm: 5,
      radiusOptions: [3, 5, 10],
      nearbyCards: [],
      nearbyLoading: false,
      userLocation: null,
    }
  },
  onShow() {
    this.featuredGradientSlots = loadFeaturedGradientSlots()
    this.loadData()
  },
  methods: {
    ensureCachedLocation() {
      const fromStorage = uni.getStorageSync('DISCOVER_USER_LOCATION')
      if (fromStorage?.lat && fromStorage?.lng) {
        this.userLocation = { lat: Number(fromStorage.lat), lng: Number(fromStorage.lng) }
      }
    },
    async getCurrentLocation() {
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
    onRadiusChange(r) {
      this.nearbyRadiusKm = r
      this.loadNearby()
    },
    async loadNearby() {
      this.nearbyLoading = true
      try {
        this.ensureCachedLocation()
        if (!this.userLocation) {
          try {
            this.userLocation = await this.getCurrentLocation()
            uni.setStorageSync('DISCOVER_USER_LOCATION', this.userLocation)
          } catch (e) {
            this.userLocation = BEIJING_FALLBACK_LOCATION
          }
        }
        const data = await getNearbyActivities({
          lat: this.userLocation.lat,
          lng: this.userLocation.lng,
          radiusKm: this.nearbyRadiusKm,
          cityCode: '110000',
          dateRange: 'all',
          sortBy: 'distance',
          page: 1,
          pageSize: 20,
        })
        this.nearbyCards = (data?.list || []).map(mapActivityCard)
      } catch (e) {
        this.nearbyCards = []
        uni.showToast({ title: e?.message || '附近活动加载失败', icon: 'none' })
      } finally {
        this.nearbyLoading = false
      }
    },
    onOpenNearby(item) {
      const id = item?.activityId || item?.id
      if (!id) return
      uni.navigateTo({
        url: `/pages/activity-detail/activity-detail?id=${id}`,
      })
    },
    async loadData() {
      this.loading = true
      try {
        const [categoryData, activityData] = await Promise.all([
          getActivityCategories(),
          getActivities({ cityCode: '110000', page: 1, pageSize: 50 }),
        ])
        const allCards = (activityData?.list || []).map(mapActivityCard)
        const countMap = allCards.reduce((acc, item) => {
          acc[item.categoryId] = (acc[item.categoryId] || 0) + 1
          return acc
        }, {})
        const iconMap = {
          coffee: { emoji: '☕️', bg: '#fef3c7' },
          citywalk: { emoji: '🧭', bg: '#e0e7ff' },
          hiking: { emoji: '🏔', bg: '#d1fae5' },
          boardgame: { emoji: '🎲', bg: '#fce7f3' },
          exhibit: { emoji: '🎨', bg: '#fee2e2' },
          night_run: { emoji: '🌙', bg: '#ede9fe' },
        }
        this.categories = (categoryData?.categories || []).map((c) => ({
          key: c.categoryId,
          label: c.name,
          count: countMap[c.categoryId] || 0,
          ...(iconMap[c.categoryId] || { emoji: '✨', bg: '#e2e8f0' }),
        }))

        const gradients = gradientsFromSlots(this.featuredGradientSlots)
        this.featured = buildFeaturedCards(allCards).map((a, idx) => ({
          id: idx + 1,
          activityId: String(a.activityId || ''),
          tag: a.category,
          title: a.title,
          date: a.time,
          enrolled: a.joined,
          gradient: gradients[idx % gradients.length],
        }))
        await this.loadNearby()
      } catch (e) {
        this.categories = []
        this.featured = []
        uni.showToast({ title: e?.message || '发现页加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    onCategory(c) {
      uni.navigateTo({
        url: `/pages/category-list/category-list?key=${c.key}&label=${encodeURIComponent(c.label)}`,
      })
    },
    onFeatured(f) {
      uni.navigateTo({
        url: `/pages/activity-detail/activity-detail?id=${f.activityId || f.id}`,
      })
    },
    onViewAll() {
      uni.navigateTo({
        url: '/pages/activity-list/activity-list',
      })
    },
    onFeaturedGradientSave(slots) {
      this.featuredGradientSlots = slots
      saveFeaturedGradientSlots(slots)
      const gradients = gradientsFromSlots(slots)
      this.featured = (this.featured || []).map((f, idx) => ({
        ...f,
        gradient: gradients[idx % gradients.length],
      }))
    },
  },
}
</script>

<style lang="scss" scoped>
.discover {
  min-height: 100vh;
  background: #f3f4f6;

  &__header {
    padding: calc(40rpx + var(--status-bar-height, 0px) + env(safe-area-inset-top)) 32rpx 24rpx;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    gap: 10rpx;
  }

  &__title {
    font-size: 52rpx;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.1;
  }

  &__subtitle {
    font-size: 24rpx;
    color: #94a3b8;
  }
}

.section {
  padding: 32rpx 32rpx 0;

  &__head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  &__head-actions {
    display: flex;
    align-items: center;
    gap: 24rpx;
    flex-shrink: 0;
  }

  &__title {
    display: block;
    font-size: 32rpx;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 24rpx;
  }

  &__more {
    font-size: 24rpx;
    color: #6366f1;
    font-weight: 500;

    &--muted {
      color: #64748b;
    }
  }

  &--nearby {
    padding-top: 24rpx;
  }

  &__head--nearby {
    flex-wrap: wrap;
    align-items: center;
    gap: 16rpx;
    margin-bottom: 8rpx;
  }

  &__title--inline {
    display: inline-block;
    margin-bottom: 0;
    flex-shrink: 0;
  }
}

.radius-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-left: auto;
}

.radius-chip {
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  background: #f1f5f9;
  font-size: 22rpx;
  color: #64748b;
  font-weight: 500;

  &--active {
    background: #6366f1;
    color: #ffffff;
  }
}

.nearby-loading,
.nearby-empty {
  padding: 28rpx 8rpx 8rpx;
  text-align: center;
  font-size: 24rpx;
  color: #94a3b8;
}

.nearby-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding-bottom: 8rpx;
}

.nearby-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 22rpx 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(15, 23, 42, 0.04);

  &__main {
    flex: 1;
    min-width: 0;
  }

  &__tags {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12rpx;
    margin-bottom: 10rpx;
  }

  &__cat {
    display: inline-flex;
    align-items: center;
    height: 36rpx;
    padding: 0 14rpx;
    border-radius: 8rpx;
    font-size: 20rpx;
    font-weight: 600;
  }

  &__dist {
    font-size: 22rpx;
    color: #6366f1;
    font-weight: 600;
    flex-shrink: 0;
  }

  &__title {
    display: block;
    font-size: 30rpx;
    font-weight: 600;
    color: #0f172a;
    line-height: 1.35;
  }

  &__meta {
    display: block;
    margin-top: 8rpx;
    font-size: 22rpx;
    color: #94a3b8;
  }
}

.categories {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
}

.category-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 28rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  box-shadow: 0 4rpx 16rpx rgba(15, 23, 42, 0.04);
  transition: transform 0.15s;

  &:active {
    transform: scale(0.96);
  }

  &__icon {
    width: 88rpx;
    height: 88rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: inset 0 -4rpx 8rpx rgba(0, 0, 0, 0.04);
  }

  &__emoji {
    font-size: 44rpx;
    line-height: 1;
  }

  &__label {
    font-size: 28rpx;
    font-weight: 600;
    color: #0f172a;
    margin-top: 4rpx;
  }

  &__count {
    font-size: 20rpx;
    color: #94a3b8;
  }
}

.featured {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  padding-bottom: 32rpx;
}

.featured-card {
  border-radius: 28rpx;
  overflow: hidden;
  box-shadow: 0 12rpx 32rpx rgba(15, 23, 42, 0.12);
  min-height: 240rpx;
  display: flex;
  align-items: flex-end;
  transition: transform 0.15s;

  &:active {
    transform: scale(0.985);
  }

  &__inner {
    padding: 32rpx 32rpx 32rpx;
    width: 100%;
    background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.18) 100%);
    color: #ffffff;
  }

  &__tag {
    display: inline-flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.24);
    border: 1rpx solid rgba(255, 255, 255, 0.4);
    color: #ffffff;
    font-size: 20rpx;
    padding: 4rpx 16rpx;
    border-radius: 999rpx;
    margin-bottom: 12rpx;
  }

  &__title {
    display: block;
    font-size: 40rpx;
    font-weight: 700;
    color: #ffffff;
    line-height: 1.2;
  }

  &__meta {
    margin-top: 12rpx;
    display: flex;
    gap: 8rpx;
    font-size: 22rpx;
    color: rgba(255, 255, 255, 0.9);
  }

  &__dot {
    opacity: 0.6;
  }
}

/* Skeleton Styles */
.skeleton-content {
  animation: fadeIn 0.3s ease-out;
}

.skeleton-radius-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-left: auto;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.skeleton-section-title {
  width: 140rpx;
  height: 36rpx;
  border-radius: 8rpx;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  margin-bottom: 24rpx;
}

.skeleton-section-more {
  width: 100rpx;
  height: 28rpx;
  border-radius: 8rpx;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-radius-chip {
  width: 70rpx;
  height: 40rpx;
  border-radius: 999rpx;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-nearby-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 22rpx 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.skeleton-nearby-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.skeleton-nearby-tags {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.skeleton-nearby-cat {
  width: 80rpx;
  height: 36rpx;
  border-radius: 8rpx;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-nearby-dist {
  width: 60rpx;
  height: 28rpx;
  border-radius: 8rpx;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-nearby-title {
  width: 80%;
  height: 36rpx;
  border-radius: 8rpx;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-nearby-meta {
  width: 60%;
  height: 28rpx;
  border-radius: 8rpx;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-category-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 28rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.skeleton-category-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-category-label {
  width: 100rpx;
  height: 32rpx;
  border-radius: 8rpx;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-category-count {
  width: 80rpx;
  height: 24rpx;
  border-radius: 8rpx;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-featured-card {
  border-radius: 28rpx;
  min-height: 240rpx;
  background: linear-gradient(90deg, #e2e8f0 25%, #cbd5e0 50%, #e2e8f0 75%);
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
</style>
