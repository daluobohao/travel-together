/** 头像上传前压缩，避免原图过大触发网关 413，并统一为 JPEG 减少格式异常 */
const AVATAR_MAX_UPLOAD_BYTES = 1024 * 1024
const AVATAR_COMPRESS_WIDTH = 800
const AVATAR_COMPRESS_QUALITY = 80

function getFileSize(filePath) {
  return new Promise((resolve) => {
    uni.getFileInfo({
      filePath,
      success: (res) => resolve(Number(res.size) || 0),
      fail: () => resolve(0),
    })
  })
}

function compressOnce(filePath, quality, compressedWidth) {
  return new Promise((resolve) => {
    if (typeof uni.compressImage !== 'function') {
      resolve(filePath)
      return
    }
    const opts = {
      src: filePath,
      quality,
      success: (res) => resolve(res.tempFilePath || filePath),
      fail: () => resolve(filePath),
    }
    if (compressedWidth > 0) {
      opts.compressedWidth = compressedWidth
    }
    uni.compressImage(opts)
  })
}

/** 压缩后上传，尽量控制在 1MB 以内 */
export async function prepareAvatarForUpload(filePath) {
  return prepareImageForUpload(filePath, {
    maxBytes: AVATAR_MAX_UPLOAD_BYTES,
    width: AVATAR_COMPRESS_WIDTH,
    quality: AVATAR_COMPRESS_QUALITY,
  })
}

const CHAT_MAX_UPLOAD_BYTES = 2 * 1024 * 1024
const CHAT_COMPRESS_WIDTH = 1280
const CHAT_COMPRESS_QUALITY = 82

/** 聊天图片压缩，尽量控制在 2MB 以内 */
export async function prepareChatImageForUpload(filePath) {
  return prepareImageForUpload(filePath, {
    maxBytes: CHAT_MAX_UPLOAD_BYTES,
    width: CHAT_COMPRESS_WIDTH,
    quality: CHAT_COMPRESS_QUALITY,
  })
}

async function prepareImageForUpload(filePath, { maxBytes, width, quality }) {
  let current = await compressOnce(filePath, quality, width)
  let size = await getFileSize(current)
  if (size > 0 && size <= maxBytes) {
    return current
  }

  current = await compressOnce(current, Math.max(quality - 20, 45), Math.round(width * 0.8))
  size = await getFileSize(current)
  if (size > maxBytes) {
    current = await compressOnce(current, 45, Math.round(width * 0.64))
    size = await getFileSize(current)
  }
  if (size > maxBytes) {
    throw new Error('图片过大，请换一张较小的照片')
  }
  return current
}

export async function validateAvatarFile(filePath, reportedSize) {
  let size = reportedSize
  if (size == null || size <= 0) {
    size = await getFileSize(filePath)
  }
  if (size > 8 * 1024 * 1024) {
    return '图片不能超过 8MB'
  }
  return ''
}

export async function validateChatImageFile(filePath, reportedSize) {
  return validateAvatarFile(filePath, reportedSize)
}
