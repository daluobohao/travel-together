import { API_BASE_URL, getAccessToken, getMockEnabled } from './config'
import { wmDB } from '@/mock/wandermeet-db'

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

function uploadMyAvatar(tempFilePath) {
  const token = getAccessToken()
  if (!token) {
    return Promise.reject(new Error('请先登录'))
  }

  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${API_BASE_URL}/me/avatar`,
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
          reject(new Error(msg))
          return
        }
        try {
          resolve(parseUploadBody(res.data))
        } catch (e) {
          reject(e)
        }
      },
      fail: (err) => reject(err?.errMsg ? new Error(err.errMsg) : new Error('上传失败')),
    })
  })
}

/** 小程序：选图后 multipart 上传，返回 MeData（含 avatarUrl） */
export function uploadAvatar(tempFilePath) {
  if (getMockEnabled()) {
    wmDB.profile.avatarUrl = tempFilePath
    const uid = wmDB.profile.userId
    if (uid && wmDB.users?.[uid]) {
      wmDB.users[uid] = { ...wmDB.users[uid], avatarUrl: tempFilePath }
    }
    return Promise.resolve({ ...wmDB.profile })
  }
  return uploadMyAvatar(tempFilePath)
}
