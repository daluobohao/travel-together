<template>
  <view class="page profile">
    <!-- Hero -->
    <view class="profile__hero">
      <view class="profile__user">
        <view class="profile__avatar">
          <text class="profile__avatar-text">{{ user.name.slice(0, 1) }}</text>
        </view>
        <view class="profile__info">
          <view class="profile__name-row">
            <text class="profile__name">{{ user.name }}</text>
            <view class="profile__verified">
              <wm-icon name="check" :size="20" color="#10b981" />
              <text>已认证</text>
            </view>
          </view>
          <text class="profile__bio">{{ user.bio }}</text>
          <text v-if="genderDisplay" class="profile__gender">{{ genderDisplay }}</text>
        </view>
        <text class="profile__edit" @click="onEdit">编辑</text>
      </view>

      <view class="profile__stats">
        <view
          v-for="s in stats"
          :key="s.label"
          class="stat"
          :class="{
            'stat--clickable': s.label === '参加活动' || s.label === '发起活动',
          }"
          @click="onStatClick(s)"
        >
          <text class="stat__value">{{ s.value }}</text>
          <text class="stat__label">{{ s.label }}</text>
        </view>
      </view>
    </view>

    <!-- My activities -->
    <view class="section">
      <view class="section__head">
        <text class="section__title">我的活动</text>
        <text class="section__more" @click="onViewAllMyActivities">查看全部</text>
      </view>
      <view class="activities">
        <view v-for="a in activities" :key="a.id" class="activity">
          <view class="activity__body">
            <text class="activity__title">{{ a.title }}</text>
            <text class="activity__time">{{ a.time }}</text>
          </view>
          <view class="activity__right">
            <view class="activity__status" :class="`activity__status--${a.status.key}`">
              <text>{{ a.status.label }}</text>
            </view>
            <text class="activity__joined">{{ a.joined }}人参加</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Menu -->
    <view class="menu">
      <view
        v-for="(m, i) in menus"
        :key="m.key"
        class="menu__item"
        :class="{ 'menu__item--last': i === menus.length - 1 }"
        @click="onMenu(m)"
      >
        <view class="menu__left">
          <view class="menu__icon" :style="{ background: m.bg }">
            <wm-icon :name="m.icon" :size="32" :color="m.color" />
          </view>
          <text class="menu__label">{{ m.label }}</text>
        </view>
        <view class="menu__right">
          <text v-if="m.hint" class="menu__hint">{{ m.hint }}</text>
          <wm-icon name="chevronRight" :size="28" color="#cbd5e1" />
        </view>
      </view>
    </view>

    <wm-tab-bar active="profile" />
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import WmTabBar from '@/components/WmTabBar/WmTabBar.vue'
import { formatUserGenderLabel, getMe, getMyActivities, getMyStats, mapActivityCard } from '@/api'

export default {
  components: { WmIcon, WmTabBar },
  data() {
    return {
      user: {
        name: '小林',
        bio: '数字游民 · 周末出行爱好者',
        gender: null,
      },
      stats: [
        { value: 12, label: '参加活动' },
        { value: 5, label: '发起活动' },
      ],
      activities: [],
      menus: [
        { key: 'history', icon: 'history', color: '#0ea5e9', bg: '#e0f2fe', label: '历史活动' },
        { key: 'rules', icon: 'book', color: '#10b981', bg: '#ecfdf5', label: '社区规范' },
        { key: 'privacy', icon: 'shield', color: '#6366f1', bg: '#eef2ff', label: '隐私政策' },
      ],
    }
  },
  computed: {
    genderDisplay() {
      return formatUserGenderLabel(this.user.gender)
    },
  },
  methods: {
    onEdit() {
      uni.navigateTo({
        url: '/pages/profile-edit/profile-edit',
      })
    },
    onStatClick(stat) {
      if (stat.label === '参加活动') {
        uni.navigateTo({
          url: '/pages/activity-list/activity-list',
        })
        return
      }
      if (stat.label === '发起活动') {
        uni.navigateTo({
          url: '/pages/hosted-activity-list/hosted-activity-list',
        })
        return
      }
    },
    onMenu(m) {
      if (m.key === 'history') {
        uni.navigateTo({
          url: '/pages/history-activity-list/history-activity-list',
        })
        return
      }
      if (m.key === 'rules') {
        uni.navigateTo({
          url: '/pages/community-rules/community-rules',
        })
        return
      }
      if (m.key === 'privacy') {
        uni.navigateTo({
          url: '/pages/privacy-policy/privacy-policy',
        })
        return
      }
      uni.showToast({ title: m.label, icon: 'none' })
    },
    onViewAllMyActivities() {
      uni.navigateTo({
        url: '/pages/my-activity-list/my-activity-list',
      })
    },
  },
  async onShow() {
    try {
      const [me, stats, joined] = await Promise.all([
        getMe(),
        getMyStats(),
        getMyActivities({ role: 'joined', page: 1, pageSize: 2 }),
      ])
      this.user = {
        ...this.user,
        name: me.nickname || this.user.name,
        bio: me.bio || this.user.bio,
        gender: me.gender != null ? me.gender : this.user.gender,
      }
      this.stats = [
        { value: stats?.joinedCount ?? 0, label: '参加活动' },
        { value: stats?.organizedCount ?? 0, label: '发起活动' },
      ]
      this.activities = (joined?.list || []).slice(0, 2).map((item) => {
        const card = mapActivityCard(item)
        return {
          id: String(card.activityId || ''),
          title: card.title,
          time: card.time,
          joined: card.joined,
          status: { key: 'enrolled', label: '已报名' },
        }
      })
    } catch (e) {
      const profile = uni.getStorageSync('user_profile')
      if (profile && typeof profile === 'object') {
        this.user = {
          ...this.user,
          ...profile,
        }
      }
    }
  },
}
</script>

<style lang="scss" scoped>
.profile {
  min-height: 100vh;
  background: transparent;

  &__hero {
    background: linear-gradient(180deg, #eef2ff 0%, rgba(245, 247, 251, 0.96) 100%);
    padding: calc(40rpx + var(--status-bar-height, 0px) + env(safe-area-inset-top)) 32rpx 32rpx;
  }

  &__user {
    display: flex;
    align-items: center;
    gap: 24rpx;
    padding: 28rpx;
    background: #ffffff;
    border-radius: 28rpx;
    border: $wm-card-edge;
    box-shadow: $wm-card-elevated-shadow;
  }

  &__avatar {
    width: 112rpx;
    height: 112rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, #8b5cf6, #6366f1);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    flex-shrink: 0;
  }

  &__avatar-text {
    font-size: 48rpx;
    font-weight: 700;
    color: #ffffff;
  }

  &__info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
  }

  &__name-row {
    display: flex;
    align-items: center;
    gap: 12rpx;
  }

  &__name {
    font-size: 34rpx;
    font-weight: 700;
    color: #0f172a;
  }

  &__verified {
    display: inline-flex;
    align-items: center;
    gap: 4rpx;
    background: #ecfdf5;
    color: #059669;
    font-size: 20rpx;
    font-weight: 600;
    padding: 2rpx 12rpx;
    border-radius: 999rpx;
  }

  &__bio {
    font-size: 24rpx;
    color: #64748b;
  }

  &__gender {
    display: block;
    margin-top: 8rpx;
    font-size: 22rpx;
    color: #94a3b8;
    font-weight: 500;
  }

  &__edit {
    color: #6366f1;
    font-size: 26rpx;
    font-weight: 500;
    padding: 12rpx 8rpx;
  }

  &__stats {
    margin-top: 20rpx;
    display: flex;
    background: #ffffff;
    border-radius: 24rpx;
    padding: 28rpx 12rpx;
    border: $wm-card-edge;
    box-shadow: $wm-shadow-md;
  }
}

.stat {
  flex: 1;
  width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  border-right: 1rpx solid #e2e8f0;

  &:last-child {
    border-right: none;
  }

  &--clickable {
    cursor: pointer;
  }

  &__value {
    font-size: 40rpx;
    font-weight: 700;
    color: #0f172a;
  }

  &__label {
    font-size: 22rpx;
    color: #94a3b8;
  }
}

.section {
  padding: 24rpx 32rpx 0;

  &__head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 16rpx;
  }

  &__title {
    font-size: 30rpx;
    font-weight: 700;
    color: #0f172a;
  }

  &__more {
    font-size: 24rpx;
    color: #6366f1;
  }
}

.activities {
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  border: $wm-card-edge;
  box-shadow: $wm-shadow-md;
}

.activity {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 28rpx;
  border-bottom: 1rpx solid #f1f5f9;

  &:last-child {
    border-bottom: none;
  }

  &__title {
    display: block;
    font-size: 28rpx;
    font-weight: 600;
    color: #0f172a;
  }

  &__time {
    display: block;
    margin-top: 6rpx;
    font-size: 22rpx;
    color: #94a3b8;
  }

  &__right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6rpx;
  }

  &__status {
    font-size: 20rpx;
    font-weight: 600;
    padding: 4rpx 12rpx;
    border-radius: 8rpx;

    &--ongoing {
      background: #ecfdf5;
      color: #059669;
    }

    &--enrolled {
      background: #eef2ff;
      color: #6366f1;
    }
  }

  &__joined {
    font-size: 22rpx;
    color: #94a3b8;
  }
}

.menu {
  margin: 24rpx 32rpx 0;
  background: #ffffff;
  border-radius: 24rpx;
  border: $wm-card-edge;
  box-shadow: $wm-shadow-md;
  overflow: hidden;

  &__item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 28rpx;
    border-bottom: 1rpx solid #f1f5f9;

    &--last {
      border-bottom: none;
    }
  }

  &__left {
    display: flex;
    align-items: center;
    gap: 20rpx;
  }

  &__icon {
    width: 64rpx;
    height: 64rpx;
    border-radius: 16rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__label {
    font-size: 28rpx;
    color: #0f172a;
    font-weight: 500;
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 8rpx;
  }

  &__hint {
    font-size: 22rpx;
    color: #94a3b8;
  }
}
</style>
