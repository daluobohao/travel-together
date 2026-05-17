<template>
  <view class="page login">
    <view class="login__header">
      <text class="login__title">登录旅聚</text>
      <text class="login__subtitle">登录后即可查看活动并发布组局</text>
    </view>

    <view class="login__agree login__agree--top">
      <checkbox-group @change="onAgreeChange">
        <label class="login__agree-label">
          <checkbox value="agree" :checked="agreeTerms" color="#0d9488" />
          <view class="login__agree-text">
            <text class="login__agree-plain">我已阅读并同意</text>
            <text class="login__agree-link" @click.stop.prevent="openUserAgreement">《用户服务协议》</text>
            <text class="login__agree-plain">与</text>
            <text class="login__agree-link" @click.stop.prevent="openPrivacyPolicy">《隐私政策》</text>
          </view>
        </label>
      </checkbox-group>
    </view>

    <!-- #ifdef MP-WEIXIN -->
    <view class="login__wechat-block">
      <button
        class="login__wechat-btn"
        :loading="wechatLoginLoading"
        :disabled="wechatLoginLoading || !agreeTerms"
        @click="onWechatLogin"
      >
        微信一键登录
      </button>
    </view>
    <!-- #endif -->
  </view>
</template>

<script>
import { getAccessToken, loginByWechat } from '@/api'
import { buildDefaultTimelineShare, DEFAULT_MINI_PROGRAM_SHARE } from '@/utils/activityShare'
import {
  applyLoginTokens,
  getWxLoginCode,
  navigateAfterLogin,
} from '@/utils/wechatAuth'

export default {
  data() {
    return {
      wechatLoginLoading: false,
      lastLoginTapAt: 0,
      agreeTerms: false,
    }
  },
  onShow() {
    if (getAccessToken()) {
      uni.reLaunch({ url: '/pages/home/home' })
      return
    }
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
  },
  onShareAppMessage() {
    return { ...DEFAULT_MINI_PROGRAM_SHARE }
  },
  onShareTimeline() {
    return buildDefaultTimelineShare()
  },
  methods: {
    onAgreeChange(e) {
      const v = e?.detail?.value || []
      this.agreeTerms = Array.isArray(v) && v.indexOf('agree') !== -1
    },
    openUserAgreement() {
      uni.navigateTo({ url: '/pages/user-agreement/user-agreement' })
    },
    openPrivacyPolicy() {
      uni.navigateTo({ url: '/pages/privacy-policy/privacy-policy' })
    },
    async onWechatLogin() {
      if (!this.agreeTerms) {
        uni.showToast({ title: '请先阅读并勾选同意协议与隐私政策', icon: 'none' })
        return
      }
      if (this.wechatLoginLoading) return
      const now = Date.now()
      if (now - this.lastLoginTapAt < 800) return
      this.lastLoginTapAt = now

      this.wechatLoginLoading = true
      try {
        const code = await getWxLoginCode()
        const data = await loginByWechat({ code })
        applyLoginTokens(data)
        navigateAfterLogin(data?.user)
      } catch (e) {
        uni.showToast({ title: e?.message || '微信登录失败', icon: 'none' })
      } finally {
        this.wechatLoginLoading = false
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.login {
  min-height: 100vh;
  padding: calc(60rpx + var(--status-bar-height, 0px) + env(safe-area-inset-top)) 36rpx 40rpx;
  background: transparent;

  &__header {
    margin-bottom: 36rpx;
    display: flex;
    flex-direction: column;
    gap: 14rpx;
    animation: fadeInDown 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  &__title {
    font-size: 64rpx;
    font-weight: 800;
    background: $wm-gradient-hero;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1.1;
  }

  &__subtitle {
    font-size: 28rpx;
    color: $wm-text-3;
    font-weight: 500;
  }

  &__agree {
    padding: 0 8rpx;

    &--top {
      margin-bottom: 32rpx;
      animation: fadeInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.05s both;
    }
  }

  &__agree-label {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: 12rpx;
  }

  &__agree-text {
    flex: 1;
    font-size: 24rpx;
    line-height: 1.65;
    color: $wm-text-2;
  }

  &__agree-plain {
    color: $wm-text-2;
  }

  &__agree-link {
    color: $wm-accent;
    font-weight: 600;
  }

  &__wechat-block {
    margin-bottom: 28rpx;
    animation: fadeInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.08s both;
  }

  &__wechat-btn {
    width: 100%;
    height: 100rpx;
    line-height: 100rpx;
    border-radius: $wm-radius-xl;
    background: #07c160;
    color: #ffffff;
    font-size: 32rpx;
    font-weight: 700;
    border: none;
    box-shadow: 0 12rpx 32rpx rgba(7, 193, 96, 0.35);

    &[disabled] {
      background: #94a3b8;
      color: #e2e8f0;
      box-shadow: none;
    }
  }
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-30rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
