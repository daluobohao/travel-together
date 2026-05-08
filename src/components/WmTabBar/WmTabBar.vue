<template>
  <view class="wm-tabbar-placeholder" />
  <view class="wm-tabbar">
    <view
      v-for="item in tabs"
      :key="item.key"
      class="wm-tabbar__item"
      :class="{ 'wm-tabbar__item--center': item.center }"
      :hover-class="!item.center ? 'wm-tabbar__item--hover' : ''"
      @click="onSwitch(item)"
    >
      <template v-if="item.center">
        <view class="wm-tabbar__fab">
          <wm-icon name="plus" :size="44" color="#ffffff" />
        </view>
        <text class="wm-tabbar__label wm-tabbar__label--center">{{ item.label }}</text>
      </template>
      <template v-else>
        <view class="wm-tabbar__icon-wrapper">
          <wm-icon
            :name="item.icon"
            :size="44"
            :color="active === item.key ? '#6366f1' : '#94a3b8'"
          />
        </view>
        <text class="wm-tabbar__label" :class="{ 'wm-tabbar__label--active': active === item.key }">
          {{ item.label }}
        </text>
      </template>
    </view>
  </view>
</template>

<script>
import WmIcon from '../WmIcon/WmIcon.vue'

export default {
  name: 'WmTabBar',
  components: { WmIcon },
  props: {
    active: {
      type: String,
      default: 'home',
    },
  },
  data() {
    return {
      tabs: [
        { key: 'home', label: '首页', icon: 'home', path: '/pages/home/home' },
        { key: 'discover', label: '发现', icon: 'compass', path: '/pages/discover/discover' },
        { key: 'publish', label: '发布', icon: 'plus', path: '/pages/publish/publish', center: true },
        { key: 'messages', label: '消息', icon: 'message', path: '/pages/messages/messages' },
        { key: 'profile', label: '我的', icon: 'user', path: '/pages/profile/profile' },
      ],
    }
  },
  methods: {
    onSwitch(item) {
      if (item.key === this.active) return
      uni.reLaunch({ url: item.path })
    },
  },
}
</script>

<style lang="scss" scoped>
.wm-tabbar-placeholder {
  height: calc(120rpx + env(safe-area-inset-bottom));
}

.wm-tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  display: flex;
  justify-content: space-around;
  align-items: flex-start;
  padding: 12rpx 8rpx calc(12rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: saturate(1.15) blur(20rpx);
  border-top: 1rpx solid rgba(226, 232, 240, 0.95);
  box-shadow: 0 -6rpx 28rpx rgba(15, 23, 42, 0.07);

  &__item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4rpx;
    padding-top: 10rpx;
    transition: transform 0.15s;

    &--hover {
      transform: scale(0.95);
    }

    &--center {
      margin-top: -36rpx;

      &.wm-tabbar__item--hover .wm-tabbar__fab {
        transform: scale(0.95);
      }
    }
  }

  &__icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__fab {
    width: 88rpx;
    height: 88rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, #818cf8 0%, #6366f1 60%, #4f46e5 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 12rpx 28rpx rgba(99, 102, 241, 0.45);
    border: 6rpx solid #ffffff;
    transition: transform 0.15s, box-shadow 0.15s;
  }

  &__label {
    font-size: 20rpx;
    color: #94a3b8;
    line-height: 1;
    transition: color 0.2s, font-weight 0.2s;

    &--active {
      color: #6366f1;
      font-weight: 600;
    }

    &--center {
      margin-top: 8rpx;
      color: #6366f1;
      font-weight: 600;
    }
  }
}
</style>
