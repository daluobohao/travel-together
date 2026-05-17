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

    <view class="login__divider">
      <view class="login__divider-line" />
      <text class="login__divider-text">或使用手机号</text>
      <view class="login__divider-line" />
    </view>
    <!-- #endif -->

    <view class="login__form">
      <view class="field" :class="{ 'field--error': phoneError }">
        <text class="field__label">手机号</text>
        <input
          v-model="form.phone"
          class="field__input"
          type="number"
          maxlength="11"
          placeholder="请输入 11 位手机号"
          placeholder-class="field__placeholder"
          @input="onPhoneInput"
        />
        <text v-if="phoneError" class="field__error">{{ phoneError }}</text>
      </view>

      <view class="field" :class="{ 'field--error': codeError }">
        <text class="field__label">验证码</text>
        <view class="field__row">
          <input
            v-model="form.code"
            class="field__input field__input--code"
            type="number"
            maxlength="6"
            placeholder="请输入验证码"
            placeholder-class="field__placeholder"
            @input="onCodeInput"
          />
          <view class="field__sms-btn" :class="{ 'field__sms-btn--disabled': smsDisabled }" @click="onSendSms">
            <text>{{ smsText }}</text>
          </view>
        </view>
        <text v-if="codeError" class="field__error">{{ codeError }}</text>
        <text v-if="smsSentOk && smsCodeValidMinutes > 0" class="field__ttl-hint">
          验证码 {{ smsCodeValidMinutes }} 分钟内有效
        </text>
      </view>

      <text v-if="hintSmsFirst" class="login__hint">请先点击「发送验证码」，成功后再登录</text>
    </view>

    <view class="login__action">
      <view
        class="login__btn"
        :class="{ 'login__btn--loading': loading, 'login__btn--disabled': !canSubmit }"
        :hover-class="canSubmit && !loading ? 'login__btn--hover' : ''"
        @click="onLogin"
      >
        <view v-if="loading" class="btn-spinner"></view>
        <text v-else>{{ loading ? '登录中...' : '手机号登录' }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { getAccessToken, loginBySms, loginByWechat, sendSmsCode } from '@/api'
import { buildDefaultTimelineShare, DEFAULT_MINI_PROGRAM_SHARE } from '@/utils/activityShare'
import {
  applyLoginTokens,
  getWxLoginCode,
  navigateAfterLogin,
} from '@/utils/wechatAuth'

const PHONE_REG = /^1\d{10}$/
const SMS_RESEND_COOLDOWN_SECONDS = 60

export default {
  data() {
    return {
      form: {
        phone: '',
        code: '',
      },
      countdown: 0,
      timer: null,
      loading: false,
      wechatLoginLoading: false,
      smsSentOk: false,
      sendingSms: false,
      lastLoginTapAt: 0,
      phoneError: '',
      codeError: '',
      agreeTerms: false,
      smsCodeValidMinutes: 0,
    }
  },
  computed: {
    smsDisabled() {
      return (
        this.countdown > 0 ||
        !PHONE_REG.test(this.form.phone) ||
        this.sendingSms ||
        !this.agreeTerms
      )
    },
    smsText() {
      if (this.sendingSms) return '发送中…'
      return this.countdown > 0 ? `${this.countdown}s后重试` : '发送验证码'
    },
    canSubmit() {
      return (
        PHONE_REG.test(this.form.phone) &&
        /^\d{4,6}$/.test(this.form.code) &&
        !this.loading &&
        !this.wechatLoginLoading &&
        this.smsSentOk &&
        this.agreeTerms
      )
    },
    hintSmsFirst() {
      return (
        PHONE_REG.test(this.form.phone) &&
        String(this.form.code || '').length >= 4 &&
        !this.smsSentOk
      )
    },
  },
  onUnload() {
    this.clearTimer()
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
    clearTimer() {
      if (this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
    },
    startCountdown(seconds) {
      this.clearTimer()
      this.countdown = Math.max(1, Number(seconds) || 60)
      this.timer = setInterval(() => {
        this.countdown -= 1
        if (this.countdown <= 0) {
          this.countdown = 0
          this.clearTimer()
        }
      }, 1000)
    },
    onPhoneInput() {
      if (this.phoneError) this.phoneError = ''
      this.smsSentOk = false
      this.smsCodeValidMinutes = 0
    },
    onCodeInput() {
      if (this.codeError) this.codeError = ''
    },
    async onWechatLogin() {
      if (!this.agreeTerms) {
        uni.showToast({ title: '请先阅读并勾选同意协议与隐私政策', icon: 'none' })
        return
      }
      if (this.wechatLoginLoading || this.loading) return
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
    async onSendSms() {
      if (!this.agreeTerms) {
        uni.showToast({ title: '请先阅读并勾选同意协议与隐私政策', icon: 'none' })
        return
      }
      if (this.smsDisabled) return
      this.sendingSms = true
      try {
        const data = await sendSmsCode({ phone: this.form.phone, scene: 'login' })
        this.smsSentOk = true
        const exp = Number(data?.expireInSeconds)
        this.smsCodeValidMinutes =
          Number.isFinite(exp) && exp > 0 ? Math.max(1, Math.ceil(exp / 60)) : 5
        this.startCountdown(SMS_RESEND_COOLDOWN_SECONDS)
        uni.showToast({ title: '验证码已发送', icon: 'none' })
      } catch (e) {
        this.smsSentOk = false
        this.smsCodeValidMinutes = 0
        uni.showToast({ title: e?.message || '发送失败', icon: 'none' })
      } finally {
        this.sendingSms = false
      }
    },
    async onLogin() {
      if (!this.agreeTerms) {
        uni.showToast({ title: '请先阅读并勾选同意协议与隐私政策', icon: 'none' })
        return
      }
      if (this.loading || !this.canSubmit) return
      const now = Date.now()
      if (now - this.lastLoginTapAt < 800) return
      this.lastLoginTapAt = now

      this.phoneError = ''
      this.codeError = ''

      if (!PHONE_REG.test(this.form.phone)) {
        this.phoneError = '请输入正确的手机号'
        return
      }
      if (!/^\d{4,6}$/.test(this.form.code)) {
        this.codeError = '请输入验证码'
        return
      }

      this.loading = true
      try {
        const data = await loginBySms({ phone: this.form.phone, code: this.form.code })
        applyLoginTokens(data)
        navigateAfterLogin(data?.user)
      } catch (e) {
        uni.showToast({ title: e?.message || '登录失败', icon: 'none' })
      } finally {
        this.loading = false
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

  &__divider {
    display: flex;
    align-items: center;
    gap: 20rpx;
    margin-bottom: 28rpx;
    padding: 0 8rpx;
  }

  &__divider-line {
    flex: 1;
    height: 2rpx;
    background: #e2e8f0;
  }

  &__divider-text {
    font-size: 24rpx;
    color: $wm-text-3;
    flex-shrink: 0;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 24rpx;
    animation: fadeInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both;
  }

  &__hint {
    font-size: 24rpx;
    color: $wm-warning;
    line-height: 1.5;
    padding: 0 8rpx;
    font-weight: 500;
  }

  &__action {
    margin-top: 40rpx;
    animation: fadeInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both;
  }

  &__btn {
    height: 100rpx;
    border-radius: $wm-radius-xl;
    background: $wm-gradient-primary;
    color: #ffffff;
    font-size: 32rpx;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12rpx;
    box-shadow: $wm-shadow-glow;
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s, opacity 0.2s;

    &--hover {
      transform: scale(0.98);
      box-shadow: $wm-shadow-lg;
    }

    &--disabled {
      background: #e2e8f0;
      color: #94a3b8;
      box-shadow: none;
    }

    &--loading {
      opacity: 0.85;
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

.btn-spinner {
  width: 40rpx;
  height: 40rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.35);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.field {
  background: #ffffff;
  border-radius: $wm-radius-lg;
  padding: 28rpx;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  box-shadow: $wm-shadow-md;
  border: $wm-card-edge;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
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
    opacity: 0;
    transition: opacity 0.2s;
  }

  &:focus-within::before {
    opacity: 1;
  }

  &--error {
    border-color: $wm-danger;
    animation: shake 0.5s ease-in-out;

    &::before {
      background: $wm-danger;
      opacity: 1;
    }
  }

  &__label {
    font-size: 28rpx;
    color: $wm-text-2;
    font-weight: 700;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 16rpx;
  }

  &__input {
    flex: 1;
    font-size: 32rpx;
    color: $wm-text-1;
    padding: 8rpx 0;
    border: none;
    background: transparent;
    font-weight: 500;

    &--code {
      min-width: 0;
    }
  }

  &__placeholder {
    color: $wm-text-3;
  }

  &__sms-btn {
    min-width: 200rpx;
    height: 72rpx;
    border-radius: $wm-radius-md;
    padding: 0 24rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: $wm-primary-soft;
    color: $wm-primary;
    font-size: 26rpx;
    font-weight: 700;
    transition: background-color 0.2s, color 0.2s, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);

    &:active {
      transform: scale(0.95);
    }

    &--disabled {
      background: #f1f5f9;
      color: $wm-text-3;
    }
  }

  &__error {
    font-size: 24rpx;
    color: $wm-danger;
    margin-top: 6rpx;
    font-weight: 600;
  }
}

.field__ttl-hint {
  font-size: 24rpx;
  color: $wm-text-3;
  margin-top: 10rpx;
  padding: 0 4rpx;
  line-height: 1.5;
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(-10rpx);
  }
  40% {
    transform: translateX(10rpx);
  }
  60% {
    transform: translateX(-10rpx);
  }
  80% {
    transform: translateX(10rpx);
  }
}
</style>
