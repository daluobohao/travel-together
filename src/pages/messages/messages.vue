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
          <view v-if="tab.key === 'group' ? hasUnreadGroup : tab.key === 'private' ? hasUnreadPrivate : tab.badge" class="tab__dot"></view>
        </view>
      </view>
      <view class="messages__dm-entry" @click="goDmRequests">
        <text class="messages__dm-entry-text">私聊申请</text>
        <wm-icon name="chevronRight" :size="28" color="#6366f1" />
      </view>
    </view>

    <view v-if="!loggedIn" class="messages__login-prompt">
      <text class="messages__login-prompt-title">登录后查看消息</text>
      <text class="messages__login-prompt-sub">活动群聊、私聊与系统通知需登录后使用</text>
      <view class="messages__login-btn" @click="goLogin">去登录</view>
    </view>

    <!-- Skeleton Loading -->
    <view v-else-if="loading" class="skeleton-content">
      <view class="messages__list">
        <view v-for="i in 4" :key="i" class="skeleton-chat">
          <view class="skeleton-chat-avatar"></view>
          <view class="skeleton-chat-body">
            <view class="skeleton-chat-top">
              <view class="skeleton-chat-name"></view>
              <view class="skeleton-chat-time"></view>
            </view>
            <view class="skeleton-chat-bottom">
              <view class="skeleton-chat-msg"></view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- Actual Content -->
    <template v-else>
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
              <view v-if="chat.isCityHall" class="chat__tag-city">
                <text>同城</text>
              </view>
              <text class="chat__time">{{ chat.time }}</text>
            </view>
            <view class="chat__bottom">
              <text class="chat__msg">
                <text class="chat__sender">{{ chat.sender }}：</text>{{ chat.preview }}
              </text>
              <view v-if="chat.unread" class="chat__badge">
                <text>{{ formatChatBadgeCount(chat.unread) }}</text>
              </view>
            </view>
          </view>
        </view>
        <view
          v-if="groupChats.length"
          class="messages__more"
          :class="{ 'messages__more--disabled': groupLoadingMore || !groupHasMore }"
          @click="loadMoreGroup"
        >
          <text v-if="groupLoadingMore">加载中…</text>
          <text v-else-if="groupHasMore">加载更多（{{ groupChats.length }}/{{ groupTotal }}）</text>
          <text v-else>没有更多了</text>
        </view>
      </view>

      <!-- 私聊 -->
      <view v-if="activeTab === 'private'" class="messages__list">
        <view v-if="!privateChats.length" class="messages__empty">
          <text>暂无私聊，可在活动群聊中点击对方头像申请私聊</text>
        </view>
        <view
          v-for="chat in privateChats"
          :key="chat.id"
          class="chat"
          hover-class="chat--hover"
          @click="onOpenPrivate(chat)"
        >
          <view class="chat__avatar chat__avatar--dm">
            <text class="chat__dm-initial">{{ chat.initial }}</text>
          </view>
          <view class="chat__body">
            <view class="chat__top">
              <text class="chat__name">{{ chat.name }}</text>
              <text class="chat__time">{{ chat.time }}</text>
            </view>
            <view class="chat__bottom">
              <text class="chat__msg">
                <text class="chat__sender">私聊：</text>{{ chat.preview }}
              </text>
              <view v-if="chat.unread" class="chat__badge">
                <text>{{ formatChatBadgeCount(chat.unread) }}</text>
              </view>
            </view>
          </view>
        </view>
        <view
          v-if="privateChats.length"
          class="messages__more"
          :class="{ 'messages__more--disabled': privateLoadingMore || !privateHasMore }"
          @click="loadMorePrivate"
        >
          <text v-if="privateLoadingMore">加载中…</text>
          <text v-else-if="privateHasMore">加载更多（{{ privateChats.length }}/{{ privateTotal }}）</text>
          <text v-else>没有更多了</text>
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
          @click="onTapNotif(item)"
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
          <view v-if="!item.read" class="system__dot"></view>
        </view>
        <view
          v-if="systemNotifs.length"
          class="messages__more"
          :class="{ 'messages__more--disabled': notifLoadingMore || !notifHasMore }"
          @click="loadMoreNotif"
        >
          <text v-if="notifLoadingMore">加载中…</text>
          <text v-else-if="notifHasMore">加载更多（{{ systemNotifs.length }}/{{ notifTotal }}）</text>
          <text v-else>没有更多了</text>
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
            @click="onTapNotif(item)"
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
            <view v-if="!item.read" class="system__dot"></view>
          </view>
        </view>
      </view>
    </template>

    <wm-tab-bar active="messages" />

    <dm-request-action-sheet
      :visible="dmRequestSheetVisible"
      :request="dmRequestSheetRequest"
      :current-user-id="currentUserId"
      @update:visible="dmRequestSheetVisible = $event"
      @done="onDmRequestDone"
    />
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import WmTabBar from '@/components/WmTabBar/WmTabBar.vue'
import DmRequestActionSheet from '@/components/DmRequestActionSheet/DmRequestActionSheet.vue'
import {
  getMyChats,
  getDirectChats,
  markMyChatRead,
  getNotifications,
  readAllNotifications,
  readNotification,
  findDmRequest,
  getMe,
  isLoggedIn,
  redirectToLogin,
} from '@/api'
import { formatChatBadgeCount } from '@/utils/chatBadge'

/** 消息列表每页条数（首屏轻量，靠加载更多翻页） */
const LIST_PAGE_SIZE = 5

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
  activity_full: { icon: 'users', bg: '#ecfeff', color: '#0d9488' },
  activity_changed: { icon: 'bell', bg: '#eef2ff', color: '#6366f1' },
  activity_cancelled: { icon: 'bell', bg: '#fef2f2', color: '#ef4444' },
  dm_request: { icon: 'message', bg: '#eef2ff', color: '#6366f1' },
  dm_request_accepted: { icon: 'check', bg: '#ecfdf5', color: '#10b981' },
  default: { icon: 'bell', bg: '#eef2ff', color: '#6366f1' },
}

function mapNotif(x) {
  const style = NOTIF_ICON_MAP[x.type] || NOTIF_ICON_MAP.default
  return {
    id: x.notificationId,
    type: x.type,
    payload: x.payload || {},
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
    'linear-gradient(135deg, #38bdf8, #0284c7)',
    'linear-gradient(135deg, #60a5fa, #6366f1)',
    'linear-gradient(135deg, #14b8a6, #0f7669)',
  ]
  return {
    id: String(item.activityId),
    name: item.title || '活动群聊',
    isCityHall: item.activityKind === 'city_hall',
    sender: item.memberCount ? `${item.memberCount}人` : '群聊',
    preview: item.lastMessage || '暂无消息',
    time: relativeTime(item.lastMessageAt) || '最近',
    unread: Number(item.unreadCount || 0),
    color: colors[idx % colors.length],
  }
}

function mapPrivateChat(item) {
  const name = item.peerNickname || '用户'
  return {
    id: String(item.threadId),
    threadId: item.threadId,
    peerUserId: item.peerUserId || '',
    peerNickname: name,
    peerAvatarUrl: item.peerAvatarUrl || '',
    initial: String(name).slice(0, 1),
    name,
    preview: item.lastMessage || '暂无消息',
    time: relativeTime(item.lastMessageAt) || '最近',
    unread: Number(item.unreadCount || 0),
  }
}

export default {
  components: { WmIcon, WmTabBar, DmRequestActionSheet },
  data() {
    return {
      activeTab: 'group',
      tabs: [
        { key: 'group', label: '活动群聊', badge: true },
        { key: 'private', label: '私聊', badge: false },
        { key: 'system', label: '系统通知' },
      ],
      groupChats: [],
      privateChats: [],
      systemNotifs: [],
      loading: false,
      groupPage: 1,
      groupTotal: 0,
      groupHasMore: false,
      groupLoadingMore: false,
      privatePage: 1,
      privateTotal: 0,
      privateHasMore: false,
      privateLoadingMore: false,
      notifPage: 1,
      notifTotal: 0,
      notifHasMore: false,
      notifLoadingMore: false,
      loggedIn: false,
      currentUserId: '',
      dmRequestSheetVisible: false,
      dmRequestSheetRequest: null,
    }
  },
  computed: {
    hasUnreadGroup() {
      return this.groupChats.some((x) => Number(x.unread || 0) > 0)
    },
    hasUnreadPrivate() {
      return this.privateChats.some((x) => Number(x.unread || 0) > 0)
    },
    hasUnreadNotif() {
      return this.systemNotifs.some((x) => !x.read)
    },
  },
  onShow() {
    this.loggedIn = isLoggedIn()
    if (!this.loggedIn) {
      this.loading = false
      this.groupChats = []
      this.privateChats = []
      this.systemNotifs = []
      return
    }
    this.loadMessages()
  },
  methods: {
    formatChatBadgeCount,
    goLogin() {
      redirectToLogin('/pages/messages/messages')
    },
    _applyPaginationState(prefix, data, listLength) {
      const total = Number(data?.total) || 0
      this[`${prefix}Total`] = total
      this[`${prefix}HasMore`] = listLength < total
    },
    async loadMessages() {
      this.loading = true
      this.groupPage = 1
      this.privatePage = 1
      this.notifPage = 1
      try {
        const [convData, dmData, notifData, me] = await Promise.all([
          getMyChats({ page: 1, pageSize: LIST_PAGE_SIZE }),
          getDirectChats({ page: 1, pageSize: LIST_PAGE_SIZE }),
          getNotifications({ page: 1, pageSize: LIST_PAGE_SIZE }),
          getMe().catch(() => null),
        ])
        this.currentUserId = me?.userId || ''
        this.groupChats = (convData?.list || []).map((item, idx) => mapGroupChat(item, idx))
        this.privateChats = (dmData?.list || []).map(mapPrivateChat)
        this.systemNotifs = (notifData?.list || []).map(mapNotif)
        this._applyPaginationState('group', convData, this.groupChats.length)
        this._applyPaginationState('private', dmData, this.privateChats.length)
        this._applyPaginationState('notif', notifData, this.systemNotifs.length)
      } catch (e) {
        if (e.isAuthError) {
          this.loggedIn = false
          this.groupChats = []
          this.privateChats = []
          this.systemNotifs = []
          uni.showToast({ title: '请先登录', icon: 'none' })
          return
        }
        this.groupChats = []
        this.privateChats = []
        this.systemNotifs = []
        this.groupHasMore = false
        this.privateHasMore = false
        this.notifHasMore = false
        uni.showToast({ title: e?.message || '消息加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    async loadMoreGroup() {
      if (!this.groupHasMore || this.groupLoadingMore || this.loading) return
      this.groupLoadingMore = true
      try {
        const next = this.groupPage + 1
        const data = await getMyChats({ page: next, pageSize: LIST_PAGE_SIZE })
        const base = this.groupChats.length
        const incoming = (data?.list || []).map((item, idx) => mapGroupChat(item, base + idx))
        this.groupChats = [...this.groupChats, ...incoming]
        this.groupPage = next
        this._applyPaginationState('group', data, this.groupChats.length)
      } catch (e) {
        uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
      } finally {
        this.groupLoadingMore = false
      }
    },
    async loadMorePrivate() {
      if (!this.privateHasMore || this.privateLoadingMore || this.loading) return
      this.privateLoadingMore = true
      try {
        const next = this.privatePage + 1
        const data = await getDirectChats({ page: next, pageSize: LIST_PAGE_SIZE })
        const incoming = (data?.list || []).map(mapPrivateChat)
        this.privateChats = [...this.privateChats, ...incoming]
        this.privatePage = next
        this._applyPaginationState('private', data, this.privateChats.length)
      } catch (e) {
        uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
      } finally {
        this.privateLoadingMore = false
      }
    },
    async loadMoreNotif() {
      if (!this.notifHasMore || this.notifLoadingMore || this.loading) return
      this.notifLoadingMore = true
      try {
        const next = this.notifPage + 1
        const data = await getNotifications({ page: next, pageSize: LIST_PAGE_SIZE })
        const incoming = (data?.list || []).map(mapNotif)
        this.systemNotifs = [...this.systemNotifs, ...incoming]
        this.notifPage = next
        this._applyPaginationState('notif', data, this.systemNotifs.length)
      } catch (e) {
        uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
      } finally {
        this.notifLoadingMore = false
      }
    },
    goDmRequests() {
      if (!this.loggedIn) {
        this.goLogin()
        return
      }
      uni.navigateTo({ url: '/pages/dm-requests/dm-requests' })
    },
    onOpenPrivate(chat) {
      if (!chat?.threadId) return
      const q =
        'threadId=' +
        encodeURIComponent(chat.threadId) +
        '&peerNickname=' +
        encodeURIComponent(chat.peerNickname || chat.name || '') +
        (chat.peerUserId ? '&peerUserId=' + encodeURIComponent(chat.peerUserId) : '') +
        (chat.peerAvatarUrl ? '&peerAvatarUrl=' + encodeURIComponent(chat.peerAvatarUrl) : '')
      uni.navigateTo({ url: '/pages/direct-chat-detail/direct-chat-detail?' + q })
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
    async markNotifRead(item) {
      if (!item || item.read) return
      item.read = true
      try {
        await readNotification(item.id)
      } catch (e) {
        item.read = false
        uni.showToast({ title: e?.message || '标记已读失败', icon: 'none' })
      }
    },
    async onTapNotif(item) {
      if (!item) return
      if (item.type === 'dm_request' && item.payload?.dmRequestId) {
        uni.showLoading({ title: '加载中…', mask: true })
        try {
          if (!this.currentUserId) {
            const me = await getMe().catch(() => null)
            this.currentUserId = me?.userId || ''
          }
          const req = await findDmRequest(item.payload.dmRequestId)
          if (!req) {
            uni.showToast({ title: '申请不存在或已处理', icon: 'none' })
            await this.markNotifRead(item)
            return
          }
          this.dmRequestSheetRequest = req
          this.dmRequestSheetVisible = true
          await this.markNotifRead(item)
        } catch (e) {
          uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
        } finally {
          uni.hideLoading()
        }
        return
      }
      await this.markNotifRead(item)
    },
    onDmRequestDone() {
      this.loadMessages()
    },
    async onReadNotif(item) {
      await this.markNotifRead(item)
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
  background: transparent;

  &__header {
    padding: calc(44rpx + var(--status-bar-height, 0px) + env(safe-area-inset-top)) 32rpx 28rpx;
    background: $wm-sticky-header-gradient;
    border-bottom: none;
    box-shadow: 0 12rpx 40rpx rgba(2, 132, 199, 0.06);
  }

  &__title {
    display: block;
    font-size: 56rpx;
    font-weight: 800;
    background: $wm-gradient-hero;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 32rpx;
    line-height: 1.1;
  }

  &__dm-entry {
    margin-top: 8rpx;
    padding: 12rpx 0 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__dm-entry-text {
    font-size: 28rpx;
    color: $wm-primary;
    font-weight: 700;
  }

  &__tabs {
    display: flex;
    gap: 16rpx;
  }

  &__list {
    padding: 28rpx 32rpx 0;
    display: flex;
    flex-direction: column;
    gap: 20rpx;

    &--tight {
      padding-top: 20rpx;
      gap: 16rpx;
    }
  }

  &__section {
    padding: 44rpx 32rpx 32rpx;
  }

  &__section-title {
    display: block;
    font-size: 32rpx;
    font-weight: 700;
    color: $wm-text-1;
    margin-bottom: 8rpx;
  }

  &__empty {
    padding: 80rpx 32rpx;
    text-align: center;
    color: $wm-text-3;
    font-size: 26rpx;
    font-weight: 500;
  }

  &__login-prompt {
    margin: 32rpx 24rpx;
    padding: 48rpx 32rpx;
    background: #ffffff;
    border-radius: $wm-radius-lg;
    text-align: center;
    box-shadow: $wm-shadow-md;
    border: $wm-card-edge;
  }

  &__login-prompt-title {
    display: block;
    font-size: 32rpx;
    font-weight: 700;
    color: $wm-text-1;
  }

  &__login-prompt-sub {
    display: block;
    margin-top: 16rpx;
    font-size: 26rpx;
    color: $wm-text-2;
    line-height: 1.5;
  }

  &__login-btn {
    margin-top: 32rpx;
    height: 84rpx;
    border-radius: 999rpx;
    background: $wm-gradient-primary;
    color: #ffffff;
    font-size: 28rpx;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: $wm-shadow-glow;
  }

  &__more {
    margin: 8rpx 24rpx 24rpx;
    padding: 24rpx;
    text-align: center;
    font-size: 26rpx;
    color: #6366f1;
    background: #f8fafc;
    border-radius: 12rpx;

    &--disabled {
      color: #94a3b8;
    }

    &:active:not(&--disabled) {
      opacity: 0.85;
    }
  }

  &__actions {
    padding: 0 32rpx 8rpx;
    display: flex;
    justify-content: flex-end;
  }

  &__read-all {
    padding: 10rpx 24rpx;
    border-radius: 999rpx;
    background: $wm-primary-soft;
    color: $wm-primary;
    font-size: 24rpx;
    font-weight: 600;
  }

  &__section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8rpx;
  }

  &__section-more {
    font-size: 24rpx;
    color: $wm-primary;
    font-weight: 600;
  }
}

.tab {
  position: relative;
  padding: 16rpx 32rpx;
  border-radius: 999rpx;
  background: #fafafa;
  color: $wm-text-2;
  font-size: 26rpx;
  font-weight: 600;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);

  &--active {
    background: $wm-gradient-primary;
    color: #ffffff;
    font-weight: 700;
    box-shadow: $wm-shadow-glow;
  }

  &__dot {
    position: absolute;
    top: 10rpx;
    right: 12rpx;
    width: 16rpx;
    height: 16rpx;
    border-radius: 50%;
    background: $wm-danger;
    box-shadow: 0 0 0 4rpx #ffffff;
  }
}

.chat {
  background: #ffffff;
  border-radius: $wm-radius-lg;
  padding: 28rpx;
  display: flex;
  gap: 24rpx;
  align-items: center;
  border: $wm-card-edge;
  box-shadow: $wm-shadow-md;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s;

  &--hover {
    transform: scale(0.98) translateY(-2rpx);
    box-shadow: $wm-shadow-lg;
  }

  &__avatar {
    width: 96rpx;
    height: 96rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);

    &--dm {
      background: $wm-gradient-primary;
      color: #ffffff;
      font-size: 34rpx;
      font-weight: 700;
    }
  }

  &__body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 10rpx;
  }

  &__top {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12rpx 16rpx;
    justify-content: flex-end;
  }

  &__name {
    font-size: 32rpx;
    font-weight: 700;
    color: $wm-text-1;
    flex: 1;
    min-width: 0;
  }

  &__tag-city {
    padding: 4rpx 14rpx;
    border-radius: 999rpx;
    background: rgba(99, 102, 241, 0.12);
    font-size: 20rpx;
    color: #4f46e5;
    font-weight: 600;
    flex-shrink: 0;
  }

  &__time {
    font-size: 22rpx;
    color: $wm-text-3;
    flex-shrink: 0;
    font-weight: 500;
    margin-left: auto;
  }

  &__bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16rpx;
  }

  &__msg {
    font-size: 26rpx;
    color: $wm-text-2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
    font-weight: 500;
  }

  &__sender {
    color: $wm-text-1;
    font-weight: 600;
  }

  &__badge {
    min-width: 40rpx;
    height: 40rpx;
    padding: 0 12rpx;
    border-radius: 999rpx;
    background: $wm-gradient-primary;
    color: #ffffff;
    font-size: 22rpx;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 4rpx 12rpx rgba(2, 132, 199, 0.3);
  }
}

.system {
  position: relative;
  background: #ffffff;
  border-radius: $wm-radius-lg;
  padding: 28rpx;
  display: flex;
  gap: 20rpx;
  align-items: flex-start;
  box-shadow: $wm-shadow-md;
  transition: transform 0.15s, box-shadow 0.15s;
  border: $wm-card-edge;

  &--compact {
    padding: 24rpx;
  }

  &--unread {
    background: $wm-primary-soft;
    border-color: rgba(2, 132, 199, 0.2);
    box-shadow: 0 8rpx 28rpx rgba(2, 132, 199, 0.12);
  }

  &__dot {
    position: absolute;
    top: 24rpx;
    right: 24rpx;
    width: 16rpx;
    height: 16rpx;
    border-radius: 50%;
    background: $wm-danger;
    box-shadow: 0 0 8rpx rgba(239, 68, 68, 0.5);
  }

  &__icon {
    width: 72rpx;
    height: 72rpx;
    border-radius: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: $wm-gradient-primary;
    box-shadow: 0 4rpx 12rpx rgba(2, 132, 199, 0.2);
  }

  &__body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
  }

  &__top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__title {
    font-size: 30rpx;
    font-weight: 700;
    color: $wm-text-1;
  }

  &__time {
    font-size: 22rpx;
    color: $wm-text-3;
    flex-shrink: 0;
    font-weight: 500;
  }

  &__desc {
    font-size: 26rpx;
    color: $wm-text-2;
    line-height: 1.6;
    font-weight: 500;
  }
}

/* Skeleton Styles */
.skeleton-content {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.skeleton-chat {
  background: #ffffff;
  border-radius: $wm-radius-lg;
  padding: 28rpx;
  display: flex;
  gap: 24rpx;
  align-items: center;
}

.skeleton-chat-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: linear-gradient(90deg, #fafafa 25%, #e2e8f0 50%, #fafafa 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  flex-shrink: 0;
}

.skeleton-chat-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.skeleton-chat-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.skeleton-chat-name {
  width: 160rpx;
  height: 36rpx;
  border-radius: $wm-radius-sm;
  background: linear-gradient(90deg, #fafafa 25%, #e2e8f0 50%, #fafafa 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-chat-time {
  width: 80rpx;
  height: 26rpx;
  border-radius: $wm-radius-sm;
  background: linear-gradient(90deg, #fafafa 25%, #e2e8f0 50%, #fafafa 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-chat-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.skeleton-chat-msg {
  width: 70%;
  height: 28rpx;
  border-radius: $wm-radius-sm;
  background: linear-gradient(90deg, #fafafa 25%, #e2e8f0 50%, #fafafa 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
