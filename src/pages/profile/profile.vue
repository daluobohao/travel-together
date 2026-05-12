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
    background: linear-gradient(180deg, rgba(224, 242, 254, 0.95) 0%, rgba(204, 251, 241, 0.92) 100%);
    padding: calc(44rpx + var(--status-bar-height, 0px) + env(safe-area-inset-top)) 32rpx 36rpx;
  }

  &__user {
    display: flex;
    align-items: center;
    gap: 24rpx;
    padding: 32rpx;
    background: #ffffff;
    border-radius: $wm-radius-xl;
    border: $wm-card-edge;
    box-shadow: $wm-shadow-lg;
    position: relative;
    overflow: hidden;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4rpx;
      background: $wm-gradient-primary;
      opacity: 0.6;
    }
  }

  &__avatar {
    width: 120rpx;
    height: 120rpx;
    border-radius: 50%;
    background: $wm-gradient-primary;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    flex-shrink: 0;
    box-shadow: 0 8rpx 24rpx rgba(2, 132, 199, 0.3);
  }

  &__avatar-text {
    font-size: 52rpx;
    font-weight: 800;
    color: #ffffff;
  }

  &__info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 10rpx;
  }

  &__name-row {
    display: flex;
    align-items: center;
    gap: 12rpx;
  }

  &__name {
    font-size: 36rpx;
    font-weight: 800;
    color: $wm-text-1;
  }

  &__verified {
    display: inline-flex;
    align-items: center;
    gap: 4rpx;
    background: $wm-success-soft;
    color: $wm-success;
    font-size: 22rpx;
    font-weight: 700;
    padding: 4rpx 14rpx;
    border-radius: 999rpx;
  }

  &__bio {
    font-size: 26rpx;
    color: $wm-text-2;
    font-weight: 500;
  }

  &__gender {
    display: block;
    margin-top: 6rpx;
    font-size: 24rpx;
    color: $wm-text-3;
    font-weight: 500;
  }

  &__edit {
    color: $wm-primary;
    font-size: 28rpx;
    font-weight: 700;
    padding: 12rpx 8rpx;
  }

  &__stats {
    margin-top: 24rpx;
    display: flex;
    background: #ffffff;
    border-radius: $wm-radius-lg;
    padding: 32rpx 12rpx;
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
  gap: 8rpx;
  border-right: 1rpx solid #f1f5f9;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);

  &:last-child {
    border-right: none;
  }

  &--clickable {
    cursor: pointer;
  }

  &:active {
    transform: scale(0.95);
  }

  &__value {
    font-size: 44rpx;
    font-weight: 800;
    background: $wm-gradient-hero;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  &__label {
    font-size: 24rpx;
    color: $wm-text-3;
    font-weight: 500;
  }
}

.section {
  padding: 28rpx 32rpx 0;

  &__head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 20rpx;
  }

  &__title {
    font-size: 32rpx;
    font-weight: 700;
    color: $wm-text-1;
  }

  &__more {
    font-size: 26rpx;
    color: $wm-primary;
    font-weight: 600;
  }
}

.activities {
  background: #ffffff;
  border-radius: $wm-radius-lg;
  overflow: hidden;
  border: $wm-card-edge;
  box-shadow: $wm-shadow-md;
}

.activity {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx;
  border-bottom: 1rpx solid #f8fafc;
  transition: background 0.2s;

  &:last-child {
    border-bottom: none;
  }

  &:active {
    background: $wm-primary-soft;
  }

  &__title {
    display: block;
    font-size: 30rpx;
    font-weight: 700;
    color: $wm-text-1;
  }

  &__time {
    display: block;
    margin-top: 8rpx;
    font-size: 24rpx;
    color: $wm-text-3;
    font-weight: 500;
  }

  &__right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8rpx;
  }

  &__status {
    font-size: 22rpx;
    font-weight: 700;
    padding: 6rpx 16rpx;
    border-radius: $wm-radius-md;

    &--ongoing {
      background: $wm-success-soft;
      color: $wm-success;
    }

    &--enrolled {
      background: $wm-primary-soft;
      color: $wm-primary;
    }
  }

  &__joined {
    font-size: 24rpx;
    color: $wm-text-3;
    font-weight: 500;
  }
}

.menu {
  margin: 28rpx 32rpx 0;
  background: #ffffff;
  border-radius: $wm-radius-lg;
  border: $wm-card-edge;
  box-shadow: $wm-shadow-md;
  overflow: hidden;

  &__item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 30rpx 28rpx;
    border-bottom: 1rpx solid #f8fafc;
    transition: background 0.2s;

    &--last {
      border-bottom: none;
    }

    &:active {
      background: $wm-primary-soft;
    }
  }

  &__left {
    display: flex;
    align-items: center;
    gap: 22rpx;
  }

  &__icon {
    width: 72rpx;
    height: 72rpx;
    border-radius: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: $wm-primary-soft;
    box-shadow: 0 4rpx 12rpx rgba(2, 132, 199, 0.1);
  }

  &__label {
    font-size: 30rpx;
    color: $wm-text-1;
    font-weight: 600;
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 8rpx;
  }

  &__hint {
    font-size: 24rpx;
    color: $wm-text-3;
    font-weight: 500;
  }
}
</style>
