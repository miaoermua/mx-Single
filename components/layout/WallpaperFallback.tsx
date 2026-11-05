'use client'

import { useEffect } from 'react'

/**
 * 背景图加载失败回退（验收清单 #14）
 *
 * body:before 的 background-image 是 SSR 注入的 URL。
 * 这里用 Image 对象预加载探测：失败时给 body 加 .no-wallpaper，
 * 由 CSS 回退到纯色背景。
 */
export function WallpaperFallback({ url }: { url: string }) {
  useEffect(() => {
    if (!url) return

    const img = new Image()
    img.onerror = () => {
      document.body.classList.add('no-wallpaper')
    }
    img.onload = () => {
      document.body.classList.remove('no-wallpaper')
    }
    img.src = url

    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [url])

  return null
}
