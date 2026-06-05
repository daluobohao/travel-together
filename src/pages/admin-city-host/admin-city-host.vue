<template>
  <view class="page admin-host">
    <view class="admin-host__header">
      <view class="admin-host__back" @click="goBack">
        <wm-icon name="chevronLeft" :size="34" color="#0f172a" />
        <text>返回</text>
      </view>
      <text class="admin-host__title">城主管理</text>
      <view class="admin-host__placeholder" />
    </view>

    <view v-if="forbidden" class="admin-host__state">
      <text>无管理员权限</text>
      <text class="admin-host__hint">请确认账号 role=admin，并重新登录</text>
    </view>

    <template v-else>
      <view class="admin-host__tabs">
        <view
          v-for="t in tabs"
          :key="t.key"
          class="admin-host__tab"
          :class="{ 'admin-host__tab--on': activeTab === t.key }"
          @click="switchTab(t.key)"
        >
          <text>{{ t.label }}</text>
          <text v-if="t.badge" class="admin-host__tab-badge">{{ t.badge }}</text>
        </view>
      </view>

      <!-- 任命 -->
      <view v-if="activeTab === 'appoint'" class="admin-host__panel">
        <text class="admin-host__panel-title">任命城主 / 副城主</text>
        <text class="admin-host__panel-hint">北京 110000 · 上海 310100 · 广州 440100</text>

        <view class="admin-host__field">
          <text class="admin-host__label">城市代码 cityCode</text>
          <input v-model="appointCityCode" class="admin-host__input" placeholder="如 110000" />
        </view>
        <view class="admin-host__field">
          <text class="admin-host__label">用户 ID</text>
          <input v-model="appointUserId" class="admin-host__input" placeholder="如 u_42" />
        </view>
        <view class="admin-host__field">
          <text class="admin-host__label">角色</text>
          <view class="admin-host__roles">
            <view
              class="admin-host__role"
              :class="{ 'admin-host__role--on': appointRole === 'owner' }"
              @click="appointRole = 'owner'"
            >
              <text>城主 owner</text>
            </view>
            <view
              class="admin-host__role"
              :class="{ 'admin-host__role--on': appointRole === 'deputy' }"
              @click="appointRole = 'deputy'"
            >
              <text>副城主 deputy</text>
            </view>
          </view>
        </view>
        <view class="admin-host__btn" @click="onAppoint">
          <text>确认任命</text>
        </view>
      </view>

      <!-- 现任 -->
      <scroll-view v-else-if="activeTab === 'hosts'" class="admin-host__scroll" scroll-y>
        <view class="admin-host__filter">
          <input
            v-model="hostFilterCity"
            class="admin-host__input admin-host__input--inline"
            placeholder="筛选 cityCode（可选）"
            @confirm="reloadHosts"
          />
          <view class="admin-host__filter-btn" @click="reloadHosts">
            <text>刷新</text>
          </view>
        </view>
        <view v-if="hostsLoading" class="admin-host__state"><text>加载中…</text></view>
        <view v-else-if="!hosts.length" class="admin-host__state"><text>暂无城主记录</text></view>
        <view v-for="item in hosts" :key="item.id" class="admin-host__card">
          <view class="admin-host__card-head">
            <text class="admin-host__card-city">{{ cityLabel(item.cityCode) }}</text>
            <text class="admin-host__card-code">{{ item.cityCode }}</text>
          </view>
          <text class="admin-host__card-name">{{ item.nickname || '用户' }} · {{ item.userId }}</text>
          <view class="admin-host__card-tags">
            <text class="admin-host__tag">{{ roleLabel(item.role) }}</text>
            <text class="admin-host__tag admin-host__tag--muted">{{ item.status }}</text>
          </view>
          <view
            v-if="item.status === 'active'"
            class="admin-host__card-action"
            @click="onResignHost(item)"
          >
            <text>撤换</text>
          </view>
        </view>
      </scroll-view>

      <!-- 申请 -->
      <scroll-view v-else class="admin-host__scroll" scroll-y>
        <view v-if="appsLoading" class="admin-host__state"><text>加载中…</text></view>
        <view v-else-if="!applications.length" class="admin-host__state"><text>暂无待审申请</text></view>
        <view v-for="item in applications" :key="item.applicationId" class="admin-host__card">
          <view class="admin-host__card-head">
            <text class="admin-host__card-city">{{ cityLabel(item.cityCode) }}</text>
            <text class="admin-host__card-code">{{ item.cityCode }}</text>
          </view>
          <text class="admin-host__card-name">{{ item.nickname || '用户' }} · {{ item.userId }}</text>
          <text class="admin-host__card-intro">{{ typeLabel(item.applicationType) }}</text>
          <text v-if="item.introText" class="admin-host__card-intro">{{ item.introText }}</text>
          <view class="admin-host__card-actions">
            <view class="admin-host__card-action admin-host__card-action--ghost" @click="onRejectApp(item)">
              <text>拒绝</text>
            </view>
            <view class="admin-host__card-action" @click="onApproveApp(item)">
              <text>通过并任命</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </template>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import {
  adminAppointCityGroupHost,
  adminApproveCityGroupHostApplication,
  adminListCityGroupHostApplications,
  adminListCityGroupHosts,
  adminRejectCityGroupHostApplication,
  adminUpdateCityGroupHost,
  getMe,
} from '@/api'
import { resolveCityHallCityName } from '@/utils/cityCatalog'

export default {
  components: { WmIcon },
  data() {
    return {
      forbidden: false,
      activeTab: 'appoint',
      appointCityCode: '110000',
      appointUserId: '',
      appointRole: 'owner',
      hosts: [],
      hostsLoading: false,
      hostFilterCity: '',
      applications: [],
      appsLoading: false,
      appPendingTotal: 0,
      actingId: null,
    }
  },
  computed: {
    tabs() {
      return [
        { key: 'appoint', label: '任命' },
        { key: 'hosts', label: '现任' },
        {
          key: 'applications',
          label: '申请',
          badge: this.appPendingTotal > 0 ? String(this.appPendingTotal) : '',
        },
      ]
    },
  },
  onLoad() {
    this.bootstrap()
  },
  onShow() {
    if (!this.forbidden) {
      this.reloadApplications()
      if (this.activeTab === 'hosts') this.reloadHosts()
    }
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    cityLabel(code) {
      return resolveCityHallCityName(code) || code
    },
    roleLabel(role) {
      if (role === 'owner') return '城主'
      if (role === 'deputy') return '副城主'
      return role
    },
    typeLabel(t) {
      if (t === 'owner') return '申请城主'
      if (t === 'deputy') return '副城主提名'
      return t
    },
    async bootstrap() {
      try {
        const me = await getMe()
        if (!me?.isAdmin) {
          this.forbidden = true
          return
        }
        await Promise.all([this.reloadApplications(), this.reloadHosts()])
      } catch (e) {
        this.forbidden = true
      }
    },
    switchTab(key) {
      this.activeTab = key
      if (key === 'hosts') this.reloadHosts()
      if (key === 'applications') this.reloadApplications()
    },
    async onAppoint() {
      const cityCode = (this.appointCityCode || '').trim()
      const userId = (this.appointUserId || '').trim()
      if (!cityCode || !userId) {
        uni.showToast({ title: '请填写 cityCode 和 userId', icon: 'none' })
        return
      }
      try {
        uni.showLoading({ title: '提交中…' })
        await adminAppointCityGroupHost({ cityCode, userId, role: this.appointRole })
        uni.showToast({ title: '任命成功', icon: 'success' })
        this.appointUserId = ''
        await this.reloadHosts()
      } catch (e) {
        uni.showToast({ title: e?.message || '任命失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
    async reloadHosts() {
      this.hostsLoading = true
      try {
        const q = { status: 'active', page: 1, pageSize: 50 }
        const cc = (this.hostFilterCity || '').trim()
        if (cc) q.cityCode = cc
        const data = await adminListCityGroupHosts(q)
        this.hosts = data?.list || []
      } catch (e) {
        uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
        this.hosts = []
      } finally {
        this.hostsLoading = false
      }
    },
    async reloadApplications() {
      this.appsLoading = true
      try {
        const data = await adminListCityGroupHostApplications({
          status: 'pending',
          page: 1,
          pageSize: 50,
        })
        this.applications = data?.list || []
        this.appPendingTotal = data?.total ?? this.applications.length
      } catch {
        this.applications = []
        this.appPendingTotal = 0
      } finally {
        this.appsLoading = false
      }
    },
    onResignHost(item) {
      uni.showModal({
        title: '撤换城主',
        content: `确定撤换 ${this.cityLabel(item.cityCode)} 的${this.roleLabel(item.role)}？`,
        success: async (res) => {
          if (!res.confirm) return
          try {
            uni.showLoading({ title: '处理中…' })
            await adminUpdateCityGroupHost(item.id, { status: 'resigned' })
            uni.showToast({ title: '已撤换', icon: 'success' })
            await this.reloadHosts()
          } catch (e) {
            uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
          } finally {
            uni.hideLoading()
          }
        },
      })
    },
    async onApproveApp(item) {
      if (this.actingId) return
      this.actingId = item.applicationId
      try {
        uni.showLoading({ title: '审核中…' })
        await adminApproveCityGroupHostApplication(item.applicationId)
        uni.showToast({ title: '已通过', icon: 'success' })
        await Promise.all([this.reloadApplications(), this.reloadHosts()])
      } catch (e) {
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
      } finally {
        this.actingId = null
        uni.hideLoading()
      }
    },
    onRejectApp(item) {
      if (this.actingId) return
      uni.showModal({
        title: '拒绝申请',
        content: '确定拒绝该申请？',
        success: async (res) => {
          if (!res.confirm) return
          this.actingId = item.applicationId
          try {
            uni.showLoading({ title: '处理中…' })
            await adminRejectCityGroupHostApplication(item.applicationId)
            uni.showToast({ title: '已拒绝', icon: 'success' })
            await this.reloadApplications()
          } catch (e) {
            uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
          } finally {
            this.actingId = null
            uni.hideLoading()
          }
        },
      })
    },
  },
}
</script>

<style scoped lang="scss">
.page.admin-host {
  min-height: 100vh;
  background: #f8fafc;
  padding-bottom: 48rpx;
}

.admin-host__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(var(--status-bar-height, 0px) + 16rpx) 24rpx 16rpx;
  background: #fff;
}

.admin-host__back {
  display: flex;
  align-items: center;
  gap: 4rpx;
  font-size: 28rpx;
  color: #0f172a;
  min-width: 120rpx;
}

.admin-host__title {
  font-size: 34rpx;
  font-weight: 700;
  color: #0f172a;
}

.admin-host__placeholder {
  min-width: 120rpx;
}

.admin-host__tabs {
  display: flex;
  margin: 24rpx 24rpx 0;
  background: #e2e8f0;
  border-radius: 16rpx;
  padding: 6rpx;
}

.admin-host__tab {
  flex: 1;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  font-size: 26rpx;
  color: #64748b;
  border-radius: 12rpx;

  &--on {
    background: #fff;
    color: #4f46e5;
    font-weight: 600;
  }
}

.admin-host__tab-badge {
  min-width: 32rpx;
  height: 32rpx;
  line-height: 32rpx;
  padding: 0 8rpx;
  border-radius: 16rpx;
  background: #ef4444;
  color: #fff;
  font-size: 20rpx;
  text-align: center;
}

.admin-host__panel {
  margin: 24rpx;
  padding: 28rpx;
  background: #fff;
  border-radius: 20rpx;
}

.admin-host__panel-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 8rpx;
}

.admin-host__panel-hint {
  display: block;
  font-size: 24rpx;
  color: #94a3b8;
  margin-bottom: 24rpx;
}

.admin-host__field {
  margin-bottom: 24rpx;
}

.admin-host__label {
  display: block;
  font-size: 26rpx;
  color: #475569;
  margin-bottom: 10rpx;
}

.admin-host__input {
  width: 100%;
  height: 80rpx;
  padding: 0 24rpx;
  background: #f8fafc;
  border: 1rpx solid #e2e8f0;
  border-radius: 12rpx;
  font-size: 28rpx;
  box-sizing: border-box;

  &--inline {
    flex: 1;
  }
}

.admin-host__roles {
  display: flex;
  gap: 16rpx;
}

.admin-host__role {
  flex: 1;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  border: 1rpx solid #c7d2fe;
  font-size: 26rpx;
  color: #64748b;

  &--on {
    background: #eef2ff;
    color: #4f46e5;
    border-color: #6366f1;
    font-weight: 600;
  }
}

.admin-host__btn {
  margin-top: 8rpx;
  height: 88rpx;
  border-radius: 44rpx;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.admin-host__scroll {
  height: calc(100vh - 280rpx);
  padding: 0 24rpx 24rpx;
  box-sizing: border-box;
}

.admin-host__filter {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;
  align-items: center;
}

.admin-host__filter-btn {
  padding: 0 24rpx;
  height: 80rpx;
  line-height: 80rpx;
  background: #fff;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: #4f46e5;
  border: 1rpx solid #c7d2fe;
}

.admin-host__state {
  padding: 80rpx 32rpx;
  text-align: center;
  color: #94a3b8;
  font-size: 28rpx;
}

.admin-host__hint {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
}

.admin-host__card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.admin-host__card-head {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.admin-host__card-city {
  font-size: 30rpx;
  font-weight: 700;
  color: #0f172a;
}

.admin-host__card-code {
  font-size: 22rpx;
  color: #94a3b8;
}

.admin-host__card-name {
  display: block;
  font-size: 28rpx;
  color: #334155;
  margin-bottom: 8rpx;
}

.admin-host__card-intro {
  display: block;
  font-size: 24rpx;
  color: #64748b;
  line-height: 1.5;
  margin-bottom: 8rpx;
}

.admin-host__card-tags {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.admin-host__tag {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  background: #eef2ff;
  color: #4f46e5;

  &--muted {
    background: #f1f5f9;
    color: #64748b;
  }
}

.admin-host__card-action {
  display: inline-flex;
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  background: #fef2f2;
  color: #ef4444;
  font-size: 26rpx;

  &--ghost {
    background: #f1f5f9;
    color: #64748b;
  }
}

.admin-host__card-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 8rpx;
}
</style>
