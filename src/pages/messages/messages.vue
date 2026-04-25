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
          <view v-if="tab.key === 'group' ? hasUnreadGroup : tab.badge" class="tab__dot" />
        </view>
      </view>
    </view>

    <!-- Group chats -->
    <view v-if="activeTab === 'group'" class="messages__list">
      <view v-if="!groupChats.length" class="messages__empty">
        <text>还没有活动群聊，报名一个活动就能进群</text>
      </view>
      <view
        v-for="chat in groupChats"
        :key="chat.id"
        class="chat"
        hover-class="chat--hover"
        @click="onOpenGroup(chat)"
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
      <view v-if="!systemNotifs.length" class="messages__empty">
        <text>暂无系统通知</text>
      </view>
      <view v-if="hasUnreadNotif" class="messages__actions">
        <view class="messages__read-all" @click="onReadAll">
          <text>全部标记已读</text>
        </view>
      </view>
      <view
        v-for="item in systemNotifs"
        :key="item.id"
        class="system"
        :class="{ 'system--unread': !item.read }"
        @click="onReadNotif(item)"
      >
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
        <view v-if="!item.read" class="system__dot" />
      </view>
    </view>

    <!-- Bottom: always show system section in group tab as preview -->
    <view v-if="activeTab === 'group'" class="messages__section">
      <view class="messages__section-head">
        <text class="messages__section-title">系统通知</text>
        <text v-if="systemNotifs.length" class="messages__section-more" @click="activeTab = 'system'">
          查看全部
        </text>
      </view>
      <view class="messages__list messages__list--tight">
        <view
          v-for="item in systemNotifs.slice(0, 3)"
          :key="item.id"
          class="system system--compact"
          :class="{ 'system--unread': !item.read }"
          @click="onReadNotif(item)"
        >
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
          <view v-if="!item.read" class="system__dot" />
        </view>
      </view>
    </view>

    <wm-tab-bar active="messages" />
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import WmTabBar from '@/components/WmTabBar/WmTabBar.vue'
import {
  getMyChats,
  markMyChatRead,
  getNotifications,
  readAllNotifications,
  readNotification,
} from '@/api'

function relativeTime(iso) {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Date.now() - t
  if (diff < 60 * 1000) return '刚刚'
  if (diff < 3600 * 1000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 24 * 3600 * 1000) return `${Math.floor(diff / 3600000)}小时前`
  return `${Math.floor(diff / (24 * 3600 * 1000))}天前`
}

const NOTIF_ICON_MAP = {
  enrollment_ok: { icon: 'check', bg: '#ecfdf5', color: '#10b981' },
  activity_full: { icon: 'users', bg: '#fff7ed', color: '#f97316' },
  activity_changed: { icon: 'bell', bg: '#eef2ff', color: '#6366f1' },
  activity_cancelled: { icon: 'bell', bg: '#fef2f2', color: '#ef4444' },
  default: { icon: 'bell', bg: '#eef2ff', color: '#6366f1' },
}

function mapNotif(x) {
  const style = NOTIF_ICON_MAP[x.type] || NOTIF_ICON_MAP.default
  return {
    id: x.notificationId,
    icon: style.icon,
    bg: style.bg,
    color: style.color,
    title: x.title,
    desc: x.body,
    time: relativeTime(x.createdAt) || '最近',
    read: !!x.readAt,
  }
}

function mapGroupChat(item, idx) {
  const colors = [
    'linear-gradient(135deg, #fbbf24, #f97316)',
    'linear-gradient(135deg, #60a5fa, #6366f1)',
    'linear-gradient(135deg, #f87171, #ec4899)',
  ]
  return {
    id: String(item.activityId),
    name: item.title || '活动群聊',
    sender: item.memberCount ? `${item.memberCount}人` : '群聊',
    preview: item.lastMessage || '暂无消息',
    time: relativeTime(item.lastMessageAt) || '最近',
    unread: Number(item.unreadCount || 0),
    color: colors[idx % colors.length],
  }
}

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
  computed: {
    hasUnreadGroup() {
      return this.groupChats.some((x) => Number(x.unread || 0) > 0)
    },
    hasUnreadNotif() {
      return this.systemNotifs.some((x) => !x.read)
    },
  },
  onShow() {
    this.loadMessages()
  },
  methods: {
    async loadMessages() {
      try {
        const [convData, notifData] = await Promise.all([
          getMyChats({ page: 1, pageSize: 20 }),
          getNotifications({ page: 1, pageSize: 20 }),
        ])
        this.groupChats = (convData?.list || []).map(mapGroupChat)
        this.systemNotifs = (notifData?.list || []).map(mapNotif)
      } catch (e) {
        this.groupChats = []
        this.systemNotifs = []
        uni.showToast({ title: e?.message || '消息加载失败', icon: 'none' })
      }
    },
    async onOpenGroup(chat) {
      const activityId = chat?.id || chat?.activityId
      if (activityId) {
      const prevUnread = Number(chat?.unread || 0)
      if (chat) chat.unread = 0
      try {
        await markMyChatRead(activityId)
      } catch (e) {
        if (chat) chat.unread = prevUnread
        uni.showToast({ title: e?.message || '标记已读失败', icon: 'none' })
      }
      }
      uni.navigateTo({
        url: `/pages/chat-detail/chat-detail?id=${activityId || chat.id}`,
      })
    },
    async onReadNotif(item) {
      if (!item || item.read) return
      item.read = true
      try {
        await readNotification(item.id)
      } catch (e) {
        item.read = false
        uni.showToast({ title: e?.message || '标记已读失败', icon: 'none' })
      }
    },
    async onReadAll() {
      if (!this.hasUnreadNotif) return
      const snapshot = this.systemNotifs.map((x) => x.read)
      this.systemNotifs.forEach((x) => {
        x.read = true
      })
      try {
        await readAllNotifications()
      } catch (e) {
        this.systemNotifs.forEach((x, i) => {
          x.read = snapshot[i]
        })
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.messages {
  min-height: 100vh;
  background: #f3f4f6;

  &__header {
    padding: calc(40rpx + var(--status-bar-height, 0px) + env(safe-area-inset-top)) 32rpx 24rpx;
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

  &__empty {
    padding: 60rpx 32rpx;
    text-align: center;
    color: #94a3b8;
    font-size: 24rpx;
  }

  &__actions {
    padding: 0 32rpx 8rpx;
    display: flex;
    justify-content: flex-end;
  }

  &__read-all {
    padding: 8rpx 20rpx;
    border-radius: 999rpx;
    background: #eef2ff;
    color: #6366f1;
    font-size: 22rpx;
    font-weight: 600;
  }

  &__section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4rpx;
  }

  &__section-more {
    font-size: 22rpx;
    color: #6366f1;
    font-weight: 500;
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

    &--dm {
      background: linear-gradient(135deg, #a78bfa, #6366f1);
      color: #ffffff;
      font-size: 32rpx;
      font-weight: 700;
    }
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
  position: relative;
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

  &--unread {
    background: #f5f3ff;
    box-shadow: 0 2rpx 10rpx rgba(99, 102, 241, 0.08);
  }

  &__dot {
    position: absolute;
    top: 20rpx;
    right: 20rpx;
    width: 14rpx;
    height: 14rpx;
    border-radius: 50%;
    background: #ef4444;
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
