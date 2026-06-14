<template>
  <view class="page detail">
    <view class="detail__header">
      <view class="detail__back" @click="goBack">
        <wm-icon name="chevronLeft" :size="36" color="#0f172a" />
      </view>
      <text class="detail__header-title">活动详情</text>
      <view class="detail__header-right">
        <!-- #ifdef MP-WEIXIN -->
        <button
          v-if="activity"
          class="detail__header-icon-btn detail__header-icon-btn--share"
          type="default"
          hover-class="detail__header-icon-btn--hover"
          open-type="share"
        >
          <wm-icon name="shareForward" :size="34" color="#0f172a" />
        </button>
        <view
          v-if="activity"
          class="detail__header-icon-btn"
          hover-class="detail__header-icon-btn--hover"
          @click="onCopyActivityShare"
        >
          <wm-icon name="link2" :size="34" color="#0f172a" />
        </view>
        <!-- #endif -->
        <!-- #ifdef MP-TOUTIAO -->
        <button
          v-if="activity"
          class="detail__header-icon-btn detail__header-icon-btn--share"
          type="default"
          hover-class="detail__header-icon-btn--hover"
          open-type="share"
        >
          <wm-icon name="shareForward" :size="34" color="#0f172a" />
        </button>
        <!-- #endif -->
      </view>
    </view>

    <view v-if="loadState === 'loading'" class="detail__state">
      <text class="detail__state-text">加载中…</text>
    </view>

    <view v-else-if="loadState === 'error'" class="detail__state">
      <text class="detail__state-text">{{ loadErrorMsg || '无法加载活动详情' }}</text>
      <view class="detail__state-btn" @click="retryLoad">
        <text>重试</text>
      </view>
    </view>

    <view class="detail__content" v-else-if="activity">
      <view class="hero" :class="{ 'hero--photo': activity.displayImages.length }">
        <swiper
          v-if="activity.displayImages.length"
          class="hero__swiper"
          circular
          indicator-dots
          indicator-color="rgba(255,255,255,0.45)"
          indicator-active-color="#ffffff"
        >
          <swiper-item v-for="(img, idx) in activity.displayImages" :key="idx">
            <image :src="img" mode="aspectFill" class="hero__photo" />
          </swiper-item>
        </swiper>
        <view v-else class="hero__gradient" :style="{ background: activity.coverGradient }" />
        <view v-if="activity.imagesAuditPending" class="hero__audit">
          <text>图片审核中，通过后对所有人可见</text>
        </view>
        <view class="hero__overlay">
          <view class="hero__tag-row">
            <view class="hero__tag" :style="{ background: activity.tagBg, color: activity.tagColor }">
              <text>{{ activity.category }}</text>
            </view>
            <view class="hero__tag hero__tag--verified">
              <wm-icon name="check" :size="20" color="#10b981" />
              <text>已认证</text>
            </view>
          </view>
          <text class="hero__title">{{ activity.title }}</text>
        </view>
      </view>

      <view class="panel">
        <view class="meta-item">
          <wm-icon name="clock" :size="30" color="#6366f1" />
          <view class="meta-item__body">
            <text class="meta-item__label">活动时间</text>
            <text class="meta-item__value">{{ activity.time }}</text>
          </view>
        </view>
        <view
          class="meta-item"
          :class="{ 'meta-item--link': canOpenActivityLocation }"
          @click="onOpenActivityLocation"
        >
          <wm-icon name="mapPin" :size="30" color="#6366f1" />
          <view class="meta-item__body meta-item__body--grow">
            <text class="meta-item__label">活动地点</text>
            <text
              class="meta-item__value"
              :class="{ 'meta-item__value--link': canOpenActivityLocation }"
            >{{ locationDisplayText }}</text>
          </view>
          <wm-icon v-if="canOpenActivityLocation" name="chevronRight" :size="28" color="#6366f1" />
        </view>
        <view class="meta-item">
          <wm-icon name="users" :size="30" color="#6366f1" />
          <view class="meta-item__body">
            <text class="meta-item__label">参与人数</text>
            <text class="meta-item__value">{{ activity.joined }}/{{ activity.total }} 人</text>
          </view>
        </view>
      </view>

      <view class="panel panel--intro">
        <view class="detail__tabbar">
          <view class="detail__tab detail__tab--active">
            <text>活动简介</text>
          </view>
          <view class="detail__tab detail__tab--guide" hover-class="detail__tab--hover" @click="onOpenActivityGuide">
            <text>活动说明</text>
            <wm-icon name="chevronRight" :size="24" color="#6366f1" />
          </view>
        </view>
        <view v-if="canEditActivity" class="detail__guide-edit">
          <text class="detail__guide-edit-tip">行程、装备、费用等完整说明</text>
          <text class="detail__guide-edit-link" @click="onEditActivityGuide">编辑活动说明</text>
        </view>
        <text class="desc">{{ activity.description }}</text>
      </view>

      <view class="panel">
        <view class="panel__head">
          <text class="section-title">活动状态</text>
          <view class="panel__head-right">
            <text
              v-if="canEditActivity"
              class="panel__link panel__link--danger"
              @click="onCancelActivity"
            >取消活动</text>
            <view class="status-tag" :style="{ background: activity.statusBg, color: activity.statusColor }">
              <text>{{ activity.statusLabel }}</text>
            </view>
          </view>
        </view>
        <text class="desc">{{ statusHint }}</text>
      </view>

      <view v-if="isJoined && !activity.isCancelled" class="panel">
        <view class="panel__head">
          <text class="section-title">活动动态</text>
          <text v-if="canPostActivity" class="panel__link" @click="onPublishActivityPost">发一条</text>
        </view>
        <text v-if="!activityPosts.length && canPostActivity" class="desc desc--muted">活动进行中可发图文，结束后 72 小时内仍可发复盘</text>
        <text v-else-if="!activityPosts.length" class="desc desc--muted">活动尚未开始或已超过复盘期，暂不可发布</text>
        <text v-if="activityPostsHint" class="desc desc--muted desc--warn">{{ activityPostsHint }}</text>
        <feed-post-card
          v-for="p in activityPosts"
          :key="p.postId"
          :item="p"
          @refresh="loadActivityPosts"
          @open="openFeedDetail"
        />
      </view>

      <view class="panel">
        <text class="section-title">发起人</text>
        <view class="host">
          <view class="host__avatar-wrap" @click="onOpenOrganizerProfile">
            <view class="host__avatar">
              <image
                v-if="activity.organizerAvatar"
                class="host__avatar-img"
                :src="activity.organizerAvatar"
                mode="aspectFill"
              />
              <text v-else>{{ activity.organizer.slice(0, 1) }}</text>
            </view>
            <text class="host__tap-hint">点头像看资料</text>
          </view>
          <view class="host__info">
            <text class="host__name">{{ activity.organizer }}</text>
            <text class="host__meta">已组织 {{ activity.hostedCount }} 场活动</text>
          </view>
        </view>
      </view>
    </view>

    <view class="detail__action" v-if="activity">
      <view
        v-if="canEnterGroup"
        class="detail__action-btn detail__action-btn--ghost"
        @click="onEnterGroup"
      >
        <text>进入群聊</text>
      </view>
      <view
        class="detail__action-btn"
        :class="actionBtnClass"
        @click="onPrimaryAction"
      >
        <text>{{ actionText }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import FeedPostCard from '@/components/FeedPostCard/FeedPostCard.vue'
import {
  cancelEnrollment,
  computeActivityStatus,
  enrollActivity,
  formatActivityTimeRange,
  getActivityDetail,
  getActivityPosts,
  getMe,
  getUserFeedPosts,
  isActivityPostWindowOpen,
  isLoggedIn,
  redirectToLogin,
  resolveActivityCategoryTag,
} from '@/api'
import { apiActivityPathId, sameActivityId } from '@/utils/activityId'
import {
  buildActivityShareClipboardText,
  buildActivityShareMessage,
  buildActivityTimelineQuery,
  parseSharedActivityIdFromQuery,
  SHARED_ACTIVITY_QUERY_KEY,
} from '@/utils/activityShare'
import { SHARE_SRC_FRIEND, SHARE_SRC_TIMELINE } from '@/utils/acquisitionSource'
import { ensurePhoneBound, PHONE_GATE_REASON } from '@/utils/phoneGate'
import { ensureProfileComplete } from '@/utils/profileGate'
import { confirmCancelActivity } from '@/utils/activityCancel'
import { isActivityOrganizer } from '@/utils/activityPermission'
import { openFeedLocationOnMap } from '@/utils/feedLocation'

export default {
  components: { WmIcon, FeedPostCard },
  data() {
    return {
      activityId: '',
      activity: null,
      loadState: 'loading',
      loadErrorMsg: '',
      actionLoading: false,
      currentUserId: '',
      activityPosts: [],
      activityPostsHint: '',
    }
  },
  computed: {
    isOrganizer() {
      if (!this.activity) return false
      if (typeof this.activity.isOrganizer === 'boolean') return this.activity.isOrganizer
      if (!this.activity.organizerId || !this.currentUserId) return false
      return isActivityOrganizer(this.activity, this.currentUserId)
    },
    canEditActivity() {
      if (!this.isOrganizer || !this.activity) return false
      return !this.activity.isCancelled && !this.activity.isEnded
    },
    isJoined() {
      return this.activity?.enrollmentStatus === 'joined'
    },
    canEnterGroup() {
      if (!this.activity) return false
      return isLoggedIn() && this.isJoined && !this.activity.isCancelled
    },
    canPostActivity() {
      if (!isLoggedIn() || !this.isJoined || this.activity?.isCancelled) return false
      return isActivityPostWindowOpen({
        startAt: this.activity?.startAt,
        endAt: this.activity?.endAt,
      })
    },
    canOpenActivityLocation() {
      const a = this.activity
      if (!a) return false
      const lat = Number(a.lat)
      const lng = Number(a.lng)
      return Number.isFinite(lat) && Number.isFinite(lng)
    },
    locationDisplayText() {
      if (!this.activity) return ''
      const loc = this.activity.location || '待定'
      const parts = [loc]
      if (this.activity.distance) parts.push(this.activity.distance)
      else if (this.canOpenActivityLocation) parts.push('查看地图')
      return parts.join(' · ')
    },
    actionText() {
      if (!this.activity) return ''
      if (this.activity.isCancelled) return '活动已取消'
      if (this.activity.isEnded) return '活动已结束'
      if (this.activity.statusKey === 'pending') return '审核中'
      if (this.isOrganizer && this.canEditActivity) return '编辑活动'
      if (this.isOrganizer && this.isJoined) return '你是发起人'
      if (this.isJoined) return '取消报名'
      if (this.activity.isFull) return '已满员'
      if (!isLoggedIn()) return '登录后报名'
      return '立即报名'
    },
    actionBtnClass() {
      if (!this.activity) return ''
      if (this.activity.isEnded || this.activity.isCancelled || this.activity.statusKey === 'pending') {
        return 'detail__action-btn--disabled'
      }
      if (this.isOrganizer && this.canEditActivity) return 'detail__action-btn--edit'
      if (this.isOrganizer && this.isJoined) return 'detail__action-btn--disabled'
      if (!this.isJoined && this.activity.isFull) return 'detail__action-btn--disabled'
      if (this.isJoined) return 'detail__action-btn--cancel'
      return ''
    },
    statusHint() {
      if (!this.activity) return ''
      if (this.activity.isCancelled) return '该活动已被取消，无法报名或进入群聊。'
      if (this.activity.isEnded) return '活动已结束，欢迎关注下一场。'
      if (this.activity.isFull) return '人数已满，报名通道暂时关闭。'
      if (this.activity.statusKey === 'pending') return '活动正在审核中，通过后可开放报名。'
      return `还剩 ${Math.max(0, Number(this.activity.total) - Number(this.activity.joined))} 个名额`
    },
  },
  onLoad(query) {
    const opts = query || {}
    const sharedId = parseSharedActivityIdFromQuery(opts)
    const fromShareParam = !!opts[SHARED_ACTIVITY_QUERY_KEY]
    const fromShareTimeline = opts.src === SHARE_SRC_TIMELINE
    const fromShareFriendLegacy = opts.src === SHARE_SRC_FRIEND && opts.id && !opts[SHARED_ACTIVITY_QUERY_KEY]
    if (sharedId && (fromShareParam || fromShareTimeline || fromShareFriendLegacy)) {
      this.redirectToHomeWithSharedActivity(sharedId, opts.src)
      return
    }
    this.activityId = opts.id ? String(opts.id) : ''
    this.loadActivity(this.activityId)
  },
  onShow() {
    // #ifdef MP-WEIXIN
    try {
      uni.showShareMenu({
        withShareTicket: true,
        menus: ['shareAppMessage', 'shareTimeline'],
      })
    } catch (_) {
      /* ignore */
    }
    // #endif
    // #ifdef MP-TOUTIAO
    try {
      uni.showShareMenu({ withShareTicket: false })
    } catch (_) {
      /* ignore */
    }
    // #endif
    if (this.loadState === 'ready' && this.activityId) {
      this.loadActivityPosts()
    }
  },
  onShareAppMessage() {
    return buildActivityShareMessage(this.activity)
  },
  // #ifdef MP-WEIXIN
  onShareTimeline() {
    const a = this.activity
    if (!a?.id) {
      return { title: '旅聚 · 发现身边的活动' }
    }
    return {
      title: (a.title && String(a.title).trim().slice(0, 64)) || '旅聚活动',
      query: buildActivityTimelineQuery(a.id),
    }
  },
  // #endif
  methods: {
    redirectToHomeWithSharedActivity(activityId, src) {
      const id = encodeURIComponent(String(activityId || '').trim())
      let url = `/pages/home/home?${SHARED_ACTIVITY_QUERY_KEY}=${id}`
      if (src) url += `&src=${encodeURIComponent(String(src))}`
      uni.reLaunch({
        url,
        fail: () => {
          uni.redirectTo({ url })
        },
      })
    },
    async loadActivity(id) {
      const actId = String(id || '').trim()
      if (!actId) {
        this.activity = null
        this.loadState = 'error'
        this.loadErrorMsg = '活动不存在或链接无效'
        return
      }

      this.loadState = 'loading'
      this.loadErrorMsg = ''
      this.activity = null

      try {
        let meId = ''
        if (isLoggedIn()) {
          try {
            const me = await getMe()
            meId = me?.userId ? String(me.userId) : ''
          } catch (e) {
            meId = ''
          }
        }
        this.currentUserId = meId

        const detail = await getActivityDetail(actId)
        if (!detail) {
          this.loadState = 'error'
          this.loadErrorMsg = '活动不存在或已下架'
          return
        }

        const org = detail.organizer || {}
        const status = computeActivityStatus(detail)
        const catTag = resolveActivityCategoryTag(detail)
        const meIsOrganizer = isActivityOrganizer(detail, meId)
        const auditStatus = detail.imagesAuditStatus || 'none'
        const imageList = Array.isArray(detail.images) ? detail.images.filter(Boolean) : []
        let displayImages = []
        if (auditStatus === 'pass' && imageList.length) {
          displayImages = imageList
        } else if (meIsOrganizer && imageList.length) {
          displayImages = imageList
        }
        this.activity = {
          id: String(detail.activityId || actId),
          isOrganizer: meIsOrganizer,
          category: catTag.label,
          tagColor: catTag.color,
          tagBg: catTag.bg,
          title: detail.title,
          coverGradient: 'linear-gradient(135deg, #a78bfa 0%, #6366f1 100%)',
          displayImages,
          imagesAuditPending: meIsOrganizer && auditStatus === 'pending' && imageList.length > 0,
          imagesAuditStatus: auditStatus,
          time: formatActivityTimeRange(detail.startAt, detail.endAt),
          startAt: detail.startAt,
          endAt: detail.endAt,
          location: detail.locationName,
          lat: detail.lat != null ? Number(detail.lat) : null,
          lng: detail.lng != null ? Number(detail.lng) : null,
          distance: detail.distanceMeters ? `${(detail.distanceMeters / 1000).toFixed(1)}km` : '',
          joined: Number(detail.enrolledCount || 0),
          total: Number(detail.maxMembers || 0),
          organizer: org.nickname || '组织者',
          organizerId: org.userId || '',
          organizerAvatar: org.avatarUrl || '',
          organizerBio: (org.bio && String(org.bio).trim()) || '',
          organizerTags: Array.isArray(org.tags) ? org.tags : [],
          organizerVerified: !!org.verificationBadge,
          hostedCount: Number(detail.organizerHostedCount || 0),
          description: detail.description || '暂无说明',
          guideFilled: !!detail.guideFilled,
          enrollmentStatus: detail.myEnrollment?.status || null,
          ...status,
        }
        this.loadState = 'ready'
        this.activityId = String(detail.activityId || actId || this.activityId || '')
        this.loadActivityPosts()
      } catch (e) {
        this.activity = null
        this.loadState = 'error'
        const msg = e?.message || '加载失败'
        this.loadErrorMsg =
          e?.statusCode === 404 ? '活动不存在或已下架' : msg.includes('authenticated') ? '暂时无法加载，请稍后重试' : msg
        uni.showToast({ title: this.loadErrorMsg, icon: 'none' })
      }
    },
    retryLoad() {
      if (this.activityId) this.loadActivity(this.activityId)
    },
    async loadActivityPosts() {
      const actId = this.activity?.id || this.activityId
      const pathId = apiActivityPathId(actId)
      if (!pathId) return
      this.activityPostsHint = ''
      try {
        const d = await getActivityPosts(pathId, { page: 1, pageSize: 20 })
        let rows = d?.list || []
        if (!rows.length && isLoggedIn()) {
          try {
            const me = await getMe()
            const uid = me?.userId
            if (uid) {
              const mine = await getUserFeedPosts(uid, { page: 1, pageSize: 50 })
              const all = mine?.list || []
              rows = all.filter(
                (p) => p.postKind === 'activity' && sameActivityId(p.activityId, actId),
              )
              if (!rows.length) {
                const cityRecap = all.find(
                  (p) =>
                    p.postKind === 'city' &&
                    Array.isArray(p.topicTags) &&
                    p.topicTags.includes('activity_recap'),
                )
                if (cityRecap) {
                  this.activityPostsHint =
                    '「我的动态」里若只有 #活动复盘、没有「活动态」，说明发成了同城动态；请从本页「发一条」重新发布（页顶应显示「活动动态」）。'
                }
              }
            }
          } catch (_) {
            /* ignore fallback errors */
          }
        }
        this.activityPosts = rows
      } catch (e) {
        console.warn('loadActivityPosts failed', e)
        this.activityPosts = []
      }
    },
    onEditActivity() {
      const actId = apiActivityPathId(this.activity?.id || this.activityId)
      if (!actId) {
        uni.showToast({ title: '活动信息未就绪', icon: 'none' })
        return
      }
      uni.navigateTo({
        url: `/pages/publish/publish?mode=edit&id=${encodeURIComponent(actId)}`,
        events: {
          saved: () => {
            this.loadActivity(this.activityId)
          },
        },
      })
    },
    onCancelActivity() {
      if (!this.canEditActivity || this.actionLoading) return
      const actId = this.activity?.id || this.activityId
      confirmCancelActivity(actId, {
        onSuccess: () => {
          this.loadActivity(this.activityId)
        },
      })
    },
    onOpenActivityLocation() {
      if (!this.canOpenActivityLocation) {
        uni.showToast({ title: '暂无位置坐标', icon: 'none' })
        return
      }
      openFeedLocationOnMap({
        lat: this.activity.lat,
        lng: this.activity.lng,
        locationName: this.activity.location,
      })
    },
    onPublishActivityPost() {
      if (!this.canPostActivity) {
        uni.showToast({ title: '当前不在活动动态发布时间', icon: 'none' })
        return
      }
      const actId = apiActivityPathId(this.activity?.id || this.activityId)
      if (!actId) {
        uni.showToast({ title: '活动信息未就绪', icon: 'none' })
        return
      }
      const q = [`activityId=${encodeURIComponent(actId)}`]
      const a = this.activity
      if (a?.location && a.lat != null && a.lng != null) {
        q.push(`locationName=${encodeURIComponent(a.location)}`)
        q.push(`lat=${encodeURIComponent(String(a.lat))}`)
        q.push(`lng=${encodeURIComponent(String(a.lng))}`)
      }
      uni.navigateTo({
        url: `/pages/feed-publish/feed-publish?${q.join('&')}`,
        events: {
          published: () => {
            this.loadActivityPosts()
          },
        },
      })
    },
    openFeedDetail(item) {
      uni.navigateTo({
        url: `/pages/feed-detail/feed-detail?postId=${encodeURIComponent(item.postId)}`,
      })
    },
    onOpenOrganizerProfile() {
      const uid = this.activity?.organizerId
      if (!uid) {
        uni.showToast({ title: '暂无发起人信息', icon: 'none' })
        return
      }
      const p = this.activity
      const q = [
        `userId=${encodeURIComponent(uid)}`,
        `nick=${encodeURIComponent(p.organizer || '')}`,
        `hosted=${Number(p.hostedCount) || 0}`,
      ]
      if (p.organizerAvatar) q.push(`ava=${encodeURIComponent(p.organizerAvatar)}`)
      if (p.organizerBio) q.push(`bio=${encodeURIComponent(p.organizerBio)}`)
      if (p.organizerTags && p.organizerTags.length) {
        try {
          q.push(`tags=${encodeURIComponent(JSON.stringify(p.organizerTags))}`)
        } catch (e) {}
      }
      if (p.organizerVerified) q.push('v=1')
      uni.navigateTo({
        url: `/pages/user-public/user-public?${q.join('&')}`,
      })
    },
    refreshStatus() {
      if (!this.activity) return
      const status = computeActivityStatus({
        activityStatus: this.activity.isCancelled
          ? 'cancelled'
          : this.activity.isEnded
            ? 'ended'
            : 'published',
        enrolledCount: this.activity.joined,
        maxMembers: this.activity.total,
        startAt: this.activity.startAt,
        endAt: this.activity.endAt,
      })
      Object.assign(this.activity, status)
    },
    goBack() {
      uni.navigateBack({
        fail: () => uni.reLaunch({ url: '/pages/home/home' }),
      })
    },
    onPrimaryAction() {
      if (!this.activity) return
      if (
        this.activity.isEnded ||
        this.activity.isCancelled ||
        this.activity.statusKey === 'pending'
      ) {
        uni.showToast({ title: this.actionText, icon: 'none' })
        return
      }
      if (!this.isJoined && this.activity.isFull) {
        uni.showToast({ title: '活动已满员', icon: 'none' })
        return
      }
      if (this.isOrganizer && this.canEditActivity) {
        this.onEditActivity()
        return
      }
      if (this.isOrganizer && this.isJoined) {
        uni.showToast({ title: '发起人不能取消报名，如需结束请取消活动', icon: 'none' })
        return
      }
      if (!isLoggedIn()) {
        const id = this.activity.id || this.activityId
        const back = id
          ? `/pages/activity-detail/activity-detail?id=${encodeURIComponent(id)}`
          : ''
        redirectToLogin(back)
        return
      }
      this.toggleEnroll()
    },
    async toggleEnroll() {
      if (!this.activity || this.actionLoading) return
      if (this.isOrganizer && this.isJoined) {
        uni.showToast({ title: '发起人不能取消报名，如需结束请取消活动', icon: 'none' })
        return
      }
      const joined = this.isJoined
      if (!joined) {
        const id = this.activity.id || this.activityId
        const back = id
          ? `/pages/activity-detail/activity-detail?id=${encodeURIComponent(id)}`
          : '/pages/activity-detail/activity-detail'
        const profileOk = await ensureProfileComplete({ redirectPath: back })
        if (!profileOk) return
        const phoneOk = await ensurePhoneBound({
          redirectPath: back,
          reason: PHONE_GATE_REASON.ENROLL,
        })
        if (!phoneOk) return
      }
      this.actionLoading = true
      try {
        if (joined) {
          await cancelEnrollment(this.activity.id)
          this.activity.enrollmentStatus = null
          this.activity.joined = Math.max(0, Number(this.activity.joined || 0) - 1)
          uni.showToast({ title: '已取消报名', icon: 'success' })
        } else {
          await enrollActivity(this.activity.id)
          this.activity.enrollmentStatus = 'joined'
          this.activity.joined = Math.min(
            Number(this.activity.total || 0),
            Number(this.activity.joined || 0) + 1
          )
          uni.showToast({ title: '报名成功', icon: 'success' })
        }
        this.refreshStatus()
      } catch (e) {
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
      } finally {
        this.actionLoading = false
      }
    },
    async onEnterGroup() {
      if (!this.canEnterGroup) return
      const chatUrl = `/pages/chat-detail/chat-detail?id=${encodeURIComponent(this.activity.id)}`
      if (!isLoggedIn()) {
        redirectToLogin(chatUrl)
        return
      }
      const profileOk = await ensureProfileComplete({ redirectPath: chatUrl })
      if (!profileOk) return
      const phoneOk = await ensurePhoneBound({
        redirectPath: chatUrl,
        reason: PHONE_GATE_REASON.CHAT,
      })
      if (!phoneOk) return
      uni.navigateTo({ url: chatUrl })
    },
    onCopyActivityShare() {
      if (!this.activity?.id) {
        uni.showToast({ title: '暂无可复制内容', icon: 'none' })
        return
      }
      const text = buildActivityShareClipboardText(this.activity)
      uni.setClipboardData({
        data: text,
        success: () => {
          uni.showToast({ title: '已复制，可粘贴到微信发给好友', icon: 'none', duration: 2500 })
        },
        fail: () => {
          uni.showToast({ title: '复制失败', icon: 'none' })
        },
      })
    },
    onOpenActivityGuide() {
      const pathId = apiActivityPathId(this.activity?.id || this.activityId)
      if (!pathId) return
      uni.navigateTo({
        url: `/pages/activity-guide/activity-guide?id=${encodeURIComponent(pathId)}`,
      })
    },
    onEditActivityGuide() {
      const pathId = apiActivityPathId(this.activity?.id || this.activityId)
      if (!pathId) return
      uni.navigateTo({
        url: `/pages/activity-guide-edit/activity-guide-edit?id=${encodeURIComponent(pathId)}`,
      })
    },
  },
}
</script>

<style lang="scss" scoped>
.detail {
  min-height: 100vh;
  background: transparent;
  padding-bottom: calc(160rpx + env(safe-area-inset-bottom));

  &__state {
    padding: 120rpx 48rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 32rpx;
  }

  &__state-text {
    font-size: 28rpx;
    color: $wm-text-3;
    text-align: center;
    line-height: 1.6;
  }

  &__state-btn {
    height: 72rpx;
    padding: 0 40rpx;
    border-radius: $wm-radius-xl;
    background: $wm-gradient-primary;
    color: #fff;
    font-size: 28rpx;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
  }

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

  &__header-right {
    min-width: 72rpx;
    height: 72rpx;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4rpx;
  }

  &__header-icon-btn {
    width: 72rpx;
    height: 72rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 16rpx;
    &--hover {
      background: rgba(15, 23, 42, 0.06);
    }
    &--share {
      padding: 0;
      margin: 0;
      background: transparent;
      border: none;
      line-height: 1;
      &::after {
        border: none;
      }
    }
  }

  &__header-title {
    font-size: 34rpx;
    font-weight: 700;
    color: $wm-text-1;
  }

  &__content {
    padding: 28rpx 24rpx 0;
    display: flex;
    flex-direction: column;
    gap: 24rpx;
  }

  &__action {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 30;
    padding: 18rpx 24rpx calc(28rpx + env(safe-area-inset-bottom));
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20rpx);
    border-top: 1rpx solid rgba(0, 0, 0, 0.06);
    box-shadow: 0 -12rpx 44rpx rgba(2, 132, 199, 0.08);
    display: flex;
    gap: 20rpx;
  }

  &__action-btn {
    flex: 1;
    height: 92rpx;
    border-radius: $wm-radius-lg;
    background: $wm-gradient-primary;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font-size: 32rpx;
    font-weight: 700;
    box-shadow: $wm-shadow-glow;
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s;

    &:active {
      transform: scale(0.98);
      box-shadow: $wm-shadow-md;
    }

    &--cancel {
      background: linear-gradient(135deg, #64748b 0%, #475569 100%);
      box-shadow: 0 12rpx 28rpx rgba(71, 85, 105, 0.28);
    }

    &--ghost {
      background: #ffffff;
      color: $wm-primary;
      border: 2rpx solid rgba(2, 132, 199, 0.3);
      box-shadow: none;
    }

    &--disabled {
      background: #e2e8f0;
      color: #94a3b8;
      box-shadow: none;
    }
  }
}

.hero {
  border-radius: $wm-radius-xl;
  color: #ffffff;
  position: relative;
  overflow: hidden;
  min-height: 320rpx;

  &--photo {
    min-height: 420rpx;
  }

  &__gradient {
    position: absolute;
    inset: 0;
  }

  &__swiper,
  &__photo {
    width: 100%;
    height: 420rpx;
  }

  &__overlay {
    position: relative;
    z-index: 2;
    padding: 32rpx;
    background: linear-gradient(180deg, rgba(15, 23, 42, 0.05) 0%, rgba(15, 23, 42, 0.55) 100%);
    min-height: 320rpx;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }

  &--photo &__overlay {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    min-height: auto;
  }

  &__audit {
    position: absolute;
    top: 24rpx;
    right: 24rpx;
    z-index: 3;
    padding: 8rpx 16rpx;
    border-radius: 999rpx;
    background: rgba(15, 23, 42, 0.72);
    font-size: 22rpx;
    color: #fde68a;
  }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, transparent 50%, rgba(0, 0, 0, 0.12) 100%);
    pointer-events: none;
    z-index: 1;
  }

  &__tag-row {
    display: flex;
    gap: 12rpx;
    margin-bottom: 24rpx;
    position: relative;
    z-index: 1;
  }

  &__tag {
    padding: 6rpx 18rpx;
    border-radius: 999rpx;
    font-size: 22rpx;
    font-weight: 700;
    background: rgba(255, 255, 255, 0.25);
    backdrop-filter: blur(8rpx);
    color: #ffffff;
    border: 1rpx solid rgba(255, 255, 255, 0.5);

    &--verified {
      display: inline-flex;
      align-items: center;
      gap: 4rpx;
      background: $wm-success-soft;
      color: $wm-success;
      backdrop-filter: none;
      border: none;
    }
  }

  &__title {
    font-size: 48rpx;
    line-height: 1.25;
    font-weight: 800;
    color: #ffffff;
    position: relative;
    z-index: 1;
    text-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.2);
  }
}

.panel {
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
    opacity: 0.3;
  }
}

.meta-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f8fafc;
  transition: background 0.2s;

  &:last-child {
    border-bottom: none;
  }

  &--link {
    &:active {
      background: $wm-primary-soft;
    }
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: 6rpx;

    &--grow {
      flex: 1;
      min-width: 0;
    }
  }

  &__label {
    font-size: 24rpx;
    color: $wm-text-3;
    font-weight: 500;
  }

  &__value {
    font-size: 30rpx;
    color: $wm-text-1;
    font-weight: 600;

    &--link {
      color: $wm-primary;
    }
  }
}

.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: $wm-text-1;
  margin-bottom: 16rpx;
}

.panel--intro {
  padding-top: 20rpx;
}

.detail__tabbar {
  display: flex;
  gap: 12rpx;
  margin-bottom: 20rpx;
  padding: 6rpx;
  border-radius: $wm-radius-lg;
  background: #f1f5f9;
}

.detail__tab {
  flex: 1;
  height: 72rpx;
  border-radius: $wm-radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: $wm-text-3;

  &--active {
    background: #ffffff;
    color: $wm-text-1;
    box-shadow: 0 4rpx 16rpx rgba(15, 23, 42, 0.08);
  }

  &--guide {
    color: $wm-primary;
  }

  &--hover {
    opacity: 0.85;
  }
}

.detail__guide-edit {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 16rpx;
  padding: 16rpx 20rpx;
  border-radius: $wm-radius-md;
  background: $wm-primary-soft;
}

.detail__guide-edit-tip {
  flex: 1;
  font-size: 24rpx;
  color: $wm-text-3;
  line-height: 1.5;
}

.detail__guide-edit-link {
  flex-shrink: 0;
  font-size: 26rpx;
  font-weight: 700;
  color: $wm-primary;
}

.desc {
  font-size: 28rpx;
  line-height: 1.75;
  color: $wm-text-2;
  font-weight: 500;
}

.panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;

  .section-title {
    margin-bottom: 0;
  }
}

.panel__head-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.panel__link {
  font-size: 26rpx;
  color: #0284c7;
  font-weight: 600;

  &--danger {
    color: #dc2626;
  }
}

.desc--muted {
  color: $wm-text-3;
  margin-bottom: 8rpx;
}

.desc--warn {
  color: #b45309;
  line-height: 1.55;
}

.status-tag {
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 700;
}

.host {
  display: flex;
  align-items: center;
  gap: 24rpx;
  transition: transform 0.2s;

  &:active {
    transform: scale(0.98);
  }

  &__avatar-wrap {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10rpx;
  }

  &__tap-hint {
    font-size: 22rpx;
    color: $wm-primary;
    font-weight: 600;
  }

  &__info {
    flex: 1;
    min-width: 0;
  }

  &__avatar {
    width: 104rpx;
    height: 104rpx;
    border-radius: 50%;
    background: $wm-gradient-primary;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    box-shadow: 0 6rpx 20rpx rgba(2, 132, 199, 0.25);

    text {
      color: #ffffff;
      font-size: 36rpx;
      font-weight: 700;
    }
  }

  &__avatar-img {
    width: 100%;
    height: 100%;
  }

  &__name {
    display: block;
    font-size: 32rpx;
    color: $wm-text-1;
    font-weight: 700;
  }

  &__meta {
    display: block;
    font-size: 24rpx;
    color: $wm-text-3;
    margin-top: 8rpx;
    font-weight: 500;
  }
}
</style>
