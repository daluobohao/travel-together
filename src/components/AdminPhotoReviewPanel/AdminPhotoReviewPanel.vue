<template>
  <view class="admin-panel">
    <view v-if="forbidden" class="sub__state">
      <text class="state-txt">无管理员权限</text>
      <text class="state-hint">请确认账号 role=admin，并重新登录</text>
    </view>
    <view v-else-if="loading" class="sub__state">
      <text class="state-txt">加载中…</text>
    </view>
    <view v-else-if="loadError" class="sub__state">
      <text class="state-txt">{{ loadError }}</text>
      <view class="wm-btn wm-btn--primary state-retry" @click="reload">重试</view>
    </view>
    <view v-else-if="!list.length" class="sub__state">
      <text class="state-txt">暂无待审核申请</text>
    </view>
    <view v-else class="sub__body">
      <view v-for="item in list" :key="item.verificationId" class="panel card">
        <view class="card__head">
          <text class="card__name">{{ item.nickname || '用户' }}</text>
          <text class="card__uid">{{ item.userId }}</text>
          <text class="card__time">{{ formatTime(item.submittedAt) }}</text>
        </view>
        <view class="card__imgs">
          <view class="img-box" @click="preview(item, 'avatar')">
            <text class="img-box__label">头像</text>
            <image
              v-if="item.avatarUrl"
              class="img-box__img"
              :src="displayUrl(item.avatarUrl)"
              mode="aspectFill"
            />
            <view v-else class="img-box__empty">无头像</view>
          </view>
          <view class="img-box" @click="preview(item, 'selfie')">
            <text class="img-box__label">现场自拍</text>
            <image
              v-if="item.selfieUrl"
              class="img-box__img"
              :src="displayUrl(item.selfieUrl)"
              mode="aspectFill"
            />
            <view v-else class="img-box__empty">无图</view>
          </view>
        </view>
        <view class="card__actions">
          <view
            class="wm-btn wm-btn--ghost card__btn"
            :class="{ 'wm-btn--disabled': actingId === item.verificationId }"
            @click="onReject(item)"
          >
            拒绝
          </view>
          <view
            class="wm-btn wm-btn--primary card__btn"
            :class="{ 'wm-btn--disabled': actingId === item.verificationId }"
            @click="onApprove(item)"
          >
            通过
          </view>
        </view>
      </view>
      <view v-if="loadingMore" class="sub__state sub__state--inline">
        <text class="state-txt">加载更多…</text>
      </view>
    </view>
  </view>
</template>

<script>
import {
  adminApprovePhotoVerification,
  adminListPhotoVerifications,
  adminRejectPhotoVerification,
  formatActivityTime,
  getMe,
} from '@/api'
import { displayAvatarUrl } from '@/utils/avatarDisplay'

const REJECT_REASONS = [
  '自拍与头像不一致，请重新拍摄',
  '照片不清晰或非现场拍摄',
  '请重新拍摄',
]

export default {
  name: 'AdminPhotoReviewPanel',
  data() {
    return {
      forbidden: false,
      loading: true,
      loadingMore: false,
      loadError: '',
      list: [],
      page: 1,
      pageSize: 10,
      total: 0,
      actingId: '',
    }
  },
  methods: {
    displayUrl(url) {
      return displayAvatarUrl(url) || url || ''
    },
    formatTime(iso) {
      try {
        return formatActivityTime(iso) || '—'
      } catch {
        return '—'
      }
    },
    preview(item, which) {
      const urls = [item.avatarUrl, item.selfieUrl]
        .filter(Boolean)
        .map((u) => this.displayUrl(u))
        .filter(Boolean)
      if (!urls.length) {
        uni.showToast({ title: '暂无图片', icon: 'none' })
        return
      }
      const current =
        which === 'selfie' && item.selfieUrl
          ? this.displayUrl(item.selfieUrl)
          : this.displayUrl(item.avatarUrl || urls[0])
      uni.previewImage({ urls, current: current || urls[0] })
    },
    async ensureAdmin() {
      const me = await getMe()
      if (!me?.isAdmin) {
        this.forbidden = true
        return false
      }
      return true
    },
    async load(reset = true) {
      if (reset) {
        this.loading = true
        this.loadError = ''
        this.page = 1
        this.list = []
      } else {
        this.loadingMore = true
      }
      try {
        const d = await adminListPhotoVerifications({
          status: 'pending',
          page: this.page,
          pageSize: this.pageSize,
        })
        const rows = Array.isArray(d?.list) ? d.list : []
        this.total = Number(d?.total) || rows.length
        this.list = reset ? rows : [...this.list, ...rows]
      } catch (e) {
        if (reset) {
          this.list = []
          this.loadError = e?.message || '加载失败，请确认后端已部署'
        } else {
          uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
        }
      } finally {
        this.loading = false
        this.loadingMore = false
      }
    },
    async reload() {
      this.forbidden = false
      if (!(await this.ensureAdmin())) return
      await this.load(true)
    },
    loadMore() {
      if (this.loading || this.loadingMore || this.loadError || this.forbidden) return
      if (this.list.length >= this.total) return
      this.page += 1
      this.load(false)
    },
    removeItem(verificationId) {
      this.list = this.list.filter((x) => x.verificationId !== verificationId)
      this.total = Math.max(0, this.total - 1)
      this.$emit('changed')
    },
    async onApprove(item) {
      if (this.actingId) return
      const ok = await new Promise((resolve) => {
        uni.showModal({
          title: '确认通过',
          content: `通过「${item.nickname || '用户'}」的照片验证？`,
          success: (r) => resolve(!!r.confirm),
        })
      })
      if (!ok) return
      this.actingId = item.verificationId
      try {
        await adminApprovePhotoVerification(item.verificationId)
        this.removeItem(item.verificationId)
        uni.showToast({ title: '已通过', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
      } finally {
        this.actingId = ''
      }
    },
    onReject(item) {
      if (this.actingId) return
      uni.showActionSheet({
        itemList: REJECT_REASONS,
        success: (res) => {
          const reason = REJECT_REASONS[res.tapIndex]
          if (reason) this.doReject(item, reason)
        },
      })
    },
    async doReject(item, reason) {
      this.actingId = item.verificationId
      try {
        await adminRejectPhotoVerification(item.verificationId, reason)
        this.removeItem(item.verificationId)
        uni.showToast({ title: '已拒绝', icon: 'none' })
      } catch (e) {
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
      } finally {
        this.actingId = ''
      }
    },
    async init() {
      this.forbidden = false
      this.loading = true
      this.loadError = ''
      try {
        if (!(await this.ensureAdmin())) {
          this.loading = false
          return
        }
        await this.load(true)
      } catch (e) {
        this.loadError = e?.message || '加载失败'
        this.loading = false
      }
    },
  },
  mounted() {
    this.init()
  },
}
</script>

<style lang="scss" scoped>
@import '@/styles/sub-page.scss';

.state-txt {
  display: block;
  font-size: 30rpx;
  color: $wm-text-2;
}

.state-hint {
  display: block;
  margin-top: 16rpx;
  font-size: 24rpx;
  color: $wm-text-3;
  line-height: 1.5;
}

.state-retry {
  margin-top: 32rpx;
  width: 280rpx;
}

.sub__state--inline {
  padding: 24rpx 0 8rpx;
}

.card {
  &__head {
    margin-bottom: 20rpx;
  }

  &__name {
    display: block;
    font-size: 32rpx;
    font-weight: 600;
    color: $wm-text-1;
  }

  &__uid,
  &__time {
    display: block;
    margin-top: 8rpx;
    font-size: 24rpx;
    color: $wm-text-3;
  }

  &__imgs {
    display: flex;
    gap: 20rpx;
    margin-bottom: 24rpx;
  }

  &__actions {
    display: flex;
    gap: 20rpx;
  }

  &__btn {
    flex: 1;
  }
}

.img-box {
  flex: 1;
  text-align: center;

  &__label {
    display: block;
    font-size: 24rpx;
    color: $wm-text-2;
    margin-bottom: 12rpx;
  }

  &__img {
    width: 100%;
    height: 280rpx;
    border-radius: $wm-radius-md;
    background: #f1f5f9;
  }

  &__empty {
    width: 100%;
    height: 280rpx;
    border-radius: $wm-radius-md;
    background: #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26rpx;
    color: $wm-text-3;
  }
}
</style>
