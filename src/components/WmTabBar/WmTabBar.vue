<template>
  <view class="wm-tabbar-root">
    <view class="wm-tabbar-placeholder" />
    <view class="wm-tabbar">
      <view
        v-for="item in tabs"
        :key="item.key"
        class="wm-tabbar__item"
        :class="{
          'wm-tabbar__item--center': item.center,
          'wm-tabbar__item--active': active === item.key,
        }"
        :hover-class="!item.center ? 'wm-tabbar__item--hover' : ''"
        @click="onSwitch(item)"
      >
        <template v-if="item.center">
          <view class="wm-tabbar__fab">
            <wm-icon name="plus" :size="44" color="#ffffff" />
          </view>
          <text class="wm-tabbar__label wm-tabbar__label--center">发活动</text>
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
          <view
            v-if="item.key === 'messages' && messagesBadgeText"
            class="wm-tabbar__badge"
          >
            <text class="wm-tabbar__badge-text">{{ messagesBadgeText }}</text>
          </view>
          <view
            v-else-if="item.key === 'messages' && messagesNotifDot"
            class="wm-tabbar__badge wm-tabbar__badge--dot"
          />
        </template>
      </view>
    </view>
  </view>
</template>

<script>
import WmIcon from '../WmIcon/WmIcon.vue'
import { isLoggedIn, redirectToLogin } from '@/api'
import { formatChatBadgeCount } from '@/utils/chatBadge'
import {
  getMessageUnreadState,
  refreshMessageUnreadSummary,
  subscribeMessageUnread,
} from '@/utils/messageUnread'

export default {
  name: 'WmTabBar',
  components: { WmIcon },
  props: {
    active: {
      type: String,
      default: 'home',
    },
    /** ≥0 时优先用页面传入的未读（如消息页列表已算好）；默认 -1 走全局 store */
    chatUnread: {
      type: Number,
      default: -1,
    },
    notifUnread: {
      type: Number,
      default: -1,
    },
  },
  data() {
    return {
      tabs: [
        { key: 'home', label: '首页', icon: 'home', path: '/pages/home/home' },
        { key: 'discover', label: '动态', icon: 'globe', path: '/pages/discover/discover' },
        { key: 'publish', label: '发活动', icon: 'plus', center: true },
        { key: 'messages', label: '消息', icon: 'message', path: '/pages/messages/messages' },
        { key: 'profile', label: '我的', icon: 'user', path: '/pages/profile/profile' },
      ],
      storeChatUnread: 0,
      storeNotifUnread: 0,
    }
  },
  computed: {
    displayChatUnread() {
      if (this.chatUnread >= 0) return this.chatUnread
      return this.storeChatUnread
    },
    displayNotifUnread() {
      if (this.notifUnread >= 0) return this.notifUnread
      return this.storeNotifUnread
    },
    messagesBadgeText() {
      return formatChatBadgeCount(this.displayChatUnread)
    },
    messagesNotifDot() {
      return !this.messagesBadgeText && Number(this.displayNotifUnread) > 0
    },
  },
  watch: {
    chatUnread() {
      /* 父页 props 变化时确保重绘 */
    },
  },
  mounted() {
    this.syncFromStore()
    this._unsubUnread = subscribeMessageUnread(() => {
      this.syncFromStore()
    })
    if (this.chatUnread < 0) {
      refreshMessageUnreadSummary()
    }
  },
  beforeUnmount() {
    if (this._unsubUnread) this._unsubUnread()
  },
  pageLifetimes: {
    show() {
      if (this.chatUnread < 0) {
        refreshMessageUnreadSummary()
      }
    },
  },
  methods: {
    syncFromStore() {
      const s = getMessageUnreadState()
      this.storeChatUnread = Number(s.chatUnread) || 0
      this.storeNotifUnread = Number(s.notifUnread) || 0
    },
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
      uni.navigateTo({ url: '/pages/publish/publish' })
    },
  },
}
</script>

<style lang="scss" scoped>
.wm-tabbar-root {
  position: relative;
  z-index: 100;
}

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
    position: relative;
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);

    &--hover {
      transform: scale(0.95);
    }

    &--center {
      margin-top: -44rpx;
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

  &__badge {
    position: absolute;
    top: 4rpx;
    right: 18rpx;
    min-width: 32rpx;
    height: 32rpx;
    padding: 0 8rpx;
    border-radius: 999rpx;
    background: #ef4444;
    border: 2rpx solid #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2rpx 8rpx rgba(239, 68, 68, 0.4);
    z-index: 30;
    pointer-events: none;
    box-sizing: border-box;

    &-text {
      font-size: 20rpx;
      font-weight: 700;
      color: #ffffff;
      line-height: 1;
    }

    &--dot {
      min-width: 16rpx;
      width: 16rpx;
      height: 16rpx;
      padding: 0;
      top: 10rpx;
      right: 28rpx;
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
      font-size: 20rpx;
      white-space: nowrap;
    }
  }
}
</style>
