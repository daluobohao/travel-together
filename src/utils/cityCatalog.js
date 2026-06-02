import cityHallPrefectures from '@/api/city_hall_prefectures.json'
import { provinceDisplayName } from '@/api/china_province_display.js'

const CITY_BY_CODE = new Map()

for (const blk of cityHallPrefectures) {
  for (const c of blk.cities || []) {
    CITY_BY_CODE.set(String(c.cityCode), {
      cityName: c.cityName,
      provinceCode: blk.provinceCode,
      provinceName: provinceDisplayName(blk.provinceCode),
    })
  }
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
