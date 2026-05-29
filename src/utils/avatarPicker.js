import { uploadAvatar } from '@/api/avatarUpload'
import { prepareAvatarForUpload, validateAvatarFile } from '@/utils/avatarImage'

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
        try {
          const invalid = await validateAvatarFile(filePath, size)
          if (invalid) {
            reject(new Error(invalid))
            return
          }
          uni.showLoading({ title: '处理中…', mask: true })
          const uploadPath = await prepareAvatarForUpload(filePath)
          uni.showLoading({ title: '上传中…', mask: true })
          const me = await uploadAvatar(uploadPath)
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
