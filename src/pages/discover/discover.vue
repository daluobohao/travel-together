<template>
  <view class="page city-feed">
    <view class="city-feed__header">
      <view class="city-feed__header-main">
        <view class="city-feed__brand">
          <text class="city-feed__title">同城动态</text>
          <text class="city-feed__subtitle">看看同城旅人在聊什么</text>
        </view>
        <view class="city-feed__header-actions">
          <!-- #ifdef MP-WEIXIN -->
          <button
            class="city-feed__header-icon-btn city-feed__header-icon-btn--share"
            type="default"
            hover-class="city-feed__header-icon-btn--hover"
            open-type="share"
          >
            <wm-icon name="shareForward" :size="34" color="#0f172a" />
          </button>
          <view
            class="city-feed__header-icon-btn"
            hover-class="city-feed__header-icon-btn--hover"
            @click="onCopyShare"
          >
            <wm-icon name="link2" :size="34" color="#0f172a" />
          </view>
          <!-- #endif -->
          <view class="city-feed__publish" hover-class="city-feed__publish--hover" @click="goPublish">
            <wm-icon name="plus" :size="30" color="#ffffff" />
            <text>发布</text>
          </view>
        </view>
      </view>

      <view
        class="city-feed__city-row"
        :class="{ 'city-feed__city-row--disabled': isPersonalScope }"
        hover-class="city-feed__city-row--hover"
        @click="onOpenCityPicker"
      >
        <view class="city-feed__city-main">
          <wm-icon name="mapPin" :size="32" color="#0284c7" />
          <view class="city-feed__city-text">
            <text class="city-feed__city-name">{{ currentCityLabel }}</text>
            <text class="city-feed__city-hint">{{ cityRowHint }}</text>
          </view>
        </view>
        <view v-if="scope === 'city'" class="city-feed__city-action">
          <text>切换</text>
          <wm-icon name="chevronRight" :size="24" color="#94a3b8" />
        </view>
      </view>
    </view>

    <view class="city-feed__tabs">
      <text
        class="city-feed__tab"
        :class="{ 'city-feed__tab--on': scope === 'city' }"
        @click="switchScope('city')"
      >
        同城
      </text>
      <text
        class="city-feed__tab"
        :class="{ 'city-feed__tab--on': scope === 'following' }"
        @click="switchScope('following')"
      >
        关注的人
      </text>
      <text
        class="city-feed__tab"
        :class="{ 'city-feed__tab--on': scope === 'friends' }"
        @click="switchScope('friends')"
      >
        好友动态
      </text>
    </view>

    <scroll-view
      v-if="scope === 'city'"
      class="city-feed__topic-bar"
      scroll-x
      :show-scrollbar="false"
    >
      <view class="city-feed__topic-inner">
        <text
          class="city-feed__topic-chip"
          :class="{ 'city-feed__topic-chip--on': !topicFilter }"
          @click="setTopicFilter('')"
        >
          全部
        </text>
        <text
          v-for="t in filterTopics"
          :key="t.id"
          class="city-feed__topic-chip"
          :class="{ 'city-feed__topic-chip--on': topicFilter === t.id }"
          @click="setTopicFilter(t.id)"
        >
          {{ t.label }}
        </text>
      </view>
    </scroll-view>

    <view v-if="loading && !list.length" class="city-feed__state">
      <text>加载中…</text>
    </view>
    <view v-else-if="!list.length" class="city-feed__state">
      <text>{{ emptyText }}</text>
    </view>
    <view v-else class="city-feed__body">
      <feed-post-card
        v-for="item in list"
        :key="item.postId"
        :item="item"
        @refresh="load(true)"
        @open="openDetail"
        @share-prepare="onFeedSharePrepare"
      />
    </view>

    <wm-tab-bar active="discover" />

    <feed-city-picker-sheet
      :visible="cityPickerVisible"
      :current-city-code="cityCode"
      :focus-search="cityPickerFocusSearch"
      @update:visible="cityPickerVisible = $event"
      @pick="onPickCity"
    />
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import WmTabBar from '@/components/WmTabBar/WmTabBar.vue'
import FeedPostCard from '@/components/FeedPostCard/FeedPostCard.vue'
import FeedCityPickerSheet from '@/components/FeedCityPickerSheet/FeedCityPickerSheet.vue'
import { getCityFeed, getFeedTopics, isLoggedIn } from '@/api'
import { openLoginPage } from '@/utils/wechatAuth'
import { FEED_TOPICS, normalizeFeedTopics } from '@/constants/feedTopics'
import { refreshMessageUnreadSummary } from '@/utils/messageUnread'
import {
  buildDiscoverShareClipboardText,
  buildDiscoverShareMessage,
  DISCOVER_PAGE_SHARE,
} from '@/utils/activityShare'
import { resolveCityHallCityName } from '@/utils/cityCatalog'
import feedSharePageMixin from '@/mixins/feedSharePage'
import { resolveFeedShareAppMessage, resolveFeedShareTimeline } from '@/utils/feedShare'
import {
  getFeedCityAnchorSync,
  resolveFeedCityAnchor,
  setFeedCityAnchor,
} from '@/utils/homeCity'

export default {
  components: { WmIcon, WmTabBar, FeedPostCard, FeedCityPickerSheet },
  mixins: [feedSharePageMixin],
  data() {
    return {
      scope: 'city',
      cityCode: '110000',
      cityDisplayName: '',
      cityPickerVisible: false,
      cityPickerFocusSearch: false,
      loading: true,
      list: [],
      page: 1,
      total: 0,
      topicFilter: '',
      filterTopics: FEED_TOPICS.slice(),
    }
  },
  computed: {
    isPersonalScope() {
      return this.scope === 'following' || this.scope === 'friends'
    },
    currentCityLabel() {
      return (
        resolveCityHallCityName(this.cityCode) ||
        (this.cityDisplayName && String(this.cityDisplayName).trim()) ||
        '选择城市'
      )
    },
    cityRowHint() {
      if (this.scope === 'following') {
        return '关注的人动态，不按城市筛选'
      }
      if (this.scope === 'friends') {
        return '好友动态，不按城市筛选'
      }
      return '搜索或选择城市，查看同城动态'
    },
    emptyText() {
      if (this.scope === 'following') {
        return '暂无关注的人的动态，去用户主页关注试试'
      }
      if (this.scope === 'friends') {
        return '暂无好友动态，去活动里申请私聊成为好友吧'
      }
      const name = this.currentCityLabel === '选择城市' ? '该城' : this.currentCityLabel
      return `${name}暂无动态，来做第一个分享的人吧`
    },
  },
  onShow() {
    refreshMessageUnreadSummary()
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
    this.syncCityAnchor()
    this.loadTopicsMeta()
    this.load(true)
  },
  onReachBottom() {
    if (this.loading || this.list.length >= this.total) return
    this.page += 1
    this.load(false)
  },
  onShareAppMessage() {
    return resolveFeedShareAppMessage(this, () =>
      buildDiscoverShareMessage(this.cityDisplayName),
    )
  },
  // #ifdef MP-WEIXIN
  onShareTimeline() {
    return resolveFeedShareTimeline(this, () => ({
      title: this.cityDisplayName
        ? `去旅聚 · ${this.cityDisplayName}同城动态`
        : DISCOVER_PAGE_SHARE.title,
    }))
  },
  // #endif
  methods: {
    async syncCityAnchor() {
      const cached = getFeedCityAnchorSync()
      try {
        const anchor = await resolveFeedCityAnchor()
        this.cityCode = anchor.cityCode || '110000'
        this.cityDisplayName = anchor.displayName || resolveCityHallCityName(this.cityCode) || ''
      } catch (_) {
        this.cityCode = cached?.cityCode || '110000'
        this.cityDisplayName =
          cached?.displayName || resolveCityHallCityName(this.cityCode) || ''
      }
    },
    onOpenCityPicker() {
      if (this.isPersonalScope) {
        const tip =
          this.scope === 'friends' ? '好友动态暂不支持按城市筛选' : '关注的人动态暂不支持按城市筛选'
        uni.showToast({ title: tip, icon: 'none' })
        return
      }
      this.cityPickerFocusSearch = false
      this.cityPickerVisible = true
    },
    onPickCity(anchor) {
      if (!anchor?.cityCode) return
      setFeedCityAnchor({
        cityCode: anchor.cityCode,
        displayName: anchor.displayName || resolveCityHallCityName(anchor.cityCode) || anchor.cityCode,
      })
      this.cityCode = anchor.cityCode
      this.cityDisplayName = anchor.displayName
      if (this.scope === 'city') {
        this.load(true)
      }
    },
    onCopyShare() {
      uni.setClipboardData({
        data: buildDiscoverShareClipboardText(this.cityDisplayName),
        success: () => {
          uni.showToast({ title: '已复制，可粘贴到微信发给好友', icon: 'none', duration: 2500 })
        },
        fail: () => {
          uni.showToast({ title: '复制失败', icon: 'none' })
        },
      })
    },
    goPublish() {
      if (!isLoggedIn()) {
        openLoginPage('/pages/discover/discover')
        return
      }
      uni.navigateTo({
        url: `/pages/feed-publish/feed-publish?cityCode=${encodeURIComponent(this.cityCode)}`,
      })
    },
    switchScope(nextScope) {
      if (this.scope === nextScope) return
      if ((nextScope === 'following' || nextScope === 'friends') && !isLoggedIn()) {
        openLoginPage('/pages/discover/discover')
        return
      }
      if (nextScope !== 'city') this.topicFilter = ''
      this.scope = nextScope
      this.load(true)
    },
    setTopicFilter(topicId) {
      const next = topicId || ''
      if (next === this.topicFilter) return
      this.topicFilter = next
      this.load(true)
    },
    async loadTopicsMeta() {
      try {
        const data = await getFeedTopics()
        this.filterTopics = normalizeFeedTopics(data?.topics)
      } catch (_) {
        this.filterTopics = FEED_TOPICS.slice()
      }
    },
    openDetail(item) {
      uni.navigateTo({
        url: `/pages/feed-detail/feed-detail?postId=${encodeURIComponent(item.postId)}`,
      })
    },
    async load(reset = true) {
      if (reset) {
        this.loading = true
        this.page = 1
        this.list = []
      }
      if (this.scope === 'city') {
        await this.syncCityAnchor()
      }
      try {
        const query = {
          scope: this.scope,
          page: this.page,
          pageSize: 20,
        }
        if (this.scope === 'city') {
          query.cityCode = this.cityCode
          if (this.topicFilter) query.topic = this.topicFilter
        }
        const d = await getCityFeed(query)
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
    if (options?.cityCode) {
      setFeedCityAnchor({
        cityCode: options.cityCode,
        displayName: options.displayName || resolveCityHallCityName(options.cityCode) || options.cityCode,
      })
    }
  },
}
</script>

<style lang="scss" scoped>
.city-feed {
  min-height: 100vh;
  background: transparent;
  padding-bottom: calc(140rpx + env(safe-area-inset-bottom));

  &__header {
    padding: calc(40rpx + var(--status-bar-height, 0px) + env(safe-area-inset-top)) 32rpx 24rpx;
    background: $wm-sticky-header-gradient;
    box-shadow: 0 12rpx 40rpx rgba(2, 132, 199, 0.06);
    display: flex;
    flex-direction: column;
    gap: 20rpx;
  }

  &__header-main {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16rpx;
  }

  &__brand {
    flex: 1;
    min-width: 0;
  }

  &__title {
    display: block;
    font-size: 44rpx;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.2;
  }

  &__subtitle {
    display: block;
    margin-top: 8rpx;
    font-size: 26rpx;
    color: #64748b;
  }

  &__header-actions {
    display: flex;
    align-items: center;
    gap: 12rpx;
    flex-shrink: 0;
  }

  &__header-icon-btn {
    width: 64rpx;
    height: 64rpx;
    border-radius: 18rpx;
    background: rgba(255, 255, 255, 0.88);
    border: 1rpx solid rgba(148, 163, 184, 0.22);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    margin: 0;
    line-height: 1;

    &--share::after {
      border: none;
    }

    &--hover {
      background: #f8fafc;
    }
  }

  &__publish {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8rpx;
    min-height: 72rpx;
    padding: 0 32rpx;
    border-radius: 999rpx;
    background: $wm-gradient-primary;
    font-size: 30rpx;
    color: #ffffff;
    font-weight: 700;
    line-height: 1;
    box-shadow: 0 10rpx 28rpx rgba(2, 132, 199, 0.38);
    flex-shrink: 0;

    &--hover {
      transform: scale(0.97);
      opacity: 0.92;
    }
  }

  &__city-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16rpx;
    padding: 20rpx 24rpx;
    background: rgba(255, 255, 255, 0.92);
    border-radius: 20rpx;
    border: 1rpx solid rgba(2, 132, 199, 0.14);
    box-shadow: 0 8rpx 24rpx rgba(15, 23, 42, 0.04);

    &--hover {
      background: #f8fafc;
    }

    &--disabled {
      opacity: 0.72;
    }
  }

  &__city-main {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 14rpx;
  }

  &__city-text {
    flex: 1;
    min-width: 0;
  }

  &__city-name {
    display: block;
    font-size: 32rpx;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.3;
  }

  &__city-hint {
    display: block;
    margin-top: 4rpx;
    font-size: 24rpx;
    color: #94a3b8;
  }

  &__city-action {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 4rpx;
    font-size: 26rpx;
    color: #64748b;
  }

  &__tabs {
    display: flex;
    gap: 20rpx;
    padding: 16rpx 32rpx 0;
  }

  &__tab {
    font-size: 26rpx;
    color: #94a3b8;
    padding-bottom: 12rpx;
    border-bottom: 4rpx solid transparent;
    white-space: nowrap;

    &--on {
      color: #0f172a;
      font-weight: 600;
      border-bottom-color: #0284c7;
    }
  }

  &__topic-bar {
    width: 100%;
    white-space: nowrap;
    padding: 12rpx 0 4rpx;
  }

  &__topic-inner {
    display: inline-flex;
    align-items: center;
    gap: 12rpx;
    padding: 0 32rpx 8rpx;
  }

  &__topic-chip {
    flex-shrink: 0;
    font-size: 24rpx;
    padding: 10rpx 22rpx;
    border-radius: 999rpx;
    background: #f1f5f9;
    color: #64748b;

    &--on {
      background: #e0f2fe;
      color: #0284c7;
      font-weight: 600;
    }
  }

  &__state {
    padding: 80rpx 32rpx;
    text-align: center;
    font-size: 28rpx;
    color: #94a3b8;
    line-height: 1.6;
  }

  &__body {
    padding: 16rpx 32rpx 0;
  }
}
</style>
