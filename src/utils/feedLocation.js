/** 同城动态发布选点：与 location-picker 约定 storage key */

export const FEED_LOCATION_PICK_KEY = 'FEED_LOCATION_PICK_RESULT'

export function readFeedLocationPickResult() {
  const picked = uni.getStorageSync(FEED_LOCATION_PICK_KEY)
  if (!picked || picked.lat == null || picked.lng == null) return null
  const lat = Number(picked.lat)
  const lng = Number(picked.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const locationName = String(picked.name || picked.locationName || '').trim()
  if (!locationName) return null
  return {
    locationName,
    address: String(picked.address || '').trim() || null,
    lat,
    lng,
  }
}

export function clearFeedLocationPickResult() {
  try {
    uni.removeStorageSync(FEED_LOCATION_PICK_KEY)
  } catch (e) {
    /* ignore */
  }
}

export function openFeedLocationOnMap(item) {
  const lat = Number(item?.lat)
  const lng = Number(item?.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    uni.showToast({ title: '无法打开地图', icon: 'none' })
    return
  }
  uni.openLocation({
    latitude: lat,
    longitude: lng,
    name: item?.locationName || '位置',
    address: item?.address || '',
    scale: 16,
    fail: () => {
      uni.showToast({ title: '打开地图失败', icon: 'none' })
    },
  })
}

export function buildFeedLocationPayload(location) {
  if (!location?.locationName) return {}
  const lat = Number(location.lat)
  const lng = Number(location.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { locationName: location.locationName }
  }
  return {
    locationName: location.locationName,
    lat,
    lng,
  }
}
