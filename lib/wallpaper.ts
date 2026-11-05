/**
 * 随机背景图（FRONTEND_PLAN.md 第 10 节）
 *
 * 三种模式：api（paugram API）、cdn（jsDelivr 取 Anime-Wallpaper）、static（固定图）。
 * SSR 只输出 URL，不发起图片请求；加载失败由浏览器侧回退纯色。
 */

import type { WallpaperConfig } from './theme-config'

/** 根据 config.source 计算一个背景图 URL */
export function resolveWallpaper(
  config: WallpaperConfig,
): string | undefined {
  if (!config.enabled) return undefined

  switch (config.source) {
    case 'api':
      // 线上同款，source=gt 已实测可用（COMPATIBILITY 第 8 节）
      return 'https://api.paugram.com/wallpaper?source=gt'

    case 'cdn': {
      const [min, max] = config.range || [1, 120]
      const n = Math.floor(Math.random() * (max - min + 1)) + min
      const template = config.cdnList?.[0] || ''
      return template.replace('{n}', String(n))
    }

    case 'static':
      return config.static_url || undefined

    default:
      return undefined
  }
}

/** 兜底 URL（api 失败时） */
export function resolveWallpaperFallback(
  config: WallpaperConfig,
): string | undefined {
  if (!config.enabled) return undefined
  if (config.source === config.fallback) return undefined
  return resolveWallpaper({ ...config, source: config.fallback })
}
