<template>
  <view class="page sub feed-detail">
    <view class="sub__header">
      <view class="sub__back" @click="goBack"><wm-icon name="chevronLeft" :size="36" color="#0f172a" /></view>
      <text class="sub__title">动态详情</text>
      <text
        v-if="isMine"
        class="sub__sp feed-detail__delete"
        @click="onDelete"
      >删除</text>
      <text
        v-else
        class="sub__sp feed-detail__report"
        @click="onReport"
      >举报</text>
    </view>
    <view v-if="loading" class="sub__state"><text>加载中…</text></view>
    <view v-else-if="item" class="sub__body">
      <feed-post-card :item="item" @refresh="load" />

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
  redirectToLogin,
} from '@/api'
import { ensureTextContentSafe, SEC_SCENE } from '@/utils/contentSecurity'

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
    isMine() {
      if (!this.myUserId || !this.item?.author?.userId) return false
      return String(this.item.author.userId) === String(this.myUserId)
    },
  },
  methods: {
    isLoggedIn,
    goBack() {
      uni.navigateBack()
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
        redirectToLogin(`/pages/feed-detail/feed-detail?postId=${encodeURIComponent(this.postId)}`)
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
    onReport() {
      if (!isLoggedIn()) {
        redirectToLogin(`/pages/feed-detail/feed-detail?postId=${encodeURIComponent(this.postId)}`)
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
    this.postId = options?.postId || ''
    await this.loadMyUserId()
    this.load()
  },
}
</script>

<style lang="scss" scoped>
@import '@/styles/sub-page.scss';
.feed-detail__report {
  font-size: 26rpx;
  color: #64748b;
  width: auto;
  padding: 0 8rpx;
}
.feed-detail__delete {
  font-size: 26rpx;
  color: #ef4444;
  width: auto;
  padding: 0 8rpx;
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
