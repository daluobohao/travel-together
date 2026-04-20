<template>
  <view class="page review-page">
    <view class="review-page__header">
      <view class="review-page__back" @click="goBack">
        <wm-icon name="chevronLeft" :size="34" color="#0f172a" />
      </view>
      <text class="review-page__title">好评列表</text>
      <view class="review-page__placeholder" />
    </view>

    <view class="review-page__content">
      <view class="review-page__summary">
        <text class="review-page__score">4.9</text>
        <view class="review-page__summary-info">
          <text class="review-page__summary-title">活动综合好评</text>
          <text class="review-page__summary-sub">共 8 条精选评价</text>
        </view>
      </view>

      <view class="review-page__list">
        <view v-for="review in reviews" :key="review.id" class="review-card">
          <view class="review-card__top">
            <text class="review-card__name">{{ review.user }}</text>
            <text class="review-card__time">{{ review.time }}</text>
          </view>
          <text class="review-card__activity">来自：{{ review.activity }}</text>
          <text class="review-card__content">{{ review.content }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import { getReviewList } from '@/api'

export default {
  components: { WmIcon },
  data() {
    return {
      reviews: [],
    }
  },
  onShow() {
    this.loadReviews()
  },
  methods: {
    async loadReviews() {
      const data = await getReviewList({ page: 1, pageSize: 20 })
      this.reviews = (data?.list || []).map((x) => ({
        id: x.id,
        user: x.user,
        time: '最近',
        activity: `活动 ${x.activityId}`,
        content: x.content,
      }))
    },
    goBack() {
      uni.navigateBack()
    },
  },
}
</script>

<style lang="scss" scoped>
.review-page {
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
    display: flex;
    align-items: center;
    gap: 18rpx;
    margin-bottom: 18rpx;
  }

  &__score {
    font-size: 56rpx;
    font-weight: 700;
    color: #6366f1;
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

.review-card {
  background: #ffffff;
  border-radius: 18rpx;
  padding: 22rpx;
  box-shadow: 0 4rpx 16rpx rgba(15, 23, 42, 0.04);

  &__top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__name {
    font-size: 28rpx;
    font-weight: 600;
    color: #0f172a;
  }

  &__time {
    font-size: 22rpx;
    color: #94a3b8;
  }

  &__activity {
    display: block;
    margin-top: 8rpx;
    font-size: 22rpx;
    color: #6366f1;
  }

  &__content {
    display: block;
    margin-top: 10rpx;
    font-size: 25rpx;
    line-height: 1.6;
    color: #475569;
  }
}
</style>
