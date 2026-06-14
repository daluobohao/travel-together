<template>
  <view class="page city-hall">
    <view class="city-hall__header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="city-hall__back" @click="goBack">
        <wm-icon name="chevronLeft" :size="34" color="#6366f1" />
        <text class="city-hall__back-text">返回</text>
      </view>
      <text class="city-hall__title">{{ pageTitle }}</text>
      <text class="city-hall__sub">{{ headerSub }}</text>
    </view>

    <view v-if="loading" class="city-hall__loading">
      <text>加载中…</text>
    </view>

    <!-- 全国目录 -->
    <scroll-view
      v-else-if="!isDetail"
      class="city-hall__scroll"
      scroll-y
      :enable-flex="true"
      :style="{ height: scrollHeight + 'px' }"
    >
      <text v-if="metaTip" class="city-hall__tip city-hall__tip--top">{{ metaTip }}</text>

      <view v-if="hasNearCity" class="city-hall__near-block" @click="openNearCityDetail">
        <view class="city-hall__near-head">
          <wm-icon name="locate" :size="28" color="#4f46e5" />
          <text class="city-hall__near-kicker">当前位置</text>
        </view>
        <view class="city-hall__near-card">
          <view class="city-hall__near-main">
            <text class="city-hall__near-name">{{ nearCityDisplayName }}</text>
            <text v-if="nearPlaceHint" class="city-hall__near-place">{{ nearPlaceHint }}</text>
            <text v-if="nearProvinceLabel" class="city-hall__near-prov">{{ nearProvinceLabel }}</text>
          </view>
          <view class="city-hall__near-foot">
            <view class="city-hall__near-tags">
              <text v-if="nearCityJoined" class="city-hall__badge">已加入</text>
              <text v-if="nearMemberCount > 0" class="city-hall__near-meta">{{ nearMemberCount }} 人在聊</text>
            </view>
            <text class="city-hall__near-action">{{ nearCityJoined ? '进入大群 ›' : '加入大群 ›' }}</text>
          </view>
        </view>
      </view>

      <view v-if="joinedCitiesQuick.length" class="city-hall__joined-block">
        <text class="city-hall__section-label">我已加入</text>
        <view class="city-hall__joined-row">
          <view
            v-for="c in joinedCitiesQuick"
            :key="c.cityCode"
            class="city-hall__joined-chip"
            @click="openCityDetail(c)"
          >
            <text class="city-hall__joined-chip-name">{{ c.cityName }}</text>
            <text v-if="c.memberCount > 0" class="city-hall__joined-chip-meta">{{ c.memberCount }}人</text>
          </view>
        </view>
      </view>

      <text class="city-hall__section-label city-hall__section-label--catalog">按省份选择城市</text>
      <view v-for="block in catalogProvinces" :key="block.provinceCode" class="city-hall__province">
        <view class="city-hall__prov-head" @click="toggleProvince(block)">
          <text class="city-hall__province-name">{{ block.provinceName }}</text>
          <text class="city-hall__prov-meta">{{ block.cities && block.cities.length ? block.cities.length + ' 个' : '' }}</text>
          <text class="city-hall__prov-chev">{{ expandedProvinceCode === block.provinceCode ? '⌄' : '›' }}</text>
        </view>
        <view v-if="expandedProvinceCode === block.provinceCode" class="city-hall__prov-body">
          <view
            v-for="c in block.cities"
            :key="c.cityCode"
            class="city-hall__row city-hall__row--child"
            :class="{ 'city-hall__row--near': c.cityCode === nearCityCode }"
            @click="openCityDetail(c)"
          >
            <view class="city-hall__row-main">
              <text class="city-hall__row-title">{{ c.cityName || c.displayName || c.cityCode }}</text>
              <text v-if="c.cityCode === nearCityCode" class="city-hall__badge city-hall__badge--near">当前位置</text>
              <text v-else-if="c.joined" class="city-hall__badge">已加入</text>
            </view>
            <text v-if="c.memberCount > 0" class="city-hall__row-meta">{{ c.memberCount }} 人</text>
            <text v-else-if="!c.activityId" class="city-hall__row-meta city-hall__row-meta--muted">待开通</text>
            <text class="city-hall__row-chev">›</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 单城详情 -->
    <scroll-view v-else class="city-hall__scroll city-hall__scroll--detail" scroll-y :style="{ height: scrollHeight + 'px' }">
      <view class="city-hall__hero">
        <text class="city-hall__hero-kicker">你所在城市的同城大群</text>
        <text class="city-hall__hero-name">{{ catalogCityName }}</text>
        <text class="city-hall__hero-tag">同城大群</text>
        <text class="city-hall__hero-sub">{{ heroSubline }}</text>
        <view class="city-hall__hero-stats">
          <view v-if="memberCount > 0" class="city-hall__hero-stat">
            <wm-icon name="users" :size="28" color="#6366f1" />
            <text>{{ memberCount }} 位旅人在聊</text>
          </view>
          <text v-if="joined" class="city-hall__hero-joined">已加入</text>
        </view>
      </view>

      <view v-if="owner" class="city-hall__owner-card" @click="openOwnerProfile">
        <view class="city-hall__owner-avatar">
          <image v-if="owner.avatarUrl" class="city-hall__owner-avatar-img" :src="owner.avatarUrl" mode="aspectFill" />
          <text v-else>{{ ownerInitial }}</text>
        </view>
        <view class="city-hall__owner-main">
          <view class="city-hall__owner-title-row">
            <text class="city-hall__owner-label">城主</text>
            <text class="city-hall__owner-name">{{ owner.nickname || '用户' }}</text>
          </view>
          <text class="city-hall__owner-meta">{{ ownerBadgeLabel }}</text>
        </view>
        <text class="city-hall__owner-action">看资料 ›</text>
      </view>
      <view v-else class="city-hall__official-tip">
        <text>旅聚官方 · 友善交流，违规可举报</text>
      </view>

      <view v-if="metaTip" class="city-hall__tip-card">
        <text>{{ metaTip }}</text>
      </view>

      <view class="city-hall__actions">
        <view v-if="joined && activityId" class="city-hall__btn city-hall__btn--primary" @click="openChat">
          <text>进入群聊</text>
        </view>
        <view v-else class="city-hall__btn city-hall__btn--primary" @click="onJoin">
          <text>加入城市大群</text>
        </view>
        <view v-if="isHost" class="city-hall__btn city-hall__btn--ghost" @click="openHostConsole">
          <text>管理群公告</text>
        </view>
        <view
          v-else-if="canApplyForOwner && joined"
          class="city-hall__btn city-hall__btn--ghost"
          @click="openHostApply"
        >
          <text>申请成为城主</text>
        </view>
        <view v-else-if="hostApplicationPending" class="city-hall__pending-tip">
          <text>城主申请审核中，请耐心等待</text>
        </view>
      </view>

      <view v-if="announcement" class="city-hall__announcement">
        <view class="city-hall__announcement-head">
          <text class="city-hall__announcement-label">群公告</text>
          <text
            v-if="announcementNeedsFold"
            class="city-hall__announcement-toggle"
            @click="toggleAnnouncement"
          >{{ announcementExpanded ? '收起' : '展开' }}</text>
        </view>
        <text
          class="city-hall__announcement-text"
          :class="{ 'city-hall__announcement-text--folded': announcementNeedsFold && !announcementExpanded }"
        >{{ announcement }}</text>
      </view>

      <view class="city-hall__section">
        <view class="city-hall__section-head">
          <text class="city-hall__section-title">其他城市大群</text>
          <text class="city-hall__section-link" @click="openCatalog">全部城市 ›</text>
        </view>

        <view v-if="otherJoinedCities.length" class="city-hall__subblock">
          <text class="city-hall__subblock-label">我已加入</text>
          <view class="city-hall__city-grid">
            <view
              v-for="c in otherJoinedCities"
              :key="'j-' + c.cityCode"
              class="city-hall__city-chip city-hall__city-chip--joined"
              @click="openCityDetail(c)"
            >
              <text class="city-hall__city-chip-name">{{ c.cityName }}</text>
              <text v-if="c.memberCount > 0" class="city-hall__city-chip-meta">{{ c.memberCount }}人</text>
            </view>
          </view>
        </view>

        <view v-if="popularCities.length" class="city-hall__subblock">
          <text class="city-hall__subblock-label">热门大群</text>
          <scroll-view class="city-hall__hot-scroll" scroll-x enable-flex>
            <view
              v-for="c in popularCities"
              :key="'p-' + c.cityCode"
              class="city-hall__hot-card"
              @click="openCityDetail(c)"
            >
              <text class="city-hall__hot-name">{{ c.cityName }}</text>
              <text class="city-hall__hot-prov">{{ c.provinceName }}</text>
              <text class="city-hall__hot-meta">{{ c.memberCount }} 人在聊</text>
            </view>
          </scroll-view>
        </view>

        <view class="city-hall__browse" @click="openCatalog">
          <wm-icon name="mapPin" :size="32" color="#4f46e5" />
          <view class="city-hall__browse-text">
            <text class="city-hall__browse-title">浏览全国城市大群</text>
            <text class="city-hall__browse-desc">按省份选择，换城先落脚</text>
          </view>
          <text class="city-hall__browse-chev">›</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import {
  formatHostBadgeLabel,
  normalizeHostBadgeLabel,
  normalizePlaceHint,
  resolveCityHallCityName,
  resolveCityHallProvinceName,
} from '@/utils/cityCatalog'
import {
  buildCityHallCatalogUrl,
  getHomeActivityAnchor,
} from '@/utils/homeCity'
import {
  getCityGroupsMeta,
  getCityHallCatalog,
  getCityHallLookup,
  isLoggedIn,
  joinCityHall,
  redirectToLogin,
} from '@/api'
import { ensurePhoneBound, PHONE_GATE_REASON } from '@/utils/phoneGate'
import { ensureProfileComplete } from '@/utils/profileGate'

function stripCityHallSuffix(name) {
  return String(name || '')
    .replace(/\s*·\s*城市大群\s*$/, '')
    .replace(/\s*城市大群\s*$/, '')
    .trim()
}

export default {
  components: { WmIcon },
  data() {
    const sysInfo = uni.getSystemInfoSync()
    return {
      statusBarHeight: sysInfo.statusBarHeight || 0,
      windowHeight: sysInfo.windowHeight || 0,
      scrollHeight: 0,
      cityCode: '',
      cityLabel: '',
      placeName: '',
      nearCityCode: '',
      nearCityLabel: '',
      nearPlaceName: '',
      nearLookup: {},
      loading: true,
      metaTip: '',
      catalogProvinces: [],
      flatCatalogCities: [],
      expandedProvinceCode: '',
      exists: false,
      joined: false,
      activityId: '',
      lookup: {},
      announcementExpanded: false,
    }
  },
  computed: {
    isDetail() {
      return !!(this.cityCode && String(this.cityCode).trim())
    },
    pageTitle() {
      return this.isDetail ? '同城大群' : '选择城市大群'
    },
    headerSub() {
      if (!this.isDetail) {
        if (this.hasNearCity) {
          const hint = this.nearPlaceHint ? `（${this.nearPlaceHint}）` : ''
          return `当前在 ${this.nearCityDisplayName}${hint}，可先加入本地同城大群`
        }
        return '全国各城旅人交流群，先选你所在的城市'
      }
      if (this.provinceLabel && this.catalogCityName) {
        return `${this.provinceLabel} · ${this.catalogCityName}`
      }
      return this.catalogCityName || '选择城市加入同城大群'
    },
    catalogCityName() {
      const fromCatalog = this.flatCatalogCities.find((c) => c.cityCode === this.cityCode)
      if (fromCatalog?.cityName) return fromCatalog.cityName
      const fromStatic = resolveCityHallCityName(this.cityCode)
      if (fromStatic) return fromStatic
      const label = stripCityHallSuffix(this.cityLabel)
      return label || '同城大群'
    },
    displayCityName() {
      return this.catalogCityName
    },
    provinceLabel() {
      const hit = this.flatCatalogCities.find((c) => c.cityCode === this.cityCode)
      if (hit?.provinceName) return hit.provinceName
      return resolveCityHallProvinceName(this.cityCode)
    },
    placeHint() {
      return normalizePlaceHint(this.placeName, this.catalogCityName)
    },
    memberCount() {
      return Number(this.lookup?.memberCount) || 0
    },
    owner() {
      return this.lookup?.owner || null
    },
    ownerInitial() {
      return String(this.owner?.nickname || '?').slice(0, 1)
    },
    ownerBadgeLabel() {
      if (this.owner?.badgeLabel) {
        return normalizeHostBadgeLabel(this.owner.badgeLabel)
      }
      if (this.owner?.role) {
        return formatHostBadgeLabel(this.catalogCityName, this.owner.role)
      }
      return '城主'
    },
    announcement() {
      return (this.lookup?.announcement && String(this.lookup.announcement).trim()) || ''
    },
    announcementNeedsFold() {
      const text = this.announcement
      if (!text) return false
      if (text.length > 100) return true
      return (text.match(/\n/g) || []).length >= 3
    },
    isHost() {
      return !!(this.lookup?.currentUserHostRole)
    },
    canApplyForOwner() {
      return !!this.lookup?.canApplyForOwner
    },
    hostApplicationPending() {
      return this.lookup?.hostApplicationStatus === 'pending'
    },
    applyMinMembers() {
      return Number(this.lookup?.applyMinMembers) || 100
    },
    heroSubline() {
      if (this.placeHint) {
        return `你在 ${this.placeHint} 附近 · 加入${this.catalogCityName}同城旅人一起聊`
      }
      if (this.provinceLabel) {
        return `${this.provinceLabel} · 同城旅人随时聊、拼饭、找搭子`
      }
      return '同城旅人随时聊、拼饭、找搭子'
    },
    joinedCitiesQuick() {
      return this.flatCatalogCities.filter((c) => c.joined)
    },
    otherJoinedCities() {
      return this.flatCatalogCities.filter((c) => c.joined && c.cityCode !== this.cityCode)
    },
    popularCities() {
      return this.flatCatalogCities
        .filter((c) => c.cityCode !== this.cityCode && c.memberCount > 0)
        .sort((a, b) => b.memberCount - a.memberCount)
        .slice(0, 8)
    },
    hasNearCity() {
      return !!(this.nearCityCode && String(this.nearCityCode).trim())
    },
    nearCityDisplayName() {
      const hit = this.flatCatalogCities.find((c) => c.cityCode === this.nearCityCode)
      if (hit?.cityName) return hit.cityName
      const fromStatic = resolveCityHallCityName(this.nearCityCode)
      if (fromStatic) return fromStatic
      return stripCityHallSuffix(this.nearCityLabel) || this.nearCityCode
    },
    nearProvinceLabel() {
      const hit = this.flatCatalogCities.find((c) => c.cityCode === this.nearCityCode)
      if (hit?.provinceName) return hit.provinceName
      return resolveCityHallProvinceName(this.nearCityCode)
    },
    nearPlaceHint() {
      return normalizePlaceHint(this.nearPlaceName, this.nearCityDisplayName)
    },
    nearMemberCount() {
      const hit = this.flatCatalogCities.find((c) => c.cityCode === this.nearCityCode)
      if (hit?.memberCount > 0) return hit.memberCount
      return Number(this.nearLookup?.memberCount) || 0
    },
    nearCityJoined() {
      const hit = this.flatCatalogCities.find((c) => c.cityCode === this.nearCityCode)
      if (hit?.joined) return true
      return !!this.nearLookup?.joined
    },
  },
  watch: {
    announcement() {
      this.announcementExpanded = false
    },
  },
  onLoad(query) {
    const q = query || {}
    this.cityCode = (q.cityCode && String(q.cityCode).trim()) || ''
    const raw = q.cityLabel != null ? String(q.cityLabel) : ''
    const rawPlace = q.placeName != null ? String(q.placeName) : ''
    try {
      this.cityLabel = raw ? decodeURIComponent(raw.replace(/\+/g, ' ')) : ''
      this.placeName = rawPlace ? decodeURIComponent(rawPlace.replace(/\+/g, ' ')) : ''
    } catch {
      this.cityLabel = raw
      this.placeName = rawPlace
    }
    if (!this.placeName && this.cityLabel) {
      const official = resolveCityHallCityName(this.cityCode)
      this.placeName = normalizePlaceHint(this.cityLabel, official)
      if (official) this.cityLabel = official
    }
    this.nearCityCode = (q.nearCityCode && String(q.nearCityCode).trim()) || ''
    const rawNearLabel = q.nearCityLabel != null ? String(q.nearCityLabel) : ''
    const rawNearPlace = q.nearPlaceName != null ? String(q.nearPlaceName) : ''
    try {
      this.nearCityLabel = rawNearLabel ? decodeURIComponent(rawNearLabel.replace(/\+/g, ' ')) : ''
      this.nearPlaceName = rawNearPlace ? decodeURIComponent(rawNearPlace.replace(/\+/g, ' ')) : ''
    } catch {
      this.nearCityLabel = rawNearLabel
      this.nearPlaceName = rawNearPlace
    }
    this.bootstrap()
  },
  onShow() {
    if (this.isDetail && this.cityCode && !this.loading) {
      this.refreshLookup()
    }
  },
  onReady() {
    this.calcScrollHeight()
  },
  methods: {
    flattenCatalog(provinces) {
      const out = []
      for (const p of provinces || []) {
        for (const c of p.cities || []) {
          out.push({
            ...c,
            provinceCode: p.provinceCode,
            provinceName: p.provinceName,
            cityName: c.cityName || stripCityHallSuffix(c.displayName) || c.cityCode,
          })
        }
      }
      return out
    },
    calcScrollHeight() {
      const query = uni.createSelectorQuery().in(this)
      query.select('.city-hall__header').boundingClientRect((rect) => {
        if (rect) {
          const padding = uni.upx2px(48 + 24)
          this.scrollHeight = this.windowHeight - rect.bottom - padding
        }
      }).exec()
    },
    goBack() {
      uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/home/home' }) })
    },
    openCatalog() {
      const anchor = {
        cityCode: this.nearCityCode || this.cityCode,
        cityName: this.nearCityLabel || this.cityLabel,
        displayName: this.nearPlaceName || this.placeName || this.nearCityLabel || this.cityLabel,
        source: this.nearPlaceName || this.placeName ? 'search' : 'gps',
      }
      const url = buildCityHallCatalogUrl(anchor)
      uni.redirectTo({
        url,
        fail: () => uni.navigateTo({ url }),
      })
    },
    toggleProvince(block) {
      const code = block && block.provinceCode
      if (!code) return
      this.expandedProvinceCode = this.expandedProvinceCode === code ? '' : code
    },
    toggleAnnouncement() {
      this.announcementExpanded = !this.announcementExpanded
    },
    async loadCatalog() {
      const cat = await getCityHallCatalog()
      this.catalogProvinces = cat?.provinces || []
      this.flatCatalogCities = this.flattenCatalog(this.catalogProvinces)
      const focusCode = this.isDetail ? this.cityCode : this.nearCityCode
      if (focusCode) {
        const hit = this.flatCatalogCities.find((c) => c.cityCode === focusCode)
        if (hit?.provinceCode) {
          this.expandedProvinceCode = hit.provinceCode
        }
      }
    },
    async resolveNearCityContext() {
      if (this.nearCityCode) return
      try {
        const anchor = await getHomeActivityAnchor()
        this.nearCityCode = (anchor?.cityCode && String(anchor.cityCode).trim()) || ''
        if (!this.nearCityCode) return
        this.nearCityLabel =
          resolveCityHallCityName(this.nearCityCode) ||
          (anchor?.cityName && String(anchor.cityName).trim()) ||
          (anchor?.displayName && String(anchor.displayName).trim()) ||
          ''
        if (anchor?.source === 'search' && anchor?.displayName) {
          this.nearPlaceName = String(anchor.displayName).trim()
        }
      } catch (_) {
        /* ignore */
      }
    },
    async loadNearCityLookup() {
      if (!this.nearCityCode) return
      try {
        this.nearLookup = (await getCityHallLookup(this.nearCityCode)) || {}
      } catch (_) {
        this.nearLookup = {}
      }
    },
    async refreshLookup() {
      if (!this.cityCode) return
      try {
        const lu = await getCityHallLookup(this.cityCode)
        this.lookup = lu || {}
        this.exists = !!lu?.exists
        this.joined = !!lu?.joined
        this.activityId = lu?.activityId || this.activityId
      } catch {
        /* ignore background refresh */
      }
    },
    async bootstrap() {
      this.loading = true
      try {
        const metaP = getCityGroupsMeta().catch(() => null)
        if (!this.isDetail) {
          await this.resolveNearCityContext()
        }
        const catalogP = this.loadCatalog()
        if (!this.isDetail) {
          const meta = await metaP
          await catalogP
          await this.loadNearCityLookup()
          this.metaTip = meta?.recommendTip || ''
        } else {
          const [meta, lu] = await Promise.all([
            metaP,
            getCityHallLookup(this.cityCode),
            catalogP,
          ])
          this.metaTip = meta?.recommendTip || ''
          this.lookup = lu || {}
          this.exists = !!lu?.exists
          this.joined = !!lu?.joined
          this.activityId = lu?.activityId || ''
        }
      } catch (e) {
        uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
      } finally {
        this.loading = false
        this.$nextTick(() => this.calcScrollHeight())
      }
    },
    openNearCityDetail() {
      const hit = this.flatCatalogCities.find((c) => c.cityCode === this.nearCityCode)
      if (hit) {
        this.openCityDetail(hit)
        return
      }
      const q = [`cityCode=${encodeURIComponent(this.nearCityCode)}`]
      const name = this.nearCityDisplayName
      if (name) q.push(`cityLabel=${encodeURIComponent(name)}`)
      if (this.nearPlaceName) q.push(`placeName=${encodeURIComponent(this.nearPlaceName)}`)
      const url = `/pages/city-hall/city-hall?${q.join('&')}`
      uni.redirectTo({ url, fail: () => uni.navigateTo({ url }) })
    },
    openCityDetail(c) {
      const code = c && c.cityCode
      if (!code) return
      const name = (c.cityName && String(c.cityName).trim()) || stripCityHallSuffix(c.displayName) || ''
      const q = [`cityCode=${encodeURIComponent(code)}`]
      if (name) q.push(`cityLabel=${encodeURIComponent(name)}`)
      const url = `/pages/city-hall/city-hall?${q.join('&')}`
      uni.redirectTo({ url, fail: () => uni.navigateTo({ url }) })
    },
    onJoin() {
      if (this.joined) return
      if (!isLoggedIn()) {
        const q = [`cityCode=${encodeURIComponent(this.cityCode)}`]
        const label = (this.cityLabel && String(this.cityLabel).trim()) || ''
        if (label) q.push(`cityLabel=${encodeURIComponent(label)}`)
        redirectToLogin(`/pages/city-hall/city-hall?${q.join('&')}`)
        return
      }
      const name = this.catalogCityName || '该城市'
      uni.showModal({
        title: '加入城市大群',
        content: `确定加入「${name}」同城大群吗？加入后即可与同城的旅人交流。`,
        confirmText: '加入',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) this.doJoin()
        },
      })
    },
    async doJoin() {
      const back = (() => {
        const q = [`cityCode=${encodeURIComponent(this.cityCode)}`]
        const label = (this.cityLabel && String(this.cityLabel).trim()) || ''
        if (label) q.push(`cityLabel=${encodeURIComponent(label)}`)
        return `/pages/city-hall/city-hall?${q.join('&')}`
      })()
      const profileOk = await ensureProfileComplete({ redirectPath: back })
      if (!profileOk) return
      const phoneOk = await ensurePhoneBound({
        redirectPath: back,
        reason: PHONE_GATE_REASON.CITY_HALL,
      })
      if (!phoneOk) return
      try {
        uni.showLoading({ title: '加入中…' })
        const data = await joinCityHall(this.cityCode, this.catalogCityName)
        this.joined = true
        this.activityId = data?.activityId || ''
        this.exists = true
        this.lookup = {
          ...this.lookup,
          exists: true,
          displayName: data?.displayName,
          memberCount: data?.memberCount,
          joined: true,
          activityId: data?.activityId,
          activityKind: 'city_hall',
        }
        await this.loadCatalog()
        uni.showToast({ title: '已加入', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: e?.message || '加入失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
    openChat() {
      const id = this.activityId || this.lookup?.activityId
      if (!id) return
      const url = `/pages/chat-detail/chat-detail?id=${encodeURIComponent(id)}`
      uni.redirectTo({ url, fail: () => uni.navigateTo({ url }) })
    },
    openOwnerProfile() {
      if (!this.owner?.userId) return
      uni.navigateTo({
        url: '/pages/user-public/user-public?userId=' + encodeURIComponent(this.owner.userId),
      })
    },
    openHostConsole() {
      const q = [`cityCode=${encodeURIComponent(this.cityCode)}`]
      const label = this.catalogCityName
      if (label) q.push(`cityLabel=${encodeURIComponent(label)}`)
      uni.navigateTo({ url: `/pages/city-host-console/city-host-console?${q.join('&')}` })
    },
    openHostApply() {
      const q = [
        `cityCode=${encodeURIComponent(this.cityCode)}`,
        `applyMinMembers=${this.applyMinMembers}`,
      ]
      const label = this.catalogCityName
      if (label) q.push(`cityLabel=${encodeURIComponent(label)}`)
      uni.navigateTo({ url: `/pages/city-host-apply/city-host-apply?${q.join('&')}` })
    },
  },
}
</script>

<style scoped>
.page.city-hall {
  min-height: 100vh;
  background: linear-gradient(180deg, #eef2ff 0%, #f8fafc 36%, #ffffff 100%);
  padding: 24rpx 32rpx 48rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.city-hall__header {
  flex-shrink: 0;
  margin-bottom: 24rpx;
}
.city-hall__back {
  display: flex;
  align-items: center;
  gap: 4rpx;
  margin-bottom: 16rpx;
}
.city-hall__back-text {
  font-size: 28rpx;
  color: #6366f1;
}
.city-hall__title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #0f172a;
}
.city-hall__sub {
  display: block;
  margin-top: 8rpx;
  font-size: 26rpx;
  color: #64748b;
  line-height: 1.45;
}
.city-hall__loading {
  padding: 80rpx 0;
  text-align: center;
  color: #94a3b8;
}
.city-hall__scroll {
  min-height: 200rpx;
}
.city-hall__scroll--detail {
  padding-bottom: 32rpx;
}
.city-hall__tip--top {
  display: block;
  margin-bottom: 24rpx;
  font-size: 26rpx;
  color: #475569;
  line-height: 1.5;
}
.city-hall__section-label {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 16rpx;
}
.city-hall__section-label--catalog {
  margin-top: 8rpx;
  margin-bottom: 20rpx;
}
.city-hall__near-block {
  margin-bottom: 28rpx;
}
.city-hall__near-head {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 12rpx;
}
.city-hall__near-kicker {
  font-size: 26rpx;
  font-weight: 700;
  color: #4f46e5;
}
.city-hall__near-card {
  padding: 28rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #eef2ff 0%, #f0f9ff 55%, #ecfeff 100%);
  border: 2rpx solid #c7d2fe;
  box-shadow: 0 8rpx 28rpx rgba(79, 70, 229, 0.12);
}
.city-hall__near-main {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.city-hall__near-name {
  font-size: 36rpx;
  font-weight: 800;
  color: #312e81;
  line-height: 1.3;
}
.city-hall__near-place {
  font-size: 24rpx;
  color: #475569;
  line-height: 1.4;
}
.city-hall__near-prov {
  font-size: 24rpx;
  color: #64748b;
}
.city-hall__near-foot {
  margin-top: 20rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}
.city-hall__near-tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10rpx;
}
.city-hall__near-meta {
  font-size: 24rpx;
  color: #6366f1;
  font-weight: 600;
}
.city-hall__near-action {
  flex-shrink: 0;
  font-size: 26rpx;
  font-weight: 700;
  color: #4f46e5;
}
.city-hall__joined-block {
  margin-bottom: 28rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(15, 23, 42, 0.05);
}
.city-hall__joined-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.city-hall__joined-chip {
  padding: 14rpx 22rpx;
  border-radius: 999rpx;
  background: #eef2ff;
  border: 2rpx solid #c7d2fe;
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.city-hall__joined-chip-name {
  font-size: 26rpx;
  font-weight: 600;
  color: #312e81;
}
.city-hall__joined-chip-meta {
  font-size: 22rpx;
  color: #6366f1;
}
.city-hall__hero {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  border-radius: 28rpx;
  padding: 36rpx 32rpx 32rpx;
  color: #fff;
  box-shadow: 0 12rpx 40rpx rgba(79, 70, 229, 0.28);
}
.city-hall__hero-kicker {
  display: block;
  font-size: 22rpx;
  opacity: 0.88;
  letter-spacing: 2rpx;
}
.city-hall__hero-name {
  display: block;
  margin-top: 12rpx;
  font-size: 48rpx;
  font-weight: 800;
  line-height: 1.25;
}
.city-hall__hero-tag {
  display: inline-block;
  margin-top: 10rpx;
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.2);
  opacity: 0.95;
}
.city-hall__hero-sub {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  opacity: 0.92;
  line-height: 1.5;
}
.city-hall__hero-stats {
  margin-top: 24rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex-wrap: wrap;
}
.city-hall__hero-stat {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 26rpx;
  background: rgba(255, 255, 255, 0.18);
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
}
.city-hall__hero-joined {
  font-size: 24rpx;
  background: rgba(255, 255, 255, 0.95);
  color: #4338ca;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  font-weight: 600;
}
.city-hall__owner-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-top: 24rpx;
  padding: 24rpx;
  background: #ffffff;
  border-radius: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(15, 23, 42, 0.06);
}
.city-hall__owner-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 16rpx;
  background: linear-gradient(135deg, #c7d2fe, #6366f1);
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}
.city-hall__owner-avatar-img {
  width: 100%;
  height: 100%;
}
.city-hall__owner-main {
  flex: 1;
  min-width: 0;
}
.city-hall__owner-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 6rpx;
}
.city-hall__owner-label {
  font-size: 22rpx;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.12);
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}
.city-hall__owner-name {
  font-size: 30rpx;
  font-weight: 700;
  color: #0f172a;
}
.city-hall__owner-meta {
  font-size: 24rpx;
  color: #64748b;
}
.city-hall__owner-action {
  font-size: 24rpx;
  color: #6366f1;
  flex-shrink: 0;
}
.city-hall__official-tip {
  margin-top: 24rpx;
  padding: 20rpx 24rpx;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 16rpx;
  font-size: 26rpx;
  color: #64748b;
}
.city-hall__announcement {
  margin-top: 28rpx;
  padding: 24rpx;
  background: #fffbeb;
  border-radius: 16rpx;
  border: 1rpx solid #fde68a;
}
.city-hall__announcement-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}
.city-hall__announcement-label {
  display: block;
  font-size: 24rpx;
  font-weight: 600;
  color: #b45309;
}
.city-hall__announcement-toggle {
  flex-shrink: 0;
  font-size: 24rpx;
  color: #b45309;
  padding: 4rpx 0 4rpx 20rpx;
}
.city-hall__announcement-text {
  font-size: 28rpx;
  color: #78350f;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}
.city-hall__announcement-text--folded {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  overflow: hidden;
}
.city-hall__tip-card {
  margin-top: 20rpx;
  padding: 20rpx 24rpx;
  background: #fff;
  border-radius: 16rpx;
  font-size: 24rpx;
  color: #475569;
  line-height: 1.5;
}
.city-hall__province {
  margin-bottom: 16rpx;
}
.city-hall__prov-head {
  display: flex;
  align-items: center;
  background: #e0e7ff;
  border-radius: 20rpx;
  padding: 22rpx 28rpx;
  margin-bottom: 8rpx;
}
.city-hall__province-name {
  flex: 1;
  font-size: 30rpx;
  font-weight: 600;
  color: #312e81;
}
.city-hall__prov-meta {
  font-size: 24rpx;
  color: #6366f1;
  margin-right: 12rpx;
}
.city-hall__prov-chev {
  font-size: 34rpx;
  color: #6366f1;
  line-height: 1;
}
.city-hall__prov-body {
  padding-left: 8rpx;
}
.city-hall__row {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx 28rpx;
  margin-bottom: 12rpx;
  box-shadow: 0 4rpx 20rpx rgba(15, 23, 42, 0.05);
}
.city-hall__row--child {
  margin-left: 8rpx;
}
.city-hall__row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.city-hall__row-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #0f172a;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.city-hall__badge {
  flex-shrink: 0;
  font-size: 22rpx;
  color: #059669;
  background: #d1fae5;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
}
.city-hall__badge--near {
  color: #4338ca;
  background: #e0e7ff;
}
.city-hall__row--near {
  background: #eef2ff;
  border: 2rpx solid #c7d2fe;
}
.city-hall__row-meta {
  font-size: 24rpx;
  color: #94a3b8;
  margin-right: 8rpx;
}
.city-hall__row-meta--muted {
  color: #cbd5e1;
}
.city-hall__row-chev {
  font-size: 36rpx;
  color: #cbd5e1;
  line-height: 1;
}
.city-hall__actions {
  margin-top: 28rpx;
}
.city-hall__btn {
  border-radius: 999rpx;
  padding: 26rpx;
  text-align: center;
  font-size: 30rpx;
  font-weight: 600;
}
.city-hall__btn--primary {
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: #fff;
  box-shadow: 0 8rpx 24rpx rgba(79, 70, 229, 0.3);
}
.city-hall__btn--ghost {
  margin-top: 16rpx;
  background: #ffffff;
  color: #4f46e5;
  border: 1rpx solid #c7d2fe;
  box-shadow: none;
}
.city-hall__pending-tip {
  margin-top: 16rpx;
  padding: 20rpx 24rpx;
  text-align: center;
  font-size: 26rpx;
  color: #64748b;
  background: #f1f5f9;
  border-radius: 16rpx;
}
.city-hall__section {
  margin-top: 36rpx;
  padding-top: 8rpx;
}
.city-hall__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}
.city-hall__section-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #0f172a;
}
.city-hall__section-link {
  font-size: 26rpx;
  color: #4f46e5;
  font-weight: 600;
}
.city-hall__subblock {
  margin-bottom: 24rpx;
}
.city-hall__subblock-label {
  display: block;
  font-size: 24rpx;
  color: #64748b;
  margin-bottom: 12rpx;
}
.city-hall__city-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.city-hall__city-chip {
  padding: 16rpx 24rpx;
  border-radius: 16rpx;
  background: #f8fafc;
  border: 2rpx solid #e2e8f0;
  min-width: 160rpx;
}
.city-hall__city-chip--joined {
  background: #eef2ff;
  border-color: #c7d2fe;
}
.city-hall__city-chip-name {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #0f172a;
}
.city-hall__city-chip-meta {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #6366f1;
}
.city-hall__hot-scroll {
  white-space: nowrap;
  width: 100%;
}
.city-hall__hot-card {
  display: inline-flex;
  flex-direction: column;
  width: 220rpx;
  margin-right: 16rpx;
  padding: 20rpx;
  background: #fff;
  border-radius: 20rpx;
  border: 2rpx solid #e2e8f0;
  box-shadow: 0 4rpx 16rpx rgba(15, 23, 42, 0.04);
  vertical-align: top;
}
.city-hall__hot-name {
  font-size: 28rpx;
  font-weight: 700;
  color: #0f172a;
}
.city-hall__hot-prov {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #94a3b8;
}
.city-hall__hot-meta {
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #6366f1;
  font-weight: 500;
}
.city-hall__browse {
  margin-top: 8rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx 28rpx;
  background: #fff;
  border-radius: 20rpx;
  border: 2rpx solid #c7d2fe;
  box-shadow: 0 4rpx 20rpx rgba(99, 102, 241, 0.08);
}
.city-hall__browse-text {
  flex: 1;
  min-width: 0;
}
.city-hall__browse-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #312e81;
}
.city-hall__browse-desc {
  display: block;
  margin-top: 4rpx;
  font-size: 24rpx;
  color: #64748b;
}
.city-hall__browse-chev {
  font-size: 40rpx;
  color: #6366f1;
  line-height: 1;
}
</style>
