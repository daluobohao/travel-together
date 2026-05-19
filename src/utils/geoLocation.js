const PI = Math.PI
const A = 6378245.0
const EE = 0.00669342162296594323

function outOfChina(lng, lat) {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271
}

function transformLat(lng, lat) {
  let ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng))
  ret +=
    ((20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(lat * PI) + 40.0 * Math.sin((lat / 3.0) * PI)) * 2.0) / 3.0
  ret +=
    ((160.0 * Math.sin((lat / 12.0) * PI) + 320 * Math.sin((lat * PI) / 30.0)) * 2.0) / 3.0
  return ret
}

function transformLng(lng, lat) {
  let ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng))
  ret +=
    ((20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(lng * PI) + 40.0 * Math.sin((lng / 3.0) * PI)) * 2.0) / 3.0
  ret +=
    ((150.0 * Math.sin((lng / 12.0) * PI) + 300.0 * Math.sin((lng / 30.0) * PI)) * 2.0) / 3.0
  return ret
}

/** WGS84（浏览器 GPS）→ GCJ02（高德） */
export function wgs84ToGcj02(lng, lat) {
  const x = Number(lng)
  const y = Number(lat)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { lng: x, lat: y }
  if (outOfChina(x, y)) return { lng: x, lat: y }
  let dlat = transformLat(x - 105.0, y - 35.0)
  let dlng = transformLng(x - 105.0, y - 35.0)
  const radlat = (y / 180.0) * PI
  let magic = Math.sin(radlat)
  magic = 1 - EE * magic * magic
  const sqrtmagic = Math.sqrt(magic)
  dlat = (dlat * 180.0) / (((A * (1 - EE)) / (magic * sqrtmagic)) * PI)
  dlng = (dlng * 180.0) / ((A / sqrtmagic) * Math.cos(radlat) * PI)
  return { lng: x + dlng, lat: y + dlat }
}

export function supportsWxLocationScopeApi() {
  return typeof uni.getSetting === 'function' && typeof uni.openSetting === 'function'
}

function parseBrowserGeoError(err) {
  const code = err?.code
  if (code === 1) return '您拒绝了位置权限，请在浏览器地址栏允许定位'
  if (code === 2) return '无法获取位置，请检查设备定位是否开启'
  if (code === 3) return '定位超时，请稍后重试'
  return err?.message || '定位失败'
}

function parseUniLocationError(err) {
  const errMsg = String(err?.errMsg || err?.message || '')
  const errCode = err?.errCode || err?.code
  if (
    errMsg.includes('auth deny') ||
    errMsg.includes('authorize:fail') ||
    errMsg.includes('permission denied') ||
    errMsg.includes('denied') ||
    errCode === 13
  ) {
    return '您拒绝了位置权限'
  }
  if (errMsg.includes('cancel')) return '已取消定位'
  if (errMsg.includes('timeout') || errCode === 14) return '定位超时，请检查网络'
  if (errMsg.includes('no valid location') || errCode === 12) return '无法获取有效位置'
  if (errMsg.includes('secure') || errMsg.includes('https')) {
    return '定位需要 HTTPS 或 localhost 访问'
  }
  return errMsg || '定位失败，请稍后重试'
}

/** H5：浏览器 Geolocation（WGS84 转 GCJ02） */
export function getBrowserGeolocationGcj02({ timeout = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('当前浏览器不支持定位'))
      return
    }
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      reject(new Error('请使用 HTTPS 或 localhost 访问后再定位'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const gcj = wgs84ToGcj02(pos.coords.longitude, pos.coords.latitude)
        resolve({ lng: gcj.lng, lat: gcj.lat })
      },
      (err) => reject(new Error(parseBrowserGeoError(err))),
      { enableHighAccuracy: true, timeout, maximumAge: 0 },
    )
  })
}

/** uni.getLocation，小程序可传高精度参数 */
export function getUniLocationGcj02({ highAccuracy = false } = {}) {
  return new Promise((resolve, reject) => {
    const opts = { type: 'gcj02' }
    if (highAccuracy && supportsWxLocationScopeApi()) {
      opts.isHighAccuracy = true
      opts.highAccuracyExpireTime = 8000
    }
    uni.getLocation({
      ...opts,
      success: (res) => {
        resolve({
          lng: Number(res.longitude),
          lat: Number(res.latitude),
        })
      },
      fail: (err) => {
        console.error('[geo] uni.getLocation fail:', err)
        reject(new Error(parseUniLocationError(err)))
      },
    })
  })
}

/**
 * 获取当前 GCJ02 坐标。
 * H5 优先浏览器定位；小程序走 uni（调用方自行处理 scope 授权后再调，或传 skipMpAuth 仅 getLocation）。
 */
export async function getCurrentPositionGcj02({ preferBrowser = true } = {}) {
  if (preferBrowser && !supportsWxLocationScopeApi()) {
    try {
      return await getBrowserGeolocationGcj02()
    } catch (browserErr) {
      try {
        return await getUniLocationGcj02({ highAccuracy: false })
      } catch {
        throw browserErr
      }
    }
  }
  return getUniLocationGcj02({ highAccuracy: supportsWxLocationScopeApi() })
}

export { parseUniLocationError as parseLocationError }
