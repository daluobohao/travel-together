<template>
  <view class="mention-text">
    <block v-for="(seg, idx) in segments" :key="idx">
      <text
        v-if="seg.type === 'mention'"
        class="mention-text__mention"
        @click.stop="onMentionTap(seg)"
      >{{ seg.text }}</text>
      <text v-else class="mention-text__plain" selectable>{{ seg.text }}</text>
    </block>
  </view>
</template>

<script>
import { buildTextSegments } from '@/utils/chatMentions'

export default {
  props: {
    text: { type: String, default: '' },
    mentions: { type: Array, default: () => [] },
  },
  computed: {
    segments() {
      return buildTextSegments(this.text, this.mentions)
    },
  },
  methods: {
    onMentionTap(seg) {
      if (!seg?.userId) return
      this.$emit('open-mention', {
        userId: seg.userId,
        nickname: seg.nickname,
      })
    },
  },
}
</script>

<style lang="scss" scoped>
.mention-text {
  display: inline;
  font-size: 32rpx;
  color: #191919;
  line-height: 1.5;
  word-break: break-word;
  white-space: pre-wrap;
}

.mention-text__plain {
  font-size: 32rpx;
  color: #191919;
  line-height: 1.5;
}

.mention-text__mention {
  font-size: 32rpx;
  color: #2563eb;
  line-height: 1.5;
  font-weight: 500;
}
</style>
