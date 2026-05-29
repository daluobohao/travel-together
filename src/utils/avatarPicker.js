import { uploadAvatar } from '@/api/avatarUpload'

const MAX_SIZE_BYTES = 5 * 1024 * 1024

function extFromPath(path) {
  const m = String(path || '').match(/\.([a-zA-Z0-9]+)(?:\?|$)/)
  return m ? m[1].toLowerCase() : ''
}

function validateLocalImage(filePath, size) {
  const ext = extFromPath(filePath)
  if (ext && !['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    return '仅支持 jpg、png、webp 图片'
  }
  if (size != null && size > MAX_SIZE_BYTES) {
    return '图片不能超过 5MB'
  }
  return ''
}

/**
 * 调起相册/相机选图并上传头像，成功返回 MeData（含 avatarUrl）。
 */
export function chooseAndUploadAvatar() {
  return new Promise((resolve, reject) => {
    uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const filePath = res.tempFilePaths?.[0]
        if (!filePath) {
          reject(new Error('未选择图片'))
          return
        }
        const size = res.tempFiles?.[0]?.size
        const invalid = validateLocalImage(filePath, size)
        if (invalid) {
          reject(new Error(invalid))
          return
        }
        uni.showLoading({ title: '上传中…', mask: true })
        try {
          const me = await uploadAvatar(filePath)
          resolve(me)
        } catch (e) {
          reject(e)
        } finally {
          uni.hideLoading()
        }
      },
      fail: (err) => {
        if (err?.errMsg && /cancel/i.test(err.errMsg)) {
          reject(new Error('已取消'))
          return
        }
        reject(err?.errMsg ? new Error(err.errMsg) : new Error('选择图片失败'))
      },
    })
  })
}
