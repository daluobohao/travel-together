<template>
  <view class="page user-public">
    <view class="user-public__header">
      <view class="user-public__back" @click="goBack">
        <wm-icon name="chevronLeft" :size="36" color="#0f172a" />
      </view>
      <text class="user-public__header-title">{{ headerTitle }}</text>
      <view class="user-public__placeholder" />
    </view>

    <view v-if="loading" class="user-public__state">
      <text>加载中…</text>
    </view>
    <view v-else-if="!profile" class="user-public__state">
      <text>暂无法获取该用户资料</text>
    </view>
    <view v-else class="user-public__content">
      <view v-if="profile && profile.__offlineSnapshot" class="offline-tip">
        <text>无法拉取服务端公开资料，以下为活动详情页带入的发起人摘要。</text>
      </view>
      <view class="hero">
        <view class="hero__avatar">
          <image v-if="profile.avatarUrl" class="hero__avatar-img" :src="profile.avatarUrl" mode="aspectFill" />
          <text v-else class="hero__avatar-text">{{ displayInitial }}</text>
        </view>
        <view class="hero__name-row">
          <text class="hero__name">{{ profile.nickname || '用户' }}</text>
          <view v-if="profile.verificationBadge" class="hero__badge">
            <wm-icon name="check" :size="20" color="#059669" />
            <text>已认证</text>
          </view>
        </view>
        <text class="hero__stat">已组织 {{ profile.organizedCount || 0 }} 场活动</text>
        <text v-if="publicGenderLabel" class="hero__gender">{{ publicGenderLabel }}</text>
        <view v-if="showFollowBtn" class="hero__follow">
          <button
            class="follow-btn"
            :class="{ 'follow-btn--on': followFollowing }"
            :disabled="followLoading"
            @click="toggleFollow"
          >
            {{ followFollowing ? '已关注' : '关注' }}
          </button>
        </view>
      </view>

      <view v-if="profile.tags && profile.tags.length" class="panel">
        <text class="section-title">兴趣标签</text>
        <view class="tags">
          <text v-for="(t, i) in profile.tags" :key="i" class="tags__item">{{ t }}</text>
        </view>
      </view>

      <view class="panel">
        <text class="section-title">个人简介</text>
        <text v-if="profile.bio" class="bio">{{ profile.bio }}</text>
        <text v-else class="bio bio--empty">暂无简介</text>
      </view>

      <view v-if="userPosts.length" class="panel">
        <text class="section-title">Ta 的动态</text>
        <feed-post-card
          v-for="p in userPosts"
          :key="p.postId"
          :item="p"
          @open="openFeedDetail"
        />
      </view>

      <view v-if="activityIdNorm && !profile.__offlineSnapshot" class="panel panel--dm">
        <text class="section-title">私聊</text>
        <view v-if="dmLoading" class="dm-hint"><text>加载关系…</text></view>
        <template v-else>
          <button
            v-if="dmCtx.threadId"
            class="dm-btn dm-btn--primary"
            @click="openDirectChat(dmCtx.threadId)"
          >
            进入私聊
          </button>
          <template v-else-if="dmCtx.incomingPendingRequestId">
            <text class="dm-note">对方申请与你私聊</text>
            <view class="dm-row">
              <button class="dm-btn dm-btn--primary" @click="acceptIncoming">同意</button>
              <button class="dm-btn dm-btn--ghost" @click="rejectIncoming">拒绝</button>
            </view>
          </template>
          <template v-else-if="dmCtx.outgoingPendingRequestId">
            <button class="dm-btn dm-btn--disabled" disabled>已发送申请，等待对方同意</button>
            <button class="dm-btn dm-btn--link" @click="cancelOutgoing">撤回申请</button>
          </template>
          <template v-else-if="dmCtx.canRequest">
            <view v-if="showIntro">
              <textarea
                v-model="introDraft"
                class="dm-textarea"
                placeholder="选填附言"
                maxlength="500"
              />
              <button class="dm-btn dm-btn--primary" @click="submitDmRequest">发送申请</button>
              <button class="dm-btn dm-btn--link" @click="showIntro = false">取消</button>
            </view>
            <button v-else class="dm-btn dm-btn--primary" @click="showIntro = true">申请私聊</button>
          </template>
          <text v-else class="dm-note">{{ denyDmText }}</text>
        </template>
      </view>
    </view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import FeedPostCard from '@/components/FeedPostCard/FeedPostCard.vue'
import {
  formatUserGenderLabel,
  followUser,
  getFollowStatus,
  getUserFeedPosts,
  getUserPublicProfile,
  getUserDmContext,
  getMe,
  isLoggedIn,
  normalizeActivityIdForApi,
  createDmRequest,
  acceptDmRequest,
  rejectDmRequest,
  cancelDmRequest,
  unfollowUser,
} from '@/api'
import { ensureTextContentSafe, SEC_SCENE } from '@/utils/contentSecurity'

export default {
  components: { WmIcon, FeedPostCard },
  data() {
    return {
      loading: true,
      profile: null,
      /** 从活动详情页带入，供接口失败时展示 */
      snapshot: null,
      /** 活动语境（群聊里点头像带入），用于私聊申请校验 */
      activityIdNorm: '',
      dmLoading: false,
      dmCtx: {
        threadId: null,
        outgoingPendingRequestId: null,
        incomingPendingRequestId: null,
        canRequest: false,
        denyReason: null,
      },
      showIntro: false,
      introDraft: '',
      targetUserId: '',
      myUserId: '',
      followFollowing: false,
      followLoading: false,
      userPosts: [],
    }
  },
  computed: {
    showFollowBtn() {
      if (!isLoggedIn() || !this.targetUserId || this.profile?.__offlineSnapshot) return false
      if (!this.myUserId) return true
      return String(this.myUserId) !== String(this.targetUserId)
    },
    headerTitle() {
      return this.activityIdNorm ? '用户资料' : '发起人资料'
    },
    displayInitial() {
      const n = this.profile?.nickname || '用'
      return String(n).slice(0, 1)
    },
    publicGenderLabel() {
      return formatUserGenderLabel(this.profile?.gender)
    },
    denyDmText() {
      const r = this.dmCtx?.denyReason
      const map = {
        self: '这是你自己',
        blocked: '无法发起私聊',
        not_in_activity: '请先加入该活动',
        target_not_in_activity: '对方不在该活动中',
        has_thread: '已与对方开通私聊',
        pending_outgoing: '已发送申请',
        pending_incoming: '对方已向你发起申请',
      }
      return map[r] || (r ? `暂不可申请（${r}）` : '')
    },
  },
  onLoad(query) {
    const userId = query?.userId ? String(query.userId) : ''
    this.targetUserId = userId
    let snapTags = []
    if (query.tags) {
      try {
        snapTags = JSON.parse(decodeURIComponent(query.tags))
      } catch (e) {
        snapTags = []
      }
    }
    if (!Array.isArray(snapTags)) snapTags = []
    const rawAct = query.activityId || query.actId || query.activity_id
    this.activityIdNorm = rawAct ? normalizeActivityIdForApi(String(rawAct)) : ''

    this.snapshot = {
      userId,
      nickname: query.nick ? decodeURIComponent(query.nick) : '',
      avatarUrl: query.ava ? decodeURIComponent(query.ava) : '',
      bio: query.bio ? decodeURIComponent(query.bio) : '',
      tags: snapTags,
      organizedCount: query.hosted != null && query.hosted !== '' ? Number(query.hosted) : NaN,
      verificationBadge: query.v === '1' || query.v === 'true',
    }
    this.loadProfile(userId)
  },
  methods: {
    async loadDmContext() {
      if (!this.activityIdNorm || !this.targetUserId || this.profile?.__offlineSnapshot) return
      this.dmLoading = true
      try {
        const data = await getUserDmContext(this.targetUserId, this.activityIdNorm)
        this.dmCtx = {
          threadId: data?.threadId || null,
          outgoingPendingRequestId: data?.outgoingPendingRequestId || null,
          incomingPendingRequestId: data?.incomingPendingRequestId || null,
          canRequest: !!data?.canRequest,
          denyReason: data?.denyReason || null,
        }
      } catch (e) {
        console.warn(e)
      } finally {
        this.dmLoading = false
      }
    },
    openDirectChat(threadId) {
      const nick = encodeURIComponent(this.profile?.nickname || '')
      const uid = this.targetUserId ? '&peerUserId=' + encodeURIComponent(this.targetUserId) : ''
      const ava = this.profile?.avatarUrl ? '&peerAvatarUrl=' + encodeURIComponent(this.profile.avatarUrl) : ''
      uni.navigateTo({
        url:
          '/pages/direct-chat-detail/direct-chat-detail?threadId=' +
          encodeURIComponent(threadId) +
          '&peerNickname=' +
          nick +
          uid +
          ava,
      })
    },
    async submitDmRequest() {
      const introText = (this.introDraft || '').trim() || undefined
      try {
        if (introText) {
          await ensureTextContentSafe(introText, SEC_SCENE.SOCIAL)
        }
        await createDmRequest(this.activityIdNorm, {
          toUserId: this.targetUserId,
          introText,
        })
        uni.showToast({ title: '已发送', icon: 'success' })
        this.showIntro = false
        this.introDraft = ''
        await this.loadDmContext()
      } catch (e) {
        if (e?.code === 409 && e?.data?.threadId) {
          this.openDirectChat(e.data.threadId)
          return
        }
        if (e?.code === 409) {
          uni.showToast({ title: e?.message || '请稍后再试', icon: 'none' })
          await this.loadDmContext()
          return
        }
        uni.showToast({ title: e?.message || '发送失败', icon: 'none' })
      }
    },
    async acceptIncoming() {
      const id = this.dmCtx.incomingPendingRequestId
      if (!id) return
      try {
        const data = await acceptDmRequest(id)
        uni.showToast({ title: '已同意', icon: 'success' })
        this.openDirectChat(data.threadId)
      } catch (e) {
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
      }
    },
    async rejectIncoming() {
      const id = this.dmCtx.incomingPendingRequestId
      if (!id) return
      try {
        await rejectDmRequest(id)
        uni.showToast({ title: '已拒绝', icon: 'none' })
        await this.loadDmContext()
      } catch (e) {
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
      }
    },
    async cancelOutgoing() {
      const id = this.dmCtx.outgoingPendingRequestId
      if (!id) return
      try {
        await cancelDmRequest(id)
        uni.showToast({ title: '已撤回', icon: 'none' })
        await this.loadDmContext()
      } catch (e) {
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
      }
    },
    profileFromSnapshot() {
      const s = this.snapshot
      if (!s || !s.userId) return null
      return {
        userId: s.userId,
        nickname: s.nickname || '用户',
        avatarUrl: s.avatarUrl || null,
        bio: (s.bio && String(s.bio).trim()) || '',
        tags: Array.isArray(s.tags) ? s.tags : [],
        verificationBadge: s.verificationBadge,
        organizedCount: Number.isFinite(s.organizedCount) ? s.organizedCount : 0,
        __offlineSnapshot: true,
      }
    },
    openFeedDetail(item) {
      uni.navigateTo({
        url: `/pages/feed-detail/feed-detail?postId=${encodeURIComponent(item.postId)}`,
      })
    },
    async loadFollowStatus() {
      if (!this.showFollowBtn) return
      try {
        const d = await getFollowStatus(this.targetUserId)
        this.followFollowing = !!d?.following
      } catch (_) {
        this.followFollowing = false
      }
    },
    async toggleFollow() {
      if (this.followLoading) return
      this.followLoading = true
      try {
        if (this.followFollowing) {
          await unfollowUser(this.targetUserId)
          this.followFollowing = false
        } else {
          await followUser(this.targetUserId)
          this.followFollowing = true
        }
      } catch (e) {
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
      } finally {
        this.followLoading = false
      }
    },
    async loadUserPosts() {
      if (!this.targetUserId || this.profile?.__offlineSnapshot) return
      try {
        const d = await getUserFeedPosts(this.targetUserId, { page: 1, pageSize: 10 })
        this.userPosts = d?.list || []
      } catch (_) {
        this.userPosts = []
      }
    },
    async loadProfile(userId) {
      if (!userId) {
        this.loading = false
        this.profile = this.profileFromSnapshot()
        if (!this.profile) {
          uni.showToast({ title: '缺少用户 ID', icon: 'none' })
        }
        return
      }
      this.loading = true
      try {
        const data = await getUserPublicProfile(userId)
        if (data) {
          let merged = { ...data, __offlineSnapshot: false }
          const snapBio = (this.snapshot?.bio || '').trim()
          const apiBio = (merged.bio || '').trim()
          if (!apiBio && snapBio) merged = { ...merged, bio: snapBio }
          const snapTags = Array.isArray(this.snapshot?.tags) ? this.snapshot.tags.filter(Boolean) : []
          if (!(merged.tags && merged.tags.length) && snapTags.length) merged = { ...merged, tags: snapTags }
          const snapNick = (this.snapshot?.nickname || '').trim()
          if (snapNick && (!merged.nickname || merged.nickname === '用户')) {
            merged = { ...merged, nickname: snapNick }
          }
          if (!merged.avatarUrl && this.snapshot?.avatarUrl) {
            merged = { ...merged, avatarUrl: this.snapshot.avatarUrl }
          }
          this.profile = merged
        } else {
          this.profile = this.profileFromSnapshot()
        }
        await this.loadDmContext()
      } catch (e) {
        const snap = this.profileFromSnapshot()
        this.profile = snap
        if (!snap) {
          uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
        } else if (e?.needLogin || e?.isAuthError) {
          uni.showToast({ title: '请先登录后查看资料', icon: 'none' })
        }
        await this.loadDmContext()
      } finally {
        this.loading = false
      }
      if (isLoggedIn()) {
        try {
          const me = await getMe()
          this.myUserId = me?.userId ? String(me.userId) : ''
        } catch (_) {
          this.myUserId = ''
        }
      }
      await Promise.all([this.loadFollowStatus(), this.loadUserPosts()])
    },
    goBack() {
      uni.navigateBack({
        fail: () => uni.switchTab({ url: '/pages/home/home' }),
      })
    },
  },
}
</script>

<style lang="scss" scoped>
.user-public {
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

  &__back,
  &__placeholder {
    width: 72rpx;
    height: 72rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__header-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #0f172a;
  }

  &__content {
    padding: 24rpx;
    display: flex;
    flex-direction: column;
    gap: 20rpx;
  }

  &__state {
    padding: 80rpx 32rpx;
    text-align: center;
    font-size: 28rpx;
    color: #94a3b8;
  }
}

.offline-tip {
  margin-bottom: 8rpx;
  padding: 16rpx 20rpx;
  background: #fffbeb;
  border-radius: 16rpx;
  border: 1rpx solid #fde68a;

  text {
    font-size: 22rpx;
    line-height: 1.5;
    color: #92400e;
  }
}

.follow-btn {
  margin-top: 20rpx;
  padding: 12rpx 48rpx;
  font-size: 28rpx;
  border-radius: 999rpx;
  background: #0284c7;
  color: #fff;
  border: none;
  line-height: 1.4;
  &--on {
    background: #f1f5f9;
    color: #64748b;
  }
}

.hero {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 40rpx 32rpx 36rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;

  &__avatar {
    width: 160rpx;
    height: 160rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, #a78bfa, #6366f1);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    margin-bottom: 24rpx;
  }

  &__avatar-img {
    width: 100%;
    height: 100%;
  }

  &__avatar-text {
    font-size: 56rpx;
    font-weight: 700;
    color: #ffffff;
  }

  &__name-row {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 12rpx;
    margin-bottom: 12rpx;
  }

  &__name {
    font-size: 40rpx;
    font-weight: 700;
    color: #0f172a;
  }

  &__badge {
    display: inline-flex;
    align-items: center;
    gap: 4rpx;
    padding: 4rpx 14rpx;
    border-radius: 999rpx;
    background: #ecfdf5;

    text {
      font-size: 22rpx;
      color: #059669;
      font-weight: 600;
    }
  }

  &__stat {
    font-size: 26rpx;
    color: #64748b;
  }

  &__gender {
    margin-top: 12rpx;
    font-size: 24rpx;
    color: #94a3b8;
    font-weight: 500;
  }
}

.panel {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 24rpx;
}

.section-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 16rpx;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;

  &__item {
    font-size: 24rpx;
    color: #6366f1;
    background: #eef2ff;
    padding: 8rpx 20rpx;
    border-radius: 999rpx;
    font-weight: 500;
  }
}

.bio {
  font-size: 28rpx;
  line-height: 1.65;
  color: #475569;

  &--empty {
    color: #94a3b8;
    font-style: italic;
  }
}

.panel--dm {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.dm-hint {
  font-size: 24rpx;
  color: #94a3b8;
}

.dm-note {
  font-size: 26rpx;
  color: #64748b;
  line-height: 1.4;
}

.dm-row {
  display: flex;
  gap: 16rpx;
}

.dm-textarea {
  width: 100%;
  min-height: 120rpx;
  padding: 16rpx;
  box-sizing: border-box;
  background: #f8fafc;
  border-radius: 12rpx;
  font-size: 26rpx;
  margin-bottom: 8rpx;
}

.dm-btn {
  font-size: 28rpx;
  border-radius: 14rpx;
  border: none;
  padding: 20rpx 0;
  margin: 0;

  &::after {
    border: none;
  }
}

.dm-btn--primary {
  background: #6366f1;
  color: #ffffff;
  font-weight: 600;
}

.dm-btn--ghost {
  background: #f1f5f9;
  color: #334155;
  font-weight: 600;
  flex: 1;
}

.dm-btn--disabled {
  background: #cbd5e1;
  color: #ffffff;
}

.dm-btn--link {
  background: transparent;
  color: #6366f1;
  font-size: 26rpx;
  padding: 8rpx 0;
}
</style>
