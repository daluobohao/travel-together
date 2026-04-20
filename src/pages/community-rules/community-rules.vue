<template>
  <view class="page rules-page">
    <view class="rules-page__header">
      <view class="rules-page__back" @click="goBack">
        <wm-icon name="chevronLeft" :size="34" color="#0f172a" />
      </view>
      <text class="rules-page__title">社区规范说明</text>
      <view class="rules-page__placeholder" />
    </view>

    <scroll-view class="rules-page__content" scroll-y>
      <view class="rules-page__intro">
        <text class="rules-page__intro-title">旅聚社区公约</text>
        <text class="rules-page__intro-sub">为保障每一次线下活动的安全、友好与高质量，请遵守以下规范。</text>
      </view>

      <view class="rule-card" v-for="(rule, idx) in rules" :key="rule.title">
        <view class="rule-card__head">
          <view class="rule-card__index"><text>{{ idx + 1 }}</text></view>
          <text class="rule-card__title">{{ rule.title }}</text>
        </view>
        <text class="rule-card__desc">{{ rule.desc }}</text>
      </view>

      <view class="rules-page__footer-note">
        <text>违规内容可能导致限流、禁言或账号封禁。若遇到安全问题，请第一时间联系平台处理。</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import { getCommunityRules } from '@/api'

export default {
  components: { WmIcon },
  data() {
    return {
      rules: [],
    }
  },
  onShow() {
    this.loadRules()
  },
  methods: {
    async loadRules() {
      this.rules = await getCommunityRules()
    },
    goBack() {
      uni.navigateBack()
    },
  },
}
</script>

<style lang="scss" scoped>
.rules-page {
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
    height: calc(100vh - 96rpx - env(safe-area-inset-top));
    padding: 24rpx;
    box-sizing: border-box;
  }

  &__intro {
    background: #ffffff;
    border-radius: 20rpx;
    padding: 24rpx;
    margin-bottom: 16rpx;
  }

  &__intro-title {
    display: block;
    font-size: 34rpx;
    font-weight: 700;
    color: #0f172a;
  }

  &__intro-sub {
    display: block;
    margin-top: 10rpx;
    font-size: 24rpx;
    line-height: 1.6;
    color: #64748b;
  }

  &__footer-note {
    margin: 16rpx 0 24rpx;
    padding: 20rpx;
    border-radius: 16rpx;
    background: #fff7ed;
    color: #9a3412;
    font-size: 22rpx;
    line-height: 1.6;
  }
}

.rule-card {
  background: #ffffff;
  border-radius: 18rpx;
  padding: 22rpx;
  margin-bottom: 12rpx;

  &__head {
    display: flex;
    align-items: center;
    gap: 10rpx;
  }

  &__index {
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;
    background: #eef2ff;
    color: #6366f1;
    font-size: 22rpx;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__title {
    font-size: 28rpx;
    font-weight: 700;
    color: #0f172a;
  }

  &__desc {
    display: block;
    margin-top: 10rpx;
    font-size: 24rpx;
    line-height: 1.6;
    color: #475569;
  }
}
</style>
