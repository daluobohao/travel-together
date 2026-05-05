<template>
  <view class="page user-public">
    <view class="user-public__header">
      <view class="user-public__back" @click="goBack">
        <wm-icon name="chevronLeft" :size="36" color="#0f172a" />
      </view>
      <text class="user-public__header-title">发起人资料</text>
      <view class="user-public__placeholder" />
    </view>

    <view v-if="loading" class="user-public__state">
      <text>加载中…</text>
    </view>
    <view v-else-if="!profile" class="user-public__state">
      <text>暂无法获取该用户资料</text>
    </view>
    <view v-else class="user-public__content">
      <view v-if="profile && profile.__offlineSnapshot" class="offline-tip">
        <text>无法拉取服务端公开资料，以下为活动详情页带入的发起人摘要。</text>
      </view>
      <view class="hero">
        <view class="hero__avatar">
          <image v-if="profile.avatarUrl" class="hero__avatar-img" :src="profile.avatarUrl" mode="aspectFill" />
          <text v-else class="hero__avatar-text">{{ displayInitial }}</text>
        </view>
        <view class="hero__name-row">
          <text class="hero__name">{{ profile.nickname || '用户' }}</text>
          <view v-if="profile.verificationBadge" class="hero__badge">
            <wm-icon name="check" :size="20" color="#059669" />
            <text>已认证</text>
          </view>
        </view>
        <text class="hero__stat">已组织 {{ profile.organizedCount || 0 }} 场活动</text>
      </view>

      <view v-if="profile.tags && profile.tags.length" class="panel">
        <text class="section-title">兴趣标签</text>
        <view class="tags">
          <text v-for="(t, i) in profile.tags" :key="i" class="tags__item">{{ t }}</text>
        </view>
      </view>

      <view class="panel">
        <text class="section-title">个人简介</text>
        <text v-if="profile.bio" class="bio">{{ profile.bio }}</text>
        <text v-else class="bio bio--empty">暂无简介</text>
      </view>
    </view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import { getUserPublicProfile } from '@/api'

export default {
  components: { WmIcon },
  data() {
    return {
      loading: true,
      profile: null,
      /** 从活动详情页带入，供接口失败时展示 */
      snapshot: null,
    }
  },
  computed: {
    displayInitial() {
      const n = this.profile?.nickname || '用'
      return String(n).slice(0, 1)
    },
  },
  onLoad(query) {
    const userId = query?.userId ? String(query.userId) : ''
    let snapTags = []
    if (query.tags) {
      try {
        snapTags = JSON.parse(decodeURIComponent(query.tags))
      } catch (e) {
        snapTags = []
      }
    }
    if (!Array.isArray(snapTags)) snapTags = []
    this.snapshot = {
      userId,
      nickname: query.nick ? decodeURIComponent(query.nick) : '',
      avatarUrl: query.ava ? decodeURIComponent(query.ava) : '',
      bio: query.bio ? decodeURIComponent(query.bio) : '',
      tags: snapTags,
      organizedCount: query.hosted != null && query.hosted !== '' ? Number(query.hosted) : NaN,
      verificationBadge: query.v === '1' || query.v === 'true',
    }
    this.loadProfile(userId)
  },
  methods: {
    profileFromSnapshot() {
      const s = this.snapshot
      if (!s || !s.userId) return null
      return {
        userId: s.userId,
        nickname: s.nickname || '用户',
        avatarUrl: s.avatarUrl || null,
        bio: (s.bio && String(s.bio).trim()) || '',
        tags: Array.isArray(s.tags) ? s.tags : [],
        verificationBadge: s.verificationBadge,
        organizedCount: Number.isFinite(s.organizedCount) ? s.organizedCount : 0,
        __offlineSnapshot: true,
      }
    },
    async loadProfile(userId) {
      if (!userId) {
        this.loading = false
        this.profile = this.profileFromSnapshot()
        if (!this.profile) {
          uni.showToast({ title: '缺少用户 ID', icon: 'none' })
        }
        return
      }
      this.loading = true
      try {
        const data = await getUserPublicProfile(userId)
        if (data) {
          let merged = { ...data, __offlineSnapshot: false }
          const snapBio = (this.snapshot?.bio || '').trim()
          const apiBio = (merged.bio || '').trim()
          if (!apiBio && snapBio) merged = { ...merged, bio: snapBio }
          const snapTags = Array.isArray(this.snapshot?.tags) ? this.snapshot.tags.filter(Boolean) : []
          if (!(merged.tags && merged.tags.length) && snapTags.length) merged = { ...merged, tags: snapTags }
          this.profile = merged
        } else {
          this.profile = this.profileFromSnapshot()
        }
      } catch (e) {
        const snap = this.profileFromSnapshot()
        this.profile = snap
        if (!snap) {
          uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
        }
      } finally {
        this.loading = false
      }
    },
    goBack() {
      uni.navigateBack({
        fail: () => uni.switchTab({ url: '/pages/home/home' }),
      })
    },
  },
}
</script>

<style lang="scss" scoped>
.user-public {
  min-height: 100vh;
  background: #f3f4f6;

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
    padding: 24rpx;
    display: flex;
    flex-direction: column;
    gap: 20rpx;
  }

  &__state {
    padding: 80rpx 32rpx;
    text-align: center;
    font-size: 28rpx;
    color: #94a3b8;
  }
}

.offline-tip {
  margin-bottom: 8rpx;
  padding: 16rpx 20rpx;
  background: #fffbeb;
  border-radius: 16rpx;
  border: 1rpx solid #fde68a;

  text {
    font-size: 22rpx;
    line-height: 1.5;
    color: #92400e;
  }
}

.hero {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 40rpx 32rpx 36rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;

  &__avatar {
    width: 160rpx;
    height: 160rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, #a78bfa, #6366f1);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    margin-bottom: 24rpx;
  }

  &__avatar-img {
    width: 100%;
    height: 100%;
  }

  &__avatar-text {
    font-size: 56rpx;
    font-weight: 700;
    color: #ffffff;
  }

  &__name-row {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 12rpx;
    margin-bottom: 12rpx;
  }

  &__name {
    font-size: 40rpx;
    font-weight: 700;
    color: #0f172a;
  }

  &__badge {
    display: inline-flex;
    align-items: center;
    gap: 4rpx;
    padding: 4rpx 14rpx;
    border-radius: 999rpx;
    background: #ecfdf5;

    text {
      font-size: 22rpx;
      color: #059669;
      font-weight: 600;
    }
  }

  &__stat {
    font-size: 26rpx;
    color: #64748b;
  }
}

.panel {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 24rpx;
}

.section-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 16rpx;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;

  &__item {
    font-size: 24rpx;
    color: #6366f1;
    background: #eef2ff;
    padding: 8rpx 20rpx;
    border-radius: 999rpx;
    font-weight: 500;
  }
}

.bio {
  font-size: 28rpx;
  line-height: 1.65;
  color: #475569;

  &--empty {
    color: #94a3b8;
    font-style: italic;
  }
}
</style>
