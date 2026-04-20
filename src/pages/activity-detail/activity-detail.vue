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
      <view class="detail__action-btn" @click="joinActivity">
        <text>立即报名</text>
      </view>
    </view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import { getActivityDetail } from '@/api'

export default {
  components: { WmIcon },
  data() {
    return {
      activity: null,
    }
  },
  onLoad(query) {
    const id = Number(query.id || 1)
    this.loadActivity(id)
  },
  methods: {
    async loadActivity(id) {
      try {
        const detail = await getActivityDetail(String(id))
        if (detail) {
          this.activity = {
            id: Number(detail.activityId),
            category: detail.categoryId,
            tagColor: '#6366f1',
            tagBg: '#eef2ff',
            title: detail.title,
            cover: 'linear-gradient(135deg, #a78bfa 0%, #6366f1 100%)',
            time: detail.startAt,
            location: detail.locationName,
            distance: detail.distanceMeters ? `${(detail.distanceMeters / 1000).toFixed(1)}km` : '',
            joined: detail.enrolledCount,
            total: detail.maxMembers,
            organizer: detail.organizer?.nickname || '组织者',
            hostedCount: 5,
            description: detail.description || '暂无说明',
          }
          return
        }
      } catch (e) {}
      this.activity = null
    },
    goBack() {
      uni.navigateBack({
        fail: () => uni.reLaunch({ url: '/pages/home/home' }),
      })
    },
    joinActivity() {
      uni.showToast({ title: '报名成功', icon: 'success' })
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
    height: calc(96rpx + env(safe-area-inset-top));
    padding: env(safe-area-inset-top) 24rpx 0;
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
  }

  &__action-btn {
    height: 88rpx;
    border-radius: 18rpx;
    background: #6366f1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font-size: 30rpx;
    font-weight: 600;
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

.host {
  display: flex;
  align-items: center;
  gap: 16rpx;

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
</style>
