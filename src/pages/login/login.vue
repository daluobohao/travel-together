<template>
  <view class="page login">
    <view class="login__header">
      <text class="login__title">登录旅聚</text>
      <text class="login__subtitle">登录后即可查看活动并发布组局</text>
    </view>

    <!-- #ifdef H5 -->
    <view class="login__form">
      <view class="field" :class="{ 'field--error': emailError }">
        <text class="field__label">邮箱</text>
        <input
          v-model="form.email"
          class="field__input"
          type="text"
          maxlength="128"
          placeholder="请输入邮箱"
          placeholder-class="field__placeholder"
          @input="onEmailInput"
        />
        <text v-if="emailError" class="field__error">{{ emailError }}</text>
      </view>

      <view class="field" :class="{ 'field--error': passwordError }">
        <text class="field__label">密码</text>
        <input
          v-model="form.password"
          class="field__input"
          type="password"
          maxlength="64"
          placeholder="至少 8 位，需包含字母和数字"
          placeholder-class="field__placeholder"
          @input="onPasswordInput"
        />
        <text v-if="passwordError" class="field__error">{{ passwordError }}</text>
      </view>

      <view v-if="authMode === 'register'" class="field" :class="{ 'field--error': confirmError }">
        <text class="field__label">确认密码</text>
        <input
          v-model="form.confirmPassword"
          class="field__input"
          type="password"
          maxlength="64"
          placeholder="请再次输入密码"
          placeholder-class="field__placeholder"
          @input="onConfirmInput"
        />
        <text v-if="confirmError" class="field__error">{{ confirmError }}</text>
      </view>
    </view>

    <view class="login__action">
      <view class="login__agree" @click="toggleAgree">
        <view class="login__agree-box" :class="{ 'login__agree-box--checked': agreeTerms }">
          <text v-if="agreeTerms" class="login__agree-check">✓</text>
        </view>
        <view class="login__agree-text">
          <text class="login__agree-plain">我已阅读并同意</text>
          <text class="login__agree-link" @click.stop.prevent="openUserAgreement">《用户服务协议》</text>
          <text class="login__agree-plain">与</text>
          <text class="login__agree-link" @click.stop.prevent="openPrivacyPolicy">《隐私政策》</text>
        </view>
      </view>

      <view
        class="login__btn"
        :class="{ 'login__btn--loading': emailLoading, 'login__btn--disabled': !canSubmitEmail }"
        :hover-class="canSubmitEmail && !emailLoading ? 'login__btn--hover' : ''"
        @click="onEmailSubmit"
      >
        <view v-if="emailLoading" class="btn-spinner" />
        <text v-else>{{ authMode === 'register' ? '注册并登录' : '登录' }}</text>
      </view>
      <view class="login__switch" @click="toggleAuthMode">
        <text>{{ authMode === 'register' ? '已有账号？去登录' : '没有账号？去注册' }}</text>
      </view>
      <view class="login__cancel" @click="onCancelBrowse">取消</view>
    </view>
    <!-- #endif -->

    <!-- #ifdef MP-WEIXIN -->
    <view class="login__wechat-block">
      <view class="login__agree login__agree--mp">
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

      <button
        class="login__wechat-btn"
        :loading="wechatLoginLoading"
        :disabled="wechatLoginLoading || !agreeTerms"
        @click="onWechatLogin"
      >
        微信一键登录
      </button>
      <view class="login__cancel" @click="onCancel">取消</view>
    </view>
    <!-- #endif -->
  </view>
</template>

<script>
import {
  clearWmAuthTokens,
  getAccessToken,
  loginByEmail,
  loginByWechat,
  registerByEmail,
} from '@/api'
import { buildDefaultTimelineShare, DEFAULT_MINI_PROGRAM_SHARE } from '@/utils/activityShare'
import {
  applyLoginTokens,
  clearSkipSilentLogin,
  getWxLoginCode,
  navigateAfterLogin,
  setSkipSilentLogin,
} from '@/utils/wechatAuth'

const EMAIL_REG = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASS_MIN_LEN = 8

function isValidPassword(value) {
  const p = String(value || '')
  if (p.length < PASS_MIN_LEN) return false
  return /[a-zA-Z]/.test(p) && /\d/.test(p)
}

function passwordRuleHint(value) {
  const p = String(value || '')
  if (p.length < PASS_MIN_LEN) return `密码至少 ${PASS_MIN_LEN} 位`
  if (!/[a-zA-Z]/.test(p) || !/\d/.test(p)) return '密码需同时包含字母和数字'
  return ''
}

export default {
  data() {
    return {
      agreeTerms: false,
      lastLoginTapAt: 0,
      // #ifdef H5
      authMode: 'login',
      form: {
        email: '',
        password: '',
        confirmPassword: '',
      },
      emailLoading: false,
      emailError: '',
      passwordError: '',
      confirmError: '',
      // #endif
      // #ifdef MP-WEIXIN
      wechatLoginLoading: false,
      // #endif
    }
  },
  computed: {
    // #ifdef H5
    canSubmitEmail() {
      const emailOk = EMAIL_REG.test(String(this.form.email || '').trim())
      const passOk = isValidPassword(this.form.password)
      const confirmOk =
        this.authMode !== 'register' ||
        String(this.form.confirmPassword || '') === String(this.form.password || '')
      return emailOk && passOk && confirmOk && !this.emailLoading && this.agreeTerms
    },
    // #endif
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
    // #ifdef H5
    toggleAgree() {
      this.agreeTerms = !this.agreeTerms
    },
    // #endif
    openUserAgreement() {
      uni.navigateTo({ url: '/pages/user-agreement/user-agreement' })
    },
    openPrivacyPolicy() {
      uni.navigateTo({ url: '/pages/privacy-policy/privacy-policy' })
    },
    // #ifdef H5
    toggleAuthMode() {
      this.authMode = this.authMode === 'login' ? 'register' : 'login'
      this.emailError = ''
      this.passwordError = ''
      this.confirmError = ''
      this.form.confirmPassword = ''
    },
    onEmailInput() {
      if (this.emailError) this.emailError = ''
    },
    onPasswordInput() {
      if (this.passwordError) this.passwordError = ''
    },
    onConfirmInput() {
      if (this.confirmError) this.confirmError = ''
    },
    onCancelBrowse() {
      clearWmAuthTokens()
      uni.reLaunch({ url: '/pages/home/home' })
    },
    async onEmailSubmit() {
      if (!this.agreeTerms) {
        uni.showToast({ title: '请先阅读并勾选同意协议与隐私政策', icon: 'none' })
        return
      }
      if (this.emailLoading || !this.canSubmitEmail) return
      const now = Date.now()
      if (now - this.lastLoginTapAt < 800) return
      this.lastLoginTapAt = now

      const email = String(this.form.email || '').trim().toLowerCase()
      const password = String(this.form.password || '')

      this.emailError = ''
      this.passwordError = ''
      this.confirmError = ''

      if (!EMAIL_REG.test(email)) {
        this.emailError = '请输入正确的邮箱'
        return
      }
      const passHint = passwordRuleHint(password)
      if (passHint) {
        this.passwordError = passHint
        return
      }
      if (this.authMode === 'register' && password !== String(this.form.confirmPassword || '')) {
        this.confirmError = '两次输入的密码不一致'
        return
      }

      this.emailLoading = true
      try {
        const payload = { email, password }
        const data =
          this.authMode === 'register'
            ? await registerByEmail(payload)
            : await loginByEmail(payload)
        applyLoginTokens(data)
        navigateAfterLogin(data?.user)
      } catch (e) {
        uni.showToast({
          title: e?.message || (this.authMode === 'register' ? '注册失败' : '登录失败'),
          icon: 'none',
        })
      } finally {
        this.emailLoading = false
      }
    },
    // #endif
    // #ifdef MP-WEIXIN
    onCancel() {
      setSkipSilentLogin(true)
      clearWmAuthTokens()
      uni.reLaunch({ url: '/pages/home/home' })
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
        clearSkipSilentLogin()
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
    // #endif
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
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 16rpx;
    margin-bottom: 28rpx;
    padding: 4rpx 6rpx;

    &--mp {
      margin-bottom: 24rpx;
      animation: fadeInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.05s both;
    }
  }

  &__agree-box {
    flex-shrink: 0;
    width: 36rpx;
    height: 36rpx;
    border-radius: 10rpx;
    border: 2rpx solid #cbd5e1;
    background: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2rpx 8rpx rgba(15, 23, 42, 0.06);
    transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;

    &--checked {
      background: $wm-accent;
      border-color: $wm-accent;
      box-shadow: 0 4rpx 12rpx rgba(13, 148, 136, 0.28);
    }
  }

  &__agree-check {
    font-size: 22rpx;
    font-weight: 800;
    color: #ffffff;
    line-height: 1;
  }

  &__agree-label {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 14rpx;
    width: 100%;

    :deep(checkbox) {
      transform: scale(0.92);
      transform-origin: center center;
    }
  }

  &__agree-text {
    flex: 1;
    min-width: 0;
    font-size: 24rpx;
    line-height: 1.6;
    color: $wm-text-2;
    word-break: break-all;
  }

  &__agree-plain {
    color: $wm-text-2;
  }

  &__agree-link {
    color: $wm-accent;
    font-weight: 600;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 24rpx;
    animation: fadeInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both;
  }

  &__action {
    margin-top: 32rpx;
    animation: fadeInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.12s both;
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

  &__switch {
    margin-top: 24rpx;
    text-align: center;
    font-size: 26rpx;
    font-weight: 600;
    color: $wm-accent;

    &:active {
      opacity: 0.75;
    }
  }

  &__cancel {
    margin-top: 28rpx;
    height: 88rpx;
    line-height: 88rpx;
    text-align: center;
    font-size: 30rpx;
    font-weight: 600;
    color: $wm-text-3;
    border-radius: $wm-radius-xl;
    background: rgba(255, 255, 255, 0.85);
    border: 1rpx solid rgba(148, 163, 184, 0.35);

    &:active {
      opacity: 0.75;
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
  transition: border-color 0.2s, box-shadow 0.2s;

  &--error {
    border-color: $wm-danger;
    animation: shake 0.5s ease-in-out;
  }

  &__label {
    font-size: 28rpx;
    color: $wm-text-2;
    font-weight: 700;
  }

  &__input {
    font-size: 32rpx;
    color: $wm-text-1;
    padding: 8rpx 0;
    border: none;
    background: transparent;
    font-weight: 500;
  }

  &__placeholder {
    color: $wm-text-3;
  }

  &__error {
    font-size: 24rpx;
    color: $wm-danger;
    margin-top: 6rpx;
    font-weight: 600;
  }
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
