<template>
  <view class="page chat-members">
    <view class="chat-members__header">
      <view class="chat-members__back" @click="goBack">
        <wm-icon name="chevronLeft" :size="34" color="#0f172a" />
      </view>
      <view class="chat-members__title-wrap">
        <text class="chat-members__title">群成员</text>
        <text class="chat-members__sub">{{ headerSub }}</text>
      </view>
      <view class="chat-members__placeholder" />
    </view>

    <view v-if="isCityHall" class="chat-members__tip">
      <text>共 {{ memberTotalLabel }} 人，以下为部分成员；大群不便展示全员，可在群内继续认识新友。</text>
    </view>

    <scroll-view
      class="chat-members__scroll"
      scroll-y
      :style="{ height: scrollHeight + 'px' }"
      @scrolltolower="onScrollToLower"
    >
      <view v-if="loading && !members.length" class="chat-members__state">
        <text>加载中…</text>
      </view>
      <view v-else-if="!members.length" class="chat-members__state">
        <text>暂无成员</text>
      </view>
      <view v-else class="chat-members__list">
        <view
          v-for="m in members"
          :key="m.userId"
          class="member-row"
          @click="openUser(m)"
        >
          <view class="member-row__avatar">
            <image
              v-if="m.avatarUrl"
              class="member-row__avatar-img"
              :src="m.avatarUrl"
              mode="aspectFill"
            />
            <text v-else>{{ m.avatarLetter }}</text>
          </view>
          <view class="member-row__main">
            <view class="member-row__name-line">
              <text class="member-row__name">{{ m.nickname }}</text>
              <text v-if="m.role === 'organizer'" class="member-row__badge">组织者</text>
            </view>
            <text v-if="m.joinedLabel" class="member-row__meta">{{ m.joinedLabel }}</text>
          </view>
          <text class="member-row__chev">›</text>
        </view>
      </view>
      <view v-if="loadingMore" class="chat-members__footer">
        <text>加载中…</text>
      </view>
      <view v-else-if="!hasMore && members.length" class="chat-members__footer">
        <text>{{ footerHint }}</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import { getActivityMembers } from '@/api'

const PAGE_SIZE = 20
/** 城市大群最多自动加载页数，避免大表分页压力 */
const CITY_HALL_MAX_PAGES = 5

export default {
  components: { WmIcon },
  data() {
    const sys = uni.getSystemInfoSync()
    return {
      activityId: '',
      chatTitle: '',
      activityKind: 'event',
      memberTotal: 0,
      maxMembers: 0,
      members: [],
      page: 1,
      hasMore: true,
      loading: true,
      loadingMore: false,
      scrollHeight: Math.max(320, (sys.windowHeight || 600) - 120),
    }
  },
  computed: {
    isCityHall() {
      return this.activityKind === 'city_hall'
    },
    memberTotalLabel() {
      const n = Number(this.memberTotal) || 0
      return n > 0 ? String(n) : '—'
    },
    headerSub() {
      const n = Number(this.memberTotal) || 0
      if (this.isCityHall) {
        return n > 0 ? `共 ${n} 人 · 部分展示` : '城市大群'
      }
      const max = Number(this.maxMembers) || 0
      if (max > 0) return `${n}/${max} 人`
      return n > 0 ? `${n} 人` : this.chatTitle || '活动群聊'
    },
    footerHint() {
      if (this.isCityHall && this.page >= CITY_HALL_MAX_PAGES) {
        return '已展示部分成员，更多请在群内交流'
      }
      return '没有更多了'
    },
  },
  onLoad(query) {
    this.activityId = query?.id ? decodeURIComponent(String(query.id)) : ''
    this.chatTitle = query?.title ? decodeURIComponent(String(query.title)) : ''
    this.activityKind = query?.activityKind ? decodeURIComponent(String(query.activityKind)) : 'event'
    this.memberTotal = Number(query?.memberTotal) || 0
    this.maxMembers = Number(query?.maxMembers) || 0
    this.loadPage(1, true)
  },
  methods: {
    normalizeRow(raw) {
      if (!raw?.userId) return null
      const nickname = raw.nickname || '用户'
      let joinedLabel = ''
      if (raw.joinedAt) {
        try {
          const d = new Date(raw.joinedAt)
          if (!Number.isNaN(d.getTime())) {
            joinedLabel = `加入于 ${d.getMonth() + 1}/${d.getDate()}`
          }
        } catch (e) {
          // ignore
        }
      }
      return {
        userId: raw.userId,
        nickname,
        avatarUrl: raw.avatarUrl || '',
        avatarLetter: String(nickname).slice(0, 1),
        role: raw.role || 'member',
        joinedLabel,
      }
    },
    async loadPage(page, replace = false) {
      if (!this.activityId) return
      if (replace) {
        this.loading = true
      } else {
        this.loadingMore = true
      }
      try {
        const data = await getActivityMembers(this.activityId, {
          page,
          pageSize: PAGE_SIZE,
        })
        const incoming = (data?.list || []).map((m) => this.normalizeRow(m)).filter(Boolean)
        if (replace) {
          this.members = incoming
        } else {
          const seen = new Set(this.members.map((m) => m.userId))
          for (const row of incoming) {
            if (!seen.has(row.userId)) {
              this.members.push(row)
              seen.add(row.userId)
            }
          }
        }
        this.page = page
        const shortPage = incoming.length < PAGE_SIZE
        const hitCityCap = this.isCityHall && page >= CITY_HALL_MAX_PAGES
        this.hasMore = !shortPage && !hitCityCap
      } catch (e) {
        uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
        if (replace) this.members = []
        this.hasMore = false
      } finally {
        this.loading = false
        this.loadingMore = false
      }
    },
    onScrollToLower() {
      if (!this.hasMore || this.loading || this.loadingMore) return
      this.loadPage(this.page + 1, false)
    },
    openUser(m) {
      if (!m?.userId) return
      uni.navigateTo({
        url:
          '/pages/user-public/user-public?userId=' +
          encodeURIComponent(m.userId) +
          '&activityId=' +
          encodeURIComponent(this.activityId),
      })
    },
    goBack() {
      uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/messages/messages' }) })
    },
  },
}
</script>

<style lang="scss" scoped>
.chat-members {
  min-height: 100vh;
  background: #f8fafc;
  display: flex;
  flex-direction: column;

  &__header {
    position: sticky;
    top: 0;
    z-index: 10;
    height: calc(96rpx + var(--status-bar-height, 0px) + env(safe-area-inset-top));
    padding: calc(var(--status-bar-height, 0px) + env(safe-area-inset-top)) 24rpx 0;
    background: $wm-sticky-header-gradient;
    box-shadow: 0 8rpx 28rpx rgba(99, 102, 241, 0.07);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__back,
  &__placeholder {
    width: 72rpx;
    height: 72rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__title-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rpx;
    min-width: 0;
  }

  &__title {
    font-size: 30rpx;
    font-weight: 600;
    color: #0f172a;
  }

  &__sub {
    font-size: 20rpx;
    color: #94a3b8;
    max-width: 420rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__tip {
    margin: 16rpx 24rpx 0;
    padding: 16rpx 20rpx;
    background: #eef2ff;
    border-radius: 12rpx;
    font-size: 22rpx;
    color: #475569;
    line-height: 1.5;
  }

  &__scroll {
    flex: 1;
    margin-top: 12rpx;
  }

  &__state,
  &__footer {
    padding: 48rpx 24rpx;
    text-align: center;
    font-size: 24rpx;
    color: #94a3b8;
  }

  &__list {
    padding: 8rpx 24rpx 32rpx;
  }
}

.member-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #e2e8f0;

  &:active {
    opacity: 0.85;
  }

  &__avatar {
    width: 80rpx;
    height: 80rpx;
    border-radius: 8rpx;
    background: #c8c8c8;
    color: #fff;
    font-size: 28rpx;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
  }

  &__avatar-img {
    width: 100%;
    height: 100%;
  }

  &__main {
    flex: 1;
    min-width: 0;
  }

  &__name-line {
    display: flex;
    align-items: center;
    gap: 10rpx;
  }

  &__name {
    font-size: 28rpx;
    color: #0f172a;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__badge {
    flex-shrink: 0;
    font-size: 20rpx;
    color: #6366f1;
    background: #eef2ff;
    padding: 2rpx 10rpx;
    border-radius: 6rpx;
  }

  &__meta {
    margin-top: 4rpx;
    font-size: 22rpx;
    color: #94a3b8;
  }

  &__chev {
    font-size: 32rpx;
    color: #cbd5e1;
  }
}
</style>
