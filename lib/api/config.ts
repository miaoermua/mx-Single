/**
 * mx core 连接配置（v12.x 单分支定案，COMPATIBILITY.md 第 2 节）
 *
 * - 前缀固定 /api/v2
 * - SDK 4.4.0
 * - SSR 请求必须带含 mx-space 的 UA，否则被 SpiderGuard 拦截（R7）
 */

export const MX_API_PREFIX = process.env.MX_API_PREFIX || '/api/v2'

export const MX_CORE_URL = process.env.MX_CORE_URL || ''

export const MX_SSR_UA =
  process.env.MX_SSR_UA || 'mx-space-single-frontend/0.1.0'

/** 是否有可用 core 实例；开发环境无配置时走 mock */
export const hasCore = () => MX_CORE_URL.length > 0

/** 拼接完整 API URL */
export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${MX_CORE_URL}${MX_API_PREFIX}${p}`
}

/** core 根路径（反代 feed/sitemap 等裸 XML 用，不带 /api/vN） */
export function coreUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${MX_CORE_URL}${p}`
}
