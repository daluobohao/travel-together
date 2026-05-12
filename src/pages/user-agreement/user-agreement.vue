<template>
  <view class="ua">
    <view class="ua__card">
      <text class="ua__title">旅聚用户服务协议</text>
      <text class="ua__time">更新日期：2026-05-12</text>

      <text class="ua__section-title">1. 协议的接受与修改</text>
      <text class="ua__text">
        欢迎使用旅聚。你注册、登录或使用本小程序及相关服务，即表示你已阅读并同意本协议。我们可根据法律法规及运营需要更新本协议，更新后将在小程序内公示；若你继续使用服务，即视为接受修订后的协议。
      </text>

      <text class="ua__section-title">2. 服务内容</text>
      <text class="ua__text">
        旅聚为用户提供活动发布、浏览与报名、活动内沟通、通知与资料展示等社交与信息服务。具体功能以小程序实际提供为准。部分功能可能依赖你授权的位置、相册等系统权限。
      </text>

      <text class="ua__section-title">3. 账号与登录</text>
      <text class="ua__text">
        你可通过手机号与短信验证码完成注册与登录。你应使用本人合法有效的手机号，妥善保管验证码与登录状态，对在你账号下发生的操作承担责任。若发现未经授权的使用，请及时通过我们提供的渠道反馈。
      </text>

      <text class="ua__section-title">4. 用户行为规范</text>
      <text class="ua__text">
        你承诺遵守法律法规及《社区规范说明》，不发布违法、侵权、欺诈、骚扰、低俗或侵犯他人隐私的内容，不利用服务从事任何危害网络安全或损害他人合法权益的行为。我们有权依据规则对违规内容或账号采取警告、限制功能、终止服务等措施。
      </text>

      <text class="ua__section-title">5. 知识产权</text>
      <text class="ua__text">
        本小程序界面、文案、标识等知识产权归运营方或权利人所有。未经许可，你不得复制、传播或用于商业目的。
      </text>

      <text class="ua__section-title">6. 免责声明与责任限制</text>
      <text class="ua__text">
        你理解线下活动存在人身与财产安全等固有风险，参与者应自行判断并承担相应风险。在法律允许的范围内，我们对因不可抗力、第三方原因或非我方过错导致的损失不承担责任；我们对任何间接、附带损失的责任以法律法规规定的范围为限。
      </text>

      <text class="ua__section-title">7. 协议终止</text>
      <text class="ua__text">
        你可停止使用并注销账号（如我们提供相应入口）；我们可在符合法律法规的前提下暂停或终止向你提供服务。
      </text>

      <text class="ua__section-title">8. 联系我们</text>
      <text class="ua__text">
        如对本协议有疑问，可通过小程序内公示的客服或反馈渠道与我们联系。本协议未尽事宜，以《隐私政策》及国家相关法律法规为准。
      </text>
    </view>
  </view>
</template>

<script>
export default {}
</script>

<style lang="scss" scoped>
.ua {
  min-height: 100vh;
  background: transparent;
  padding: 24rpx;

  &__card {
    background: #ffffff;
    border-radius: 20rpx;
    padding: 28rpx;
    border: $wm-card-edge;
    box-shadow: $wm-card-elevated-shadow;
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
