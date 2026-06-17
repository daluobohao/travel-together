import { isCityFeedPost } from '@/utils/feedShare'

/** 列表页/详情页共用：记录当前要分享的同城动态 */
export default {
  data() {
    return {
      pendingSharePost: null,
    }
  },
  methods: {
    onFeedSharePrepare(item) {
      if (!isCityFeedPost(item)) return
      this.pendingSharePost = item
    },
  },
}
