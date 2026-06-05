<template>
  <view class="page admin-acq">
    <view class="admin-acq__header">
      <view class="admin-acq__back" @click="goBack">
        <wm-icon name="chevronLeft" :size="34" color="#0f172a" />
        <text>返回</text>
      </view>
      <text class="admin-acq__title">渠道来源统计</text>
      <view class="admin-acq__placeholder" />
    </view>

    <view v-if="forbidden" class="admin-acq__state">
      <text>无管理员权限</text>
    </view>
    <view v-else-if="loading" class="admin-acq__state"><text>加载中…</text></view>
    <view v-else class="admin-acq__body">
      <view class="admin-acq__summary">
        <view class="admin-acq__stat">
          <text class="admin-acq__stat-num">{{ data.totalUsers || 0 }}</text>
          <text class="admin-acq__stat-label">总用户</text>
        </view>
        <view class="admin-acq__stat">
          <text class="admin-acq__stat-num">{{ data.withSource || 0 }}</text>
          <text class="admin-acq__stat-label">已记录来源</text>
        </view>
        <view class="admin-acq__stat">
          <text class="admin-acq__stat-num">{{ data.withoutSource || 0 }}</text>
          <text class="admin-acq__stat-label">未记录</text>
        </view>
      </view>

      <view class="admin-acq__panel">
        <text class="admin-acq__panel-title">运营链接示例</text>
        <text class="admin-acq__panel-hint">公众号/投放请使用 entry 落地页并带 src 参数</text>
        <view v-for="ex in linkExamples" :key="ex.src" class="admin-acq__example">
          <text class="admin-acq__example-label">{{ ex.label }}</text>
          <text class="admin-acq__example-path">{{ ex.path }}</text>
          <text class="admin-acq__example-copy" @click="copyPath(ex.path)">复制</text>
        </view>
      </view>

      <view class="admin-acq__panel">
        <view class="admin-acq__panel-head">
          <text class="admin-acq__panel-title">来源分布</text>
          <text class="admin-acq__refresh" @click="load">刷新</text>
        </view>
        <view v-if="!items.length" class="admin-acq__state admin-acq__state--inline">
          <text>暂无数据</text>
        </view>
        <view v-for="row in items" :key="row.source" class="admin-acq__row">
          <view class="admin-acq__row-head">
            <text class="admin-acq__row-label">{{ row.label }}</text>
            <text class="admin-acq__row-meta">{{ row.count }} · {{ row.pct }}%</text>
          </view>
          <text class="admin-acq__row-src">{{ row.source }}</text>
          <view class="admin-acq__bar">
            <view class="admin-acq__bar-fill" :style="{ width: row.pct + '%' }" />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import { adminGetAcquisitionStats, getMe } from '@/api'
import {
  ACQ_LINK_EXAMPLES,
  acquisitionSourceLabel,
  buildEntryPathWithSrc,
} from '@/utils/acquisitionSource'
import { copyTextToClipboard } from '@/utils/clipboard'

export default {
  components: { WmIcon },
  data() {
    return {
      forbidden: false,
      loading: true,
      data: {},
      items: [],
      linkExamples: ACQ_LINK_EXAMPLES.map((x) => ({
        ...x,
        path: buildEntryPathWithSrc(x.src),
      })),
    }
  },
  onLoad() {
    this.bootstrap()
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    async bootstrap() {
      try {
        const me = await getMe()
        if (!me?.isAdmin) {
          this.forbidden = true
          return
        }
        await this.load()
      } catch {
        this.forbidden = true
      } finally {
        this.loading = false
      }
    },
    async load() {
      this.loading = true
      try {
        const data = await adminGetAcquisitionStats()
        this.data = data || {}
        this.items = (data?.items || []).map((row) => ({
          ...row,
          label: acquisitionSourceLabel(row.source),
        }))
      } catch (e) {
        uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    copyPath(path) {
      copyTextToClipboard(path)
      uni.showToast({ title: '已复制路径', icon: 'none' })
    },
  },
}
</script>

<style scoped lang="scss">
.page.admin-acq {
  min-height: 100vh;
  background: #f8fafc;
  padding-bottom: 48rpx;
}

.admin-acq__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(var(--status-bar-height, 0px) + 16rpx) 24rpx 16rpx;
  background: #fff;
}

.admin-acq__back {
  display: flex;
  align-items: center;
  gap: 4rpx;
  font-size: 28rpx;
  min-width: 120rpx;
}

.admin-acq__title {
  font-size: 34rpx;
  font-weight: 700;
}

.admin-acq__placeholder {
  min-width: 120rpx;
}

.admin-acq__state {
  padding: 80rpx 32rpx;
  text-align: center;
  color: #94a3b8;
  &--inline {
    padding: 32rpx 0;
  }
}

.admin-acq__body {
  padding: 24rpx;
}

.admin-acq__summary {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.admin-acq__stat {
  flex: 1;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx 16rpx;
  text-align: center;
}

.admin-acq__stat-num {
  display: block;
  font-size: 40rpx;
  font-weight: 800;
  color: #4f46e5;
}

.admin-acq__stat-label {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #64748b;
}

.admin-acq__panel {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.admin-acq__panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.admin-acq__panel-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  margin-bottom: 8rpx;
}

.admin-acq__panel-hint {
  display: block;
  font-size: 24rpx;
  color: #94a3b8;
  margin-bottom: 16rpx;
}

.admin-acq__refresh {
  font-size: 26rpx;
  color: #4f46e5;
}

.admin-acq__example {
  padding: 16rpx 0;
  border-top: 1rpx solid #f1f5f9;
}

.admin-acq__example-label {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
}

.admin-acq__example-path {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #64748b;
  word-break: break-all;
}

.admin-acq__example-copy {
  display: inline-block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #4f46e5;
}

.admin-acq__row {
  padding: 20rpx 0;
  border-top: 1rpx solid #f1f5f9;
}

.admin-acq__row-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.admin-acq__row-label {
  font-size: 28rpx;
  font-weight: 600;
}

.admin-acq__row-meta {
  font-size: 24rpx;
  color: #64748b;
}

.admin-acq__row-src {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #94a3b8;
}

.admin-acq__bar {
  margin-top: 12rpx;
  height: 12rpx;
  background: #e2e8f0;
  border-radius: 999rpx;
  overflow: hidden;
}

.admin-acq__bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #4f46e5);
}
</style>
