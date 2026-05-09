<template>
  <view class="page discover">
    <!-- Header -->
    <view class="discover__header">
      <text class="discover__title">发现</text>
      <text class="discover__subtitle">找到你感兴趣的活动</text>
    </view>

    <!-- Skeleton Loading -->
    <view v-if="loading" class="skeleton-content">
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
      <!-- Categories -->
      <view class="section">
        <text class="section__title">活动分类</text>
        <view class="categories">
          <view v-for="c in categories" :key="c.key" class="category-card" @click="onCategory(c)">
            <view class="category-card__icon" :style="{ background: c.bg }">
              <wm-icon :name="c.icon" :size="44" :color="c.color" />
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
import { getActivities, getActivityCategories, mapActivityCard } from '@/api'
import {
  gradientsFromSlots,
  loadFeaturedGradientSlots,
  saveFeaturedGradientSlots,
} from '@/utils/featuredGradient.js'

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
    }
  },
  onShow() {
    this.featuredGradientSlots = loadFeaturedGradientSlots()
    this.loadData()
  },
  methods: {
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
          coffee: { icon: 'coffee', bg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', color: '#b45309' },
          citywalk: { icon: 'walk', bg: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)', color: '#4f46e5' },
          hiking: { icon: 'hike', bg: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', color: '#047857' },
          boardgame: { icon: 'dice', bg: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)', color: '#be185d' },
          coworking: { icon: 'laptop', bg: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)', color: '#0284c7' },
          indie: { icon: 'rocket', bg: 'linear-gradient(135deg, #fef9c3 0%, #fde68a 100%)', color: '#b45309' },
          language: { icon: 'globe', bg: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', color: '#1d4ed8' },
          dining: { icon: 'utensil', bg: 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)', color: '#c2410c' },
          photography: { icon: 'camera', bg: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)', color: '#7c3aed' },
          exhibit: { icon: 'palette', bg: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', color: '#dc2626' },
          night_run: { icon: 'moon', bg: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)', color: '#6d28d9' },
        }
        this.categories = (categoryData?.categories || []).map((c) => ({
          key: c.categoryId,
          label: c.name,
          count: countMap[c.categoryId] || 0,
          ...(iconMap[c.categoryId] || { icon: 'tag', bg: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)', color: '#475569' }),
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
  background: transparent;

  &__header {
    padding: calc(40rpx + var(--status-bar-height, 0px) + env(safe-area-inset-top)) 32rpx 28rpx;
    background: $wm-sticky-header-gradient;
    border-bottom: none;
    box-shadow: 0 12rpx 40rpx rgba(255, 107, 107, 0.06);
    display: flex;
    flex-direction: column;
    gap: 12rpx;
  }

  &__title {
    font-size: 56rpx;
    font-weight: 800;
    background: linear-gradient(135deg, #ff6b6b 0%, #8b5cf6 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1.1;
  }

  &__subtitle {
    font-size: 26rpx;
    color: $wm-text-3;
    font-weight: 500;
  }
}

.section {
  padding: 36rpx 32rpx 0;

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
    font-size: 34rpx;
    font-weight: 700;
    color: $wm-text-1;
    margin-bottom: 28rpx;
  }

  &__more {
    font-size: 26rpx;
    color: $wm-primary;
    font-weight: 600;

    &--muted {
      color: $wm-text-2;
    }
  }
}

.categories {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
}

.category-card {
  background: #ffffff;
  border-radius: $wm-radius-lg;
  padding: 28rpx 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  border: $wm-card-edge;
  box-shadow: $wm-shadow-md;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4rpx;
    background: $wm-gradient-primary;
    opacity: 0;
    transition: opacity 0.2s;
  }

  &:active {
    transform: scale(0.95);
    box-shadow: $wm-shadow-sm;

    &::before {
      opacity: 1;
    }
  }

  &__icon {
    width: 96rpx;
    height: 96rpx;
    border-radius: 28rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.06);
    transition: transform 0.2s;
  }

  .category-card:active &__icon {
    transform: scale(1.05);
  }

  &__label {
    font-size: 28rpx;
    font-weight: 700;
    color: $wm-text-1;
    margin-top: 4rpx;
  }

  &__count {
    font-size: 20rpx;
    color: $wm-text-3;
    font-weight: 500;
  }
}

.featured {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding-bottom: 36rpx;
}

.featured-card {
  border-radius: $wm-radius-xl;
  overflow: hidden;
  box-shadow: 0 16rpx 44rpx rgba(255, 107, 107, 0.15);
  min-height: 280rpx;
  display: flex;
  align-items: flex-end;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%, rgba(0, 0, 0, 0.1) 100%);
    pointer-events: none;
  }

  &:active {
    transform: scale(0.98) translateY(-4rpx);
  }

  &__inner {
    position: relative;
    padding: 36rpx;
    width: 100%;
    background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.35) 100%);
    color: #ffffff;
  }

  &__tag {
    display: inline-flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.28);
    backdrop-filter: blur(8rpx);
    border: 1rpx solid rgba(255, 255, 255, 0.5);
    color: #ffffff;
    font-size: 22rpx;
    padding: 6rpx 18rpx;
    border-radius: 999rpx;
    margin-bottom: 16rpx;
    font-weight: 600;
  }

  &__title {
    display: block;
    font-size: 44rpx;
    font-weight: 800;
    color: #ffffff;
    line-height: 1.25;
    text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.2);
  }

  &__meta {
    margin-top: 14rpx;
    display: flex;
    gap: 10rpx;
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.95);
    font-weight: 500;
  }

  &__dot {
    opacity: 0.7;
  }
}

/* Skeleton Styles */
.skeleton-content {
  animation: fadeIn 0.3s ease-out;
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
  border-radius: $wm-radius-sm;
  background: linear-gradient(90deg, #f8fafc 25%, #e2e8f0 50%, #f8fafc 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  margin-bottom: 28rpx;
}

.skeleton-section-more {
  width: 100rpx;
  height: 28rpx;
  border-radius: $wm-radius-sm;
  background: linear-gradient(90deg, #f8fafc 25%, #e2e8f0 50%, #f8fafc 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-category-card {
  background: #ffffff;
  border-radius: $wm-radius-lg;
  padding: 28rpx 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.skeleton-category-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 28rpx;
  background: linear-gradient(90deg, #f8fafc 25%, #e2e8f0 50%, #f8fafc 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-category-label {
  width: 100rpx;
  height: 32rpx;
  border-radius: $wm-radius-sm;
  background: linear-gradient(90deg, #f8fafc 25%, #e2e8f0 50%, #f8fafc 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-category-count {
  width: 80rpx;
  height: 24rpx;
  border-radius: $wm-radius-sm;
  background: linear-gradient(90deg, #f8fafc 25%, #e2e8f0 50%, #f8fafc 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-featured-card {
  border-radius: $wm-radius-xl;
  min-height: 280rpx;
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
