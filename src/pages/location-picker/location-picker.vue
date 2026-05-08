<template>
  <view class="picker-page">
    <view class="search-bar">
      <input
        v-model="keyword"
        class="search-input"
        placeholder="搜索店铺或地名"
        confirm-type="search"
        @confirm="onSearch"
      />
      <view class="search-btn" @click="onSearch">搜索</view>
    </view>

    <view class="map-preview">
      <image class="map-image" :src="staticMapUrl" mode="aspectFill" />
      <view class="map-center-dot"></view>
    </view>

    <view v-if="locating" class="locating-tip">正在定位你的位置…</view>

    <scroll-view class="result-list" scroll-y>
      <view v-if="loading" class="list-empty">搜索中...</view>
      <view v-else-if="!results.length" class="list-empty">{{ emptyTip }}</view>
      <view
        v-for="(item, index) in results"
        :key="`${item.id || item.name}-${index}`"
        class="result-item"
        @click="onChoose(item)"
      >
        <text class="result-name">{{ item.name }}</text>
        <text class="result-address">{{ item.district || item.address || '暂无地址信息' }}</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
const AMAP_WEB_KEY = '15fb84dbcfd7a884bbb4133135d0d05f'
// 默认天安门坐标（高德数据仅覆盖国内，海外/无定位会回退到这里）
const DEFAULT_LOCATION = { lng: 116.397428, lat: 39.90923, name: '天安门' }
const CHINA_BOUNDS = { minLng: 73.5, maxLng: 135.1, minLat: 18.0, maxLat: 53.6 }

function isInsideChina(lng, lat) {
  return (
    lng >= CHINA_BOUNDS.minLng &&
    lng <= CHINA_BOUNDS.maxLng &&
    lat >= CHINA_BOUNDS.minLat &&
    lat <= CHINA_BOUNDS.maxLat
  )
}

export default {
  data() {
    return {
      keyword: '',
      loading: false,
      locating: false,
      results: [],
      previewLng: DEFAULT_LOCATION.lng,
      previewLat: DEFAULT_LOCATION.lat,
      currentCity: '',
      hasLocated: false,
    }
  },
  computed: {
    staticMapUrl() {
      const center = `${this.previewLng},${this.previewLat}`
      return `https://restapi.amap.com/v3/staticmap?location=${center}&zoom=15&size=750*340&markers=mid,0x6366f1,A:${center}&key=${AMAP_WEB_KEY}`
    },
    emptyTip() {
      return this.hasLocated ? '附近暂无可显示的地点，试试搜索吧' : '输入关键词搜索附近地点'
    },
  },
  onLoad() {
    this.locateAndLoadNearby()
  },
  methods: {
    async locateAndLoadNearby() {
      this.locating = true
      let usedFallback = false
      try {
        const coords = await this.getCurrentLocation()
        if (isInsideChina(coords.lng, coords.lat)) {
          this.previewLng = coords.lng
          this.previewLat = coords.lat
          this.hasLocated = true
          await this.loadNearbyPois()
          if (!this.results.length) {
            usedFallback = true
            await this.useFallbackLocation()
          }
        } else {
          usedFallback = true
          await this.useFallbackLocation()
        }
      } catch (e) {
        usedFallback = true
        await this.useFallbackLocation()
      } finally {
        this.locating = false
        if (usedFallback) {
          uni.showToast({ title: '已使用默认位置：天安门', icon: 'none' })
        }
      }
    },
    async useFallbackLocation() {
      this.previewLng = DEFAULT_LOCATION.lng
      this.previewLat = DEFAULT_LOCATION.lat
      this.hasLocated = true
      await this.loadNearbyPois()
    },
    getCurrentLocation() {
      return new Promise((resolve, reject) => {
        // #ifdef H5
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              resolve({
                lng: Number(pos.coords.longitude),
                lat: Number(pos.coords.latitude),
              })
            },
            (err) => reject(err),
            { enableHighAccuracy: true, timeout: 8000 }
          )
          return
        }
        // #endif
        uni.getLocation({
          type: 'gcj02',
          success: (res) => resolve({ lng: Number(res.longitude), lat: Number(res.latitude) }),
          fail: reject,
        })
      })
    },
    async loadNearbyPois() {
      try {
        const list = await this.fetchAround(this.previewLng, this.previewLat)
        this.results = (list || []).filter((p) => p?.name)
      } catch (e) {
        // 失败不阻塞，用户仍可手动搜索
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
            offset: 20,
            page: 1,
            extensions: 'base',
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
                district: [p.cityname, p.adname].filter(Boolean).join(' '),
                location: p.location,
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
      try {
        const tips = await this.fetchInputTips(q)
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
    fetchInputTips(keyword) {
      return new Promise((resolve, reject) => {
        uni.request({
          url: 'https://restapi.amap.com/v3/assistant/inputtips',
          method: 'GET',
          data: {
            key: AMAP_WEB_KEY,
            keywords: keyword,
            location: `${this.previewLng},${this.previewLat}`,
            datatype: 'all',
          },
          success: (res) => {
            const data = res?.data || {}
            if (String(data.status) !== '1') {
              reject(new Error(data.info || '高德接口异常'))
              return
            }
            resolve(data.tips || [])
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
        lng,
        lat,
      })
      uni.navigateBack()
    },
  },
}
</script>

<style lang="scss" scoped>
.picker-page {
  min-height: 100vh;
  background: transparent;
  padding: 20rpx 24rpx 24rpx;
}

.search-bar {
  display: flex;
  gap: 16rpx;
  align-items: center;
}

.search-input {
  flex: 1;
  height: 80rpx;
  border-radius: 16rpx;
  background: #ffffff;
  border: $wm-card-edge;
  box-shadow: $wm-shadow-sm;
  padding: 0 22rpx;
  font-size: 28rpx;
  color: #0f172a;
}

.search-btn {
  height: 80rpx;
  padding: 0 24rpx;
  border-radius: 16rpx;
  background: #6366f1;
  color: #ffffff;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.map-preview {
  margin-top: 20rpx;
  height: 340rpx;
  border-radius: 20rpx;
  overflow: hidden;
  position: relative;
  background: #e2e8f0;
}

.map-image {
  width: 100%;
  height: 100%;
}

.map-center-dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  background: #ef4444;
  border: 4rpx solid #ffffff;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}

.locating-tip {
  margin-top: 16rpx;
  padding: 12rpx 20rpx;
  background: #eef2ff;
  border-radius: 12rpx;
  font-size: 24rpx;
  color: #4f46e5;
}

.result-list {
  margin-top: 20rpx;
  height: calc(100vh - 520rpx);
}

.list-empty {
  text-align: center;
  color: #94a3b8;
  font-size: 26rpx;
  padding-top: 80rpx;
}

.result-item {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 14rpx;
}

.result-name {
  display: block;
  font-size: 28rpx;
  color: #0f172a;
  font-weight: 600;
}

.result-address {
  margin-top: 8rpx;
  display: block;
  font-size: 24rpx;
  color: #64748b;
}
</style>
