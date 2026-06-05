import { capturePageQueryAttribution } from '@/utils/acquisitionSource'

/** 任意页面 onLoad 捕获 ``src`` 参数（分享/外链落地） */
export default {
  onLoad(options) {
    capturePageQueryAttribution(options || {})
  },
}
