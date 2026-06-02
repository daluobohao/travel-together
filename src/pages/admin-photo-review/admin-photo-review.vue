<template>
  <view class="page sub">
    <view class="sub__state"><text>正在打开审核页…</text></view>
  </view>
</template>

<script>
/** 兼容旧路径：跳转到已编入包的 trust 页审核模式 */
export default {
  onLoad() {
    uni.redirectTo({
      url: '/pages/trust/trust?mode=adminReview',
      fail: () => {
        uni.showToast({ title: '请重新编译小程序后重试', icon: 'none' })
      },
    })
  },
}
</script>

<style lang="scss" scoped>
@import '@/styles/sub-page.scss';
</style>
