<template>
  <view v-if="visible" class="hfs" @touchmove.stop.prevent="noop">
    <view class="hfs__mask" :class="{ 'hfs__mask--in': animating }" @click="onClose" />
    <view class="hfs__panel" :class="{ 'hfs__panel--in': animating }">
      <view class="hfs__handle" />
      <text class="hfs__title">筛选</text>

      <scroll-view class="hfs__scroll" scroll-y :show-scrollbar="false">
        <text class="hfs__section-label">排序</text>
        <view class="hfs__segment">
          <view
            class="hfs__segment-item"
            :class="{ 'hfs__segment-item--on': draftSort === sortDistance }"
            @click="draftSort = sortDistance"
          >
            <text>距离优先</text>
          </view>
          <view
            class="hfs__segment-item"
            :class="{ 'hfs__segment-item--on': draftSort === sortPopularity }"
            @click="draftSort = sortPopularity"
          >
            <text>人气优先</text>
          </view>
        </view>

        <text class="hfs__section-label">活动类型</text>
        <view class="hfs__chips">
          <view
            v-for="cat in categoryChips"
            :key="cat.key"
            class="hfs__chip"
            :class="{ 'hfs__chip--on': draftCategoryId === cat.key }"
            @click="draftCategoryId = cat.key"
          >
            <text>{{ cat.label }}</text>
          </view>
        </view>
      </scroll-view>

      <view class="hfs__footer">
        <view class="hfs__btn hfs__btn--ghost" hover-class="hfs__btn--hover" @click="onReset">
          <text>重置</text>
        </view>
        <view class="hfs__btn hfs__btn--primary" hover-class="hfs__btn--hover" @click="onConfirm">
          <text>确定</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import {
  HOME_CATEGORY_ALL,
  HOME_SORT_DISTANCE,
  HOME_SORT_POPULARITY,
} from '@/constants/homeActivityList'

export default {
  name: 'HomeFilterSheet',
  props: {
    visible: { type: Boolean, default: false },
    activeSort: { type: String, default: HOME_SORT_DISTANCE },
    activeCategoryId: { type: String, default: HOME_CATEGORY_ALL },
    categoryChips: {
      type: Array,
      default: () => [],
    },
  },
  emits: ['update:visible', 'confirm'],
  data() {
    return {
      animating: false,
      draftSort: HOME_SORT_DISTANCE,
      draftCategoryId: HOME_CATEGORY_ALL,
      sortDistance: HOME_SORT_DISTANCE,
      sortPopularity: HOME_SORT_POPULARITY,
    }
  },
  watch: {
    visible(v) {
      if (v) {
        this.draftSort = this.activeSort || HOME_SORT_DISTANCE
        this.draftCategoryId = this.activeCategoryId ?? HOME_CATEGORY_ALL
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
    onClose() {
      this.$emit('update:visible', false)
    },
    onReset() {
      this.draftSort = HOME_SORT_DISTANCE
      this.draftCategoryId = HOME_CATEGORY_ALL
    },
    onConfirm() {
      this.$emit('confirm', {
        sort: this.draftSort,
        categoryId: this.draftCategoryId,
      })
      this.$emit('update:visible', false)
    },
  },
}
</script>

<style lang="scss" scoped>
.hfs {
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
    max-height: 72vh;
    background: #ffffff;
    border-radius: 32rpx 32rpx 0 0;
    padding: 16rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
    box-shadow: 0 -16rpx 48rpx rgba(15, 23, 42, 0.12);
    transform: translateY(100%);
    transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
    display: flex;
    flex-direction: column;

    &--in {
      transform: translateY(0);
    }
  }

  &__handle {
    width: 64rpx;
    height: 8rpx;
    margin: 0 auto 20rpx;
    border-radius: 999rpx;
    background: rgba(148, 163, 184, 0.45);
  }

  &__title {
    font-size: 34rpx;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 8rpx;
  }

  &__scroll {
    flex: 1;
    min-height: 0;
    max-height: 52vh;
    padding-top: 12rpx;
  }

  &__section-label {
    display: block;
    font-size: 26rpx;
    font-weight: 600;
    color: #64748b;
    margin: 20rpx 0 16rpx;
  }

  &__segment {
    display: flex;
    padding: 6rpx;
    border-radius: 16rpx;
    background: #f1f5f9;
    gap: 6rpx;
  }

  &__segment-item {
    flex: 1;
    height: 72rpx;
    border-radius: 12rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28rpx;
    color: #64748b;
    font-weight: 600;

    &--on {
      background: #ffffff;
      color: #0284c7;
      box-shadow: 0 4rpx 12rpx rgba(15, 23, 42, 0.06);
    }
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
    padding-bottom: 24rpx;
  }

  &__chip {
    padding: 14rpx 28rpx;
    border-radius: 999rpx;
    background: #f8fafc;
    border: 2rpx solid rgba(148, 163, 184, 0.28);
    font-size: 26rpx;
    font-weight: 600;
    color: #64748b;

    &--on {
      background: #e0f2fe;
      border-color: rgba(2, 132, 199, 0.35);
      color: #0284c7;
    }
  }

  &__footer {
    display: flex;
    gap: 20rpx;
    padding-top: 16rpx;
    border-top: 1rpx solid #f1f5f9;
  }

  &__btn {
    flex: 1;
    height: 88rpx;
    border-radius: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 30rpx;
    font-weight: 700;

    &--ghost {
      background: #f8fafc;
      color: #64748b;
      border: 2rpx solid rgba(148, 163, 184, 0.25);
    }

    &--primary {
      background: linear-gradient(135deg, #0284c7, #0d9488);
      color: #ffffff;
      box-shadow: 0 8rpx 24rpx rgba(2, 132, 199, 0.28);
    }

    &--hover {
      opacity: 0.88;
    }
  }
}
</style>
