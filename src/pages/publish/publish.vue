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
          :placeholder="titlePlaceholder"
          placeholder-class="field__placeholder"
        />
      </view>

      <view class="field field--category">
        <text class="field__label">活动分类 <text class="field__req">*</text></text>
        <view class="cat-grid">
          <view
            v-for="c in categoryTree"
            :key="c.categoryId"
            class="cat-chip"
            :class="{ 'cat-chip--on': form.categoryId === c.categoryId }"
            @click="selectCategory(c.categoryId)"
          >
            <text>{{ c.name }}</text>
          </view>
        </view>
        <view v-if="currentSubcategories.length" class="cat-sub">
          <text class="cat-sub__label">细分类型（可选）</text>
          <view class="cat-sub__row">
            <view
              class="cat-chip cat-chip--sub"
              :class="{ 'cat-chip--on': !form.subCategoryId }"
              @click="selectSubCategory('')"
            >
              <text>不限</text>
            </view>
            <view
              v-for="s in currentSubcategories"
              :key="s.subCategoryId"
              class="cat-chip cat-chip--sub"
              :class="{ 'cat-chip--on': form.subCategoryId === s.subCategoryId }"
              @click="selectSubCategory(s.subCategoryId)"
            >
              <text>{{ s.name }}</text>
            </view>
          </view>
        </view>
        <text v-if="categoryDisplayPreview" class="field__hint">将展示为：{{ categoryDisplayPreview }}</text>
      </view>

      <view v-if="isOtherCategory" class="field">
        <text class="field__label">活动主题 <text class="field__req">*</text></text>
        <input
          v-model="form.categoryTheme"
          class="field__input"
          maxlength="16"
          placeholder="如：羽毛球、看展、练口语（2～16 字）"
          placeholder-class="field__placeholder"
        />
        <text class="field__hint">将展示为「其他 · 你的主题」</text>
      </view>

      <view class="field">
        <text class="field__label">开始时间 <text class="field__req">*</text></text>
        <view class="field__datetime">
          <picker
            mode="date"
            :value="form.startDate"
            :start="startDateMin"
            :end="startDateMax"
            @change="onStartDateChange"
          >
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
        <text class="field__hint">{{ publishStartWindowHint }}</text>
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
        <text>{{ publishDisclaimer }}</text>
      </view>
    </view>

    <!-- Bottom Action -->
    <view class="publish__action">
      <view class="publish__btn" @click="onPublish">
        <text>{{ publishBtnText }}</text>
      </view>
    </view>

    <publish-pay-modal
      :visible="payModal.visible"
      :user-id="payModal.userId"
      :qr-id="payModal.qrId"
      :pay-code-url="payModal.payCodeUrl"
      :mock-mode="payModal.mockMode"
      :fee-yuan="payModal.feeYuan"
      @update:visible="payModal.visible = $event"
      @success="onPaySuccess"
      @cancel="onPayCancel"
    />

  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import PublishPayModal from '@/components/PublishPayModal/PublishPayModal.vue'
import { createActivity, getActivityCategories, isLoggedIn, redirectToLogin } from '@/api'
import { ensureTextFieldsSafe, SEC_SCENE } from '@/utils/contentSecurity'
import { loadPublishPayConfig, payBeforePublishActivity } from '@/pay/publishPay'
import { PUBLISH_FEE_YUAN, publishFeeLabel } from '@/pay/constants'

import {
  ACTIVITY_CATEGORY_OTHER,
  FALLBACK_ACTIVITY_CATEGORIES,
  formatActivityCategoryDisplay,
  normalizeCategoryList,
  publishTitlePlaceholder,
} from '@/constants/activityCategories'
import {
  isStartWithinHomeWindow,
  publishStartDateBounds,
  PUBLISH_START_WINDOW_HINT,
  PUBLISH_START_WINDOW_REJECT_MSG,
} from '@/constants/homeActivityList'
import { ensurePhoneBound, PHONE_GATE_REASON } from '@/utils/phoneGate'

export default {
  components: { WmIcon, PublishPayModal },
  data() {
    return {
      categoryTree: normalizeCategoryList(FALLBACK_ACTIVITY_CATEGORIES),
      form: {
        title: '',
        categoryId: 'dining',
        subCategoryId: '',
        categoryTheme: '',
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
      publishing: false,
      publishPayEnabled: false,
      publishFeeYuan: String(PUBLISH_FEE_YUAN),
      payModal: {
        visible: false,
        userId: '',
        qrId: '',
        payCodeUrl: '',
        mockMode: false,
        feeYuan: '',
      },
    }
  },
  computed: {
    publishFeeText() {
      return publishFeeLabel(this.publishFeeYuan || PUBLISH_FEE_YUAN)
    },
    publishBtnText() {
      return this.publishPayEnabled ? `发布活动（${this.publishFeeText}）` : '发布活动'
    },
    publishDisclaimer() {
      if (this.publishPayEnabled) {
        return `发布即表示同意《旅聚社区规范》，请确保活动信息真实有效。发布前需支付服务费 ${this.publishFeeText}。`
      }
      return '发布即表示同意《旅聚社区规范》，请确保活动信息真实有效。'
    },
    isOtherCategory() {
      return this.form.categoryId === ACTIVITY_CATEGORY_OTHER
    },
    currentSubcategories() {
      if (this.isOtherCategory) return []
      const cur = this.categoryTree.find((c) => c.categoryId === this.form.categoryId)
      return cur?.subcategories || []
    },
    categoryDisplayPreview() {
      if (!this.form.categoryId) return ''
      return formatActivityCategoryDisplay(
        this.form.categoryId,
        this.form.subCategoryId,
        this.form.categoryTheme,
      )
    },
    titlePlaceholder() {
      return publishTitlePlaceholder(this.form.categoryId, this.form.subCategoryId)
    },
    startDateMin() {
      return publishStartDateBounds().start
    },
    startDateMax() {
      return publishStartDateBounds().end
    },
    publishStartWindowHint() {
      return PUBLISH_START_WINDOW_HINT
    },
  },
  async onShow() {
    if (!isLoggedIn()) {
      redirectToLogin('/pages/publish/publish')
      return
    }
    const phoneOk = await ensurePhoneBound({
      redirectPath: '/pages/publish/publish',
      reason: PHONE_GATE_REASON.PUBLISH,
    })
    if (!phoneOk) return
    try {
      const cfg = await loadPublishPayConfig(true)
      this.publishPayEnabled = !!cfg.enabled
      this.publishFeeYuan = cfg.feeYuan || String(PUBLISH_FEE_YUAN)
    } catch (e) {
      console.warn(e)
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
        list = data?.categories || []
      } catch (e) {
        list = []
      }
      this.categoryTree = normalizeCategoryList(list.length ? list : FALLBACK_ACTIVITY_CATEGORIES)
      if (!this.categoryTree.some((c) => c.categoryId === this.form.categoryId)) {
        this.form.categoryId = this.categoryTree[0]?.categoryId || 'dining'
        this.form.subCategoryId = ''
      }
    },
    selectCategory(categoryId) {
      this.form.categoryId = categoryId
      this.form.subCategoryId = ''
      if (categoryId !== ACTIVITY_CATEGORY_OTHER) this.form.categoryTheme = ''
    },
    selectSubCategory(subCategoryId) {
      this.form.subCategoryId = subCategoryId || ''
    },
    onCancel() {
      uni.navigateBack({
        fail: () => uni.reLaunch({ url: '/pages/home/home' }),
      })
    },
    showStartWindowRejectReason() {
      uni.showModal({
        title: '开始时间超出范围',
        content: PUBLISH_START_WINDOW_REJECT_MSG,
        showCancel: false,
        confirmText: '知道了',
      })
    },
    warnIfStartOutOfWindow(startAt) {
      if (!startAt || isStartWithinHomeWindow(startAt)) return true
      this.showStartWindowRejectReason()
      return false
    },
    onStartDateChange(e) {
      const val = e?.detail?.value || ''
      if (val && this.startDateMax && val > this.startDateMax) {
        this.showStartWindowRejectReason()
        return
      }
      this.form.startDate = val
      this.mergeStartDateTime()
      if (this.form.startTime && !this.warnIfStartOutOfWindow(this.buildStartAt())) {
        this.form.startDate = ''
        this.form.startTime = ''
      }
    },
    onStartTimeChange(e) {
      this.form.startClock = e?.detail?.value || ''
      this.mergeStartDateTime()
      if (this.form.startTime && !this.warnIfStartOutOfWindow(this.buildStartAt())) {
        this.form.startClock = ''
        this.form.startTime = ''
      }
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
      this.selectCategory(this.categoryTree[idx]?.categoryId || '')
    },
    validatePublishForm() {
      if (!this.form.title.trim()) {
        uni.showToast({ title: '请填写活动标题', icon: 'none' })
        return null
      }
      if (!this.form.categoryId) {
        uni.showToast({ title: '请选择活动分类', icon: 'none' })
        return null
      }
      if (!this.isOtherCategory && this.currentSubcategories.length && !this.form.subCategoryId) {
        uni.showToast({ title: '请选择二级分类', icon: 'none' })
        return null
      }
      const categoryTheme = String(this.form.categoryTheme || '').trim()
      if (this.isOtherCategory) {
        if (categoryTheme.length < 2) {
          uni.showToast({ title: '请填写活动主题（2～16 字）', icon: 'none' })
          return null
        }
        if (categoryTheme.length > 16) {
          uni.showToast({ title: '活动主题不超过 16 字', icon: 'none' })
          return null
        }
      }
      if (!this.form.startTime) {
        uni.showToast({ title: '请选择开始时间', icon: 'none' })
        return null
      }
      if (!this.form.location.trim()) {
        uni.showToast({ title: '请填写活动地点', icon: 'none' })
        return null
      }
      if (!/^\d{6}$/.test(this.form.cityCode || '')) {
        uni.showToast({ title: '请从地图选择地点，以便确定城市编码', icon: 'none' })
        return null
      }
      const lat = Number(this.form.lat)
      const lng = Number(this.form.lng)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        uni.showToast({ title: '请从地图选择地点，以便获取坐标', icon: 'none' })
        return null
      }
      if ((this.form.endDate && !this.form.endClock) || (!this.form.endDate && this.form.endClock)) {
        uni.showToast({ title: '请完整选择结束时间', icon: 'none' })
        return null
      }
      const startAt = this.buildStartAt()
      const endAt = this.buildEndAt()
      if (endAt && new Date(endAt).getTime() <= new Date(startAt).getTime()) {
        uni.showToast({ title: '结束时间需晚于开始时间', icon: 'none' })
        return null
      }
      const TOLERANCE_MS = 5 * 60 * 1000
      if (new Date(startAt).getTime() < Date.now() - TOLERANCE_MS) {
        uni.showToast({
          title: '开始时间不能早于当前时间（可提前 5 分钟）',
          icon: 'none',
        })
        return null
      }
      if (!isStartWithinHomeWindow(startAt)) {
        this.showStartWindowRejectReason()
        return null
      }
      return {
        categoryId: this.form.categoryId,
        subCategoryId: this.form.subCategoryId || null,
        categoryTheme,
        startAt,
        endAt,
        lat,
        lng,
      }
    },
    async doCreateActivity(payload) {
      try {
        await ensureTextFieldsSafe(
          {
            title: this.form.title.trim(),
            description: (this.form.description || '').trim() || '暂无说明',
            locationName: this.form.location.trim(),
          },
          SEC_SCENE.FORUM,
        )
        await createActivity({
          title: this.form.title.trim(),
          description: (this.form.description || '').trim() || '暂无说明',
          categoryId: payload.categoryId || 'dining',
          subCategoryId: payload.subCategoryId || undefined,
          categoryLabel: payload.categoryId === ACTIVITY_CATEGORY_OTHER ? payload.categoryTheme : null,
          startAt: payload.startAt,
          endAt: payload.endAt,
          cityCode: this.form.cityCode.trim(),
          locationName: this.form.location.trim(),
          lat: payload.lat,
          lng: payload.lng,
          maxMembers: Number(this.form.capacity) || 8,
          feeType: 'aa',
          feeAmount: null,
          rulesAccepted: { noHarassment: true, noPromotion: true, noInappropriate: true },
        })
      } catch (e) {
        if (e?.needLogin || e?.isAuthError) {
          redirectToLogin('/pages/publish/publish')
          return
        }
        uni.showToast({ title: e?.message || '发布失败', icon: 'none' })
        throw e
      }
      uni.showToast({ title: '发布成功！', icon: 'success' })
      setTimeout(() => uni.reLaunch({ url: '/pages/home/home' }), 800)
    },
    onPaySuccess() {
      this.payModal.visible = false
      const payload = this.validatePublishForm()
      if (!payload) {
        this.publishing = false
        return
      }
      this.doCreateActivity(payload).finally(() => {
        this.publishing = false
      })
    },
    onPayCancel() {
      this.payModal.visible = false
      this.publishing = false
    },
    async onPublish() {
      if (this.publishing) return
      const payload = this.validatePublishForm()
      if (!payload) return

      this.publishing = true
      try {
        const payResult = await payBeforePublishActivity()
        if (payResult?.skipped) {
          await this.doCreateActivity(payload)
          return
        }
        if (payResult?.needPayModal) {
          this.payModal = {
            visible: true,
            userId: payResult.userId,
            qrId: payResult.qrId,
            payCodeUrl: payResult.payCodeUrl || '',
            mockMode: !!payResult.mockMode,
            feeYuan: payResult.feeYuan || String(PUBLISH_FEE_YUAN),
          }
          return
        }
        await this.doCreateActivity(payload)
      } catch (e) {
        if (e?.needLogin || e?.cancelled) {
          // 已跳转登录或用户取消支付
        } else {
          uni.showToast({ title: e?.message || '支付失败', icon: 'none' })
        }
      } finally {
        if (!this.payModal.visible) this.publishing = false
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.publish {
  min-height: 100vh;
  background: transparent;
  padding-bottom: calc(48rpx + env(safe-area-inset-bottom));

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
    padding-right: 0;
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

  &__hint {
    font-size: 24rpx;
    color: $wm-text-3;
    margin-top: 8rpx;
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

.cat-grid,
.cat-sub__row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.cat-sub {
  margin-top: 16rpx;

  &__label {
    display: block;
    font-size: 24rpx;
    color: $wm-text-3;
    margin-bottom: 10rpx;
  }
}

.cat-chip {
  padding: 12rpx 22rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: $wm-text-2;
  background: #f8fafc;
  border: 1rpx solid #e2e8f0;

  &--sub {
    font-size: 22rpx;
    padding: 10rpx 18rpx;
  }

  &--on {
    color: $wm-primary;
    background: $wm-primary-soft;
    border-color: rgba(2, 132, 199, 0.35);
    font-weight: 700;
  }
}
</style>
