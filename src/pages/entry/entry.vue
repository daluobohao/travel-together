<template>
  <view class="page entry">
    <view class="entry__box">
      <text class="entry__logo">旅聚</text>
      <text class="entry__tip">{{ tip }}</text>
    </view>
  </view>
</template>

<script>
import { bindReferralCode, isLoggedIn, redirectToLogin } from '@/api'
import { clearPendingInviteCode, parseInviteFromQuery, savePendingInviteCode } from '@/utils/referralInv'

export default {
  data() {
    return { tip: '正在进入…' }
  },
  async onLoad(options) {
    const inv = parseInviteFromQuery(options)
    if (inv) savePendingInviteCode(inv)
    if (isLoggedIn()) {
      const code = inv || ''
      if (code) {
        try {
          await bindReferralCode(code)
          clearPendingInviteCode()
          this.tip = '邀请已绑定，欢迎加入旅聚'
        } catch (e) {
          this.tip = e?.message || '进入首页'
        }
      }
      setTimeout(() => {
        uni.switchTab({ url: '/pages/home/home' })
      }, 600)
      return
    }
    this.tip = inv ? '即将登录并绑定邀请' : '即将进入旅聚'
    setTimeout(() => {
      redirectToLogin('/pages/home/home')
    }, 500)
  },
}
</script>

<style lang="scss" scoped>
.entry {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  &__box {
    text-align: center;
    padding: 48rpx;
  }
  &__logo {
    display: block;
    font-size: 56rpx;
    font-weight: 800;
    background: $wm-gradient-hero;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  &__tip {
    display: block;
    margin-top: 24rpx;
    font-size: 28rpx;
    color: $wm-text-3;
  }
}
</style>
