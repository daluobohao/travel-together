# travel-together2

基于 `uni-app` + `Vue 3` 的同城活动小程序/H5 项目。

## 1. 拉取代码后如何安装

### 环境要求

- Node.js 18+（推荐使用 LTS 版本）
- npm 9+
- 微信开发者工具（运行微信小程序时需要）

### 安装依赖

```bash
npm install
```

## 2. 运行 H5

### 开发模式

```bash
npm run dev:h5
```

默认会启动 uni-app 的 H5 本地开发服务，终端会输出访问地址（通常是 `http://localhost:5173` 或类似端口）。

### 构建 H5

```bash
npm run build:h5
```

构建产物用于部署线上 H5。

## 3. 运行微信小程序

### 开发模式（生成微信小程序代码）

```bash
npm run dev:mp-weixin
```

运行后会产出微信小程序开发代码。然后用微信开发者工具导入项目进行预览/调试。

### 生产构建

```bash
npm run build:mp-weixin
```

用于生成发布前的小程序构建结果。

## 4. 接口与 Mock 说明

### 接口基础地址

项目接口基础地址在 `src/api/config.js`：

```js
export const API_BASE_URL = 'https://yikuaikaixin.cn/api/v1/wm'
```

### Mock 机制

- 请求统一通过 `src/api/client.js` 的 `wmRequest` 发出
- 当 mock 开关开启且接口定义了 `mockHandler` 时，优先走本地 mock
- mock 数据主要在 `src/mock/wandermeet-db.js`

### 当前默认行为

`src/App.vue` 在应用启动时执行：

```js
setMockEnabled(true)
```

也就是**默认开启 mock**。

### 如何关闭 Mock，改为请求真实接口

可选方式：

1. 修改 `src/App.vue`，将 `setMockEnabled(true)` 改为 `setMockEnabled(false)`
2. 或在代码中合适位置调用：

```js
import { setMockEnabled } from '@/api'

setMockEnabled(false)
```

mock 开关会写入本地存储键 `wm_use_mock`（定义于 `src/api/config.js`）。

## 5. 运行抖音小程序

uni-app 中抖音小程序平台名为 **`mp-toutiao`**。

```bash
npm run dev:mp-toutiao      # 开发
npm run build:mp-toutiao    # 发布前构建
```

用 **抖音开发者工具** 导入 `dist/dev/mp-toutiao` 或 `dist/build/mp-toutiao`。  
完整分阶段步骤（平台账号、登录改造、提审）见后端仓库文档：  
**`../wander_meet/doc/WanderMeet_抖音小程序发布步骤.md`**（第一阶段平台账号已完成）。

### 抖音登录

- 接口：`POST /api/v1/wm/auth/douyin/login`，请求体 `{ "code": "<tt.login code>" }`（camelCase）
- 响应与短信 / 微信登录相同：`accessToken`、`refreshToken`、`expiresIn`、`user`
- 前端：`src/utils/douyinAuth.js`（`tt.login` + 静默登录）、`src/pages/login/login.vue`（`MP-TOUTIAO` 一键登录）
- App 启动：`App.vue` 内 `trySilentDouyinLogin()`
- 绑手机：抖音端走 `POST /me/phone/bind-sms`（见 `src/pages/bind-phone/bind-phone.vue`），无微信授权取号
- 服务端环境变量：`DY_MP_APPID`、`DY_MP_APPSECRET`；本地 mock 时 `DY_MP_USE_MOCK=true`（服务端不调抖音，用 code 派生 mock openid）
- 前端本地 Mock：`setMockEnabled(true)` 时走 `wandermeet.js` 内 `loginByDouyin` 的 `mockHandler`（`dy_` + code 前缀，与微信 mock 对照）

`manifest.json` → `mp-toutiao.appid` 需与抖音开放平台 AppID 一致（当前已配置）。

## 6. 常用脚本速查

- `npm run dev:h5`：启动 H5 开发
- `npm run build:h5`：构建 H5
- `npm run dev:mp-weixin`：启动微信小程序开发构建
- `npm run build:mp-weixin`：构建微信小程序
- `npm run dev:mp-toutiao`：启动抖音小程序开发构建
- `npm run build:mp-toutiao`：构建抖音小程序

更多平台脚本请查看 `package.json` 中 `scripts`。
