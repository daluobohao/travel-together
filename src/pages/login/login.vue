<template>
  <view class="page login">
    <view class="login__header">
      <text class="login__title">手机号登录</text>
      <text class="login__subtitle">登录后即可查看活动并发布组局</text>
    </view>

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
        <text v-else>{{ loading ? '登录中...' : '登录' }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { loginBySms, sendSmsCode, setAccessToken, setRefreshToken } from '@/api'

const PHONE_REG = /^1\d{10}$/

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
      /** 当前手机号是否已成功走通一次发码（避免未写入 Redis 就点登录导致 400） */
      smsSentOk: false,
      sendingSms: false,
      /** 登录防抖时间戳 */
      lastLoginTapAt: 0,
      phoneError: '',
      codeError: '',
    }
  },
  computed: {
    smsDisabled() {
      return this.countdown > 0 || !PHONE_REG.test(this.form.phone) || this.sendingSms
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
        this.smsSentOk
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
  methods: {
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
      if (this.phoneError) {
        this.phoneError = ''
      }
      this.smsSentOk = false
    },
    onCodeInput() {
      if (this.codeError) {
        this.codeError = ''
      }
    },
    async onSendSms() {
      if (this.smsDisabled) return
      this.sendingSms = true
      try {
        const data = await sendSmsCode({ phone: this.form.phone, scene: 'login' })
        this.smsSentOk = true
        this.startCountdown(data?.expireInSeconds || 60)
        uni.showToast({ title: '验证码已发送', icon: 'none' })
      } catch (e) {
        this.smsSentOk = false
        uni.showToast({ title: e?.message || '发送失败', icon: 'none' })
      } finally {
        this.sendingSms = false
      }
    },
    async onLogin() {
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
        if (data?.accessToken) setAccessToken(data.accessToken)
        if (data?.refreshToken) setRefreshToken(data.refreshToken)
        const oc = data?.user?.onboardingCompletedAt
        const needGender =
          data?.user != null && (data.user.gender === null || data.user.gender === undefined)
        uni.showToast({ title: '登录成功', icon: 'success' })
        setTimeout(() => {
          if (!oc) {
            uni.reLaunch({ url: '/pages/onboarding/onboarding' })
          } else if (needGender) {
            uni.reLaunch({ url: '/pages/profile-edit/profile-edit?first=1' })
          } else {
            uni.reLaunch({ url: '/pages/home/home' })
          }
        }, 400)
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
  padding: calc(48rpx + var(--status-bar-height, 0px) + env(safe-area-inset-top)) 36rpx 40rpx;
  background: #f3f4f6;

  &__header {
    margin-bottom: 40rpx;
    display: flex;
    flex-direction: column;
    gap: 12rpx;
    animation: fadeInDown 0.5s ease-out;
  }

  &__title {
    font-size: 56rpx;
    font-weight: 700;
    color: #0f172a;
  }

  &__subtitle {
    font-size: 24rpx;
    color: #94a3b8;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 20rpx;
    animation: fadeInUp 0.5s ease-out 0.1s both;
  }

  &__hint {
    font-size: 22rpx;
    color: #f59e0b;
    line-height: 1.4;
    padding: 0 8rpx;
  }

  &__action {
    margin-top: 40rpx;
    animation: fadeInUp 0.5s ease-out 0.2s both;
  }

  &__btn {
    height: 92rpx;
    border-radius: 24rpx;
    background: linear-gradient(135deg, #818cf8, #6366f1 60%, #4f46e5);
    color: #ffffff;
    font-size: 30rpx;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12rpx;
    box-shadow: 0 12rpx 28rpx rgba(99, 102, 241, 0.4);
    transition: transform 0.15s, box-shadow 0.15s, opacity 0.2s;

    &--hover {
      transform: scale(0.98);
      box-shadow: 0 8rpx 20rpx rgba(99, 102, 241, 0.3);
    }

    &--disabled {
      background: #e2e8f0;
      color: #94a3b8;
      box-shadow: none;
    }

    &--loading {
      opacity: 0.8;
    }
  }
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
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

.btn-spinner {
  width: 36rpx;
  height: 36rpx;
  border: 3rpx solid rgba(255, 255, 255, 0.3);
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
  border-radius: 20rpx;
  padding: 24rpx 28rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  box-shadow: 0 2rpx 10rpx rgba(15, 23, 42, 0.03);
  border: 2rpx solid transparent;
  transition: border-color 0.2s, box-shadow 0.2s;

  &--error {
    border-color: #ef4444;
    animation: shake 0.4s ease-in-out;
  }

  &__label {
    font-size: 26rpx;
    color: #475569;
    font-weight: 600;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 16rpx;
  }

  &__input {
    flex: 1;
    font-size: 30rpx;
    color: #0f172a;
    padding: 8rpx 0;
    border: none;
    background: transparent;

    &--code {
      min-width: 0;
    }
  }

  &__placeholder {
    color: #cbd5e1;
  }

  &__sms-btn {
    min-width: 190rpx;
    height: 66rpx;
    border-radius: 999rpx;
    padding: 0 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #eef2ff;
    color: #4f46e5;
    font-size: 24rpx;
    font-weight: 600;
    transition: background-color 0.2s, color 0.2s, transform 0.1s;

    &:active {
      transform: scale(0.95);
    }

    &--disabled {
      background: #f1f5f9;
      color: #94a3b8;
    }
  }

  &__error {
    font-size: 22rpx;
    color: #ef4444;
    margin-top: 4rpx;
  }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8rpx); }
  40% { transform: translateX(8rpx); }
  60% { transform: translateX(-8rpx); }
  80% { transform: translateX(8rpx); }
}
</style>
