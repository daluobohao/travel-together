<template>
  <view class="page sub feed-detail">
    <view class="sub__header feed-detail__header">
      <button class="sub__back sub__back-btn" plain hover-class="sub__back-btn--hover" @tap="goBack">
        <wm-icon name="chevronLeft" :size="36" color="#0f172a" />
      </button>
      <text class="sub__title">动态详情</text>
      <view class="feed-detail__header-right">
        <!-- #ifdef MP-WEIXIN || MP-TOUTIAO -->
        <template v-if="canShareFeed">
          <button
            class="feed-detail__share-btn"
            type="default"
            plain
            hover-class="feed-detail__share-btn--hover"
            open-type="share"
          >
            <wm-icon name="shareForward" :size="32" color="#0f172a" />
          </button>
          <view
            class="feed-detail__share-btn"
            hover-class="feed-detail__share-btn--hover"
            @click="onCopyShare"
          >
            <wm-icon name="link2" :size="32" color="#0f172a" />
          </view>
        </template>
        <!-- #endif -->
        <text
          v-if="isMine"
          class="feed-detail__action feed-detail__delete"
          @click="onDelete"
        >删除</text>
        <text
          v-else-if="item"
          class="feed-detail__action feed-detail__report"
          @click="onReport"
        >举报</text>
      </view>
    </view>
    <view v-if="loading" class="sub__state"><text>加载中…</text></view>
    <view v-else-if="item" class="sub__body">
      <feed-post-card :item="item" :show-share="false" @refresh="load" />

      <view class="panel comments">
        <text class="section-title">评论 {{ commentTotal }}</text>
        <view v-for="c in comments" :key="c.commentId" class="comment-row">
          <text class="comment-row__name">{{ c.author?.nickname || '用户' }}</text>
          <text class="comment-row__text">{{ c.content }}</text>
        </view>
        <view v-if="!comments.length" class="comment-empty"><text>暂无评论</text></view>
      </view>

      <view v-if="isLoggedIn()" class="comment-bar panel">
        <input v-model="commentDraft" class="comment-bar__input" placeholder="写评论…" maxlength="500" />
        <text class="comment-bar__send" @click="submitComment">发送</text>
      </view>
    </view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import FeedPostCard from '@/components/FeedPostCard/FeedPostCard.vue'
import {
  createFeedComment,
  createReport,
  deleteFeedPost,
  getFeedComments,
  getFeedPost,
  getMe,
  isLoggedIn,
} from '@/api'
import { ensureTextContentSafe, SEC_SCENE } from '@/utils/contentSecurity'
import { capturePageQueryAttribution } from '@/utils/acquisitionSource'
import {
  buildFeedShareClipboardText,
  buildFeedShareMessage,
  buildFeedTimelineShare,
  isCityFeedPost,
} from '@/utils/feedShare'
import { openLoginPage } from '@/utils/wechatAuth'

export default {
  components: { WmIcon, FeedPostCard },
  data() {
    return {
      postId: '',
      myUserId: '',
      loading: true,
      deleting: false,
      item: null,
      comments: [],
      commentTotal: 0,
      commentDraft: '',
      commenting: false,
    }
  },
  computed: {
    canShareFeed() {
      return isCityFeedPost(this.item)
    },
    isMine() {
      if (!this.myUserId || !this.item?.author?.userId) return false
      return String(this.item.author.userId) === String(this.myUserId)
    },
  },
  methods: {
    isLoggedIn,
    goBack() {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        uni.navigateBack({
          fail: () => this.leaveFeedDetail(),
        })
        return
      }
      this.leaveFeedDetail()
    },
    leaveFeedDetail() {
      uni.reLaunch({
        url: '/pages/discover/discover',
        fail: () => {
          uni.reLaunch({ url: '/pages/home/home' })
        },
      })
    },
    async loadMyUserId() {
      if (!isLoggedIn()) {
        this.myUserId = ''
        return
      }
      try {
        const me = await getMe()
        this.myUserId = me?.userId || ''
      } catch (_) {
        this.myUserId = ''
      }
    },
    async load() {
      this.loading = true
      try {
        this.item = await getFeedPost(this.postId)
        await this.loadComments()
      } catch (_) {
        this.item = null
      } finally {
        this.loading = false
      }
    },
    async loadComments() {
      try {
        const d = await getFeedComments(this.postId, { page: 1, pageSize: 50 })
        this.comments = d?.list || []
        this.commentTotal = d?.total ?? this.comments.length
      } catch (_) {
        this.comments = []
        this.commentTotal = 0
      }
    },
    async submitComment() {
      if (!isLoggedIn()) {
        openLoginPage(`/pages/feed-detail/feed-detail?postId=${encodeURIComponent(this.postId)}`)
        return
      }
      const text = this.commentDraft.trim()
      if (!text || this.commenting) return
      this.commenting = true
      try {
        const strict = (this.item?.postKind || 'city') === 'city'
        await ensureTextContentSafe(text, SEC_SCENE.COMMENT, { strict })
        await createFeedComment(this.postId, { content: text })
        this.commentDraft = ''
        await Promise.all([this.load(), this.loadComments()])
      } catch (e) {
        uni.showToast({ title: e?.message || '评论失败', icon: 'none' })
      } finally {
        this.commenting = false
      }
    },
    onDelete() {
      if (this.deleting) return
      uni.showModal({
        title: '删除动态',
        content: '删除后不可恢复，确认删除这条动态？',
        confirmColor: '#ef4444',
        success: async (res) => {
          if (!res.confirm) return
          this.deleting = true
          try {
            await deleteFeedPost(this.postId)
            uni.showToast({ title: '已删除', icon: 'success' })
            setTimeout(() => {
              uni.navigateBack({
                fail: () => uni.redirectTo({ url: '/pages/my-feed-posts/my-feed-posts' }),
              })
            }, 400)
          } catch (e) {
            uni.showToast({ title: e?.message || '删除失败', icon: 'none' })
          } finally {
            this.deleting = false
          }
        },
      })
    },
    onCopyShare() {
      const text = buildFeedShareClipboardText(this.item)
      if (!text) return
      uni.setClipboardData({
        data: text,
        success: () => {
          uni.showToast({ title: '已复制分享说明', icon: 'none', duration: 2400 })
        },
      })
    },
    onReport() {
      if (!isLoggedIn()) {
        openLoginPage(`/pages/feed-detail/feed-detail?postId=${encodeURIComponent(this.postId)}`)
        return
      }
      uni.showModal({
        title: '举报动态',
        content: '确认举报该条动态？',
        success: async (res) => {
          if (!res.confirm) return
          try {
            await createReport({
              targetType: 'post',
              targetId: this.postId,
              reason: 'inappropriate',
              detail: '',
            })
            uni.showToast({ title: '已提交举报', icon: 'success' })
          } catch (e) {
            uni.showToast({ title: e?.message || '提交失败', icon: 'none' })
          }
        },
      })
    },
  },
  async onLoad(options) {
    capturePageQueryAttribution(options || {})
    this.postId = options?.postId || ''
    await this.loadMyUserId()
    this.load()
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
  },
  onShareAppMessage() {
    return buildFeedShareMessage(this.item)
  },
  // #ifdef MP-WEIXIN
  onShareTimeline() {
    return buildFeedTimelineShare(this.item)
  },
  // #endif
}
</script>

<style lang="scss" scoped>
@import '@/styles/sub-page.scss';
.feed-detail__header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sub__back-btn {
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  width: 72rpx;
  height: 72rpx;
  padding: 0;
  margin: 0;
  border: none;
  background: transparent;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;

  &::after {
    border: none;
  }

  &--hover {
    opacity: 0.7;
  }
}
.feed-detail__header .sub__title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
  max-width: 42%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.feed-detail__header-right {
  position: relative;
  z-index: 2;
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4rpx;
  min-width: 0;
  flex-shrink: 0;
}
.feed-detail__share-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  padding: 0;
  margin: 0;
  border: none;
  background: transparent;
  line-height: 1;

  &::after {
    border: none;
  }

  &--hover {
    opacity: 0.7;
  }
}
.feed-detail__action {
  font-size: 26rpx;
  width: auto;
  padding: 0 8rpx;
  margin-left: 4rpx;
}
.feed-detail__report {
  color: #64748b;
}
.feed-detail__delete {
  color: #ef4444;
}
.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 16rpx;
  display: block;
}
.comment-row {
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f1f5f9;
  &__name {
    display: block;
    font-size: 24rpx;
    color: #64748b;
    margin-bottom: 6rpx;
  }
  &__text {
    font-size: 28rpx;
    color: #334155;
  }
}
.comment-empty {
  font-size: 26rpx;
  color: #94a3b8;
  padding: 12rpx 0;
}
.comment-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 24rpx;
  &__input {
    flex: 1;
    font-size: 28rpx;
    padding: 12rpx 16rpx;
    background: #f8fafc;
    border-radius: 12rpx;
  }
  &__send {
    font-size: 28rpx;
    color: #0284c7;
    font-weight: 600;
  }
}
</style>
