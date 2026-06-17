<template>
  <view class="page my-feed-page">
    <view class="my-feed-page__header">
      <view class="my-feed-page__back" @click="goBack">
        <wm-icon name="chevronLeft" :size="34" color="#0f172a" />
      </view>
      <text class="my-feed-page__title">我的动态</text>
      <text class="my-feed-page__action" @click="goPublish">发布</text>
    </view>

    <view class="my-feed-page__body">
      <view v-if="loading" class="my-feed-page__state"><text>加载中…</text></view>
      <view v-else-if="!posts.length" class="my-feed-page__empty panel">
        <text class="my-feed-page__empty-title">还没有发布动态</text>
        <text class="my-feed-page__empty-desc">分享你在同城的状态、找搭子或活动感受</text>
        <view class="my-feed-page__empty-btn" @click="goPublish">去发布</view>
      </view>
      <view v-else>
        <view class="my-feed-page__summary panel">
          <text>共 {{ total }} 条</text>
        </view>
        <view v-for="p in posts" :key="p.postId" class="my-feed-page__item">
          <feed-post-card
            :item="p"
            @open="openDetail"
            @refresh="reload"
            @share-prepare="onFeedSharePrepare"
          />
          <view class="my-feed-page__actions">
            <text class="my-feed-page__delete" @click="confirmDelete(p)">删除</text>
          </view>
        </view>
        <view v-if="hasMore" class="my-feed-page__more" @click="loadMore">
          <text>{{ loadingMore ? '加载中…' : '加载更多' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import FeedPostCard from '@/components/FeedPostCard/FeedPostCard.vue'
import {
  deleteFeedPost,
  getMe,
  getUserFeedPosts,
  isLoggedIn,
  redirectToLogin,
} from '@/api'
import feedSharePageMixin from '@/mixins/feedSharePage'
import { resolveFeedShareAppMessage, resolveFeedShareTimeline } from '@/utils/feedShare'

const PAGE_SIZE = 20

export default {
  components: { WmIcon, FeedPostCard },
  mixins: [feedSharePageMixin],
  data() {
    return {
      userId: '',
      posts: [],
      total: 0,
      page: 1,
      loading: true,
      loadingMore: false,
      deletingId: '',
    }
  },
  computed: {
    hasMore() {
      return this.posts.length < this.total
    },
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    goPublish() {
      uni.navigateTo({ url: '/pages/feed-publish/feed-publish' })
    },
    openDetail(item) {
      uni.navigateTo({
        url: `/pages/feed-detail/feed-detail?postId=${encodeURIComponent(item.postId)}`,
      })
    },
    async reload() {
      this.page = 1
      await this.loadPosts(false)
    },
    async loadPosts(append = false) {
      if (!this.userId) return
      if (append) this.loadingMore = true
      else this.loading = true
      try {
        const d = await getUserFeedPosts(this.userId, {
          page: this.page,
          pageSize: PAGE_SIZE,
        })
        const list = d?.list || []
        this.total = d?.total ?? list.length
        this.posts = append ? this.posts.concat(list) : list
      } catch (e) {
        if (!append) {
          this.posts = []
          this.total = 0
        }
        uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
      } finally {
        this.loading = false
        this.loadingMore = false
      }
    },
    async loadMore() {
      if (this.loadingMore || !this.hasMore) return
      this.page += 1
      await this.loadPosts(true)
    },
    confirmDelete(item) {
      if (this.deletingId) return
      uni.showModal({
        title: '删除动态',
        content: '删除后不可恢复，确认删除这条动态？',
        confirmColor: '#ef4444',
        success: async (res) => {
          if (!res.confirm) return
          this.deletingId = item.postId
          try {
            await deleteFeedPost(item.postId)
            uni.showToast({ title: '已删除', icon: 'success' })
            this.posts = this.posts.filter((p) => p.postId !== item.postId)
            this.total = Math.max(0, this.total - 1)
          } catch (e) {
            uni.showToast({ title: e?.message || '删除失败', icon: 'none' })
          } finally {
            this.deletingId = ''
          }
        },
      })
    },
    async init() {
      if (!isLoggedIn()) {
        redirectToLogin('/pages/my-feed-posts/my-feed-posts')
        return
      }
      try {
        const me = await getMe()
        this.userId = me?.userId || ''
        if (!this.userId) {
          uni.showToast({ title: '请先登录', icon: 'none' })
          return
        }
        await this.reload()
      } catch (e) {
        this.loading = false
        uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
      }
    },
  },
  onShow() {
    // #ifdef MP-WEIXIN
    try {
      uni.showShareMenu({
        withShareTicket: true,
        menus: ['shareAppMessage', 'shareTimeline'],
      })
    } catch (_) {
      /* ignore */
    }
    // #endif
    // #ifdef MP-TOUTIAO
    Promise.resolve(uni.showShareMenu({ withShareTicket: false })).catch(() => {})
    // #endif
    if (this.userId) this.reload()
    else this.init()
  },
  onShareAppMessage() {
    return resolveFeedShareAppMessage(this, () => ({
      title: '旅聚 · 我的同城动态',
      path: '/pages/my-feed-posts/my-feed-posts',
    }))
  },
  // #ifdef MP-WEIXIN
  onShareTimeline() {
    return resolveFeedShareTimeline(this, () => ({
      title: '旅聚 · 我的同城动态',
    }))
  },
  // #endif
  onLoad() {
    this.init()
  },
}
</script>

<style lang="scss" scoped>
.my-feed-page {
  min-height: 100vh;
  background: transparent;

  &__header {
    position: sticky;
    top: 0;
    z-index: 10;
    height: calc(96rpx + var(--status-bar-height, 0px) + env(safe-area-inset-top));
    padding: calc(var(--status-bar-height, 0px) + env(safe-area-inset-top)) 24rpx 0;
    background: $wm-sticky-header-gradient;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__back {
    width: 72rpx;
    height: 72rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__title {
    font-size: 32rpx;
    font-weight: 600;
    color: #0f172a;
  }

  &__action {
    min-width: 72rpx;
    text-align: right;
    font-size: 28rpx;
    color: $wm-primary;
    font-weight: 600;
  }

  &__body {
    padding: 24rpx;
  }

  &__state {
    text-align: center;
    padding: 80rpx 0;
    color: #94a3b8;
    font-size: 28rpx;
  }

  &__summary {
    margin-bottom: 8rpx;
    padding: 20rpx 24rpx;
    font-size: 24rpx;
    color: #64748b;
  }

  &__item {
    margin-bottom: 8rpx;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    padding: 0 8rpx 16rpx;
  }

  &__delete {
    font-size: 26rpx;
    color: #ef4444;
    padding: 8rpx 12rpx;
  }

  &__more {
    text-align: center;
    padding: 24rpx;
    font-size: 26rpx;
    color: #64748b;
  }

  &__empty {
    padding: 48rpx 32rpx;
    text-align: center;
  }

  &__empty-title {
    display: block;
    font-size: 30rpx;
    font-weight: 600;
    color: #0f172a;
  }

  &__empty-desc {
    display: block;
    margin-top: 12rpx;
    font-size: 26rpx;
    color: #94a3b8;
    line-height: 1.5;
  }

  &__empty-btn {
    margin-top: 32rpx;
    display: inline-flex;
    padding: 16rpx 40rpx;
    border-radius: 999rpx;
    background: $wm-gradient-primary;
    color: #fff;
    font-size: 28rpx;
    font-weight: 600;
  }
}

.panel {
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(15, 23, 42, 0.04);
}
</style>
