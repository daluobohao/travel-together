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
      <view v-if="!activityId" class="panel">
        <text class="panel__label">话题（可选）</text>
        <view class="topic-row">
          <text
            v-for="t in topics"
            :key="t.id"
            class="topic-chip"
            :class="{ 'topic-chip--on': selectedTopics.includes(t.id) }"
            @click="toggleTopic(t.id)"
          >
            {{ t.label }}
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
import { createActivityPost, createFeedPost, FEED_TOPICS, uploadFeedImage } from '@/api'
import { prepareChatImageForUpload, validateChatImageFile } from '@/utils/avatarImage'

export default {
  components: { WmIcon },
  data() {
    return {
      content: '',
      images: [],
      uploadedUrls: [],
      cityCode: '110000',
      activityId: '',
      topics: FEED_TOPICS,
      selectedTopics: [],
      submitting: false,
    }
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    toggleTopic(id) {
      const i = this.selectedTopics.indexOf(id)
      if (i >= 0) this.selectedTopics.splice(i, 1)
      else if (this.selectedTopics.length < 3) this.selectedTopics.push(id)
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
      try {
        if (this.activityId) {
          await createActivityPost(this.activityId, {
            content: this.content.trim(),
            images: this.uploadedUrls,
          })
        } else {
          await createFeedPost({
            content: this.content.trim(),
            images: this.uploadedUrls,
            cityCode: this.cityCode,
            topicTags: this.selectedTopics,
            postKind: 'city',
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
.topic-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 12rpx;
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
.publish-btn {
  margin-top: 32rpx;
  width: 100%;
}
</style>
