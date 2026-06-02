<template>
  <view class="loc-bubble" @click.stop="$emit('open')">
    <view class="loc-bubble__icon-wrap">
      <wm-icon name="mapPin" :size="32" color="#0284c7" />
    </view>
    <view class="loc-bubble__body">
      <text class="loc-bubble__name">{{ locationName || '位置' }}</text>
      <text v-if="address" class="loc-bubble__addr">{{ address }}</text>
      <text class="loc-bubble__hint">点击打开地图</text>
    </view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'

export default {
  name: 'ChatLocationBubble',
  components: { WmIcon },
  props: {
    locationName: { type: String, default: '' },
    address: { type: String, default: '' },
  },
  emits: ['open'],
}
</script>

<style lang="scss" scoped>
.loc-bubble {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 16rpx;
  min-width: 360rpx;
  max-width: 480rpx;
  padding: 20rpx 24rpx;
  background: #f8fafc;
  border-radius: 16rpx;
  border: 1rpx solid #e2e8f0;

  &__icon-wrap {
    flex-shrink: 0;
    padding-top: 4rpx;
  }

  &__body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6rpx;
    min-width: 0;
  }

  &__name {
    font-size: 28rpx;
    font-weight: 600;
    color: #0f172a;
    line-height: 1.35;
  }

  &__addr {
    font-size: 24rpx;
    color: #64748b;
    line-height: 1.4;
    word-break: break-all;
  }

  &__hint {
    font-size: 22rpx;
    color: #0284c7;
    margin-top: 4rpx;
  }
}

.msg-bubble--mine .loc-bubble {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.25);

  .loc-bubble__name {
    color: #fff;
  }

  .loc-bubble__addr {
    color: rgba(255, 255, 255, 0.85);
  }

  .loc-bubble__hint {
    color: rgba(255, 255, 255, 0.9);
  }
}
</style>
