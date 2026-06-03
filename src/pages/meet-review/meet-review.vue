<template>
  <view class="page sub">
    <view class="sub__header">
      <view class="sub__back" @click="goBack"><wm-icon name="chevronLeft" :size="36" color="#0f172a" /></view>
      <text class="sub__title">见面互评</text>
      <view class="sub__sp" />
    </view>

    <view v-if="loading" class="sub__state"><text>加载中…</text></view>
    <view v-else-if="!candidate" class="sub__state">
      <text>暂无待评价对象</text>
      <view class="wm-btn wm-btn--ghost actions__btn" @click="goBack">返回</view>
    </view>
    <view v-else class="sub__body">
      <view class="panel user-card">
        <text class="user-card__name">{{ candidate.nickname }}</text>
        <text class="panel__hint">互评内容不对外公开，仅用于信任分与见面统计</text>
      </view>

      <view class="panel">
        <text class="panel__label">是否见到对方？</text>
        <view class="met-row">
          <view class="met-chip" :class="{ 'met-chip--on': met === true }" @click="met = true">见到了</view>
          <view class="met-chip" :class="{ 'met-chip--on': met === false }" @click="met = false">没见到</view>
        </view>
      </view>

      <view v-if="met" class="panel">
        <text class="panel__label">标签（最多 3 个）</text>
        <view class="tag-row">
          <view
            v-for="t in tagOptions"
            :key="t.id"
            class="tag-chip"
            :class="{ 'tag-chip--on': selectedTags.includes(t.id) }"
            @click="toggleTag(t.id)"
          >
            {{ t.label }}
          </view>
        </view>
        <textarea v-model="comment" class="comment" maxlength="50" placeholder="选填短评（50字内）" />
      </view>

      <view class="actions">
        <view class="wm-btn wm-btn--primary actions__btn" @click="submit">提交</view>
        <view class="wm-btn wm-btn--ghost actions__btn" @click="skip">跳过</view>
      </view>
    </view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import { getMeetReviewCandidates, submitMeetReview } from '@/api'
import { ensureTextContentSafe, SEC_SCENE } from '@/utils/contentSecurity'
import { MEET_REVIEW_TAGS } from '@/constants/growthTrust'

export default {
  components: { WmIcon },
  data() {
    return {
      activityId: '',
      loading: true,
      candidates: [],
      index: 0,
      met: true,
      selectedTags: [],
      comment: '',
      tagOptions: MEET_REVIEW_TAGS,
      submitting: false,
    }
  },
  computed: {
    candidate() {
      return this.candidates[this.index] || null
    },
  },
  methods: {
    goBack() {
      uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/profile/profile' }) })
    },
    toggleTag(id) {
      const i = this.selectedTags.indexOf(id)
      if (i >= 0) {
        this.selectedTags.splice(i, 1)
        return
      }
      if (this.selectedTags.length >= 3) {
        uni.showToast({ title: '最多选 3 个标签', icon: 'none' })
        return
      }
      this.selectedTags.push(id)
    },
    async loadCandidates() {
      this.loading = true
      try {
        const d = await getMeetReviewCandidates(this.activityId)
        this.candidates = d?.list || []
        this.index = 0
        this.met = true
        this.selectedTags = []
        this.comment = ''
      } catch (e) {
        uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
        this.candidates = []
      } finally {
        this.loading = false
      }
    },
    async submit() {
      if (this.met === null || this.submitting || !this.candidate) return
      this.submitting = true
      try {
        if (this.comment?.trim()) {
          await ensureTextContentSafe(this.comment.trim(), SEC_SCENE.COMMENT)
        }
        await submitMeetReview(this.activityId, {
          toUserId: this.candidate.userId,
          met: this.met,
          tags: this.met ? this.selectedTags : [],
          comment: this.comment,
        })
        uni.showToast({ title: '已提交', icon: 'success' })
        this.nextCandidate()
      } catch (e) {
        uni.showToast({ title: e?.message || '提交失败', icon: 'none' })
      } finally {
        this.submitting = false
      }
    },
    skip() {
      this.nextCandidate()
    },
    nextCandidate() {
      if (this.index + 1 < this.candidates.length) {
        this.index += 1
        this.met = true
        this.selectedTags = []
        this.comment = ''
        return
      }
      uni.showToast({ title: '互评完成', icon: 'success' })
      setTimeout(() => this.goBack(), 800)
    },
  },
  onLoad(options) {
    this.activityId = options.activityId || options.id || ''
    this.loadCandidates()
  },
}
</script>

<style lang="scss" scoped>
@import '@/styles/sub-page.scss';
.user-card__name {
  font-size: 36rpx;
  font-weight: 800;
  color: $wm-text-1;
}
.met-row {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
}
.met-chip {
  flex: 1;
  text-align: center;
  padding: 20rpx;
  border-radius: $wm-radius-md;
  background: #f1f5f9;
  font-weight: 600;
  &--on {
    background: $wm-primary-soft;
    color: $wm-primary;
  }
}
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 16rpx;
}
.tag-chip {
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  background: #f1f5f9;
  font-size: 26rpx;
  &--on {
    background: $wm-primary;
    color: #fff;
  }
}
.comment {
  width: 100%;
  margin-top: 20rpx;
  min-height: 120rpx;
  padding: 16rpx;
  background: #f8fafc;
  border-radius: $wm-radius-md;
  font-size: 28rpx;
}
.actions {
  margin-top: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  &__btn {
    width: 100%;
  }
}
</style>
