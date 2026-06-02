<template>
  <view class="page sub trust">
    <view class="sub__header">
      <view class="sub__back" @click="goBack"><wm-icon name="chevronLeft" :size="36" color="#0f172a" /></view>
      <text class="sub__title">{{ adminReviewMode ? '照片验证审核' : '信任中心' }}</text>
      <view class="sub__sp" />
    </view>

    <admin-photo-review-panel
      v-if="adminReviewMode"
      ref="adminReview"
      @changed="onAdminReviewChanged"
    />

    <view v-else-if="loading" class="sub__state"><text>加载中…</text></view>
    <view v-else class="sub__body">
      <view class="level-card">
        <view class="level-card__main">
          <text class="level-card__title">{{ trustLabel }}</text>
          <text class="level-card__sub">信任概况 · {{ trust.trustScoreSummary || '—' }}</text>
        </view>
        <view v-if="trust.meetCount" class="level-card__stat">
          <text class="level-card__stat-num">{{ trust.meetCount }}</text>
          <text class="level-card__stat-label">次见面</text>
        </view>
      </view>

      <view class="panel">
        <text class="panel__label">信任进度</text>
        <view class="kv-row">
          <text class="kv-row__label">资料完整</text>
          <text class="kv-row__value" :class="{ 'kv-row__value--ok': trust.profileComplete }">
            {{ trust.profileComplete ? '已完成' : '未完成' }}
          </text>
        </view>
        <view class="kv-row">
          <text class="kv-row__label">照片验证</text>
          <text class="kv-row__value" :class="photoStatusClass">{{ photoStatusText }}</text>
        </view>
        <view class="kv-row kv-row--last">
          <text class="kv-row__label">实名认证</text>
          <text class="kv-row__value" :class="realnameStatusClass">{{ realnameStatusText }}</text>
        </view>
      </view>

      <view class="panel panel--menu">
        <text class="panel__label">更多</text>
        <view class="menu-link" @click="goPhotoVerify">
          <text class="menu-link__label">照片验证</text>
          <view class="menu-link__right">
            <text class="menu-link__meta">{{ photoStatusText }}</text>
            <wm-icon name="chevronRight" :size="28" color="#cbd5e1" />
          </view>
        </view>
        <view class="menu-link" @click="goRealname">
          <text class="menu-link__label">实名认证（可选）</text>
          <view class="menu-link__right">
            <text class="menu-link__meta">{{ realnameStatusText }}</text>
            <wm-icon name="chevronRight" :size="28" color="#cbd5e1" />
          </view>
        </view>
        <view class="menu-link" @click="goInvite">
          <text class="menu-link__label">邀请好友</text>
          <view class="menu-link__right">
            <text class="menu-link__meta">已邀 {{ trust.qualifiedReferrals || 0 }} 人</text>
            <wm-icon name="chevronRight" :size="28" color="#cbd5e1" />
          </view>
        </view>
        <view class="menu-link" @click="goMeetHistory">
          <text class="menu-link__label">见面记录</text>
          <view class="menu-link__right">
            <wm-icon name="chevronRight" :size="28" color="#cbd5e1" />
          </view>
        </view>
        <view class="menu-link menu-link--last" @click="goSafety">
          <text class="menu-link__label">独行安全指南</text>
          <view class="menu-link__right">
            <wm-icon name="chevronRight" :size="28" color="#cbd5e1" />
          </view>
        </view>
      </view>

      <view v-if="premium.enabled" class="panel">
        <text class="panel__label">我的权益</text>
        <view class="kv-row">
          <text class="kv-row__label">旅聚+ 有效期</text>
          <text class="kv-row__value">至 {{ expireText }}</text>
        </view>
        <view v-if="premium.entitlement?.pinQuotaRemaining" class="kv-row kv-row--last">
          <text class="kv-row__label">活动置顶</text>
          <text class="kv-row__value">剩余 {{ premium.entitlement.pinQuotaRemaining }} 次</text>
        </view>
      </view>

      <view v-if="badges.length" class="panel">
        <view class="panel__head">
          <text class="panel__label panel__label--inline">徽章</text>
          <text class="panel__sub">关闭后不在公开页展示</text>
        </view>
        <view v-for="(b, i) in badges" :key="b.badgeId" class="badge-row" :class="{ 'badge-row--last': i === badges.length - 1 }">
          <view class="badge-row__info">
            <text class="badge-row__name">{{ badgeName(b.badgeId) }}</text>
            <text class="badge-row__desc">{{ badgeDesc(b.badgeId) }}</text>
          </view>
          <switch
            class="badge-row__switch"
            :checked="b.visible !== false"
            color="#0d9488"
            @change="onBadgeToggle(b.badgeId, $event)"
          />
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import AdminPhotoReviewPanel from '@/components/AdminPhotoReviewPanel/AdminPhotoReviewPanel.vue'
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import {
  formatTrustLevelLabel,
  getMyTrust,
  getPremiumStatus,
  parseApiDateTime,
  setBadgeVisibility,
} from '@/api'
import { BADGE_META } from '@/constants/growthTrust'

export default {
  components: { WmIcon, AdminPhotoReviewPanel },
  data() {
    return {
      adminReviewMode: false,
      loading: true,
      trust: {},
      premium: { enabled: false, entitlement: {} },
      badges: [],
    }
  },
  computed: {
    trustLabel() {
      return formatTrustLevelLabel(this.trust.trustLevel)
    },
    photoStatusText() {
      const s = this.trust.photoVerification?.status
      if (s === 'approved' || this.trust.photoVerified) return '已通过'
      if (s === 'pending') return '审核中'
      if (s === 'rejected') return '未通过'
      return '未验证'
    },
    realnameStatusText() {
      const s = this.trust.realnameVerification?.status
      if (s === 'approved') return '已通过'
      if (s === 'pending') return '审核中'
      return '未认证'
    },
    photoStatusClass() {
      const t = this.photoStatusText
      if (t === '已通过') return 'kv-row__value--ok'
      if (t === '审核中') return 'kv-row__value--pending'
      if (t === '未通过') return 'kv-row__value--warn'
      return ''
    },
    realnameStatusClass() {
      const t = this.realnameStatusText
      if (t === '已通过') return 'kv-row__value--ok'
      if (t === '审核中') return 'kv-row__value--pending'
      return ''
    },
    expireText() {
      const iso = this.premium.entitlement?.expiresAt
      const d = parseApiDateTime(iso)
      if (!d) return '—'
      return `${d.getMonth() + 1}/${d.getDate()}`
    },
  },
  methods: {
    goBack() {
      uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/profile/profile' }) })
    },
    badgeName(id) {
      return BADGE_META[id]?.name || id
    },
    badgeDesc(id) {
      return BADGE_META[id]?.desc || ''
    },
    goPhotoVerify() {
      uni.navigateTo({ url: '/pages/photo-verify/photo-verify' })
    },
    goRealname() {
      uni.showToast({ title: '请通过组织者认证流程提交实名', icon: 'none' })
    },
    goInvite() {
      uni.navigateTo({ url: '/pages/invite/invite' })
    },
    goMeetHistory() {
      uni.navigateTo({ url: '/pages/meet-history/meet-history' })
    },
    goSafety() {
      uni.navigateTo({ url: '/pages/safety-guide/safety-guide' })
    },
    async onBadgeToggle(badgeId, e) {
      const visible = e.detail.value
      try {
        await setBadgeVisibility(badgeId, visible)
        const row = this.badges.find((b) => b.badgeId === badgeId)
        if (row) row.visible = visible
      } catch (err) {
        uni.showToast({ title: err?.message || '设置失败', icon: 'none' })
      }
    },
    async load() {
      this.loading = true
      try {
        const [trust, premium] = await Promise.all([getMyTrust(), getPremiumStatus()])
        this.trust = trust || {}
        this.premium = premium || { enabled: false }
        this.badges = trust?.badges || []
      } catch (e) {
        uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    onAdminReviewChanged() {
      /* 审核后刷新「我的」待审数量等 */
    },
  },
  onLoad(options) {
    this.adminReviewMode = options?.mode === 'adminReview'
  },
  onShow() {
    if (this.adminReviewMode) {
      const panel = this.$refs.adminReview
      if (panel && typeof panel.init === 'function') panel.init()
      return
    }
    this.load()
  },
  onReachBottom() {
    if (this.adminReviewMode && this.$refs.adminReview) {
      this.$refs.adminReview.loadMore()
    }
  },
}
</script>

<style lang="scss" scoped>
@import '@/styles/sub-page.scss';

.level-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
  background: $wm-gradient-primary;
  border-radius: $wm-radius-lg;
  padding: 36rpx 32rpx;
  color: #fff;
  box-shadow: $wm-shadow-glow;

  &__main {
    flex: 1;
    min-width: 0;
  }

  &__title {
    display: block;
    font-size: 40rpx;
    font-weight: 800;
    line-height: 1.2;
  }

  &__sub {
    display: block;
    margin-top: 12rpx;
    font-size: 26rpx;
    opacity: 0.9;
  }

  &__stat {
    flex-shrink: 0;
    text-align: center;
    padding: 16rpx 20rpx;
    border-radius: $wm-radius-md;
    background: rgba(255, 255, 255, 0.18);
    min-width: 100rpx;
  }

  &__stat-num {
    display: block;
    font-size: 36rpx;
    font-weight: 800;
    line-height: 1.1;
  }

  &__stat-label {
    display: block;
    margin-top: 4rpx;
    font-size: 20rpx;
    opacity: 0.9;
  }
}

.kv-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
  padding: 22rpx 0;
  border-bottom: 1rpx solid #f1f5f9;

  &--last {
    border-bottom: none;
    padding-bottom: 0;
  }

  &__label {
    flex: 1;
    min-width: 0;
    font-size: 28rpx;
    color: $wm-text-1;
    font-weight: 500;
  }

  &__value {
    flex-shrink: 0;
    font-size: 26rpx;
    color: $wm-text-3;
    font-weight: 600;
    text-align: right;

    &--ok {
      color: $wm-success;
    }

    &--pending {
      color: $wm-warning;
    }

    &--warn {
      color: $wm-danger;
    }
  }
}

.panel--menu {
  .panel__label {
    margin-bottom: 4rpx;
  }
}

.panel__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 8rpx;
}

.panel__label--inline {
  margin-bottom: 0;
}

.panel__sub {
  flex-shrink: 0;
  font-size: 22rpx;
  color: $wm-text-3;
}

.badge-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  padding: 22rpx 0;
  border-bottom: 1rpx solid #f1f5f9;

  &--last {
    border-bottom: none;
    padding-bottom: 0;
  }

  &__info {
    flex: 1;
    min-width: 0;
  }

  &__name {
    display: block;
    font-size: 28rpx;
    font-weight: 700;
    color: $wm-text-1;
  }

  &__desc {
    display: block;
    font-size: 22rpx;
    color: $wm-text-3;
    margin-top: 6rpx;
    line-height: 1.4;
  }

  &__switch {
    flex-shrink: 0;
    transform: scale(0.88);
    transform-origin: center right;
  }
}
</style>
