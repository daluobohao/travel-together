<template>
  <view v-if="visible" class="emoji-panel">
    <view class="emoji-panel__tabs">
      <view
        v-for="tab in tabs"
        :key="tab.id"
        class="emoji-panel__tab"
        :class="{ 'emoji-panel__tab--active': activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <text>{{ tab.name }}</text>
      </view>
    </view>
    <scroll-view scroll-y class="emoji-panel__body">
      <view v-if="activeTabKind === 'emoji'" class="emoji-panel__grid">
        <view
          v-for="(emoji, idx) in flatEmojis"
          :key="`e_${idx}_${emoji}`"
          class="emoji-panel__cell"
          @click="$emit('pick-emoji', emoji)"
        >
          <text class="emoji-panel__emoji">{{ emoji }}</text>
        </view>
      </view>
      <view v-else class="emoji-panel__grid emoji-panel__grid--sticker">
        <view
          v-for="sticker in stickerItems"
          :key="sticker.id"
          class="emoji-panel__cell emoji-panel__cell--sticker"
          @click="$emit('pick-sticker', sticker.id)"
        >
          <text class="emoji-panel__sticker">{{ sticker.emoji }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { FLAT_EMOJIS, PANEL_TABS, stickersForTab } from '@/utils/chatEmojiData'

export default {
  name: 'ChatEmojiPanel',
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['pick-emoji', 'pick-sticker'],
  data() {
    return {
      tabs: PANEL_TABS,
      flatEmojis: FLAT_EMOJIS,
      activeTab: 'emoji',
    }
  },
  computed: {
    activeTabKind() {
      const tab = this.tabs.find((t) => t.id === this.activeTab)
      return tab?.kind || 'emoji'
    },
    stickerItems() {
      return stickersForTab(this.activeTab)
    },
  },
}
</script>

<style lang="scss" scoped>
.emoji-panel {
  border-top: 1rpx solid #e5e7eb;
  background: #f8fafc;

  &__tabs {
    display: flex;
    gap: 8rpx;
    padding: 12rpx 16rpx 0;
    overflow-x: auto;
  }

  &__tab {
    flex-shrink: 0;
    padding: 10rpx 20rpx;
    border-radius: 999rpx;
    font-size: 24rpx;
    color: #64748b;
    background: #ffffff;

    &--active {
      color: #4f46e5;
      background: #eef2ff;
      font-weight: 600;
    }
  }

  &__body {
    height: 360rpx;
    padding: 12rpx 8rpx calc(12rpx + env(safe-area-inset-bottom));
    box-sizing: border-box;
  }

  &__grid {
    display: flex;
    flex-wrap: wrap;

    &--sticker {
      gap: 4rpx;
    }
  }

  &__cell {
    width: 12.5%;
    height: 80rpx;
    display: flex;
    align-items: center;
    justify-content: center;

    &--sticker {
      width: 25%;
      height: 120rpx;
    }

    &:active {
      opacity: 0.7;
    }
  }

  &__emoji {
    font-size: 44rpx;
    line-height: 1;
  }

  &__sticker {
    font-size: 72rpx;
    line-height: 1;
  }
}
</style>
