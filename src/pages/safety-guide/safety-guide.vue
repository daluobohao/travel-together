<template>
  <view class="page sub">
    <view class="sub__header">
      <view class="sub__back" @click="goBack"><wm-icon name="chevronLeft" :size="36" color="#0f172a" /></view>
      <text class="sub__title">独行出行安全指南</text>
      <view class="sub__sp" />
    </view>

    <view class="sub__body">
      <view v-for="(sec, i) in sections" :key="i" class="panel">
        <text class="panel__label">{{ sec.title }}</text>
        <text class="sec-body">{{ sec.body }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import { SAFETY_GUIDE_SECTIONS } from '@/constants/growthTrust'

export default {
  components: { WmIcon },
  data() {
    return { sections: SAFETY_GUIDE_SECTIONS }
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
  },
}
</script>

<style lang="scss" scoped>
@import '@/styles/sub-page.scss';
.sec-body {
  display: block;
  margin-top: 12rpx;
  font-size: 28rpx;
  color: $wm-text-2;
  line-height: 1.7;
}
</style>
