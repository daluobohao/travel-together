<template>
  <view class="page home">
    <!-- Header -->
    <view class="home__header">
      <view class="home__header-main">
        <view class="home__brand">
          <text class="home__logo">去旅聚</text>
          <view class="home__tagline-wrap">
            <text class="home__tagline">
              <text class="home__slogan-a">找搭子</text>
              <text class="home__slogan-sep"> · </text>
              <text class="home__slogan-b">今天见面</text>
            </text>
          </view>
          <text class="home__subtitle">
            <text v-if="citySubtitlePlace">{{ citySubtitlePlace }} · </text>
            <text class="home__slogan-a">找搭子</text>
            <text v-if="citySubtitleMeta"> · {{ citySubtitleMeta }}</text>
          </text>
        </view>
        <view class="home__header-actions">
          <!-- #ifdef MP-WEIXIN -->
          <button
            class="home__header-icon-btn home__header-icon-btn--share"
            type="default"
            plain
            hover-class="home__header-icon-btn--hover"
            open-type="share"
          >
            <wm-icon name="shareForward" :size="34" color="#0f172a" />
          </button>
          <!-- #endif -->
          <!-- #ifdef MP-WEIXIN -->
          <view
            class="home__header-icon-btn"
            hover-class="home__header-icon-btn--hover"
            @click="onCopyHomeShare"
          >
            <wm-icon name="link2" :size="34" color="#0f172a" />
          </view>
          <!-- #endif -->
        </view>
      </view>
      <view class="home__city-hall" hover-class="home__city-hall--hover" @click="onCityHall">
        <view class="home__city-hall-inner">
          <view class="home__city-hall-icon">
            <wm-icon name="users" :size="44" color="#ffffff" />
          </view>
          <view class="home__city-hall-text">
            <view class="home__city-hall-title-row">
              <text class="home__city-hall-title">{{ cityHallTitle }}</text>
              <text v-if="!cityHallJoined" class="home__city-hall-badge">免费加入</text>
              <text v-else class="home__city-hall-badge home__city-hall-badge--joined">已加入</text>
            </view>
            <text class="home__city-hall-desc">{{ cityHallDesc }}</text>
          </view>
          <view class="home__city-hall-cta">
            <view v-if="cityHallChatBadge" class="home__chat-badge">
              <text>{{ cityHallChatBadge }}</text>
            </view>
            <text>{{ cityHallCtaText }}</text>
          </view>
        </view>
      </view>
      <view class="home__search" @click="onTapSearch">
        <view class="home__search-inner">
          <wm-icon name="search" :size="32" color="#94a3b8" />
          <text class="home__search-text">{{ searchBarText }}</text>
        </view>
        <view
          v-if="hasSearchAnchor"
          class="home__search-clear"
          @click.stop="onClearSearch"
        >
          <wm-icon name="close" :size="28" color="#64748b" />
        </view>
      </view>
      <view class="home__sort-row">
        <view
          class="home__sort-chip"
          :class="{ 'home__sort-chip--active': activeSort === 'distance' }"
          @click="onSortClick('distance')"
        >
          <text>距离优先</text>
        </view>
        <view
          class="home__sort-chip"
          :class="{ 'home__sort-chip--active': activeSort === 'popularity' }"
          @click="onSortClick('popularity')"
        >
          <text>人气优先</text>
        </view>
      </view>
      <scroll-view scroll-x class="home__cat-scroll" :show-scrollbar="false">
        <view class="home__chips">
          <view
            v-for="cat in categoryChips"
            :key="cat.key"
            class="chip"
            :class="{ 'chip--active': cat.key === activeCategoryId }"
            @click="onCategoryClick(cat.key)"
          >
            <text>{{ cat.label }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- Loading state - Skeleton -->
    <view v-if="loading" class="home__list">
      <view v-for="index in 3" :key="index" class="skeleton-card">
        <view class="skeleton-tag-row">
          <view class="skeleton-tag skeleton-tag--small"></view>
          <view class="skeleton-tag skeleton-tag--small"></view>
        </view>
        <view class="skeleton-title"></view>
        <view class="skeleton-meta">
          <view class="skeleton-meta-row"></view>
          <view class="skeleton-meta-row"></view>
        </view>
        <view class="skeleton-footer">
          <view class="skeleton-quota"></view>
          <view class="skeleton-organizer"></view>
        </view>
      </view>
    </view>

    <!-- Empty state -->
    <view v-else-if="!loading && activities.length === 0" class="home__empty">
      <wm-icon name="users" :size="96" color="#cbd5e1" />
      <text class="empty-title">近 7 天还没有搭子局</text>
      <text class="empty-desc">换个分类看看，或先进群找搭子</text>
      <view class="home__empty-actions">
        <view class="home__empty-btn" @click="onCityHall">进群找搭子</view>
        <view class="home__empty-btn home__empty-btn--ghost" @click="onEmptyShowAllCategories">查看全部分类</view>
      </view>
    </view>

    <!-- Activity list -->
    <view v-else class="home__list">
      <view class="home__section-head">
        <view class="home__section-title-wrap">
          <view class="home__section-accent" />
          <text class="home__section-title">
            <text class="home__slogan-a">找搭子</text>
            <text class="home__slogan-sep"> · </text>
            <text class="home__slogan-b">今天见面</text>
          </text>
        </view>
        <text v-if="weekActivityCount > 0" class="home__section-meta">近 7 天 {{ weekActivityCount }} 场可加入</text>
      </view>
      <view v-if="listFallbackHint" class="home__fallback-hint">
        <text>{{ listFallbackHint }}</text>
      </view>
      <view
        v-for="(item, index) in activities"
        :key="item.id"
        class="card"
        :class="{
          'card--shared-pin': item.sharedPin,
          'card--shared-inactive': item.sharedPin && !item.canJoin,
        }"
        hover-class="card--hover"
        :style="{ animationDelay: `${index * 80}ms` }"
        @click="onOpenActivity(item)"
      >
        <view class="card__top">
          <view class="card__tags">
            <view v-if="item.sharedPin" class="tag tag--shared">
              <text>分享推荐</text>
            </view>
            <view class="tag tag--category" :style="{ color: item.tagColor, background: item.tagBg }">
              <text>{{ item.category }}</text>
            </view>
            <view class="tag tag--verified">
              <wm-icon name="check" :size="20" color="#10b981" />
              <text>发起人已认证</text>
            </view>
            <view
              v-if="item.urgentSpot"
              class="tag tag--urgent"
            >
              <text>{{ item.spotsLabel }}</text>
            </view>
            <view v-if="item.enrollmentStatus === 'joined'" class="tag tag--enrolled">
              <text>已报名</text>
            </view>
            <view
              v-if="item.statusKey !== 'open'"
              class="tag"
              :style="{ background: item.statusBg, color: item.statusColor }"
            >
              <text>{{ item.statusLabel }}</text>
            </view>
          </view>
          <view class="card__top-right">
            <view v-if="item.chatBadge" class="home__chat-badge home__chat-badge--card">
              <text>{{ item.chatBadge }}</text>
            </view>
            <wm-icon name="chevronRight" :size="32" color="#cbd5e1" />
          </view>
        </view>

        <text class="card__title">{{ item.title }}</text>

        <view class="card__meta">
          <view class="meta-row">
            <wm-icon name="clock" :size="28" color="#6366f1" />
            <text class="meta-row__text">{{ item.time }}</text>
          </view>
          <view class="meta-row">
            <wm-icon name="mapPin" :size="28" color="#6366f1" />
            <text class="meta-row__text">{{ item.locationShort }}</text>
            <text v-if="item.distance" class="meta-row__dist">· {{ item.distance }}</text>
          </view>
        </view>

        <view class="card__footer">
          <view class="card__quota">
            <wm-icon name="users" :size="26" color="#475569" />
            <text class="card__quota-text">{{ item.spotsLabel }}</text>
          </view>
          <text v-if="item.organizer" class="card__organizer">发起人：{{ item.organizer }}</text>
          <text v-else class="card__organizer card__organizer--muted">发起人已认证</text>
        </view>
      </view>
    </view>

    <wm-tab-bar active="home" />
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import WmTabBar from '@/components/WmTabBar/WmTabBar.vue'
import {
  getActivities,
  getActivityCategories,
  getActivityDetail,
  getCityHallLookup,
  mapActivityCard,
} from '@/api'
import {
  dedupeHomeActivities,
  isUrgentSpot,
  shortLocationName,
  sortActivityCardsByDistance,
  spotsLeftLabel,
} from '@/utils/homeActivityCard'
import { resolveCityHallCityName } from '@/utils/cityCatalog'
import {
  buildCityHallCatalogUrl,
  clearHomeSearchAnchor,
  getHomeActivityAnchor,
  getHomeSearchAnchorSync,
} from '@/utils/homeCity'
import {
  FALLBACK_ACTIVITY_CATEGORIES,
  mergeCategoryListWithFallback,
  normalizeCategoryList,
} from '@/constants/activityCategories'
import {
  HOME_ACTIVITY_DATE_RANGE,
  HOME_CATEGORY_ALL,
  HOME_SORT_DISTANCE,
  HOME_SORT_POPULARITY,
} from '@/constants/homeActivityList'
import {
  buildDefaultTimelineShare,
  buildHomeShareClipboardText,
  buildHomeShareMessage,
  parseSharedActivityIdFromQuery,
  pinSharedActivityOnList,
} from '@/utils/activityShare'
import { resolveChatBadgeCount } from '@/utils/chatBadge'

export default {
  components: { WmIcon, WmTabBar },
  data() {
    return {
      activeCategoryId: HOME_CATEGORY_ALL,
      activeSort: HOME_SORT_DISTANCE,
      categoryTree: normalizeCategoryList(FALLBACK_ACTIVITY_CATEGORIES),
      activities: [],
      activityAnchor: null,
      hasSearchAnchor: false,
      loading: false,
      /** 列表为回退数据时提示（如当前城市/时段无活动） */
      listFallbackHint: '',
      cityHallLookup: null,
      weekActivityCount: 0,
      /** 分享落地：需在列表置顶的活动 ID（切换 Tab 仍保留） */
      sharedActivityId: '',
    }
  },
  computed: {
    cityHallJoined() {
      return !!this.cityHallLookup?.joined
    },
    cityHallMemberCount() {
      return Number(this.cityHallLookup?.memberCount) || 0
    },
    cityHallActivityId() {
      return this.cityHallLookup?.activityId || ''
    },
    citySubtitlePlace() {
      const code = (this.activityAnchor?.cityCode && String(this.activityAnchor.cityCode).trim()) || ''
      const fromCatalog = code ? resolveCityHallCityName(code) : ''
      if (fromCatalog) return fromCatalog.replace(/市$/, '') || fromCatalog
      const place =
        (this.activityAnchor?.displayName && String(this.activityAnchor.displayName).trim()) ||
        (this.cityHallCityLabel && String(this.cityHallCityLabel).trim()) ||
        ''
      if (!place || place === '定位中') return ''
      return place
    },
    citySubtitleMeta() {
      const parts = []
      if (this.cityHallMemberCount > 0) {
        parts.push(`${this.cityHallMemberCount} 人在聊`)
      }
      if (this.weekActivityCount > 0) {
        parts.push(`近 7 天 ${this.weekActivityCount} 场可加入`)
      } else {
        parts.push('进群或报名活动')
      }
      return parts.join(' · ')
    },
    searchBarText() {
      if (this.hasSearchAnchor && this.activityAnchor?.displayName) {
        return this.activityAnchor.displayName
      }
      return '搜索地点，查看附近活动'
    },
    cityHallCityLabel() {
      const code = this.activityAnchor?.cityCode
      const fromCatalog = code ? resolveCityHallCityName(code) : ''
      if (fromCatalog) return fromCatalog
      const fromLookup =
        (this.cityHallLookup?.displayName && String(this.cityHallLookup.displayName).trim()) || ''
      if (fromLookup) return fromLookup
      const name = (this.activityAnchor?.cityName && String(this.activityAnchor.cityName).trim()) || ''
      if (!name || name === '定位中') return ''
      return name
    },
    cityHallTitle() {
      if (this.cityHallCityLabel) return `【${this.cityHallCityLabel}】同城群`
      return '城市大群 · 选城市进群'
    },
    cityHallDesc() {
      if (this.cityHallJoined && this.cityHallMemberCount > 0) {
        return `${this.cityHallMemberCount} 位旅人在聊 · 找搭子先从这里开始`
      }
      if (this.cityHallMemberCount > 0) {
        return `${this.cityHallMemberCount} 位旅人在聊 · 进群找搭子`
      }
      return '进群找搭子：拼饭、出行、周末局'
    },
    cityHallCtaText() {
      return this.cityHallJoined ? '进群找搭子' : '免费进群找搭子'
    },
    cityHallChatBadge() {
      return resolveChatBadgeCount({
        joined: this.cityHallJoined,
        unreadCount: this.cityHallLookup?.unreadCount,
        messageCount: this.cityHallLookup?.messageCount,
      })
    },
    categoryChips() {
      const all = [{ key: HOME_CATEGORY_ALL, label: '全部' }]
      const rest = (this.categoryTree || []).map((c) => ({
        key: c.categoryId,
        label: c.name || c.categoryId,
      }))
      return all.concat(rest)
    },
  },
  onLoad(options) {
    const sharedId = parseSharedActivityIdFromQuery(options || {})
    if (sharedId) this.sharedActivityId = sharedId
    this.loadCategoryTree()
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
    Promise.resolve(uni.showShareMenu({ withShareTicket: false })).catch(() => {})
    // #endif
    this.syncSearchAnchorUi()
    this.loadHomeData()
  },
  onShareAppMessage() {
    const city =
      (this.activityAnchor?.displayName && String(this.activityAnchor.displayName).trim()) || ''
    return buildHomeShareMessage(city)
  },
  // #ifdef MP-WEIXIN
  onShareTimeline() {
    return buildDefaultTimelineShare()
  },
  // #endif
  methods: {
    syncSearchAnchorUi() {
      const search = getHomeSearchAnchorSync()
      this.hasSearchAnchor = !!search
      if (search) {
        const cityName = resolveCityHallCityName(search.cityCode) || search.displayName
        this.activityAnchor = {
          source: 'search',
          lat: search.lat,
          lng: search.lng,
          cityCode: search.cityCode,
          displayName: search.displayName,
          cityName,
        }
      }
    },
    async ensureActivityAnchor() {
      const anchor = await getHomeActivityAnchor()
      this.activityAnchor = anchor
      this.hasSearchAnchor = anchor.source === 'search'
      return anchor
    },
    onTapSearch() {
      uni.navigateTo({ url: '/pages/location-picker/location-picker?from=home' })
    },
    async onClearSearch() {
      clearHomeSearchAnchor()
      this.hasSearchAnchor = false
      await this.loadHomeData()
    },
    async loadCategoryTree() {
      try {
        const data = await getActivityCategories()
        const list = data?.categories || []
        this.categoryTree = mergeCategoryListWithFallback(list)
      } catch (_) {
        this.categoryTree = normalizeCategoryList(FALLBACK_ACTIVITY_CATEGORIES)
      }
    },
    onCategoryClick(categoryId) {
      const next = categoryId == null ? HOME_CATEGORY_ALL : String(categoryId)
      if (next === this.activeCategoryId) return
      this.activeCategoryId = next
      this.loadHomeData()
    },
    onSortClick(sort) {
      if (sort === this.activeSort) return
      this.activeSort = sort
      this.loadHomeData()
    },
    buildListQuery(cityCode) {
      const query = {
        cityCode,
        dateRange: HOME_ACTIVITY_DATE_RANGE,
        page: 1,
        pageSize: 20,
      }
      if (this.activeCategoryId) query.categoryId = this.activeCategoryId
      return query
    },
    async fetchActivityListForAnchor(anchor) {
      const { lat, lng, cityCode } = anchor
      const query = this.buildListQuery(cityCode)
      const sortBy =
        this.activeSort === HOME_SORT_POPULARITY ? HOME_SORT_POPULARITY : 'startAt'
      const data = await getActivities({ ...query, sortBy })
      let rows = data?.list || []
      if (this.activeSort === HOME_SORT_DISTANCE) {
        rows = sortActivityCardsByDistance(rows, lat, lng)
      }
      return rows.map(mapActivityCard)
    },
    async loadActivitiesForHome(anchor) {
      let list = await this.fetchActivityListForAnchor(anchor)
      let hint = ''
      if (!list.length) {
        const cat = this.categoryChips.find((c) => c.key === this.activeCategoryId)
        const catLabel = cat?.label || '该分类'
        hint =
          this.activeCategoryId === HOME_CATEGORY_ALL
            ? '近 7 天暂无活动，可先进群找搭子'
            : `${catLabel}近 7 天暂无活动，可试试「全部」或其他分类`
      }
      return { list, hint }
    },
    decorateActivityCards(list) {
      return dedupeHomeActivities(list).map((item) => {
        const spotsLabel = spotsLeftLabel(item.joined, item.total)
        return {
          ...item,
          locationShort: shortLocationName(item.location),
          spotsLabel,
          urgentSpot: isUrgentSpot(item.joined, item.total),
        }
      })
    },
    async fetchSharedActivityCard(activityId) {
      const id = String(activityId || '').trim()
      if (!id) return null
      try {
        const detail = await getActivityDetail(id)
        if (!detail?.activityId && !detail?.title) return null
        const card = mapActivityCard(detail)
        const [decorated] = this.decorateActivityCards([card])
        return decorated || null
      } catch (_) {
        return null
      }
    },
    async applySharedActivityPin(list) {
      const id = this.sharedActivityId
      if (!id) return list
      const pinned = await this.fetchSharedActivityCard(id)
      if (!pinned) {
        uni.showToast({ title: '分享的活动已不存在', icon: 'none' })
        this.sharedActivityId = ''
        return list
      }
      return pinSharedActivityOnList(list, pinned)
    },
    async loadCityHallStats(cityCode) {
      const cc = (cityCode && String(cityCode).trim()) || ''
      if (!cc) {
        this.cityHallLookup = null
        return
      }
      try {
        this.cityHallLookup = await getCityHallLookup(cc)
      } catch (_) {
        this.cityHallLookup = null
      }
    },
    async loadWeekActivityCount(cityCode) {
      const cc = (cityCode && String(cityCode).trim()) || ''
      if (!cc) {
        this.weekActivityCount = 0
        return
      }
      try {
        const data = await getActivities({
          cityCode: cc,
          dateRange: HOME_ACTIVITY_DATE_RANGE,
          page: 1,
          pageSize: 1,
        })
        this.weekActivityCount = Number(data?.total) || 0
      } catch (_) {
        this.weekActivityCount = 0
      }
    },
    async loadHomeData() {
      this.loading = true
      this.activities = []
      this.listFallbackHint = ''
      try {
        const anchor = await this.ensureActivityAnchor()
        const cityCode = anchor?.cityCode || ''
        await Promise.all([
          this.loadCityHallStats(cityCode),
          this.loadWeekActivityCount(cityCode),
        ])
        const { list, hint } = await this.loadActivitiesForHome(anchor)
        let cards = this.decorateActivityCards(list)
        cards = await this.applySharedActivityPin(cards)
        this.activities = cards
        this.listFallbackHint = hint
      } catch (e) {
        this.activities = []
        this.listFallbackHint = ''
        uni.showToast({ title: e?.message || '活动加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    onEmptyShowAllCategories() {
      if (this.activeCategoryId === HOME_CATEGORY_ALL) {
        this.loadHomeData()
        return
      }
      this.activeCategoryId = HOME_CATEGORY_ALL
      this.loadHomeData()
    },
    onEmptyGoDiscover() {
      uni.navigateTo({ url: '/pages/discover/discover' })
    },
    onOpenActivity(item) {
      uni.navigateTo({
        url: `/pages/activity-detail/activity-detail?id=${item.id}`,
      })
    },
    onCityHall() {
      if (this.cityHallJoined) {
        uni.navigateTo({ url: buildCityHallCatalogUrl(this.activityAnchor) })
        return
      }
      const code = (this.activityAnchor?.cityCode && String(this.activityAnchor.cityCode).trim()) || ''
      const cityName = this.cityHallCityLabel
      const place =
        this.activityAnchor?.source === 'search' && this.activityAnchor?.displayName
          ? String(this.activityAnchor.displayName).trim()
          : ''
      if (code) {
        const q = [`cityCode=${encodeURIComponent(code)}`]
        if (cityName) q.push(`cityLabel=${encodeURIComponent(cityName)}`)
        if (place && place !== cityName) q.push(`placeName=${encodeURIComponent(place)}`)
        uni.navigateTo({ url: `/pages/city-hall/city-hall?${q.join('&')}` })
        return
      }
      uni.navigateTo({ url: buildCityHallCatalogUrl(this.activityAnchor) })
    },
    onCopyHomeShare() {
      const city =
        (this.activityAnchor?.displayName && String(this.activityAnchor.displayName).trim()) || ''
      const text = buildHomeShareClipboardText(city)
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
  },
}
</script>

<style lang="scss" scoped>
.home {
  min-height: 100vh;
  background: transparent;

  &__header {
    position: sticky;
    top: 0;
    z-index: 10;
    padding: calc(32rpx + var(--status-bar-height, 0px) + env(safe-area-inset-top)) 32rpx 28rpx;
    background: $wm-sticky-header-gradient;
    border-bottom: none;
    box-shadow: 0 12rpx 40rpx rgba(2, 132, 199, 0.06);
    display: flex;
    flex-direction: column;
    gap: 28rpx;
  }

  &__header-main {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16rpx;
  }

  &__header-actions {
    flex-shrink: 0;
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

  &__brand {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
    min-width: 0;
  }

  &__logo {
    font-size: 48rpx;
    font-weight: 800;
    background: $wm-gradient-hero;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: 2rpx;
    line-height: 64rpx;
  }

  &__tagline-wrap {
    align-self: flex-start;
    margin-top: 2rpx;
    padding: 8rpx 22rpx;
    border-radius: $wm-radius-pill;
    background: rgba(251, 146, 60, 0.14);
    border: 2rpx solid rgba(251, 146, 60, 0.35);
    box-shadow: 0 4rpx 16rpx rgba(251, 146, 60, 0.16);
  }

  &__tagline {
    font-size: 30rpx;
    font-weight: 800;
    line-height: 42rpx;
    letter-spacing: 2rpx;
  }

  &__slogan-a,
  &__slogan-b {
    color: #fb923c;
    font-weight: 800;
  }

  &__slogan-sep {
    color: rgba(251, 146, 60, 0.55);
    font-weight: 600;
  }

  &__subtitle {
    font-size: 26rpx;
    color: $wm-text-3;
    line-height: 36rpx;
    font-weight: 500;

    .home__slogan-a {
      font-weight: 800;
    }
  }

  &__search {
    display: flex;
    align-items: center;
    gap: 12rpx;
  }

  &__search-inner {
    flex: 1;
    min-width: 0;
    height: 72rpx;
    border-radius: $wm-radius-lg;
    background: #ffffff;
    border: $wm-card-edge;
    box-shadow: $wm-shadow-sm;
    padding: 0 24rpx;
    display: flex;
    align-items: center;
    gap: 14rpx;
  }

  &__search-text {
    flex: 1;
    min-width: 0;
    font-size: 28rpx;
    color: $wm-text-2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__search-clear {
    flex-shrink: 0;
    width: 64rpx;
    height: 64rpx;
    border-radius: 50%;
    background: #ffffff;
    border: $wm-card-edge;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__sort-row {
    display: flex;
    align-items: center;
    gap: 16rpx;
    margin-bottom: 4rpx;
  }

  &__sort-chip {
    padding: 12rpx 28rpx;
    border-radius: $wm-radius-pill;
    background: rgba(255, 255, 255, 0.72);
    border: 2rpx solid rgba(148, 163, 184, 0.35);
    font-size: 26rpx;
    font-weight: 600;
    color: $wm-text-2;

    &--active {
      background: $wm-primary-soft;
      border-color: rgba(2, 132, 199, 0.35);
      color: $wm-primary;
    }
  }

  &__cat-scroll {
    width: 100%;
    white-space: nowrap;
    margin-bottom: 4rpx;
  }

  &__chips {
    display: inline-flex;
    align-items: center;
    gap: 16rpx;
    padding-bottom: 4rpx;
    white-space: nowrap;
  }

  &__city-hall {
    margin-bottom: 4rpx;
  }

  &__city-hall--hover {
    opacity: 0.92;
  }

  &__city-hall-inner {
    display: flex;
    align-items: center;
    gap: 20rpx;
    padding: 24rpx 28rpx;
    border-radius: $wm-radius-lg;
    background: linear-gradient(135deg, #eef2ff 0%, #f0f9ff 55%, #ecfeff 100%);
    border: 2rpx solid rgba(99, 102, 241, 0.22);
    box-shadow: 0 8rpx 28rpx rgba(79, 70, 229, 0.12);
  }

  &__city-hall-icon {
    width: 80rpx;
    height: 80rpx;
    border-radius: 20rpx;
    background: linear-gradient(145deg, #6366f1, #4f46e5);
    box-shadow: 0 6rpx 16rpx rgba(79, 70, 229, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__city-hall-text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
  }

  &__city-hall-title-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10rpx;
  }

  &__city-hall-title {
    font-size: 30rpx;
    font-weight: 700;
    color: #312e81;
    line-height: 1.35;
  }

  &__city-hall-badge {
    flex-shrink: 0;
    font-size: 20rpx;
    font-weight: 600;
    color: #047857;
    background: rgba(209, 250, 229, 0.95);
    padding: 4rpx 14rpx;
    border-radius: 999rpx;
    border: 1rpx solid rgba(16, 185, 129, 0.35);

    &--joined {
      color: #4338ca;
      background: rgba(224, 231, 255, 0.95);
      border-color: rgba(99, 102, 241, 0.35);
    }
  }

  &__city-hall-desc {
    font-size: 24rpx;
    color: #475569;
    line-height: 1.45;
  }

  &__city-hall-cta {
    position: relative;
    flex-shrink: 0;
    padding: 14rpx 26rpx;
    border-radius: 999rpx;
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    box-shadow: 0 4rpx 14rpx rgba(79, 70, 229, 0.35);

    text {
      font-size: 26rpx;
      font-weight: 600;
      color: #ffffff;
      white-space: nowrap;
    }
  }

  &__chat-badge {
    position: absolute;
    top: -10rpx;
    right: -10rpx;
    min-width: 32rpx;
    height: 32rpx;
    padding: 0 8rpx;
    border-radius: 999rpx;
    background: #ef4444;
    border: 2rpx solid #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2rpx 8rpx rgba(239, 68, 68, 0.35);
    z-index: 1;

    text {
      font-size: 20rpx;
      font-weight: 700;
      color: #ffffff;
      line-height: 1;
    }

    &--card {
      position: static;
      top: auto;
      right: auto;
      min-width: 36rpx;
      height: 36rpx;
      padding: 0 10rpx;
      border: none;
      box-shadow: none;
    }
  }

  &__empty {
    padding: 140rpx 32rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 28rpx;
  }

  &__empty-actions {
    display: flex;
    flex-direction: row;
    gap: 20rpx;
    margin-top: 12rpx;
  }

  &__empty-btn {
    padding: 18rpx 36rpx;
    border-radius: 999rpx;
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    font-size: 26rpx;
    font-weight: 600;
    color: #fff;

    &--ghost {
      background: #fff;
      color: #4f46e5;
      border: 2rpx solid #c7d2fe;
    }
  }

  &__fallback-hint {
    padding: 16rpx 20rpx;
    border-radius: 16rpx;
    background: #eef2ff;
    font-size: 24rpx;
    color: #4338ca;
    line-height: 1.45;
  }

  &__list {
    padding: 28rpx 32rpx 48rpx;
    display: flex;
    flex-direction: column;
    gap: 28rpx;
  }

  &__section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16rpx;
    margin-bottom: -8rpx;
  }

  &__section-title-wrap {
    display: flex;
    align-items: center;
    gap: 12rpx;
    min-width: 0;
  }

  &__section-accent {
    flex-shrink: 0;
    width: 8rpx;
    height: 36rpx;
    border-radius: 999rpx;
    background: linear-gradient(180deg, #fdba74 0%, #fb923c 100%);
    box-shadow: 0 2rpx 12rpx rgba(251, 146, 60, 0.32);
  }

  &__section-title {
    font-size: 36rpx;
    font-weight: 800;
    letter-spacing: 1rpx;
    line-height: 1.35;
  }

  &__section-meta {
    font-size: 24rpx;
    color: $wm-text-3;
    font-weight: 500;
  }
}

.empty-title {
  font-size: 34rpx;
  font-weight: 700;
  color: $wm-text-1;
}

.empty-desc {
  font-size: 26rpx;
  color: $wm-text-3;
  text-align: center;
  line-height: 1.55;
  max-width: 560rpx;
}

.chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 60rpx;
  padding: 0 28rpx;
  border-radius: 999rpx;
  background: #fafafa;
  color: $wm-text-2;
  font-size: 26rpx;
  font-weight: 500;
  line-height: 1;
  border: 2rpx solid transparent;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  flex-shrink: 0;

  &:active {
    transform: scale(0.95);
  }

  &--active {
    background: $wm-gradient-primary;
    color: #ffffff;
    box-shadow: $wm-shadow-glow;
    border-color: rgba(255, 255, 255, 0.3);
  }
}

.skeleton-card {
  background: #ffffff;
  border-radius: $wm-radius-lg;
  padding: 32rpx 32rpx 28rpx;
  border: $wm-card-edge;
  box-shadow: $wm-shadow-md;
}

.skeleton-tag-row {
  display: flex;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.skeleton-tag {
  height: 40rpx;
  border-radius: $wm-radius-sm;
  background: linear-gradient(90deg, #f8fafc 25%, #e2e8f0 50%, #f8fafc 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-tag--small {
  width: 120rpx;
}

.skeleton-title {
  height: 44rpx;
  width: 85%;
  border-radius: $wm-radius-sm;
  background: linear-gradient(90deg, #f8fafc 25%, #e2e8f0 50%, #f8fafc 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  margin-bottom: 20rpx;
}

.skeleton-meta {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-bottom: 24rpx;
}

.skeleton-meta-row {
  height: 32rpx;
  width: 65%;
  border-radius: $wm-radius-sm;
  background: linear-gradient(90deg, #f8fafc 25%, #e2e8f0 50%, #f8fafc 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-footer {
  padding-top: 24rpx;
  border-top: 2rpx dashed #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.skeleton-quota {
  height: 28rpx;
  width: 140rpx;
  border-radius: $wm-radius-sm;
  background: linear-gradient(90deg, #f8fafc 25%, #e2e8f0 50%, #f8fafc 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-organizer {
  height: 24rpx;
  width: 180rpx;
  border-radius: $wm-radius-sm;
  background: linear-gradient(90deg, #f8fafc 25%, #e2e8f0 50%, #f8fafc 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.card {
  background: #ffffff;
  border-radius: $wm-radius-lg;
  padding: 32rpx 32rpx 28rpx;
  border: $wm-card-edge;
  box-shadow: $wm-shadow-md;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
  animation: fadeInUp 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
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
    opacity: 0;
    transition: opacity 0.2s;
  }

  &--hover {
    transform: translateY(-4rpx) scale(0.995);
    box-shadow: $wm-card-elevated-shadow;

    &::before {
      opacity: 1;
    }
  }

  &--shared-pin {
    border-color: rgba(99, 102, 241, 0.28);
    box-shadow: 0 12rpx 40rpx rgba(99, 102, 241, 0.12);

    &::before {
      opacity: 1;
    }
  }

  &--shared-inactive {
    opacity: 0.92;
  }

  &__top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__top-right {
    display: flex;
    align-items: center;
    gap: 12rpx;
    flex-shrink: 0;
  }

  &__tags {
    display: flex;
    gap: 12rpx;
    align-items: center;
    flex-wrap: wrap;
  }

  &__title {
    display: block;
    margin-top: 20rpx;
    font-size: 36rpx;
    font-weight: 700;
    color: $wm-text-1;
    line-height: 1.35;
  }

  &__meta {
    margin-top: 20rpx;
    display: flex;
    flex-direction: column;
    gap: 12rpx;
  }

  &__footer {
    margin-top: 24rpx;
    padding-top: 24rpx;
    border-top: 2rpx dashed #f1f5f9;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__quota {
    display: flex;
    align-items: center;
    gap: 10rpx;
  }

  &__quota-text {
    font-size: 26rpx;
    color: $wm-text-2;
    font-weight: 600;
  }

  &__organizer {
    font-size: 22rpx;
    color: $wm-text-3;

    &--muted {
      color: #64748b;
    }
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(24rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  height: 40rpx;
  padding: 0 16rpx;
  border-radius: $wm-radius-sm;
  font-size: 22rpx;
  font-weight: 600;

  &--verified {
    background: #ecfdf5;
    color: #059669;
  }

  &--enrolled {
    background: $wm-primary-soft;
    color: $wm-primary;
  }

  &--urgent {
    background: #fff7ed;
    color: #ea580c;
  }

  &--shared {
    background: rgba(99, 102, 241, 0.12);
    color: #4f46e5;
  }
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 12rpx;

  &__text {
    font-size: 26rpx;
    color: $wm-text-2;
    font-weight: 500;
  }

  &__dist {
    font-size: 22rpx;
    color: $wm-text-3;
    font-weight: 500;
  }
}
</style>
