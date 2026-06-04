import { getMockEnabled } from '@/api/config'
import { resolveCityHallCityName } from '@/utils/cityCatalog'

/** 与 location-picker 一致（高德 Web 服务） */
const AMAP_WEB_KEY = '15fb84dbcfd7a884bbb4133135d0d05f'

export const HOME_LOCATION_KEY = 'HOME_USER_LOCATION'
export const HOME_CITY_CODE_KEY = 'HOME_CITY_CODE'
export const HOME_CITY_NAME_KEY = 'HOME_CITY_NAME'
/** 首页搜地点锚点（与 GPS 缓存独立，见 PRD 首页搜地点） */
export const HOME_SEARCH_ANCHOR_KEY = 'HOME_SEARCH_ANCHOR'

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
export function getHomeSearchAnchorSync() {
  const raw = uni.getStorageSync(HOME_SEARCH_ANCHOR_KEY)
  if (!raw || raw.lat == null || raw.lng == null) return null
  const cityCode = String(raw.cityCode || '').trim()
  if (!cityCode) return null
  return {
    lat: Number(raw.lat),
    lng: Number(raw.lng),
    cityCode,
    displayName: String(raw.displayName || raw.cityName || cityCode).trim(),
    address: String(raw.address || '').trim(),
    updatedAt: raw.updatedAt,
  }
}

export function clearHomeSearchAnchor() {
  uni.removeStorageSync(HOME_SEARCH_ANCHOR_KEY)
}

/**
 * 首页活动列表锚点：搜索地点优先，否则 GPS（resolveHomeCityForActivities）。
 * @returns {Promise<{ source: 'search'|'gps', lat: number, lng: number, cityCode: string, displayName: string, cityName?: string }>}
 */
export async function resolveCoordsToListCityCode(lat, lng) {
  const geo = await fetchRegeo(lat, lng)
  return {
    cityCode: geo.cityCode || adcodeToListCityCode(geo.adcode),
    cityName: geo.cityName || geo.cityCode,
    adcode: geo.adcode,
  }
}

export async function getHomeActivityAnchor() {
  const search = getHomeSearchAnchorSync()
  if (search) {
    const cityName = resolveCityHallCityName(search.cityCode)
    return {
      source: 'search',
      lat: search.lat,
      lng: search.lng,
      cityCode: search.cityCode,
      displayName: search.displayName,
      cityName: cityName || search.displayName,
      placeName: search.displayName,
    }
  }
  const gps = await resolveHomeCityForActivities()
  const name = (gps.cityName && String(gps.cityName).trim()) || gps.cityCode
  return {
    source: 'gps',
    lat: gps.lat,
    lng: gps.lng,
    cityCode: gps.cityCode,
    displayName: name,
    cityName: gps.cityName,
  }
}

/** 城市大群全国目录页：带上当前位置锚点（nearCity* 参数，与单城详情 cityCode 区分） */
export function buildCityHallCatalogUrl(anchor) {
  const code = (anchor?.cityCode && String(anchor.cityCode).trim()) || ''
  const q = []
  if (code) q.push(`nearCityCode=${encodeURIComponent(code)}`)
  const catalogName = code ? resolveCityHallCityName(code) : ''
  const label =
    catalogName ||
    (anchor?.cityName && String(anchor.cityName).trim()) ||
    (anchor?.displayName && String(anchor.displayName).trim()) ||
    ''
  if (label) q.push(`nearCityLabel=${encodeURIComponent(label)}`)
  const place =
    anchor?.source === 'search' && anchor?.displayName
      ? String(anchor.displayName).trim()
      : ''
  if (place && place !== (catalogName || label)) {
    q.push(`nearPlaceName=${encodeURIComponent(place)}`)
  }
  return q.length ? `/pages/city-hall/city-hall?${q.join('&')}` : '/pages/city-hall/city-hall'
}

/** 同城动态 Tab 城市锚点（与首页搜地点独立） */
export const FEED_CITY_ANCHOR_KEY = 'FEED_CITY_ANCHOR'

export function getFeedCityAnchorSync() {
  const raw = uni.getStorageSync(FEED_CITY_ANCHOR_KEY)
  if (!raw) return null
  const cityCode = String(raw.cityCode || '').trim()
  if (!cityCode) return null
  return {
    lat: raw.lat != null ? Number(raw.lat) : null,
    lng: raw.lng != null ? Number(raw.lng) : null,
    cityCode,
    displayName: String(raw.displayName || raw.cityName || cityCode).trim(),
    updatedAt: raw.updatedAt,
  }
}

export function setFeedCityAnchor(anchor) {
  const cityCode = String(anchor?.cityCode || '').trim()
  if (!cityCode) return
  uni.setStorageSync(FEED_CITY_ANCHOR_KEY, {
    lat: anchor.lat != null ? Number(anchor.lat) : null,
    lng: anchor.lng != null ? Number(anchor.lng) : null,
    cityCode,
    displayName: String(anchor.displayName || anchor.cityName || cityCode).trim(),
    updatedAt: Date.now(),
  })
}

export function clearFeedCityAnchor() {
  uni.removeStorageSync(FEED_CITY_ANCHOR_KEY)
}

/** 同城动态列表用：动态 Tab 已选城市优先，否则跟随首页锚点 / GPS */
export async function resolveFeedCityAnchor() {
  const cached = getFeedCityAnchorSync()
  if (cached) return { ...cached, source: 'feed' }
  const home = await getHomeActivityAnchor()
  return {
    lat: home.lat,
    lng: home.lng,
    cityCode: home.cityCode,
    displayName: home.displayName,
    source: home.source || 'default',
  }
}

export async function resolveHomeCityForActivities(options = {}) {
  const forceRefresh = !!options.forceRefresh
  if (getMockEnabled()) {
    const cached = readCachedHomeCity()
    if (cached && !forceRefresh) return cached
    cacheHomeCity(FALLBACK)
    return { ...FALLBACK }
  }

  const cached = readCachedHomeCity()
  if (cached && !forceRefresh) return cached

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
    if (cached) return cached
    cacheHomeCity(FALLBACK)
    return { ...FALLBACK }
  }
}
