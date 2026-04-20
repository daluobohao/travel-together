<template>
  <view class="page publish">
    <!-- Top Nav -->
    <view class="publish__nav">
      <text class="publish__cancel" @click="onCancel">取消</text>
      <text class="publish__title">发布活动</text>
      <text class="publish__submit" @click="onPublish">发布</text>
    </view>

    <!-- Form -->
    <view class="publish__form">
      <view class="field">
        <text class="field__label">活动标题 <text class="field__req">*</text></text>
        <input
          v-model="form.title"
          class="field__input"
          placeholder="给活动起个吸引人的名字"
          placeholder-class="field__placeholder"
        />
      </view>

      <view class="field field--category">
        <text class="field__label">活动分类 <text class="field__req">*</text></text>
        <picker mode="selector" :range="categories" :value="categoryIndex" @change="onCategoryChange">
          <view class="field__select field__select--category">
            <wm-icon name="hash" :size="32" color="#94a3b8" />
            <text :class="['field__select-text', { 'field__placeholder': !form.category }]">
              {{ form.category || '请选择活动分类' }}
            </text>
            <wm-icon name="chevronRight" :size="28" color="#cbd5e1" />
          </view>
        </picker>
      </view>

      <view class="field">
        <text class="field__label">开始时间 <text class="field__req">*</text></text>
        <picker mode="date" :value="form.startTime" @change="onStartDateChange">
          <view class="field__select">
            <wm-icon name="calendar" :size="32" color="#94a3b8" />
            <text :class="['field__select-text', { 'field__placeholder': !form.startTime }]">
              {{ form.startTime || '选择日期' }}
            </text>
            <wm-icon name="chevronRight" :size="28" color="#cbd5e1" />
          </view>
        </picker>
      </view>

      <view class="field">
        <text class="field__label">活动地点 <text class="field__req">*</text></text>
        <view class="field__select">
          <wm-icon name="mapPin" :size="32" color="#94a3b8" />
          <input
            v-model="form.location"
            class="field__inline-input"
            placeholder="输入地点名称或地址"
            placeholder-class="field__placeholder"
          />
        </view>
      </view>

      <view class="field">
        <text class="field__label">人数上限 <text class="field__req">*</text></text>
        <view class="field__select">
          <wm-icon name="users" :size="32" color="#94a3b8" />
          <input
            v-model="form.capacity"
            class="field__inline-input"
            type="number"
            placeholder="建议 6-8 人"
            placeholder-class="field__placeholder"
          />
        </view>
      </view>

      <view class="field">
        <text class="field__label">费用说明</text>
        <view class="field__select">
          <wm-icon name="yuan" :size="32" color="#94a3b8" />
          <input
            v-model="form.cost"
            class="field__inline-input"
            placeholder="如 AA 制，预计人均 50 元"
            placeholder-class="field__placeholder"
          />
        </view>
      </view>

      <view class="field">
        <text class="field__label">活动说明</text>
        <textarea
          v-model="form.description"
          class="field__textarea"
          placeholder="介绍一下活动的亮点、参与要求等"
          placeholder-class="field__placeholder"
          :maxlength="300"
        />
        <text class="field__counter">{{ (form.description || '').length }} / 300</text>
      </view>

      <view class="publish__tip">
        <wm-icon name="shield" :size="32" color="#6366f1" />
        <text>发布即表示同意《旅聚社区规范》，请确保活动信息真实有效。</text>
      </view>
    </view>

    <!-- Bottom Action -->
    <view class="publish__action">
      <view class="publish__btn" @click="onPublish">
        <text>发布活动</text>
      </view>
    </view>

    <wm-tab-bar active="publish" />
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import WmTabBar from '@/components/WmTabBar/WmTabBar.vue'
import { createActivity, getActivityCategories } from '@/api'

const FALLBACK_CATEGORIES = [
  { categoryId: 'hiking', name: '徒步' },
  { categoryId: 'mountaineering', name: '登山' },
  { categoryId: 'cycling', name: '骑行' },
  { categoryId: 'camping', name: '露营' },
  { categoryId: 'coffee', name: '咖啡' },
  { categoryId: 'citywalk', name: 'Citywalk' },
  { categoryId: 'boardgame', name: '桌游' },
  { categoryId: 'movie', name: '电影' },
]

export default {
  components: { WmIcon, WmTabBar },
  data() {
    const initialCategories = FALLBACK_CATEGORIES.map((x) => x.name)
    const initialCategoryMap = FALLBACK_CATEGORIES.reduce((acc, item) => {
      acc[item.name] = item.categoryId
      return acc
    }, {})
    return {
      categories: initialCategories,
      categoryMap: initialCategoryMap,
      categoryIndex: 0,
      form: {
        title: '',
        category: initialCategories[0] || '',
        startTime: '',
        location: '',
        capacity: '',
        cost: '',
        description: '',
      },
    }
  },
  onShow() {
    this.loadCategories()
  },
  methods: {
    async loadCategories() {
      let list = []
      try {
        const data = await getActivityCategories()
        list = data?.categories || []
      } catch (e) {
        list = []
      }
      if (!list.length) list = FALLBACK_CATEGORIES
      this.categories = list.map((x) => x.name)
      this.categoryMap = list.reduce((acc, item) => {
        acc[item.name] = item.categoryId
        return acc
      }, {})
      if (!this.form.category && this.categories.length) {
        this.form.category = this.categories[0]
        this.categoryIndex = 0
      } else {
        const idx = this.categories.findIndex((name) => name === this.form.category)
        this.categoryIndex = idx >= 0 ? idx : 0
      }
    },
    onCancel() {
      uni.reLaunch({ url: '/pages/home/home' })
    },
    onStartDateChange(e) {
      this.form.startTime = e?.detail?.value || ''
    },
    onCategoryChange(e) {
      const idx = Number(e?.detail?.value)
      if (Number.isNaN(idx) || idx < 0) return
      this.categoryIndex = idx
      this.form.category = this.categories[idx] || ''
    },
    async onPublish() {
      if (!this.form.title.trim()) return uni.showToast({ title: '请填写活动标题', icon: 'none' })
      if (!this.form.category) return uni.showToast({ title: '请选择活动分类', icon: 'none' })
      if (!this.form.startTime) return uni.showToast({ title: '请选择开始时间', icon: 'none' })
      if (!this.form.location.trim()) return uni.showToast({ title: '请填写活动地点', icon: 'none' })
      await createActivity({
        title: this.form.title.trim(),
        description: (this.form.description || '').trim() || '暂无说明',
        categoryId: this.categoryMap[this.form.category] || 'coffee',
        startAt: new Date(`${this.form.startTime}T00:00:00`).toISOString(),
        cityCode: '110000',
        locationName: this.form.location.trim(),
        lat: 39.9,
        lng: 116.4,
        maxMembers: Number(this.form.capacity) || 8,
        feeType: 'aa',
        feeAmount: null,
        rulesAccepted: { noHarassment: true, noPromotion: true, noInappropriate: true },
      })
      uni.showToast({ title: '发布成功！', icon: 'success' })
      setTimeout(() => uni.reLaunch({ url: '/pages/home/home' }), 800)
    },
  },
}
</script>

<style lang="scss" scoped>
.publish {
  min-height: 100vh;
  background: #f3f4f6;
  padding-bottom: 200rpx;

  &__nav {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: calc(24rpx + var(--status-bar-height, 0px) + env(safe-area-inset-top)) 32rpx 24rpx;
    background: #ffffff;
    border-bottom: 1rpx solid #eef2f7;
  }

  &__cancel {
    font-size: 28rpx;
    color: #94a3b8;
    padding: 8rpx 4rpx;
  }

  &__title {
    font-size: 32rpx;
    font-weight: 700;
    color: #0f172a;
  }

  &__submit {
    font-size: 28rpx;
    color: #6366f1;
    font-weight: 600;
    padding: 8rpx 4rpx;
  }

  &__form {
    padding: 24rpx 32rpx 32rpx;
    display: flex;
    flex-direction: column;
    gap: 24rpx;
  }

  &__tip {
    display: flex;
    align-items: flex-start;
    gap: 12rpx;
    padding: 20rpx 24rpx;
    background: #eef2ff;
    border-radius: 16rpx;
    font-size: 22rpx;
    color: #4f46e5;
    line-height: 1.5;
  }

  &__action {
    position: fixed;
    left: 0;
    right: 0;
    bottom: calc(140rpx + env(safe-area-inset-bottom));
    padding: 20rpx 32rpx 0;
    z-index: 50;
  }

  &__btn {
    height: 92rpx;
    border-radius: 24rpx;
    background: linear-gradient(135deg, #818cf8, #6366f1 60%, #4f46e5);
    color: #ffffff;
    font-size: 30rpx;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 12rpx 28rpx rgba(99, 102, 241, 0.4);
  }
}

.field {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 24rpx 28rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  box-shadow: 0 2rpx 10rpx rgba(15, 23, 42, 0.03);

  &--category {
    padding-right: 28px;
  }

  &__label {
    font-size: 26rpx;
    color: #475569;
    font-weight: 600;
  }

  &__req {
    color: #ef4444;
    margin-left: 4rpx;
  }

  &__input {
    font-size: 30rpx;
    color: #0f172a;
    padding: 8rpx 0;
    border: none;
    background: transparent;
  }

  &__textarea {
    width: 100%;
    min-height: 140rpx;
    font-size: 28rpx;
    color: #0f172a;
    padding: 4rpx 0;
    background: transparent;
    line-height: 1.5;
  }

  &__placeholder {
    color: #cbd5e1;
  }

  &__select {
    display: flex;
    align-items: center;
    gap: 14rpx;
    padding: 14rpx 18rpx;
    border-radius: 14rpx;
    background: #f8fafc;
  }

  &__select-text {
    flex: 1;
    font-size: 28rpx;
    color: #0f172a;
  }

  &__select--category .field__select-text {
    margin-right: 24px;
  }

  &__inline-input {
    flex: 1;
    font-size: 28rpx;
    color: #0f172a;
    background: transparent;
    border: none;
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 12rpx;
  }

  &__chip {
    padding: 10rpx 24rpx;
    border-radius: 999rpx;
    font-size: 24rpx;
    color: #475569;
    background: #f1f5f9;
    border: 1rpx solid transparent;

    &--active {
      background: #eef2ff;
      color: #6366f1;
      border-color: #c7d2fe;
      font-weight: 600;
    }
  }

  &__counter {
    align-self: flex-end;
    font-size: 22rpx;
    color: #cbd5e1;
  }
}
</style>
