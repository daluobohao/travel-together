<template>
  <view v-if="visible" class="fcp" @touchmove.stop.prevent="noop">
    <view class="fcp__mask" :class="{ 'fcp__mask--in': animating }" @click="onClose" />
    <view class="fcp__panel" :class="{ 'fcp__panel--in': animating }">
      <view class="fcp__handle" />
      <text class="fcp__title">切换城市</text>

      <view class="fcp__search">
        <wm-icon name="search" :size="32" color="#94a3b8" />
        <input
          v-model="keyword"
          class="fcp__search-input"
          placeholder="搜索城市，如上海、杭州"
          placeholder-class="fcp__search-ph"
          confirm-type="search"
          :focus="focusSearch"
          @confirm="onSearchConfirm"
        />
        <view v-if="keyword" class="fcp__search-clear" @click="clearKeyword">
          <wm-icon name="close" :size="24" color="#94a3b8" />
        </view>
      </view>

      <view class="fcp__locate" hover-class="fcp__locate--hover" @click="onUseLocation">
        <wm-icon name="locate" :size="32" color="#0284c7" />
        <text>使用当前定位</text>
      </view>

      <scroll-view class="fcp__scroll" scroll-y :show-scrollbar="false">
        <template v-if="keyword.trim()">
          <view v-if="!searchResults.length" class="fcp__empty">
            <text>未找到「{{ keyword.trim() }}」，换个关键词试试</text>
          </view>
          <view
            v-for="c in searchResults"
            :key="c.cityCode"
            class="fcp__row"
            hover-class="fcp__row--hover"
            @click="onPick(c)"
          >
            <view class="fcp__row-main">
              <text class="fcp__row-name">{{ c.cityName }}</text>
              <text class="fcp__row-prov">{{ c.provinceName }}</text>
            </view>
            <text v-if="c.cityCode === currentCityCode" class="fcp__row-tag">当前</text>
          </view>
        </template>

        <template v-else>
          <text class="fcp__section-label">热门城市</text>
          <view class="fcp__hot">
            <view
              v-for="c in hotCities"
              :key="c.cityCode"
              class="fcp__hot-chip"
              :class="{ 'fcp__hot-chip--on': c.cityCode === currentCityCode }"
              hover-class="fcp__hot-chip--hover"
              @click="onPick(c)"
            >
              <text>{{ shortCityName(c.cityName) }}</text>
            </view>
          </view>

          <text class="fcp__section-label">全部城市</text>
          <view v-for="block in provinces" :key="block.provinceCode" class="fcp__province">
            <view class="fcp__prov-head" @click="toggleProvince(block.provinceCode)">
              <text class="fcp__prov-name">{{ block.provinceName }}</text>
              <text class="fcp__prov-chev">{{ expandedProvince === block.provinceCode ? '⌄' : '›' }}</text>
            </view>
            <view v-if="expandedProvince === block.provinceCode" class="fcp__prov-body">
              <view
                v-for="c in block.cities"
                :key="c.cityCode"
                class="fcp__row fcp__row--child"
                hover-class="fcp__row--hover"
                @click="onPick(c)"
              >
                <text class="fcp__row-name">{{ c.cityName }}</text>
                <text v-if="c.cityCode === currentCityCode" class="fcp__row-tag">当前</text>
              </view>
            </view>
          </view>
        </template>
      </scroll-view>
    </view>
  </view>
</template>

<script>
import WmIcon from '../WmIcon/WmIcon.vue'
import {
  getCatalogProvinces,
  HOT_CATALOG_CITIES,
  searchCatalogCities,
  findCatalogCityByKeyword,
} from '@/utils/cityCatalog'
import { resolveHomeCityForActivities } from '@/utils/homeCity'

export default {
  name: 'FeedCityPickerSheet',
  components: { WmIcon },
  props: {
    visible: { type: Boolean, default: false },
    currentCityCode: { type: String, default: '' },
    focusSearch: { type: Boolean, default: false },
  },
  emits: ['update:visible', 'pick'],
  data() {
    return {
      animating: false,
      keyword: '',
      expandedProvince: '',
      hotCities: HOT_CATALOG_CITIES,
      provinces: getCatalogProvinces(),
    }
  },
  computed: {
    searchResults() {
      return searchCatalogCities(this.keyword)
    },
  },
  watch: {
    visible(v) {
      if (v) {
        this.animating = false
        this.$nextTick(() => {
          setTimeout(() => {
            this.animating = true
          }, 20)
        })
      } else {
        this.animating = false
        this.keyword = ''
        this.expandedProvince = ''
      }
    },
  },
  methods: {
    noop() {},
    shortCityName(name) {
      return String(name || '').replace(/(市|特别行政区)$/g, '')
    },
    onClose() {
      this.$emit('update:visible', false)
    },
    clearKeyword() {
      this.keyword = ''
    },
    toggleProvince(code) {
      this.expandedProvince = this.expandedProvince === code ? '' : code
    },
    onPick(c) {
      if (!c?.cityCode) return
      this.$emit('pick', {
        cityCode: c.cityCode,
        displayName: c.cityName || c.cityCode,
      })
      this.$emit('update:visible', false)
    },
    onSearchConfirm() {
      const hit = findCatalogCityByKeyword(this.keyword)
      if (hit) {
        this.onPick(hit)
        return
      }
      if (this.searchResults.length === 1) {
        this.onPick(this.searchResults[0])
      }
    },
    async onUseLocation() {
      uni.showLoading({ title: '定位中…', mask: true })
      try {
        const gps = await resolveHomeCityForActivities({ forceRefresh: true })
        this.onPick({
          cityCode: gps.cityCode,
          displayName: gps.cityName || gps.cityCode,
        })
      } catch (_) {
        uni.showToast({ title: '定位失败，请手动选择城市', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.fcp {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;

  &__mask {
    position: absolute;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    opacity: 0;
    transition: opacity 0.25s ease;

    &--in {
      opacity: 1;
    }
  }

  &__panel {
    position: relative;
    z-index: 1;
    height: 78vh;
    max-height: 1100rpx;
    background: #ffffff;
    border-radius: 32rpx 32rpx 0 0;
    padding: 16rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
    box-shadow: 0 -16rpx 48rpx rgba(15, 23, 42, 0.12);
    transform: translateY(100%);
    transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
    display: flex;
    flex-direction: column;

    &--in {
      transform: translateY(0);
    }
  }

  &__handle {
    width: 64rpx;
    height: 8rpx;
    margin: 0 auto 20rpx;
    border-radius: 999rpx;
    background: rgba(148, 163, 184, 0.45);
  }

  &__title {
    font-size: 34rpx;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 20rpx;
  }

  &__search {
    display: flex;
    align-items: center;
    gap: 12rpx;
    padding: 18rpx 20rpx;
    background: #f8fafc;
    border-radius: 20rpx;
    border: 1rpx solid rgba(148, 163, 184, 0.22);
    margin-bottom: 16rpx;
  }

  &__search-input {
    flex: 1;
    font-size: 28rpx;
    color: #0f172a;
    min-width: 0;
  }

  &__search-ph {
    color: #94a3b8;
  }

  &__search-clear {
    padding: 8rpx;
  }

  &__locate {
    display: flex;
    align-items: center;
    gap: 10rpx;
    padding: 16rpx 4rpx 20rpx;
    font-size: 28rpx;
    color: #0284c7;
    font-weight: 600;

    &--hover {
      opacity: 0.75;
    }
  }

  &__scroll {
    flex: 1;
    min-height: 0;
  }

  &__section-label {
    display: block;
    font-size: 24rpx;
    color: #94a3b8;
    margin: 8rpx 0 16rpx;
  }

  &__hot {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
    margin-bottom: 24rpx;
  }

  &__hot-chip {
    padding: 14rpx 28rpx;
    border-radius: 999rpx;
    background: #f1f5f9;
    font-size: 28rpx;
    color: #334155;

    &--on {
      background: rgba(2, 132, 199, 0.12);
      color: #0284c7;
      font-weight: 700;
    }

    &--hover {
      background: #e2e8f0;
    }
  }

  &__province {
    margin-bottom: 8rpx;
  }

  &__prov-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 22rpx 0;
    border-bottom: 1rpx solid rgba(148, 163, 184, 0.16);
  }

  &__prov-name {
    font-size: 30rpx;
    color: #0f172a;
    font-weight: 600;
  }

  &__prov-chev {
    font-size: 28rpx;
    color: #94a3b8;
  }

  &__prov-body {
    padding-bottom: 8rpx;
  }

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16rpx;
    padding: 22rpx 0;
    border-bottom: 1rpx solid rgba(148, 163, 184, 0.12);

    &--child {
      padding-left: 16rpx;
    }

    &--hover {
      background: #f8fafc;
    }
  }

  &__row-main {
    flex: 1;
    min-width: 0;
  }

  &__row-name {
    display: block;
    font-size: 30rpx;
    color: #0f172a;
  }

  &__row-prov {
    display: block;
    margin-top: 4rpx;
    font-size: 24rpx;
    color: #94a3b8;
  }

  &__row-tag {
    flex-shrink: 0;
    font-size: 22rpx;
    color: #0284c7;
    background: rgba(2, 132, 199, 0.1);
    padding: 4rpx 12rpx;
    border-radius: 999rpx;
  }

  &__empty {
    padding: 48rpx 16rpx;
    text-align: center;
    font-size: 28rpx;
    color: #94a3b8;
    line-height: 1.6;
  }
}
</style>
