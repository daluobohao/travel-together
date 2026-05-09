<template>
  <view class="page ob">
    <view class="ob__head">
      <text class="ob__brand">旅聚 WanderMeet</text>
      <text class="ob__progress">{{ step + 1 }} / {{ totalSteps }}</text>
    </view>

    <view v-if="meta" class="ob__body">
      <!-- 0 渠道 -->
      <view v-if="step === 0" class="ob__panel">
        <text class="ob__title">你怎么知道旅聚的？</text>
        <text class="ob__sub">帮助我们做得更好</text>
        <view class="ob__chips ob__chips--wrap">
          <view
            v-for="it in meta.acquisitionSources"
            :key="it.id"
            class="ob__chip"
            :class="{ 'ob__chip--on': form.acquisitionSource === it.id }"
            @click="form.acquisitionSource = it.id"
          >
            <text>{{ it.label }}</text>
          </view>
        </view>
      </view>

      <!-- 1 昵称 -->
      <view v-if="step === 1" class="ob__panel">
        <text class="ob__title">怎么称呼你？</text>
        <view class="ob__input-wrap">
          <input
            v-model="form.nickname"
            class="ob__input-inner"
            type="text"
            maxlength="12"
            placeholder="昵称（展示给其他人）"
            placeholder-class="ob__ph"
            :adjust-position="true"
            confirm-type="done"
          />
        </view>
      </view>

      <!-- 2 性别 -->
      <view v-if="step === 2" class="ob__panel">
        <text class="ob__title">你的性别</text>
        <text class="ob__sub">保存后不可修改，请认真选择</text>
        <view class="ob__chips">
          <view
            v-for="opt in genderOptions"
            :key="opt.value"
            class="ob__chip"
            :class="{ 'ob__chip--on': form.gender === opt.value }"
            @click="form.gender = opt.value"
          >
            <text>{{ opt.label }}</text>
          </view>
        </view>
      </view>

      <!-- 3 国家 -->
      <view v-if="step === 3" class="ob__panel">
        <text class="ob__title">所在国家/地区</text>
        <text class="ob__sub">资料上展示地区标识用</text>
        <view class="ob__chips">
          <view
            v-for="it in meta.countryCodes"
            :key="it.id"
            class="ob__chip"
            :class="{ 'ob__chip--on': form.countryCode === it.id }"
            @click="form.countryCode = it.id"
          >
            <text>{{ it.label }}</text>
          </view>
        </view>
      </view>

      <!-- 4 旅行身份 -->
      <view v-if="step === 4" class="ob__panel">
        <text class="ob__title">你是哪类参与者？</text>
        <text class="ob__sub">最多选 2 个</text>
        <view class="ob__cards">
          <view
            v-for="r in meta.travelerRoles"
            :key="r.id"
            class="ob__card"
            :class="{ 'ob__card--on': travelerSet[r.id] }"
            @click="toggleTraveler(r.id)"
          >
            <text class="ob__card-title">{{ r.label }}</text>
            <text v-if="r.description" class="ob__card-desc">{{ r.description }}</text>
          </view>
        </view>
      </view>

      <!-- 5 城市 -->
      <view v-if="step === 5" class="ob__panel">
        <text class="ob__title">你现在的城市？</text>
        <text class="ob__sub">方便推荐附近活动</text>
        <view class="ob__input-wrap">
          <input
            v-model="form.currentPlace"
            class="ob__input-inner"
            type="text"
            maxlength="64"
            placeholder="例如：北京 · 朝阳"
            placeholder-class="ob__ph"
            :adjust-position="true"
            confirm-type="done"
          />
        </view>
      </view>

      <!-- 6 停留 -->
      <view v-if="step === 6" class="ob__panel">
        <text class="ob__title">你会呆多久？</text>
        <view class="ob__cards">
          <view
            v-for="sk in meta.stayKinds"
            :key="sk.id"
            class="ob__card"
            :class="{ 'ob__card--on': form.stayKind === sk.id }"
            @click="onPickStay(sk.id)"
          >
            <text class="ob__card-title">{{ sk.label }}</text>
          </view>
        </view>
        <picker v-if="form.stayKind === 'fixed_dates'" mode="date" :value="stayDate" @change="onStayDate">
          <view class="ob__picker">{{ stayDate || '选择大致离开日期' }}</view>
        </picker>
      </view>

      <!-- 7 简介 -->
      <view v-if="step === 7" class="ob__panel">
        <text class="ob__title">一句话介绍自己</text>
        <text class="ob__sub">可跳过</text>
        <textarea
          v-model="form.bio"
          class="ob__textarea"
          maxlength="80"
          placeholder="爱好、节奏、希望认识什么人…"
          placeholder-class="ob__ph"
        />
        <text class="ob__count">{{ (form.bio || '').length }}/80</text>
      </view>

      <!-- 8 兴趣 -->
      <view v-if="step === 8" class="ob__panel">
        <text class="ob__title">兴趣标签</text>
        <text class="ob__sub">最多 {{ maxTags }} 个，用于推荐活动</text>
        <view v-for="cat in meta.interestCategories" :key="cat.categoryId" class="ob__cat">
          <text class="ob__cat-name">{{ cat.name }}</text>
          <view class="ob__chips ob__chips--wrap">
            <view
              v-for="t in cat.tags"
              :key="t.id"
              class="ob__chip ob__chip--sm"
              :class="{ 'ob__chip--on': tagSet[t.id] }"
              @click="toggleTag(t.id)"
            >
              <text>{{ t.label }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 9 通知偏好 -->
      <view v-if="step === 9" class="ob__panel">
        <text class="ob__title">希望收到哪些动态？</text>
        <label class="ob__row">
          <switch :checked="notifyAll" color="#ec4899" @change="onNotifyAll" />
          <text>全部活动提醒</text>
        </label>
        <text class="ob__sub">关闭后可在「我的」里再打开</text>
      </view>

      <!-- 10 定位说明 -->
      <view v-if="step === 10" class="ob__panel">
        <text class="ob__title">发现身边的人</text>
        <text class="ob__desc">
          后续你可以在发布活动、浏览列表时使用地图与定位；我们不会公开你的精确坐标，仅展示大致区域与距离（可在下一步关闭）。
        </text>
      </view>

      <!-- 11 展示距离 -->
      <view v-if="step === 11" class="ob__panel">
        <text class="ob__title">隐私</text>
        <label class="ob__row">
          <switch :checked="form.showDistance" color="#ec4899" @change="onShowDist" />
          <text>允许其他人看到我与 TA 的大致距离</text>
        </label>
      </view>

      <!-- 12 完成 -->
      <view v-if="step === 12" class="ob__panel">
        <text class="ob__title">准备好了</text>
        <text class="ob__desc">点击下方按钮保存资料并进入旅聚。稍后可在「我的」中继续编辑。</text>
      </view>
    </view>

    <view v-else class="ob__loading">
      <text>加载中…</text>
    </view>

    <view class="ob__footer">
      <view v-if="step > 0" class="ob__btn ob__btn--ghost" @click="prev">
        <text>上一步</text>
      </view>
      <view class="ob__btn ob__btn--primary" :class="{ 'ob__btn--disabled': !canNext && step < 12 }" @click="next">
        <text>{{ step >= 12 ? '进入旅聚' : '下一步' }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { getOnboardingMeta, updateMe } from '@/api'

const MAX_TAGS = 10

export default {
  data() {
    return {
      step: 0,
      totalSteps: 13,
      meta: null,
      genderOptions: [
        { value: 'male', label: '男' },
        { value: 'female', label: '女' },
        { value: 'unspecified', label: '保密' },
      ],
      form: {
        acquisitionSource: '',
        nickname: '',
        gender: '',
        countryCode: '',
        currentPlace: '',
        stayKind: '',
        bio: '',
        showDistance: true,
      },
      travelerSet: {},
      tagSet: {},
      stayDate: '',
      notifyAll: true,
      submitting: false,
    }
  },
  computed: {
    maxTags() {
      return MAX_TAGS
    },
    canNext() {
      const s = this.step
      if (s === 0) return !!this.form.acquisitionSource
      if (s === 1) return !!(this.form.nickname || '').trim()
      if (s === 2) return !!this.form.gender
      if (s === 3) return !!this.form.countryCode
      if (s === 4) return this.selectedTravelers.length > 0
      if (s === 5) return !!(this.form.currentPlace || '').trim()
      if (s === 6) {
        if (!this.form.stayKind) return false
        if (this.form.stayKind === 'fixed_dates' && !this.stayDate) return false
        return true
      }
      if (s === 8) return this.selectedTags.length > 0
      return true
    },
    selectedTravelers() {
      return Object.keys(this.travelerSet).filter((k) => this.travelerSet[k])
    },
    selectedTags() {
      return Object.keys(this.tagSet).filter((k) => this.tagSet[k])
    },
  },
  async onLoad() {
    try {
      this.meta = await getOnboardingMeta()
    } catch (e) {
      uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
    }
  },
  methods: {
    toggleTraveler(id) {
      const next = { ...this.travelerSet }
      if (next[id]) {
        delete next[id]
      } else {
        const keys = Object.keys(next).filter((k) => next[k])
        if (keys.length >= 2) {
          delete next[keys[0]]
        }
        next[id] = true
      }
      this.travelerSet = next
    },
    toggleTag(id) {
      const next = { ...this.tagSet }
      if (next[id]) {
        delete next[id]
      } else {
        const n = Object.keys(next).filter((k) => next[k]).length
        if (n >= MAX_TAGS) {
          uni.showToast({ title: `最多 ${MAX_TAGS} 个`, icon: 'none' })
          return
        }
        next[id] = true
      }
      this.tagSet = next
    },
    onPickStay(id) {
      this.form.stayKind = id
      if (id !== 'fixed_dates') {
        this.stayDate = ''
      }
    },
    onStayDate(e) {
      this.stayDate = (e.detail && e.detail.value) || ''
    },
    onNotifyAll(e) {
      this.notifyAll = !!(e.detail && e.detail.value)
    },
    onShowDist(e) {
      this.form.showDistance = !!(e.detail && e.detail.value)
    },
    prev() {
      if (this.step > 0) this.step -= 1
    },
    async next() {
      if (this.step < 12 && !this.canNext) {
        uni.showToast({ title: '请先完成本页', icon: 'none' })
        return
      }
      if (this.step < 12) {
        this.step += 1
        return
      }
      await this.submitAll()
    },
    async submitAll() {
      if (this.submitting) return
      this.submitting = true
      const tags = this.selectedTags
      let stayEndAt = ''
      if (this.form.stayKind === 'fixed_dates' && this.stayDate) {
        const d = new Date(this.stayDate + 'T23:59:59')
        stayEndAt = d.toISOString()
      }
      const bio = (this.form.bio || '').trim()
      const payload = {
        acquisitionSource: this.form.acquisitionSource,
        nickname: (this.form.nickname || '').trim(),
        gender: this.form.gender,
        countryCode: this.form.countryCode,
        travelerRoles: this.selectedTravelers,
        currentPlace: (this.form.currentPlace || '').trim(),
        stayKind: this.form.stayKind || null,
        stayEndAt,
        tags,
        notifyPrefs: { all: this.notifyAll },
        showDistance: this.form.showDistance,
        completeOnboarding: true,
      }
      if (bio) payload.bio = bio
      try {
        await updateMe(payload)
        uni.showToast({ title: '欢迎加入旅聚', icon: 'success' })
        setTimeout(() => {
          uni.reLaunch({ url: '/pages/home/home' })
        }, 400)
      } catch (e) {
        uni.showToast({ title: e?.message || '保存失败', icon: 'none' })
      } finally {
        this.submitting = false
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.page.ob {
  min-height: 100vh;
  padding: calc(40rpx + var(--status-bar-height, 0px)) 32rpx 180rpx;
  background: transparent;
  box-sizing: border-box;
}
.ob__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32rpx;
}
.ob__brand {
  font-size: 32rpx;
  font-weight: 800;
  background: linear-gradient(135deg, #ff6b6b 0%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.ob__progress {
  font-size: 26rpx;
  color: $wm-text-3;
  font-weight: 500;
}
.ob__body {
  padding-bottom: 24rpx;
}
.ob__loading {
  padding: 80rpx 0;
  text-align: center;
  color: $wm-text-3;
}
.ob__panel {
  background: #fff;
  border-radius: $wm-radius-xl;
  padding: 36rpx;
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
    height: 6rpx;
    background: $wm-gradient-primary;
    opacity: 0.8;
  }
}
.ob__title {
  display: block;
  font-size: 44rpx;
  font-weight: 800;
  color: $wm-text-1;
  margin-bottom: 14rpx;
  line-height: 1.2;
}
.ob__sub {
  display: block;
  font-size: 28rpx;
  color: $wm-text-3;
  margin-bottom: 32rpx;
  font-weight: 500;
}
.ob__desc {
  display: block;
  font-size: 30rpx;
  color: $wm-text-2;
  line-height: 1.7;
  font-weight: 500;
}
.ob__chips {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}
.ob__chips--wrap {
  flex-direction: row;
  flex-wrap: wrap;
  gap: 18rpx;
}
.ob__chips--wrap .ob__chip {
  flex: 1 1 40%;
  min-width: 200rpx;
}
.ob__chip {
  padding: 28rpx 32rpx;
  border-radius: $wm-radius-lg;
  border: 2rpx solid #e2e8f0;
  background: #fff;
  font-size: 30rpx;
  color: $wm-text-1;
  font-weight: 600;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.ob__chip--sm {
  padding: 20rpx 26rpx;
  font-size: 28rpx;
}
.ob__chip--on {
  border-color: $wm-primary;
  background: $wm-primary-soft;
  color: $wm-primary;
  box-shadow: 0 4rpx 16rpx rgba(255, 107, 107, 0.15);
  transform: scale(1.02);
}
/* 微信小程序 input：边框与 padding 放在外层；内层固定 height === line-height，避免文字贴顶或被裁切 */
.ob__input-wrap {
  width: 100%;
  border-radius: $wm-radius-lg;
  border: 2rpx solid #e2e8f0;
  background: #fff;
  padding: 0 28rpx;
  box-sizing: border-box;
  min-height: 104rpx;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus-within {
    border-color: $wm-primary;
    box-shadow: 0 0 0 4rpx rgba(255, 107, 107, 0.1);
  }
}
.ob__input-inner {
  display: block;
  width: 100%;
  height: 104rpx;
  line-height: 104rpx;
  font-size: 32rpx;
  color: $wm-text-1;
  border: none;
  background: transparent;
  box-sizing: border-box;
  font-weight: 500;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', Helvetica,
    'Microsoft YaHei', sans-serif;
}
.ob__ph {
  color: $wm-text-3;
  font-size: 32rpx;
}
.ob__textarea {
  width: 100%;
  min-height: 200rpx;
  padding: 28rpx;
  border-radius: $wm-radius-lg;
  border: 2rpx solid #e2e8f0;
  font-size: 30rpx;
  line-height: 1.6;
  color: $wm-text-1;
  box-sizing: border-box;
  font-weight: 500;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus-within {
    border-color: $wm-primary;
    box-shadow: 0 0 0 4rpx rgba(255, 107, 107, 0.1);
  }
}
.ob__count {
  display: block;
  text-align: right;
  font-size: 24rpx;
  color: $wm-text-3;
  margin-top: 10rpx;
  font-weight: 500;
}
.ob__cards {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}
.ob__card {
  padding: 28rpx 32rpx;
  border-radius: $wm-radius-lg;
  border: 2rpx solid #e2e8f0;
  background: #fff;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.ob__card--on {
  border-color: $wm-primary;
  background: $wm-primary-soft;
  box-shadow: 0 4rpx 16rpx rgba(255, 107, 107, 0.15);
  transform: scale(1.01);
}
.ob__card-title {
  font-size: 32rpx;
  font-weight: 700;
  color: $wm-text-1;
}
.ob__card-desc {
  display: block;
  margin-top: 10rpx;
  font-size: 26rpx;
  color: $wm-text-3;
  font-weight: 500;
}
.ob__cat {
  margin-bottom: 32rpx;
}
.ob__cat-name {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  margin-bottom: 18rpx;
  color: $wm-text-2;
}
.ob__picker {
  margin-top: 28rpx;
  padding: 28rpx 32rpx;
  border-radius: $wm-radius-lg;
  border: 2rpx dashed rgba(255, 107, 107, 0.4);
  color: $wm-primary;
  font-size: 30rpx;
  font-weight: 600;
  background: $wm-primary-soft;
}
.ob__row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-top: 18rpx;
  font-size: 30rpx;
  color: $wm-text-2;
  font-weight: 500;
}
.ob__footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, rgba(255, 255, 255, 0), rgba(248, 250, 252, 0.98) 25%);
  backdrop-filter: blur(20rpx);
  display: flex;
  gap: 24rpx;
}
.ob__btn {
  flex: 1;
  text-align: center;
  padding: 30rpx;
  border-radius: $wm-radius-xl;
  font-size: 32rpx;
  font-weight: 700;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s;

  &:active {
    transform: scale(0.98);
  }
}
.ob__btn--primary {
  background: $wm-gradient-primary;
  color: #fff;
  box-shadow: $wm-shadow-glow;
}
.ob__btn--ghost {
  flex: 0.45;
  background: #fff;
  border: 2rpx solid rgba(0, 0, 0, 0.08);
  color: $wm-text-2;
  box-shadow: $wm-shadow-sm;
}
.ob__btn--disabled {
  opacity: 0.5;
}
</style>
