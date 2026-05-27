<template>
  <view class="page fb">
    <view class="fb__header">
      <view class="fb__back" @click="goBack">
        <wm-icon name="chevronLeft" :size="36" color="#0f172a" />
      </view>
      <text class="fb__title">意见与建议</text>
      <view class="fb__header-sp" />
    </view>

    <view class="fb__body">
      <view v-if="!loggedIn" class="fb__login-tip" @click="goLogin">
        <text class="fb__login-tip-text">登录后可提交，便于我们跟进</text>
        <text class="fb__login-tip-action">去登录 ›</text>
      </view>

      <view class="fb__intro">
        <text class="fb__intro-text">
          只需填写下方「问题描述」（至少 10 个字）。场景、补充说明、联系方式等均为选填，需要时再展开填写。
        </text>
      </view>

      <view class="fb__card fb__card--main">
        <text class="fb__label">问题描述（必填）</text>
        <textarea
          v-model="description"
          class="fb__textarea"
          maxlength="500"
          placeholder="例如：希望增加某某功能；或某页面打不开、列表为空等"
          placeholder-class="fb__ph"
          :show-confirm-bar="false"
        />
        <text class="fb__counter">{{ description.length }}/500（至少 10 字）</text>
      </view>

      <view class="fb__more-toggle" @click="showMore = !showMore">
        <text>{{ showMore ? '收起选填内容' : '展开选填内容（可不填）' }}</text>
        <text class="fb__more-chev">{{ showMore ? '⌄' : '›' }}</text>
      </view>

      <template v-if="showMore">
        <view class="fb__card">
          <text class="fb__label">相关场景<text class="fb__optional">选填</text></text>
          <text class="fb__hint-inline">不选择时默认记为「一般建议」</text>
          <view class="fb__chips">
            <view
              v-for="s in issueScenes"
              :key="s.id"
              class="fb__chip"
              :class="{ 'fb__chip--on': scene === s.id }"
              @click="scene = s.id"
            >
              <text>{{ s.label }}</text>
            </view>
          </view>
        </view>

        <view class="fb__card">
          <text class="fb__label">补充说明<text class="fb__optional">选填</text></text>
          <textarea
            v-model="expectation"
            class="fb__textarea fb__textarea--short"
            maxlength="500"
            placeholder="可补充你更希望怎样"
            placeholder-class="fb__ph"
            :show-confirm-bar="false"
          />
        </view>

        <view class="fb__card">
          <text class="fb__label">联系方式<text class="fb__optional">选填</text></text>
          <checkbox-group @change="onContactChange">
            <label class="fb__row">
              <checkbox value="yes" :checked="contactWilling" color="#0d9488" />
              <text class="fb__row-text">愿意被联系跟进</text>
            </label>
          </checkbox-group>
          <input
            v-if="contactWilling"
            v-model="contactNote"
            class="fb__input"
            maxlength="160"
            placeholder="微信号 / 邮箱等（选填）"
            placeholder-class="fb__ph"
          />
        </view>
      </template>

      <view class="fb__privacy">
        <text>提交内容仅用于改进产品；请勿填写密码等敏感信息。</text>
      </view>
    </view>

    <view class="fb__footer">
      <view
        class="fb__submit"
        :class="{ 'fb__submit--disabled': !canSubmit || submitting }"
        @click="onSubmit"
      >
        <text>{{ submitting ? '提交中…' : '提交' }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import { isLoggedIn, submitUserFeedback } from '@/api'

const ISSUE_SCENES = [
  { id: 'other', label: '一般建议' },
  { id: 'find_activity', label: '找活动' },
  { id: 'place_search', label: '搜地点' },
  { id: 'login', label: '登录' },
  { id: 'enroll', label: '报名' },
  { id: 'chat', label: '群聊' },
  { id: 'city_hall', label: '城市大群' },
  { id: 'publish', label: '发布' },
  { id: 'profile', label: '我的' },
]

function detectAppVersion() {
  try {
    const acc = typeof uni.getAccountInfoSync === 'function' ? uni.getAccountInfoSync() : null
    const v = acc && acc.miniProgram && acc.miniProgram.version
    return v ? String(v).slice(0, 32) : ''
  } catch {
    return ''
  }
}

function detectPlatform() {
  // #ifdef MP-TOUTIAO
  return 'mp-toutiao'
  // #endif
  // #ifdef H5
  return 'h5'
  // #endif
  return 'mp-weixin'
}

export default {
  components: { WmIcon },
  data() {
    return {
      loggedIn: false,
      showMore: false,
      issueScenes: ISSUE_SCENES,
      scene: 'other',
      description: '',
      expectation: '',
      contactWilling: false,
      contactNote: '',
      submitting: false,
    }
  },
  computed: {
    canSubmit() {
      const n = (this.description || '').trim().length
      return n >= 10 && n <= 500
    },
  },
  onShow() {
    this.loggedIn = isLoggedIn()
  },
  methods: {
    goBack() {
      uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/profile/profile' }) })
    },
    goLogin() {
      uni.navigateTo({ url: '/pages/login/login' })
    },
    onContactChange(e) {
      const v = (e && e.detail && e.detail.value) || []
      this.contactWilling = Array.isArray(v) && v.indexOf('yes') !== -1
    },
    buildFeedbackPayload() {
      const description = (this.description || '').trim()
      let scene = (this.scene || 'other').trim()
      const allowed = new Set(ISSUE_SCENES.map((s) => s.id))
      if (!allowed.has(scene)) scene = 'other'
      return {
        scene,
        description,
        expectation: (this.expectation || '').trim(),
        contactWilling: !!this.contactWilling,
        contactNote: (this.contactNote || '').trim(),
        appVersion: detectAppVersion(),
        platform: detectPlatform(),
      }
    },
    async onSubmit() {
      if (this.submitting) return
      if (!this.canSubmit) {
        uni.showToast({ title: '请至少输入 10 个字', icon: 'none' })
        return
      }
      if (!this.loggedIn) {
        uni.showModal({
          title: '需要登录',
          content: '登录后即可提交。',
          confirmText: '去登录',
          success: (res) => {
            if (res.confirm) this.goLogin()
          },
        })
        return
      }
      this.submitting = true
      try {
        const payload = this.buildFeedbackPayload()
        await submitUserFeedback(payload)
        uni.showModal({
          title: '已收到',
          content: '感谢你的反馈，我们会认真查看。',
          showCancel: false,
          confirmText: '好的',
          success: () => {
            uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/profile/profile' }) })
          },
        })
      } catch (e) {
        const msg = e?.message || '提交失败'
        if (e?.statusCode === 401 || e?.needLogin || e?.isAuthError || String(msg).includes('登录')) {
          uni.showModal({
            title: '需要登录',
            content: '登录后即可提交反馈。',
            confirmText: '去登录',
            success: (res) => {
              if (res.confirm) this.goLogin()
            },
          })
        } else {
          const long = msg.length > 40 ? `${msg.slice(0, 40)}…` : msg
          uni.showToast({ title: long, icon: 'none', duration: 4000 })
        }
      } finally {
        this.submitting = false
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.page.fb {
  min-height: 100vh;
  background: linear-gradient(180deg, #f0f9ff 0%, #ffffff 42%);
  padding-bottom: calc(140rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.fb__header {
  position: sticky;
  top: 0;
  z-index: 20;
  height: calc(96rpx + var(--status-bar-height, 0px) + env(safe-area-inset-top));
  padding: calc(var(--status-bar-height, 0px) + env(safe-area-inset-top)) 24rpx 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: $wm-sticky-header-gradient;
}

.fb__back,
.fb__header-sp {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fb__title {
  font-size: 32rpx;
  font-weight: 600;
  color: #0f172a;
}

.fb__body {
  padding: 20rpx 24rpx 0;
}

.fb__login-tip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  background: #fffbeb;
  border: 1rpx solid #fde68a;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 20rpx;
}

.fb__login-tip-text {
  flex: 1;
  font-size: 24rpx;
  color: #92400e;
}

.fb__login-tip-action {
  font-size: 26rpx;
  font-weight: 600;
  color: #d97706;
}

.fb__intro {
  margin-bottom: 20rpx;
  padding: 0 8rpx;
}

.fb__intro-text {
  font-size: 26rpx;
  color: #475569;
  line-height: 1.6;
}

.fb__card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(15, 23, 42, 0.05);

  &--main {
    border: 2rpx solid rgba(14, 165, 233, 0.25);
  }
}

.fb__label {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 16rpx;
}

.fb__optional {
  margin-left: 8rpx;
  font-size: 22rpx;
  font-weight: 500;
  color: #94a3b8;
}

.fb__hint-inline {
  display: block;
  font-size: 24rpx;
  color: #64748b;
  margin: -8rpx 0 16rpx;
}

.fb__textarea {
  width: 100%;
  height: 280rpx;
  padding: 16rpx 20rpx;
  box-sizing: border-box;
  font-size: 28rpx;
  color: #0f172a;
  background: #f8fafc;
  border-radius: 16rpx;
  border: 1rpx solid #e2e8f0;
  &--short {
    height: 160rpx;
  }
}

.fb__ph {
  color: #94a3b8;
}

.fb__counter {
  display: block;
  text-align: right;
  font-size: 22rpx;
  color: #94a3b8;
  margin-top: 8rpx;
}

.fb__more-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 16rpx;
  margin-bottom: 12rpx;
  font-size: 26rpx;
  color: #4f46e5;
}

.fb__more-chev {
  font-size: 30rpx;
}

.fb__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.fb__chip {
  padding: 12rpx 20rpx;
  border-radius: 999rpx;
  background: #f1f5f9;
  font-size: 24rpx;
  color: #475569;
  &--on {
    background: #dbeafe;
    color: #1d4ed8;
    font-weight: 600;
  }
}

.fb__row {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
}

.fb__row-text {
  font-size: 26rpx;
  color: #334155;
}

.fb__input {
  width: 100%;
  height: 80rpx;
  margin-top: 16rpx;
  padding: 0 20rpx;
  box-sizing: border-box;
  font-size: 28rpx;
  background: #f8fafc;
  border-radius: 16rpx;
  border: 1rpx solid #e2e8f0;
}

.fb__privacy {
  padding: 8rpx 8rpx 24rpx;
  font-size: 22rpx;
  color: #94a3b8;
  line-height: 1.55;
}

.fb__footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 30;
  padding: 16rpx 24rpx calc(24rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.96);
  border-top: 1rpx solid rgba(0, 0, 0, 0.06);
}

.fb__submit {
  height: 92rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  &--disabled {
    opacity: 0.45;
  }
}
</style>
