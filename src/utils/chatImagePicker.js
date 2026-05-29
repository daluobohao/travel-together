import { uploadChatImage } from '@/api/chatImageUpload'
import { prepareChatImageForUpload, validateChatImageFile } from '@/utils/avatarImage'

/** 选图、压缩并上传到 BOS，返回 imageUrl */
export function chooseAndUploadChatImage() {
  return new Promise((resolve, reject) => {
    uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        try {
          const path = res.tempFilePaths?.[0]
          if (!path) {
            reject(new Error('未选择图片'))
            return
          }
          const err = await validateChatImageFile(path, res.tempFiles?.[0]?.size)
          if (err) {
            reject(new Error(err))
            return
          }
          const compressed = await prepareChatImageForUpload(path)
          const data = await uploadChatImage(compressed)
          if (!data?.imageUrl) {
            reject(new Error('上传失败'))
            return
          }
          resolve(data.imageUrl)
        } catch (e) {
          reject(e)
        }
      },
      fail: () => reject(new Error('已取消')),
    })
  })
}
