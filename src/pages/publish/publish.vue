<template>
  <view class="page publish">
    <!-- Top Nav -->
    <view class="publish__nav">
      <text class="publish__cancel" @click="onCancel">取消</text>
      <text class="publish__title">{{ navTitle }}</text>
      <text v-if="isEditMode" class="publish__submit" @click="onSave">保存</text>
      <text v-else class="publish__submit" @click="onPublish">发布</text>
    </view>

    <!-- Form -->
    <view class="publish__form">
      <view v-if="editInProgressOnly" class="publish__tip publish__tip--warn">
        <text>活动进行中，仅可修改活动简介；时间、地点等变更请发群通知或取消活动后重发。完整说明请编辑「活动说明」。</text>
      </view>

      <template v-if="!editInProgressOnly">
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

      <view class="field field--textarea">
        <view class="field__label-row">
          <text class="field__label">活动简介</text>
          <view class="field__textarea-actions">
            <text class="field__textarea-action" @click.stop="pasteDescription">粘贴</text>
            <text class="field__textarea-action" @click.stop="copyDescription">复制</text>
          </view>
        </view>
        <textarea
          v-model="form.description"
          class="field__textarea"
          :placeholder="isEditMode ? '简短介绍活动亮点，详情页展示' : '介绍一下活动的亮点、参与要求等'"
          placeholder-class="field__placeholder"
          :maxlength="300"
          :adjust-position="true"
          :show-confirm-bar="true"
          :hold-keyboard="true"
          :cursor-spacing="24"
        />
        <text class="field__counter">{{ (form.description || '').length }} / 300</text>
      </view>

      <view v-if="!isEditMode || editLoaded" class="field field--link" @click="onEditActivityGuide">
        <text class="field__label">完整活动说明<text v-if="!isEditMode">（选填）</text></text>
        <view class="field__select field__select--clickable">
          <text :class="['field__select-text', { 'field__placeholder': !guideEntryFilled }]">
            {{ guideEntryText }}
          </text>
          <wm-icon name="chevronRight" :size="28" color="#cbd5e1" />
        </view>
      </view>

      <view class="field">
        <text class="field__label">活动图片（可选，最多 9 张）</text>
        <text class="field__hint">首张为封面；审核通过前仅发起人可见</text>
        <view class="img-grid">
          <view v-for="(img, i) in activityImages" :key="i" class="img-cell">
            <image :src="img" mode="aspectFill" class="img-cell__img" />
            <text v-if="i === 0" class="img-cell__cover">封面</text>
            <text class="img-cell__del" @click="removeActivityImage(i)">×</text>
          </view>
          <view v-if="activityImages.length < 9" class="img-cell img-cell--add" @click="pickActivityImages">
            <text>+</text>
          </view>
        </view>
      </view>
      </template>

      <view v-if="editInProgressOnly && editLoaded" class="field field--textarea">
        <view class="field__label-row">
          <text class="field__label">活动简介</text>
          <view class="field__textarea-actions">
            <text class="field__textarea-action" @click.stop="pasteDescription">粘贴</text>
            <text class="field__textarea-action" @click.stop="copyDescription">复制</text>
          </view>
        </view>
        <textarea
          v-model="form.description"
          class="field__textarea"
          placeholder="简短介绍活动亮点，详情页展示"
          placeholder-class="field__placeholder"
          :maxlength="300"
          :adjust-position="true"
          :show-confirm-bar="true"
          :hold-keyboard="true"
          :cursor-spacing="24"
        />
        <text class="field__counter">{{ (form.description || '').length }} / 300</text>
      </view>

      <view v-if="editInProgressOnly && editLoaded" class="field field--link" @click="onEditActivityGuide">
        <text class="field__label">完整活动说明</text>
        <view class="field__select field__select--clickable">
          <text :class="['field__select-text', { 'field__placeholder': !guideEntryFilled }]">
            {{ guideEntryText }}
          </text>
          <wm-icon name="chevronRight" :size="28" color="#cbd5e1" />
        </view>
        <text class="field__hint">点击编辑行程、装备、费用等完整说明</text>
      </view>

      <view v-if="!isEditMode" class="field field--switch">
        <view class="field__switch-row">
          <text class="field__label">报名需实名信息</text>
          <switch
            :checked="form.requireEnrollmentIdentity"
            color="#6366f1"
            @change="onRequireIdentityChange"
          />
        </view>
        <text class="field__hint">开启后，报名者需填写本人姓名与身份证号；手机号使用账号绑定号码，不支持代报</text>
      </view>

      <view class="publish__tip">
        <wm-icon name="shield" :size="32" color="#6366f1" />
        <text>{{ publishDisclaimer }}</text>
      </view>
    </view>

    <!-- Bottom Action -->
    <view class="publish__action">
      <view class="publish__btn" @click="isEditMode ? onSave() : onPublish()">
        <text>{{ publishBtnText }}</text>
      </view>
      <text
        v-if="isEditMode && editLoaded && !editCancelledClosed"
        class="publish__cancel-activity"
        @click="onCancelActivity"
      >取消活动</text>
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
import { createActivity, getActivityCategories, getActivityDetail, getMe, isLoggedIn, redirectToLogin, updateActivity, uploadActivityImage } from '@/api'
import { shouldSkipSilentLogin } from '@/utils/wechatAuth'
import { apiActivityPathId } from '@/utils/activityId'
import { ensureTextFieldsSafe, SEC_SCENE } from '@/utils/contentSecurity'
import { prepareChatImageForUpload, validateChatImageFile } from '@/utils/avatarImage'
import { loadPublishPayConfig, payBeforePublishActivity } from '@/pay/publishPay'
import { PUBLISH_FEE_YUAN, publishFeeLabel } from '@/pay/constants'

import {
  ACTIVITY_CATEGORY_OTHER,
  FALLBACK_ACTIVITY_CATEGORIES,
  formatActivityCategoryDisplay,
  mergeCategoryListWithFallback,
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
import { confirmCancelActivity } from '@/utils/activityCancel'
import {
  clearPublishGuideDraft,
  guideSectionsHasContent,
  readPublishGuideDraft,
  writePublishGuideDraftContext,
} from '@/constants/activityGuide'

export default {
  components: { WmIcon, PublishPayModal },
  data() {
    return {
      editActivityId: '',
      editEnrolledCount: 1,
      editActivityStatus: '',
      editLoaded: false,
      editLoading: false,
      saveEventChannel: null,
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
        requireEnrollmentIdentity: false,
      },
      activityImages: [],
      uploadedActivityImages: [],
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
      publishGuideDraftFilled: false,
      editGuideFilled: false,
    }
  },
  computed: {
    isEditMode() {
      return !!this.editActivityId
    },
    navTitle() {
      if (this.isEditMode && this.editInProgressOnly) return '编辑活动简介'
      return this.isEditMode ? '编辑活动' : '发布活动'
    },
    editInProgressOnly() {
      if (!this.isEditMode) return false
      if (this.editActivityStatus === 'ended' || this.editActivityStatus === 'cancelled') return false
      const startAt = this.buildStartAt()
      if (!startAt) return false
      return new Date(startAt).getTime() <= Date.now()
    },
    editCancelledClosed() {
      return this.editActivityStatus === 'ended' || this.editActivityStatus === 'cancelled'
    },
    publishFeeText() {
      return publishFeeLabel(this.publishFeeYuan || PUBLISH_FEE_YUAN)
    },
    publishBtnText() {
      if (this.isEditMode && this.editInProgressOnly) {
        return this.publishing ? '保存中…' : '保存简介'
      }
      if (this.isEditMode) return this.editLoading ? '保存中…' : '保存修改'
      return this.publishPayEnabled ? `发布活动（${this.publishFeeText}）` : '发布活动'
    },
    publishDisclaimer() {
      if (this.isEditMode && this.editInProgressOnly) {
        return '保存后将在活动群聊内通知成员。行程/装备等请编辑「完整活动说明」。'
      }
      if (this.isEditMode) {
        return '保存后，时间/地点/人数/简介等变更将通知已报名成员（活动群聊内）。'
      }
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
    guideEntryFilled() {
      return this.isEditMode ? this.editGuideFilled : this.publishGuideDraftFilled
    },
    guideEntryText() {
      return this.guideEntryFilled
        ? '已填写，点击继续编辑'
        : '编辑活动说明页（概况/行程/装备等）'
    },
  },
  onLoad(options) {
    const mode = String(options?.mode || '').trim()
    const id = options?.id || options?.activityId || ''
    if (mode === 'edit' && id) {
      this.editActivityId = String(id).trim()
    }
    try {
      this.saveEventChannel = this.getOpenerEventChannel?.() || null
    } catch (_) {
      this.saveEventChannel = null
    }
  },
  async onShow() {
    const pagePath = this.isEditMode
      ? `/pages/publish/publish?mode=edit&id=${encodeURIComponent(this.editActivityId)}`
      : '/pages/publish/publish'
    if (!isLoggedIn()) {
      if (shouldSkipSilentLogin()) {
        uni.reLaunch({ url: '/pages/home/home' })
        return
      }
      redirectToLogin(pagePath)
      return
    }
    const phoneOk = await ensurePhoneBound({
      redirectPath: pagePath,
      reason: PHONE_GATE_REASON.PUBLISH,
    })
    if (!phoneOk) return
    if (this.isEditMode) {
      if (!this.editLoaded && !this.editLoading) {
        await this.loadActivityForEdit()
      } else if (this.editLoaded) {
        await this.refreshEditGuideStatus()
      }
      return
    }
    this.refreshPublishGuideDraft()
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
    onRequireIdentityChange(e) {
      this.form.requireEnrollmentIdentity = !!e?.detail?.value
    },
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
    pasteDescription() {
      uni.getClipboardData({
        success: (res) => {
          const clip = String(res?.data || '')
          if (!clip.trim()) {
            uni.showToast({ title: '剪贴板为空', icon: 'none' })
            return
          }
          const base = this.form.description || ''
          const merged = base + clip
          if (merged.length > 300) {
            this.form.description = merged.slice(0, 300)
            uni.showToast({ title: '已粘贴，超出部分已截断', icon: 'none' })
            return
          }
          this.form.description = merged
        },
        fail: () => {
          uni.showToast({ title: '无法读取剪贴板', icon: 'none' })
        },
      })
    },
    copyDescription() {
      const text = String(this.form.description || '')
      if (!text.trim()) {
        uni.showToast({ title: '暂无内容可复制', icon: 'none' })
        return
      }
      uni.setClipboardData({
        data: text,
        success: () => {
          uni.showToast({ title: '已复制', icon: 'success' })
        },
        fail: () => {
          uni.showToast({ title: '复制失败', icon: 'none' })
        },
      })
    },
    async loadCategories() {
      let list = []
      try {
        const data = await getActivityCategories()
        list = data?.categories || []
      } catch (e) {
        list = []
      }
      this.categoryTree = mergeCategoryListWithFallback(list)
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
      const minCap = this.isEditMode ? Math.max(1, Number(this.editEnrolledCount) || 1) : 2
      const cap = Number(this.form.capacity)
      if (!Number.isFinite(cap) || cap < minCap) {
        uni.showToast({
          title: this.isEditMode
            ? `人数上限不能少于已报名 ${minCap} 人`
            : '请填写有效的人数上限',
          icon: 'none',
        })
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
        maxMembers: cap,
      }
    },
    splitDateTimeFromIso(iso) {
      const s = String(iso || '').trim()
      if (!s) return { date: '', clock: '' }
      const m = s.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/)
      if (m) return { date: m[1], clock: m[2] }
      const d = new Date(s)
      if (Number.isNaN(d.getTime())) return { date: '', clock: '' }
      const pad = (n) => String(n).padStart(2, '0')
      return {
        date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        clock: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      }
    },
    async loadActivityForEdit() {
      const pathId = apiActivityPathId(this.editActivityId)
      if (!pathId) {
        uni.showToast({ title: '活动无效', icon: 'none' })
        setTimeout(() => this.onCancel(), 400)
        return
      }
      this.editLoading = true
      try {
        const [detail, me] = await Promise.all([getActivityDetail(pathId), getMe()])
        if (!detail) {
          uni.showToast({ title: '活动不存在', icon: 'none' })
          setTimeout(() => this.onCancel(), 400)
          return
        }
        const orgId = detail.organizer?.userId || ''
        if (!orgId || String(me?.userId || '') !== String(orgId)) {
          uni.showToast({ title: '仅发起人可编辑', icon: 'none' })
          setTimeout(() => this.onCancel(), 400)
          return
        }
        if (detail.activityStatus === 'ended' || detail.activityStatus === 'cancelled') {
          uni.showToast({ title: '活动已结束或已取消', icon: 'none' })
          setTimeout(() => this.onCancel(), 400)
          return
        }
        this.editEnrolledCount = Math.max(1, Number(detail.enrolledCount) || 1)
        this.editActivityStatus = detail.activityStatus || 'published'
        this.form.title = detail.title || ''
        const desc = String(detail.description || '').trim()
        this.form.description = desc === '暂无说明' ? '' : desc
        this.form.categoryId = detail.categoryId || 'dining'
        this.form.subCategoryId = detail.subCategoryId || ''
        this.form.categoryTheme =
          detail.categoryId === ACTIVITY_CATEGORY_OTHER ? detail.categoryLabel || '' : ''
        const start = this.splitDateTimeFromIso(detail.startAt)
        this.form.startDate = start.date
        this.form.startClock = start.clock
        this.mergeStartDateTime()
        const end = this.splitDateTimeFromIso(detail.endAt)
        this.form.endDate = end.date
        this.form.endClock = end.clock
        this.mergeEndDateTime()
        this.form.location = detail.locationName || ''
        this.form.cityCode = detail.cityCode || ''
        this.form.lat = detail.lat != null ? Number(detail.lat) : null
        this.form.lng = detail.lng != null ? Number(detail.lng) : null
        this.form.capacity = String(detail.maxMembers || this.editEnrolledCount)
        const imgs = Array.isArray(detail.images) ? detail.images : []
        this.activityImages = [...imgs]
        this.uploadedActivityImages = [...imgs]
        this.editGuideFilled = !!detail.guideFilled
        this.editLoaded = true
        await this.loadCategories()
      } catch (e) {
        uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
        setTimeout(() => this.onCancel(), 400)
      } finally {
        this.editLoading = false
      }
    },
    buildUpdatePayload(validated) {
      return {
        title: this.form.title.trim(),
        description: (this.form.description || '').trim() || '暂无说明',
        categoryId: validated.categoryId || this.form.categoryId,
        subCategoryId: validated.subCategoryId || undefined,
        categoryLabel:
          validated.categoryId === ACTIVITY_CATEGORY_OTHER ? validated.categoryTheme : null,
        startAt: validated.startAt,
        endAt: validated.endAt,
        locationName: this.form.location.trim(),
        lat: validated.lat,
        lng: validated.lng,
        maxMembers: validated.maxMembers,
        images: this.uploadedActivityImages,
      }
    },
    pickActivityImages() {
      if (this.editInProgressOnly) return
      uni.chooseImage({
        count: 9 - this.activityImages.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: async (res) => {
          const paths = res.tempFilePaths || []
          const sizes = res.tempFiles || []
          for (let i = 0; i < paths.length; i += 1) {
            const p = paths[i]
            try {
              const err = await validateChatImageFile(p, sizes[i]?.size)
              if (err) {
                uni.showToast({ title: err, icon: 'none' })
                continue
              }
              const compressed = await prepareChatImageForUpload(p)
              this.activityImages.push(compressed)
              const d = await uploadActivityImage(compressed)
              if (d?.imageUrl) this.uploadedActivityImages.push(d.imageUrl)
            } catch (e) {
              uni.showToast({ title: e?.message || '图片上传失败', icon: 'none' })
            }
          }
        },
      })
    },
    removeActivityImage(index) {
      if (this.editInProgressOnly) return
      this.activityImages.splice(index, 1)
      this.uploadedActivityImages.splice(index, 1)
    },
    async doUpdateActivity(validated) {
      const pathId = apiActivityPathId(this.editActivityId)
      if (!pathId) return
      try {
        if (this.editInProgressOnly) {
          const desc = (this.form.description || '').trim() || '暂无说明'
          await ensureTextFieldsSafe({ description: desc }, SEC_SCENE.FORUM)
          await updateActivity(pathId, { description: desc })
        } else {
          await ensureTextFieldsSafe(
            {
              title: this.form.title.trim(),
              description: (this.form.description || '').trim() || '暂无说明',
              locationName: this.form.location.trim(),
            },
            SEC_SCENE.FORUM,
          )
          await updateActivity(pathId, this.buildUpdatePayload(validated))
        }
      } catch (e) {
        if (e?.needLogin || e?.isAuthError) {
          redirectToLogin(`/pages/publish/publish?mode=edit&id=${encodeURIComponent(pathId)}`, { explicit: true })
          return
        }
        uni.showToast({ title: e?.message || '保存失败', icon: 'none' })
        throw e
      }
      uni.showToast({ title: '已保存', icon: 'success' })
      try {
        this.saveEventChannel?.emit?.('saved')
      } catch (_) {
        /* ignore */
      }
      setTimeout(() => uni.navigateBack(), 500)
    },
    async onSave() {
      if (this.publishing || this.editLoading) return
      if (this.editInProgressOnly) {
        this.publishing = true
        try {
          await this.doUpdateActivity(null)
        } finally {
          this.publishing = false
        }
        return
      }
      const payload = this.validatePublishForm()
      if (!payload) return
      this.publishing = true
      try {
        await this.doUpdateActivity(payload)
      } finally {
        this.publishing = false
      }
    },
    onEditActivityGuide() {
      if (this.isEditMode) {
        const pathId = apiActivityPathId(this.editActivityId)
        if (!pathId) return
        uni.navigateTo({
          url: `/pages/activity-guide-edit/activity-guide-edit?id=${encodeURIComponent(pathId)}`,
        })
        return
      }
      writePublishGuideDraftContext({
        title: (this.form.title || '').trim(),
      })
      uni.navigateTo({
        url: '/pages/activity-guide-edit/activity-guide-edit?mode=draft',
      })
    },
    refreshPublishGuideDraft() {
      this.publishGuideDraftFilled = guideSectionsHasContent(readPublishGuideDraft())
    },
    async refreshEditGuideStatus() {
      const pathId = apiActivityPathId(this.editActivityId)
      if (!pathId) return
      try {
        const detail = await getActivityDetail(pathId)
        this.editGuideFilled = !!detail?.guideFilled
      } catch (_) {
        /* ignore */
      }
    },
    onCancelActivity() {
      if (!this.isEditMode || this.publishing || this.editLoading) return
      confirmCancelActivity(this.editActivityId, {
        onSuccess: () => {
          try {
            this.saveEventChannel?.emit?.('saved')
          } catch (_) {
            /* ignore */
          }
          setTimeout(() => uni.navigateBack(), 500)
        },
      })
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
          images: this.uploadedActivityImages.length ? this.uploadedActivityImages : undefined,
          guideSections: (() => {
            const sections = readPublishGuideDraft()
            return guideSectionsHasContent(sections) ? sections : undefined
          })(),
          rulesAccepted: { noHarassment: true, noPromotion: true, noInappropriate: true },
          requireEnrollmentIdentity: !!this.form.requireEnrollmentIdentity,
        })
      } catch (e) {
        if (e?.needLogin || e?.isAuthError) {
          redirectToLogin('/pages/publish/publish', { explicit: true })
          return
        }
        uni.showToast({ title: e?.message || '发布失败', icon: 'none' })
        throw e
      }
      clearPublishGuideDraft()
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
  padding-bottom: calc(200rpx + env(safe-area-inset-bottom));

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

    &--warn {
      background: rgba(251, 191, 36, 0.12);
      color: #92400e;
    }
  }

  &__action {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 50;
    padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom));
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(16px);
    border-top: 1rpx solid rgba(148, 163, 184, 0.2);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16rpx;
  }

  &__cancel-activity {
    font-size: 26rpx;
    color: #dc2626;
    font-weight: 600;
    padding: 8rpx 16rpx;
  }

  &__btn {
    width: 100%;
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

  &--textarea {
    overflow: visible;

    &:active {
      transform: none;
      box-shadow: $wm-shadow-md;

      &::before {
        opacity: 0;
      }
    }
  }

  &--readonly {
    &:active {
      transform: none;
      box-shadow: $wm-shadow-md;

      &::before {
        opacity: 0;
      }
    }
  }

  &__readonly-text {
    font-size: 28rpx;
    color: $wm-text-1;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
  }

  &__label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16rpx;
  }

  &__textarea-actions {
    display: flex;
    align-items: center;
    gap: 20rpx;
    flex-shrink: 0;
  }

  &__textarea-action {
    font-size: 24rpx;
    color: $wm-primary;
    font-weight: 600;
    padding: 4rpx 0;
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
    position: relative;
    z-index: 1;
    user-select: text;
    -webkit-user-select: text;
  }

  &__placeholder {
    color: $wm-text-3;
  }

  &__hint {
    font-size: 24rpx;
    color: $wm-text-3;
    margin-top: 8rpx;
  }

  &--switch {
    .field__switch-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24rpx;
    }
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

.img-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 16rpx;
}

.img-cell {
  width: 200rpx;
  height: 200rpx;
  position: relative;
  border-radius: 12rpx;
  overflow: hidden;
  background: #f1f5f9;

  &--add {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 48rpx;
    color: #94a3b8;
  }

  &__img {
    width: 100%;
    height: 100%;
  }

  &__cover {
    position: absolute;
    left: 8rpx;
    bottom: 8rpx;
    padding: 4rpx 12rpx;
    border-radius: 999rpx;
    font-size: 20rpx;
    color: #fff;
    background: rgba(15, 23, 42, 0.55);
  }

  &__del {
    position: absolute;
    top: 4rpx;
    right: 8rpx;
    color: #fff;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 50%;
    width: 36rpx;
    height: 36rpx;
    text-align: center;
    line-height: 36rpx;
  }
}
</style>
