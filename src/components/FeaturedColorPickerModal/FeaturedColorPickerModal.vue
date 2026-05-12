<template>
  <view v-if="visible" class="fcp" @touchmove.stop.prevent="noop">
    <view class="fcp__mask" @click="onClose" />
    <view class="fcp__panel">
      <text class="fcp__title">精选卡片配色</text>
      <text class="fcp__hint">分别为 3 张精选卡片设置渐变主色（仅保存在本机）</text>

      <view class="fcp__tabs">
        <view
          v-for="n in 3"
          :key="n"
          class="fcp__tab"
          :class="{ 'fcp__tab--on': slotIndex === n - 1 }"
          @click="slotIndex = n - 1"
        >
          <text>卡片 {{ n }}</text>
        </view>
      </view>

      <view class="fcp__preview" :style="{ background: previewGradient }">
        <text class="fcp__preview-label">预览</text>
      </view>

      <view class="fcp__field">
        <text class="fcp__label">色相 {{ current.h }}</text>
        <slider
          class="fcp__slider"
          :value="current.h"
          min="0"
          max="360"
          step="1"
          active-color="#a78bfa"
          background-color="#334155"
          block-size="20"
          @change="onHue"
        />
      </view>
      <view class="fcp__field">
        <text class="fcp__label">饱和度 {{ current.s }}</text>
        <slider
          class="fcp__slider"
          :value="current.s"
          min="0"
          max="100"
          step="1"
          active-color="#34d399"
          background-color="#334155"
          block-size="20"
          @change="onSat"
        />
      </view>
      <view class="fcp__field">
        <text class="fcp__label">明度 {{ current.v }}</text>
        <slider
          class="fcp__slider"
          :value="current.v"
          min="0"
          max="100"
          step="1"
          active-color="#0d9488"
          background-color="#334155"
          block-size="20"
          @change="onVal"
        />
      </view>

      <view class="fcp__actions">
        <view class="fcp__btn fcp__btn--ghost" @click="onReset">
          <text>恢复默认</text>
        </view>
        <view class="fcp__btn fcp__btn--primary" @click="onSave">
          <text>完成</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import {
  DEFAULT_HSV_SLOTS,
  gradientCssFromHsv,
} from '@/utils/featuredGradient.js'

export default {
  name: 'FeaturedColorPickerModal',
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    valueSlots: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      slotIndex: 0,
      draftSlots: DEFAULT_HSV_SLOTS.map((s) => ({ ...s })),
    }
  },
  computed: {
    current() {
      return this.draftSlots[this.slotIndex] || DEFAULT_HSV_SLOTS[0]
    },
    previewGradient() {
      const s = this.current
      return gradientCssFromHsv(s.h, s.s, s.v)
    },
  },
  watch: {
    visible(v) {
      if (v) {
        const src =
          this.valueSlots && this.valueSlots.length === 3
            ? this.valueSlots
            : DEFAULT_HSV_SLOTS
        this.draftSlots = JSON.parse(JSON.stringify(src))
        this.slotIndex = 0
      }
    },
  },
  methods: {
    noop() {},
    patchSlot(patch) {
      const i = this.slotIndex
      const cur = this.draftSlots[i] || { ...DEFAULT_HSV_SLOTS[i] }
      this.$set(this.draftSlots, i, { ...cur, ...patch })
    },
    onHue(e) {
      this.patchSlot({ h: e.detail.value })
    },
    onSat(e) {
      this.patchSlot({ s: e.detail.value })
    },
    onVal(e) {
      this.patchSlot({ v: e.detail.value })
    },
    onReset() {
      this.draftSlots = JSON.parse(JSON.stringify(DEFAULT_HSV_SLOTS))
      this.slotIndex = 0
    },
    onSave() {
      this.$emit('save', this.draftSlots)
      this.$emit('close')
    },
    onClose() {
      this.$emit('close')
    },
  },
}
</script>

<style lang="scss" scoped>
.fcp {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 99990;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.fcp__mask {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.55);
}

.fcp__panel {
  position: relative;
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom));
  background: #0f172a;
  border-radius: 24rpx 24rpx 0 0;
  box-sizing: border-box;
}

.fcp__title {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: #f8fafc;
  margin-bottom: 12rpx;
}

.fcp__hint {
  display: block;
  font-size: 22rpx;
  color: #94a3b8;
  line-height: 1.45;
  margin-bottom: 28rpx;
}

.fcp__tabs {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.fcp__tab {
  flex: 1;
  text-align: center;
  padding: 16rpx 12rpx;
  border-radius: 16rpx;
  background: #1e293b;
  border: 2rpx solid transparent;

  text {
    font-size: 24rpx;
    color: #cbd5e1;
    font-weight: 600;
  }

  &--on {
    border-color: #818cf8;
    background: #1e1b4b;

    text {
      color: #e0e7ff;
    }
  }
}

.fcp__preview {
  height: 160rpx;
  border-radius: 20rpx;
  margin-bottom: 28rpx;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 16rpx 20rpx;
  box-shadow: inset 0 0 0 1rpx rgba(255, 255, 255, 0.08);
}

.fcp__preview-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.85);
  text-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.35);
}

.fcp__field {
  margin-bottom: 20rpx;
}

.fcp__label {
  display: block;
  font-size: 24rpx;
  color: #cbd5e1;
  margin-bottom: 8rpx;
}

.fcp__slider {
  margin: 0;
}

.fcp__actions {
  display: flex;
  gap: 20rpx;
  margin-top: 32rpx;
}

.fcp__btn {
  flex: 1;
  height: 88rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  text {
    font-size: 28rpx;
    font-weight: 600;
  }
}

.fcp__btn--ghost {
  background: #1e293b;
  border: 2rpx solid #334155;

  text {
    color: #e2e8f0;
  }
}

.fcp__btn--primary {
  background: #334155;

  text {
    color: #f8fafc;
  }
}
</style>
