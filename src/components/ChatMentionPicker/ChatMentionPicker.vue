<template>
  <view v-if="visible" class="mention-picker">
    <view class="mention-picker__search">
      <wm-icon name="search" :size="28" color="#94a3b8" />
      <input
        v-model="keyword"
        class="mention-picker__input"
        placeholder="搜索成员昵称"
        placeholder-class="mention-picker__placeholder"
        @input="onKeywordInput"
      />
    </view>
    <scroll-view class="mention-picker__list" scroll-y>
      <view v-if="loading" class="mention-picker__state"><text>加载中…</text></view>
      <view v-else-if="!displayList.length" class="mention-picker__state"><text>暂无成员</text></view>
      <view
        v-for="item in displayList"
        :key="item.userId"
        class="mention-picker__row"
        @click="pick(item)"
      >
        <view class="mention-picker__avatar">
          <image v-if="item.avatarUrl" :src="item.avatarUrl" mode="aspectFill" class="mention-picker__avatar-img" />
          <text v-else>{{ avatarLetter(item.nickname) }}</text>
        </view>
        <view class="mention-picker__main">
          <view class="mention-picker__name-row">
            <text class="mention-picker__name">{{ item.nickname || '用户' }}</text>
            <text v-if="item.role === 'owner'" class="mention-picker__tag">城主</text>
            <text v-else-if="item.role === 'deputy'" class="mention-picker__tag mention-picker__tag--dep">管理</text>
            <text v-else-if="item.role === 'organizer'" class="mention-picker__tag">发起人</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import { getActivityMembers } from '@/api'

export default {
  components: { WmIcon },
  props: {
    visible: { type: Boolean, default: false },
    activityId: { type: String, default: '' },
    keywordSeed: { type: String, default: '' },
  },
  data() {
    return {
      keyword: '',
      loading: false,
      list: [],
      searchTimer: null,
    }
  },
  computed: {
    displayList() {
      return this.list || []
    },
  },
  watch: {
    visible(val) {
      if (val) {
        this.keyword = this.keywordSeed || ''
        this.loadMembers(this.keyword)
      } else {
        this.list = []
      }
    },
    keywordSeed(val) {
      if (this.visible) {
        this.keyword = val || ''
        this.scheduleSearch()
      }
    },
  },
  beforeDestroy() {
    if (this.searchTimer) clearTimeout(this.searchTimer)
  },
  methods: {
    avatarLetter(name) {
      return String(name || '?').slice(0, 1)
    },
    onKeywordInput() {
      this.scheduleSearch()
    },
    scheduleSearch() {
      if (this.searchTimer) clearTimeout(this.searchTimer)
      this.searchTimer = setTimeout(() => {
        this.loadMembers(this.keyword)
      }, 250)
    },
    async loadMembers(q) {
      if (!this.activityId) return
      this.loading = true
      try {
        const query = { page: 1, pageSize: 30 }
        const kw = String(q || '').trim()
        if (kw) query.q = kw
        const data = await getActivityMembers(this.activityId, query)
        this.list = data?.list || []
      } catch (e) {
        this.list = []
      } finally {
        this.loading = false
      }
    },
    pick(item) {
      if (!item?.userId) return
      this.$emit('pick', {
        userId: item.userId,
        nickname: item.nickname || '用户',
        role: item.role || 'member',
      })
    },
  },
}
</script>

<style lang="scss" scoped>
.mention-picker {
  background: #f3f4f6;
  border-top: 1rpx solid #e5e7eb;
  padding: 16rpx 20rpx 20rpx;
}

.mention-picker__search {
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 0 20rpx;
  height: 72rpx;
  margin-bottom: 12rpx;
}

.mention-picker__input {
  flex: 1;
  font-size: 28rpx;
  color: #0f172a;
}

.mention-picker__placeholder {
  color: #94a3b8;
}

.mention-picker__list {
  max-height: 360rpx;
}

.mention-picker__state {
  padding: 40rpx 0;
  text-align: center;
  font-size: 26rpx;
  color: #94a3b8;
}

.mention-picker__row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 8rpx;
  border-radius: 12rpx;
}

.mention-picker__row:active {
  background: rgba(15, 23, 42, 0.05);
}

.mention-picker__avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 12rpx;
  background: #cbd5e1;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.mention-picker__avatar-img {
  width: 100%;
  height: 100%;
}

.mention-picker__main {
  flex: 1;
  min-width: 0;
}

.mention-picker__name-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.mention-picker__name {
  font-size: 30rpx;
  color: #0f172a;
}

.mention-picker__tag {
  font-size: 20rpx;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.12);
  padding: 2rpx 10rpx;
  border-radius: 8rpx;

  &--dep {
    color: #64748b;
    background: rgba(100, 116, 139, 0.12);
  }
}
</style>
