<template>
  <view class="page sub feed-page">
    <view class="sub__header">
      <view class="sub__back" @click="goBack"><wm-icon name="chevronLeft" :size="36" color="#0f172a" /></view>
      <text class="sub__title">同城动态</text>
      <view class="sub__sp publish-btn" @click="goPublish">发布</view>
    </view>

    <view class="feed-tabs">
      <text
        class="feed-tabs__item"
        :class="{ 'feed-tabs__item--on': scope === 'city' }"
        @click="switchScope('city')"
      >
        同城
      </text>
      <text
        class="feed-tabs__item"
        :class="{ 'feed-tabs__item--on': scope === 'following' }"
        @click="switchScope('following')"
      >
        关注
      </text>
    </view>

    <view v-if="loading && !list.length" class="sub__state"><text>加载中…</text></view>
    <view v-else-if="!list.length" class="sub__state"><text>暂无动态，来做第一个分享的人吧</text></view>
    <view v-else class="sub__body">
      <feed-post-card
        v-for="item in list"
        :key="item.postId"
        :item="item"
        @refresh="load(true)"
        @open="openDetail"
      />
    </view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import FeedPostCard from '@/components/FeedPostCard/FeedPostCard.vue'
import { getCityFeed, isLoggedIn, redirectToLogin } from '@/api'

export default {
  components: { WmIcon, FeedPostCard },
  data() {
    return {
      scope: 'city',
      cityCode: '110000',
      loading: true,
      list: [],
      page: 1,
      total: 0,
    }
  },
  methods: {
    goBack() {
      uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/discover/discover' }) })
    },
    goPublish() {
      if (!isLoggedIn()) {
        redirectToLogin('/pages/feed/feed')
        return
      }
      uni.navigateTo({
        url: `/pages/feed-publish/feed-publish?cityCode=${encodeURIComponent(this.cityCode)}`,
      })
    },
    switchScope(s) {
      this.scope = s
      this.load(true)
    },
    openDetail(item) {
      uni.navigateTo({ url: `/pages/feed-detail/feed-detail?postId=${encodeURIComponent(item.postId)}` })
    },
    async load(reset = true) {
      if (reset) {
        this.loading = true
        this.page = 1
        this.list = []
      }
      try {
        const d = await getCityFeed({
          scope: this.scope,
          cityCode: this.scope === 'city' ? this.cityCode : undefined,
          page: this.page,
          pageSize: 20,
        })
        const rows = d?.list || []
        this.total = d?.total ?? 0
        this.list = reset ? rows : [...this.list, ...rows]
      } catch (e) {
        uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
  },
  onLoad(options) {
    if (options?.cityCode) this.cityCode = options.cityCode
  },
  onShow() {
    this.load(true)
  },
  onReachBottom() {
    if (this.list.length >= this.total) return
    this.page += 1
    this.load(false)
  },
}
</script>

<style lang="scss" scoped>
@import '@/styles/sub-page.scss';
.publish-btn {
  font-size: 28rpx;
  color: #0284c7;
  font-weight: 600;
  width: auto;
  padding: 0 8rpx;
}
.feed-tabs {
  display: flex;
  gap: 24rpx;
  padding: 16rpx 32rpx 0;
  &__item {
    font-size: 28rpx;
    color: #94a3b8;
    padding-bottom: 12rpx;
    border-bottom: 4rpx solid transparent;
    &--on {
      color: #0f172a;
      font-weight: 600;
      border-bottom-color: #0284c7;
    }
  }
}
</style>
