<template>
  <view class="page fb">
    <view class="fb__header">
      <view class="fb__back" @click="goBack">
        <wm-icon name="chevronLeft" :size="36" color="#0f172a" />
      </view>
      <text class="fb__title">意见与建议</text>
      <view class="fb__header-sp" />
    </view>

    <scroll-view class="fb__scroll" scroll-y>
      <view class="fb__intro">
        <text class="fb__intro-title">旅聚还在早期</text>
        <text class="fb__intro-text">
          很多体验我们知道还不够好。你写下的内容会直接给产品与开发看，用来排优先级。我们暂时不能每条都单独电话回复，但会认真读；若你愿意留下联系方式，我们会在需要澄清时主动联系（一般在几个工作日内）。
        </text>
      </view>

      <view class="fb__card">
        <text class="fb__label">你在做什么时遇到问题？</text>
        <view class="fb__chips">
          <view
            v-for="s in scenes"
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
        <text class="fb__label">一句话描述（必填，10～500 字）</text>
        <textarea
          v-model="description"
          class="fb__textarea"
          maxlength="500"
          placeholder="例如：搜枣庄有活动但列表是空的；或登录后头像不显示"
          placeholder-class="fb__ph"
          :show-confirm-bar="false"
        />
        <text class="fb__counter">{{ description.length }}/500</text>
      </view>

      <view class="fb__card">
        <text class="fb__label">你更希望怎样？（选填）</text>
        <textarea
          v-model="expectation"
          class="fb__textarea fb__textarea--short"
          maxlength="500"
          placeholder="例如：希望列表和地图能对上；或希望增加某某入口"
          placeholder-class="fb__ph"
          :show-confirm-bar="false"
        />
      </view>

      <view class="fb__card">
        <checkbox-group @change="onContactChange">
          <label class="fb__row">
            <checkbox value="yes" :checked="contactWilling" color="#0d9488" />
            <text class="fb__row-text">我愿意被联系，跟进这条反馈</text>
          </label>
        </checkbox-group>
        <text v-if="contactWilling" class="fb__hint">
          可填写微信号、邮箱或备注「用注册手机号联系」等（勿填支付密码等敏感信息）。
        </text>
        <input
          v-if="contactWilling"
          v-model="contactNote"
          class="fb__input"
          maxlength="160"
          placeholder="选填，最多 160 字"
          placeholder-class="fb__ph"
        />
      </view>

      <view class="fb__privacy">
        <text>
          你提交的内容仅用于改进产品与必要时联系你本人；请勿在描述中附带他人隐私或违法违规信息。
        </text>
      </view>
      <view class="fb__spacer" />
    </scroll-view>

    <view class="fb__footer">
      <view
        class="fb__submit"
        :class="{ 'fb__submit--disabled': !canSubmit || submitting }"
        @click="onSubmit"
      >
        <text>{{ submitting ? '提交中…' : '提交反馈' }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import { submitUserFeedback } from '@/api'

const SCENES = [
  { id: 'find_activity', label: '找活动 / 浏览' },
  { id: 'place_search', label: '搜地点找活动' },
  { id: 'login', label: '登录 / 验证码' },
  { id: 'enroll', label: '报名 / 取消报名' },
  { id: 'chat', label: '群聊 / 消息' },
  { id: 'city_hall', label: '城市大群' },
  { id: 'publish', label: '发布活动' },
  { id: 'profile', label: '我的 / 资料' },
  { id: 'other', label: '其他' },
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

export default {
  components: { WmIcon },
  data() {
    return {
      scenes: SCENES,
      scene: 'find_activity',
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
  methods: {
    goBack() {
      uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/profile/profile' }) })
    },
    onContactChange(e) {
      const v = (e && e.detail && e.detail.value) || []
      this.contactWilling = Array.isArray(v) && v.indexOf('yes') !== -1
    },
    async onSubmit() {
      if (this.submitting) return
      if (!this.canSubmit) {
        uni.showToast({ title: '请至少输入 10 个字的描述', icon: 'none' })
        return
      }
      this.submitting = true
      try {
        await submitUserFeedback({
          scene: this.scene,
          description: (this.description || '').trim(),
          expectation: (this.expectation || '').trim(),
          contactWilling: !!this.contactWilling,
          contactNote: (this.contactNote || '').trim(),
          appVersion: detectAppVersion(),
          platform: 'mp-weixin',
        })
        uni.showModal({
          title: '已收到',
          content:
            '感谢你愿意花时间写下来。我们会在几个工作日内查看；若你勾选了「愿意被联系」，需要时我们会通过你留下的方式与你沟通。',
          showCancel: false,
          confirmText: '好的',
          success: () => {
            uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/profile/profile' }) })
          },
        })
      } catch (e) {
        const msg = e?.message || '提交失败'
        if (e?.statusCode === 401 || String(msg).includes('登录')) {
          uni.showModal({
            title: '需要登录',
            content: '登录后即可提交反馈。',
            confirmText: '去登录',
            success: (res) => {
              if (res.confirm) uni.navigateTo({ url: '/pages/login/login' })
            },
          })
        } else {
          const long = msg.length > 36 ? `${msg.slice(0, 36)}…` : msg
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
  display: flex;
  flex-direction: column;
}

.fb__header {
  flex-shrink: 0;
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

.fb__scroll {
  flex: 1;
  height: 0;
  padding: 20rpx 24rpx 0;
  box-sizing: border-box;
}

.fb__intro {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(15, 23, 42, 0.05);
}

.fb__intro-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 12rpx;
}

.fb__intro-text {
  display: block;
  font-size: 26rpx;
  color: #475569;
  line-height: 1.65;
}

.fb__card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(15, 23, 42, 0.05);
}

.fb__label {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 16rpx;
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

.fb__textarea {
  width: 100%;
  min-height: 200rpx;
  padding: 16rpx 20rpx;
  box-sizing: border-box;
  font-size: 28rpx;
  color: #0f172a;
  background: #f8fafc;
  border-radius: 16rpx;
  border: 1rpx solid #e2e8f0;
  &--short {
    min-height: 140rpx;
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

.fb__row {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
}

.fb__row-text {
  flex: 1;
  font-size: 26rpx;
  color: #334155;
  line-height: 1.5;
}

.fb__hint {
  display: block;
  font-size: 24rpx;
  color: #64748b;
  line-height: 1.5;
  margin: 12rpx 0 16rpx;
}

.fb__input {
  width: 100%;
  height: 80rpx;
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

.fb__spacer {
  height: 200rpx;
}

.fb__footer {
  flex-shrink: 0;
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
