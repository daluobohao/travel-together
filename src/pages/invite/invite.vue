<template>
  <view class="page sub">
    <view class="sub__header">
      <view class="sub__back" @click="goBack"><wm-icon name="chevronLeft" :size="36" color="#0f172a" /></view>
      <text class="sub__title">邀请好友</text>
      <view class="sub__sp" />
    </view>

    <view v-if="loading" class="sub__state"><text>加载中…</text></view>
    <view v-else class="sub__body">
      <view class="hero-card">
        <text class="hero-card__num">{{ data.qualifiedCount || 0 }}</text>
        <text class="hero-card__label">累计有效邀请</text>
        <text v-if="data.pendingCount" class="hero-card__sub">待完成 {{ data.pendingCount }} 人</text>
        <view v-if="data.nextTier" class="progress">
          <view class="progress__bar"><view class="progress__fill" :style="{ width: progressPct }" /></view>
          <text class="progress__text">距下一档 {{ data.nextTier }} 人 · {{ Math.round((data.nextTierProgress || 0) * 100) }}%</text>
        </view>
      </view>

      <view class="panel">
        <text class="panel__label">我的邀请码</text>
        <view class="code-row">
          <text class="code-row__code">{{ data.code }}</text>
          <text class="code-row__copy" @click="copyCode">复制</text>
        </view>
        <text class="panel__hint">好友注册后 7 天内加群或报名即算成功</text>
        <text v-if="data.photoVerified" class="panel__bonus">照片已验证 · 奖励时长 +20%</text>
      </view>

      <view class="actions">
        <!-- #ifdef MP-WEIXIN || MP-TOUTIAO -->
        <button class="wm-btn wm-btn--primary actions__btn" open-type="share">分享给好友</button>
        <!-- #endif -->
        <!-- #ifndef MP-WEIXIN || MP-TOUTIAO -->
        <view class="wm-btn wm-btn--primary actions__btn" @click="copyShare">复制分享文案</view>
        <!-- #endif -->
      </view>

      <view class="panel">
        <text class="panel__label">奖励阶梯</text>
        <view v-for="t in tiers" :key="t.count" class="tier-row">
          <text class="tier-row__n">{{ t.count }} 人</text>
          <text class="tier-row__d">{{ t.label }}</text>
        </view>
      </view>

      <view v-if="records.length" class="panel">
        <text class="panel__label">最近记录</text>
        <view v-for="(r, i) in records" :key="i" class="rec-row">
          <text class="rec-row__name">{{ r.inviteeNickname }}</text>
          <text class="rec-row__st" :class="'rec-row__st--' + r.status">{{ statusLabel(r.status) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import { getMyReferral } from '@/api'
import { REFERRAL_TIERS } from '@/constants/growthTrust'
import { copyTextToClipboard } from '@/utils/clipboard'
import {
  SHARE_SRC_FRIEND,
  SHARE_SRC_TIMELINE,
  appendShareAttributionToPath,
  appendShareAttributionToQuery,
  cacheMyReferralCode,
} from '@/utils/acquisitionSource'

const STATUS_MAP = {
  pending: '待完成',
  qualified: '已生效',
  expired: '已过期',
  rejected: '无效',
}

export default {
  components: { WmIcon },
  data() {
    return { loading: true, data: {}, tiers: REFERRAL_TIERS, records: [] }
  },
  computed: {
    progressPct() {
      return `${Math.round((this.data.nextTierProgress || 0) * 100)}%`
    },
  },
  methods: {
    goBack() {
      uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/profile/profile' }) })
    },
    statusLabel(s) {
      return STATUS_MAP[s] || s
    },
    copyCode() {
      copyTextToClipboard(this.data.code || '')
    },
    copyShare() {
      const text = `我在用「旅聚」找同城旅友～加入城市大群或一起参加线下小活动，公共场所见面更安心。邀请码：${this.data.code}`
      copyTextToClipboard(text, { successHint: '已复制分享文案' })
    },
    async load() {
      this.loading = true
      try {
        const d = await getMyReferral()
        this.data = d || {}
        this.records = d?.records || []
        if (d?.code) cacheMyReferralCode(d.code)
      } catch (e) {
        uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
  },
  onShow() {
    this.load()
  },
  onShareAppMessage() {
    const base = this.data.sharePath || '/pages/entry/entry'
    return {
      title: '来旅聚，加入同城大群',
      path: appendShareAttributionToPath(base, SHARE_SRC_FRIEND),
    }
  },
  // #ifdef MP-WEIXIN
  onShareTimeline() {
    const base = this.data.sharePath || '/pages/entry/entry'
    const q = base.includes('?') ? base.split('?')[1] : ''
    return {
      title: '来旅聚，加入同城大群',
      query: appendShareAttributionToQuery(q, SHARE_SRC_TIMELINE),
    }
  },
  // #endif
}
</script>

<style lang="scss" scoped>
@import '@/styles/sub-page.scss';
.hero-card {
  background: #fff;
  border-radius: $wm-radius-lg;
  padding: 40rpx 32rpx;
  text-align: center;
  border: $wm-card-edge;
  box-shadow: $wm-shadow-md;
  &__num {
    font-size: 72rpx;
    font-weight: 800;
    color: $wm-primary;
  }
  &__label {
    display: block;
    font-size: 28rpx;
    color: $wm-text-2;
    margin-top: 8rpx;
  }
  &__sub {
    display: block;
    font-size: 24rpx;
    color: $wm-warning;
    margin-top: 12rpx;
  }
}
.progress {
  margin-top: 28rpx;
  &__bar {
    height: 12rpx;
    background: #e2e8f0;
    border-radius: 999rpx;
    overflow: hidden;
  }
  &__fill {
    height: 100%;
    background: $wm-gradient-primary;
  }
  &__text {
    display: block;
    margin-top: 12rpx;
    font-size: 22rpx;
    color: $wm-text-3;
  }
}
.code-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
  &__code {
    font-size: 40rpx;
    font-weight: 800;
    letter-spacing: 4rpx;
    color: $wm-text-1;
  }
  &__copy {
    color: $wm-primary;
    font-size: 28rpx;
    font-weight: 600;
  }
}
.tier-row {
  display: flex;
  gap: 16rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f1f5f9;
  &:last-child {
    border-bottom: none;
  }
  &__n {
    width: 100rpx;
    font-weight: 700;
    color: $wm-primary;
  }
  &__d {
    flex: 1;
    font-size: 26rpx;
    color: $wm-text-2;
  }
}
.rec-row {
  display: flex;
  justify-content: space-between;
  padding: 14rpx 0;
  &__name {
    font-size: 28rpx;
    color: $wm-text-1;
  }
  &__st {
    font-size: 24rpx;
    &--qualified {
      color: $wm-success;
    }
    &--pending {
      color: $wm-warning;
    }
    &--expired {
      color: $wm-text-3;
    }
  }
}
.actions {
  margin: 24rpx 0;
  &__btn {
    width: 100%;
  }
}
</style>
