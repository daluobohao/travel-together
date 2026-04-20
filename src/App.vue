<script>
import { setMockEnabled } from '@/api'

export default {
  onLaunch() {
    setMockEnabled(true)
    console.log('WanderMeet App Launch')
  },
  onShow() {},
  onHide() {},
}
</script>

<style lang="scss">
/* 全局样式 */
page {
  background-color: #f3f4f6;
  color: #0f172a;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', Helvetica,
    'Microsoft YaHei', Arial, sans-serif;
  font-size: 28rpx;
  line-height: 1.5;
}

view,
text {
  box-sizing: border-box;
}
</style>
