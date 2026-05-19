<template>
  <view class="picker-page">
    <view class="picker-page__header">
      <view class="search-bar">
        <view class="search-bar__inner">
          <wm-icon name="search" :size="36" color="#94a3b8" />
          <input
            v-model="keyword"
            class="search-bar__input"
            placeholder="搜索店铺或地名"
            confirm-type="search"
            @confirm="onSearch"
          />
        </view>
        <view class="search-bar__btn" @click="onSearch">
          <text>搜索</text>
        </view>
      </view>

      <view class="quick-actions">
        <view class="quick-action" @click="onUseMyLocation">
          <wm-icon name="locate" :size="32" color="#0284c7" />
          <text class="quick-action__text">使用我的位置</text>
        </view>
      </view>
    </view>

    <view class="map-preview">
      <image class="map-preview__image" :src="staticMapUrl" mode="aspectFill" />
      <view class="map-preview__dot"></view>
      <view v-if="locating" class="map-preview__overlay">
        <view class="map-preview__spinner"></view>
        <text class="map-preview__tip">正在定位…</text>
      </view>
    </view>

    <view class="category-filter">
      <scroll-view scroll-x class="category-filter__scroll">
        <view class="category-filter__wrapper">
          <view
            v-for="(cat, idx) in categories"
            :key="idx"
            class="category-filter__item"
            :class="{ 'category-filter__item--active': activeCategory === cat.type }"
            @click="selectCategory(cat.type)"
          >
            <text class="category-filter__icon">{{ cat.icon }}</text>
            <text class="category-filter__label">{{ cat.label }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <scroll-view class="result-list" scroll-y>
      <view v-if="loading" class="result-list__empty">
        <view class="result-list__spinner"></view>
        <text>搜索中...</text>
      </view>
      <view v-else-if="!filteredResults.length" class="result-list__empty">
        <wm-icon name="search" :size="56" color="#cbd5e1" />
        <text class="result-list__empty-text">{{ emptyTip }}</text>
      </view>
      <view
        v-for="(item, index) in filteredResults"
        :key="`${item.id || item.name}-${index}`"
        class="result-item"
        :class="{ 'result-item--selected': selectedResultId === item.id }"
        @click="onChoose(item)"
      >
        <view class="result-item__header">
          <text class="result-item__name">{{ item.name }}</text>
          <view v-if="item.distance" class="result-item__distance">
            <text>{{ formatDistance(item.distance) }}</text>
          </view>
        </view>
        <view class="result-item__meta">
          <text v-if="item.typeTag" class="result-item__tag">{{ item.typeTag }}</text>
          <text v-if="item.address" class="result-item__address">
            {{ item.district ? item.district + ' ' : '' }}{{ item.address }}
          </text>
        </view>
        <view v-if="item.tel" class="result-item__tel">
          <text class="result-item__tel-label">电话：</text>
          <text class="result-item__tel-value">{{ item.tel }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import { getCurrentPositionGcj02, supportsWxLocationScopeApi } from '@/utils/geoLocation'

const AMAP_WEB_KEY = '15fb84dbcfd7a884bbb4133135d0d05f'
const DEFAULT_LOCATION = { lng: 116.397428, lat: 39.90923, name: '天安门' }
const CHINA_BOUNDS = { minLng: 73.5, maxLng: 135.1, minLat: 18.0, maxLat: 53.6 }

const CATEGORIES = [
  { type: 'all', label: '全部', icon: '📍' },
  { type: '050000', label: '餐饮', icon: '🍜' },
  { type: '060000', label: '购物', icon: '🛍️' },
  { type: '080000', label: '休闲', icon: '🎮' },
  { type: '070000', label: '生活', icon: '🏪' },
  { type: '140000', label: '交通', icon: '🚗' },
  { type: '030000', label: '景点', icon: '🏛️' },
]

function isInsideChina(lng, lat) {
  return (
    lng >= CHINA_BOUNDS.minLng &&
    lng <= CHINA_BOUNDS.maxLng &&
    lat >= CHINA_BOUNDS.minLat &&
    lat <= CHINA_BOUNDS.maxLat
  )
}

function getTypeTag(typecode) {
  if (!typecode) return ''
  const prefix = typecode.substring(0, 2)
  const typeMap = {
    '05': '餐饮美食',
    '06': '购物服务',
    '08': '休闲娱乐',
    '07': '生活服务',
    '14': '交通设施',
    '03': '风景名胜',
    '09': '商务住宅',
    '10': '政府机构',
    '15': '科教文化',
    '16': '医疗保健',
    '18': '汽车服务',
  }
  return typeMap[prefix] || ''
}

function formatDistance(meters) {
  if (!meters || meters < 0) return ''
  if (meters >= 1000) {
    return (meters / 1000).toFixed(1) + 'km'
  }
  return Math.round(meters) + 'm'
}

/** 高德 POI 的 adcode，六位国标行政区划码（多为区县；直辖市为区） */
function normalizeAdcode(raw) {
  const s = String(raw || '').trim()
  if (/^\d{6}$/.test(s)) return s
  return ''
}

function normalizeTel(tel) {
  if (!tel) return ''
  if (Array.isArray(tel)) {
    return tel.filter(Boolean).join('; ')
  }
  return String(tel)
}

export default {
  components: { WmIcon },
  data() {
    return {
      keyword: '',
      loading: false,
      locating: false,
      results: [],
      categories: CATEGORIES,
      activeCategory: 'all',
      selectedResultId: '',
      previewLng: DEFAULT_LOCATION.lng,
      previewLat: DEFAULT_LOCATION.lat,
      currentCity: '',
      hasLocated: false,
    }
  },
  computed: {
    filteredResults() {
      if (this.activeCategory === 'all') {
        return this.results
      }
      return this.results.filter((item) => {
        if (!item.typecode) return false
        const prefix = item.typecode.substring(0, 2)
        const categoryPrefix = this.activeCategory.substring(0, 2)
        return prefix === categoryPrefix
      })
    },
    staticMapUrl() {
      const center = `${this.previewLng},${this.previewLat}`
      const markers = this.buildMarkersString()
      const baseUrl = 'https://restapi.amap.com/v3/staticmap'
      const params = {
        location: center,
        zoom: 15,
        size: '750*340',
        markers,
        key: AMAP_WEB_KEY,
      }
      return `${baseUrl}?${Object.keys(params)
        .filter((k) => params[k])
        .map((k) => `${k}=${encodeURIComponent(params[k])}`)
        .join('&')}`
    },
    emptyTip() {
      if (this.keyword) {
        return '未找到相关地点，换个关键词试试'
      }
      if (this.activeCategory !== 'all') {
        return '附近暂无该类型地点，试试其他分类'
      }
      return this.hasLocated ? '附近暂无可显示的地点，试试搜索吧' : '点击上方按钮定位或搜索地点'
    },
  },
  onLoad() {
    this.locateAndLoadNearby()
  },
  methods: {
    buildMarkersString() {
      const center = `${this.previewLng},${this.previewLat}`
      const centerMarker = `mid,0xFF6B6B,A:${center}`

      const poiMarkers = []
      const displayPois = this.filteredResults.slice(0, 9)

      for (let i = 0; i < displayPois.length; i++) {
        const poi = displayPois[i]
        if (!poi.location) continue
        const label = String.fromCharCode(66 + i)
        const color = this.getMarkerColor(poi.typecode)
        poiMarkers.push(`small,${color},${label}:${poi.location}`)
      }

      return [centerMarker, ...poiMarkers].join('|')
    },
    getMarkerColor(typecode) {
      if (!typecode) return '0x6366F1'
      const prefix = typecode.substring(0, 2)
      const colorMap = {
        '05': '0xF59E0B',
        '06': '0x8B5CF6',
        '08': '0xEC4899',
        '07': '0x10B981',
        '14': '0x3B82F6',
        '03': '0x06B6D4',
      }
      return colorMap[prefix] || '0x6366F1'
    },
    selectCategory(type) {
      this.activeCategory = type
    },
    onUseMyLocation() {
      if (this.locating) return
      this.locateAndLoadNearby()
    },
    async locateAndLoadNearby() {
      if (this.locating) return
      this.locating = true
      let usedFallback = false
      let errorMsg = ''
      try {
        const coords = await this.requestLocationWithAuth()
        if (isInsideChina(coords.lng, coords.lat)) {
          this.previewLng = coords.lng
          this.previewLat = coords.lat
          this.hasLocated = true
          await this.loadNearbyPois()
          if (!this.results.length) {
            usedFallback = true
            await this.useFallbackLocation()
            errorMsg = '附近暂无可显示的地点'
          }
        } else {
          usedFallback = true
          await this.useFallbackLocation()
          errorMsg = '定位位置不在中国，已使用默认位置'
        }
      } catch (e) {
        console.warn('[Location] 定位失败，使用默认区域:', e?.message || e)
        usedFallback = true
        errorMsg =
          e?.message ||
          (supportsWxLocationScopeApi()
            ? '定位失败'
            : '无法获取当前位置，已显示默认区域，可搜索选点')
        if (!supportsWxLocationScopeApi() && errorMsg.length > 20) {
          errorMsg = '无法获取当前位置，已显示默认区域，可搜索选点'
        }
        await this.useFallbackLocation()
      } finally {
        this.locating = false
        if (usedFallback && errorMsg) {
          uni.showToast({ title: errorMsg, icon: 'none', duration: 2500 })
        }
      }
    },
    async useFallbackLocation() {
      this.previewLng = DEFAULT_LOCATION.lng
      this.previewLat = DEFAULT_LOCATION.lat
      this.hasLocated = true
      await this.loadNearbyPois()
    },
    async requestLocationWithAuth() {
      if (supportsWxLocationScopeApi()) {
        const settings = await this.getAuthSettings()
        const hasAuth = settings?.scope?.['scope.userLocation']

        if (hasAuth === false) {
          const confirmed = await this.showAuthConfirmDialog()
          if (confirmed) {
            await this.openAuthSetting()
            const newSettings = await this.getAuthSettings()
            if (!newSettings?.scope?.['scope.userLocation']) {
              throw new Error('您拒绝了位置权限授权')
            }
          } else {
            throw new Error('需要位置权限才能定位')
          }
        }
      }

      return getCurrentPositionGcj02()
    },
    getAuthSettings() {
      if (!supportsWxLocationScopeApi()) {
        return Promise.resolve({})
      }
      return new Promise((resolve) => {
        uni.getSetting({
          success: (res) => resolve(res),
          fail: () => resolve({}),
        })
      })
    },
    openAuthSetting() {
      if (!supportsWxLocationScopeApi()) {
        return Promise.resolve({})
      }
      return new Promise((resolve) => {
        uni.openSetting({
          success: (res) => resolve(res),
          fail: () => resolve({}),
        })
      })
    },
    showAuthConfirmDialog() {
      return new Promise((resolve) => {
        uni.showModal({
          title: '需要位置权限',
          content: '为了获取附近的活动地点，需要您授权获取位置信息。是否前往设置？',
          confirmText: '去设置',
          cancelText: '暂不',
          success: (res) => resolve(res.confirm),
          fail: () => resolve(false),
        })
      })
    },
    async loadNearbyPois() {
      try {
        const list = await this.fetchAround(this.previewLng, this.previewLat)
        this.results = (list || []).filter((p) => p?.name)
      } catch (e) {
        console.error('[Nearby] 加载附近地点失败:', e)
      }
    },
    fetchAround(lng, lat) {
      return new Promise((resolve, reject) => {
        uni.request({
          url: 'https://restapi.amap.com/v3/place/around',
          method: 'GET',
          data: {
            key: AMAP_WEB_KEY,
            location: `${lng},${lat}`,
            radius: 2000,
            offset: 30,
            page: 1,
            extensions: 'all',
            sortrule: 'distance',
          },
          success: (res) => {
            const data = res?.data || {}
            if (String(data.status) !== '1') {
              reject(new Error(data.info || '高德接口异常'))
              return
            }
            resolve(
              (data.pois || []).map((p) => ({
                id: p.id,
                name: p.name,
                address: p.address,
                adcode: normalizeAdcode(p.adcode),
                district: [p.cityname, p.adname].filter(Boolean).join(' '),
                location: p.location,
                typecode: p.typecode,
                typeTag: getTypeTag(p.typecode),
                tel: normalizeTel(p.tel),
                distance: p.distance ? Number(p.distance) : null,
              }))
            )
          },
          fail: reject,
        })
      })
    },
    async onSearch() {
      const q = (this.keyword || '').trim()
      if (!q) {
        uni.showToast({ title: '请输入关键词', icon: 'none' })
        return
      }
      this.loading = true
      this.activeCategory = 'all'
      try {
        const tips = await this.fetchTextSearch(q)
        this.results = tips.filter((tip) => tip?.name)
        if (!this.results.length) {
          uni.showToast({ title: '未找到相关地点', icon: 'none' })
          return
        }
        const first = this.results.find((x) => x.location)
        if (first) this.applyPreviewLocation(first.location)
      } catch (e) {
        uni.showToast({ title: '搜索失败，请稍后重试', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    fetchTextSearch(keyword) {
      return new Promise((resolve, reject) => {
        uni.request({
          url: 'https://restapi.amap.com/v3/place/text',
          method: 'GET',
          data: {
            key: AMAP_WEB_KEY,
            keywords: keyword,
            location: `${this.previewLng},${this.previewLat}`,
            offset: 30,
            page: 1,
            extensions: 'all',
          },
          success: (res) => {
            const data = res?.data || {}
            if (String(data.status) !== '1') {
              reject(new Error(data.info || '高德接口异常'))
              return
            }
            resolve(
              (data.pois || []).map((p) => ({
                id: p.id,
                name: p.name,
                address: p.address,
                adcode: normalizeAdcode(p.adcode),
                district: [p.cityname, p.adname].filter(Boolean).join(' '),
                location: p.location,
                typecode: p.typecode,
                typeTag: getTypeTag(p.typecode),
                tel: normalizeTel(p.tel),
              }))
            )
          },
          fail: reject,
        })
      })
    },
    applyPreviewLocation(locationStr) {
      const [lng, lat] = String(locationStr || '').split(',')
      const nextLng = Number(lng)
      const nextLat = Number(lat)
      if (!nextLng || !nextLat) return
      this.previewLng = nextLng
      this.previewLat = nextLat
    },
    onChoose(item) {
      const [lngRaw, latRaw] = String(item.location || '').split(',')
      const lng = Number(lngRaw) || this.previewLng
      const lat = Number(latRaw) || this.previewLat
      uni.setStorageSync('PUBLISH_LOCATION_PICK_RESULT', {
        name: item.name || '',
        address: item.address || '',
        lng,
        lat,
        cityCode: item.adcode || '',
      })
      uni.navigateBack()
    },
    formatDistance,
  },
}
</script>

<style lang="scss" scoped>
.picker-page {
  min-height: 100vh;
  background: transparent;
  padding: calc(24rpx + var(--status-bar-height, 0px) + env(safe-area-inset-top)) 24rpx 24rpx;
  display: flex;
  flex-direction: column;

  &__header {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
    flex-shrink: 0;
  }
}

.search-bar {
  display: flex;
  gap: 16rpx;
  align-items: center;

  &__inner {
    flex: 1;
    height: 88rpx;
    border-radius: $wm-radius-lg;
    background: #ffffff;
    border: $wm-card-edge;
    box-shadow: $wm-shadow-sm;
    padding: 0 20rpx;
    display: flex;
    align-items: center;
    gap: 14rpx;
    transition: all 0.2s;

    &:active {
      border-color: $wm-primary;
      box-shadow: 0 0 0 4rpx rgba(2, 132, 199, 0.1);
    }
  }

  &__input {
    flex: 1;
    height: 100%;
    font-size: 28rpx;
    color: $wm-text-1;
    background: transparent;
    font-weight: 500;
  }

  &__btn {
    height: 88rpx;
    padding: 0 32rpx;
    border-radius: $wm-radius-lg;
    background: $wm-gradient-primary;
    color: #ffffff;
    font-size: 30rpx;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: $wm-shadow-glow;
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);

    &:active {
      transform: scale(0.96);
    }
  }
}

.quick-actions {
  display: flex;
  gap: 12rpx;
}

.quick-action {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 12rpx 20rpx;
  background: #ffffff;
  border-radius: $wm-radius-md;
  border: 2rpx solid rgba(2, 132, 199, 0.2);
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);

  &:active {
    transform: scale(0.97);
    background: $wm-primary-soft;
  }

  &__text {
    font-size: 26rpx;
    color: $wm-primary;
    font-weight: 600;
  }
}

.map-preview {
  margin-top: 20rpx;
  height: 340rpx;
  border-radius: $wm-radius-xl;
  overflow: hidden;
  position: relative;
  background: #e2e8f0;
  flex-shrink: 0;
  box-shadow: $wm-shadow-md;

  &__image {
    width: 100%;
    height: 100%;
  }

  &__dot {
    width: 28rpx;
    height: 28rpx;
    border-radius: 50%;
    background: $wm-primary;
    border: 5rpx solid #ffffff;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    box-shadow: 0 0 0 8rpx rgba(2, 132, 199, 0.25), 0 8rpx 20rpx rgba(2, 132, 199, 0.4);
    animation: map-dot-pulse 2s ease-in-out infinite;
  }

  &__overlay {
    position: absolute;
    inset: 0;
    background: rgba(15, 23, 42, 0.3);
    backdrop-filter: blur(8rpx);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16rpx;
  }

  &__spinner {
    width: 48rpx;
    height: 48rpx;
    border: 4rpx solid rgba(255, 255, 255, 0.3);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  &__tip {
    font-size: 26rpx;
    color: #ffffff;
    font-weight: 600;
  }
}

.category-filter {
  margin-top: 20rpx;
  background: #ffffff;
  border-radius: $wm-radius-lg;
  border: $wm-card-edge;
  padding: 14rpx 0;
  flex-shrink: 0;

  &__scroll {
    white-space: nowrap;
  }

  &__wrapper {
    display: inline-flex;
    gap: 8rpx;
    padding: 0 14rpx;
  }

  &__item {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 100rpx;
    padding: 14rpx 18rpx;
    border-radius: $wm-radius-md;
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);

    &--active {
      background: $wm-primary-soft;

      .category-filter__label {
        color: $wm-primary;
        font-weight: 700;
      }
    }
  }

  &__icon {
    font-size: 34rpx;
    line-height: 1;
  }

  &__label {
    margin-top: 8rpx;
    font-size: 22rpx;
    color: $wm-text-2;
    font-weight: 500;
  }
}

.result-list {
  margin-top: 20rpx;
  flex: 1;
  min-height: 0;

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16rpx;
    padding-top: 100rpx;
    color: $wm-text-3;
    font-size: 26rpx;
  }

  &__empty-text {
    color: $wm-text-3;
    font-size: 26rpx;
  }

  &__spinner {
    width: 40rpx;
    height: 40rpx;
    border: 4rpx solid #e2e8f0;
    border-top-color: $wm-primary;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
}

.result-item {
  background: #ffffff;
  border-radius: $wm-radius-lg;
  padding: 24rpx 26rpx;
  margin-bottom: 14rpx;
  border: $wm-card-edge;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
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

  &--selected {
    border-color: rgba(2, 132, 199, 0.5);
    box-shadow: $wm-shadow-md;

    &::before {
      opacity: 1;
    }
  }

  &:active {
    transform: scale(0.995);

    &::before {
      opacity: 1;
    }
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16rpx;
  }

  &__name {
    flex: 1;
    display: block;
    font-size: 30rpx;
    color: $wm-text-1;
    font-weight: 700;
    line-height: 1.4;
  }

  &__distance {
    flex-shrink: 0;
    padding: 6rpx 14rpx;
    background: $wm-primary-soft;
    border-radius: $wm-radius-sm;
    font-size: 22rpx;
    color: $wm-primary;
    font-weight: 600;
  }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12rpx;
    margin-top: 12rpx;
  }

  &__tag {
    padding: 6rpx 14rpx;
    background: $wm-primary-soft;
    border-radius: $wm-radius-sm;
    font-size: 22rpx;
    color: $wm-primary;
    font-weight: 500;
  }

  &__address {
    flex: 1;
    min-width: 0;
    font-size: 24rpx;
    color: $wm-text-2;
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__tel {
    display: flex;
    align-items: center;
    margin-top: 12rpx;
    padding-top: 12rpx;
    border-top: 1rpx solid $wm-divider;
  }

  &__tel-label {
    font-size: 22rpx;
    color: $wm-text-3;
  }

  &__tel-value {
    font-size: 22rpx;
    color: $wm-primary;
    font-weight: 600;
    margin-left: 4rpx;
  }
}

@keyframes map-dot-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 8rpx rgba(2, 132, 199, 0.25), 0 8rpx 20rpx rgba(2, 132, 199, 0.4);
  }
  50% {
    box-shadow: 0 0 0 16rpx rgba(2, 132, 199, 0.15), 0 8rpx 20rpx rgba(2, 132, 199, 0.4);
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
