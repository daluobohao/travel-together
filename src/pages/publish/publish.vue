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
        <view class="field__datetime">
          <picker mode="date" :value="form.startDate" @change="onStartDateChange">
            <view class="field__select field__datetime-item">
              <wm-icon name="calendar" :size="32" color="#94a3b8" />
              <text :class="['field__select-text', { 'field__placeholder': !form.startDate }]">
                {{ form.startDate || '选择日期' }}
              </text>
              <wm-icon name="chevronRight" :size="28" color="#cbd5e1" />
            </view>
          </picker>
          <picker mode="time" :value="form.startClock" @change="onStartTimeChange">
            <view class="field__select field__datetime-item">
              <wm-icon name="clock" :size="32" color="#94a3b8" />
              <text :class="['field__select-text', { 'field__placeholder': !form.startClock }]">
                {{ form.startClock || '选择时间' }}
              </text>
              <wm-icon name="chevronRight" :size="28" color="#cbd5e1" />
            </view>
          </picker>
          <view v-if="form.startTime" class="field__datetime-summary">已选择：{{ form.startTime }}</view>
        </view>
      </view>

      <view class="field">
        <text class="field__label">结束时间（可选）</text>
        <view class="field__datetime">
          <picker mode="date" :value="form.endDate" @change="onEndDateChange">
            <view class="field__select field__datetime-item">
              <wm-icon name="calendar" :size="32" color="#94a3b8" />
              <text :class="['field__select-text', { 'field__placeholder': !form.endDate }]">
                {{ form.endDate || '选择日期' }}
              </text>
              <wm-icon name="chevronRight" :size="28" color="#cbd5e1" />
            </view>
          </picker>
          <picker mode="time" :value="form.endClock" @change="onEndTimeChange">
            <view class="field__select field__datetime-item">
              <wm-icon name="clock" :size="32" color="#94a3b8" />
              <text :class="['field__select-text', { 'field__placeholder': !form.endClock }]">
                {{ form.endClock || '选择时间' }}
              </text>
              <wm-icon name="chevronRight" :size="28" color="#cbd5e1" />
            </view>
          </picker>
          <view v-if="form.endTime" class="field__datetime-summary">已选择：{{ form.endTime }}</view>
        </view>
      </view>

      <view class="field">
        <text class="field__label">活动地点 <text class="field__req">*</text></text>
        <view class="field__select field__select--clickable" @click="openLocationPicker">
          <wm-icon name="mapPin" :size="32" color="#94a3b8" />
          <text :class="['field__select-text', { 'field__placeholder': !form.location }]">
            {{ form.location || '输入地点名称或地址' }}
          </text>
          <wm-icon name="chevronRight" :size="28" color="#cbd5e1" />
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
import { createActivity, getActivityCategories, isLoggedIn } from '@/api'

const FALLBACK_CATEGORIES = [
  { categoryId: 'coffee', name: '咖啡' },
  { categoryId: 'citywalk', name: 'Citywalk' },
  { categoryId: 'hiking', name: '徒步' },
  { categoryId: 'boardgame', name: '桌游' },
  { categoryId: 'coworking', name: '联合办公·共创' },
  { categoryId: 'indie', name: '副业·独立开发' },
  { categoryId: 'language', name: '语言交换' },
  { categoryId: 'dining', name: '约饭·探店' },
  { categoryId: 'photography', name: '摄影扫街' },
  { categoryId: 'exhibit', name: '展览' },
  { categoryId: 'night_run', name: '夜跑' },
]
const ALLOWED_CATEGORY_IDS = FALLBACK_CATEGORIES.map((x) => x.categoryId)

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
        startDate: '',
        startClock: '',
        endTime: '',
        endDate: '',
        endClock: '',
        location: '',
        cityCode: '',
        lat: null,
        lng: null,
        capacity: '',
        cost: '',
        description: '',
      },
    }
  },
  onShow() {
    if (!isLoggedIn()) {
      uni.setStorageSync('REDIRECT_URL', '/pages/publish/publish')
      uni.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.loadCategories()
    this.tryApplyPickedLocation()
  },
  methods: {
    openLocationPicker() {
      uni.navigateTo({ url: '/pages/location-picker/location-picker' })
    },
    tryApplyPickedLocation() {
      const picked = uni.getStorageSync('PUBLISH_LOCATION_PICK_RESULT')
      if (!picked || !picked.name) return
      const displayName = picked.name
      const displayAddress = picked.address || ''
      this.form.location = displayAddress ? `${displayName}（${displayAddress}）` : displayName
      this.form.lat = Number(picked.lat) || null
      this.form.lng = Number(picked.lng) || null
      const cc = String(picked.cityCode || '').trim()
      this.form.cityCode = /^\d{6}$/.test(cc) ? cc : ''
      uni.removeStorageSync('PUBLISH_LOCATION_PICK_RESULT')
    },
    async loadCategories() {
      let list = []
      try {
        const data = await getActivityCategories()
        list = (data?.categories || []).filter((item) => ALLOWED_CATEGORY_IDS.includes(item.categoryId))
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
      this.form.startDate = e?.detail?.value || ''
      this.mergeStartDateTime()
    },
    onStartTimeChange(e) {
      this.form.startClock = e?.detail?.value || ''
      this.mergeStartDateTime()
    },
    onEndDateChange(e) {
      this.form.endDate = e?.detail?.value || ''
      this.mergeEndDateTime()
    },
    onEndTimeChange(e) {
      this.form.endClock = e?.detail?.value || ''
      this.mergeEndDateTime()
    },
    mergeStartDateTime() {
      if (!this.form.startDate || !this.form.startClock) {
        this.form.startTime = ''
        return
      }
      this.form.startTime = `${this.form.startDate} ${this.form.startClock}`
    },
    mergeEndDateTime() {
      if (!this.form.endDate || !this.form.endClock) {
        this.form.endTime = ''
        return
      }
      this.form.endTime = `${this.form.endDate} ${this.form.endClock}`
    },
    buildDateTimeIso(date, clock) {
      if (!date || !clock) return ''
      // 直接按用户选择的本地时分构造，避免 toISOString() 转 UTC 导致时分偏移
      return `${date}T${clock}:00+08:00`
    },
    buildStartAt() {
      return this.buildDateTimeIso(this.form.startDate, this.form.startClock)
    },
    buildEndAt() {
      return this.buildDateTimeIso(this.form.endDate, this.form.endClock) || null
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
      if (!/^\d{6}$/.test(this.form.cityCode || '')) {
        return uni.showToast({ title: '请从地图选择地点，以便确定城市编码', icon: 'none' })
      }
      const lat = Number(this.form.lat)
      const lng = Number(this.form.lng)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return uni.showToast({ title: '请从地图选择地点，以便获取坐标', icon: 'none' })
      }
      if ((this.form.endDate && !this.form.endClock) || (!this.form.endDate && this.form.endClock)) {
        return uni.showToast({ title: '请完整选择结束时间', icon: 'none' })
      }
      const startAt = this.buildStartAt()
      const endAt = this.buildEndAt()
      if (endAt && new Date(endAt).getTime() <= new Date(startAt).getTime()) {
        return uni.showToast({ title: '结束时间需晚于开始时间', icon: 'none' })
      }
      const TOLERANCE_MS = 5 * 60 * 1000
      if (new Date(startAt).getTime() < Date.now() - TOLERANCE_MS) {
        return uni.showToast({
          title: '开始时间不能早于当前时间（可提前 5 分钟）',
          icon: 'none',
        })
      }
      try {
        await createActivity({
          title: this.form.title.trim(),
          description: (this.form.description || '').trim() || '暂无说明',
          categoryId: this.categoryMap[this.form.category] || 'coffee',
          startAt,
          endAt,
          cityCode: this.form.cityCode.trim(),
          locationName: this.form.location.trim(),
          lat,
          lng,
          maxMembers: Number(this.form.capacity) || 8,
          feeType: 'aa',
          feeAmount: null,
          rulesAccepted: { noHarassment: true, noPromotion: true, noInappropriate: true },
        })
      } catch (e) {
        uni.showToast({ title: e?.message || '发布失败', icon: 'none' })
        return
      }
      uni.showToast({ title: '发布成功！', icon: 'success' })
      setTimeout(() => uni.reLaunch({ url: '/pages/home/home' }), 800)
    },
  },
}
</script>

<style lang="scss" scoped>
.publish {
  min-height: 100vh;
  background: transparent;
  padding-bottom: 220rpx;

  &__nav {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: calc(24rpx + var(--status-bar-height, 0px) + env(safe-area-inset-top)) 32rpx 24rpx;
    background: $wm-sticky-header-gradient;
    border-bottom: none;
    box-shadow: 0 12rpx 40rpx rgba(2, 132, 199, 0.06);
  }

  &__cancel {
    font-size: 28rpx;
    color: $wm-text-3;
    padding: 8rpx 4rpx;
    font-weight: 500;
  }

  &__title {
    font-size: 34rpx;
    font-weight: 800;
    color: $wm-text-1;
  }

  &__submit {
    font-size: 28rpx;
    color: $wm-primary;
    font-weight: 700;
    padding: 8rpx 4rpx;
  }

  &__form {
    padding: 28rpx 32rpx 32rpx;
    display: flex;
    flex-direction: column;
    gap: 24rpx;
  }

  &__tip {
    display: flex;
    align-items: flex-start;
    gap: 12rpx;
    padding: 24rpx 28rpx;
    background: $wm-primary-soft;
    border-radius: $wm-radius-md;
    font-size: 24rpx;
    color: $wm-primary-deep;
    line-height: 1.5;
    font-weight: 500;
  }

  &__action {
    position: fixed;
    left: 0;
    right: 0;
    bottom: calc(220rpx + env(safe-area-inset-bottom));
    padding: 20rpx 32rpx 0;
    z-index: 50;
  }

  &__btn {
    height: 96rpx;
    border-radius: $wm-radius-xl;
    background: $wm-gradient-primary;
    color: #ffffff;
    font-size: 32rpx;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: $wm-shadow-glow;
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s;

    &:active {
      transform: scale(0.98);
      box-shadow: $wm-shadow-lg;
    }
  }
}

.field {
  background: #ffffff;
  border-radius: $wm-radius-lg;
  padding: 28rpx;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  border: $wm-card-edge;
  box-shadow: $wm-shadow-md;
  transition: transform 0.15s, box-shadow 0.15s;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 6rpx;
    bottom: 0;
    background: $wm-gradient-primary;
    opacity: 0;
    transition: opacity 0.2s;
  }

  &:active {
    transform: scale(0.995);
    box-shadow: $wm-shadow-sm;

    &::before {
      opacity: 1;
    }
  }

  &--category {
    padding-right: 28px;
  }

  &__label {
    font-size: 26rpx;
    color: $wm-text-2;
    font-weight: 700;
  }

  &__req {
    color: $wm-danger;
    margin-left: 4rpx;
  }

  &__input {
    font-size: 30rpx;
    color: $wm-text-1;
    padding: 8rpx 0;
    border: none;
    background: transparent;
    font-weight: 500;
  }

  &__textarea {
    width: 100%;
    min-height: 160rpx;
    font-size: 28rpx;
    color: $wm-text-1;
    padding: 4rpx 0;
    background: transparent;
    line-height: 1.6;
    font-weight: 500;
  }

  &__placeholder {
    color: $wm-text-3;
  }

  &__select {
    display: flex;
    align-items: center;
    gap: 14rpx;
    padding: 18rpx 20rpx;
    border-radius: $wm-radius-md;
    background: #fafafa;
    transition: background 0.2s;

    &:active {
      background: $wm-primary-soft;
    }
  }

  &__select--clickable {
    cursor: pointer;
  }

  &__select-text {
    flex: 1;
    font-size: 28rpx;
    color: $wm-text-1;
    font-weight: 500;
  }

  &__select--category .field__select-text {
    margin-right: 24px;
  }

  &__datetime {
    display: flex;
    flex-direction: column;
    gap: 14rpx;
  }

  &__datetime-item {
    width: 100%;
  }

  &__datetime-summary {
    font-size: 24rpx;
    color: $wm-text-3;
    padding: 0 6rpx;
    font-weight: 500;
  }

  &__inline-input {
    flex: 1;
    font-size: 28rpx;
    color: $wm-text-1;
    background: transparent;
    border: none;
    font-weight: 500;
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 12rpx;
  }

  &__chip {
    padding: 12rpx 28rpx;
    border-radius: 999rpx;
    font-size: 26rpx;
    color: $wm-text-2;
    background: #fafafa;
    border: 2rpx solid transparent;
    font-weight: 500;
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);

    &--active {
      background: $wm-primary-soft;
      color: $wm-primary;
      border-color: rgba(2, 132, 199, 0.3);
      font-weight: 700;
    }
  }

  &__counter {
    align-self: flex-end;
    font-size: 22rpx;
    color: $wm-text-3;
    font-weight: 500;
  }
}
</style>
