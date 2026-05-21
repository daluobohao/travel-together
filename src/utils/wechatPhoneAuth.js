/**
 * 小程序 getPhoneNumber 回调解析（绑定手机号，非登录页 wx.login）
 */

export function parseGetPhoneNumberEvent(e) {
  const detail = e?.detail || {}
  const errMsg = String(detail.errMsg || '')
  const errno = detail.errno

  if (errMsg.includes('deny') || errMsg.includes('cancel') || errno === 1400001) {
    return { ok: false, reason: 'deny', message: '' }
  }

  if (
    errno === 103 ||
    errMsg.includes('privacy') ||
    errMsg.includes('no permission') ||
    errMsg.includes('api scope')
  ) {
    return {
      ok: false,
      reason: 'privacy',
      message: '请先在小程序弹窗中同意隐私协议，或在设置中开启手机号权限',
    }
  }

  if (errMsg && !errMsg.includes('ok') && !errMsg.includes('getPhoneNumber:ok')) {
    return {
      ok: false,
      reason: 'fail',
      message: errMsg.replace(/^getPhoneNumber:fail\s*/i, '') || '获取手机号授权失败',
    }
  }

  const phoneCode = detail.code
  if (!phoneCode) {
    return {
      ok: false,
      reason: 'no_code',
      message: '未获取到手机号凭证，请重新点击「微信授权手机号」',
    }
  }

  return { ok: true, phoneCode, reason: 'ok', message: '' }
}

/** 将后端 / 微信错误文案转为用户可读提示 */
export function mapBindPhoneErrorMessage(err) {
  const msg = String(err?.message || '').trim()
  if (!msg) return '绑定失败，请稍后重试'
  if (msg.includes('请先登录') || err?.statusCode === 401 || err?.isAuthError) {
    return '登录已过期，请重新登录后再绑定'
  }
  if (msg.includes('Invalid or expired WeChat phone code') || msg.includes('凭证已失效')) {
    return '微信手机号凭证已失效，请重新点击授权'
  }
  if (msg.includes('该手机号已绑定其他微信')) {
    return '该手机号已绑定其他微信，请用对应微信登录或换号'
  }
  if (msg.includes('已被其他账号使用')) {
    return '该手机号已被其他账号使用'
  }
  if (msg.includes('账号合并失败')) {
    return '账号合并失败，请联系客服'
  }
  if (msg.includes('WeChat mini program is not configured')) {
    return '服务端未配置小程序，请联系管理员'
  }
  return msg
}
