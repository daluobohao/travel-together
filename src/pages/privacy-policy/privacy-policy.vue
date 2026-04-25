<template>
  <view class="privacy">
    <view class="privacy__card">
      <text class="privacy__title">旅聚隐私政策</text>
      <text class="privacy__time">更新日期：2026-04-25</text>

      <text class="privacy__section-title">1. 我们收集的信息</text>
      <text class="privacy__text">
        为向你提供活动发布、报名、群聊与通知服务，我们可能收集你主动提供的信息（如昵称、手机号、活动信息）以及设备与日志信息（如设备标识、操作日志）。
      </text>

      <text class="privacy__section-title">2. 位置信息使用说明</text>
      <text class="privacy__text">
        当你使用“距离优先”“地点选择”等功能时，我们会在你授权后获取当前位置，用于活动排序、搜索附近地点与提升匹配效率。你可在系统设置中关闭定位权限。
      </text>

      <text class="privacy__section-title">3. 信息使用目的</text>
      <text class="privacy__text">
        我们仅在实现核心功能、保障账号安全、改进产品体验所需范围内使用你的信息，不会将个人信息用于与你无关的用途。
      </text>

      <text class="privacy__section-title">4. 信息共享与披露</text>
      <text class="privacy__text">
        未经你同意，我们不会向第三方出售你的个人信息。仅在法律法规要求、维护公共安全或你明确授权的情况下，才会依法披露必要信息。
      </text>

      <text class="privacy__section-title">5. 信息存储与保护</text>
      <text class="privacy__text">
        我们采取合理安全措施保护你的信息，防止未经授权的访问、披露、篡改或丢失。我们仅在实现业务目的所需期限内保存个人信息。
      </text>

      <text class="privacy__section-title">6. 你的权利</text>
      <text class="privacy__text">
        你有权访问、更正、删除个人信息，并可撤回授权。你可通过“编辑个人信息”修改资料，或通过平台客服渠道申请处理其他隐私请求。
      </text>

      <text class="privacy__section-title">7. 未成年人保护</text>
      <text class="privacy__text">
        若你为未成年人，请在监护人同意并指导下使用本服务。我们不会在明知情况下收集未成年人超出必要范围的个人信息。
      </text>

      <text class="privacy__section-title">8. 政策更新</text>
      <text class="privacy__text">
        本政策可能根据业务变化适时更新。更新后我们会通过站内公告或页面提示方式通知你，重大变更将以更显著方式告知。
      </text>
    </view>
  </view>
</template>

<script>
export default {}
</script>

<style lang="scss" scoped>
.privacy {
  min-height: 100vh;
  background: #f3f4f6;
  padding: 24rpx;

  &__card {
    background: #ffffff;
    border-radius: 20rpx;
    padding: 28rpx;
    box-shadow: 0 4rpx 16rpx rgba(15, 23, 42, 0.04);
  }

  &__title {
    display: block;
    font-size: 36rpx;
    font-weight: 700;
    color: #0f172a;
  }

  &__time {
    display: block;
    margin-top: 8rpx;
    margin-bottom: 20rpx;
    font-size: 22rpx;
    color: #94a3b8;
  }

  &__section-title {
    display: block;
    margin-top: 18rpx;
    font-size: 28rpx;
    font-weight: 600;
    color: #1e293b;
  }

  &__text {
    display: block;
    margin-top: 8rpx;
    font-size: 25rpx;
    line-height: 1.7;
    color: #475569;
  }
}
</style>
