/** 聊天发定位：与 location-picker 约定 storage key */

export const CHAT_LOCATION_PICK_KEY = 'CHAT_LOCATION_PICK_RESULT'

export function readChatLocationPickResult() {
  const picked = uni.getStorageSync(CHAT_LOCATION_PICK_KEY)
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

export function clearChatLocationPickResult() {
  try {
    uni.removeStorageSync(CHAT_LOCATION_PICK_KEY)
  } catch (e) {
    /* ignore */
  }
}

export function openChatLocationOnMap(msg) {
  const lat = Number(msg?.lat)
  const lng = Number(msg?.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    uni.showToast({ title: '无法打开地图', icon: 'none' })
    return
  }
  uni.openLocation({
    latitude: lat,
    longitude: lng,
    name: msg?.locationName || '位置',
    address: msg?.address || '',
    scale: 16,
    fail: () => {
      uni.showToast({ title: '打开地图失败', icon: 'none' })
    },
  })
}

export function buildLocationMessagePayload(loc) {
  return {
    msgType: 'location',
    locationName: loc.locationName,
    address: loc.address,
    lat: loc.lat,
    lng: loc.lng,
  }
}
