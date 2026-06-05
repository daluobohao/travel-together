<template>
  <view class="page host-console">
    <view class="host-console__header">
      <view class="host-console__back" @click="goBack">
        <wm-icon name="chevronLeft" :size="34" color="#0f172a" />
      </view>
      <text class="host-console__title">群管理</text>
      <view class="host-console__placeholder" />
    </view>

    <view v-if="loading" class="host-console__state"><text>加载中…</text></view>
    <view v-else class="host-console__body">
      <text class="host-console__city">{{ cityLabel || cityCode }}</text>
      <text class="host-console__hint">公告每周最多更新 3 次；内容需符合社区规范。</text>

      <view class="host-console__field">
        <text class="host-console__label">欢迎语</text>
        <textarea
          v-model="welcomeDraft"
          class="host-console__textarea"
          maxlength="500"
          placeholder="新人进群时展示的欢迎语"
          placeholder-class="host-console__placeholder-text"
        />
      </view>

      <view class="host-console__field">
        <text class="host-console__label">群公告</text>
        <textarea
          v-model="announcementDraft"
          class="host-console__textarea host-console__textarea--tall"
          maxlength="1000"
          placeholder="在大群详情页展示的公告"
          placeholder-class="host-console__placeholder-text"
        />
      </view>

      <view class="host-console__btn" @click="onSave">
        <text>保存</text>
      </view>
    </view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import { getCityGroupProfile, patchCityGroupHostProfile } from '@/api'
import { resolveCityHallCityName } from '@/utils/cityCatalog'

export default {
  components: { WmIcon },
  data() {
    return {
      cityCode: '',
      cityLabel: '',
      loading: true,
      welcomeDraft: '',
      announcementDraft: '',
    }
  },
  onLoad(query) {
    this.cityCode = query?.cityCode ? decodeURIComponent(query.cityCode) : ''
    this.cityLabel =
      (query?.cityLabel && decodeURIComponent(query.cityLabel)) ||
      resolveCityHallCityName(this.cityCode) ||
      ''
    this.bootstrap()
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    async bootstrap() {
      if (!this.cityCode) {
        this.loading = false
        return
      }
      try {
        const data = await getCityGroupProfile(this.cityCode)
        this.welcomeDraft = data?.welcomeText || ''
        this.announcementDraft = data?.announcement || ''
      } catch (e) {
        uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    async onSave() {
      try {
        uni.showLoading({ title: '保存中…' })
        await patchCityGroupHostProfile({
          cityCode: this.cityCode,
          welcomeText: (this.welcomeDraft || '').trim(),
          announcement: (this.announcementDraft || '').trim(),
        })
        uni.showToast({ title: '已保存', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 400)
      } catch (e) {
        uni.showToast({ title: e?.message || '保存失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
  },
}
</script>

<style scoped lang="scss">
.page.host-console {
  min-height: 100vh;
  background: #f8fafc;
  padding: 24rpx 32rpx 48rpx;
  box-sizing: border-box;
}

.host-console__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32rpx;
}

.host-console__back {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
}

.host-console__title {
  font-size: 34rpx;
  font-weight: 700;
  color: #0f172a;
}

.host-console__placeholder {
  width: 72rpx;
}

.host-console__state {
  padding: 80rpx 0;
  text-align: center;
  color: #94a3b8;
}

.host-console__city {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 12rpx;
}

.host-console__hint {
  display: block;
  font-size: 24rpx;
  color: #64748b;
  line-height: 1.5;
  margin-bottom: 32rpx;
}

.host-console__field {
  margin-bottom: 28rpx;
}

.host-console__label {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #334155;
  margin-bottom: 12rpx;
}

.host-console__textarea {
  width: 100%;
  min-height: 160rpx;
  padding: 20rpx 24rpx;
  background: #ffffff;
  border-radius: 16rpx;
  font-size: 28rpx;
  color: #0f172a;
  box-sizing: border-box;
  border: 1rpx solid #e2e8f0;

  &--tall {
    min-height: 240rpx;
  }
}

.host-console__placeholder-text {
  color: #94a3b8;
}

.host-console__btn {
  margin-top: 16rpx;
  height: 88rpx;
  border-radius: 44rpx;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
