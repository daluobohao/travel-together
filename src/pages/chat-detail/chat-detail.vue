<template>
  <view class="page chat-detail">
    <view class="chat-detail__header">
      <view class="chat-detail__back" @click="goBack">
        <wm-icon name="chevronLeft" :size="34" color="#0f172a" />
      </view>
      <view class="chat-detail__title-wrap">
        <text class="chat-detail__title">{{ chat.name }}</text>
        <text class="chat-detail__sub">{{ chat.subtitle }}</text>
      </view>
      <view v-if="canModerateCityHall" class="chat-detail__manage" @click="openHostConsole">
        <text class="chat-detail__manage-text">管理</text>
      </view>
      <view class="chat-detail__members" @click="openMembers">
        <wm-icon name="users" :size="32" color="#0f172a" />
      </view>
    </view>

    <scroll-view class="chat-detail__messages" scroll-y :scroll-top="scrollTop" :scroll-with-animation="true">
      <view class="chat-detail__messages-inner">
        <view v-if="!messages.length" class="chat-detail__empty">
          <text>欢迎来到活动群聊</text>
        </view>
        <template v-for="item in displayItems" :key="item.id">
          <view v-if="item.type === 'time'" class="chat-time">
            <text class="chat-time__label">{{ item.label }}</text>
          </view>
          <view
            v-else
            class="msg-row"
            :class="item.mine ? 'msg-row--mine' : 'msg-row--other'"
          >
            <view
              v-if="!item.mine"
              class="msg-row__avatar"
              :class="{ 'msg-row__avatar--tap': item.openProfile }"
              @click.stop="item.openProfile && openUserPublic(item)"
            >
              <image
                v-if="item.avatarUrl"
                class="msg-row__avatar-img"
                :src="item.avatarUrl"
                mode="aspectFill"
              />
              <text v-else>{{ item.avatarLetter }}</text>
            </view>

            <view class="msg-col" :class="item.mine ? 'msg-col--mine' : 'msg-col--other'">
              <text
                v-if="!item.mine && item.sender"
                class="msg-col__name"
                @click.stop="item.openProfile && openUserPublic(item)"
              >
                {{ item.sender }}
                <text v-if="item.senderHostRole === 'owner'" class="msg-col__host-tag">城主</text>
                <text v-else-if="item.senderHostRole === 'deputy'" class="msg-col__host-tag msg-col__host-tag--dep">管理</text>
              </text>
              <view
                class="msg-bubble"
                :class="{
                  'msg-bubble--mine': item.mine && item.msgType !== 'sticker',
                  'msg-bubble--failed': item.failed,
                  'msg-bubble--image': item.msgType === 'image',
                  'msg-bubble--sticker': item.msgType === 'sticker',
                  'msg-bubble--location': item.msgType === 'location',
                  'msg-bubble--activity-rec': item.msgType === 'activity_rec',
                  'msg-bubble--chain': item.msgType === 'chain_signup',
                }"
                @longpress.stop="onMessageLongPress(item)"
              >
                <image
                  v-if="item.msgType === 'image' && item.imageUrl"
                  class="msg-bubble__image"
                  :src="item.imageUrl"
                  mode="widthFix"
                  @click.stop="previewChatImage(item.imageUrl)"
                />
                <chat-location-bubble
                  v-else-if="item.msgType === 'location'"
                  :location-name="item.locationName"
                  :address="item.address"
                  @open="openLocationMessage(item)"
                />
                <view
                  v-else-if="item.msgType === 'activity_rec'"
                  class="msg-bubble__activity-rec"
                  @click.stop="openRecommendedActivity(item)"
                >
                  <text class="msg-bubble__activity-rec-tag">城主推荐</text>
                  <text class="msg-bubble__activity-rec-title">{{ item.recActivityTitle || '查看活动' }}</text>
                  <text class="msg-bubble__activity-rec-link">查看详情 ›</text>
                </view>
                <chat-chain-bubble
                  v-else-if="item.msgType === 'chain_signup'"
                  :title="item.chainTitle"
                  :description="item.chainDescription"
                  :closed="item.chainClosed"
                  :entries="item.chainEntries"
                  :current-user-id="currentUserId"
                  :can-close="item.mine"
                  @join="openJoinChain(item)"
                  @edit="openJoinChain(item)"
                  @leave="leaveChain(item)"
                  @close="closeChain(item)"
                />
                <text v-else-if="item.msgType === 'sticker'" class="msg-bubble__sticker" selectable>{{ item.stickerEmoji }}</text>
                <chat-mention-text
                  v-else-if="item.msgType === 'text' && item.mentions && item.mentions.length"
                  :text="item.text"
                  :mentions="item.mentions"
                  @open-mention="openMentionProfile"
                />
                <text v-else class="msg-bubble__text" selectable>{{ item.text }}</text>
              </view>
              <text v-if="item.pending" class="msg-col__hint">发送中…</text>
              <text v-else-if="item.failed" class="msg-col__hint msg-col__hint--fail">发送失败，请重试</text>
            </view>

            <view
              v-if="item.mine"
              class="msg-row__avatar msg-row__avatar--mine"
            >
              <image
                v-if="item.avatarUrl"
                class="msg-row__avatar-img"
                :src="item.avatarUrl"
                mode="aspectFill"
              />
              <text v-else>{{ item.avatarLetter }}</text>
            </view>
          </view>
        </template>
      </view>
    </scroll-view>

    <view class="chat-detail__footer">
      <view class="chat-detail__composer">
        <input
          :value="draft"
          class="chat-detail__input"
          placeholder="输入消息..."
          placeholder-class="chat-detail__input-placeholder"
          confirm-type="send"
          @input="onDraftInput"
          @confirm="sendMessage"
          @focus="onInputFocus"
        />
        <view class="chat-detail__emoji-btn" @click="toggleEmojiPanel">
          <text class="chat-detail__emoji-icon">😊</text>
        </view>
        <view v-if="hasDraft" class="chat-detail__send" @click="sendMessage">
          <text>发送</text>
        </view>
        <view
          v-else
          class="chat-detail__plus-btn"
          :class="{ 'chat-detail__plus-btn--open': showMorePanel }"
          @click="toggleMorePanel"
        >
          <wm-icon name="plus" :size="40" color="#64748b" />
        </view>
      </view>

      <chat-emoji-panel
        :visible="showEmojiPanel"
        @pick-emoji="onPickEmoji"
        @pick-sticker="onPickSticker"
      />

      <chat-mention-picker
        :visible="mentionPickerVisible"
        :activity-id="chatId"
        :keyword-seed="mentionQuery"
        @pick="onPickMention"
      />

      <view v-if="showMorePanel" class="chat-detail__more-panel">
        <view class="chat-detail__more-grid">
          <view class="chat-detail__more-item" @click="onMorePick('image')">
            <view class="chat-detail__more-icon-wrap">
              <wm-icon name="camera" :size="44" color="#475569" />
            </view>
            <text class="chat-detail__more-label">照片</text>
          </view>
          <view class="chat-detail__more-item" @click="onMorePick('location')">
            <view class="chat-detail__more-icon-wrap">
              <wm-icon name="mapPin" :size="44" color="#475569" />
            </view>
            <text class="chat-detail__more-label">位置</text>
          </view>
          <view class="chat-detail__more-item" @click="onMorePick('chain')">
            <view class="chat-detail__more-icon-wrap chat-detail__more-icon-wrap--chain">
              <text class="chat-detail__more-chain-text">接龙</text>
            </view>
            <text class="chat-detail__more-label">接龙</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="chainSheetVisible" class="chain-sheet-mask" @click="!chainSubmitting && closeChainSheet()">
      <view class="chain-sheet" @click.stop>
        <text class="chain-sheet__title">{{ chainSheetMode === 'create' ? '发起接龙' : '参与接龙' }}</text>
        <view v-if="chainSheetMode === 'create'" class="chain-sheet__field">
          <text class="chain-sheet__label">标题</text>
          <input
            v-model="chainForm.title"
            class="chain-sheet__input"
            maxlength="80"
            placeholder="如：周六奥森晨跑"
            placeholder-class="chain-sheet__placeholder"
          />
        </view>
        <view v-else class="chain-sheet__hint">
          <text>{{ chainTarget?.chainTitle || '接龙' }}</text>
        </view>
        <view class="chain-sheet__field">
          <text class="chain-sheet__label">备注（可选）</text>
          <input
            v-model="chainForm.note"
            class="chain-sheet__input"
            maxlength="60"
            placeholder="如：1人、带家属"
            placeholder-class="chain-sheet__placeholder"
          />
        </view>
        <view class="chain-sheet__actions">
          <view class="chain-sheet__btn chain-sheet__btn--ghost" @click="closeChainSheet">
            <text>取消</text>
          </view>
          <view class="chain-sheet__btn chain-sheet__btn--primary" @click="submitChainSheet">
            <text>{{ chainSheetMode === 'create' ? '发布' : '确认' }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import WmIcon from '@/components/WmIcon/WmIcon.vue'
import ChatEmojiPanel from '@/components/ChatEmojiPanel/ChatEmojiPanel.vue'
import ChatLocationBubble from '@/components/ChatLocationBubble/ChatLocationBubble.vue'
import ChatChainBubble from '@/components/ChatChainBubble/ChatChainBubble.vue'
import ChatMentionText from '@/components/ChatMentionText/ChatMentionText.vue'
import ChatMentionPicker from '@/components/ChatMentionPicker/ChatMentionPicker.vue'
import {
  API_BASE_URL,
  getAccessToken,
  getActivityDetail,
  getActivityMessages,
  getCityGroupHostContext,
  deleteCityGroupHostMessage,
  muteCityGroupMember,
  getMe,
  isLoggedIn,
  markMyChatRead,
  redirectToLogin,
  sendActivityMessage,
  joinChainSignup,
  leaveChainSignup,
  closeChainSignup,
} from '@/api'
import { chooseAndUploadChatImage } from '@/utils/chatImagePicker'
import { getStickerEmoji } from '@/constants/chatStickers'
import { parseChatMessageFields } from '@/utils/chatMessageFields'
import { chatMessageCopyText, copyTextToClipboard } from '@/utils/clipboard'
import {
  buildLocationMessagePayload,
  clearChatLocationPickResult,
  openChatLocationOnMap,
  readChatLocationPickResult,
} from '@/utils/chatLocation'
import {
  buildBindPhoneUrl,
  ensurePhoneBound,
  isPhoneBindingRequiredError,
  PHONE_GATE_REASON,
} from '@/utils/phoneGate'
import {
  getLastServerMessageId,
  loadActivityChatCache,
  mergeMessageLists,
  saveActivityChatCache,
} from '@/utils/activityChatCache'
import { buildMentionsPayload } from '@/utils/chatMentions'
import { ensureTextContentSafe, ensureTextFieldsSafe, SEC_SCENE } from '@/utils/contentSecurity'

const POLL_INTERVAL_MS = 4000
const DEFAULT_LIMIT = 50

const TIME_GAP_MS = 5 * 60 * 1000

function formatTimeDivider(iso, prevIso) {
  if (!iso) return null
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    const prev = prevIso ? new Date(prevIso) : null
    if (prev && !Number.isNaN(prev.getTime()) && d.getTime() - prev.getTime() < TIME_GAP_MS) {
      return null
    }
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    const now = new Date()
    const today = now.toDateString()
    const yesterday = new Date(now.getTime() - 86400000).toDateString()
    const ds = d.toDateString()
    if (ds === today) return `${h}:${m}`
    if (ds === yesterday) return `昨天 ${h}:${m}`
    return `${d.getMonth() + 1}月${d.getDate()}日 ${h}:${m}`
  } catch (e) {
    return null
  }
}

function buildWsUrl(activityId) {
  try {
    const base = API_BASE_URL || ''
    const wsBase = base.replace(/^http/i, 'ws')
    return `${wsBase}/activities/${activityId}/ws`
  } catch (e) {
    return ''
  }
}

export default {
  components: { WmIcon, ChatEmojiPanel, ChatLocationBubble, ChatChainBubble, ChatMentionText, ChatMentionPicker },
  data() {
    return {
      chatId: '',
      chat: { name: '聊天', subtitle: '' },
      activityKind: 'event',
      cityCode: '',
      cityHostContext: null,
      enrolledCount: 0,
      maxMembers: 0,
      messages: [],
      messageIds: {}, // 去重用：{ [messageId]: true }
      lastCreatedAt: '',
      draft: '',
      scrollTop: 0,
      pollingTimer: null,
      pollingBusy: false,
      pollingPaused: false,
      socketTask: null,
      useWebSocket: false, // 切到 true 时优先走 WS，失败自动退回轮询
      currentUserId: '',
      currentUserNickname: '',
      currentUserAvatar: '',
      sendingImage: false,
      sendingLocation: false,
      showEmojiPanel: false,
      showMorePanel: false,
      chainSheetVisible: false,
      chainSheetMode: 'create',
      chainTarget: null,
      chainForm: { title: '', note: '' },
      chainSubmitting: false,
      mentionPickerVisible: false,
      mentionQuery: '',
      pendingMentions: [],
    }
  },
  computed: {
    displayItems() {
      const items = []
      let prevCreatedAt = ''
      for (const msg of this.messages) {
        const label = formatTimeDivider(msg.createdAt, prevCreatedAt)
        if (label) {
          items.push({ type: 'time', id: `time_${msg.id}`, label })
        }
        items.push({ type: 'message', ...msg })
        if (msg.createdAt) prevCreatedAt = msg.createdAt
      }
      return items
    },
    canModerateCityHall() {
      return this.activityKind === 'city_hall' && !!this.cityHostContext?.canModerate
    },
    hasDraft() {
      return !!(this.draft && String(this.draft).trim())
    },
    chatContentStrict() {
      return this.activityKind === 'city_hall'
    },
    chatSecOptions() {
      return { strict: this.chatContentStrict }
    },
  },
  async onLoad(query) {
    this.chatId = query?.id ? String(query.id) : '1'
    const chatUrl = `/pages/chat-detail/chat-detail?id=${encodeURIComponent(this.chatId)}`
    if (!isLoggedIn()) {
      redirectToLogin(chatUrl)
      return
    }
    const phoneOk = await ensurePhoneBound({
      redirectPath: chatUrl,
      reason: PHONE_GATE_REASON.CHAT,
    })
    if (!phoneOk) return
    this.bootstrapGroup()
  },
  onShow() {
    this.pollingPaused = false
    this.trySendPickedLocation()
    // 回到前台先拉一次
    this.fetchIncremental().catch(() => {})
  },
  onHide() {
    this.pollingPaused = true
  },
  onUnload() {
    this.persistCache()
    this.stopPolling()
    this.closeSocket()
  },
  beforeDestroy() {
    this.stopPolling()
    this.closeSocket()
  },
  beforeUnmount() {
    this.stopPolling()
    this.closeSocket()
  },
  methods: {
    async bootstrapGroup() {
      await this.loadCurrentUser()
      await this.loadGroup()
      try {
        await markMyChatRead(this.chatId)
      } catch (e) {
        console.warn('标记已读失败', e)
      }
      if (this.useWebSocket) {
        const ok = this.openSocket()
        if (!ok) this.startPolling()
      } else {
        this.startPolling()
      }
    },
    async loadCurrentUser() {
      try {
        const user = await getMe()
        this.currentUserId = user?.userId || ''
        this.currentUserNickname = user?.nickname || '我'
        this.currentUserAvatar = user?.avatarUrl || ''
      } catch (e) {
        console.warn('获取当前用户信息失败', e)
      }
    },
    async loadGroup() {
      const cached = loadActivityChatCache(this.chatId)
      if (cached.length) {
        this.applyMessagesList(cached)
        this.scrollToBottom()
      }
      try {
        const [detail, msgData] = await Promise.all([
          getActivityDetail(this.chatId),
          getActivityMessages(this.chatId, { limit: DEFAULT_LIMIT }),
        ])
        const enrolled = Number(detail?.enrolledCount || 0)
        const maxM = Number(detail?.maxMembers || 0)
        this.activityKind = detail?.activityKind || 'event'
        this.enrolledCount = enrolled
        this.maxMembers = maxM
        const isCityHall = this.activityKind === 'city_hall'
        if (isCityHall) {
          try {
            this.cityHostContext = await getCityGroupHostContext(this.chatId)
            this.cityCode = this.cityHostContext?.cityCode || ''
          } catch (e) {
            console.warn('加载城主上下文失败', e)
            this.cityHostContext = null
          }
        } else {
          this.cityHostContext = null
          this.cityCode = ''
        }
        this.chat = {
          name: detail?.title || '活动群聊',
          subtitle: isCityHall
            ? enrolled > 0
              ? `${enrolled} 人 · 城市大群`
              : '城市大群'
            : maxM > 0
              ? `${enrolled}/${maxM} 成员`
              : `${enrolled} 成员`,
        }
        const rawList = msgData?.list || []
        const incoming = rawList.map((m) => this.normalizeMessage(m, { skipDedup: true })).filter(Boolean)
        if (this.mergeIncomingMessages(incoming)) {
          this.scrollToBottom()
        }
        this.updateLastCreatedAt(rawList)
        this.persistCache()
        markMyChatRead(this.chatId).catch(() => {})
      } catch (e) {
        if (isPhoneBindingRequiredError(e)) {
          const chatUrl = `/pages/chat-detail/chat-detail?id=${encodeURIComponent(this.chatId)}`
          uni.redirectTo({ url: buildBindPhoneUrl(chatUrl, PHONE_GATE_REASON.CHAT) })
          return
        }
        if (!this.messages.length) {
          uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
        }
      } finally {
        if (!cached.length) this.scrollToBottom()
      }
    },
    applyMessagesList(list) {
      this.messages = list || []
      this.rebuildMessageIds()
    },
    rebuildMessageIds() {
      this.messageIds = {}
      for (const m of this.messages) {
        if (m?.id) this.messageIds[m.id] = true
      }
    },
    persistCache() {
      if (!this.chatId || !this.messages.length) return
      saveActivityChatCache(this.chatId, this.messages)
    },
    mergeIncomingMessages(incoming) {
      if (!incoming?.length) return false
      const prevLen = this.messages.length
      const merged = mergeMessageLists(this.messages, incoming)
      const changed =
        merged.length !== prevLen ||
        merged.some(
          (m, i) =>
            m.id !== this.messages[i]?.id ||
            m.text !== this.messages[i]?.text ||
            m.imageUrl !== this.messages[i]?.imageUrl ||
            m.msgType !== this.messages[i]?.msgType ||
            m.stickerId !== this.messages[i]?.stickerId ||
            m.locationName !== this.messages[i]?.locationName ||
            m.lat !== this.messages[i]?.lat ||
            m.recActivityId !== this.messages[i]?.recActivityId ||
            JSON.stringify(m.chainEntries || []) !== JSON.stringify(this.messages[i]?.chainEntries || []) ||
            m.chainClosed !== this.messages[i]?.chainClosed ||
            JSON.stringify(m.mentions || []) !== JSON.stringify(this.messages[i]?.mentions || [])
        )
      if (changed) {
        this.messages = merged
        this.rebuildMessageIds()
      }
      return changed
    },
    normalizeMessage(raw, { skipDedup = false } = {}) {
      if (!raw) return null
      const id = raw.messageId || `local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      if (!skipDedup && this.messageIds[id]) return null
      if (!skipDedup) this.messageIds[id] = true
      const senderUserId = raw.sender?.userId
      const isMine = senderUserId === 'me' || (this.currentUserId && senderUserId === this.currentUserId)
      const openProfile =
        !isMine && senderUserId && senderUserId !== 'system'
      const nickname = raw.sender?.nickname || '用户'
      const fields = parseChatMessageFields(raw)
      return {
        id,
        sender: nickname,
        ...fields,
        mine: isMine,
        createdAt: raw.createdAt || new Date().toISOString(),
        userId: senderUserId,
        openProfile,
        senderHostRole: raw.senderHostRole || null,
        avatarUrl: raw.sender?.avatarUrl || '',
        avatarLetter: String(nickname || '?').slice(0, 1),
      }
    },
    onMessageLongPress(item) {
      if (this.canModerateCityHall && !item.mine && item.userId) {
        uni.showActionSheet({
          itemList: ['复制', '删除消息', '禁言 24 小时'],
          success: (res) => {
            if (res.tapIndex === 0) this.copyChatMessage(item)
            else if (res.tapIndex === 1) this.deleteMessageAsHost(item)
            else if (res.tapIndex === 2) this.muteMemberAsHost(item)
          },
        })
        return
      }
      this.copyChatMessage(item)
    },
    async deleteMessageAsHost(item) {
      if (!item?.id || !this.cityCode) return
      try {
        await deleteCityGroupHostMessage(item.id, this.cityCode)
        this.messages = this.messages.filter((m) => m.id !== item.id)
        delete this.messageIds[item.id]
        this.persistCache()
        uni.showToast({ title: '已删除', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: e?.message || '删除失败', icon: 'none' })
      }
    },
    async muteMemberAsHost(item) {
      if (!item?.userId || !this.cityCode) return
      try {
        await muteCityGroupMember({ cityCode: this.cityCode, userId: item.userId })
        uni.showToast({ title: '已禁言 24 小时', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
      }
    },
    openHostConsole() {
      if (!this.cityCode) return
      uni.navigateTo({
        url:
          '/pages/city-host-console/city-host-console?cityCode=' +
          encodeURIComponent(this.cityCode),
      })
    },
    openUserPublic(msg) {
      if (!msg?.userId || msg.userId === 'system') return
      const q = [
        'userId=' + encodeURIComponent(msg.userId),
        'activityId=' + encodeURIComponent(this.chatId),
      ]
      if (msg.sender) q.push('nick=' + encodeURIComponent(msg.sender))
      if (msg.avatarUrl) q.push('ava=' + encodeURIComponent(msg.avatarUrl))
      uni.navigateTo({
        url: '/pages/user-public/user-public?' + q.join('&'),
      })
    },
    updateLastCreatedAt(list) {
      if (!Array.isArray(list) || !list.length) return
      let latest = this.lastCreatedAt ? new Date(this.lastCreatedAt).getTime() : 0
      list.forEach((m) => {
        const t = new Date(m.createdAt).getTime()
        if (!Number.isNaN(t) && t > latest) latest = t
      })
      if (latest) this.lastCreatedAt = new Date(latest).toISOString()
    },
    startPolling() {
      this.stopPolling()
      this.pollingTimer = setInterval(() => {
        if (this.pollingPaused || this.pollingBusy) return
        this.fetchIncremental().catch(() => {})
      }, POLL_INTERVAL_MS)
    },
    stopPolling() {
      if (this.pollingTimer) {
        clearInterval(this.pollingTimer)
        this.pollingTimer = null
      }
    },
    async fetchIncremental() {
      if (!this.chatId) return
      this.pollingBusy = true
      try {
        const query = { limit: DEFAULT_LIMIT }
        const afterId = getLastServerMessageId(this.messages)
        if (afterId) query.afterMessageId = afterId
        const msgData = await getActivityMessages(this.chatId, query)
        const rawList = msgData?.list || []
        if (!rawList.length) return
        const incoming = rawList.map((m) => this.normalizeMessage(m, { skipDedup: true })).filter(Boolean)
        if (this.mergeIncomingMessages(incoming)) {
          this.updateLastCreatedAt(rawList)
          this.persistCache()
          this.scrollToBottom()
        }
      } catch (e) {
        // 网络波动时静默失败，下个轮询周期重试
      } finally {
        this.pollingBusy = false
      }
    },
    openSocket() {
      // WebSocket 预留：后端若暴露 /activities/:id/ws 可直接启用
      try {
        const url = buildWsUrl(this.chatId)
        if (!url || !url.startsWith('ws')) return false
        const token = getAccessToken()
        this.socketTask = uni.connectSocket({
          url: `${url}${token ? `?token=${encodeURIComponent(token)}` : ''}`,
          complete: () => {},
        })
        const task = this.socketTask
        if (!task) return false
        task.onOpen(() => {
          // 可选：订阅消息
        })
        task.onMessage((res) => {
          try {
            const payload = typeof res?.data === 'string' ? JSON.parse(res.data) : res?.data
            if (payload?.type === 'message' && payload.data) {
              const norm = this.normalizeMessage(payload.data, { skipDedup: true })
              if (norm && this.mergeIncomingMessages([norm])) {
                this.updateLastCreatedAt([payload.data])
                this.persistCache()
                this.scrollToBottom()
              }
            }
          } catch (e) {
            // ignore malformed payload
          }
        })
        task.onError(() => {
          this.closeSocket()
          this.startPolling()
        })
        task.onClose(() => {
          this.socketTask = null
          if (!this.pollingTimer) this.startPolling()
        })
        return true
      } catch (e) {
        return false
      }
    },
    closeSocket() {
      if (this.socketTask) {
        try {
          this.socketTask.close && this.socketTask.close({})
        } catch (e) {
          // ignore
        }
        this.socketTask = null
      }
    },
    scrollToBottom() {
      this.$nextTick(() => {
        this.scrollTop = 9999999 + Math.random()
      })
    },
    openMembers() {
      if (!this.chatId) return
      const q = [
        'id=' + encodeURIComponent(this.chatId),
        'title=' + encodeURIComponent(this.chat.name || ''),
        'activityKind=' + encodeURIComponent(this.activityKind || 'event'),
        'memberTotal=' + encodeURIComponent(String(this.enrolledCount || 0)),
        'maxMembers=' + encodeURIComponent(String(this.maxMembers || 0)),
      ].join('&')
      uni.navigateTo({ url: '/pages/chat-members/chat-members?' + q })
    },
    goBack() {
      uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/messages/messages' }) })
    },
    previewChatImage(url) {
      if (!url) return
      uni.previewImage({ urls: [url], current: url })
    },
    copyChatMessage(item) {
      const text = chatMessageCopyText(item)
      if (!text) return
      copyTextToClipboard(text)
    },
    toggleEmojiPanel() {
      this.showEmojiPanel = !this.showEmojiPanel
      if (this.showEmojiPanel) {
        this.showMorePanel = false
        this.mentionPickerVisible = false
      }
    },
    toggleMorePanel() {
      this.showMorePanel = !this.showMorePanel
      if (this.showMorePanel) {
        this.showEmojiPanel = false
        this.mentionPickerVisible = false
      }
    },
    closeComposerPanels() {
      this.showEmojiPanel = false
      this.showMorePanel = false
      this.mentionPickerVisible = false
    },
    onInputFocus() {
      this.showMorePanel = false
    },
    onDraftInput(e) {
      const val = e?.detail?.value != null ? String(e.detail.value) : ''
      this.draft = val
      this.syncMentionPicker(val)
    },
    syncMentionPicker(val) {
      const text = String(val || '')
      const atIdx = text.lastIndexOf('@')
      if (atIdx < 0) {
        this.mentionPickerVisible = false
        this.mentionQuery = ''
        return
      }
      const tail = text.slice(atIdx + 1)
      if (tail.includes(' ') || tail.includes('\n')) {
        this.mentionPickerVisible = false
        this.mentionQuery = ''
        return
      }
      this.mentionQuery = tail
      this.mentionPickerVisible = true
      this.showEmojiPanel = false
      this.showMorePanel = false
    },
    onPickMention(member) {
      const nick = String(member?.nickname || '用户').trim()
      const uid = String(member?.userId || '').trim()
      if (!uid || !nick) return
      const text = String(this.draft || '')
      const atIdx = text.lastIndexOf('@')
      const prefix = atIdx >= 0 ? text.slice(0, atIdx) : text
      this.draft = `${prefix}@${nick} `
      if (!this.pendingMentions.find((m) => m.userId === uid)) {
        this.pendingMentions.push({ userId: uid, nickname: nick })
      }
      this.mentionPickerVisible = false
      this.mentionQuery = ''
    },
    openMentionProfile(payload) {
      if (!payload?.userId || payload.userId === 'system') return
      const q = [
        'userId=' + encodeURIComponent(payload.userId),
        'activityId=' + encodeURIComponent(this.chatId),
      ]
      if (payload.nickname) q.push('nick=' + encodeURIComponent(payload.nickname))
      uni.navigateTo({
        url: '/pages/user-public/user-public?' + q.join('&'),
      })
    },
    onMorePick(type) {
      if (type === 'image') {
        this.closeComposerPanels()
        this.sendImageMessage()
        return
      }
      if (type === 'location') {
        this.closeComposerPanels()
        this.openLocationPicker()
        return
      }
      if (type === 'chain') {
        this.closeComposerPanels()
        this.openCreateChain()
      }
    },
    onPickEmoji(emoji) {
      this.draft = `${this.draft || ''}${emoji}`
    },
    onPickSticker(stickerId) {
      this.showEmojiPanel = false
      this.sendStickerMessage(stickerId)
    },
    async sendStickerMessage(stickerId) {
      if (!stickerId || !this.chatId) return
      const tempId = `temp_${Date.now()}`
      const nowIso = new Date().toISOString()
      const stickerEmoji = getStickerEmoji(stickerId)
      this.messages.push({
        id: tempId,
        sender: this.currentUserNickname || '我',
        msgType: 'sticker',
        text: '',
        imageUrl: '',
        stickerId,
        stickerEmoji,
        mine: true,
        pending: true,
        createdAt: nowIso,
        avatarUrl: this.currentUserAvatar,
        avatarLetter: String(this.currentUserNickname || '我').slice(0, 1),
      })
      this.messageIds[tempId] = true
      this.scrollToBottom()
      try {
        const row = await sendActivityMessage(this.chatId, { msgType: 'sticker', stickerId })
        const realId = row?.messageId
        const idx = this.messages.findIndex((m) => m.id === tempId)
        if (idx >= 0) {
          if (realId && !this.messageIds[realId]) {
            this.messageIds[realId] = true
            this.messages.splice(idx, 1, {
              id: realId,
              sender: this.currentUserNickname || '我',
              msgType: 'sticker',
              text: '',
              imageUrl: '',
              stickerId: row?.stickerId || stickerId,
              stickerEmoji: getStickerEmoji(row?.stickerId || stickerId),
              mine: true,
              createdAt: row?.createdAt || nowIso,
              avatarUrl: this.currentUserAvatar,
              avatarLetter: String(this.currentUserNickname || '我').slice(0, 1),
            })
          } else {
            this.messages[idx].pending = false
          }
        }
        this.updateLastCreatedAt([{ createdAt: row?.createdAt }])
        this.persistCache()
        try {
          await markMyChatRead(this.chatId)
        } catch (e) {
          console.warn('标记已读失败', e)
        }
      } catch (e) {
        const idx = this.messages.findIndex((m) => m.id === tempId)
        if (idx >= 0) {
          this.messages.splice(idx, 1, { ...this.messages[idx], failed: true, pending: false })
        }
        uni.showToast({ title: e?.message || '发送失败', icon: 'none' })
      }
    },
    async sendImageMessage() {
      if (this.sendingImage || !this.chatId) return
      this.showEmojiPanel = false
      this.sendingImage = true
      let tempId = ''
      try {
        const imageUrl = await chooseAndUploadChatImage()
        tempId = `temp_${Date.now()}`
        const nowIso = new Date().toISOString()
        this.messages.push({
          id: tempId,
          sender: this.currentUserNickname || '我',
          msgType: 'image',
          text: '',
          imageUrl,
          mine: true,
          pending: true,
          createdAt: nowIso,
          avatarUrl: this.currentUserAvatar,
          avatarLetter: String(this.currentUserNickname || '我').slice(0, 1),
        })
        this.messageIds[tempId] = true
        this.scrollToBottom()

        const row = await sendActivityMessage(this.chatId, { msgType: 'image', imageUrl })
        const realId = row?.messageId
        const idx = this.messages.findIndex((m) => m.id === tempId)
        if (idx >= 0) {
          if (realId && !this.messageIds[realId]) {
            this.messageIds[realId] = true
            this.messages.splice(idx, 1, {
              id: realId,
              sender: this.currentUserNickname || '我',
              msgType: 'image',
              text: '',
              imageUrl: row?.imageUrl || imageUrl,
              mine: true,
              createdAt: row?.createdAt || nowIso,
              avatarUrl: this.currentUserAvatar,
              avatarLetter: String(this.currentUserNickname || '我').slice(0, 1),
            })
          } else {
            this.messages[idx].pending = false
          }
        }
        this.updateLastCreatedAt([{ createdAt: row?.createdAt }])
        this.persistCache()
        try {
          await markMyChatRead(this.chatId)
        } catch (e) {
          console.warn('标记已读失败', e)
        }
      } catch (e) {
        if (tempId) {
          const idx = this.messages.findIndex((m) => m.id === tempId)
          if (idx >= 0) {
            this.messages.splice(idx, 1, { ...this.messages[idx], failed: true, pending: false })
          }
        }
        if (e?.message && e.message !== '已取消') {
          uni.showToast({ title: e.message || '发送失败', icon: 'none' })
        }
      } finally {
        this.sendingImage = false
      }
    },
    openLocationPicker() {
      this.showEmojiPanel = false
      uni.navigateTo({ url: '/pages/location-picker/location-picker?from=chat' })
    },
    trySendPickedLocation() {
      const loc = readChatLocationPickResult()
      if (!loc) return
      clearChatLocationPickResult()
      this.sendLocationMessage(loc)
    },
    openLocationMessage(item) {
      openChatLocationOnMap(item)
    },
    openRecommendedActivity(item) {
      const id = item?.recActivityId
      if (!id) return
      const normalized = String(id).startsWith('act_') ? id : `act_${id}`
      uni.navigateTo({
        url: `/pages/activity-detail/activity-detail?id=${encodeURIComponent(normalized)}`,
      })
    },
    openCreateChain() {
      this.chainSheetMode = 'create'
      this.chainTarget = null
      this.chainForm = { title: '', note: '' }
      this.chainSheetVisible = true
    },
    openJoinChain(item) {
      if (!item?.id || item.chainClosed) return
      this.chainSheetMode = 'join'
      this.chainTarget = item
      const me = (item.chainEntries || []).find((e) => e.userId === this.currentUserId)
      this.chainForm = { title: item.chainTitle || '', note: me?.note || '' }
      this.chainSheetVisible = true
    },
    closeChainSheet() {
      this.chainSheetVisible = false
      this.chainTarget = null
      this.chainForm = { title: '', note: '' }
    },
    upsertChainMessage(updated) {
      if (!updated?.messageId) return
      const normalized = this.normalizeMessage(updated, { skipDedup: true })
      if (!normalized) return
      const idx = this.messages.findIndex((m) => m.id === updated.messageId)
      if (idx >= 0) {
        const prev = this.messages[idx]
        this.messages.splice(idx, 1, {
          ...normalized,
          mine: prev.mine,
          sender: prev.sender,
          avatarUrl: prev.avatarUrl,
          avatarLetter: prev.avatarLetter,
        })
      }
      this.persistCache()
    },
    async submitChainSheet() {
      if (this.chainSubmitting) return
      const note = (this.chainForm.note || '').trim()
      if (this.chainSheetMode === 'create') {
        const title = (this.chainForm.title || '').trim()
        if (title.length < 2) {
          uni.showToast({ title: '请填写接龙标题', icon: 'none' })
          return
        }
        this.chainSubmitting = true
        try {
          await ensureTextFieldsSafe({ chainTitle: title, chainNote: note }, SEC_SCENE.SOCIAL, this.chatSecOptions)
          const row = await sendActivityMessage(this.chatId, {
            msgType: 'chain_signup',
            chainTitle: title,
            chainNote: note,
          })
          const normalized = this.normalizeMessage(row, { skipDedup: true })
          if (normalized) {
            this.messages.push({ ...normalized, mine: true })
            this.messageIds[normalized.id] = true
            this.updateLastCreatedAt([{ createdAt: row?.createdAt }])
            this.persistCache()
            this.scrollToBottom()
          }
          this.closeChainSheet()
          try {
            await markMyChatRead(this.chatId)
          } catch (e) {
            console.warn('标记已读失败', e)
          }
        } catch (e) {
          uni.showToast({ title: e?.message || '发布失败', icon: 'none' })
        } finally {
          this.chainSubmitting = false
        }
        return
      }
      if (!this.chainTarget?.id) return
      this.chainSubmitting = true
      try {
        await ensureTextFieldsSafe({ note }, SEC_SCENE.SOCIAL, this.chatSecOptions)
        const row = await joinChainSignup(this.chatId, this.chainTarget.id, { note })
        this.upsertChainMessage(row)
        this.closeChainSheet()
        uni.showToast({ title: '已参与', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: e?.message || '参与失败', icon: 'none' })
      } finally {
        this.chainSubmitting = false
      }
    },
    async leaveChain(item) {
      if (!item?.id) return
      try {
        const row = await leaveChainSignup(this.chatId, item.id)
        this.upsertChainMessage(row)
        uni.showToast({ title: '已取消', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
      }
    },
    async closeChain(item) {
      if (!item?.id) return
      uni.showModal({
        title: '截止接龙',
        content: '截止后其他人将无法继续参与，确定吗？',
        success: async (res) => {
          if (!res.confirm) return
          try {
            const row = await closeChainSignup(this.chatId, item.id)
            this.upsertChainMessage(row)
            uni.showToast({ title: '已截止', icon: 'success' })
          } catch (e) {
            uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
          }
        },
      })
    },
    async sendLocationMessage(loc) {
      if (this.sendingLocation || !loc) return
      this.showEmojiPanel = false
      this.sendingLocation = true
      const payload = buildLocationMessagePayload(loc)
      const tempId = `temp_loc_${Date.now()}`
      const nowIso = new Date().toISOString()
      const fields = parseChatMessageFields({ msgType: 'location', ...payload })
      this.messages.push({
        id: tempId,
        sender: this.currentUserNickname || '我',
        mine: true,
        pending: true,
        createdAt: nowIso,
        avatarUrl: this.currentUserAvatar,
        avatarLetter: String(this.currentUserNickname || '我').slice(0, 1),
        ...fields,
      })
      this.messageIds[tempId] = true
      this.scrollToBottom()
      try {
        await ensureTextFieldsSafe(
          { locationName: payload.locationName, address: payload.address },
          SEC_SCENE.SOCIAL,
          this.chatSecOptions,
        )
        const row = await sendActivityMessage(this.chatId, payload)
        const realId = row?.messageId
        const idx = this.messages.findIndex((m) => m.id === tempId)
        const normalized = this.normalizeMessage(row, { skipDedup: true })
        if (idx >= 0 && normalized) {
          if (realId && !this.messageIds[realId]) {
            this.messageIds[realId] = true
            this.messages.splice(idx, 1, { ...normalized, mine: true, pending: false })
          } else {
            this.messages[idx].pending = false
          }
        }
        this.updateLastCreatedAt([{ createdAt: row?.createdAt }])
        this.persistCache()
        try {
          await markMyChatRead(this.chatId)
        } catch (e) {
          console.warn('标记已读失败', e)
        }
      } catch (e) {
        const idx = this.messages.findIndex((m) => m.id === tempId)
        if (idx >= 0) {
          this.messages.splice(idx, 1, { ...this.messages[idx], failed: true, pending: false })
        }
        uni.showToast({ title: e?.message || '发送失败', icon: 'none' })
      } finally {
        this.sendingLocation = false
      }
    },
    async sendMessage() {
      const text = (this.draft || '').trim()
      if (!text) return
      this.showEmojiPanel = false
      this.mentionPickerVisible = false
      const mentions = buildMentionsPayload(text, this.pendingMentions)
      const tempId = `temp_${Date.now()}`
      const nowIso = new Date().toISOString()
      this.messages.push({
        id: tempId,
        sender: this.currentUserNickname || '我',
        msgType: 'text',
        text,
        mentions,
        mine: true,
        pending: true,
        createdAt: nowIso,
        avatarUrl: this.currentUserAvatar,
        avatarLetter: String(this.currentUserNickname || '我').slice(0, 1),
      })
      this.messageIds[tempId] = true
      this.draft = ''
      this.pendingMentions = []
      this.scrollToBottom()
      try {
        await ensureTextContentSafe(text, SEC_SCENE.SOCIAL, this.chatSecOptions)
        const payload = { msgType: 'text', text }
        if (mentions.length) payload.mentions = mentions
        const row = await sendActivityMessage(this.chatId, payload)
        const realId = row?.messageId
        const idx = this.messages.findIndex((m) => m.id === tempId)
        const normalized = this.normalizeMessage(row, { skipDedup: true })
        if (idx >= 0 && normalized) {
          if (realId && !this.messageIds[realId]) {
            this.messageIds[realId] = true
            this.messages.splice(idx, 1, { ...normalized, mine: true, pending: false })
          } else {
            this.messages[idx].pending = false
          }
        }
        this.updateLastCreatedAt([{ createdAt: row?.createdAt }])
        this.persistCache()
        try {
          await markMyChatRead(this.chatId)
        } catch (e) {
          console.warn('标记已读失败', e)
        }
      } catch (e) {
        const idx = this.messages.findIndex((m) => m.id === tempId)
        if (idx >= 0) this.messages.splice(idx, 1, { ...this.messages[idx], failed: true, pending: false })
        uni.showToast({ title: e?.message || '发送失败', icon: 'none' })
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.chat-detail {
  min-height: 100vh;
  height: 100vh;
  background: #ededed;
  display: flex;
  flex-direction: column;

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
  &__members {
    width: 72rpx;
    height: 72rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__members:active {
    opacity: 0.75;
  }

  &__manage {
    margin-right: 4rpx;
    padding: 0 12rpx;
    height: 56rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__manage-text {
    font-size: 24rpx;
    color: #4f46e5;
    font-weight: 600;
  }

  &__title-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rpx;
  }

  &__title {
    font-size: 30rpx;
    color: #0f172a;
    font-weight: 600;
  }

  &__sub {
    font-size: 20rpx;
    color: #94a3b8;
  }

  &__messages {
    flex: 1;
    height: 0;
    padding: 16rpx 0;
    background: #ededed;
    box-sizing: border-box;
  }

  &__messages-inner {
    width: 100%;
    padding: 0 24rpx 24rpx;
    box-sizing: border-box;
  }

  &__empty {
    padding: 60rpx 0;
    text-align: center;
    color: #94a3b8;
    font-size: 24rpx;
  }

  &__footer {
    flex-shrink: 0;
    background: #ffffff;
    border-top: 1rpx solid #e5e7eb;
    padding-bottom: env(safe-area-inset-bottom);
  }

  &__composer {
    display: flex;
    align-items: center;
    gap: 12rpx;
    padding: 16rpx 20rpx;
    background: #ffffff;
  }

  &__emoji-btn,
  &__plus-btn {
    width: 72rpx;
    height: 72rpx;
    border-radius: 14rpx;
    background: #f8fafc;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__plus-btn--open {
    transform: rotate(45deg);
  }

  &__chain-icon {
    font-size: 22rpx;
    color: #0d9488;
    font-weight: 600;
    line-height: 1;
  }

  &__emoji-icon {
    font-size: 40rpx;
    line-height: 1;
  }

  &__input {
    flex: 1;
    height: 72rpx;
    border-radius: 14rpx;
    padding: 0 18rpx;
    background: #f8fafc;
    font-size: 26rpx;
    color: #0f172a;
  }

  &__input-placeholder {
    color: #94a3b8;
  }

  &__send {
    min-width: 108rpx;
    height: 72rpx;
    padding: 0 24rpx;
    border-radius: 14rpx;
    background: #6366f1;
    color: #ffffff;
    font-size: 26rpx;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__more-panel {
    background: #f3f4f6;
    padding: 28rpx 24rpx 36rpx;
    border-top: 1rpx solid #e5e7eb;
  }

  &__more-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 36rpx 0;
  }

  &__more-item {
    width: 25%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12rpx;
  }

  &__more-icon-wrap {
    width: 112rpx;
    height: 112rpx;
    border-radius: 24rpx;
    background: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;

    &--chain {
      background: #f0fdfa;
    }
  }

  &__more-chain-text {
    font-size: 28rpx;
    font-weight: 600;
    color: #0d9488;
  }

  &__more-label {
    font-size: 24rpx;
    color: #64748b;
    line-height: 1.2;
  }
}

.chat-time {
  display: flex;
  justify-content: center;
  padding: 20rpx 0 12rpx;

  &__label {
    font-size: 22rpx;
    color: #b2b2b2;
    background: rgba(0, 0, 0, 0.06);
    padding: 6rpx 16rpx;
    border-radius: 8rpx;
    line-height: 1.2;
  }
}

.msg-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  margin-bottom: 24rpx;

  &--mine {
    flex-direction: row;
    justify-content: flex-end;
  }

  &--other {
    justify-content: flex-start;
  }

  &__avatar {
    width: 80rpx;
    height: 80rpx;
    border-radius: 8rpx;
    background: #c8c8c8;
    color: #ffffff;
    font-size: 28rpx;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;

    &--mine {
      background: linear-gradient(135deg, #7dd3fc, #38bdf8);
    }

    &--tap:active {
      opacity: 0.85;
    }
  }

  &__avatar-img {
    width: 100%;
    height: 100%;
  }
}

.msg-col {
  display: flex;
  flex-direction: column;
  max-width: calc(100% - 112rpx);
  min-width: 0;

  &--mine {
    align-items: flex-end;
  }

  &--other {
    align-items: flex-start;
  }

  &__name {
    font-size: 22rpx;
    color: #888888;
    line-height: 1.3;
    margin-bottom: 6rpx;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__host-tag {
    margin-left: 8rpx;
    font-size: 18rpx;
    color: #6366f1;
    background: rgba(99, 102, 241, 0.12);
    padding: 2rpx 8rpx;
    border-radius: 6rpx;

    &--dep {
      color: #64748b;
      background: rgba(100, 116, 139, 0.12);
    }
  }

  &__hint {
    font-size: 20rpx;
    color: #b2b2b2;
    margin-top: 6rpx;

    &--fail {
      color: #ef4444;
    }
  }
}

.msg-bubble {
  display: inline-block;
  max-width: 520rpx;
  padding: 18rpx 22rpx;
  border-radius: 8rpx;
  background: #ffffff;
  position: relative;
  box-sizing: border-box;

  &--mine {
    background: #95ec69;
  }

  &--failed {
    opacity: 0.72;
  }

  &--image {
    padding: 0;
    background: transparent;
    max-width: 420rpx;
  }

  &--sticker {
    padding: 0;
    background: transparent;
    max-width: 200rpx;
  }

  &--location {
    padding: 0;
    background: transparent;
    max-width: 520rpx;
  }

  &--activity-rec {
    padding: 0;
    background: transparent;
    max-width: 520rpx;
  }

  &--chain {
    padding: 0;
    background: transparent;
    max-width: 520rpx;
  }

  &__activity-rec {
    padding: 20rpx 24rpx;
    background: #ffffff;
    border-radius: 12rpx;
    border: 1rpx solid #e2e8f0;
    min-width: 280rpx;
  }

  &__activity-rec-tag {
    display: block;
    font-size: 22rpx;
    color: #6366f1;
    margin-bottom: 8rpx;
  }

  &__activity-rec-title {
    display: block;
    font-size: 30rpx;
    font-weight: 600;
    color: #0f172a;
    line-height: 1.4;
    margin-bottom: 8rpx;
  }

  &__activity-rec-link {
    display: block;
    font-size: 24rpx;
    color: #64748b;
  }

  &__text {
    font-size: 32rpx;
    color: #191919;
    line-height: 1.5;
    word-break: break-word;
    white-space: pre-wrap;
  }

  &__image {
    max-width: 400rpx;
    min-width: 120rpx;
    border-radius: 8rpx;
    display: block;
  }

  &__sticker {
    font-size: 96rpx;
    line-height: 1.1;
  }
}

.chain-sheet-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.chain-sheet {
  width: 100%;
  background: #ffffff;
  border-radius: 28rpx 28rpx 0 0;
  padding: 28rpx 28rpx calc(28rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.chain-sheet__title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 20rpx;
}

.chain-sheet__hint {
  margin-bottom: 16rpx;
  font-size: 28rpx;
  color: #334155;
}

.chain-sheet__field {
  margin-bottom: 16rpx;
}

.chain-sheet__label {
  display: block;
  font-size: 24rpx;
  color: #64748b;
  margin-bottom: 8rpx;
}

.chain-sheet__input {
  width: 100%;
  height: 80rpx;
  border-radius: 16rpx;
  background: #f8fafc;
  padding: 0 20rpx;
  font-size: 28rpx;
  color: #0f172a;
  box-sizing: border-box;
}

.chain-sheet__placeholder {
  color: #94a3b8;
}

.chain-sheet__actions {
  display: flex;
  gap: 16rpx;
  margin-top: 24rpx;
}

.chain-sheet__btn {
  flex: 1;
  height: 84rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 600;

  &--ghost {
    background: #f1f5f9;
    color: #475569;
  }

  &--primary {
    background: #0d9488;
    color: #ffffff;
  }
}
</style>
