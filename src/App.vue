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
/* 全局样式 - 旅聚（米白天青 · 见 uni.scss） */
page {
  background: $wm-page-bg-gradient;
  background-attachment: fixed;
  min-height: 100vh;
  color: $wm-text-1;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', Helvetica,
    'Microsoft YaHei', Arial, sans-serif;
  font-size: 28rpx;
  line-height: 1.6;
}

view,
text {
  box-sizing: border-box;
}

/* 通用卡片样式 */
.wm-card {
  background: $wm-surface;
  border-radius: $wm-radius-lg;
  border: $wm-card-edge;
  box-shadow: $wm-shadow-md;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;

  &:active {
    transform: scale(0.98);
  }
}

/* 通用按钮样式 */
.wm-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 92rpx;
  border-radius: $wm-radius-xl;
  font-size: 30rpx;
  font-weight: 600;
  transition: transform 0.15s, box-shadow 0.2s, opacity 0.2s;

  &--primary {
    background: $wm-gradient-primary;
    color: #ffffff;
    box-shadow: $wm-shadow-glow;
  }

  &--ghost {
    background: #ffffff;
    color: $wm-primary;
    border: 2rpx solid rgba(2, 132, 199, 0.2);
  }

  &:active {
    transform: scale(0.98);
    opacity: 0.9;
  }
}

/* 通用标签样式 */
.wm-tag {
  display: inline-flex;
  align-items: center;
  height: 40rpx;
  padding: 0 16rpx;
  border-radius: $wm-radius-sm;
  font-size: 22rpx;
  font-weight: 600;

  &--primary {
    background: $wm-primary-soft;
    color: $wm-primary;
  }

  &--accent {
    background: $wm-accent-soft;
    color: $wm-accent;
  }

  &--success {
    background: #ecfdf5;
    color: #059669;
  }

  &--warning {
    background: #fffbeb;
    color: #d97706;
  }
}

/* 通用动画 */
@keyframes wm-fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes wm-fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes wm-pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

@keyframes wm-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.wm-animate-fadeInUp {
  animation: wm-fadeInUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
}

.wm-animate-fadeIn {
  animation: wm-fadeIn 0.3s ease-out;
}
</style>
