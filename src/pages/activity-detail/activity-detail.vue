<template>
  <view class="page detail">
    <view class="detail__header">
      <view class="detail__back" @click="goBack">
        <wm-icon name="chevronLeft" :size="36" color="#0f172a" />
      </view>
      <text class="detail__header-title">活动详情</text>
      <view class="detail__placeholder"></view>
    </view>

    <!-- Loading state - Skeleton -->
    <view v-if="loading" class="detail__content">
      <view class="skeleton-hero"></view>
      
      <view class="panel">
        <view class="skeleton-meta-item"></view>
        <view class="skeleton-meta-item"></view>
        <view class="skeleton-meta-item"></view>
      </view>

      <view class="panel">
        <view class="skeleton-section-title"></view>
        <view class="skeleton-desc">
          <view class="skeleton-desc-line"></view>
          <view class="skeleton-desc-line"></view>
          <view class="skeleton-desc-line skeleton-desc-line--short"></view>
        </view>
      </view>

      <view class="panel">
        <view class="skeleton-panel-head">
          <view class="skeleton-section-title"></view>
          <view class="skeleton-status-tag"></view>
        </view>
        <view class="skeleton-desc">
          <view class="skeleton-desc-line"></view>
        </view>
      </view>

      <view class="panel">
        <view class="skeleton-section-title"></view>
        <view class="skeleton-host">
          <view class="skeleton-avatar"></view>
          <view class="skeleton-host-info">
            <view class="skeleton-host-name"></view>
            <view class="skeleton-host-meta"></view>
          </view>
        </view>
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
          <view class="host__avatar"><text>{{ activity.organizer.slice(0, 1) }}</text></view>
          <view class="host__info">
            <text class="host__name">{{ activity.organizer }}</text>
            <text class="host__meta">组织了 {{ activity.hostedCount }} 场活动</text>
          </view>
        </view>
      </view>
    </view>

    <view class="detail__action" v-if="activity">
      <view
        v-if="canEnterGroup"
        class="detail__action-btn detail__action-btn--ghost"
        :hover-class="'detail__action-btn--ghost-active'"
        @click="onEnterGroup"
      >
        <text>进入群聊</text>
      </view>
      <view
        class="detail__action-btn"
        :class="[actionBtnClass, { 'detail__action-btn--loading': actionLoading }]"
        :hover-class="!actionBtnClass.includes('disabled') ? 'detail__action-btn--hover' : ''"
        @click="onPrimaryAction"
      >
        <view v-if="actionLoading" class="btn-spinner"></view>
        <text v-else>{{ actionText }}</text>
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
  getActivityDetail,
} from '@/api'

export default {
  components: { WmIcon },
  data() {
    return {
      activity: null,
      actionLoading: false,
      loading: false,
    }
  },
  computed: {
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
      if (this.isJoined) return '取消报名'
      if (this.activity.isFull) return '已满员'
      if (this.activity.statusKey === 'pending') return '审核中'
      return '立即报名'
    },
    actionBtnClass() {
      if (!this.activity) return ''
      if (this.activity.isEnded || this.activity.isCancelled || this.activity.isFull || this.activity.statusKey === 'pending') {
        return 'detail__action-btn--disabled'
      }
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
    const id = query?.id ? String(query.id) : '1'
    this.loadActivity(id)
  },
  methods: {
    async loadActivity(id) {
      this.loading = true
      try {
        const detail = await getActivityDetail(id)
        if (detail) {
          const status = computeActivityStatus(detail)
          this.activity = {
            id: String(detail.activityId || ''),
            category: detail.categoryId,
            tagColor: '#6366f1',
            tagBg: '#eef2ff',
            title: detail.title,
            cover: 'linear-gradient(135deg, #a78bfa 0%, #6366f1 100%)',
            time: detail.startAt,
            location: detail.locationName,
            distance: detail.distanceMeters ? `${(detail.distanceMeters / 1000).toFixed(1)}km` : '',
            joined: Number(detail.enrolledCount || 0),
            total: Number(detail.maxMembers || 0),
            organizer: detail.organizer?.nickname || '组织者',
            organizerId: detail.organizer?.userId || '',
            hostedCount: Number(detail.organizerHostedCount || 0),
            description: detail.description || '暂无说明',
            enrollmentStatus: detail.myEnrollment?.status || null,
            ...status,
          }
          return
        }
      } catch (e) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
      this.activity = null
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
        startAt: this.activity.time,
      })
      Object.assign(this.activity, status)
    },
    goBack() {
      uni.navigateBack({
        fail: () => uni.reLaunch({ url: '/pages/home/home' })
      })
    },
    onPrimaryAction() {
      if (!this.activity || this.actionLoading) return
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
      this.toggleEnroll()
    },
    async toggleEnroll() {
      if (!this.activity || this.actionLoading) return
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
      uni.navigateTo({
        url: `/pages/chat-detail/chat-detail?id=${this.activity.id}`,
      })
    },
  },
}
</script>

<style lang="scss" scoped>
.detail {
  min-height: 100vh;
  background: #f3f4f6;
  padding-bottom: calc(140rpx + env(safe-area-inset-bottom));

  &__header {
    position: sticky;
    top: 0;
    z-index: 10;
    height: calc(96rpx + var(--status-bar-height, 0px) + env(safe-area-inset-top));
    padding: calc(var(--status-bar-height, 0px) + env(safe-area-inset-top)) 24rpx 0;
    background: #ffffff;
    border-bottom: 1rpx solid #e5e7eb;
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

  &__header-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #0f172a;
  }

  &__content {
    padding: 24rpx 24rpx 0;
    display: flex;
    flex-direction: column;
    gap: 20rpx;
    animation: fadeInUp 0.4s ease-out;
  }

  &__action {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 30;
    padding: 16rpx 24rpx calc(24rpx + env(safe-area-inset-bottom));
    background: rgba(255, 255, 255, 0.95);
    border-top: 1rpx solid #e5e7eb;
    display: flex;
    gap: 16rpx;
  }

  &__action-btn {
    flex: 1;
    height: 88rpx;
    border-radius: 18rpx;
    background: #6366f1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font-size: 30rpx;
    font-weight: 600;
    gap: 12rpx;
    transition: transform 0.15s, box-shadow 0.15s, opacity 0.2s;

    &--hover {
      transform: scale(0.98);
      box-shadow: 0 8rpx 20rpx rgba(99, 102, 241, 0.3);
    }

    &--cancel {
      background: #f97316;

      &.detail__action-btn--hover {
        box-shadow: 0 8rpx 20rpx rgba(249, 115, 22, 0.3);
      }
    }

    &--ghost {
      background: #ffffff;
      color: #6366f1;
      border: 2rpx solid #c7d2fe;

      &-active {
        background: #eef2ff;
        transform: scale(0.98);
      }
    }

    &--disabled {
      background: #e2e8f0;
      color: #94a3b8;
    }

    &--loading {
      opacity: 0.8;
    }
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.loading-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 4rpx solid #e2e8f0;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.btn-spinner {
  width: 36rpx;
  height: 36rpx;
  border: 3rpx solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-text {
  font-size: 26rpx;
  color: #94a3b8;
}

.hero {
  border-radius: 24rpx;
  padding: 28rpx;
  color: #ffffff;

  &__tag-row {
    display: flex;
    gap: 10rpx;
    margin-bottom: 20rpx;
  }

  &__tag {
    padding: 4rpx 14rpx;
    border-radius: 999rpx;
    font-size: 20rpx;
    font-weight: 600;
    background: rgba(255, 255, 255, 0.18);
    color: #ffffff;

    &--verified {
      display: inline-flex;
      align-items: center;
      gap: 4rpx;
      background: #ecfdf5;
      color: #059669;
    }
  }

  &__title {
    font-size: 42rpx;
    line-height: 1.25;
    font-weight: 700;
    color: #ffffff;
  }
}

.panel {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 24rpx;
}

.meta-item {
  display: flex;
  align-items: flex-start;
  gap: 14rpx;
  padding: 14rpx 0;
  border-bottom: 1rpx solid #eef2f7;

  &:last-child {
    border-bottom: none;
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: 4rpx;
  }

  &__label {
    font-size: 22rpx;
    color: #94a3b8;
  }

  &__value {
    font-size: 28rpx;
    color: #0f172a;
    font-weight: 500;
  }
}

.section-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 14rpx;
}

.desc {
  font-size: 26rpx;
  line-height: 1.7;
  color: #475569;
}

.panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14rpx;

  .section-title {
    margin-bottom: 0;
  }
}

.status-tag {
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 600;
}

.host {
  display: flex;
  align-items: center;
  gap: 16rpx;

  &__info {
    flex: 1;
    min-width: 0;
  }

  &__avatar {
    width: 76rpx;
    height: 76rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, #a78bfa, #6366f1);
    display: flex;
    align-items: center;
    justify-content: center;

    text {
      color: #ffffff;
      font-size: 30rpx;
      font-weight: 700;
    }
  }

  &__name {
    display: block;
    font-size: 28rpx;
    color: #0f172a;
    font-weight: 600;
  }

  &__meta {
    display: block;
    font-size: 22rpx;
    color: #94a3b8;
    margin-top: 4rpx;
  }
}

/* Skeleton Styles */
.skeleton-hero {
  border-radius: 24rpx;
  height: 200rpx;
  background: linear-gradient(135deg, #e2e8f0 25%, #cbd5e0 50%, #e2e8f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-meta-item {
  height: 70rpx;
  border-bottom: 1rpx solid #eef2f7;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 0;
  &:last-child {
    border-bottom: none;
  }
}

.skeleton-section-title {
  height: 36rpx;
  width: 140rpx;
  border-radius: 8rpx;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  margin-bottom: 14rpx;
}

.skeleton-desc {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.skeleton-desc-line {
  height: 26rpx;
  width: 100%;
  border-radius: 8rpx;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-desc-line--short {
  width: 70%;
}

.skeleton-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14rpx;
  
  .skeleton-section-title {
    margin-bottom: 0;
  }
}

.skeleton-status-tag {
  height: 34rpx;
  width: 120rpx;
  border-radius: 999rpx;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-host {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.skeleton-avatar {
  width: 76rpx;
  height: 76rpx;
  border-radius: 50%;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-host-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.skeleton-host-name {
  height: 32rpx;
  width: 180rpx;
  border-radius: 8rpx;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-host-meta {
  height: 24rpx;
  width: 220rpx;
  border-radius: 8rpx;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
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
