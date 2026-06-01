<template>
  <view class="page sub">
    <view class="sub__header">
      <view class="sub__back" @click="goBack"><wm-icon name="chevronLeft" :size="36" color="#0f172a" /></view>
      <text class="sub__title">见面打卡</text>
      <view class="sub__sp" />
    </view>

    <view v-if="loading" class="sub__state"><text>加载中…</text></view>
    <view v-else-if="!activity" class="sub__state"><text>活动不存在</text></view>
    <view v-else class="sub__body">
      <view class="panel">
        <text class="panel__label">{{ activity.title }}</text>
        <text class="panel__hint">{{ activity.time }} · {{ activity.location }}</text>
      </view>

      <view class="panel safety-tip">
        <text>请在公共场所见面，感觉不适可退出并举报。</text>
        <text class="safety-tip__link" @click="goSafety">安全指南 ›</text>
      </view>

      <view v-if="checkedIn" class="panel ok-panel">
        <text>你已打卡，可去互评同行伙伴</text>
        <view class="wm-btn wm-btn--primary actions__btn" @click="goReview">去互评</view>
      </view>
      <view v-else-if="!windowOpen" class="panel">
        <text class="panel__hint">打卡窗口未开启或已关闭</text>
      </view>
      <view v-else class="actions">
        <view class="wm-btn wm-btn--primary actions__btn" :class="{ 'wm-btn--disabled': submitting }" @click="onCheckin">
          {{ submitting ? '提交中…' : '我已到场' }}
        </view>
      </view>

      <view class="help-row">
        <text @click="onHelp(false)">一切正常</text>
        <text class="help-row__sep">|</text>
        <text class="help-row__help" @click="onHelp(true)">需要帮助</text>
      </view>
    </view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import { checkinActivity, formatActivityTime, getActivityDetail } from '@/api'

export default {
  components: { WmIcon },
  data() {
    return {
      activityId: '',
      loading: true,
      activity: null,
      checkedIn: false,
      windowOpen: false,
      submitting: false,
    }
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    goSafety() {
      uni.navigateTo({ url: '/pages/safety-guide/safety-guide' })
    },
    goReview() {
      uni.redirectTo({
        url: `/pages/meet-review/meet-review?activityId=${encodeURIComponent(this.activityId)}`,
      })
    },
    onHelp(need) {
      if (!need) {
        uni.showToast({ title: '祝见面愉快', icon: 'none' })
        return
      }
      uni.showModal({
        title: '需要帮助',
        content: '如遇紧急情况请拨打 110/120。如需平台协助，请通过意见反馈联系运营。',
        showCancel: false,
      })
    },
    async load() {
      this.loading = true
      try {
        const d = await getActivityDetail(this.activityId)
        if (!d) {
          this.activity = null
          return
        }
        this.activity = {
          title: d.title,
          time: formatActivityTime(d.startAt),
          location: d.locationName || '',
        }
        const start = new Date(d.startAt).getTime()
        const windowStart = start + 2 * 3600 * 1000
        const windowEnd = start + 48 * 3600 * 1000
        const now = Date.now()
        this.windowOpen = now >= windowStart && now <= windowEnd
      } catch (e) {
        uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    async onCheckin() {
      if (this.submitting) return
      this.submitting = true
      try {
        await checkinActivity(this.activityId)
        this.checkedIn = true
        uni.showToast({ title: '打卡成功', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: e?.message || '打卡失败', icon: 'none' })
      } finally {
        this.submitting = false
      }
    },
  },
  onLoad(options) {
    this.activityId = options.activityId || options.id || ''
    this.load()
  },
}
</script>

<style lang="scss" scoped>
@import '@/styles/sub-page.scss';
.safety-tip {
  font-size: 26rpx;
  color: $wm-text-2;
  &__link {
    display: block;
    margin-top: 12rpx;
    color: $wm-primary;
    font-weight: 600;
  }
}
.ok-panel {
  text-align: center;
  .actions__btn {
    margin-top: 24rpx;
  }
}
.actions__btn {
  width: 100%;
}
.help-row {
  margin-top: 40rpx;
  text-align: center;
  font-size: 26rpx;
  color: $wm-text-3;
  &__sep {
    margin: 0 16rpx;
  }
  &__help {
    color: $wm-danger;
    font-weight: 600;
  }
}
</style>
