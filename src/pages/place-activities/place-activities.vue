<template>
  <view class="page place-act">
    <view class="place-act__header">
      <view class="place-act__back" @click="goBack">
        <wm-icon name="chevronLeft" :size="34" color="#0f172a" />
      </view>
      <text class="place-act__title">搜地点找活动</text>
      <view class="place-act__placeholder" />
    </view>

    <view class="place-act__search">
      <input
        v-model="searchInput"
        class="place-act__input"
        placeholder="输入城市名或区县，如 大理、朝阳"
        placeholder-class="place-act__input-ph"
        confirm-type="search"
        @confirm="runSearch"
        @input="onSearchInput"
      />
      <view class="place-act__search-btn" @click="runSearch">
        <text>搜索</text>
      </view>
    </view>

    <scroll-view v-if="suggestions.length && !selectedCityCode" class="place-act__suggest" scroll-y>
      <view
        v-for="(s, idx) in suggestions"
        :key="s.cityCode + '-' + idx"
        class="place-act__suggest-row"
        @click="selectPlace(s)"
      >
        <text class="place-act__suggest-name">{{ s.cityName }}</text>
        <text class="place-act__suggest-sub">{{ s.provinceName }}</text>
        <text class="place-act__suggest-code">{{ s.cityCode }}</text>
      </view>
    </scroll-view>

    <view v-else class="place-act__main">
      <view v-if="selectedLabel" class="place-act__pill">
        <text class="place-act__pill-text">已选：{{ selectedLabel }}</text>
        <text class="place-act__pill-change" @click="clearPlace">更换</text>
      </view>

      <scroll-view v-if="selectedCityCode" class="place-act__chips" scroll-x>
        <view class="place-act__chips-inner">
          <view
            v-for="d in dateOptions"
            :key="d.v"
            class="chip"
            :class="{ 'chip--on': dateRange === d.v }"
            @click="setDateRange(d.v)"
          >
            <text>{{ d.label }}</text>
          </view>
          <view
            class="chip"
            :class="{ 'chip--on': !categoryId }"
            @click="setCategory('')"
          >
            <text>全部分类</text>
          </view>
          <view
            v-for="c in categories"
            :key="c.categoryId"
            class="chip"
            :class="{ 'chip--on': categoryId === c.categoryId }"
            @click="setCategory(c.categoryId)"
          >
            <text>{{ c.name }}</text>
          </view>
        </view>
      </scroll-view>

      <view v-if="listLoading" class="place-act__loading">
        <text>加载中…</text>
      </view>

      <view v-else-if="selectedCityCode && !activities.length" class="place-act__empty">
        <text class="place-act__empty-title">这里暂时还没有符合条件的活动</text>
        <text class="place-act__empty-desc">换个日期或分类试试；也可订阅「{{ selectedLabel || selectedCityCode }}」有新活动时提醒你。</text>
        <view class="place-act__btn" @click="onSubscribe">
          <text>订阅新活动</text>
        </view>
      </view>

      <scroll-view v-else class="place-act__list" scroll-y>
        <view class="place-act__summary">
          <text>共 {{ activities.length }} 场 · 点击卡片查看详情</text>
        </view>
        <view
          v-for="item in activities"
          :key="item.id"
          class="card"
          hover-class="card--hover"
          @click="openActivity(item)"
        >
          <view class="card__top">
            <view class="tag-row">
              <view class="tag" :style="{ color: item.tagColor, background: item.tagBg }">
                <text>{{ item.category }}</text>
              </view>
            </view>
            <wm-icon name="chevronRight" :size="30" color="#cbd5e1" />
          </view>
          <text class="card__title">{{ item.title }}</text>
          <view class="meta-row">
            <wm-icon name="clock" :size="26" color="#6366f1" />
            <text>{{ item.time }}</text>
          </view>
          <view class="meta-row">
            <wm-icon name="mapPin" :size="26" color="#6366f1" />
            <text>{{ item.location }}</text>
          </view>
          <view class="card__footer">
            <text>{{ item.joined }}/{{ item.total }}人</text>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import {
  createPlaceActivityAlert,
  getActivities,
  getActivityCategories,
  getPlaceSuggestions,
  mapActivityCard,
} from '@/api'

const DEBOUNCE_MS = 320

export default {
  components: { WmIcon },
  data() {
    return {
      searchInput: '',
      suggestions: [],
      suggestTimer: null,
      selectedCityCode: '',
      selectedLabel: '',
      categories: [],
      categoryId: '',
      dateRange: 'all',
      dateOptions: [
        { v: 'all', label: '全部时间' },
        { v: 'today', label: '今天' },
        { v: 'tomorrow', label: '明天' },
      ],
      activities: [],
      listLoading: false,
    }
  },
  onLoad(query) {
    const q = query || {}
    const cc = (q.cityCode && String(q.cityCode).trim()) || ''
    let lb = ''
    try {
      lb = q.cityLabel ? decodeURIComponent(String(q.cityLabel).replace(/\+/g, ' ')) : ''
    } catch {
      lb = q.cityLabel ? String(q.cityLabel) : ''
    }
    if (cc) {
      this.selectedCityCode = cc
      this.selectedLabel = lb || cc
      this.searchInput = lb || cc
    }
    this.loadCategories()
    if (cc) this.loadList()
  },
  methods: {
    goBack() {
      uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/discover/discover' }) })
    },
    async loadCategories() {
      try {
        const d = await getActivityCategories()
        this.categories = d?.categories || []
      } catch {
        this.categories = []
      }
    },
    onSearchInput() {
      if (this.selectedCityCode) return
      if (this.suggestTimer) clearTimeout(this.suggestTimer)
      this.suggestTimer = setTimeout(() => this.fetchSuggestions(), DEBOUNCE_MS)
    },
    async fetchSuggestions() {
      const q = (this.searchInput || '').trim()
      if (!q) {
        this.suggestions = []
        return
      }
      try {
        const data = await getPlaceSuggestions(q)
        this.suggestions = data?.list || []
      } catch {
        this.suggestions = []
      }
    },
    async runSearch() {
      if (this.suggestTimer) clearTimeout(this.suggestTimer)
      await this.fetchSuggestions()
    },
    selectPlace(s) {
      if (!s || !s.cityCode) return
      this.selectedCityCode = s.cityCode
      this.selectedLabel = s.cityName || s.cityCode
      this.searchInput = this.selectedLabel
      this.suggestions = []
      this.loadList()
    },
    clearPlace() {
      this.selectedCityCode = ''
      this.selectedLabel = ''
      this.activities = []
      this.suggestions = []
    },
    setDateRange(v) {
      this.dateRange = v
      if (this.selectedCityCode) this.loadList()
    },
    setCategory(id) {
      this.categoryId = id || ''
      if (this.selectedCityCode) this.loadList()
    },
    async loadList() {
      if (!this.selectedCityCode) return
      this.listLoading = true
      try {
        const query = {
          cityCode: this.selectedCityCode,
          dateRange: this.dateRange,
          page: 1,
          pageSize: 50,
        }
        if (this.categoryId) query.categoryId = this.categoryId
        const data = await getActivities(query)
        this.activities = (data?.list || []).map(mapActivityCard)
      } catch (e) {
        this.activities = []
        uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
      } finally {
        this.listLoading = false
      }
    },
    openActivity(item) {
      const id = item?.activityId || item?.id
      if (!id) return
      uni.navigateTo({
        url: `/pages/activity-detail/activity-detail?id=${encodeURIComponent(id)}`,
      })
    },
    async onSubscribe() {
      if (!this.selectedCityCode) return
      try {
        await createPlaceActivityAlert({
          cityCode: this.selectedCityCode,
          placeLabel: this.selectedLabel || this.selectedCityCode,
          categoryId: this.categoryId || undefined,
          dateRange: this.dateRange || 'all',
        })
        uni.showToast({ title: '已订阅', icon: 'success' })
      } catch (e) {
        const msg = e?.message || '订阅失败'
        if (e?.statusCode === 401 || msg.includes('登录')) {
          uni.showModal({
            title: '需要登录',
            content: '登录后即可订阅该地点的新活动提醒。',
            confirmText: '去登录',
            success: (res) => {
              if (res.confirm) uni.navigateTo({ url: '/pages/login/login' })
            },
          })
        } else {
          uni.showToast({ title: msg, icon: 'none' })
        }
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.page.place-act {
  min-height: 100vh;
  background: linear-gradient(180deg, #f0f9ff 0%, #ffffff 36%);
  display: flex;
  flex-direction: column;
}

.place-act__header {
  flex-shrink: 0;
  height: calc(96rpx + var(--status-bar-height, 0px) + env(safe-area-inset-top));
  padding: calc(var(--status-bar-height, 0px) + env(safe-area-inset-top)) 24rpx 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: $wm-sticky-header-gradient;
}
.place-act__back,
.place-act__placeholder {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.place-act__title {
  font-size: 32rpx;
  font-weight: 600;
  color: #0f172a;
}

.place-act__search {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 24rpx;
}
.place-act__input {
  flex: 1;
  height: 72rpx;
  padding: 0 24rpx;
  background: #fff;
  border-radius: 999rpx;
  font-size: 28rpx;
  border: 1rpx solid #e2e8f0;
}
.place-act__input-ph {
  color: #94a3b8;
}
.place-act__search-btn {
  padding: 0 28rpx;
  height: 72rpx;
  line-height: 72rpx;
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  color: #fff;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 600;
}

.place-act__suggest {
  flex: 1;
  height: 0;
  padding: 0 24rpx 24rpx;
}
.place-act__suggest-row {
  background: #fff;
  border-radius: 16rpx;
  padding: 22rpx 24rpx;
  margin-bottom: 12rpx;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12rpx;
  box-shadow: 0 4rpx 16rpx rgba(15, 23, 42, 0.05);
}
.place-act__suggest-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #0f172a;
}
.place-act__suggest-sub {
  font-size: 24rpx;
  color: #64748b;
}
.place-act__suggest-code {
  margin-left: auto;
  font-size: 22rpx;
  color: #94a3b8;
}

.place-act__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.place-act__pill {
  margin: 0 24rpx 16rpx;
  padding: 16rpx 20rpx;
  background: #e0f2fe;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.place-act__pill-text {
  font-size: 26rpx;
  color: #0c4a6e;
  flex: 1;
}
.place-act__pill-change {
  font-size: 26rpx;
  color: #0284c7;
  font-weight: 600;
}

.place-act__chips {
  flex-shrink: 0;
  white-space: nowrap;
  margin-bottom: 12rpx;
  max-height: 88rpx;
}
.place-act__chips-inner {
  display: inline-flex;
  gap: 12rpx;
  padding: 0 24rpx 8rpx;
}
.chip {
  display: inline-flex;
  padding: 12rpx 22rpx;
  border-radius: 999rpx;
  background: #fff;
  border: 1rpx solid #e2e8f0;
  font-size: 24rpx;
  color: #475569;
}
.chip--on {
  background: #dbeafe;
  border-color: #93c5fd;
  color: #1d4ed8;
  font-weight: 600;
}

.place-act__loading,
.place-act__empty {
  padding: 48rpx 32rpx;
  text-align: center;
}
.place-act__empty-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 12rpx;
}
.place-act__empty-desc {
  display: block;
  font-size: 26rpx;
  color: #64748b;
  line-height: 1.5;
  margin-bottom: 28rpx;
}
.place-act__btn {
  display: inline-block;
  padding: 20rpx 40rpx;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: #fff;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 600;
}

.place-act__list {
  flex: 1;
  height: 0;
  padding: 0 24rpx 32rpx;
}
.place-act__summary {
  padding: 8rpx 0 16rpx;
  font-size: 24rpx;
  color: #94a3b8;
}

.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 4rpx 20rpx rgba(15, 23, 42, 0.06);
}
.card--hover {
  opacity: 0.92;
}
.card__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}
.tag-row {
  display: flex;
  gap: 8rpx;
}
.tag {
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
}
.card__title {
  font-size: 30rpx;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 12rpx;
}
.meta-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 24rpx;
  color: #64748b;
  margin-top: 6rpx;
}
.card__footer {
  margin-top: 14rpx;
  font-size: 22rpx;
  color: #94a3b8;
}
</style>
