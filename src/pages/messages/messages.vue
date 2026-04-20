<template>
  <view class="page messages">
    <!-- Header -->
    <view class="messages__header">
      <text class="messages__title">消息</text>
      <view class="messages__tabs">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="tab"
          :class="{ 'tab--active': activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          <text>{{ tab.label }}</text>
          <view v-if="tab.badge" class="tab__dot" />
        </view>
      </view>
    </view>

    <!-- Group chats -->
    <view v-if="activeTab === 'group'" class="messages__list">
      <view
        v-for="chat in groupChats"
        :key="chat.id"
        class="chat"
        hover-class="chat--hover"
        @click="onOpenChat(chat)"
      >
        <view class="chat__avatar" :style="{ background: chat.color }">
          <wm-icon name="message" :size="40" color="#ffffff" />
        </view>
        <view class="chat__body">
          <view class="chat__top">
            <text class="chat__name">{{ chat.name }}</text>
            <text class="chat__time">{{ chat.time }}</text>
          </view>
          <view class="chat__bottom">
            <text class="chat__msg">
              <text class="chat__sender">{{ chat.sender }}：</text>{{ chat.preview }}
            </text>
            <view v-if="chat.unread" class="chat__badge">
              <text>{{ chat.unread }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- System -->
    <view v-if="activeTab === 'system'" class="messages__list">
      <view v-for="item in systemNotifs" :key="item.id" class="system">
        <view class="system__icon" :style="{ background: item.bg, color: item.color }">
          <wm-icon :name="item.icon" :size="36" :color="item.color" />
        </view>
        <view class="system__body">
          <view class="system__top">
            <text class="system__title">{{ item.title }}</text>
            <text class="system__time">{{ item.time }}</text>
          </view>
          <text class="system__desc">{{ item.desc }}</text>
        </view>
      </view>
    </view>

    <!-- Bottom: always show system section in group tab as preview -->
    <view v-if="activeTab === 'group'" class="messages__section">
      <text class="messages__section-title">系统通知</text>
      <view class="messages__list messages__list--tight">
        <view v-for="item in systemNotifs" :key="item.id" class="system system--compact">
          <view class="system__icon" :style="{ background: item.bg, color: item.color }">
            <wm-icon :name="item.icon" :size="32" :color="item.color" />
          </view>
          <view class="system__body">
            <view class="system__top">
              <text class="system__title">{{ item.title }}</text>
              <text class="system__time">{{ item.time }}</text>
            </view>
            <text class="system__desc">{{ item.desc }}</text>
          </view>
        </view>
      </view>
    </view>

    <wm-tab-bar active="messages" />
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import WmTabBar from '@/components/WmTabBar/WmTabBar.vue'
import { getConversationList, getNotifications } from '@/api'

export default {
  components: { WmIcon, WmTabBar },
  data() {
    return {
      activeTab: 'group',
      tabs: [
        { key: 'group', label: '活动群聊', badge: true },
        { key: 'system', label: '系统通知' },
      ],
      groupChats: [],
      systemNotifs: [],
    }
  },
  onShow() {
    this.loadMessages()
  },
  methods: {
    async loadMessages() {
      const [convData, notifData] = await Promise.all([getConversationList(), getNotifications({ page: 1, pageSize: 20 })])
      this.groupChats = convData?.list || []
      this.systemNotifs = (notifData?.list || []).map((x) => ({
        id: x.notificationId,
        icon: x.type === 'enrollment_ok' ? 'check' : 'bell',
        bg: x.type === 'enrollment_ok' ? '#ecfdf5' : '#eef2ff',
        color: x.type === 'enrollment_ok' ? '#10b981' : '#6366f1',
        title: x.title,
        desc: x.body,
        time: '最近',
      }))
    },
    onOpenChat(chat) {
      uni.navigateTo({
        url: `/pages/chat-detail/chat-detail?id=${chat.id}`,
      })
    },
  },
}
</script>

<style lang="scss" scoped>
.messages {
  min-height: 100vh;
  background: #f3f4f6;

  &__header {
    padding: calc(40rpx + env(safe-area-inset-top)) 32rpx 24rpx;
    background: #ffffff;
  }

  &__title {
    display: block;
    font-size: 52rpx;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 28rpx;
  }

  &__tabs {
    display: flex;
    gap: 16rpx;
  }

  &__list {
    padding: 24rpx 32rpx 0;
    display: flex;
    flex-direction: column;
    gap: 20rpx;

    &--tight {
      padding-top: 16rpx;
      gap: 16rpx;
    }
  }

  &__section {
    padding: 40rpx 32rpx 32rpx;
  }

  &__section-title {
    display: block;
    font-size: 30rpx;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 4rpx;
  }
}

.tab {
  position: relative;
  padding: 14rpx 28rpx;
  border-radius: 999rpx;
  background: #f1f5f9;
  color: #475569;
  font-size: 24rpx;

  &--active {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: #ffffff;
    font-weight: 600;
  }

  &__dot {
    position: absolute;
    top: 8rpx;
    right: 10rpx;
    width: 14rpx;
    height: 14rpx;
    border-radius: 50%;
    background: #ef4444;
    box-shadow: 0 0 0 4rpx #ffffff;
  }
}

.chat {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx;
  display: flex;
  gap: 20rpx;
  align-items: center;
  box-shadow: 0 4rpx 16rpx rgba(15, 23, 42, 0.04);
  transition: transform 0.15s;

  &--hover {
    transform: scale(0.985);
  }

  &__avatar {
    width: 88rpx;
    height: 88rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
  }

  &__top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__name {
    font-size: 30rpx;
    font-weight: 600;
    color: #0f172a;
  }

  &__time {
    font-size: 22rpx;
    color: #94a3b8;
    flex-shrink: 0;
  }

  &__bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16rpx;
  }

  &__msg {
    font-size: 24rpx;
    color: #64748b;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }

  &__sender {
    color: #0f172a;
    font-weight: 500;
  }

  &__badge {
    min-width: 36rpx;
    height: 36rpx;
    padding: 0 10rpx;
    border-radius: 999rpx;
    background: #ef4444;
    color: #ffffff;
    font-size: 20rpx;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
}

.system {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx;
  display: flex;
  gap: 18rpx;
  align-items: flex-start;
  box-shadow: 0 2rpx 10rpx rgba(15, 23, 42, 0.03);

  &--compact {
    padding: 20rpx;
  }

  &__icon {
    width: 68rpx;
    height: 68rpx;
    border-radius: 18rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6rpx;
  }

  &__top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__title {
    font-size: 28rpx;
    font-weight: 600;
    color: #0f172a;
  }

  &__time {
    font-size: 20rpx;
    color: #94a3b8;
    flex-shrink: 0;
  }

  &__desc {
    font-size: 24rpx;
    color: #64748b;
    line-height: 1.5;
  }
}
</style>
