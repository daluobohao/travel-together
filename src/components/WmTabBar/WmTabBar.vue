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

  <publish-picker-sheet
    :visible="publishPickerVisible"
    @update:visible="publishPickerVisible = $event"
    @pick="onPublishPick"
  />
</template>

<script>
import WmIcon from '../WmIcon/WmIcon.vue'
import PublishPickerSheet from '../PublishPickerSheet/PublishPickerSheet.vue'
import { isLoggedIn, redirectToLogin } from '@/api'

export default {
  name: 'WmTabBar',
  components: { WmIcon, PublishPickerSheet },
  props: {
    active: {
      type: String,
      default: 'home',
    },
  },
  data() {
    return {
      publishPickerVisible: false,
      tabs: [
        { key: 'home', label: '首页', icon: 'home', path: '/pages/home/home' },
        { key: 'discover', label: '发现', icon: 'compass', path: '/pages/discover/discover' },
        { key: 'publish', label: '发布', icon: 'plus', center: true },
        { key: 'messages', label: '消息', icon: 'message', path: '/pages/messages/messages' },
        { key: 'profile', label: '我的', icon: 'user', path: '/pages/profile/profile' },
      ],
    }
  },
  methods: {
    onSwitch(item) {
      if (item.center) {
        this.onPublishTap()
        return
      }
      if (item.key === this.active) return
      uni.reLaunch({ url: item.path })
    },
    onPublishTap() {
      if (!isLoggedIn()) {
        redirectToLogin()
        return
      }
      this.publishPickerVisible = true
    },
    onPublishPick(type) {
      if (type === 'activity') {
        uni.navigateTo({ url: '/pages/publish/publish' })
        return
      }
      if (type === 'feed') {
        uni.navigateTo({ url: '/pages/feed-publish/feed-publish' })
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.wm-tabbar-placeholder {
  height: calc(140rpx + env(safe-area-inset-bottom));
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
  padding: 16rpx 16rpx calc(16rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: saturate(1.2) blur(24rpx);
  border-top: 1rpx solid rgba(2, 132, 199, 0.08);
  box-shadow: 0 -8rpx 40rpx rgba(2, 132, 199, 0.08);

  &__item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8rpx;
    padding: 12rpx 0;
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    position: relative;

    &--hover {
      transform: scale(0.95);
    }

    &--center {
      margin-top: -44rpx;
      position: relative;
      z-index: 10;

      &.wm-tabbar__item--hover .wm-tabbar__fab {
        transform: scale(0.95);
        box-shadow: 0 8rpx 20rpx rgba(2, 132, 199, 0.3);
      }
    }
  }

  &__icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12rpx;
    border-radius: 20rpx;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);

    .wm-tabbar__item--active & {
      background: linear-gradient(135deg, rgba(2, 132, 199, 0.12), rgba(16, 185, 129, 0.12));
      transform: translateY(-4rpx);
    }
  }

  &__fab {
    width: 96rpx;
    height: 96rpx;
    border-radius: 50%;
    background: $wm-gradient-primary;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 16rpx 36rpx rgba(2, 132, 199, 0.45);
    border: 6rpx solid #ffffff;
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s, background 0.2s;

    &:active {
      transform: scale(0.95);
    }
  }

  &__label {
    font-size: 22rpx;
    color: #9ca3af;
    line-height: 1;
    transition: color 0.2s, font-weight 0.2s, transform 0.2s;
    font-weight: 500;

    &--active {
      color: $wm-primary;
      font-weight: 700;
      transform: scale(1.05);
    }

    &--center {
      margin-top: 12rpx;
      color: $wm-primary;
      font-weight: 700;
      transform: scale(1.05);
    }
  }
}
</style>
