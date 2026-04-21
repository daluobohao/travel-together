<template>
  <view class="page login">
    <view class="login__header">
      <text class="login__title">手机号登录</text>
      <text class="login__subtitle">登录后即可查看活动并发布组局</text>
    </view>

    <view class="login__form">
      <view class="field">
        <text class="field__label">手机号</text>
        <input
          v-model="form.phone"
          class="field__input"
          type="number"
          maxlength="11"
          placeholder="请输入 11 位手机号"
          placeholder-class="field__placeholder"
        />
      </view>

      <view class="field">
        <text class="field__label">验证码</text>
        <view class="field__row">
          <input
            v-model="form.code"
            class="field__input field__input--code"
            type="number"
            maxlength="6"
            placeholder="请输入验证码"
            placeholder-class="field__placeholder"
          />
          <view class="field__sms-btn" :class="{ 'field__sms-btn--disabled': smsDisabled }" @click="onSendSms">
            <text>{{ smsText }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="login__action">
      <view class="login__btn" @click="onLogin">
        <text>登录</text>
      </view>
    </view>
  </view>
</template>

<script>
import { loginBySms, sendSmsCode, setAccessToken } from '@/api'

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
    }
  },
  computed: {
    smsDisabled() {
      return this.countdown > 0 || !PHONE_REG.test(this.form.phone)
    },
    smsText() {
      return this.countdown > 0 ? `${this.countdown}s后重试` : '发送验证码'
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
    async onSendSms() {
      if (this.smsDisabled) return
      try {
        const data = await sendSmsCode({ phone: this.form.phone, scene: 'login' })
        this.startCountdown(data?.expireInSeconds || 60)
        uni.showToast({ title: '验证码已发送', icon: 'none' })
      } catch (e) {
        uni.showToast({ title: e?.message || '发送失败', icon: 'none' })
      }
    },
    async onLogin() {
      if (this.loading) return
      if (!PHONE_REG.test(this.form.phone)) {
        uni.showToast({ title: '请输入正确手机号', icon: 'none' })
        return
      }
      if (!/^\d{4,6}$/.test(this.form.code)) {
        uni.showToast({ title: '请输入验证码', icon: 'none' })
        return
      }
      this.loading = true
      try {
        const data = await loginBySms({ phone: this.form.phone, code: this.form.code })
        if (data?.accessToken) setAccessToken(data.accessToken)
        uni.showToast({ title: '登录成功', icon: 'success' })
        setTimeout(() => {
          uni.reLaunch({ url: '/pages/home/home' })
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
  }

  &__action {
    margin-top: 40rpx;
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
    box-shadow: 0 12rpx 28rpx rgba(99, 102, 241, 0.4);
  }
}

.field {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 24rpx 28rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  box-shadow: 0 2rpx 10rpx rgba(15, 23, 42, 0.03);

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

    &--disabled {
      background: #f1f5f9;
      color: #94a3b8;
    }
  }
}
</style>
