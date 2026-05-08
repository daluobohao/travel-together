<template>
  <view class="page profile-edit">
    <view class="profile-edit__header">
      <view class="profile-edit__back" @click="goBack">
        <wm-icon name="chevronLeft" :size="34" color="#0f172a" />
      </view>
      <text class="profile-edit__title">编辑个人信息</text>
      <text class="profile-edit__save" @click="saveProfile">保存</text>
    </view>

    <view class="profile-edit__content">
      <view v-if="firstCompleteHint" class="first-hint">
        <text>请先完善资料：性别保存后不可修改</text>
      </view>
      <view class="avatar-card">
        <view class="avatar-card__avatar">
          <text>{{ (form.name || '用').slice(0, 1) }}</text>
        </view>
        <text class="avatar-card__tip">头像首字母随昵称自动更新</text>
      </view>

      <view class="field-card">
        <text class="field-card__label">性别</text>
        <view v-if="!genderLocked" class="gender-row">
          <view
            v-for="opt in genderOptions"
            :key="opt.value"
            class="gender-chip"
            :class="{ 'gender-chip--active': form.gender === opt.value }"
            @click="setGender(opt.value)"
          >
            <text>{{ opt.label }}</text>
          </view>
        </view>
        <text v-else class="field-card__readonly">{{ genderReadonlyDisplay }}</text>
        <text v-if="!genderLocked" class="field-card__hint">保存后不可修改，请谨慎选择</text>
      </view>

      <view class="field-card">
        <text class="field-card__label">昵称</text>
        <input
          v-model="form.name"
          class="field-card__input"
          placeholder="请输入昵称"
          placeholder-class="field-card__placeholder"
          maxlength="12"
        />
      </view>

      <view class="field-card">
        <text class="field-card__label">个人简介</text>
        <textarea
          v-model="form.bio"
          class="field-card__textarea"
          placeholder="介绍一下你自己..."
          placeholder-class="field-card__placeholder"
          maxlength="80"
        />
        <text class="field-card__count">{{ (form.bio || '').length }}/80</text>
      </view>
    </view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import { formatUserGenderLabel, getMe, updateMe } from '@/api'

export default {
  components: { WmIcon },
  data() {
    return {
      firstCompleteHint: false,
      serverGender: null,
      genderOptions: [
        { value: 'male', label: '男' },
        { value: 'female', label: '女' },
        { value: 'unspecified', label: '保密' },
      ],
      form: {
        name: '小林',
        bio: '数字游民 · 周末出行爱好者',
        gender: null,
      },
    }
  },
  computed: {
    genderLocked() {
      return this.serverGender != null && this.serverGender !== ''
    },
    genderReadonlyDisplay() {
      return formatUserGenderLabel(this.serverGender) || '—'
    },
  },
  async onLoad(query) {
    this.firstCompleteHint = query?.first === '1'
    try {
      const me = await getMe()
      const g = me.gender != null && me.gender !== '' ? me.gender : null
      this.serverGender = g
      this.form = {
        ...this.form,
        name: me.nickname || this.form.name,
        bio: me.bio || this.form.bio,
        gender: g,
      }
      return
    } catch (e) {}

    const profile = uni.getStorageSync('user_profile')
    if (profile && typeof profile === 'object') {
      this.form = {
        ...this.form,
        ...profile,
      }
    }
  },
  methods: {
    setGender(value) {
      if (this.genderLocked) return
      this.form.gender = value
    },
    goToAfterSave() {
      if (this.firstCompleteHint) {
        uni.reLaunch({ url: '/pages/home/home' })
        return
      }
      uni.navigateBack({
        fail: () => {
          uni.reLaunch({ url: '/pages/home/home' })
        },
      })
    },
    goBack() {
      if (this.firstCompleteHint) {
        uni.reLaunch({ url: '/pages/home/home' })
        return
      }
      uni.navigateBack({
        fail: () => {
          uni.reLaunch({ url: '/pages/home/home' })
        },
      })
    },
    saveProfile() {
      const name = (this.form.name || '').trim()
      if (!name) {
        uni.showToast({ title: '昵称不能为空', icon: 'none' })
        return
      }
      if (!this.genderLocked && !this.form.gender) {
        uni.showToast({ title: '请选择性别', icon: 'none' })
        return
      }

      const nextProfile = {
        name,
        bio: (this.form.bio || '').trim() || '这个人很神秘，什么都没留下。',
        gender: this.form.gender,
      }

      const payload = {
        nickname: nextProfile.name,
        bio: nextProfile.bio,
      }
      if (!this.genderLocked && this.form.gender) {
        payload.gender = this.form.gender
      }

      updateMe(payload)
        .then(() => {
          this.serverGender = nextProfile.gender || this.serverGender
          uni.setStorageSync('user_profile', nextProfile)
          uni.showToast({ title: '已保存', icon: 'success' })
          setTimeout(() => {
            this.goToAfterSave()
          }, 350)
        })
        .catch(() => {
          uni.showToast({ title: '保存失败', icon: 'none' })
        })
    },
  },
}
</script>

<style lang="scss" scoped>
.profile-edit {
  min-height: 100vh;
  background: transparent;

  &__header {
    position: sticky;
    top: 0;
    z-index: 10;
    height: calc(96rpx + var(--status-bar-height, 0px) + env(safe-area-inset-top));
    padding: calc(var(--status-bar-height, 0px) + env(safe-area-inset-top)) 24rpx 0;
    background: $wm-sticky-header-gradient;
    border-bottom: none;
    box-shadow: 0 8rpx 28rpx rgba(99, 102, 241, 0.07);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__back {
    width: 72rpx;
    height: 72rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__title {
    font-size: 32rpx;
    font-weight: 600;
    color: #0f172a;
  }

  &__save {
    min-width: 72rpx;
    text-align: right;
    font-size: 28rpx;
    color: #6366f1;
    font-weight: 600;
  }

  &__content {
    padding: 24rpx;
    display: flex;
    flex-direction: column;
    gap: 16rpx;
  }
}

.first-hint {
  background: #eef2ff;
  border-radius: 16rpx;
  padding: 20rpx 22rpx;
  font-size: 24rpx;
  color: #4338ca;
  line-height: 1.5;
}

.gender-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.gender-chip {
  padding: 14rpx 28rpx;
  border-radius: 999rpx;
  background: #f1f5f9;
  border: 2rpx solid transparent;

  text {
    font-size: 26rpx;
    color: #64748b;
    font-weight: 500;
  }

  &--active {
    background: #eef2ff;
    border-color: #6366f1;

    text {
      color: #4338ca;
      font-weight: 600;
    }
  }
}

.avatar-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  border: $wm-card-edge;
  box-shadow: $wm-shadow-md;

  &__avatar {
    width: 120rpx;
    height: 120rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, #8b5cf6, #6366f1);
    display: flex;
    align-items: center;
    justify-content: center;

    text {
      color: #ffffff;
      font-size: 50rpx;
      font-weight: 700;
    }
  }

  &__tip {
    font-size: 22rpx;
    color: #94a3b8;
  }
}

.field-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 24rpx;
  border: $wm-card-edge;
  box-shadow: $wm-shadow-md;

  &__label {
    display: block;
    font-size: 26rpx;
    color: #475569;
    margin-bottom: 14rpx;
    font-weight: 600;
  }

  &__input {
    height: 76rpx;
    border-radius: 14rpx;
    padding: 0 16rpx;
    background: #f8fafc;
    font-size: 28rpx;
    color: #0f172a;
  }

  &__textarea {
    width: 100%;
    min-height: 140rpx;
    border-radius: 14rpx;
    padding: 16rpx;
    background: #f8fafc;
    font-size: 26rpx;
    color: #0f172a;
    line-height: 1.55;
    box-sizing: border-box;
  }

  &__placeholder {
    color: #94a3b8;
  }

  &__count {
    display: block;
    text-align: right;
    margin-top: 8rpx;
    font-size: 22rpx;
    color: #94a3b8;
  }

  &__readonly {
    font-size: 28rpx;
    color: #0f172a;
    font-weight: 500;
  }

  &__hint {
    display: block;
    margin-top: 10rpx;
    font-size: 22rpx;
    color: #94a3b8;
    line-height: 1.4;
  }
}
</style>
