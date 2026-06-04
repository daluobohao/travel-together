<template>
  <view v-if="visible" class="pps" @touchmove.stop.prevent="noop">
    <view class="pps__mask" :class="{ 'pps__mask--in': animating }" @click="onCancel" />
    <view class="pps__panel" :class="{ 'pps__panel--in': animating }">
      <view class="pps__handle" />
      <text class="pps__title">你想发布什么？</text>

      <view class="pps__option" hover-class="pps__option--hover" @click="onPick('activity')">
        <view class="pps__icon pps__icon--activity">
          <wm-icon name="calendar" :size="40" color="#0d9488" />
        </view>
        <view class="pps__body">
          <text class="pps__option-title">今天见面</text>
          <text class="pps__option-desc">定时间地点，方便他人报名一起见</text>
        </view>
        <wm-icon name="chevronRight" :size="28" color="#cbd5e1" />
      </view>

      <view class="pps__option" hover-class="pps__option--hover" @click="onPick('feed')">
        <view class="pps__icon pps__icon--feed">
          <wm-icon name="camera" :size="40" color="#6366f1" />
        </view>
        <view class="pps__body">
          <text class="pps__option-title">发同城状态</text>
          <text class="pps__option-desc">图文分享、找搭子、记录今天</text>
        </view>
        <wm-icon name="chevronRight" :size="28" color="#cbd5e1" />
      </view>

      <view class="pps__cancel" hover-class="pps__cancel--hover" @click="onCancel">
        <text>取消</text>
      </view>
    </view>
  </view>
</template>

<script>
import WmIcon from '../WmIcon/WmIcon.vue'

export default {
  name: 'PublishPickerSheet',
  components: { WmIcon },
  props: {
    visible: { type: Boolean, default: false },
  },
  emits: ['update:visible', 'pick'],
  data() {
    return { animating: false }
  },
  watch: {
    visible(v) {
      if (v) {
        this.animating = false
        this.$nextTick(() => {
          setTimeout(() => {
            this.animating = true
          }, 20)
        })
      } else {
        this.animating = false
      }
    },
  },
  methods: {
    noop() {},
    onCancel() {
      this.$emit('update:visible', false)
    },
    onPick(type) {
      this.$emit('pick', type)
      this.$emit('update:visible', false)
    },
  },
}
</script>

<style lang="scss" scoped>
.pps {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;

  &__mask {
    position: absolute;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    opacity: 0;
    transition: opacity 0.25s ease;

    &--in {
      opacity: 1;
    }
  }

  &__panel {
    position: relative;
    z-index: 1;
    background: #ffffff;
    border-radius: 32rpx 32rpx 0 0;
    padding: 16rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
    box-shadow: 0 -16rpx 48rpx rgba(15, 23, 42, 0.12);
    transform: translateY(100%);
    transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);

    &--in {
      transform: translateY(0);
    }
  }

  &__handle {
    width: 64rpx;
    height: 8rpx;
    margin: 0 auto 24rpx;
    border-radius: 999rpx;
    background: rgba(148, 163, 184, 0.45);
  }

  &__title {
    display: block;
    font-size: 34rpx;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 28rpx;
  }

  &__option {
    display: flex;
    align-items: center;
    gap: 20rpx;
    padding: 28rpx 24rpx;
    margin-bottom: 16rpx;
    border-radius: 24rpx;
    background: #f8fafc;
    border: 1rpx solid rgba(148, 163, 184, 0.18);
    transition: background 0.15s ease, transform 0.15s ease;

    &--hover {
      background: #f1f5f9;
      transform: scale(0.99);
    }
  }

  &__icon {
    flex-shrink: 0;
    width: 80rpx;
    height: 80rpx;
    border-radius: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;

    &--activity {
      background: rgba(13, 148, 136, 0.12);
    }

    &--feed {
      background: rgba(99, 102, 241, 0.12);
    }
  }

  &__body {
    flex: 1;
    min-width: 0;
  }

  &__option-title {
    display: block;
    font-size: 30rpx;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.3;
  }

  &__option-desc {
    display: block;
    margin-top: 6rpx;
    font-size: 24rpx;
    color: #64748b;
    line-height: 1.45;
  }

  &__cancel {
    margin-top: 8rpx;
    height: 88rpx;
    border-radius: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 30rpx;
    color: #64748b;
    font-weight: 600;

    &--hover {
      background: #f8fafc;
    }
  }
}
</style>
