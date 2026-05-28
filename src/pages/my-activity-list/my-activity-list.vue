<template>
  <view class="page my-activity-page">
    <view class="my-activity-page__header">
      <view class="my-activity-page__back" @click="goBack">
        <wm-icon name="chevronLeft" :size="34" color="#0f172a" />
      </view>
      <text class="my-activity-page__title">我参加的活动</text>
      <view class="my-activity-page__placeholder" />
    </view>

    <view class="my-activity-page__content">
      <view class="my-activity-page__summary">
        <text class="my-activity-page__summary-title">全部</text>
        <text class="my-activity-page__summary-sub">
          共 {{ total }} 项：城市大群 {{ cityHallCount }} · 活动 {{ eventCount }}
        </text>
      </view>

      <view v-if="cityHallCount > 0" class="my-activity-page__block">
        <text class="my-activity-page__block-title">城市大群</text>
        <text class="my-activity-page__block-desc">同城交流群，与活动列表区分展示</text>
        <view v-if="cityHallItems.length" class="my-activity-page__list">
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
        <view
          v-if="cityHallCount > LIST_PAGE_SIZE"
          class="my-activity-page__more"
          :class="{ 'my-activity-page__more--disabled': cityHallLoading || !cityHallHasMore }"
          @click="loadMoreCityHall"
        >
          <text v-if="cityHallLoading">加载中…</text>
          <text v-else-if="cityHallHasMore">加载更多（{{ cityHallItems.length }}/{{ cityHallCount }}）</text>
          <text v-else>没有更多了</text>
        </view>
      </view>

      <view v-if="eventCount > 0" class="my-activity-page__block">
        <text class="my-activity-page__block-title">活动</text>
        <view v-if="eventItems.length" class="my-activity-page__list">
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
        <view
          v-if="eventCount > LIST_PAGE_SIZE"
          class="my-activity-page__more"
          :class="{ 'my-activity-page__more--disabled': eventLoading || !eventHasMore }"
          @click="loadMoreEvent"
        >
          <text v-if="eventLoading">加载中…</text>
          <text v-else-if="eventHasMore">加载更多（{{ eventItems.length }}/{{ eventCount }}）</text>
          <text v-else>没有更多了</text>
        </view>
      </view>

      <view v-if="!loading && total === 0" class="my-activity-page__empty">
        <text>暂无已参加的活动或城市大群</text>
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
      total: 0,
      cityHallCount: 0,
      eventCount: 0,
      cityHallItems: [],
      cityHallPage: 1,
      cityHallHasMore: false,
      cityHallLoading: false,
      eventItems: [],
      eventPage: 1,
      eventHasMore: false,
      eventLoading: false,
    }
  },
  onShow() {
    this.loadActivities()
  },
  methods: {
    mapRow(item) {
      const card = mapActivityCard(item)
      const isCityHall = (card.activityKind || 'event') === 'city_hall'
      return {
        id: String(card.activityId || ''),
        activityKind: card.activityKind || 'event',
        title: card.title,
        time: card.time,
        location: card.location,
        statusKey: isCityHall ? 'city-hall' : card.statusKey || 'enrolled',
        statusLabel: isCityHall ? '已加入' : card.statusLabel || '已报名',
      }
    },
    async loadSummary() {
      const data = await getMyActivities({ role: 'joined', page: 1, pageSize: 1 })
      this.total = data?.total ?? 0
      this.cityHallCount = data?.cityHallCount ?? 0
      this.eventCount = data?.eventCount ?? 0
    },
    async fetchCityHallList(reset) {
      const page = reset ? 1 : this.cityHallPage
      const data = await getMyActivities({
        role: 'joined',
        activityKind: 'city_hall',
        page,
        pageSize: LIST_PAGE_SIZE,
      })
      const rows = (data?.list || []).map((item) => this.mapRow(item))
      this.cityHallItems = reset ? rows : [...this.cityHallItems, ...rows]
      this.cityHallPage = page
      const sectionTotal = data?.total ?? this.cityHallCount
      this.cityHallHasMore = this.cityHallItems.length < sectionTotal
      if (data?.cityHallCount != null) this.cityHallCount = data.cityHallCount
      if (data?.eventCount != null) this.eventCount = data.eventCount
    },
    async fetchEventList(reset) {
      const page = reset ? 1 : this.eventPage
      const data = await getMyActivities({
        role: 'joined',
        activityKind: 'event',
        page,
        pageSize: LIST_PAGE_SIZE,
      })
      const rows = (data?.list || []).map((item) => this.mapRow(item))
      this.eventItems = reset ? rows : [...this.eventItems, ...rows]
      this.eventPage = page
      const sectionTotal = data?.total ?? this.eventCount
      this.eventHasMore = this.eventItems.length < sectionTotal
      if (data?.cityHallCount != null) this.cityHallCount = data.cityHallCount
      if (data?.eventCount != null) this.eventCount = data.eventCount
    },
    async loadActivities() {
      this.loading = true
      try {
        await this.loadSummary()
        await Promise.all([this.fetchCityHallList(true), this.fetchEventList(true)])
      } catch (e) {
        uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    async loadMoreCityHall() {
      if (!this.cityHallHasMore || this.cityHallLoading || this.loading) return
      this.cityHallLoading = true
      try {
        this.cityHallPage += 1
        await this.fetchCityHallList(false)
      } catch (e) {
        this.cityHallPage = Math.max(1, this.cityHallPage - 1)
        uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
      } finally {
        this.cityHallLoading = false
      }
    },
    async loadMoreEvent() {
      if (!this.eventHasMore || this.eventLoading || this.loading) return
      this.eventLoading = true
      try {
        this.eventPage += 1
        await this.fetchEventList(false)
      } catch (e) {
        this.eventPage = Math.max(1, this.eventPage - 1)
        uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
      } finally {
        this.eventLoading = false
      }
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
