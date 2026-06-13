<template>
  <view class="page sub">
    <view class="sub__header">
      <view class="sub__back" @click="goBack"><wm-icon name="chevronLeft" :size="36" color="#0f172a" /></view>
      <text class="sub__title">活动说明</text>
      <view v-if="canEdit" class="sub__edit" @click="goEdit"><text>编辑</text></view>
      <view v-else class="sub__sp" />
    </view>

    <view v-if="loadState === 'loading'" class="sub__state"><text>加载中…</text></view>
    <view v-else-if="loadState === 'error'" class="sub__state">
      <text>{{ loadErrorMsg }}</text>
      <view class="sub__retry" @click="loadData"><text>重试</text></view>
    </view>

    <scroll-view v-else scroll-y class="sub__body">
      <text class="guide-title">活动说明｜{{ pageTitle }}</text>

      <view v-if="!guideFilled" class="guide-empty">
        <text>{{ emptyHint }}</text>
        <view v-if="canEdit" class="guide-empty__btn" @click="goEdit">
          <text>去编辑活动说明</text>
        </view>
      </view>

      <template v-else>
        <view class="guide-section">
          <text class="guide-section__head">一、活动概况</text>
          <view class="guide-kv">
            <text class="guide-kv__row">活动名称：{{ overview.title }}</text>
            <text class="guide-kv__row">活动时间：{{ overviewTime }}</text>
            <text class="guide-kv__row">集合地点：{{ overview.locationName }}</text>
            <text v-if="overview.addressDetail" class="guide-kv__row">详细地址：{{ overview.addressDetail }}</text>
            <text class="guide-kv__row">活动人数：{{ overview.enrolledCount }}/{{ overview.maxMembers }} 人</text>
          </view>
          <text v-if="overviewNote" class="guide-section__body">{{ overviewNote }}</text>
        </view>

        <view v-for="sec in visibleSections" :key="sec.key" class="guide-section">
          <text class="guide-section__head">{{ sec.ordinal }}、{{ sec.label }}</text>
          <text v-if="sec.key === 'feeNote'" class="guide-kv__row guide-kv__row--fee">基础费用：{{ overview.feeLabel }}</text>
          <text class="guide-section__body">{{ sec.text }}</text>
        </view>
      </template>

      <view v-if="canEdit && guideFilled" class="guide-edit-bar" @click="goEdit">
        <text>编辑活动说明</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import { getActivityDetail, getMe, isLoggedIn, formatActivityTimeRange } from '@/api'
import { apiActivityPathId } from '@/utils/activityId'
import {
  ACTIVITY_GUIDE_EMPTY_HINT,
  ACTIVITY_GUIDE_SECTIONS,
  guideSectionText,
} from '@/constants/activityGuide'
import { isActivityOrganizer } from '@/utils/activityPermission'

export default {
  components: { WmIcon },
  data() {
    return {
      activityId: '',
      loadState: 'loading',
      loadErrorMsg: '',
      pageTitle: '',
      guideFilled: false,
      overview: {},
      overviewNote: '',
      sections: {},
      canEdit: false,
      emptyHint: ACTIVITY_GUIDE_EMPTY_HINT,
      initialLoaded: false,
    }
  },
  computed: {
    overviewTime() {
      return formatActivityTimeRange(this.overview.startAt, this.overview.endAt)
    },
    visibleSections() {
      return ACTIVITY_GUIDE_SECTIONS.map((s) => ({
        ...s,
        text: guideSectionText(this.sections, s.key),
      })).filter((s) => s.text)
    },
  },
  onLoad(query) {
    this.activityId = String(query?.id || query?.activityId || '').trim()
    this.loadData()
  },
  onShow() {
    if (this.activityId && this.initialLoaded) {
      this.loadData({ refresh: true })
    }
  },
  methods: {
    goBack() {
      uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/home/home' }) })
    },
    goEdit() {
      if (!this.canEdit) return
      const id = apiActivityPathId(this.activityId)
      if (!id) return
      uni.navigateTo({ url: `/pages/activity-guide-edit/activity-guide-edit?id=${encodeURIComponent(id)}` })
    },
    async loadData({ refresh = false } = {}) {
      const pathId = apiActivityPathId(this.activityId)
      if (!pathId) {
        this.loadState = 'error'
        this.loadErrorMsg = '活动不存在'
        return
      }
      this.canEdit = false
      if (!refresh) {
        this.loadState = 'loading'
      }
      try {
        let meId = ''
        if (isLoggedIn()) {
          try {
            const me = await getMe()
            meId = me?.userId ? String(me.userId) : ''
          } catch (_) {
            meId = ''
          }
        }
        const detail = await getActivityDetail(pathId)
        if (!detail) {
          this.loadState = 'error'
          this.loadErrorMsg = '活动不存在或已下架'
          return
        }
        this.canEdit = isActivityOrganizer(detail, meId)
        this.pageTitle = detail.title || ''
        this.guideFilled = !!detail.guideFilled
        this.overview = detail.guideOverview || {
          title: detail.title,
          startAt: detail.startAt,
          endAt: detail.endAt,
          locationName: detail.locationName,
          addressDetail: detail.addressDetail,
          maxMembers: detail.maxMembers,
          enrolledCount: detail.enrolledCount,
          feeLabel: '免费',
        }
        this.sections = detail.guideSections || {}
        this.overviewNote = guideSectionText(this.sections, 'overviewNote')
        this.loadState = 'ready'
        this.initialLoaded = true
      } catch (e) {
        this.canEdit = false
        if (!refresh) {
          this.loadState = 'error'
          this.loadErrorMsg = e?.message || '加载失败'
        }
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
    height: 72rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  &__title {
    flex: 1;
    text-align: center;
    font-size: 34rpx;
    font-weight: 700;
    color: $wm-text-1;
  }
  &__sp {
    width: 72rpx;
  }
  &__edit {
    min-width: 72rpx;
    height: 72rpx;
    padding: 0 8rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28rpx;
    font-weight: 700;
    color: $wm-primary;
  }
  &__body {
    height: calc(100vh - 120rpx);
    padding: 24rpx 32rpx 48rpx;
    box-sizing: border-box;
  }
  &__state {
    padding: 80rpx 32rpx;
    text-align: center;
    color: $wm-text-3;
  }
  &__retry {
    margin-top: 24rpx;
    color: $wm-primary;
    font-weight: 600;
  }
}
.guide-title {
  display: block;
  font-size: 36rpx;
  font-weight: 800;
  color: $wm-text-1;
  line-height: 1.4;
  margin-bottom: 28rpx;
}
.guide-empty {
  background: #fff;
  border-radius: $wm-radius-lg;
  padding: 48rpx 32rpx;
  text-align: center;
  color: $wm-text-3;
  font-size: 28rpx;
  &__btn {
    margin-top: 28rpx;
    display: inline-block;
    padding: 16rpx 36rpx;
    border-radius: 999rpx;
    background: $wm-primary-soft;
    color: $wm-primary;
    font-weight: 700;
  }
}
.guide-section {
  background: #fff;
  border-radius: $wm-radius-lg;
  padding: 28rpx 32rpx;
  margin-bottom: 20rpx;
  &__head {
    display: block;
    font-size: 30rpx;
    font-weight: 800;
    color: $wm-text-1;
    margin-bottom: 16rpx;
  }
  &__body {
    display: block;
    font-size: 28rpx;
    line-height: 1.65;
    color: $wm-text-2;
    white-space: pre-wrap;
  }
}
.guide-kv__row {
  display: block;
  font-size: 28rpx;
  line-height: 1.6;
  color: $wm-text-2;
  margin-bottom: 8rpx;
  &--fee {
    margin-bottom: 12rpx;
    color: $wm-text-3;
  }
}
.guide-edit-bar {
  margin-top: 12rpx;
  text-align: center;
  padding: 24rpx;
  color: $wm-primary;
  font-weight: 600;
  font-size: 28rpx;
}
</style>
