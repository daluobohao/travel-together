<script>
import { getAccessToken, setMockEnabled } from '@/api'

const LOGIN_PATH = '/pages/login/login'

export default {
  onLaunch() {
    setMockEnabled(false)
    this.ensureLogin()
    console.log('WanderMeet App Launch')
  },
  onShow() {
    this.ensureLogin()
  },
  onHide() {},
  methods: {
    ensureLogin() {
      const token = getAccessToken()
      const pages = getCurrentPages()
      const current = pages[pages.length - 1]
      const currentPath = current ? `/${current.route}` : ''
      if (!token && currentPath !== LOGIN_PATH) {
        uni.reLaunch({ url: LOGIN_PATH })
      }
    },
  },
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
