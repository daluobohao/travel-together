<template>
  <view class="page city-hall">
    <view class="city-hall__header">
      <view class="city-hall__back" @click="goBack">
        <text class="city-hall__back-text">返回</text>
      </view>
      <text class="city-hall__title">城市大群</text>
      <text class="city-hall__sub">{{ headerSub }}</text>
    </view>

    <view v-if="loading" class="city-hall__loading">
      <text>加载中…</text>
    </view>

    <!-- 目录：一级省份，展开后二级市/区县（直辖市为区县） -->
    <scroll-view v-else-if="!isDetail" class="city-hall__scroll" scroll-y :enable-flex="true">
      <text v-if="metaTip" class="city-hall__tip city-hall__tip--top">{{ metaTip }}</text>
      <view v-for="block in catalogProvinces" :key="block.provinceCode" class="city-hall__province">
        <view class="city-hall__prov-head" @click="toggleProvince(block)">
          <text class="city-hall__province-name">{{ block.provinceName }}</text>
          <text class="city-hall__prov-meta">{{ block.cities && block.cities.length ? block.cities.length + ' 个' : '' }}</text>
          <text class="city-hall__prov-chev">{{ expandedProvinceCode === block.provinceCode ? '⌄' : '›' }}</text>
        </view>
        <view v-if="expandedProvinceCode === block.provinceCode" class="city-hall__prov-body">
          <view
            v-for="c in block.cities"
            :key="c.cityCode"
            class="city-hall__row city-hall__row--child"
            @click="openCityDetail(c)"
          >
            <view class="city-hall__row-main">
              <text class="city-hall__row-title">{{ c.cityName || c.displayName || c.cityCode }}</text>
              <text v-if="c.joined" class="city-hall__badge">已加入</text>
            </view>
            <text v-if="c.activityId && c.memberCount > 0" class="city-hall__row-meta">{{ c.memberCount }} 人</text>
            <text class="city-hall__row-chev">›</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 单城：查询 / 加入 -->
    <view v-else class="city-hall__body">
      <view class="city-hall__card">
        <text class="city-hall__card-title">{{ detailTitle }}</text>
        <text v-if="metaTip" class="city-hall__tip">{{ metaTip }}</text>
        <text v-if="exists" class="city-hall__meta">{{ lookup.memberCount }} 人已加入</text>
        <text v-else class="city-hall__meta">点「加入」并在确认后进群，与同地址旅人交流。</text>
      </view>

      <view v-if="joined && activityId" class="city-hall__actions">
        <view class="city-hall__btn city-hall__btn--primary" @click="openChat">
          <text>进入群聊</text>
        </view>
      </view>
      <view v-else class="city-hall__actions">
        <view class="city-hall__btn city-hall__btn--primary" @click="onJoin">
          <text>{{ exists ? '加入城市大群' : '加入' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getCityGroupsMeta, getCityHallCatalog, getCityHallLookup, joinCityHall } from '@/api'

export default {
  data() {
    return {
      cityCode: '',
      cityLabel: '',
      loading: true,
      metaTip: '',
      catalogProvinces: [],
      expandedProvinceCode: '',
      exists: false,
      joined: false,
      activityId: '',
      lookup: {},
    }
  },
  computed: {
    isDetail() {
      return !!(this.cityCode && String(this.cityCode).trim())
    },
    headerSub() {
      if (!this.isDetail) return '先点选省份展开，再点市/区县进入'
      const cc = this.cityCode
      const lb = (this.cityLabel && String(this.cityLabel).trim()) || ''
      return lb ? `${cc} · ${lb}` : `${cc} · 同城交流`
    },
    detailTitle() {
      if (this.lookup && this.lookup.displayName) return this.lookup.displayName
      const lb = (this.cityLabel && String(this.cityLabel).trim()) || ''
      if (lb) return `${lb} · 城市大群`
      return `${this.cityCode} · 城市大群`
    },
  },
  onLoad(query) {
    const q = query || {}
    this.cityCode = (q.cityCode && String(q.cityCode).trim()) || ''
    const raw = q.cityLabel != null ? String(q.cityLabel) : ''
    try {
      this.cityLabel = raw ? decodeURIComponent(raw.replace(/\+/g, ' ')) : ''
    } catch {
      this.cityLabel = raw
    }
    this.bootstrap()
  },
  methods: {
    goBack() {
      uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/discover/discover' }) })
    },
    toggleProvince(block) {
      const code = block && block.provinceCode
      if (!code) return
      this.expandedProvinceCode = this.expandedProvinceCode === code ? '' : code
    },
    async bootstrap() {
      this.loading = true
      try {
        const metaP = getCityGroupsMeta().catch(() => null)
        if (!this.isDetail) {
          const [meta, cat] = await Promise.all([metaP, getCityHallCatalog()])
          this.metaTip = meta?.recommendTip || ''
          this.catalogProvinces = cat?.provinces || []
          this.expandedProvinceCode = ''
        } else {
          const [meta, lu] = await Promise.all([metaP, getCityHallLookup(this.cityCode)])
          this.metaTip = meta?.recommendTip || ''
          this.lookup = lu || {}
          this.exists = !!lu?.exists
          this.joined = !!lu?.joined
          this.activityId = lu?.activityId || ''
        }
      } catch (e) {
        uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    openCityDetail(c) {
      const code = c && c.cityCode
      if (!code) return
      const name = (c.cityName && String(c.cityName).trim()) || ''
      const q = [`cityCode=${encodeURIComponent(code)}`]
      if (name) q.push(`cityLabel=${encodeURIComponent(name)}`)
      const url = `/pages/city-hall/city-hall?${q.join('&')}`
      // 用 replace 避免「省列表→市列表→详情」叠多层，返回不会一路退穿
      uni.redirectTo({ url, fail: () => uni.navigateTo({ url }) })
    },
    onJoin() {
      if (this.joined) return
      const name = (this.cityLabel && String(this.cityLabel).trim()) || this.cityCode || '该城市'
      uni.showModal({
        title: '加入城市大群',
        content: `确定加入「${name}」城市大群吗？加入后即可与同地址旅人交流。`,
        confirmText: '加入',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) this.doJoin()
        },
      })
    },
    async doJoin() {
      try {
        uni.showLoading({ title: '加入中…' })
        const data = await joinCityHall(this.cityCode, this.cityLabel)
        this.joined = true
        this.activityId = data?.activityId || ''
        this.exists = true
        this.lookup = {
          ...this.lookup,
          exists: true,
          displayName: data?.displayName,
          memberCount: data?.memberCount,
          joined: true,
          activityId: data?.activityId,
          activityKind: 'city_hall',
        }
        uni.showToast({ title: '已加入', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: e?.message || '加入失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
    openChat() {
      const id = this.activityId || this.lookup?.activityId
      if (!id) return
      const url = `/pages/chat-detail/chat-detail?id=${encodeURIComponent(id)}`
      uni.redirectTo({ url, fail: () => uni.navigateTo({ url }) })
    },
  },
}
</script>

<style scoped>
.page.city-hall {
  min-height: 100vh;
  background: linear-gradient(180deg, #f0f9ff 0%, #ffffff 40%);
  padding: 24rpx 32rpx 48rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}
.city-hall__header {
  flex-shrink: 0;
  margin-bottom: 24rpx;
}
.city-hall__back {
  margin-bottom: 16rpx;
}
.city-hall__back-text {
  font-size: 28rpx;
  color: #6366f1;
}
.city-hall__title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #0f172a;
}
.city-hall__sub {
  display: block;
  margin-top: 8rpx;
  font-size: 26rpx;
  color: #64748b;
}
.city-hall__loading {
  padding: 80rpx 0;
  text-align: center;
  color: #94a3b8;
}
.city-hall__scroll {
  flex: 1;
  height: 0;
  min-height: 45vh;
}
.city-hall__tip--top {
  display: block;
  margin-bottom: 24rpx;
}
.city-hall__province {
  margin-bottom: 16rpx;
}
.city-hall__prov-head {
  display: flex;
  align-items: center;
  background: #e0e7ff;
  border-radius: 20rpx;
  padding: 22rpx 28rpx;
  margin-bottom: 8rpx;
}
.city-hall__province-name {
  flex: 1;
  font-size: 30rpx;
  font-weight: 600;
  color: #312e81;
}
.city-hall__prov-meta {
  font-size: 24rpx;
  color: #6366f1;
  margin-right: 12rpx;
}
.city-hall__prov-chev {
  font-size: 34rpx;
  color: #6366f1;
  line-height: 1;
}
.city-hall__prov-body {
  padding-left: 8rpx;
}
.city-hall__row {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx 28rpx;
  margin-bottom: 12rpx;
  box-shadow: 0 4rpx 20rpx rgba(15, 23, 42, 0.05);
}
.city-hall__row--child {
  margin-left: 8rpx;
}
.city-hall__row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.city-hall__row-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #0f172a;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.city-hall__badge {
  flex-shrink: 0;
  font-size: 22rpx;
  color: #059669;
  background: #d1fae5;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
}
.city-hall__row-meta {
  font-size: 24rpx;
  color: #94a3b8;
  margin-right: 8rpx;
}
.city-hall__row-chev {
  font-size: 36rpx;
  color: #cbd5e1;
  line-height: 1;
}
.city-hall__body {
  flex: 1;
}
.city-hall__card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 8rpx 32rpx rgba(15, 23, 42, 0.06);
}
.city-hall__card-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #0f172a;
}
.city-hall__tip {
  display: block;
  margin-top: 16rpx;
  font-size: 26rpx;
  color: #475569;
  line-height: 1.5;
}
.city-hall__meta {
  display: block;
  margin-top: 20rpx;
  font-size: 26rpx;
  color: #64748b;
}
.city-hall__actions {
  margin-top: 40rpx;
}
.city-hall__btn {
  border-radius: 999rpx;
  padding: 24rpx;
  text-align: center;
  font-size: 30rpx;
}
.city-hall__btn--primary {
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: #fff;
}
</style>
