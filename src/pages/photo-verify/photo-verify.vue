<template>
  <view class="page sub">
    <view class="sub__header">
      <view class="sub__back" @click="goBack"><wm-icon name="chevronLeft" :size="36" color="#0f172a" /></view>
      <text class="sub__title">照片验证</text>
      <view class="sub__sp" />
    </view>

    <view class="sub__body">
      <view class="panel">
        <text class="panel__label">为什么验证？</text>
        <text class="panel__hint">现场自拍与头像比对，通过后在资料页展示「照片已验证」，报名与邀请奖励更可信。</text>
      </view>

      <view v-if="status === 'approved'" class="panel ok-panel">
        <wm-icon name="check" :size="48" color="#059669" />
        <text class="ok-panel__text">照片验证已通过</text>
      </view>
      <view v-else-if="status === 'pending'" class="panel pending-panel">
        <text>审核中，通常 24 小时内出结果</text>
        <!-- #ifdef H5 -->
        <view class="dev-btn" @click="devApprove">开发：模拟通过</view>
        <!-- #endif -->
      </view>
      <view v-else-if="status === 'rejected'" class="panel reject-panel">
        <text>未通过：{{ rejectReason || '请重新拍摄' }}</text>
      </view>

      <view v-if="status !== 'approved' && status !== 'pending'" class="actions">
        <view
          class="wm-btn wm-btn--primary actions__btn"
          :class="{ 'wm-btn--disabled': submitting }"
          @click="takeSelfie"
        >
          {{ submitting ? '上传中…' : '现场自拍并提交' }}
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import {
  devApprovePhotoVerification,
  getPhotoVerification,
  submitPhotoVerification,
  uploadPhotoVerificationSelfie,
} from '@/api'

export default {
  components: { WmIcon },
  data() {
    return { status: null, rejectReason: '', submitting: false }
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    async load() {
      try {
        const d = await getPhotoVerification()
        this.status = d?.status
        this.rejectReason = d?.rejectReason || ''
      } catch (_) {
        /* ignore */
      }
    },
    takeSelfie() {
      if (this.submitting) return
      uni.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['camera'],
        success: async (res) => {
          const path = res.tempFiles?.[0]?.tempFilePath
          if (!path) return
          this.submitting = true
          uni.showLoading({ title: '上传中', mask: true })
          try {
            const uploaded = await uploadPhotoVerificationSelfie(path)
            const selfieUrl = uploaded?.selfieUrl
            if (!selfieUrl) {
              throw new Error('上传失败')
            }
            await submitPhotoVerification({ selfieUrl })
            this.status = 'pending'
            this.rejectReason = ''
            uni.showToast({ title: '已提交审核', icon: 'success' })
          } catch (e) {
            uni.showToast({ title: e?.message || '提交失败', icon: 'none' })
          } finally {
            this.submitting = false
            uni.hideLoading()
          }
        },
        fail: () => {
          uni.showToast({ title: '需要相机权限', icon: 'none' })
        },
      })
    },
    async devApprove() {
      await devApprovePhotoVerification()
      this.status = 'approved'
      uni.showToast({ title: '已通过', icon: 'success' })
    },
  },
  onShow() {
    this.load()
  },
}
</script>

<style lang="scss" scoped>
@import '@/styles/sub-page.scss';
.ok-panel,
.pending-panel,
.reject-panel {
  text-align: center;
  padding: 48rpx 32rpx;
  font-size: 28rpx;
}
.reject-panel {
  color: $wm-danger;
}
.dev-btn {
  margin-top: 24rpx;
  color: $wm-primary;
  font-size: 24rpx;
}
.actions {
  margin-top: 32rpx;
  &__btn {
    width: 100%;
  }
}
</style>
