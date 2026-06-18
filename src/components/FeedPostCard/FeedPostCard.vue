<template>
  <view class="feed-card panel" @click="onOpen">
    <view class="feed-card__head">
      <image
        v-if="displayAvatar"
        class="feed-card__avatar"
        :src="displayAvatar"
        mode="aspectFill"
      />
      <view v-else class="feed-card__avatar feed-card__avatar--ph">
        <text>{{ (item.author?.nickname || '用')[0] }}</text>
      </view>
      <view class="feed-card__meta">
        <text class="feed-card__name">{{ item.author?.nickname || '用户' }}</text>
        <text class="feed-card__sub">{{ timeText }}</text>
      </view>
      <text v-if="item.postKind === 'activity'" class="feed-card__tag">活动态</text>
    </view>
    <view class="feed-card__content-block">
      <text
        class="feed-card__content"
        :class="{ 'feed-card__content--folded': showFoldedContent }"
      >{{ item.content }}</text>
      <text
        v-if="needsContentFold"
        class="feed-card__content-toggle"
        @click.stop="toggleContentExpanded"
      >{{ contentExpanded ? '收起' : '全文' }}</text>
    </view>
    <view
      v-if="displayImages.length"
      class="feed-card__imgs"
      :class="'feed-card__imgs--' + imgGridMode"
    >
      <image
        v-for="(img, i) in displayImages"
        :key="i"
        class="feed-card__img"
        :src="img"
        mode="aspectFill"
        @click.stop="previewImages(i)"
      />
    </view>
    <view
      v-if="item.locationName"
      class="feed-card__location"
      @click.stop="onOpenLocation"
    >
      <wm-icon name="mapPin" :size="24" color="#0d9488" />
      <text class="feed-card__location-text">{{ item.locationName }}</text>
    </view>
    <view v-if="item.topicTags?.length" class="feed-card__topics">
      <text v-for="t in item.topicTags" :key="t" class="feed-card__topic">#{{ topicLabel(t) }}</text>
    </view>
    <view class="feed-card__foot" @click.stop>
      <text class="feed-card__stat" @click="onLike">{{ item.likedByMe ? '已赞' : '赞' }} {{ item.likeCount || 0 }}</text>
      <text class="feed-card__stat">评 {{ item.commentCount || 0 }}</text>
      <!-- #ifdef MP-WEIXIN || MP-TOUTIAO -->
      <view v-if="canShare" class="feed-card__share-group">
        <button
          class="feed-card__share-btn feed-card__share-btn--friend"
          plain
          open-type="share"
          hover-class="feed-card__share-btn--hover"
          @tap="onSharePrepare"
        >
          <text>转发</text>
        </button>
        <view
          class="feed-card__share-btn feed-card__share-btn--moments"
          hover-class="feed-card__share-btn--hover"
          @tap.stop="onShareTimelineHint"
        >
          <text>朋友圈</text>
        </view>
      </view>
      <!-- #endif -->
    </view>
  </view>
</template>

<script>
import { feedTopicLabel, formatActivityTime, isLoggedIn, likeFeedPost } from '@/api'
import { displayAvatarUrl } from '@/utils/avatarDisplay'
import { openFeedLocationOnMap } from '@/utils/feedLocation'
import { isCityFeedPost, promptFeedTimelineShare } from '@/utils/feedShare'
import { openLoginPage } from '@/utils/wechatAuth'

export default {
  props: {
    item: { type: Object, required: true },
    /** 详情页顶栏已有分享入口时可关闭卡片内分享 */
    showShare: { type: Boolean, default: true },
    /** 列表页：正文超过 3 行时折叠，可点「全文」展开 */
    foldLongContent: { type: Boolean, default: false },
  },
  emits: ['refresh', 'open', 'share-prepare'],
  data() {
    return { contentExpanded: false }
  },
  watch: {
    'item.postId'() {
      this.contentExpanded = false
    },
  },
  computed: {
    canShare() {
      return this.showShare && isCityFeedPost(this.item)
    },
    needsContentFold() {
      if (!this.foldLongContent) return false
      const text = String(this.item?.content || '').trim()
      if (!text) return false
      if (text.length > 84) return true
      return (text.match(/\n/g) || []).length >= 2
    },
    showFoldedContent() {
      return this.needsContentFold && !this.contentExpanded
    },
    displayAvatar() {
      return displayAvatarUrl(this.item.author?.avatarUrl)
    },
    timeText() {
      return formatActivityTime(this.item.createdAt) || ''
    },
    displayImages() {
      return (this.item.images || []).slice(0, 9)
    },
    imgGridMode() {
      const n = this.displayImages.length
      if (n === 1) return 'single'
      if (n === 2) return 'double'
      if (n === 4) return 'quad'
      return 'grid'
    },
  },
  methods: {
    topicLabel: feedTopicLabel,
    onOpen() {
      this.$emit('open', this.item)
    },
    toggleContentExpanded() {
      this.contentExpanded = !this.contentExpanded
    },
    onOpenLocation() {
      if (this.item?.lat != null && this.item?.lng != null) {
        openFeedLocationOnMap(this.item)
        return
      }
      uni.showToast({ title: this.item.locationName, icon: 'none' })
    },
    previewImages(index) {
      const urls = (this.item.images || []).map((u) => displayAvatarUrl(u) || u)
      uni.previewImage({ urls, current: urls[index] })
    },
    async onLike() {
      if (!isLoggedIn()) {
        openLoginPage()
        return
      }
      try {
        await likeFeedPost(this.item.postId)
        this.$emit('refresh')
      } catch (e) {
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
      }
    },
    onSharePrepare() {
      this.$emit('share-prepare', this.item)
    },
    onShareTimelineHint() {
      this.$emit('share-prepare', this.item)
      promptFeedTimelineShare()
    },
  },
}
</script>

<style lang="scss" scoped>
.feed-card {
  margin-top: 24rpx;
  &__head {
    display: flex;
    align-items: center;
    gap: 16rpx;
    margin-bottom: 16rpx;
  }
  &__avatar {
    width: 72rpx;
    height: 72rpx;
    border-radius: 50%;
    background: #e2e8f0;
    &--ph {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28rpx;
      color: #64748b;
    }
  }
  &__meta {
    flex: 1;
    min-width: 0;
  }
  &__name {
    display: block;
    font-size: 28rpx;
    font-weight: 600;
    color: #0f172a;
  }
  &__sub {
    font-size: 22rpx;
    color: #94a3b8;
  }
  &__tag {
    font-size: 22rpx;
    color: #0d9488;
    background: #f0fdfa;
    padding: 4rpx 12rpx;
    border-radius: 8rpx;
  }
  &__content-block {
    min-width: 0;
  }
  &__content {
    font-size: 28rpx;
    color: #334155;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;

    &--folded {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
      overflow: hidden;
    }
  }
  &__content-toggle {
    display: inline-block;
    margin-top: 8rpx;
    font-size: 26rpx;
    color: #0284c7;
    font-weight: 500;
  }
  &__location {
    margin-top: 12rpx;
    display: inline-flex;
    align-items: center;
    gap: 8rpx;
    max-width: 100%;
    padding: 8rpx 14rpx;
    border-radius: 999rpx;
    background: #f0fdfa;
  }
  &__location-text {
    font-size: 24rpx;
    color: #0d9488;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  &__imgs {
    margin-top: 16rpx;
    display: grid;
    gap: 8rpx;
    &--single {
      grid-template-columns: 1fr;
      .feed-card__img {
        width: 100%;
        max-width: 480rpx;
        height: 360rpx;
      }
    }
    &--double {
      grid-template-columns: repeat(2, 1fr);
      .feed-card__img {
        width: 100%;
        height: 220rpx;
      }
    }
    &--quad {
      grid-template-columns: repeat(2, 1fr);
      .feed-card__img {
        width: 100%;
        height: 200rpx;
      }
    }
    &--grid {
      grid-template-columns: repeat(3, 1fr);
      .feed-card__img {
        width: 100%;
        height: 200rpx;
      }
    }
  }
  &__img {
    border-radius: 12rpx;
    background: #f1f5f9;
  }
  &__topics {
    margin-top: 12rpx;
    display: flex;
    flex-wrap: wrap;
    gap: 8rpx;
  }
  &__topic {
    font-size: 22rpx;
    color: #0284c7;
  }
  &__foot {
    margin-top: 20rpx;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 24rpx 32rpx;
  }
  &__stat {
    font-size: 24rpx;
    color: #64748b;
  }
  &__share-group {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 12rpx;
  }
  &__share-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 88rpx;
    height: 52rpx;
    padding: 0 16rpx;
    border-radius: 999rpx;
    font-size: 22rpx;
    font-weight: 600;
    line-height: 1;
    border: 1rpx solid rgba(148, 163, 184, 0.35);
    background: rgba(255, 255, 255, 0.9);
    color: #64748b;

    &::after {
      border: none;
    }

    &--hover {
      opacity: 0.75;
    }

    &--moments {
      color: #0284c7;
      border-color: rgba(2, 132, 199, 0.25);
      background: rgba(240, 249, 255, 0.95);
    }
  }
}
</style>
