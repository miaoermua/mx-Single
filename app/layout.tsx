import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import './globals.css'
import '../styles/kico.css'
import '../styles/single.css'
import '../styles/custom.css'

import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { SingleRuntime } from '@/components/layout/SingleRuntime'
import { Lightbox } from '@/components/content/Lightbox'
import { fetchAggregate } from '@/lib/api'
import { mergeThemeConfig, type SingleThemeConfig } from '@/lib/theme-config'
import { resolveWallpaper } from '@/lib/wallpaper'

/**
 * 从 cookie 读 night 值，SSR 输出 dark-theme class 防闪屏（V4）。
 * single.js 原逻辑：有 cookie 时按 cookie；无 cookie 时 22:00-05:00 自动。
 * SSR 阶段先按 cookie，无 cookie 时不加 class（客户端 effect 再按时间判定）。
 */
function readNightCookie(): boolean {
  const h = headers()
  const cookie = h.get('cookie') || ''
  const m = /(?:^|;\s*)night=(\w+)/.exec(cookie)
  if (!m) return false
  return m[1] === '1' || m[1] === 'true'
}

export async function generateMetadata(): Promise<Metadata> {
  const agg = await fetchAggregate()
  const seo = agg.seo || {}
  return {
    title: {
      default: seo.title || 'Single',
      template: `%s - ${seo.title || 'Single'}`,
    },
    description: seo.description || '',
    keywords: seo.keywords,
    icons: {
      icon: '/img/icon.png',
    },
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#3498db',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const isDark = readNightCookie()
  const bodyClass = isDark ? 'dark-theme' : undefined

  const agg = await fetchAggregate()
  const theme = mergeThemeConfig(
    agg.theme as Partial<SingleThemeConfig> | undefined,
  )
  const wallpaperUrl = resolveWallpaper(theme.wallpaper!)

  return (
    <html lang="zh">
      <head>
        {/* Font Awesome 4.7.0，锁定版本不可升 5/6（V6） */}
        <link
          rel="stylesheet"
          href="https://fastly.jsdelivr.net/npm/font-awesome@4.7.0/css/font-awesome.min.css"
        />
        {/* 背景图：SSR 只输出 URL，不发起图片请求（第 10.2 节） */}
        {wallpaperUrl && (
          <style>{`body:before{content:'';background-image:url(${wallpaperUrl})}`}</style>
        )}
        {/* custom_css：顺序在 single.css 之后（V9） */}
        {theme.custom_css && <style>{theme.custom_css}</style>}
      </head>
      <body className={bodyClass}>
        <Header aggregate={agg} theme={theme} />
        {children}
        <Footer aggregate={agg} theme={theme} />
        {/* Prism 高亮（路由变更后由 SingleRuntime 重跑） */}
        <script src="/vendor/prism.js" defer />
        {/* 运行时效果：菜单/夜间/搜索/返回顶部/复制提示/评论高亮等（第 4.1 节） */}
        <SingleRuntime copyNotice={theme.copy_notice === '1'} nightMode={theme.night_mode || '0'} />
        {/* 图片灯箱（kico.js:165-244） */}
        <Lightbox />
      </body>
    </html>
  )
}
