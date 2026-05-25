<template>
  <view class="page detail">
    <view class="detail__header">
      <view class="detail__back" @click="goBack">
        <wm-icon name="chevronLeft" :size="36" color="#0f172a" />
      </view>
      <text class="detail__header-title">活动详情</text>
      <view class="detail__header-right">
        <!-- #ifdef MP-WEIXIN -->
        <button
          v-if="activity"
          class="detail__header-icon-btn detail__header-icon-btn--share"
          type="default"
          hover-class="detail__header-icon-btn--hover"
          open-type="share"
        >
          <wm-icon name="shareForward" :size="34" color="#0f172a" />
        </button>
        <!-- #endif -->
        <view
          v-if="activity"
          class="detail__header-icon-btn"
          hover-class="detail__header-icon-btn--hover"
          @click="onCopyActivityShare"
        >
          <wm-icon name="link2" :size="34" color="#0f172a" />
        </view>
      </view>
    </view>

    <view v-if="loadState === 'loading'" class="detail__state">
      <text class="detail__state-text">加载中…</text>
    </view>

    <view v-else-if="loadState === 'error'" class="detail__state">
      <text class="detail__state-text">{{ loadErrorMsg || '无法加载活动详情' }}</text>
      <view class="detail__state-btn" @click="retryLoad">
        <text>重试</text>
      </view>
    </view>

    <view class="detail__content" v-else-if="activity">
      <view class="hero" :style="{ background: activity.cover }">
        <view class="hero__tag-row">
          <view class="hero__tag" :style="{ background: activity.tagBg, color: activity.tagColor }">
            <text>{{ activity.category }}</text>
          </view>
          <view class="hero__tag hero__tag--verified">
            <wm-icon name="check" :size="20" color="#10b981" />
            <text>已认证</text>
          </view>
        </view>
        <text class="hero__title">{{ activity.title }}</text>
      </view>

      <view class="panel">
        <view class="meta-item">
          <wm-icon name="clock" :size="30" color="#6366f1" />
          <view class="meta-item__body">
            <text class="meta-item__label">活动时间</text>
            <text class="meta-item__value">{{ activity.time }}</text>
          </view>
        </view>
        <view class="meta-item">
          <wm-icon name="mapPin" :size="30" color="#6366f1" />
          <view class="meta-item__body">
            <text class="meta-item__label">活动地点</text>
            <text class="meta-item__value">{{ activity.location }} · {{ activity.distance }}</text>
          </view>
        </view>
        <view class="meta-item">
          <wm-icon name="users" :size="30" color="#6366f1" />
          <view class="meta-item__body">
            <text class="meta-item__label">参与人数</text>
            <text class="meta-item__value">{{ activity.joined }}/{{ activity.total }} 人</text>
          </view>
        </view>
      </view>

      <view class="panel">
        <text class="section-title">活动说明</text>
        <text class="desc">{{ activity.description }}</text>
      </view>

      <view class="panel">
        <view class="panel__head">
          <text class="section-title">活动状态</text>
          <view class="status-tag" :style="{ background: activity.statusBg, color: activity.statusColor }">
            <text>{{ activity.statusLabel }}</text>
          </view>
        </view>
        <text class="desc">{{ statusHint }}</text>
      </view>

      <view class="panel">
        <text class="section-title">发起人</text>
        <view class="host">
          <view class="host__avatar-wrap" @click="onOpenOrganizerProfile">
            <view class="host__avatar">
              <image
                v-if="activity.organizerAvatar"
                class="host__avatar-img"
                :src="activity.organizerAvatar"
                mode="aspectFill"
              />
              <text v-else>{{ activity.organizer.slice(0, 1) }}</text>
            </view>
            <text class="host__tap-hint">点头像看资料</text>
          </view>
          <view class="host__info">
            <text class="host__name">{{ activity.organizer }}</text>
            <text class="host__meta">已组织 {{ activity.hostedCount }} 场活动</text>
          </view>
        </view>
      </view>
    </view>

    <view class="detail__action" v-if="activity">
      <view
        v-if="canEnterGroup"
        class="detail__action-btn detail__action-btn--ghost"
        @click="onEnterGroup"
      >
        <text>进入群聊</text>
      </view>
      <view
        class="detail__action-btn"
        :class="actionBtnClass"
        @click="onPrimaryAction"
      >
        <text>{{ actionText }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import {
  cancelEnrollment,
  computeActivityStatus,
  enrollActivity,
  formatActivityTimeRange,
  getActivityDetail,
  getMe,
  isLoggedIn,
  resolveActivityCategoryTag,
} from '@/api'
import { setPostLoginRedirect } from '@/utils/wechatAuth'
import {
  buildActivityShareClipboardText,
  buildActivityShareMessage,
  buildActivityTimelineQuery,
} from '@/utils/activityShare'

export default {
  components: { WmIcon },
  data() {
    return {
      activityId: '',
      activity: null,
      loadState: 'loading',
      loadErrorMsg: '',
      actionLoading: false,
      currentUserId: '',
    }
  },
  computed: {
    isOrganizer() {
      if (!this.activity?.organizerId || !this.currentUserId) return false
      return String(this.currentUserId) === String(this.activity.organizerId)
    },
    isJoined() {
      return this.activity?.enrollmentStatus === 'joined'
    },
    canEnterGroup() {
      if (!this.activity) return false
      return this.isJoined && !this.activity.isCancelled
    },
    actionText() {
      if (!this.activity) return ''
      if (this.activity.isCancelled) return '活动已取消'
      if (this.activity.isEnded) return '活动已结束'
      if (this.activity.statusKey === 'pending') return '审核中'
      if (this.isOrganizer && this.isJoined) return '你是发起人'
      if (this.isJoined) return '取消报名'
      if (this.activity.isFull) return '已满员'
      if (!isLoggedIn()) return '登录后报名'
      return '立即报名'
    },
    actionBtnClass() {
      if (!this.activity) return ''
      if (this.activity.isEnded || this.activity.isCancelled || this.activity.statusKey === 'pending') {
        return 'detail__action-btn--disabled'
      }
      if (this.isOrganizer && this.isJoined) return 'detail__action-btn--disabled'
      if (!this.isJoined && this.activity.isFull) return 'detail__action-btn--disabled'
      if (this.isJoined) return 'detail__action-btn--cancel'
      return ''
    },
    statusHint() {
      if (!this.activity) return ''
      if (this.activity.isCancelled) return '该活动已被取消，无法报名或进入群聊。'
      if (this.activity.isEnded) return '活动已结束，欢迎关注下一场。'
      if (this.activity.isFull) return '人数已满，报名通道暂时关闭。'
      if (this.activity.statusKey === 'pending') return '活动正在审核中，通过后可开放报名。'
      return `还剩 ${Math.max(0, Number(this.activity.total) - Number(this.activity.joined))} 个名额`
    },
  },
  onLoad(query) {
    this.activityId = query?.id ? String(query.id) : ''
    this.loadActivity(this.activityId)
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
    try {
      uni.showShareMenu({ withShareTicket: false })
    } catch (_) {
      /* ignore */
    }
    // #endif
  },
  onShareAppMessage() {
    return buildActivityShareMessage(this.activity)
  },
  // #ifdef MP-WEIXIN
  onShareTimeline() {
    const a = this.activity
    if (!a?.id) {
      return { title: '旅聚 · 发现身边的活动' }
    }
    return {
      title: (a.title && String(a.title).trim().slice(0, 64)) || '旅聚活动',
      query: buildActivityTimelineQuery(a.id),
    }
  },
  // #endif
  methods: {
    async loadActivity(id) {
      const actId = String(id || '').trim()
      if (!actId) {
        this.activity = null
        this.loadState = 'error'
        this.loadErrorMsg = '活动不存在或链接无效'
        return
      }

      this.loadState = 'loading'
      this.loadErrorMsg = ''
      this.activity = null

      try {
        let meId = ''
        if (isLoggedIn()) {
          try {
            const me = await getMe()
            meId = me?.userId ? String(me.userId) : ''
          } catch (e) {
            meId = ''
          }
        }
        this.currentUserId = meId

        const detail = await getActivityDetail(actId)
        if (!detail) {
          this.loadState = 'error'
          this.loadErrorMsg = '活动不存在或已下架'
          return
        }

        const org = detail.organizer || {}
        const status = computeActivityStatus(detail)
        const catTag = resolveActivityCategoryTag(detail)
        this.activity = {
          id: String(detail.activityId || actId),
          category: catTag.label,
          tagColor: catTag.color,
          tagBg: catTag.bg,
          title: detail.title,
          cover: 'linear-gradient(135deg, #a78bfa 0%, #6366f1 100%)',
          time: formatActivityTimeRange(detail.startAt, detail.endAt),
          startAt: detail.startAt,
          endAt: detail.endAt,
          location: detail.locationName,
          distance: detail.distanceMeters ? `${(detail.distanceMeters / 1000).toFixed(1)}km` : '',
          joined: Number(detail.enrolledCount || 0),
          total: Number(detail.maxMembers || 0),
          organizer: org.nickname || '组织者',
          organizerId: org.userId || '',
          organizerAvatar: org.avatarUrl || '',
          organizerBio: (org.bio && String(org.bio).trim()) || '',
          organizerTags: Array.isArray(org.tags) ? org.tags : [],
          organizerVerified: !!org.verificationBadge,
          hostedCount: Number(detail.organizerHostedCount || 0),
          description: detail.description || '暂无说明',
          enrollmentStatus: detail.myEnrollment?.status || null,
          ...status,
        }
        this.loadState = 'ready'
      } catch (e) {
        this.activity = null
        this.loadState = 'error'
        const msg = e?.message || '加载失败'
        this.loadErrorMsg =
          e?.statusCode === 404 ? '活动不存在或已下架' : msg.includes('authenticated') ? '暂时无法加载，请稍后重试' : msg
        uni.showToast({ title: this.loadErrorMsg, icon: 'none' })
      }
    },
    retryLoad() {
      if (this.activityId) this.loadActivity(this.activityId)
    },
    onOpenOrganizerProfile() {
      const uid = this.activity?.organizerId
      if (!uid) {
        uni.showToast({ title: '暂无发起人信息', icon: 'none' })
        return
      }
      const p = this.activity
      const q = [
        `userId=${encodeURIComponent(uid)}`,
        `nick=${encodeURIComponent(p.organizer || '')}`,
        `hosted=${Number(p.hostedCount) || 0}`,
      ]
      if (p.organizerAvatar) q.push(`ava=${encodeURIComponent(p.organizerAvatar)}`)
      if (p.organizerBio) q.push(`bio=${encodeURIComponent(p.organizerBio)}`)
      if (p.organizerTags && p.organizerTags.length) {
        try {
          q.push(`tags=${encodeURIComponent(JSON.stringify(p.organizerTags))}`)
        } catch (e) {}
      }
      if (p.organizerVerified) q.push('v=1')
      uni.navigateTo({
        url: `/pages/user-public/user-public?${q.join('&')}`,
      })
    },
    refreshStatus() {
      if (!this.activity) return
      const status = computeActivityStatus({
        activityStatus: this.activity.isCancelled
          ? 'cancelled'
          : this.activity.isEnded
            ? 'ended'
            : 'published',
        enrolledCount: this.activity.joined,
        maxMembers: this.activity.total,
        startAt: this.activity.startAt,
        endAt: this.activity.endAt,
      })
      Object.assign(this.activity, status)
    },
    goBack() {
      uni.navigateBack({
        fail: () => uni.reLaunch({ url: '/pages/home/home' }),
      })
    },
    onPrimaryAction() {
      if (!this.activity) return
      if (
        this.activity.isEnded ||
        this.activity.isCancelled ||
        this.activity.statusKey === 'pending'
      ) {
        uni.showToast({ title: this.actionText, icon: 'none' })
        return
      }
      if (!this.isJoined && this.activity.isFull) {
        uni.showToast({ title: '活动已满员', icon: 'none' })
        return
      }
      if (this.isOrganizer && this.isJoined) {
        uni.showToast({ title: '发起人不能取消报名，如需结束请取消活动', icon: 'none' })
        return
      }
      if (!isLoggedIn()) {
        const id = this.activity.id || this.activityId
        if (id) {
          setPostLoginRedirect(`/pages/activity-detail/activity-detail?id=${encodeURIComponent(id)}`)
        }
        uni.navigateTo({ url: '/pages/login/login' })
        return
      }
      this.toggleEnroll()
    },
    async toggleEnroll() {
      if (!this.activity || this.actionLoading) return
      if (this.isOrganizer && this.isJoined) {
        uni.showToast({ title: '发起人不能取消报名，如需结束请取消活动', icon: 'none' })
        return
      }
      this.actionLoading = true
      const joined = this.isJoined
      try {
        if (joined) {
          await cancelEnrollment(this.activity.id)
          this.activity.enrollmentStatus = null
          this.activity.joined = Math.max(0, Number(this.activity.joined || 0) - 1)
          uni.showToast({ title: '已取消报名', icon: 'success' })
        } else {
          await enrollActivity(this.activity.id)
          this.activity.enrollmentStatus = 'joined'
          this.activity.joined = Math.min(
            Number(this.activity.total || 0),
            Number(this.activity.joined || 0) + 1
          )
          uni.showToast({ title: '报名成功', icon: 'success' })
        }
        this.refreshStatus()
      } catch (e) {
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
      } finally {
        this.actionLoading = false
      }
    },
    onEnterGroup() {
      if (!this.canEnterGroup) return
      if (!isLoggedIn()) {
        const id = this.activity.id || this.activityId
        if (id) {
          setPostLoginRedirect(`/pages/activity-detail/activity-detail?id=${encodeURIComponent(id)}`)
        }
        uni.navigateTo({ url: '/pages/login/login' })
        return
      }
      uni.navigateTo({
        url: `/pages/chat-detail/chat-detail?id=${this.activity.id}`,
      })
    },
    onCopyActivityShare() {
      if (!this.activity?.id) {
        uni.showToast({ title: '暂无可复制内容', icon: 'none' })
        return
      }
      const text = buildActivityShareClipboardText(this.activity)
      uni.setClipboardData({
        data: text,
        success: () => {
          uni.showToast({ title: '已复制', icon: 'success' })
        },
        fail: () => {
          uni.showToast({ title: '复制失败', icon: 'none' })
        },
      })
    },
  },
}
</script>

<style lang="scss" scoped>
.detail {
  min-height: 100vh;
  background: transparent;
  padding-bottom: calc(160rpx + env(safe-area-inset-bottom));

  &__state {
    padding: 120rpx 48rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 32rpx;
  }

  &__state-text {
    font-size: 28rpx;
    color: $wm-text-3;
    text-align: center;
    line-height: 1.6;
  }

  &__state-btn {
    height: 72rpx;
    padding: 0 40rpx;
    border-radius: $wm-radius-xl;
    background: $wm-gradient-primary;
    color: #fff;
    font-size: 28rpx;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__header {
    position: sticky;
    top: 0;
    z-index: 10;
    height: calc(96rpx + var(--status-bar-height, 0px) + env(safe-area-inset-top));
    padding: calc(var(--status-bar-height, 0px) + env(safe-area-inset-top)) 24rpx 0;
    background: $wm-sticky-header-gradient;
    border-bottom: none;
    box-shadow: 0 12rpx 40rpx rgba(2, 132, 199, 0.06);
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

  &__header-right {
    min-width: 72rpx;
    height: 72rpx;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4rpx;
  }

  &__header-icon-btn {
    width: 72rpx;
    height: 72rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 16rpx;
    &--hover {
      background: rgba(15, 23, 42, 0.06);
    }
    &--share {
      padding: 0;
      margin: 0;
      background: transparent;
      border: none;
      line-height: 1;
      &::after {
        border: none;
      }
    }
  }

  &__header-title {
    font-size: 34rpx;
    font-weight: 700;
    color: $wm-text-1;
  }

  &__content {
    padding: 28rpx 24rpx 0;
    display: flex;
    flex-direction: column;
    gap: 24rpx;
  }

  &__action {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 30;
    padding: 18rpx 24rpx calc(28rpx + env(safe-area-inset-bottom));
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20rpx);
    border-top: 1rpx solid rgba(0, 0, 0, 0.06);
    box-shadow: 0 -12rpx 44rpx rgba(2, 132, 199, 0.08);
    display: flex;
    gap: 20rpx;
  }

  &__action-btn {
    flex: 1;
    height: 92rpx;
    border-radius: $wm-radius-lg;
    background: $wm-gradient-primary;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font-size: 32rpx;
    font-weight: 700;
    box-shadow: $wm-shadow-glow;
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s;

    &:active {
      transform: scale(0.98);
      box-shadow: $wm-shadow-md;
    }

    &--cancel {
      background: linear-gradient(135deg, #64748b 0%, #475569 100%);
      box-shadow: 0 12rpx 28rpx rgba(71, 85, 105, 0.28);
    }

    &--ghost {
      background: #ffffff;
      color: $wm-primary;
      border: 2rpx solid rgba(2, 132, 199, 0.3);
      box-shadow: none;
    }

    &--disabled {
      background: #e2e8f0;
      color: #94a3b8;
      box-shadow: none;
    }
  }
}

.hero {
  border-radius: $wm-radius-xl;
  padding: 32rpx;
  color: #ffffff;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, transparent 50%, rgba(0, 0, 0, 0.15) 100%);
    pointer-events: none;
  }

  &__tag-row {
    display: flex;
    gap: 12rpx;
    margin-bottom: 24rpx;
    position: relative;
    z-index: 1;
  }

  &__tag {
    padding: 6rpx 18rpx;
    border-radius: 999rpx;
    font-size: 22rpx;
    font-weight: 700;
    background: rgba(255, 255, 255, 0.25);
    backdrop-filter: blur(8rpx);
    color: #ffffff;
    border: 1rpx solid rgba(255, 255, 255, 0.5);

    &--verified {
      display: inline-flex;
      align-items: center;
      gap: 4rpx;
      background: $wm-success-soft;
      color: $wm-success;
      backdrop-filter: none;
      border: none;
    }
  }

  &__title {
    font-size: 48rpx;
    line-height: 1.25;
    font-weight: 800;
    color: #ffffff;
    position: relative;
    z-index: 1;
    text-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.2);
  }
}

.panel {
  background: #ffffff;
  border-radius: $wm-radius-lg;
  padding: 28rpx;
  border: $wm-card-edge;
  box-shadow: $wm-shadow-md;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 6rpx;
    bottom: 0;
    background: $wm-gradient-primary;
    opacity: 0.3;
  }
}

.meta-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f8fafc;
  transition: background 0.2s;

  &:last-child {
    border-bottom: none;
  }

  &:active {
    background: $wm-primary-soft;
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: 6rpx;
  }

  &__label {
    font-size: 24rpx;
    color: $wm-text-3;
    font-weight: 500;
  }

  &__value {
    font-size: 30rpx;
    color: $wm-text-1;
    font-weight: 600;
  }
}

.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: $wm-text-1;
  margin-bottom: 16rpx;
}

.desc {
  font-size: 28rpx;
  line-height: 1.75;
  color: $wm-text-2;
  font-weight: 500;
}

.panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;

  .section-title {
    margin-bottom: 0;
  }
}

.status-tag {
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 700;
}

.host {
  display: flex;
  align-items: center;
  gap: 24rpx;
  transition: transform 0.2s;

  &:active {
    transform: scale(0.98);
  }

  &__avatar-wrap {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10rpx;
  }

  &__tap-hint {
    font-size: 22rpx;
    color: $wm-primary;
    font-weight: 600;
  }

  &__info {
    flex: 1;
    min-width: 0;
  }

  &__avatar {
    width: 104rpx;
    height: 104rpx;
    border-radius: 50%;
    background: $wm-gradient-primary;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    box-shadow: 0 6rpx 20rpx rgba(2, 132, 199, 0.25);

    text {
      color: #ffffff;
      font-size: 36rpx;
      font-weight: 700;
    }
  }

  &__avatar-img {
    width: 100%;
    height: 100%;
  }

  &__name {
    display: block;
    font-size: 32rpx;
    color: $wm-text-1;
    font-weight: 700;
  }

  &__meta {
    display: block;
    font-size: 24rpx;
    color: $wm-text-3;
    margin-top: 8rpx;
    font-weight: 500;
  }
}
</style>
