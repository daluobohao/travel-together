<template>
  <view class="page host-apply">
    <view class="host-apply__header">
      <view class="host-apply__back" @click="goBack">
        <wm-icon name="chevronLeft" :size="34" color="#0f172a" />
      </view>
      <text class="host-apply__title">申请成为城主</text>
      <view class="host-apply__placeholder" />
    </view>

    <view class="host-apply__body">
      <text class="host-apply__city">{{ cityLabel || cityCode }}</text>
      <text class="host-apply__hint">
        需已加入该城大群、完成照片验证；大群成员 ≥ {{ applyMinMembers }} 且城主空缺满 30 天。
      </text>

      <view class="host-apply__field">
        <text class="host-apply__label">申请说明（可选）</text>
        <textarea
          v-model="introDraft"
          class="host-apply__textarea"
          maxlength="500"
          placeholder="简单介绍你在该城的组局经验、维护群氛围的计划"
          placeholder-class="host-apply__placeholder-text"
        />
      </view>

      <view class="host-apply__agree" @click="agreed = !agreed">
        <view class="host-apply__check" :class="{ 'host-apply__check--on': agreed }">
          <text v-if="agreed">✓</text>
        </view>
        <text class="host-apply__agree-text">我已阅读并同意《城主公约》</text>
      </view>

      <view class="host-apply__btn" :class="{ 'host-apply__btn--disabled': !agreed }" @click="onSubmit">
        <text>提交申请</text>
      </view>
    </view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import { submitCityGroupHostApplication } from '@/api'
import { resolveCityHallCityName } from '@/utils/cityCatalog'

export default {
  components: { WmIcon },
  data() {
    return {
      cityCode: '',
      cityLabel: '',
      applyMinMembers: 100,
      introDraft: '',
      agreed: false,
    }
  },
  onLoad(query) {
    this.cityCode = query?.cityCode ? decodeURIComponent(query.cityCode) : ''
    this.cityLabel =
      (query?.cityLabel && decodeURIComponent(query.cityLabel)) ||
      resolveCityHallCityName(this.cityCode) ||
      ''
    if (query?.applyMinMembers) {
      this.applyMinMembers = Number(query.applyMinMembers) || 100
    }
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    async onSubmit() {
      if (!this.agreed) {
        uni.showToast({ title: '请先同意城主公约', icon: 'none' })
        return
      }
      try {
        uni.showLoading({ title: '提交中…' })
        await submitCityGroupHostApplication({
          cityCode: this.cityCode,
          introText: (this.introDraft || '').trim() || undefined,
        })
        uni.showToast({ title: '已提交，等待审核', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 500)
      } catch (e) {
        uni.showToast({ title: e?.message || '提交失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
  },
}
</script>

<style scoped lang="scss">
.page.host-apply {
  min-height: 100vh;
  background: #f8fafc;
  padding: 24rpx 32rpx 48rpx;
  box-sizing: border-box;
}

.host-apply__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32rpx;
}

.host-apply__back,
.host-apply__placeholder {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
}

.host-apply__title {
  font-size: 34rpx;
  font-weight: 700;
  color: #0f172a;
}

.host-apply__city {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 12rpx;
}

.host-apply__hint {
  display: block;
  font-size: 24rpx;
  color: #64748b;
  line-height: 1.55;
  margin-bottom: 32rpx;
}

.host-apply__label {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #334155;
  margin-bottom: 12rpx;
}

.host-apply__textarea {
  width: 100%;
  min-height: 240rpx;
  padding: 20rpx 24rpx;
  background: #fff;
  border-radius: 16rpx;
  border: 1rpx solid #e2e8f0;
  font-size: 28rpx;
  box-sizing: border-box;
}

.host-apply__agree {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin: 28rpx 0;
}

.host-apply__check {
  width: 36rpx;
  height: 36rpx;
  border-radius: 8rpx;
  border: 2rpx solid #c7d2fe;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  color: #fff;

  &--on {
    background: #6366f1;
    border-color: #6366f1;
  }
}

.host-apply__agree-text {
  font-size: 24rpx;
  color: #475569;
}

.host-apply__btn {
  height: 88rpx;
  border-radius: 44rpx;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;

  &--disabled {
    opacity: 0.5;
  }
}
</style>
