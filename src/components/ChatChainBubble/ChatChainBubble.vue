<template>
  <view class="chain-bubble">
    <text class="chain-bubble__tag">接龙</text>
    <text class="chain-bubble__title">{{ title || '接龙' }}</text>
    <text v-if="description" class="chain-bubble__desc">{{ description }}</text>

    <view v-if="displayEntries.length" class="chain-bubble__list">
      <view v-for="(entry, idx) in displayEntries" :key="entry.entryId || idx" class="chain-bubble__row">
        <text class="chain-bubble__seq">{{ idx + 1 }}.</text>
        <text class="chain-bubble__name">{{ entry.nickname || '用户' }}</text>
        <text v-if="entry.note" class="chain-bubble__note">{{ entry.note }}</text>
      </view>
    </view>
    <text v-else class="chain-bubble__empty">还没有人参与</text>

    <view v-if="closed" class="chain-bubble__closed">
      <text>已截止</text>
    </view>
    <view v-else class="chain-bubble__actions">
      <view
        v-if="!joined"
        class="chain-bubble__btn chain-bubble__btn--primary"
        @click.stop="$emit('join')"
      >
        <text>参与接龙</text>
      </view>
      <view v-else class="chain-bubble__joined-row">
        <view class="chain-bubble__btn chain-bubble__btn--ghost" @click.stop="$emit('edit')">
          <text>修改备注</text>
        </view>
        <view class="chain-bubble__btn chain-bubble__btn--ghost" @click.stop="$emit('leave')">
          <text>取消参与</text>
        </view>
      </view>
      <view
        v-if="canClose"
        class="chain-bubble__btn chain-bubble__btn--link"
        @click.stop="$emit('close')"
      >
        <text>截止接龙</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  props: {
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    closed: { type: Boolean, default: false },
    entries: { type: Array, default: () => [] },
    currentUserId: { type: String, default: '' },
    canClose: { type: Boolean, default: false },
    maxDisplay: { type: Number, default: 8 },
  },
  computed: {
    displayEntries() {
      const list = Array.isArray(this.entries) ? this.entries : []
      return list.slice(0, this.maxDisplay)
    },
    joined() {
      const me = String(this.currentUserId || '').trim()
      if (!me) return false
      return (this.entries || []).some((e) => String(e?.userId || '') === me)
    },
  },
}
</script>

<style lang="scss" scoped>
.chain-bubble {
  padding: 20rpx 24rpx;
  background: #ffffff;
  border-radius: 12rpx;
  border: 1rpx solid #e2e8f0;
  min-width: 320rpx;
  max-width: 520rpx;
  box-sizing: border-box;
}

.chain-bubble__tag {
  display: block;
  font-size: 22rpx;
  color: #0d9488;
  margin-bottom: 8rpx;
}

.chain-bubble__title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.4;
  margin-bottom: 6rpx;
}

.chain-bubble__desc {
  display: block;
  font-size: 24rpx;
  color: #64748b;
  line-height: 1.45;
  margin-bottom: 12rpx;
}

.chain-bubble__list {
  margin-top: 8rpx;
  margin-bottom: 12rpx;
}

.chain-bubble__row {
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
  margin-bottom: 8rpx;
  font-size: 26rpx;
  line-height: 1.45;
}

.chain-bubble__seq {
  color: #94a3b8;
  flex-shrink: 0;
}

.chain-bubble__name {
  color: #334155;
  flex-shrink: 0;
}

.chain-bubble__note {
  color: #64748b;
  flex: 1;
  word-break: break-word;
}

.chain-bubble__empty {
  display: block;
  font-size: 24rpx;
  color: #94a3b8;
  margin: 8rpx 0 12rpx;
}

.chain-bubble__closed {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #94a3b8;
}

.chain-bubble__actions {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-top: 8rpx;
}

.chain-bubble__joined-row {
  display: flex;
  gap: 12rpx;
}

.chain-bubble__btn {
  border-radius: 999rpx;
  padding: 14rpx 24rpx;
  text-align: center;
  font-size: 26rpx;
  font-weight: 600;

  &--primary {
    background: #0d9488;
    color: #ffffff;
  }

  &--ghost {
    flex: 1;
    background: #f0fdfa;
    color: #0f766e;
    border: 1rpx solid #99f6e4;
  }

  &--link {
    padding: 8rpx 0;
    font-size: 24rpx;
    font-weight: 500;
    color: #64748b;
    background: transparent;
  }
}
</style>
