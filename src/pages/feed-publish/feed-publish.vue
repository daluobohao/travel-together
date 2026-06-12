<template>
  <view class="page sub">
    <view class="sub__header">
      <view class="sub__back" @click="goBack"><wm-icon name="chevronLeft" :size="36" color="#0f172a" /></view>
      <text class="sub__title">{{ activityId ? '活动动态' : '发布动态' }}</text>
      <view class="sub__sp" />
    </view>
    <view class="sub__body">
      <view class="panel">
        <textarea
          v-model="content"
          class="publish-area"
          placeholder="分享你在同城的状态、找搭子、活动感受…"
          maxlength="2000"
        />
        <view class="img-grid">
          <view v-for="(img, i) in images" :key="i" class="img-cell">
            <image :src="img" mode="aspectFill" class="img-cell__img" />
            <text class="img-cell__del" @click="removeImg(i)">×</text>
          </view>
          <view v-if="images.length < 9" class="img-cell img-cell--add" @click="pickImages">
            <text>+</text>
          </view>
        </view>
      </view>

      <view class="panel">
        <text class="panel__label">位置（可选）</text>
        <view class="loc-row" @click="pickLocation">
          <wm-icon name="mapPin" :size="32" color="#0d9488" />
          <view class="loc-row__text">
            <text v-if="location" class="loc-row__name">{{ location.locationName }}</text>
            <text v-else class="loc-row__placeholder">添加位置，让同城更容易找到你</text>
            <text v-if="location?.address" class="loc-row__addr">{{ location.address }}</text>
          </view>
          <text v-if="location" class="loc-row__clear" @click.stop="clearLocation">清除</text>
          <text v-else class="loc-row__chev">›</text>
        </view>
      </view>

      <view v-if="!activityId" class="panel">
        <text class="panel__label">话题（可选，最多 3 个）</text>
        <view v-for="section in topicSections" :key="section.group" class="topic-section">
          <text class="topic-section__title">{{ section.group }}</text>
          <view class="topic-row">
            <text
              v-for="t in section.topics"
              :key="t.id"
              class="topic-chip"
              :class="{ 'topic-chip--on': selectedTopics.includes(t.id) }"
              @click="toggleTopic(t.id)"
            >
              {{ t.label }}
            </text>
          </view>
        </view>
        <view v-if="selectedTopics.length" class="topic-selected">
          <text
            v-for="id in selectedTopics"
            :key="id"
            class="topic-selected__chip"
            @click="toggleTopic(id)"
          >
            #{{ topicLabel(id) }} ×
          </text>
        </view>
      </view>
      <view class="wm-btn wm-btn--primary publish-btn" :class="{ 'wm-btn--disabled': submitting }" @click="submit">
        {{ submitting ? '发布中…' : '发布' }}
      </view>
    </view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import { createActivityPost, createFeedPost, getFeedTopics, uploadFeedImage } from '@/api'
import {
  FEED_TOPICS,
  feedTopicLabel,
  groupFeedTopics,
} from '@/constants/feedTopics'
import { ensureTextContentSafe, SEC_SCENE } from '@/utils/contentSecurity'
import { prepareChatImageForUpload, validateChatImageFile } from '@/utils/avatarImage'
import {
  buildFeedLocationPayload,
  clearFeedLocationPickResult,
  readFeedLocationPickResult,
} from '@/utils/feedLocation'

function decodeQueryValue(raw) {
  const s = raw != null ? String(raw) : ''
  if (!s) return ''
  try {
    return decodeURIComponent(s.replace(/\+/g, ' '))
  } catch (_) {
    return s
  }
}

export default {
  components: { WmIcon },
  data() {
    return {
      content: '',
      images: [],
      uploadedUrls: [],
      cityCode: '110000',
      activityId: '',
      location: null,
      topicSections: groupFeedTopics(FEED_TOPICS),
      selectedTopics: [],
      submitting: false,
    }
  },
  methods: {
    topicLabel: feedTopicLabel,
    async loadTopics() {
      try {
        const data = await getFeedTopics()
        const sections = groupFeedTopics(data?.topics)
        if (sections.length) this.topicSections = sections
      } catch (_) {
        this.topicSections = groupFeedTopics(FEED_TOPICS)
      }
    },
    goBack() {
      uni.navigateBack()
    },
    syncLocationPickResult() {
      const picked = readFeedLocationPickResult()
      if (picked) {
        this.location = picked
        clearFeedLocationPickResult()
      }
    },
    pickLocation() {
      uni.navigateTo({ url: '/pages/location-picker/location-picker?from=feed' })
    },
    clearLocation() {
      this.location = null
      clearFeedLocationPickResult()
    },
    applyDefaultLocation(options = {}) {
      const name = decodeQueryValue(options.locationName)
      const lat = Number(options.lat)
      const lng = Number(options.lng)
      if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return
      this.location = {
        locationName: name,
        address: decodeQueryValue(options.address) || null,
        lat,
        lng,
      }
    },
    toggleTopic(id) {
      const i = this.selectedTopics.indexOf(id)
      if (i >= 0) this.selectedTopics.splice(i, 1)
      else if (this.selectedTopics.length < 3) this.selectedTopics.push(id)
      else uni.showToast({ title: '最多选 3 个话题', icon: 'none' })
    },
    pickImages() {
      uni.chooseImage({
        count: 9 - this.images.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: async (res) => {
          const paths = res.tempFilePaths || []
          const sizes = res.tempFiles || []
          for (let i = 0; i < paths.length; i += 1) {
            const p = paths[i]
            try {
              const err = await validateChatImageFile(p, sizes[i]?.size)
              if (err) {
                uni.showToast({ title: err, icon: 'none' })
                continue
              }
              const compressed = await prepareChatImageForUpload(p)
              this.images.push(compressed)
              const d = await uploadFeedImage(compressed)
              if (d?.imageUrl) this.uploadedUrls.push(d.imageUrl)
            } catch (e) {
              uni.showToast({ title: e?.message || '图片上传失败', icon: 'none' })
            }
          }
        },
      })
    },
    removeImg(i) {
      this.images.splice(i, 1)
      this.uploadedUrls.splice(i, 1)
    },
    async submit() {
      if (this.submitting) return
      if (!this.content.trim() && !this.uploadedUrls.length) {
        uni.showToast({ title: '写点什么或选张图吧', icon: 'none' })
        return
      }
      this.submitting = true
      const locationPayload = buildFeedLocationPayload(this.location)
      try {
        const feedStrict = !this.activityId
        const feedSecOptions = { strict: feedStrict }
        await ensureTextContentSafe(this.content.trim(), SEC_SCENE.SOCIAL, feedSecOptions)
        if (locationPayload.locationName) {
          await ensureTextContentSafe(locationPayload.locationName, SEC_SCENE.SOCIAL, feedSecOptions)
        }
        if (this.activityId) {
          await createActivityPost(this.activityId, {
            content: this.content.trim(),
            images: this.uploadedUrls,
            ...locationPayload,
          })
        } else {
          await createFeedPost({
            content: this.content.trim(),
            images: this.uploadedUrls,
            cityCode: this.cityCode,
            topicTags: this.selectedTopics,
            postKind: 'city',
            ...locationPayload,
          })
        }
        uni.showToast({ title: '已发布', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 500)
      } catch (e) {
        uni.showToast({ title: e?.message || '发布失败', icon: 'none' })
      } finally {
        this.submitting = false
      }
    },
  },
  onLoad(options) {
    if (options?.cityCode) this.cityCode = options.cityCode
    if (options?.activityId) this.activityId = options.activityId
    this.applyDefaultLocation(options || {})
    this.loadTopics()
  },
  onShow() {
    this.syncLocationPickResult()
  },
}
</script>

<style lang="scss" scoped>
@import '@/styles/sub-page.scss';
.publish-area {
  width: 100%;
  min-height: 200rpx;
  font-size: 28rpx;
}
.img-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 20rpx;
}
.img-cell {
  width: 200rpx;
  height: 200rpx;
  position: relative;
  border-radius: 12rpx;
  overflow: hidden;
  background: #f1f5f9;
  &--add {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 48rpx;
    color: #94a3b8;
  }
  &__img {
    width: 100%;
    height: 100%;
  }
  &__del {
    position: absolute;
    top: 4rpx;
    right: 8rpx;
    color: #fff;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 50%;
    width: 36rpx;
    height: 36rpx;
    text-align: center;
    line-height: 36rpx;
  }
}
.loc-row {
  margin-top: 12rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 22rpx;
  border-radius: 16rpx;
  background: #f8fafc;
  border: 2rpx solid rgba(13, 148, 136, 0.12);
  &__text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6rpx;
  }
  &__name {
    font-size: 28rpx;
    color: #0f172a;
    font-weight: 600;
  }
  &__placeholder {
    font-size: 28rpx;
    color: #94a3b8;
  }
  &__addr {
    font-size: 24rpx;
    color: #64748b;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  &__clear {
    flex-shrink: 0;
    font-size: 24rpx;
    color: #64748b;
    padding: 8rpx 12rpx;
  }
  &__chev {
    flex-shrink: 0;
    font-size: 36rpx;
    color: #cbd5e1;
    line-height: 1;
  }
}
.topic-section {
  margin-top: 20rpx;

  &__title {
    display: block;
    font-size: 24rpx;
    color: #94a3b8;
    margin-bottom: 12rpx;
  }
}
.topic-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.topic-chip {
  font-size: 24rpx;
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  background: #f1f5f9;
  color: #64748b;
  &--on {
    background: #e0f2fe;
    color: #0284c7;
  }
}
.topic-selected {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 20rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f1f5f9;

  &__chip {
    font-size: 24rpx;
    padding: 8rpx 16rpx;
    border-radius: 999rpx;
    background: #e0f2fe;
    color: #0284c7;
  }
}
.publish-btn {
  margin-top: 32rpx;
  width: 100%;
}
</style>
