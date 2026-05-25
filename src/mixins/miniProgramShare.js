import {
  buildCurrentPageShareMessage,
  buildCurrentPageTimelineShare,
} from '@/utils/activityShare'

/** 全局分享 mixin：未自定义 onShareAppMessage 的页面默认可转发/复制链接 */
export default {
  onShow() {
    // #ifdef MP-WEIXIN
    try {
      uni.showShareMenu({
        withShareTicket: true,
        menus: ['shareAppMessage', 'shareTimeline'],
      })
    } catch (_) {
      /* ignore */
    }
    // #endif
    // #ifdef MP-TOUTIAO
    try {
      uni.showShareMenu({ withShareTicket: false })
    } catch (_) {
      /* ignore */
    }
    // #endif
  },
  onShareAppMessage() {
    return buildCurrentPageShareMessage()
  },
  // #ifdef MP-WEIXIN
  onShareTimeline() {
    return buildCurrentPageTimelineShare()
  },
  // #endif
}
