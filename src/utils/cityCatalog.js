import cityHallPrefectures from '@/api/city_hall_prefectures.json'
import { provinceDisplayName } from '@/api/china_province_display.js'

const CITY_BY_CODE = new Map()
const ALL_CATALOG_CITIES = []

for (const blk of cityHallPrefectures) {
  const provinceName = provinceDisplayName(blk.provinceCode)
  for (const c of blk.cities || []) {
    const row = {
      cityCode: String(c.cityCode),
      cityName: c.cityName,
      provinceCode: blk.provinceCode,
      provinceName,
    }
    CITY_BY_CODE.set(row.cityCode, row)
    ALL_CATALOG_CITIES.push(row)
  }
}

/** 同城动态等城市切换：常用城市 */
export const HOT_CATALOG_CITIES = [
  { cityCode: '110000', cityName: '北京市' },
  { cityCode: '310000', cityName: '上海市' },
  { cityCode: '440100', cityName: '广州市' },
  { cityCode: '440300', cityName: '深圳市' },
  { cityCode: '330100', cityName: '杭州市' },
  { cityCode: '510100', cityName: '成都市' },
  { cityCode: '420100', cityName: '武汉市' },
  { cityCode: '610100', cityName: '西安市' },
]

export function getCatalogProvinces() {
  return cityHallPrefectures.map((blk) => ({
    provinceCode: blk.provinceCode,
    provinceName: provinceDisplayName(blk.provinceCode),
    cities: (blk.cities || []).map((c) => ({
      cityCode: String(c.cityCode),
      cityName: c.cityName,
    })),
  }))
}

function normalizeCityKeyword(keyword) {
  return String(keyword || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/(特别行政区|自治州|地区|盟|市)$/g, '')
}

/** 城主徽章用短城名：北京市 → 北京 */
export function cityShortNameForHostBadge(cityName) {
  const name = String(cityName || '').trim()
  const short = name.replace(/(特别行政区|自治州|地区|盟|市)$/g, '')
  return short || name
}

/** 城主徽章文案：北京城主 / 北京副城主 */
export function formatHostBadgeLabel(cityName, role = 'owner') {
  const short = cityShortNameForHostBadge(cityName)
  return role === 'deputy' ? `${short}副城主` : `${short}城主`
}

/** 兼容旧 API：北京市群主 → 北京城主 */
export function normalizeHostBadgeLabel(label, fallback = '城主') {
  let s = String(label || '').trim()
  if (!s) return fallback
  s = s.replace(/副群主/g, '副城主').replace(/群主/g, '城主')
  const m = s.match(/^(.+?)(副?)城主$/)
  if (m) {
    return `${cityShortNameForHostBadge(m[1])}${m[2]}城主`
  }
  return s
}

/** 按城市名 / 省份名搜索目录城市 */
export function searchCatalogCities(keyword, limit = 40) {
  const q = normalizeCityKeyword(keyword)
  if (!q) return []
  const hits = ALL_CATALOG_CITIES.filter((c) => {
    const shortName = c.cityName.replace(/(市|特别行政区)$/g, '')
    return (
      c.cityName.includes(q) ||
      shortName.includes(q) ||
      c.provinceName.includes(q) ||
      c.provinceName.replace(/(省|市|自治区|特别行政区)$/g, '').includes(q)
    )
  })
  return hits.slice(0, limit)
}

export function findCatalogCityByKeyword(keyword) {
  const q = normalizeCityKeyword(keyword)
  if (!q) return null
  const exact = ALL_CATALOG_CITIES.find((c) => {
    const shortName = c.cityName.replace(/(市|特别行政区)$/g, '')
    return shortName === q || c.cityName === q || c.cityName === `${q}市`
  })
  if (exact) return exact
  const list = searchCatalogCities(keyword, 1)
  return list[0] || null
}

/** 地级市 / 直辖市名称（与城市大群 cityCode 对齐） */
export function resolveCityHallCityName(cityCode) {
  const hit = CITY_BY_CODE.get(String(cityCode || '').trim())
  return hit?.cityName || ''
}

export function resolveCityHallProvinceName(cityCode) {
  const hit = CITY_BY_CODE.get(String(cityCode || '').trim())
  return hit?.provinceName || ''
}

export function resolveCityHallMeta(cityCode) {
  const hit = CITY_BY_CODE.get(String(cityCode || '').trim())
  return hit || null
}

/** POI/商圈名与地级市名不同时，保留为「你在附近」提示 */
export function normalizePlaceHint(placeName, cityName) {
  const place = String(placeName || '').trim()
  const city = String(cityName || '').trim()
  if (!place || !city) return ''
  if (place === city) return ''
  if (city.includes(place) || place.includes(city.replace(/市$/, ''))) return ''
  return place
}
