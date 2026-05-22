import { getOnboardingMeta } from '@/api'

/** 服务端拉取失败时的默认值：关闭多步引导 */
export const ONBOARDING_FULL_FALLBACK_ENABLED = false

let onboardingConfigCache = null

/** 是否启用完整多步 onboarding（读 ONBOARDING_FULL_ENABLED） */
export async function loadOnboardingConfig(force = false) {
  if (!force && onboardingConfigCache != null) return onboardingConfigCache
  try {
    const data = await getOnboardingMeta()
    onboardingConfigCache = {
      fullEnabled: !!data?.fullOnboardingEnabled,
    }
  } catch (e) {
    console.warn('[onboarding] loadOnboardingConfig failed', e)
    onboardingConfigCache = {
      fullEnabled: ONBOARDING_FULL_FALLBACK_ENABLED,
    }
  }
  return onboardingConfigCache
}

export function clearOnboardingConfigCache() {
  onboardingConfigCache = null
}

export function isFullOnboardingEnabledSync() {
  return !!onboardingConfigCache?.fullEnabled
}
