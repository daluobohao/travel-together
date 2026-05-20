<template>
  <view v-if="visible" class="ppm" @touchmove.stop.prevent="noop">
    <view class="ppm__mask" @click="onCancel" />
    <view class="ppm__panel">
      <text class="ppm__title">支付发布服务费</text>
      <text class="ppm__amount">¥{{ fee }}</text>
      <text class="ppm__desc">微信扫码支付，支付成功后将自动发布活动</text>

      <view v-if="mockMode" class="ppm__mock">
        <text class="ppm__mock-tip">开发 Mock：点击下方按钮模拟支付成功</text>
        <view class="ppm__btn ppm__btn--primary" @click="onMockPay">
          <text>模拟支付成功</text>
        </view>
      </view>

      <view v-else class="ppm__qrcode-wrap">
        <image
          v-if="qrImageUrl"
          class="ppm__qrcode"
          :src="qrImageUrl"
          mode="aspectFit"
        />
        <view v-else class="ppm__qrcode ppm__qrcode--loading">
          <text>生成二维码中…</text>
        </view>
        <text v-if="isMobile" class="ppm__hint">
          手机端可先截图保存二维码，再发送到微信中长按识别完成支付
        </text>
        <text v-else class="ppm__hint">请使用微信扫一扫完成支付</text>
        <text v-if="countdown > 0" class="ppm__countdown">二维码有效倒计时 {{ countdown }} 秒</text>
        <text v-else class="ppm__countdown ppm__countdown--warn">二维码已过期，请刷新</text>
        <view v-if="countdown < 1" class="ppm__btn ppm__btn--ghost" @click="refreshQrcode">
          <text>刷新二维码</text>
        </view>
      </view>

      <view class="ppm__btn ppm__btn--ghost ppm__btn--cancel" @click="onCancel">
        <text>取消</text>
      </view>
    </view>
  </view>
</template>

<script>
import { createPublishQrcode, queryPublishPayState, confirmMockPublishPayment } from '@/api/pay'
import { buildWxPayQrImageUrl } from '@/utils/payQrId'
import { PUBLISH_FEE_YUAN } from '@/pay/constants'

const POLL_INTERVAL_MS = 1000
const COUNTDOWN_START = 100

export default {
  name: 'PublishPayModal',
  props: {
    visible: { type: Boolean, default: false },
    userId: { type: String, default: '' },
    qrId: { type: String, default: '' },
    /** 父级已下单时直接传入 */
    payCodeUrl: { type: String, default: '' },
    mockMode: { type: Boolean, default: false },
  },
  emits: ['update:visible', 'success', 'cancel'],
  data() {
    return {
      fee: PUBLISH_FEE_YUAN,
      payUrl: '',
      qrImageUrl: '',
      countdown: COUNTDOWN_START,
      pollTick: 0,
      loading: false,
      isMobile: false,
    }
  },
  watch: {
    visible(val) {
      if (val) this.onOpen()
      else this.teardown()
    },
  },
  beforeUnmount() {
    this.teardown()
  },
  methods: {
    noop() {},
    syncMobile() {
      try {
        const info = uni.getSystemInfoSync()
        this.isMobile = info.windowWidth < 768
      } catch {
        this.isMobile = false
      }
    },
    async onOpen() {
      this.syncMobile()
      this.countdown = COUNTDOWN_START
      this.pollTick = 0
      this.payUrl = this.payCodeUrl || ''
      this.qrImageUrl = buildWxPayQrImageUrl(this.payUrl)
      this.startTimers()

      if (this.mockMode) return

      if (!this.payUrl && this.qrId) {
        await this.refreshQrcode()
      }
    },
    teardown() {
      if (this._countdownTimer) {
        clearInterval(this._countdownTimer)
        this._countdownTimer = null
      }
      if (this._pollTimer) {
        clearInterval(this._pollTimer)
        this._pollTimer = null
      }
    },
    startTimers() {
      this.teardown()
      this._countdownTimer = setInterval(() => {
        if (this.countdown > 0) this.countdown--
      }, 1000)
      this._pollTimer = setInterval(() => {
        this.pollTick++
        if (this.mockMode) return
        if (this.countdown < 1) return
        if (this.pollTick % 3 !== 0) return
        this.checkPaid()
      }, POLL_INTERVAL_MS)
    },
    async refreshQrcode() {
      if (!this.qrId || !this.userId || this.loading) return
      this.loading = true
      try {
        const order = await createPublishQrcode({ userId: this.userId, qrId: this.qrId })
        this.payUrl = order?.payCodeUrl || ''
        this.qrImageUrl = buildWxPayQrImageUrl(this.payUrl)
        this.countdown = COUNTDOWN_START
        this.pollTick = 0
      } catch (e) {
        uni.showToast({ title: e?.message || '获取支付码失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    async checkPaid() {
      if (!this.userId || !this.qrId) return
      try {
        const state = await queryPublishPayState({ userId: this.userId, qrId: this.qrId })
        if (state?.paid) this.finishSuccess()
      } catch {
        // 轮询失败不打断用户扫码
      }
    },
    async onMockPay() {
      try {
        await confirmMockPublishPayment(this.qrId, this.userId)
        this.finishSuccess()
      } catch (e) {
        uni.showToast({ title: e?.message || '模拟支付失败', icon: 'none' })
      }
    },
    finishSuccess() {
      this.teardown()
      this.$emit('update:visible', false)
      this.$emit('success')
    },
    onCancel() {
      this.teardown()
      this.$emit('update:visible', false)
      this.$emit('cancel')
    },
  },
}
</script>

<style lang="scss" scoped>
.ppm {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx;

  &__mask {
    position: absolute;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
  }

  &__panel {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 640rpx;
    background: #ffffff;
    border-radius: $wm-radius-xl;
    padding: 40rpx 36rpx 32rpx;
    box-shadow: $wm-shadow-lg;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16rpx;
  }

  &__title {
    font-size: 34rpx;
    font-weight: 800;
    color: $wm-text-1;
  }

  &__amount {
    font-size: 48rpx;
    font-weight: 800;
    color: $wm-primary;
  }

  &__desc {
    font-size: 24rpx;
    color: $wm-text-3;
    text-align: center;
    line-height: 1.5;
  }

  &__qrcode-wrap {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16rpx;
    margin: 12rpx 0 8rpx;
  }

  &__qrcode {
    width: 400rpx;
    height: 400rpx;
    border-radius: $wm-radius-md;
    background: #fafafa;
    border: $wm-card-edge;

    &--loading {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26rpx;
      color: $wm-text-3;
    }
  }

  &__hint {
    font-size: 24rpx;
    color: $wm-text-2;
    text-align: center;
    line-height: 1.5;
    padding: 0 8rpx;
  }

  &__countdown {
    font-size: 24rpx;
    color: $wm-text-3;

    &--warn {
      color: #d97706;
    }
  }

  &__mock {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20rpx;
    padding: 24rpx 0;
  }

  &__mock-tip {
    font-size: 26rpx;
    color: $wm-text-2;
    text-align: center;
  }

  &__btn {
    width: 100%;
    height: 88rpx;
    border-radius: $wm-radius-lg;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 30rpx;
    font-weight: 700;

    &--primary {
      background: $wm-gradient-primary;
      color: #ffffff;
    }

    &--ghost {
      background: #f8fafc;
      color: $wm-text-2;
      border: 2rpx solid rgba(148, 163, 184, 0.35);
    }

    &--cancel {
      margin-top: 8rpx;
    }
  }
}
</style>
