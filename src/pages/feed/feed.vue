<template>
  <view class="page feed-redirect" />
</template>

<script>
import { resolveCityHallCityName } from '@/utils/cityCatalog'
import { setFeedCityAnchor } from '@/utils/homeCity'

/** 兼容旧链接：/pages/feed/feed → 同城动态 Tab */
export default {
  onLoad(options) {
    if (options?.cityCode) {
      setFeedCityAnchor({
        cityCode: options.cityCode,
        displayName:
          options.displayName ||
          resolveCityHallCityName(options.cityCode) ||
          options.cityCode,
      })
    }
    uni.switchTab({ url: '/pages/discover/discover' })
  },
}
</script>
