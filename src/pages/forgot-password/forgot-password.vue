<template>
  <view class="page forgot">
    <view class="forgot__header">
      <view class="forgot__back" @click="goBack">
        <wm-icon name="chevronLeft" :size="34" color="#0f172a" />
      </view>
      <text class="forgot__title">忘记密码</text>
      <view class="forgot__placeholder" />
    </view>

    <text class="forgot__desc">输入注册邮箱，我们将发送验证码用于重置密码。</text>

    <view class="forgot__form">
      <view class="field" :class="{ 'field--error': emailError }">
        <text class="field__label">邮箱</text>
        <input
          v-model="form.email"
          class="field__input"
          type="text"
          maxlength="128"
          placeholder="请输入邮箱"
          placeholder-class="field__ph"
          @input="onEmailInput"
        />
        <text v-if="emailError" class="field__error">{{ emailError }}</text>
      </view>

      <view class="field" :class="{ 'field--error': codeError }">
        <text class="field__label">验证码</text>
        <view class="field__row">
          <input
            v-model="form.code"
            class="field__input field__input--code"
            type="number"
            maxlength="6"
            placeholder="6 位验证码"
            placeholder-class="field__ph"
            @input="onCodeInput"
          />
          <view class="field__sms" :class="{ 'field__sms--off': smsDisabled }" @click="onSendCode">
            <text>{{ smsText }}</text>
          </view>
        </view>
        <text v-if="codeError" class="field__error">{{ codeError }}</text>
        <text v-if="codeSentOk && codeValidMinutes > 0" class="field__hint">
          验证码 {{ codeValidMinutes }} 分钟内有效
        </text>
      </view>

      <view class="field" :class="{ 'field--error': passwordError }">
        <text class="field__label">新密码</text>
        <input
          v-model="form.password"
          class="field__input"
          type="password"
          maxlength="64"
          placeholder="至少 8 位，需包含字母和数字"
          placeholder-class="field__ph"
          @input="onPasswordInput"
        />
        <text v-if="passwordError" class="field__error">{{ passwordError }}</text>
      </view>

      <view class="field" :class="{ 'field--error': confirmError }">
        <text class="field__label">确认新密码</text>
        <input
          v-model="form.confirmPassword"
          class="field__input"
          type="password"
          maxlength="64"
          placeholder="请再次输入新密码"
          placeholder-class="field__ph"
          @input="onConfirmInput"
        />
        <text v-if="confirmError" class="field__error">{{ confirmError }}</text>
      </view>
    </view>

    <view
      class="forgot__submit"
      :class="{ 'forgot__submit--disabled': !canSubmit || submitting }"
      @click="onReset"
    >
      <text>{{ submitting ? '提交中…' : '重置密码并登录' }}</text>
    </view>

    <view class="forgot__link" @click="goLogin">
      <text>返回登录</text>
    </view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import { forgotPasswordByEmail, getAccessToken, resetPasswordByEmail } from '@/api'
import { applyLoginTokens, navigateAfterLogin } from '@/utils/wechatAuth'

const EMAIL_REG = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASS_MIN_LEN = 8
const RESEND_COOLDOWN_SECONDS = 60

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
  components: { WmIcon },
  data() {
    return {
      form: {
        email: '',
        code: '',
        password: '',
        confirmPassword: '',
      },
      emailError: '',
      codeError: '',
      passwordError: '',
      confirmError: '',
      codeSentOk: false,
      codeValidMinutes: 0,
      sendingCode: false,
      submitting: false,
      countdown: 0,
      timer: null,
    }
  },
  computed: {
    smsDisabled() {
      return (
        this.countdown > 0 ||
        !EMAIL_REG.test(String(this.form.email || '').trim()) ||
        this.sendingCode
      )
    },
    smsText() {
      if (this.sendingCode) return '发送中…'
      return this.countdown > 0 ? `${this.countdown}s后重试` : '获取验证码'
    },
    canSubmit() {
      const emailOk = EMAIL_REG.test(String(this.form.email || '').trim())
      const codeOk = /^\d{4,8}$/.test(String(this.form.code || '').trim())
      const passOk = isValidPassword(this.form.password)
      const confirmOk =
        String(this.form.confirmPassword || '') === String(this.form.password || '')
      return emailOk && codeOk && passOk && confirmOk && this.codeSentOk && !this.submitting
    },
  },
  onLoad(options) {
    const raw = options?.email ? decodeURIComponent(String(options.email)) : ''
    if (raw && EMAIL_REG.test(raw.trim())) {
      this.form.email = raw.trim().toLowerCase()
    }
  },
  onShow() {
    if (getAccessToken()) {
      uni.reLaunch({ url: '/pages/home/home' })
    }
  },
  onUnload() {
    this.clearTimer()
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    goLogin() {
      uni.navigateBack()
    },
    clearTimer() {
      if (this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
    },
    startCountdown(seconds) {
      this.clearTimer()
      this.countdown = Math.max(1, Number(seconds) || RESEND_COOLDOWN_SECONDS)
      this.timer = setInterval(() => {
        this.countdown -= 1
        if (this.countdown <= 0) {
          this.countdown = 0
          this.clearTimer()
        }
      }, 1000)
    },
    onEmailInput() {
      if (this.emailError) this.emailError = ''
      this.codeSentOk = false
      this.codeValidMinutes = 0
    },
    onCodeInput() {
      if (this.codeError) this.codeError = ''
    },
    onPasswordInput() {
      if (this.passwordError) this.passwordError = ''
    },
    onConfirmInput() {
      if (this.confirmError) this.confirmError = ''
    },
    async onSendCode() {
      if (this.smsDisabled) return

      const email = String(this.form.email || '').trim().toLowerCase()
      this.emailError = ''
      if (!EMAIL_REG.test(email)) {
        this.emailError = '请输入正确的邮箱'
        return
      }

      this.sendingCode = true
      try {
        const data = await forgotPasswordByEmail({ email })
        this.codeSentOk = true
        const exp = Number(data?.expireInSeconds)
        this.codeValidMinutes =
          Number.isFinite(exp) && exp > 0 ? Math.max(1, Math.ceil(exp / 60)) : 15
        this.startCountdown(RESEND_COOLDOWN_SECONDS)
        uni.showToast({
          title: '若邮箱已注册，将收到验证码邮件',
          icon: 'none',
          duration: 2800,
        })
      } catch (e) {
        this.codeSentOk = false
        this.codeValidMinutes = 0
        uni.showToast({ title: e?.message || '发送失败', icon: 'none' })
      } finally {
        this.sendingCode = false
      }
    },
    async onReset() {
      if (!this.canSubmit) {
        if (!this.codeSentOk) {
          uni.showToast({ title: '请先获取邮箱验证码', icon: 'none' })
        }
        return
      }

      const email = String(this.form.email || '').trim().toLowerCase()
      const code = String(this.form.code || '').trim()
      const newPassword = String(this.form.password || '')

      this.emailError = ''
      this.codeError = ''
      this.passwordError = ''
      this.confirmError = ''

      if (!EMAIL_REG.test(email)) {
        this.emailError = '请输入正确的邮箱'
        return
      }
      if (!/^\d{4,8}$/.test(code)) {
        this.codeError = '请输入验证码'
        return
      }
      const passHint = passwordRuleHint(newPassword)
      if (passHint) {
        this.passwordError = passHint
        return
      }
      if (newPassword !== String(this.form.confirmPassword || '')) {
        this.confirmError = '两次输入的密码不一致'
        return
      }

      this.submitting = true
      try {
        const data = await resetPasswordByEmail({ email, code, newPassword })
        applyLoginTokens(data)
        navigateAfterLogin(data?.user)
      } catch (e) {
        uni.showToast({ title: e?.message || '重置失败', icon: 'none' })
      } finally {
        this.submitting = false
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.forgot {
  min-height: 100vh;
  padding: calc(48rpx + var(--status-bar-height, 0px) + env(safe-area-inset-top)) 36rpx 40rpx;
  background: transparent;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 28rpx;
  }

  &__back,
  &__placeholder {
    width: 64rpx;
    height: 64rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__title {
    font-size: 34rpx;
    font-weight: 700;
    color: $wm-text-1;
  }

  &__desc {
    display: block;
    font-size: 26rpx;
    color: $wm-text-3;
    line-height: 1.6;
    margin-bottom: 32rpx;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 20rpx;
  }

  &__submit {
    margin-top: 40rpx;
    height: 100rpx;
    border-radius: $wm-radius-xl;
    background: $wm-gradient-primary;
    color: #fff;
    font-size: 32rpx;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: $wm-shadow-glow;

    &--disabled {
      background: #e2e8f0;
      color: #94a3b8;
      box-shadow: none;
    }

    &:active:not(&--disabled) {
      transform: scale(0.98);
    }
  }

  &__link {
    margin-top: 28rpx;
    text-align: center;
    font-size: 26rpx;
    font-weight: 600;
    color: $wm-accent;

    &:active {
      opacity: 0.75;
    }
  }
}

.field {
  background: #fff;
  border-radius: $wm-radius-lg;
  padding: 28rpx;
  border: $wm-card-edge;
  box-shadow: $wm-shadow-md;

  &--error {
    border-color: $wm-danger;
  }

  &__label {
    font-size: 28rpx;
    color: $wm-text-2;
    font-weight: 700;
    margin-bottom: 12rpx;
    display: block;
  }

  &__input {
    font-size: 32rpx;
    color: $wm-text-1;
    width: 100%;

    &--code {
      flex: 1;
      min-width: 0;
    }
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 16rpx;
  }

  &__sms {
    flex-shrink: 0;
    padding: 0 20rpx;
    height: 64rpx;
    line-height: 64rpx;
    background: $wm-primary-soft;
    color: $wm-primary;
    border-radius: $wm-radius-md;
    font-size: 24rpx;
    font-weight: 600;

    &--off {
      background: #f1f5f9;
      color: $wm-text-3;
    }
  }

  &__error {
    font-size: 24rpx;
    color: $wm-danger;
    margin-top: 10rpx;
    font-weight: 600;
  }

  &__hint {
    font-size: 24rpx;
    color: $wm-text-3;
    margin-top: 10rpx;
  }
}

.field__ph {
  color: $wm-text-3;
}
</style>
