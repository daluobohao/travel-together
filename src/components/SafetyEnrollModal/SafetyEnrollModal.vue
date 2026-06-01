<template>
  <view v-if="visible" class="safety-modal" @click.self="onMask">
    <view class="safety-modal__box" @click.stop>
      <text class="safety-modal__title">报名安全须知</text>
      <view class="safety-modal__list">
        <text v-for="(line, i) in lines" :key="i" class="safety-modal__item">{{ i + 1 }}. {{ line }}</text>
      </view>
      <label class="safety-modal__agree" @click="toggleAgree">
        <checkbox :checked="agreed" color="#0d9488" />
        <text>我已阅读并同意以上须知</text>
      </label>
      <view class="safety-modal__actions">
        <view class="wm-btn wm-btn--ghost safety-modal__btn" @click="onCancel">稍后再说</view>
        <view
          class="wm-btn wm-btn--primary safety-modal__btn"
          :class="{ 'wm-btn--disabled': !agreed }"
          @click="onConfirm"
        >
          确认报名
        </view>
      </view>
      <text class="safety-modal__link" @click="goGuide">查看完整安全指南 ›</text>
    </view>
  </view>
</template>

<script>
import { SAFETY_ENROLL_NOTICE } from '@/constants/growthTrust'

export default {
  props: {
    visible: { type: Boolean, default: false },
  },
  emits: ['cancel', 'confirm'],
  data() {
    return {
      agreed: false,
      lines: SAFETY_ENROLL_NOTICE,
    }
  },
  watch: {
    visible(v) {
      if (v) this.agreed = false
    },
  },
  methods: {
    onMask() {
      this.$emit('cancel')
    },
    onCancel() {
      this.$emit('cancel')
    },
    onConfirm() {
      if (!this.agreed) return
      this.$emit('confirm')
    },
    toggleAgree() {
      this.agreed = !this.agreed
    },
    goGuide() {
      uni.navigateTo({ url: '/pages/safety-guide/safety-guide' })
    },
  },
}
</script>

<style lang="scss" scoped>
.safety-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;

  &__box {
    width: 100%;
    max-width: 640rpx;
    background: #fff;
    border-radius: $wm-radius-xl;
    padding: 40rpx 32rpx;
    box-shadow: $wm-shadow-lg;
  }

  &__title {
    display: block;
    font-size: 34rpx;
    font-weight: 800;
    color: $wm-text-1;
    text-align: center;
  }

  &__list {
    margin-top: 28rpx;
  }

  &__item {
    display: block;
    font-size: 28rpx;
    color: $wm-text-2;
    line-height: 1.6;
    margin-bottom: 16rpx;
  }

  &__agree {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-top: 24rpx;
    font-size: 26rpx;
    color: $wm-text-2;
  }

  &__actions {
    display: flex;
    gap: 16rpx;
    margin-top: 32rpx;
  }

  &__btn {
    flex: 1;
    height: 84rpx;
    font-size: 28rpx;
  }

  &__link {
    display: block;
    margin-top: 24rpx;
    text-align: center;
    font-size: 24rpx;
    color: $wm-primary;
    font-weight: 600;
  }
}
</style>
