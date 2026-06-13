import { API_BASE_URL, getAccessToken, getMockEnabled } from './config'

function parseUploadBody(raw) {
  let body = raw
  if (typeof raw === 'string') {
    try {
      body = JSON.parse(raw)
    } catch {
      throw new Error('上传失败')
    }
  }
  if (body && typeof body.code !== 'undefined' && body.code !== 0) {
    throw new Error(body.message || '上传失败')
  }
  return body?.data
}

function parseUploadError(res) {
  let msg = `上传失败（${res.statusCode}）`
  try {
    const errBody = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
    if (errBody?.detail) {
      msg = typeof errBody.detail === 'string' ? errBody.detail : msg
    } else if (errBody?.message) {
      msg = errBody.message
    }
  } catch {
    /* ignore */
  }
  return msg
}

export function uploadActivityImage(tempFilePath) {
  if (getMockEnabled()) {
    return Promise.resolve({ imageUrl: tempFilePath })
  }
  const token = getAccessToken()
  if (!token) return Promise.reject(new Error('请先登录'))
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${API_BASE_URL}/me/activity/images`,
      filePath: tempFilePath,
      name: 'file',
      header: { Authorization: `Bearer ${token}` },
      success: (res) => {
        if (res.statusCode === 401) {
          reject(new Error('请先登录'))
          return
        }
        if (res.statusCode === 429) {
          reject(new Error('操作过于频繁，请稍后再试'))
          return
        }
        if (res.statusCode === 413) {
          reject(new Error('图片过大，请换一张较小的照片'))
          return
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(parseUploadError(res)))
          return
        }
        try {
          resolve(parseUploadBody(res.data))
        } catch (e) {
          reject(e)
        }
      },
      fail: (err) => reject(new Error(err?.errMsg || '上传失败')),
    })
  })
}
