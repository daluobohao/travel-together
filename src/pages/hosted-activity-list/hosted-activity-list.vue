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
        <text class="hosted__summary-sub">共 {{ total }} 场，按开始时间由新到旧</text>
      </view>

      <view v-if="hostedActivities.length" class="hosted__list">
        <view
          v-for="item in hostedActivities"
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

      <view
        v-if="total > LIST_PAGE_SIZE"
        class="hosted__more"
        :class="{ 'hosted__more--disabled': loadingMore || !hasMore }"
        @click="loadMore"
      >
        <text v-if="loadingMore">加载中…</text>
        <text v-else-if="hasMore">加载更多（{{ hostedActivities.length }}/{{ total }}）</text>
        <text v-else>没有更多了</text>
      </view>

      <view v-if="!loading && total === 0" class="hosted__empty">
        <text>暂无发起的活动</text>
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

const LIST_PAGE_SIZE = 5

export default {
  components: { WmIcon },
  data() {
    return {
      LIST_PAGE_SIZE,
      loading: false,
      loadingMore: false,
      total: 0,
      page: 1,
      hasMore: false,
      hostedActivities: [],
    }
  },
  onShow() {
    this.loadHostedActivities()
  },
  methods: {
    mapRow(item) {
      const card = mapActivityCard(item)
      return {
        id: String(card.activityId || ''),
        title: card.title,
        time: card.time,
        location: card.location,
        statusKey: card.statusKey || 'recruiting',
        statusLabel: card.statusLabel || '招募中',
      }
    },
    async fetchPage(reset) {
      const page = reset ? 1 : this.page
      const data = await getMyActivities({
        role: 'organized',
        page,
        pageSize: LIST_PAGE_SIZE,
      })
      const rows = (data?.list || []).map((item) => this.mapRow(item))
      this.hostedActivities = reset ? rows : [...this.hostedActivities, ...rows]
      this.page = page
      this.total = data?.total ?? 0
      this.hasMore = this.hostedActivities.length < this.total
    },
    async loadHostedActivities() {
      this.loading = true
      try {
        await this.fetchPage(true)
      } catch (e) {
        uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    async loadMore() {
      if (!this.hasMore || this.loadingMore || this.loading) return
      this.loadingMore = true
      try {
        this.page += 1
        await this.fetchPage(false)
      } catch (e) {
        this.page = Math.max(1, this.page - 1)
        uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
      } finally {
        this.loadingMore = false
      }
    },
    goBack() {
      uni.navigateBack()
    },
    openActivity(item) {
      const id = item?.id || item?.activityId
      if (!id) return
      uni.navigateTo({
        url: `/pages/activity-detail/activity-detail?id=${encodeURIComponent(id)}`,
      })
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

  &__more {
    margin-top: 16rpx;
    padding: 20rpx;
    text-align: center;
    font-size: 24rpx;
    color: #6366f1;
    background: rgba(99, 102, 241, 0.06);
    border-radius: 14rpx;

    &--disabled {
      opacity: 0.55;
    }
  }

  &__empty {
    padding: 48rpx 24rpx;
    text-align: center;
    font-size: 26rpx;
    color: #94a3b8;
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
