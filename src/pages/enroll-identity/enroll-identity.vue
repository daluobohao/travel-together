<template>
  <view class="page enroll-identity">
    <view class="enroll-identity__header">
      <view class="enroll-identity__back" @click="goBack">
        <wm-icon name="chevronLeft" :size="34" color="#0f172a" />
      </view>
      <text class="enroll-identity__title">{{ pageTitle }}</text>
      <view class="enroll-identity__header-spacer" />
    </view>

    <view class="enroll-identity__content">
      <view v-if="activityTitle" class="hint-card">
        <text class="hint-card__title">{{ activityTitle }}</text>
        <text class="hint-card__desc">请确认本人报名信息，不支持代他人报名</text>
      </view>

      <view class="field-card">
        <text class="field-card__label">姓名</text>
        <input
          v-model="form.participantName"
          class="field-card__input"
          placeholder="与身份证一致的姓名"
          placeholder-class="field-card__placeholder"
          maxlength="32"
        />
      </view>

      <view class="field-card">
        <text class="field-card__label">身份证号</text>
        <input
          v-model="form.idCardNumber"
          class="field-card__input"
          placeholder="18 位身份证号码"
          placeholder-class="field-card__placeholder"
          maxlength="18"
        />
      </view>

      <view class="field-card field-card--readonly">
        <text class="field-card__label">手机号</text>
        <text class="field-card__readonly">{{ phoneDisplay }}</text>
        <text class="field-card__hint">使用账号绑定手机号，如需修改请前往账号设置</text>
      </view>

      <view v-if="mode === 'edit'" class="tip-card">
        <text>活动开始前可修改姓名与身份证；活动开始后不可再改。</text>
      </view>
    </view>

    <view class="enroll-identity__footer">
      <view
        class="enroll-identity__submit-btn"
        :class="{ 'enroll-identity__submit-btn--disabled': submitting }"
        @click="onSubmit"
      >
        <text>{{ submitText }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import {
  enrollActivity,
  getActivityDetail,
  getEnrollmentIdentityPrefill,
  getMe,
  updateEnrollmentIdentity,
} from '@/api'
import { ensurePhoneBound, PHONE_GATE_REASON } from '@/utils/phoneGate'

export default {
  components: { WmIcon },
  data() {
    return {
      activityId: '',
      mode: 'enroll',
      activityTitle: '',
      form: {
        participantName: '',
        idCardNumber: '',
      },
      phoneMasked: '',
      submitting: false,
    }
  },
  computed: {
    pageTitle() {
      return this.mode === 'edit' ? '修改报名信息' : '确认本人报名信息'
    },
    submitText() {
      return this.submitting ? '提交中…' : this.mode === 'edit' ? '保存' : '确认报名'
    },
    phoneDisplay() {
      return this.phoneMasked || '未绑定'
    },
  },
  onLoad(query) {
    const opts = query || {}
    this.activityId = opts.id ? String(opts.id) : ''
    this.mode = opts.mode === 'edit' ? 'edit' : 'enroll'
    this.bootstrap()
  },
  methods: {
    goBack() {
      uni.navigateBack({
        fail: () => {
          uni.redirectTo({
            url: this.activityId
              ? `/pages/activity-detail/activity-detail?id=${encodeURIComponent(this.activityId)}`
              : '/pages/home/home',
          })
        },
      })
    },
    async bootstrap() {
      if (!this.activityId) {
        uni.showToast({ title: '活动无效', icon: 'none' })
        setTimeout(() => this.goBack(), 400)
        return
      }
      const back = `/pages/enroll-identity/enroll-identity?id=${encodeURIComponent(this.activityId)}&mode=${this.mode}`
      const phoneOk = await ensurePhoneBound({
        redirectPath: back,
        reason: PHONE_GATE_REASON.ENROLL,
      })
      if (!phoneOk) return
      try {
        const [detail, prefill, me] = await Promise.all([
          getActivityDetail(this.activityId),
          getEnrollmentIdentityPrefill(),
          getMe(),
        ])
        this.activityTitle = detail?.title || ''
        this.phoneMasked = prefill?.phoneMasked || me?.phoneMasked || ''
        const defaultName = (prefill?.participantName || '').trim()
        if (this.mode === 'edit' && detail?.myEnrollment?.identity) {
          const idt = detail.myEnrollment.identity
          this.form.participantName = idt.participantName || defaultName
          this.form.idCardNumber = prefill?.idCardNumber || ''
        } else {
          this.form.participantName = defaultName
          this.form.idCardNumber = prefill?.idCardNumber || ''
        }
      } catch (e) {
        uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
      }
    },
    validateForm() {
      const name = (this.form.participantName || '').trim()
      const idCard = (this.form.idCardNumber || '').trim().toUpperCase()
      if (name.length < 2) {
        uni.showToast({ title: '请填写姓名（2～32 字）', icon: 'none' })
        return null
      }
      if (!/^\d{17}[\dX]$/.test(idCard)) {
        uni.showToast({ title: '请填写 18 位身份证号', icon: 'none' })
        return null
      }
      return { participantName: name, idCardNumber: idCard }
    },
    async onSubmit() {
      if (this.submitting) return
      const payload = this.validateForm()
      if (!payload) return
      this.submitting = true
      try {
        if (this.mode === 'edit') {
          await updateEnrollmentIdentity(this.activityId, payload)
          uni.showToast({ title: '已保存', icon: 'success' })
        } else {
          await enrollActivity(this.activityId, payload)
          uni.showToast({ title: '报名成功', icon: 'success' })
        }
        setTimeout(() => this.goBack(), 500)
      } catch (e) {
        uni.showToast({ title: e?.message || '提交失败', icon: 'none' })
      } finally {
        this.submitting = false
      }
    },
  },
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f8fafc;
  padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
}

.enroll-identity__header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(24rpx + var(--status-bar-height, 0px) + env(safe-area-inset-top)) 32rpx 24rpx;
  background: #fff;
  border-bottom: 1rpx solid #e2e8f0;
}

.enroll-identity__back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.enroll-identity__title {
  flex: 1;
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  color: #0f172a;
  padding: 0 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.enroll-identity__header-spacer {
  width: 64rpx;
  flex-shrink: 0;
}

.enroll-identity__content {
  padding: 24rpx 32rpx 48rpx;
}

.enroll-identity__footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.96);
  border-top: 1rpx solid #e2e8f0;
  box-shadow: 0 -8rpx 32rpx rgba(15, 23, 42, 0.06);
}

.enroll-identity__submit-btn {
  width: 100%;
  height: 96rpx;
  border-radius: 48rpx;
  background: linear-gradient(135deg, #818cf8 0%, #6366f1 100%);
  color: #fff;
  font-size: 32rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.enroll-identity__submit-btn--disabled {
  opacity: 0.65;
}

.enroll-identity__submit-btn:active {
  opacity: 0.88;
}

.hint-card {
  background: #eef2ff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.hint-card__title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #312e81;
  margin-bottom: 8rpx;
}

.hint-card__desc {
  font-size: 24rpx;
  color: #4338ca;
  line-height: 1.5;
}

.field-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.field-card__label {
  display: block;
  font-size: 26rpx;
  color: #64748b;
  margin-bottom: 12rpx;
}

.field-card__input {
  font-size: 30rpx;
  color: #0f172a;
  height: 72rpx;
}

.field-card__placeholder {
  color: #cbd5e1;
}

.field-card__readonly {
  font-size: 30rpx;
  color: #0f172a;
}

.field-card__hint {
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #94a3b8;
  line-height: 1.5;
}

.tip-card {
  font-size: 24rpx;
  color: #64748b;
  line-height: 1.6;
  padding: 8rpx 4rpx;
}
</style>
