<template>
  <view class="page profile-edit">
    <view class="profile-edit__header">
      <view class="profile-edit__back" @click="goBack">
        <wm-icon name="chevronLeft" :size="34" color="#0f172a" />
      </view>
      <text class="profile-edit__title">{{ firstCompleteHint ? '完善资料' : '编辑个人信息' }}</text>
      <text class="profile-edit__save" @click="saveProfile">{{ firstCompleteHint ? '进入去旅聚' : '保存' }}</text>
    </view>

    <view class="profile-edit__content">
      <view v-if="firstCompleteHint" class="first-hint">
        <text>设置昵称与性别即可开始；性别保存后不可修改，其余资料可在「我的」中补充</text>
      </view>
      <view class="avatar-card" @click="onChooseAvatar">
        <view class="avatar-card__avatar">
          <image
            v-if="avatarUrl"
            class="avatar-card__img"
            :src="avatarDisplaySrc"
            mode="aspectFill"
          />
          <text v-else>{{ (form.name || '用').slice(0, 1) }}</text>
        </view>
        <text class="avatar-card__tip">{{ avatarUploading ? '上传中…' : '点击更换头像' }}</text>
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

      <view v-if="!firstCompleteHint" class="field-card">
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
import { ensureTextFieldsSafe, SEC_SCENE } from '@/utils/contentSecurity'
import { chooseAndUploadAvatar } from '@/utils/avatarPicker'
import { displayAvatarUrl } from '@/utils/avatarDisplay'

export default {
  components: { WmIcon },
  data() {
    return {
      firstCompleteHint: false,
      serverGender: null,
      avatarUrl: '',
      avatarUploading: false,
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
    avatarDisplaySrc() {
      return displayAvatarUrl(this.avatarUrl)
    },
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
      this.avatarUrl = me.avatarUrl || ''
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
    async onChooseAvatar() {
      if (this.avatarUploading) return
      this.avatarUploading = true
      try {
        const me = await chooseAndUploadAvatar()
        if (me?.avatarUrl) {
          this.avatarUrl = me.avatarUrl
        }
        uni.showToast({ title: '头像已更新', icon: 'success' })
      } catch (e) {
        const msg = e?.message || '上传失败'
        if (msg !== '已取消') {
          uni.showToast({ title: msg, icon: 'none' })
        }
      } finally {
        this.avatarUploading = false
      }
    },
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
      }
      if (!this.firstCompleteHint) {
        payload.bio = nextProfile.bio
      }
      if (!this.genderLocked && this.form.gender) {
        payload.gender = this.form.gender
      }
      if (this.firstCompleteHint) {
        payload.completeOnboarding = true
      }

      ensureTextFieldsSafe(
        {
          nickname: payload.nickname,
          bio: payload.bio,
        },
        SEC_SCENE.PROFILE,
      )
        .then(() => updateMe(payload))
        .then(() => {
          this.serverGender = nextProfile.gender || this.serverGender
          uni.setStorageSync('user_profile', nextProfile)
          uni.showToast({ title: '已保存', icon: 'success' })
          setTimeout(() => {
            this.goToAfterSave()
          }, 350)
        })
        .catch((e) => {
          uni.showToast({ title: e?.message || '保存失败', icon: 'none' })
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
    box-shadow: 0 12rpx 40rpx rgba(2, 132, 199, 0.06);
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
    font-size: 34rpx;
    font-weight: 700;
    color: $wm-text-1;
  }

  &__save {
    min-width: 72rpx;
    text-align: right;
    font-size: 30rpx;
    color: $wm-primary;
    font-weight: 700;
  }

  &__content {
    padding: 28rpx 24rpx;
    display: flex;
    flex-direction: column;
    gap: 20rpx;
  }
}

.first-hint {
  background: $wm-primary-soft;
  border-radius: $wm-radius-md;
  padding: 24rpx 28rpx;
  font-size: 26rpx;
  color: $wm-primary;
  line-height: 1.5;
  font-weight: 500;
}

.gender-row {
  display: flex;
  flex-wrap: wrap;
  gap: 18rpx;
}

.gender-chip {
  padding: 16rpx 32rpx;
  border-radius: 999rpx;
  background: #fafafa;
  border: 2rpx solid transparent;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);

  text {
    font-size: 28rpx;
    color: $wm-text-2;
    font-weight: 600;
  }

  &:active {
    transform: scale(0.96);
  }

  &--active {
    background: $wm-primary-soft;
    border-color: $wm-primary;
    box-shadow: 0 4rpx 16rpx rgba(2, 132, 199, 0.15);

    text {
      color: $wm-primary;
      font-weight: 700;
    }
  }
}

.avatar-card {
  background: #ffffff;
  border-radius: $wm-radius-lg;
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
  border: $wm-card-edge;
  box-shadow: $wm-shadow-md;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);

  &:active {
    transform: scale(0.98);
  }

  &__avatar {
    width: 132rpx;
    height: 132rpx;
    border-radius: 50%;
    background: $wm-gradient-primary;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8rpx 24rpx rgba(2, 132, 199, 0.3);
    overflow: hidden;

    text {
      color: #ffffff;
      font-size: 56rpx;
      font-weight: 800;
    }
  }

  &__img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
  }

  &__tip {
    font-size: 24rpx;
    color: $wm-text-3;
    font-weight: 500;
  }
}

.field-card {
  background: #ffffff;
  border-radius: $wm-radius-lg;
  padding: 28rpx;
  border: $wm-card-edge;
  box-shadow: $wm-shadow-md;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 6rpx;
    bottom: 0;
    background: $wm-gradient-primary;
    opacity: 0;
    transition: opacity 0.2s;
  }

  &:focus-within::before {
    opacity: 0.4;
  }

  &__label {
    display: block;
    font-size: 28rpx;
    color: $wm-text-2;
    margin-bottom: 16rpx;
    font-weight: 700;
  }

  &__input {
    height: 84rpx;
    border-radius: $wm-radius-md;
    padding: 0 20rpx;
    background: #fafafa;
    font-size: 30rpx;
    color: $wm-text-1;
    font-weight: 500;
    transition: background 0.2s, box-shadow 0.2s;

    &:focus-within {
      background: $wm-primary-soft;
      box-shadow: 0 0 0 4rpx rgba(2, 132, 199, 0.1);
    }
  }

  &__textarea {
    width: 100%;
    min-height: 160rpx;
    border-radius: $wm-radius-md;
    padding: 20rpx;
    background: #fafafa;
    font-size: 28rpx;
    color: $wm-text-1;
    line-height: 1.6;
    box-sizing: border-box;
    font-weight: 500;
    transition: background 0.2s, box-shadow 0.2s;

    &:focus-within {
      background: $wm-primary-soft;
      box-shadow: 0 0 0 4rpx rgba(2, 132, 199, 0.1);
    }
  }

  &__placeholder {
    color: $wm-text-3;
  }

  &__count {
    display: block;
    text-align: right;
    margin-top: 10rpx;
    font-size: 24rpx;
    color: $wm-text-3;
    font-weight: 500;
  }

  &__readonly {
    font-size: 30rpx;
    color: $wm-text-1;
    font-weight: 600;
  }

  &__hint {
    display: block;
    margin-top: 12rpx;
    font-size: 24rpx;
    color: $wm-text-3;
    line-height: 1.4;
    font-weight: 500;
  }
}
</style>
