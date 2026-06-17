<template>
  <view class="page sub">
    <view class="sub__header">
      <view class="sub__back" @click="goBack"><wm-icon name="chevronLeft" :size="36" color="#0f172a" /></view>
      <text class="sub__title">编辑活动说明</text>
      <text v-if="canEdit" class="sub__save" @click="save">{{ saving ? '保存中…' : '保存' }}</text>
      <view v-else class="sub__sp" />
    </view>

    <view v-if="loadState === 'loading'" class="sub__state"><text>加载中…</text></view>
    <view v-else-if="loadState === 'forbidden'" class="sub__state">
      <text>仅活动发起人可编辑活动说明</text>
    </view>

    <scroll-view v-else-if="canEdit" scroll-y class="sub__body">
      <view class="field-card">
        <text class="field-card__label">一、活动概况</text>
        <textarea
          v-model="form.overviewNote"
          class="field-card__area"
          :placeholder="overviewPlaceholder"
          maxlength="8000"
        />
      </view>

      <view v-for="sec in templateSections" :key="sec.key" class="field-card">
        <text class="field-card__label">{{ sec.ordinal }}、{{ sec.label }}</text>
        <textarea
          v-model="form[sec.key]"
          class="field-card__area"
          :placeholder="sec.placeholder || `填写${sec.label}`"
          maxlength="8000"
        />
      </view>
    </scroll-view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import { getActivityDetail, getActivityGuideTemplate, getMe, isLoggedIn, updateActivity } from '@/api'
import { apiActivityPathId } from '@/utils/activityId'
import {
  ACTIVITY_GUIDE_SECTIONS,
  buildGuideSectionsPayload,
  mergeGuideFormFromDetail,
  readPublishGuideDraft,
  writePublishGuideDraft,
} from '@/constants/activityGuide'
import { isActivityOrganizer } from '@/utils/activityPermission'

export default {
  components: { WmIcon },
  data() {
    return {
      activityId: '',
      draftMode: false,
      canEdit: false,
      loadState: 'loading',
      saving: false,
      overviewPlaceholder: '可填写活动名称、时间、地点、人数及概况说明等。',
      form: mergeGuideFormFromDetail(null),
      templateSections: ACTIVITY_GUIDE_SECTIONS.map((s) => ({ ...s, placeholder: '' })),
    }
  },
  onLoad(query) {
    this.draftMode = String(query?.mode || '').trim() === 'draft'
    this.activityId = String(query?.id || '').trim()
    this.loadAll()
  },
  methods: {
    goBack() {
      uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/home/home' }) })
    },
    async loadAll() {
      this.loadState = 'loading'
      try {
        const tpl = await getActivityGuideTemplate().catch(() => null)
        if (tpl?.sections?.length) {
          const map = Object.fromEntries(tpl.sections.map((s) => [s.key, s]))
          this.templateSections = ACTIVITY_GUIDE_SECTIONS.map((s) => ({
            ...s,
            placeholder: map[s.key]?.placeholder || '',
          }))
        }
        if (tpl?.overviewPlaceholder) {
          this.overviewPlaceholder = tpl.overviewPlaceholder
        }
        if (this.draftMode) {
          this.canEdit = true
          this.form = mergeGuideFormFromDetail({ guideSections: readPublishGuideDraft() })
          this.loadState = 'ready'
          return
        }
        const pathId = apiActivityPathId(this.activityId)
        if (!pathId) {
          this.loadState = 'forbidden'
          return
        }
        if (!isLoggedIn()) {
          this.loadState = 'forbidden'
          uni.showToast({ title: '请先登录', icon: 'none' })
          setTimeout(() => this.goBack(), 400)
          return
        }
        const [detail, me] = await Promise.all([getActivityDetail(pathId), getMe()])
        this.canEdit = isActivityOrganizer(detail, me?.userId)
        if (!this.canEdit) {
          this.loadState = 'forbidden'
          uni.showToast({ title: '仅发起人可编辑', icon: 'none' })
          setTimeout(() => this.goBack(), 600)
          return
        }
        if (detail) {
          this.form = mergeGuideFormFromDetail(detail)
        }
        this.loadState = 'ready'
      } catch (e) {
        this.loadState = 'forbidden'
        uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
      }
    },
    async save() {
      if (this.saving || !this.canEdit) return
      this.saving = true
      try {
        if (this.draftMode) {
          writePublishGuideDraft(buildGuideSectionsPayload(this.form))
          uni.showToast({ title: '已保存', icon: 'success' })
          setTimeout(() => this.goBack(), 400)
          return
        }
        const pathId = apiActivityPathId(this.activityId)
        if (!pathId) return
        await updateActivity(pathId, {
          guideSections: buildGuideSectionsPayload(this.form),
        })
        uni.showToast({ title: '已保存', icon: 'success' })
        setTimeout(() => this.goBack(), 400)
      } catch (e) {
        uni.showToast({ title: e?.message || '保存失败', icon: 'none' })
      } finally {
        this.saving = false
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.sub {
  min-height: 100vh;
  background: #f8fafc;
  &__header {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    padding: calc(20rpx + var(--status-bar-height, 0px) + env(safe-area-inset-top)) 24rpx 20rpx;
    background: $wm-sticky-header-gradient;
  }
  &__back {
    width: 72rpx;
  }
  &__title {
    flex: 1;
    text-align: center;
    font-size: 34rpx;
    font-weight: 700;
  }
  &__save {
    font-size: 28rpx;
    font-weight: 700;
    color: $wm-primary;
    padding: 8rpx;
  }
  &__sp {
    width: 72rpx;
  }
  &__body {
    height: calc(100vh - 120rpx);
    padding: 24rpx 32rpx 48rpx;
    box-sizing: border-box;
  }
  &__state {
    padding: 120rpx 32rpx;
    text-align: center;
    color: $wm-text-3;
    font-size: 28rpx;
  }
}
.field-card {
  background: #fff;
  border-radius: $wm-radius-lg;
  padding: 24rpx 28rpx;
  margin-bottom: 20rpx;
  &__label {
    display: block;
    font-size: 28rpx;
    font-weight: 700;
    color: $wm-text-1;
    margin-bottom: 12rpx;
  }
  &__area {
    width: 100%;
    min-height: 200rpx;
    font-size: 28rpx;
    line-height: 1.55;
    color: $wm-text-2;
  }
}
</style>
