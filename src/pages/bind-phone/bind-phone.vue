<template>
  <view class="page bind-phone">
    <view class="bind-phone__header">
      <view class="bind-phone__back" @click="goBack">
        <wm-icon name="chevronLeft" :size="34" color="#0f172a" />
      </view>
      <text class="bind-phone__title">绑定手机号</text>
      <view class="bind-phone__placeholder" />
    </view>

    <!-- #ifdef MP-WEIXIN -->
    <text class="bind-phone__desc">
      绑定后可用于账号找回，并与此前手机号注册的数据合并。
    </text>
    <!-- #endif -->

    <!-- #ifdef MP-WEIXIN -->
    <button
      class="bind-phone__wx-btn"
      open-type="getPhoneNumber"
      :loading="wechatLoading"
      :disabled="wechatLoading || smsLoading"
      @getphonenumber="onGetPhoneNumber"
    >
      微信授权手机号
    </button>
    <!-- #endif -->

    <!-- #ifdef MP-TOUTIAO -->
    <text class="bind-phone__desc bind-phone__desc--sms">
      使用短信验证码绑定手机号（抖音小程序暂不支持授权一键取号）。
    </text>
    <!-- #endif -->

    <!-- #ifdef MP-WEIXIN -->
    <view class="bind-phone__divider">
      <view class="bind-phone__line" />
      <text>或短信验证</text>
      <view class="bind-phone__line" />
    </view>
    <!-- #endif -->

    <view class="field">
      <text class="field__label">手机号</text>
      <input
        v-model="form.phone"
        class="field__input"
        type="number"
        maxlength="11"
        placeholder="11 位手机号"
        placeholder-class="field__ph"
      />
    </view>

    <view class="field">
      <text class="field__label">验证码</text>
      <view class="field__row">
        <input
          v-model="form.code"
          class="field__input"
          type="number"
          maxlength="6"
          placeholder="验证码"
          placeholder-class="field__ph"
        />
        <view class="field__sms" :class="{ 'field__sms--off': smsDisabled }" @click="onSendSms">
          <text>{{ smsText }}</text>
        </view>
      </view>
    </view>

    <view class="bind-phone__submit" @click="onBindSms">
      <text>{{ smsLoading ? '提交中…' : '确认绑定' }}</text>
    </view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import {
  bindPhoneSms,
  bindPhoneWechat,
  getAccessToken,
  isLoggedIn,
  sendSmsCode,
  setAccessToken,
  setRefreshToken,
} from '@/api'
import { mapBindPhoneErrorMessage, parseGetPhoneNumberEvent } from '@/utils/wechatPhoneAuth'
const PHONE_REG = /^1\d{10}$/

export default {
  components: { WmIcon },
  data() {
    return {
      form: { phone: '', code: '' },
      wechatLoading: false,
      smsLoading: false,
      countdown: 0,
      timer: null,
      sendingSms: false,
    }
  },
  computed: {
    smsDisabled() {
      return this.countdown > 0 || !PHONE_REG.test(this.form.phone) || this.sendingSms
    },
    smsText() {
      if (this.sendingSms) return '发送中…'
      return this.countdown > 0 ? `${this.countdown}s` : '获取验证码'
    },
  },
  onShow() {
    if (!isLoggedIn()) {
      uni.showToast({ title: '请先登录', icon: 'none' })
      setTimeout(() => {
        uni.navigateTo({ url: '/pages/login/login' })
      }, 400)
    }
  },
  onUnload() {
    if (this.timer) clearInterval(this.timer)
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    applyBindResult(data) {
      if (data?.merged) {
        if (data.accessToken) setAccessToken(data.accessToken)
        if (data.refreshToken) setRefreshToken(data.refreshToken)
      }
      uni.showToast({ title: data?.merged ? '已合并账号' : '绑定成功', icon: 'success' })
      setTimeout(() => uni.navigateBack(), 500)
    },
    async onGetPhoneNumber(e) {
      if (this.wechatLoading) return
      if (!getAccessToken()) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        uni.navigateTo({ url: '/pages/login/login' })
        return
      }

      const parsed = parseGetPhoneNumberEvent(e)
      if (!parsed.ok) {
        if (parsed.message) {
          uni.showToast({ title: parsed.message, icon: 'none', duration: 2800 })
        }
        return
      }

      this.wechatLoading = true
      try {
        const data = await bindPhoneWechat({ phoneCode: parsed.phoneCode })
        this.applyBindResult(data)
      } catch (err) {
        const tip = mapBindPhoneErrorMessage(err)
        uni.showToast({ title: tip, icon: 'none', duration: 2800 })
        if (err?.isAuthError || err?.statusCode === 401) {
          setTimeout(() => uni.navigateTo({ url: '/pages/login/login' }), 800)
        }
      } finally {
        this.wechatLoading = false
      }
    },
    startCountdown() {
      if (this.timer) clearInterval(this.timer)
      this.countdown = 60
      this.timer = setInterval(() => {
        this.countdown -= 1
        if (this.countdown <= 0) {
          this.countdown = 0
          clearInterval(this.timer)
          this.timer = null
        }
      }, 1000)
    },
    async onSendSms() {
      if (this.smsDisabled) return
      if (!PHONE_REG.test(this.form.phone)) {
        uni.showToast({ title: '请输入正确手机号', icon: 'none' })
        return
      }
      this.sendingSms = true
      try {
        await sendSmsCode({ phone: this.form.phone, scene: 'bind_phone' })
        this.startCountdown()
        uni.showToast({ title: '验证码已发送', icon: 'none' })
      } catch (err) {
        uni.showToast({ title: err?.message || '发送失败', icon: 'none' })
      } finally {
        this.sendingSms = false
      }
    },
    async onBindSms() {
      if (this.smsLoading || this.wechatLoading) return
      if (!PHONE_REG.test(this.form.phone) || !/^\d{4,6}$/.test(this.form.code)) {
        uni.showToast({ title: '请填写手机号和验证码', icon: 'none' })
        return
      }
      this.smsLoading = true
      try {
        const data = await bindPhoneSms({ phone: this.form.phone, code: this.form.code })
        this.applyBindResult(data)
      } catch (err) {
        uni.showToast({ title: err?.message || '绑定失败', icon: 'none' })
      } finally {
        this.smsLoading = false
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.bind-phone {
  min-height: 100vh;
  padding: calc(24rpx + var(--status-bar-height, 0px) + env(safe-area-inset-top)) 32rpx 48rpx;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 32rpx;
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
    margin-bottom: 40rpx;
  }

  &__wx-btn {
    width: 100%;
    height: 96rpx;
    line-height: 96rpx;
    background: #07c160;
    color: #fff;
    font-size: 30rpx;
    font-weight: 700;
    border-radius: $wm-radius-xl;
    border: none;
    margin-bottom: 32rpx;
  }

  &__divider {
    display: flex;
    align-items: center;
    gap: 16rpx;
    margin: 24rpx 0 32rpx;
    font-size: 24rpx;
    color: $wm-text-3;
  }

  &__line {
    flex: 1;
    height: 2rpx;
    background: #e2e8f0;
  }

  &__submit {
    margin-top: 40rpx;
    height: 96rpx;
    border-radius: $wm-radius-xl;
    background: $wm-gradient-primary;
    color: #fff;
    font-size: 30rpx;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.field {
  background: #fff;
  border-radius: $wm-radius-lg;
  padding: 24rpx;
  margin-bottom: 20rpx;
  border: $wm-card-edge;
  box-shadow: $wm-shadow-sm;

  &__label {
    font-size: 26rpx;
    color: $wm-text-2;
    font-weight: 600;
    margin-bottom: 12rpx;
    display: block;
  }

  &__input {
    font-size: 30rpx;
    color: $wm-text-1;
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
}

.field__ph {
  color: $wm-text-3;
}
</style>
