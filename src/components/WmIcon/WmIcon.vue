<template>
  <view class="wm-icon" :style="style" />
</template>

<script>
/**
 * 去旅聚 WanderMeet 通用图标组件
 * 基于内联 SVG mask-image 实现，颜色可通过 color 属性动态变更
 */
const ICONS = {
  home: '<path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-8.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  compass:
    '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m15.5 8.5-2 5.5-5.5 2 2-5.5 5.5-2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  plus: '<path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  message:
    '<path d="M21 12a8 8 0 0 1-11.6 7.14L4 20l1-4.2A8 8 0 1 1 21 12z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  user: '<circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4 21a8 8 0 0 1 16 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  chevronLeft:
    '<path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  chevronRight:
    '<path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  sliders:
    '<path d="M4 6h10M4 12h6M4 18h12M18 4v4M14 10v4M20 16v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  clock:
    '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  mapPin:
    '<path d="M12 22s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.6" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  users:
    '<circle cx="9" cy="8" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M2 20a7 7 0 0 1 14 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M16 4a3.5 3.5 0 0 1 0 7M22 20a6 6 0 0 0-5-5.9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  close:
    '<path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  edit: '<path d="M4 20h4l10-10-4-4L4 16v4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M14 6l4 4" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M10 20a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  shield:
    '<path d="M12 3 4 6v6c0 5 3.6 8.3 8 9 4.4-.7 8-4 8-9V6l-8-3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="m9 12 2 2 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  history:
    '<path d="M3 12a9 9 0 1 0 3-6.7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M3 4v4h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 8v4l3 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  heart:
    '<path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.65-7 10-7 10z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  flag: '<path d="M5 3v18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M5 4h11l-2 4 2 4H5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  book: '<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 3V4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  check:
    '<path d="m5 12 5 5 9-10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  calendar:
    '<rect x="3.5" y="5" width="17" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 10h17M8 3v4M16 3v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  yuan:
    '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 8l4 5 4-5M8 14h8M12 13v5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8L3 12z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="8" cy="8.5" r="1.3" fill="currentColor"/>',
  doc: '<path d="M7 3h8l4 4v14H7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M14 3v5h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  hash: '<path d="M4 9h16M4 15h16M9 4l-2 16M17 4l-2 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  coffee: '<path d="M5 8h10a3 3 0 0 1 0 6H5V8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 4v4M12 4v4M5 14v4M12 14v4M15 9h1a2 2 0 1 1 0 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  hike: '<path d="M12 16l-3-3-3 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 11l3-3 4 4 3-3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="14" cy="6" r="2" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="9" cy="9" r="1.5" fill="currentColor"/><circle cx="15" cy="15" r="1.5" fill="currentColor"/><circle cx="9" cy="15" r="1.5" fill="currentColor"/><circle cx="15" cy="9" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>',
  laptop: '<rect x="3" y="5" width="18" height="12" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M2 19h20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M8 19l1-2h6l1 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  rocket: '<path d="M14 4c2 2 3 5 3 8l-4 4c-3 0-6-1-8-3l3-3c2-2 3-4 6-6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="13" cy="9" r="1.5" fill="currentColor"/><path d="M6 14l-2 4 4-2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M10 18l-1 2 2-1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  globe: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 12h18" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 3c3 3 3 6 3 9s0 6-3 9-3-6-3-9 0-6 3-9z" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  utensil: '<path d="M7 4v10a3 3 0 0 0 3 3v-7h2V7a3 3 0 0 0-3-3H7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 4v16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12 4c2 0 4 2 4 5v2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  camera: '<path d="M3 8h3l2-3h8l2 3h3v11H3V8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  palette: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="8" cy="9" r="1.5" fill="currentColor"/><circle cx="16" cy="9" r="1.5" fill="currentColor"/><circle cx="9" cy="15" r="1.5" fill="currentColor"/><circle cx="15" cy="15" r="1.5" fill="currentColor"/><path d="M12 6v1m0 10v3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  walk: '<circle cx="14" cy="5" r="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 8h4l2 6-3 2-1 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 10l-2 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  locate: '<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="2 3"/>',
  search: '<circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m20 20-4.3-4.3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  shareForward:
    '<circle cx="18" cy="5" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M7 11h8l4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 21a6 6 0 0 1 6-6h2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  link2:
    '<path d="M9 12h6M11 9l-2.5 2.5a4 4 0 1 0 5.7 5.7L17 15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M15 15l2.5-2.5a4 4 0 1 0-5.7-5.7L10 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
}

export default {
  name: 'WmIcon',
  props: {
    name: {
      type: String,
      required: true,
    },
    size: {
      type: [Number, String],
      default: 40,
    },
    color: {
      type: String,
      default: '#475569',
    },
  },
  computed: {
    style() {
      const raw = ICONS[this.name] || ''
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>${raw.replace(/currentColor/g, this.color).replace(/#/g, '%23')}</svg>`
      const url = `url("data:image/svg+xml;utf8,${svg.replace(/"/g, "'").replace(/</g, '%3C').replace(/>/g, '%3E').replace(/#/g, '%23')}")`
      const size = typeof this.size === 'number' ? `${this.size}rpx` : this.size
      return {
        width: size,
        height: size,
        backgroundImage: url,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      }
    },
  },
}
</script>

<style scoped>
.wm-icon {
  display: inline-block;
  flex-shrink: 0;
}
</style>
