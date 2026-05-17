import { getMockEnabled } from '@/api/config'

/** 与 location-picker 一致（高德 Web 服务） */
const AMAP_WEB_KEY = '15fb84dbcfd7a884bbb4133135d0d05f'

export const HOME_LOCATION_KEY = 'HOME_USER_LOCATION'
export const HOME_CITY_CODE_KEY = 'HOME_CITY_CODE'
export const HOME_CITY_NAME_KEY = 'HOME_CITY_NAME'

const MUNICIPALITY_PREFIXES = new Set(['11', '12', '31', '50'])

const FALLBACK = {
  lat: 39.90923,
  lng: 116.397428,
  cityCode: '110000',
  cityName: '北京',
}

function normalizeAdcode(raw) {
  const s = String(raw || '').trim()
  return /^\d{6}$/.test(s) ? s : ''
}

/** 列表筛选用地级市码：普通省 ``xxxx00``；直辖市整市 ``xx0000`` */
export function adcodeToListCityCode(adcode) {
  const s = normalizeAdcode(adcode)
  if (!s) return ''
  const p2 = s.slice(0, 2)
  if (MUNICIPALITY_PREFIXES.has(p2)) return `${p2}0000`
  return `${s.slice(0, 4)}00`
}

function pickCityName(comp) {
  const pick = (v) => (Array.isArray(v) ? v[0] : v) || ''
  return (
    pick(comp.city) ||
    pick(comp.district) ||
    pick(comp.province) ||
    ''
  ).replace(/市$/, '') || pick(comp.province) || ''
}

function fetchRegeo(lat, lng) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: 'https://restapi.amap.com/v3/geocode/regeo',
      method: 'GET',
      data: {
        key: AMAP_WEB_KEY,
        location: `${lng},${lat}`,
        extensions: 'base',
      },
      success: (res) => {
        const data = res?.data || {}
        if (String(data.status) !== '1') {
          reject(new Error(data.info || '逆地理失败'))
          return
        }
        const comp = data.regeocode?.addressComponent || {}
        const adcode = normalizeAdcode(comp.adcode)
        if (!adcode) {
          reject(new Error('未获取到城市编码'))
          return
        }
        resolve({
          adcode,
          cityCode: adcodeToListCityCode(adcode),
          cityName: pickCityName(comp),
        })
      },
      fail: reject,
    })
  })
}

export function getCurrentLocationGcj02() {
  return new Promise((resolve, reject) => {
    uni.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      success: (res) => {
        resolve({
          lat: Number(res.latitude),
          lng: Number(res.longitude),
        })
      },
      fail: reject,
    })
  })
}

export function getCachedHomeCitySync() {
  return readCachedHomeCity()
}

function readCachedHomeCity() {
  const loc = uni.getStorageSync(HOME_LOCATION_KEY)
  const cityCode = String(uni.getStorageSync(HOME_CITY_CODE_KEY) || '').trim()
  const cityName = String(uni.getStorageSync(HOME_CITY_NAME_KEY) || '').trim()
  if (loc?.lat && loc?.lng && cityCode) {
    return {
      lat: Number(loc.lat),
      lng: Number(loc.lng),
      cityCode,
      cityName: cityName || cityCode,
    }
  }
  return null
}

function cacheHomeCity({ lat, lng, cityCode, cityName }) {
  uni.setStorageSync(HOME_LOCATION_KEY, { lat, lng })
  uni.setStorageSync(HOME_CITY_CODE_KEY, cityCode)
  uni.setStorageSync(HOME_CITY_NAME_KEY, cityName || '')
}

/**
 * 首页活动列表用：当前定位城市的 list cityCode（与搜地点目录地级市 / 直辖市整市一致）。
 */
export async function resolveHomeCityForActivities() {
  if (getMockEnabled()) {
    const cached = readCachedHomeCity()
    if (cached) return cached
    cacheHomeCity(FALLBACK)
    return { ...FALLBACK }
  }

  const cached = readCachedHomeCity()
  if (cached) return cached

  try {
    const { lat, lng } = await getCurrentLocationGcj02()
    const geo = await fetchRegeo(lat, lng)
    const ctx = {
      lat,
      lng,
      cityCode: geo.cityCode || adcodeToListCityCode(geo.adcode),
      cityName: geo.cityName || geo.cityCode,
    }
    if (!ctx.cityCode) throw new Error('invalid city code')
    cacheHomeCity(ctx)
    return ctx
  } catch {
    cacheHomeCity(FALLBACK)
    return { ...FALLBACK }
  }
}
