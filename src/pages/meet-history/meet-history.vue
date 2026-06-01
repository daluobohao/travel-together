<template>
  <view class="page sub">
    <view class="sub__header">
      <view class="sub__back" @click="goBack"><wm-icon name="chevronLeft" :size="36" color="#0f172a" /></view>
      <text class="sub__title">见面记录</text>
      <view class="sub__sp" />
    </view>

    <view v-if="loading" class="sub__state"><text>加载中…</text></view>
    <view v-else-if="!list.length" class="sub__state"><text>暂无见面记录</text></view>
    <view v-else class="sub__body">
      <view v-for="item in list" :key="item.activityId" class="panel rec">
        <text class="rec__title">{{ item.title }}</text>
        <text class="rec__time">{{ formatTime(item.startAt) }}</text>
        <text class="rec__st" :class="item.success ? 'rec__st--ok' : 'rec__st--pending'">
          {{ item.success ? '成功见面' : item.checkedIn ? '待完成互评' : '未完成' }}
        </text>
      </view>
    </view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import { formatActivityTime, getMeetHistory } from '@/api'

export default {
  components: { WmIcon },
  data() {
    return { loading: true, list: [] }
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    formatTime(iso) {
      return formatActivityTime(iso)
    },
    async load() {
      this.loading = true
      try {
        const d = await getMeetHistory()
        this.list = d?.list || []
      } catch (_) {
        this.list = []
      } finally {
        this.loading = false
      }
    },
  },
  onShow() {
    this.load()
  },
}
</script>

<style lang="scss" scoped>
@import '@/styles/sub-page.scss';
.rec {
  &__title {
    display: block;
    font-size: 30rpx;
    font-weight: 700;
    color: $wm-text-1;
  }
  &__time {
    display: block;
    margin-top: 8rpx;
    font-size: 24rpx;
    color: $wm-text-3;
  }
  &__st {
    display: inline-block;
    margin-top: 12rpx;
    font-size: 22rpx;
    font-weight: 700;
    padding: 4rpx 14rpx;
    border-radius: 999rpx;
    &--ok {
      background: $wm-success-soft;
      color: $wm-success;
    }
    &--pending {
      background: $wm-warning-soft;
      color: $wm-warning;
    }
  }
}
</style>
