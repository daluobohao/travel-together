<template>
  <view class="page detail">
    <view class="detail__header">
      <view class="detail__back" @click="goBack">
        <wm-icon name="chevronLeft" :size="36" color="#0f172a" />
      </view>
      <text class="detail__header-title">活动详情</text>
      <view class="detail__placeholder" />
    </view>

    <view class="detail__content" v-if="activity">
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
          <view class="host__avatar">
            <image
              v-if="activity.organizerAvatar"
              class="host__avatar-img"
              :src="activity.organizerAvatar"
              mode="aspectFill"
            />
            <text v-else>{{ activity.organizer.slice(0, 1) }}</text>
          </view>
          <view class="host__info">
            <view class="host__name-row">
              <text class="host__name">{{ activity.organizer }}</text>
              <view v-if="activity.organizerVerified" class="host__badge">
                <wm-icon name="check" :size="18" color="#059669" />
                <text>已认证</text>
              </view>
            </view>
            <text class="host__meta">已组织 {{ activity.hostedCount }} 场活动</text>
            <view v-if="activity.organizerTags && activity.organizerTags.length" class="host__tags">
              <text v-for="(tag, ti) in activity.organizerTags" :key="ti" class="host__tag">{{ tag }}</text>
            </view>
          </view>
        </view>
        <text v-if="activity.organizerBio" class="host__bio">{{ activity.organizerBio }}</text>
        <text v-else class="host__bio host__bio--empty">暂无个人简介</text>
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
  getUserPublicProfile,
} from '@/api'

export default {
  components: { WmIcon },
  data() {
    return {
      activity: null,
      actionLoading: false,
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
      try {
        const detail = await getActivityDetail(id)
        if (detail) {
          let org = detail.organizer || {}
          if (org.userId && !String(org.bio || '').trim()) {
            try {
              const pub = await getUserPublicProfile(org.userId)
              if (pub) {
                org = {
                  ...org,
                  nickname: pub.nickname || org.nickname,
                  avatarUrl: pub.avatarUrl != null ? pub.avatarUrl : org.avatarUrl,
                  bio: pub.bio != null ? pub.bio : '',
                  tags: Array.isArray(pub.tags) ? pub.tags : org.tags || [],
                  verificationBadge:
                    pub.verificationBadge != null ? pub.verificationBadge : org.verificationBadge,
                }
              }
            } catch (e) {}
          }
          const status = computeActivityStatus(detail)
          this.activity = {
            id: String(detail.activityId || ''),
            category: detail.categoryId,
            tagColor: '#6366f1',
            tagBg: '#eef2ff',
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
            organizerBio: org.bio || '',
            organizerTags: Array.isArray(org.tags) ? org.tags : [],
            organizerVerified: !!org.verificationBadge,
            hostedCount: Number(detail.organizerHostedCount || 0),
            description: detail.description || '暂无说明',
            enrollmentStatus: detail.myEnrollment?.status || null,
            ...status,
          }
          return
        }
      } catch (e) {}
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

    &--cancel {
      background: #f97316;
    }

    &--ghost {
      background: #ffffff;
      color: #6366f1;
      border: 2rpx solid #c7d2fe;
    }

    &--disabled {
      background: #e2e8f0;
      color: #94a3b8;
    }
  }
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
  align-items: flex-start;
  gap: 16rpx;

  &__info {
    flex: 1;
    min-width: 0;
  }

  &__avatar {
    width: 96rpx;
    height: 96rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, #a78bfa, #6366f1);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    flex-shrink: 0;

    text {
      color: #ffffff;
      font-size: 32rpx;
      font-weight: 700;
    }
  }

  &__avatar-img {
    width: 100%;
    height: 100%;
  }

  &__name-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12rpx;
  }

  &__name {
    font-size: 30rpx;
    color: #0f172a;
    font-weight: 600;
  }

  &__badge {
    display: inline-flex;
    align-items: center;
    gap: 4rpx;
    padding: 2rpx 12rpx;
    border-radius: 999rpx;
    background: #ecfdf5;

    text {
      font-size: 20rpx;
      color: #059669;
      font-weight: 600;
    }
  }

  &__meta {
    display: block;
    font-size: 22rpx;
    color: #94a3b8;
    margin-top: 6rpx;
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 10rpx;
    margin-top: 12rpx;
  }

  &__tag {
    font-size: 20rpx;
    color: #6366f1;
    background: #eef2ff;
    padding: 4rpx 14rpx;
    border-radius: 999rpx;
    font-weight: 500;
  }

  &__bio {
    display: block;
    margin-top: 20rpx;
    padding-top: 20rpx;
    border-top: 1rpx solid #eef2f7;
    font-size: 26rpx;
    line-height: 1.65;
    color: #475569;

    &--empty {
      color: #94a3b8;
      font-style: italic;
    }
  }
}
</style>
